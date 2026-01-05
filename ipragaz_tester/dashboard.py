"""
Test Dashboard - Web Arayüzü
Senaryoları yönet, çalıştır ve sonuçları görüntüle
"""

import json
import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from test_runner import TestRunner

# ============================================
# APP SETUP
# ============================================

app = FastAPI(title="İpragaz Test Dashboard", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = Path(__file__).parent
SCENARIOS_DIR = BASE_DIR / "scenarios"
RESULTS_DIR = BASE_DIR / "test_results"

SCENARIOS_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)

# State
active_runner: Optional[TestRunner] = None
is_running = False


# ============================================
# MODELS
# ============================================

class RunRequest(BaseModel):
    scenario_ids: Optional[list] = None
    tags: Optional[list] = None
    headless: bool = False
    base_url: Optional[str] = None


class ScenarioCreate(BaseModel):
    id: str
    name: str
    description: str
    tags: list = []
    steps: list = []


# ============================================
# ROUTES
# ============================================

@app.get("/", response_class=HTMLResponse)
async def home():
    """Ana sayfa"""
    return HTMLResponse(content=get_dashboard_html())


@app.get("/api/scenarios")
async def list_scenarios():
    """Senaryoları listele"""
    scenarios_file = SCENARIOS_DIR / "test_scenarios.json"
    
    if not scenarios_file.exists():
        return {"scenarios": [], "config": {}}
    
    with open(scenarios_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return {
        "scenarios": data.get('scenarios', []),
        "config": data.get('config', {}),
        "credentials": list(data.get('credentials', {}).keys())
    }


@app.post("/api/scenarios")
async def save_scenario(scenario: ScenarioCreate):
    """Yeni senaryo ekle veya güncelle"""
    scenarios_file = SCENARIOS_DIR / "test_scenarios.json"
    
    if scenarios_file.exists():
        with open(scenarios_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = {"config": {}, "credentials": {}, "scenarios": []}
    
    # Mevcut senaryoyu bul veya ekle
    existing_idx = None
    for i, s in enumerate(data['scenarios']):
        if s['id'] == scenario.id:
            existing_idx = i
            break
    
    scenario_dict = scenario.dict()
    
    if existing_idx is not None:
        data['scenarios'][existing_idx] = scenario_dict
    else:
        data['scenarios'].append(scenario_dict)
    
    with open(scenarios_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return {"success": True, "message": "Senaryo kaydedildi"}


@app.delete("/api/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: str):
    """Senaryo sil"""
    scenarios_file = SCENARIOS_DIR / "test_scenarios.json"
    
    if not scenarios_file.exists():
        raise HTTPException(status_code=404, detail="Senaryo dosyası bulunamadı")
    
    with open(scenarios_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data['scenarios'] = [s for s in data['scenarios'] if s['id'] != scenario_id]
    
    with open(scenarios_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return {"success": True}


@app.post("/api/run")
async def run_tests(request: RunRequest, background_tasks: BackgroundTasks):
    """Testleri başlat"""
    global is_running
    
    if is_running:
        raise HTTPException(status_code=400, detail="Testler zaten çalışıyor")
    
    scenarios_file = SCENARIOS_DIR / "test_scenarios.json"
    if not scenarios_file.exists():
        raise HTTPException(status_code=404, detail="Senaryo dosyası bulunamadı")
    
    is_running = True
    
    async def run_in_background():
        global is_running, active_runner
        try:
            runner = TestRunner(str(scenarios_file), str(RESULTS_DIR))
            active_runner = runner

            # Config override'ları hazırla
            config_overrides = {}
            if request.headless:
                config_overrides['headless'] = True
            if request.base_url:
                config_overrides['baseUrl'] = request.base_url

            await runner.run_all(
                tags=request.tags,
                scenario_ids=request.scenario_ids,
                config_overrides=config_overrides
            )
        finally:
            is_running = False
            active_runner = None
    
    background_tasks.add_task(run_in_background)
    
    return {"success": True, "message": "Testler başlatıldı"}


@app.get("/api/status")
async def get_status():
    """Çalışma durumu"""
    return {
        "is_running": is_running,
        "current_scenario": active_runner.results[-1].scenario_name if active_runner and active_runner.results else None
    }


@app.get("/api/results")
async def list_results():
    """Test sonuçlarını listele"""
    results = []
    
    for f in sorted(RESULTS_DIR.glob("results_*.json"), reverse=True):
        run_id = f.stem.replace("results_", "")
        
        with open(f, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        total = len(data)
        passed = sum(1 for r in data if r['success'])
        
        results.append({
            "run_id": run_id,
            "timestamp": run_id,
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "has_report": (RESULTS_DIR / f"report_{run_id}.html").exists()
        })
    
    return {"results": results[:20]}  # Son 20


@app.get("/api/results/{run_id}")
async def get_result(run_id: str):
    """Tek bir test sonucu"""
    json_file = RESULTS_DIR / f"results_{run_id}.json"
    
    if not json_file.exists():
        raise HTTPException(status_code=404, detail="Sonuç bulunamadı")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return {"run_id": run_id, "results": data}


@app.get("/api/results/{run_id}/report")
async def get_report(run_id: str):
    """HTML rapor"""
    report_file = RESULTS_DIR / f"report_{run_id}.html"
    
    if not report_file.exists():
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
    
    return FileResponse(report_file, media_type="text/html")


@app.get("/api/screenshots/{filename}")
async def get_screenshot(filename: str):
    """Screenshot getir"""
    screenshot_file = RESULTS_DIR / "screenshots" / filename
    
    if not screenshot_file.exists():
        raise HTTPException(status_code=404, detail="Screenshot bulunamadı")
    
    return FileResponse(screenshot_file, media_type="image/png")


# ============================================
# DASHBOARD HTML
# ============================================

def get_dashboard_html():
    return '''<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>İpragaz Test Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        header h1 { font-size: 1.5rem; }
        .status { padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; }
        .status.idle { background: #1e293b; }
        .status.running { background: #854d0e; animation: pulse 2s infinite; }
        @keyframes pulse { 50% { opacity: 0.7; } }
        
        .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .tab { padding: 0.75rem 1.5rem; background: #1e293b; border: none; color: #94a3b8; border-radius: 8px; cursor: pointer; }
        .tab.active { background: #3b82f6; color: white; }
        
        .panel { display: none; }
        .panel.active { display: block; }
        
        .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
        .card h3 { margin-bottom: 1rem; font-size: 1.1rem; }
        
        .scenario-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .scenario-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #0f172a; border-radius: 8px; }
        .scenario-item input[type="checkbox"] { width: 20px; height: 20px; }
        .scenario-info { flex: 1; }
        .scenario-name { font-weight: 500; }
        .scenario-tags { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
        .tag { font-size: 0.75rem; padding: 0.2rem 0.5rem; background: #374151; border-radius: 4px; }

        .scenario-header { display: flex; align-items: center; gap: 1rem; cursor: pointer; flex: 1; }
        .accordion-toggle { transition: transform 0.3s; color: #64748b; font-size: 0.8rem; }
        .accordion-toggle.open { transform: rotate(180deg); }
        .accordion-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
        .accordion-content.open { max-height: 2000px; }
        .step-preview { padding: 0.5rem 1rem; border-left: 2px solid #3b82f6; margin: 0.25rem 0 0.25rem 2.5rem; font-size: 0.85rem; color: #94a3b8; }
        
        .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary { background: #374151; color: #e2e8f0; }
        .btn-danger { background: #dc2626; color: white; }
        
        .config-form { display: grid; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.9rem; color: #94a3b8; }
        .form-group input, .form-group select { padding: 0.75rem; background: #0f172a; border: 1px solid #374151; border-radius: 8px; color: white; }
        
        .result-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .result-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #0f172a; border-radius: 8px; cursor: pointer; }
        .result-item:hover { background: #1a2744; }
        .result-stats { display: flex; gap: 1rem; }
        .result-stat { display: flex; align-items: center; gap: 0.25rem; }
        .result-stat.passed { color: #4ade80; }
        .result-stat.failed { color: #f87171; }
        
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); align-items: center; justify-content: center; z-index: 1000; }
        .modal.open { display: flex; }
        .modal-content { background: #1e293b; border-radius: 12px; max-width: 800px; width: 90%; max-height: 90vh; overflow: auto; }
        .modal-header { display: flex; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #374151; }
        .modal-body { padding: 1.5rem; }
        .modal-close { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; }
        
        .step-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .step { display: flex; gap: 0.75rem; padding: 0.75rem; background: #0f172a; border-radius: 8px; }
        .step.success { border-left: 3px solid #4ade80; }
        .step.failed { border-left: 3px solid #f87171; }
        .step-error { color: #f87171; font-size: 0.9rem; margin-top: 0.5rem; }
        .screenshot-link { font-size: 1.2rem; text-decoration: none; padding: 0.25rem 0.5rem; background: #1e293b; border-radius: 4px; transition: background 0.2s; }
        .screenshot-link:hover { background: #334155; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧪 İpragaz Test Dashboard</h1>
            <div class="status idle" id="status">Hazır</div>
        </header>
        
        <div class="tabs">
            <button class="tab active" data-panel="scenarios">Senaryolar</button>
            <button class="tab" data-panel="results">Sonuçlar</button>
            <button class="tab" data-panel="config">Ayarlar</button>
        </div>
        
        <!-- Senaryolar Panel -->
        <div class="panel active" id="panel-scenarios">
            <div class="card">
                <h3>Test Senaryoları</h3>
                <div class="scenario-list" id="scenarioList">
                    <p>Yükleniyor...</p>
                </div>
                <div class="actions">
                    <button class="btn btn-primary" onclick="runSelectedTests()">▶️ Seçilenleri Çalıştır</button>
                    <button class="btn btn-secondary" onclick="runAllTests()">🚀 Tümünü Çalıştır</button>
                </div>
            </div>
        </div>
        
        <!-- Sonuçlar Panel -->
        <div class="panel" id="panel-results">
            <div class="card">
                <h3>Test Sonuçları</h3>
                <div class="result-list" id="resultList">
                    <p>Yükleniyor...</p>
                </div>
            </div>
        </div>
        
        <!-- Ayarlar Panel -->
        <div class="panel" id="panel-config">
            <div class="card">
                <h3>Test Ayarları</h3>
                <div class="config-form">
                    <div class="form-group">
                        <label>Base URL</label>
                        <input type="text" id="configBaseUrl" value="http://localhost:5500">
                    </div>
                    <div class="form-group">
                        <label>Headless Mod</label>
                        <select id="configHeadless">
                            <option value="false">Hayır (Tarayıcı görünür)</option>
                            <option value="true">Evet (Arka planda)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Timeout (ms)</label>
                        <input type="number" id="configTimeout" value="30000">
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Result Detail Modal -->
    <div class="modal" id="resultModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">Test Sonucu</h3>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modalBody">
            </div>
        </div>
    </div>
    
    <script>
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
            });
        });
        
        // Load scenarios
        async function loadScenarios() {
            try {
                const res = await fetch('/api/scenarios');
                const data = await res.json();
                
                const list = document.getElementById('scenarioList');
                if (data.scenarios.length === 0) {
                    list.innerHTML = '<p style="color:#94a3b8">Henüz senaryo yok</p>';
                    return;
                }
                
                list.innerHTML = data.scenarios.map((s, idx) => `
                    <div class="scenario-item" style="flex-direction:column;align-items:stretch;">
                        <div class="scenario-header" onclick="toggleAccordion(${idx})">
                            <input type="checkbox" value="${s.id}" checked onclick="event.stopPropagation()">
                            <div class="scenario-info">
                                <div class="scenario-name">${s.name}</div>
                                <div class="scenario-tags">
                                    ${(s.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
                                </div>
                            </div>
                            <span style="color:#94a3b8">${s.steps?.length || 0} adım</span>
                            <span class="accordion-toggle" id="toggle-${idx}">▼</span>
                        </div>
                        <div class="accordion-content" id="accordion-${idx}">
                            ${(s.steps || []).map((step, i) => `
                                <div class="step-preview">
                                    <strong>${i+1}.</strong> ${step.description || step.action}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
                
                // Config
                if (data.config.baseUrl) {
                    document.getElementById('configBaseUrl').value = data.config.baseUrl;
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        // Load results
        async function loadResults() {
            try {
                const res = await fetch('/api/results');
                const data = await res.json();
                
                const list = document.getElementById('resultList');
                if (data.results.length === 0) {
                    list.innerHTML = '<p style="color:#94a3b8">Henüz sonuç yok</p>';
                    return;
                }
                
                list.innerHTML = data.results.map(r => `
                    <div class="result-item" onclick="viewResult('${r.run_id}')">
                        <div style="flex:1">
                            <div style="font-weight:500">${r.run_id}</div>
                        </div>
                        <div class="result-stats">
                            <span class="result-stat passed">✅ ${r.passed}</span>
                            <span class="result-stat failed">❌ ${r.failed}</span>
                        </div>
                        ${r.has_report ? '<a href="/api/results/' + r.run_id + '/report" target="_blank" class="btn btn-secondary" style="padding:0.5rem 1rem" onclick="event.stopPropagation()">📄 Rapor</a>' : ''}
                    </div>
                `).join('');
            } catch (e) {
                console.error(e);
            }
        }
        
        // Run tests
        async function runSelectedTests() {
            const selected = Array.from(document.querySelectorAll('.scenario-item input:checked')).map(i => i.value);
            if (selected.length === 0) {
                alert('Senaryo seçin');
                return;
            }
            await runTests(selected);
        }
        
        async function runAllTests() {
            await runTests(null);
        }
        
        async function runTests(scenarioIds) {
            const status = document.getElementById('status');
            status.textContent = 'Çalışıyor...';
            status.className = 'status running';
            
            try {
                const res = await fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scenario_ids: scenarioIds,
                        headless: document.getElementById('configHeadless').value === 'true',
                        base_url: document.getElementById('configBaseUrl').value
                    })
                });
                
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail);
                }
                
                // Poll for completion
                const poll = setInterval(async () => {
                    const statusRes = await fetch('/api/status');
                    const statusData = await statusRes.json();
                    
                    if (!statusData.is_running) {
                        clearInterval(poll);
                        status.textContent = 'Hazır';
                        status.className = 'status idle';
                        loadResults();
                        document.querySelector('[data-panel="results"]').click();
                    }
                }, 2000);
                
            } catch (e) {
                alert('Hata: ' + e.message);
                status.textContent = 'Hazır';
                status.className = 'status idle';
            }
        }
        
        // View result detail
        async function viewResult(runId) {
            try {
                const res = await fetch('/api/results/' + runId);
                const data = await res.json();
                
                document.getElementById('modalTitle').textContent = 'Sonuç: ' + runId;
                
                let html = '';
                for (const r of data.results) {
                    const statusIcon = r.success ? '✅' : '❌';
                    html += `
                        <div style="margin-bottom:1.5rem">
                            <h4 style="margin-bottom:0.75rem">${statusIcon} ${r.scenario_name}</h4>
                            <div class="step-list">
                                ${r.steps.map(s => `
                                    <div class="step ${s.success ? 'success' : 'failed'}">
                                        <span>${s.success ? '✅' : '❌'}</span>
                                        <div style="flex:1">
                                            <div>${s.description}</div>
                                            ${s.error ? `<div class="step-error">${s.error}</div>` : ''}
                                            ${s.screenshot ? `<a href="/api/screenshots/${s.screenshot}" target="_blank" class="screenshot-link" title="Screenshot görüntüle">📷</a>` : ''}
                                        </div>
                                        <span style="color:#64748b">${s.duration_ms.toFixed(0)}ms</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                
                document.getElementById('modalBody').innerHTML = html;
                document.getElementById('resultModal').classList.add('open');
            } catch (e) {
                console.error(e);
            }
        }
        
        function closeModal() {
            document.getElementById('resultModal').classList.remove('open');
        }

        function toggleAccordion(idx) {
            const content = document.getElementById('accordion-' + idx);
            const toggle = document.getElementById('toggle-' + idx);
            content.classList.toggle('open');
            toggle.classList.toggle('open');
        }

        // Init
        loadScenarios();
        loadResults();
    </script>
</body>
</html>'''


# ============================================
# MAIN
# ============================================

def main():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║           🧪 İPRAGAZ TEST DASHBOARD 🧪                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Dashboard: http://localhost:8081                             ║
║  Durdurmak için: Ctrl+C                                       ║
╚═══════════════════════════════════════════════════════════════╝
""")
    uvicorn.run(app, host="127.0.0.1", port=8081)


if __name__ == "__main__":
    main()
