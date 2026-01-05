"""
Web Server - Real-time Task Takibi
SSE (Server-Sent Events) ile streaming
Onay mekanizmasi ile kullanici etkilesimi
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from typing import Optional, Dict
from datetime import datetime
import uuid

from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Parent path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from task_runner import TaskRunner
from project_context import get_project_context, refresh_project_context

# ============================================
# APP SETUP
# ============================================

app = FastAPI(title="Scrum Agent Dashboard", version="1.0.0")

# Global approval queue - bekleyen onaylar
approval_queues: Dict[str, asyncio.Queue] = {}
pending_approvals: Dict[str, dict] = {}

# CORS - tüm origin'lere izin ver (development için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files - dashboard CSS/JS
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/scrum_agents/web/static", StaticFiles(directory=str(static_dir)), name="dashboard_static")
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# ============================================
# MODELS
# ============================================

class TaskRequest(BaseModel):
    question: str
    context: Optional[str] = ""


class ApprovalResponse(BaseModel):
    approval_id: str
    approved: bool
    comment: Optional[str] = ""


# ============================================
# ROUTES
# ============================================

@app.get("/", response_class=HTMLResponse)
async def home():
    """Ana sayfa - Scrum Dashboard"""
    # Root dizindeki scrum-dashboard.html'i servis et
    dashboard_file = Path(__file__).parent.parent.parent / "scrum-dashboard.html"
    if dashboard_file.exists():
        return HTMLResponse(content=dashboard_file.read_text(encoding="utf-8"))

    # Fallback - static/index.html
    html_file = Path(__file__).parent / "static" / "index.html"
    if html_file.exists():
        return HTMLResponse(content=html_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Dashboard yükleniyor...</h1>")


@app.get("/api/agents")
async def get_agents():
    """Takım üyelerini getir"""
    from agents import TEAM_MEMBERS

    agents = []
    for agent_id, agent in TEAM_MEMBERS.items():
        agents.append({
            "id": agent.id,
            "name": agent.name,
            "title": agent.title,
            "emoji": agent.emoji,
            "expertise": agent.expertise[:3]
        })

    return {"agents": agents}


@app.get("/api/context")
async def get_context():
    """Mevcut proje baglamini getir"""
    context = get_project_context()
    return {
        "length": len(context),
        "content": context
    }


@app.post("/api/context/refresh")
async def refresh_context():
    """Proje baglamini yenile (dosya degisikliklerini al)"""
    context = refresh_project_context()
    return {
        "status": "refreshed",
        "length": len(context),
        "message": "Proje baglami yenilendi"
    }


@app.post("/api/task/run")
async def run_task_stream_post(request: TaskRequest):
    """Task çalıştır ve SSE ile stream et (POST)"""
    return await _run_task_stream(request.question, request.context)


@app.get("/api/task/run")
async def run_task_stream_get(
    task: str = Query(..., description="Kullanici talebi"),
    context: Optional[str] = Query("", description="Ek bilgi (opsiyonel)")
):
    """Task çalıştır ve SSE ile stream et (GET - EventSource için)"""
    return await _run_task_stream(task, context)


async def _run_task_stream(question: str, additional_context: str = ""):
    """Task calistirma ortak fonksiyonu - proje baglami otomatik enjekte edilir"""

    async def event_generator():
        runner = TaskRunner()

        try:
            for event in runner.run_task(question, additional_context):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.1)

            log_dir = runner.save_log()
            yield f"data: {json.dumps({'type': 'log_saved', 'path': str(log_dir)})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/logs")
async def get_logs():
    """Kayıtlı logları listele"""
    logs_dir = Path(__file__).parent.parent / "logs"
    
    if not logs_dir.exists():
        return {"logs": []}
    
    logs = []
    for log_dir in sorted(logs_dir.iterdir(), reverse=True):
        if log_dir.is_dir():
            logs.append({
                "id": log_dir.name,
                "path": str(log_dir),
                "created": log_dir.stat().st_mtime
            })
    
    return {"logs": logs[:20]}


@app.get("/api/logs/{log_id}")
async def get_log_detail(log_id: str):
    """Tek bir log'un detayını getir"""
    log_dir = Path(__file__).parent.parent / "logs" / log_id

    if not log_dir.exists():
        raise HTTPException(status_code=404, detail="Log bulunamadı")

    md_file = log_dir / "log.md"
    md_content = md_file.read_text(encoding="utf-8") if md_file.exists() else ""

    json_file = log_dir / "messages.json"
    messages = []
    if json_file.exists():
        messages = json.loads(json_file.read_text(encoding="utf-8"))

    return {
        "id": log_id,
        "markdown": md_content,
        "messages": messages
    }


# ============================================
# APPROVAL ENDPOINTS
# ============================================

@app.get("/api/approval/pending")
async def get_pending_approvals():
    """Bekleyen onaylari getir"""
    return {"pending": list(pending_approvals.values())}


@app.post("/api/approval/respond")
async def respond_to_approval(response: ApprovalResponse):
    """Kullanici onay/red cevabi"""
    approval_id = response.approval_id

    if approval_id not in pending_approvals:
        raise HTTPException(status_code=404, detail="Onay istegi bulunamadi")

    # Queue'ya cevap gonder
    if approval_id in approval_queues:
        await approval_queues[approval_id].put({
            "approved": response.approved,
            "comment": response.comment,
            "timestamp": datetime.now().isoformat()
        })

    # Pending'den kaldir
    del pending_approvals[approval_id]

    return {
        "status": "ok",
        "approval_id": approval_id,
        "approved": response.approved
    }


async def request_approval(task_id: str, message: str, options: list = None) -> dict:
    """
    Kullanicidan onay iste ve cevap bekle.
    Bu fonksiyon orchestrator tarafindan cagrilacak.
    """
    approval_id = str(uuid.uuid4())

    # Queue olustur
    approval_queues[approval_id] = asyncio.Queue()

    # Pending'e ekle
    pending_approvals[approval_id] = {
        "approval_id": approval_id,
        "task_id": task_id,
        "message": message,
        "options": options or ["Onayla", "Reddet"],
        "created_at": datetime.now().isoformat()
    }

    # Cevap bekle (timeout ile)
    try:
        response = await asyncio.wait_for(
            approval_queues[approval_id].get(),
            timeout=300  # 5 dakika timeout
        )
        return response
    except asyncio.TimeoutError:
        # Timeout - varsayilan red
        return {
            "approved": False,
            "comment": "Timeout - otomatik red",
            "timestamp": datetime.now().isoformat()
        }
    finally:
        # Temizlik
        if approval_id in approval_queues:
            del approval_queues[approval_id]
        if approval_id in pending_approvals:
            del pending_approvals[approval_id]


def start_server(host: str = "127.0.0.1", port: int = 8080):
    """Server'ı başlat"""
    print(f"""
╔═══════════════════════════════════════════════════════════════╗
║           🏭 SCRUM AGENT DASHBOARD 🏭                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Server başlatıldı!                                           ║
║  Tarayıcıda aç: http://{host}:{port}                       ║
║                                                               ║
║  Durdurmak için: Ctrl+C                                       ║
╚═══════════════════════════════════════════════════════════════╝
""")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()
