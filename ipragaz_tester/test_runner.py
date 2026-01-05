"""
İpragaz E2E Test Runner
Playwright ile otomatik test senaryoları çalıştırır
"""

import json
import asyncio
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

try:
    from playwright.async_api import async_playwright, Page, Browser, BrowserContext
except ImportError:
    print("Playwright kurulu değil. Kurmak için:")
    print("  pip install playwright")
    print("  playwright install chromium")
    exit(1)


@dataclass
class StepResult:
    """Tek bir adımın sonucu"""
    step_index: int
    action: str
    description: str
    success: bool
    duration_ms: float
    error: Optional[str] = None
    screenshot: Optional[str] = None
    notes: List[str] = field(default_factory=list)


@dataclass 
class ScenarioResult:
    """Bir senaryonun sonucu"""
    scenario_id: str
    scenario_name: str
    success: bool
    total_steps: int
    passed_steps: int
    failed_step: Optional[int]
    duration_ms: float
    steps: List[StepResult] = field(default_factory=list)
    error_screenshot: Optional[str] = None
    notes: List[str] = field(default_factory=list)


class TestRunner:
    """E2E Test Runner"""
    
    def __init__(self, scenarios_file: str, output_dir: str = "test_results"):
        self.scenarios_file = Path(scenarios_file)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Screenshot dizini
        self.screenshots_dir = self.output_dir / "screenshots"
        self.screenshots_dir.mkdir(exist_ok=True)
        
        # Sonuçlar
        self.results: List[ScenarioResult] = []
        self.run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Config
        self.config = {}
        self.credentials = {}
        self.scenarios = []
        
        # Browser
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

        # Değişken deposu (storeText için)
        self.stored_values = {}
    
    def load_scenarios(self) -> bool:
        """Senaryo dosyasını yükle"""
        try:
            with open(self.scenarios_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.config = data.get('config', {})
            self.credentials = data.get('credentials', {})
            self.scenarios = data.get('scenarios', [])
            
            print(f"✅ {len(self.scenarios)} senaryo yüklendi")
            return True
            
        except Exception as e:
            print(f"❌ Senaryo dosyası yüklenemedi: {e}")
            return False
    
    def _replace_variables(self, text: str) -> str:
        """Değişkenleri değerleriyle değiştir"""
        if not isinstance(text, str):
            return text
        
        # {{timestamp}} -> gerçek timestamp
        text = text.replace("{{timestamp}}", datetime.now().strftime("%H%M%S"))
        
        # {{credentials.xxx.yyy}} -> değer
        pattern = r'\{\{(\w+)\.(\w+)\}\}'
        matches = re.findall(pattern, text)
        
        for match in matches:
            key1, key2 = match
            if key1 in self.credentials and key2 in self.credentials[key1]:
                value = self.credentials[key1][key2]
                text = text.replace(f"{{{{{key1}.{key2}}}}}", value)
        
        return text
    
    async def _take_screenshot(self, name: str) -> str:
        """Ekran görüntüsü al"""
        filename = f"{self.run_id}_{name}.png"
        filepath = self.screenshots_dir / filename

        # URL banner'ı inject et
        current_url = self.page.url
        await self.page.evaluate(f'''() => {{
            const banner = document.createElement('div');
            banner.id = '__url_banner__';
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#1a1a2e;color:#00d4ff;padding:8px 12px;font-family:monospace;font-size:12px;z-index:999999;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            banner.textContent = '🔗 ' + '{current_url}';
            document.body.prepend(banner);
        }}''')

        await self.page.screenshot(path=str(filepath), full_page=True)

        # Banner'ı kaldır
        await self.page.evaluate('''() => {
            const banner = document.getElementById('__url_banner__');
            if (banner) banner.remove();
        }''')

        return filename  # Sadece dosya adını döndür (API endpoint için)
    
    async def _execute_step(self, step: Dict, step_index: int) -> StepResult:
        """Tek bir adımı çalıştır"""
        action = step.get('action')
        target = self._replace_variables(step.get('target', ''))
        value = self._replace_variables(step.get('value', ''))
        description = step.get('description', f"{action} {target}")
        
        start_time = datetime.now()
        result = StepResult(
            step_index=step_index,
            action=action,
            description=description,
            success=False,
            duration_ms=0
        )
        
        try:
            # Aksiyona göre işlem yap
            if action == 'goto':
                url = self.config.get('baseUrl', '') + target
                await self.page.goto(url, wait_until='networkidle')
                result.notes.append(f"URL: {url}")
            
            elif action == 'fill':
                await self.page.fill(target, value)
                result.notes.append(f"Değer: {value[:20]}..." if len(value) > 20 else f"Değer: {value}")
            
            elif action == 'click':
                await self.page.click(target)
            
            elif action == 'select':
                if value == 'first':
                    # İlk option'ı seç
                    options = await self.page.query_selector_all(f"{target} option")
                    if len(options) > 1:
                        option_value = await options[1].get_attribute('value')
                        await self.page.select_option(target, option_value)
                else:
                    await self.page.select_option(target, value)
            
            elif action == 'wait':
                duration = step.get('duration', 1000)
                await asyncio.sleep(duration / 1000)
            
            elif action == 'waitForSelector':
                timeout = step.get('timeout', self.config.get('timeout', 30000))
                await self.page.wait_for_selector(target, timeout=timeout)
            
            elif action == 'waitForNavigation':
                await self.page.wait_for_load_state('networkidle')
            
            elif action == 'assertUrl':
                expected = step.get('expected', '')
                current_url = self.page.url
                if expected not in current_url:
                    raise AssertionError(f"URL beklenen değil. Beklenen: {expected}, Gerçek: {current_url}")
                result.notes.append(f"URL doğrulandı: {current_url}")
            
            elif action == 'assertVisible':
                element = await self.page.query_selector(target)
                if not element:
                    raise AssertionError(f"Element bulunamadı: {target}")
                is_visible = await element.is_visible()
                if not is_visible:
                    raise AssertionError(f"Element görünür değil: {target}")
            
            elif action == 'assertText':
                element = await self.page.query_selector(target)
                if not element:
                    raise AssertionError(f"Element bulunamadı: {target}")
                text = await element.text_content()
                
                expected = step.get('expected', '')
                contains = step.get('contains', '')
                
                if expected and text.strip() != expected:
                    raise AssertionError(f"Text eşleşmedi. Beklenen: '{expected}', Gerçek: '{text}'")
                if contains and contains not in text:
                    raise AssertionError(f"Text içermiyor. Aranan: '{contains}', Gerçek: '{text}'")
                
                result.notes.append(f"Text doğrulandı: {text[:50]}...")
            
            elif action == 'assertCount':
                elements = await self.page.query_selector_all(target)
                expected_count = step.get('expected', 0)
                actual_count = len(elements)
                
                if actual_count != expected_count:
                    raise AssertionError(f"Element sayısı beklenen değil. Beklenen: {expected_count}, Gerçek: {actual_count}")
                result.notes.append(f"Element sayısı doğrulandı: {actual_count}")
            
            elif action == 'assertNotEmpty':
                elements = await self.page.query_selector_all(target)
                for i, el in enumerate(elements):
                    text = await el.text_content()
                    if not text or not text.strip():
                        raise AssertionError(f"{i+1}. element boş")
            
            elif action == 'screenshot':
                name = step.get('name', f'step_{step_index}')
                result.screenshot = await self._take_screenshot(name)
                result.notes.append(f"Screenshot alındı")
            
            elif action == 'type':
                # Karakter karakter yaz (daha gerçekçi)
                await self.page.type(target, value, delay=50)
            
            elif action == 'press':
                await self.page.press(target, value)
            
            elif action == 'hover':
                await self.page.hover(target)
            
            elif action == 'evaluate':
                # JavaScript çalıştır
                js_code = step.get('script', '')
                eval_result = await self.page.evaluate(js_code)
                result.notes.append(f"JS sonucu: {eval_result}")

            elif action == 'storeText':
                # Element'in text içeriğini kaydet
                variable = step.get('variable', 'temp')
                element = await self.page.query_selector(target)
                if not element:
                    raise AssertionError(f"Element bulunamadı: {target}")
                text = await element.text_content()
                self.stored_values[variable] = text.strip()
                result.notes.append(f"'{variable}' = '{text.strip()}'")

            elif action == 'assertNotEqual':
                # Mevcut değerin kaydedilenden farklı olduğunu doğrula
                variable = step.get('variable', 'temp')
                element = await self.page.query_selector(target)
                if not element:
                    raise AssertionError(f"Element bulunamadı: {target}")
                current_text = (await element.text_content()).strip()
                stored_text = self.stored_values.get(variable, '')

                if current_text == stored_text:
                    raise AssertionError(f"Fiyat değişmedi! Önceki: '{stored_text}', Şimdiki: '{current_text}'")
                result.notes.append(f"Fiyat değişti: '{stored_text}' → '{current_text}'")

            else:
                raise ValueError(f"Bilinmeyen aksiyon: {action}")
            
            result.success = True
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            
            # Hata screenshot'ı
            if self.config.get('screenshotOnError', True):
                result.screenshot = await self._take_screenshot(f"error_step{step_index}")
        
        finally:
            end_time = datetime.now()
            result.duration_ms = (end_time - start_time).total_seconds() * 1000
        
        return result
    
    async def _run_scenario(self, scenario: Dict) -> ScenarioResult:
        """Tek bir senaryoyu çalıştır"""
        scenario_id = scenario.get('id', 'unknown')
        scenario_name = scenario.get('name', 'İsimsiz Senaryo')
        steps = scenario.get('steps', [])
        
        print(f"\n{'='*60}")
        print(f"📋 Senaryo: {scenario_name}")
        print(f"   ID: {scenario_id}")
        print(f"   Adım sayısı: {len(steps)}")
        print(f"{'='*60}")
        
        start_time = datetime.now()
        
        result = ScenarioResult(
            scenario_id=scenario_id,
            scenario_name=scenario_name,
            success=True,
            total_steps=len(steps),
            passed_steps=0,
            failed_step=None,
            duration_ms=0
        )
        
        # Yeni sayfa aç (her senaryo için temiz başla)
        self.page = await self.context.new_page()
        
        # Console loglarını yakala
        console_logs = []
        self.page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        try:
            for i, step in enumerate(steps):
                step_result = await self._execute_step(step, i)
                result.steps.append(step_result)
                
                status = "✅" if step_result.success else "❌"
                print(f"  {status} Adım {i+1}: {step_result.description}")
                
                if step_result.error:
                    print(f"      ⚠️ Hata: {step_result.error}")
                
                if step_result.success:
                    result.passed_steps += 1
                else:
                    result.success = False
                    result.failed_step = i + 1
                    result.error_screenshot = step_result.screenshot
                    
                    # Hata sonrası durma
                    break
            
            # Console loglarını ekle
            if console_logs:
                result.notes.append(f"Console ({len(console_logs)} log)")
            
        except Exception as e:
            result.success = False
            result.notes.append(f"Beklenmeyen hata: {str(e)}")
        
        finally:
            await self.page.close()
            
            end_time = datetime.now()
            result.duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Özet
        if result.success:
            print(f"\n  ✅ BAŞARILI - {result.passed_steps}/{result.total_steps} adım")
        else:
            print(f"\n  ❌ BAŞARISIZ - Adım {result.failed_step}'de hata")
        
        print(f"  ⏱️ Süre: {result.duration_ms:.0f}ms")
        
        return result
    
    async def run_all(self, tags: List[str] = None, scenario_ids: List[str] = None, config_overrides: Dict = None):
        """Tüm senaryoları çalıştır"""
        if not self.scenarios:
            if not self.load_scenarios():
                return

        # Config override'ları SONRA uygula (dashboard'dan gelen ayarlar)
        if config_overrides:
            self.config.update(config_overrides)

        # Filtreleme
        scenarios_to_run = self.scenarios
        
        if scenario_ids:
            scenarios_to_run = [s for s in scenarios_to_run if s.get('id') in scenario_ids]
        
        if tags:
            scenarios_to_run = [
                s for s in scenarios_to_run 
                if any(tag in s.get('tags', []) for tag in tags)
            ]
        
        if not scenarios_to_run:
            print("⚠️ Çalıştırılacak senaryo bulunamadı")
            return
        
        print(f"\n🚀 Test Başlıyor - {len(scenarios_to_run)} senaryo")
        print(f"📁 Sonuçlar: {self.output_dir}")
        
        async with async_playwright() as p:
            # Browser başlat
            self.browser = await p.chromium.launch(
                headless=self.config.get('headless', False),
                slow_mo=self.config.get('slowMo', 0)
            )
            
            self.context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 720}
            )
            
            # Senaryoları çalıştır
            for scenario in scenarios_to_run:
                result = await self._run_scenario(scenario)
                self.results.append(result)
            
            await self.browser.close()
        
        # Rapor oluştur
        self._generate_report()
    
    def _generate_report(self):
        """HTML rapor oluştur"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r.success)
        failed = total - passed
        
        # Özet
        print(f"\n{'='*60}")
        print(f"📊 TEST SONUÇLARI")
        print(f"{'='*60}")
        print(f"  Toplam: {total}")
        print(f"  ✅ Başarılı: {passed}")
        print(f"  ❌ Başarısız: {failed}")
        print(f"  Başarı Oranı: {(passed/total*100):.1f}%")
        
        # HTML Rapor
        html = self._build_html_report()
        
        report_path = self.output_dir / f"report_{self.run_id}.html"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"\n📄 Rapor: {report_path}")
        
        # JSON Rapor
        json_path = self.output_dir / f"results_{self.run_id}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump([self._result_to_dict(r) for r in self.results], f, indent=2, ensure_ascii=False)
        
        print(f"📄 JSON: {json_path}")
    
    def _result_to_dict(self, result: ScenarioResult) -> Dict:
        """ScenarioResult'ı dict'e çevir"""
        return {
            'scenario_id': result.scenario_id,
            'scenario_name': result.scenario_name,
            'success': result.success,
            'total_steps': result.total_steps,
            'passed_steps': result.passed_steps,
            'failed_step': result.failed_step,
            'duration_ms': result.duration_ms,
            'error_screenshot': result.error_screenshot,
            'notes': result.notes,
            'steps': [
                {
                    'step_index': s.step_index,
                    'action': s.action,
                    'description': s.description,
                    'success': s.success,
                    'duration_ms': s.duration_ms,
                    'error': s.error,
                    'screenshot': s.screenshot,
                    'notes': s.notes
                }
                for s in result.steps
            ]
        }
    
    def _build_html_report(self) -> str:
        """HTML rapor oluştur"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r.success)
        failed = total - passed
        
        scenarios_html = ""
        for result in self.results:
            status_class = "success" if result.success else "failed"
            status_icon = "✅" if result.success else "❌"
            
            steps_html = ""
            for step in result.steps:
                step_status = "✅" if step.success else "❌"
                step_class = "step-success" if step.success else "step-failed"
                
                error_html = ""
                if step.error:
                    error_html = f'<div class="error-msg">⚠️ {step.error}</div>'
                
                screenshot_html = ""
                if step.screenshot:
                    screenshot_html = f'<div class="screenshot"><a href="/api/screenshots/{step.screenshot}" target="_blank">📷 Screenshot</a></div>'
                
                steps_html += f'''
                <div class="step {step_class}">
                    <span class="step-status">{step_status}</span>
                    <span class="step-desc">{step.description}</span>
                    <span class="step-time">{step.duration_ms:.0f}ms</span>
                    {error_html}
                    {screenshot_html}
                </div>
                '''
            
            scenarios_html += f'''
            <div class="scenario {status_class}">
                <div class="scenario-header" onclick="toggleScenario(this)">
                    <span class="status-icon">{status_icon}</span>
                    <span class="scenario-name">{result.scenario_name}</span>
                    <span class="scenario-stats">{result.passed_steps}/{result.total_steps} adım</span>
                    <span class="scenario-time">{result.duration_ms:.0f}ms</span>
                </div>
                <div class="scenario-body">
                    {steps_html}
                </div>
            </div>
            '''
        
        return f'''<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Test Raporu - {self.run_id}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, sans-serif; background: #1a1a2e; color: #eee; padding: 2rem; }}
        .header {{ text-align: center; margin-bottom: 2rem; }}
        .header h1 {{ color: #fff; margin-bottom: 0.5rem; }}
        .header .date {{ color: #888; }}
        
        .summary {{ display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem; }}
        .summary-card {{ background: #16213e; padding: 1.5rem 2rem; border-radius: 12px; text-align: center; }}
        .summary-card .value {{ font-size: 2rem; font-weight: bold; }}
        .summary-card .label {{ color: #888; margin-top: 0.5rem; }}
        .summary-card.passed .value {{ color: #4ade80; }}
        .summary-card.failed .value {{ color: #f87171; }}
        
        .scenarios {{ max-width: 900px; margin: 0 auto; }}
        .scenario {{ background: #16213e; border-radius: 12px; margin-bottom: 1rem; overflow: hidden; }}
        .scenario.success {{ border-left: 4px solid #4ade80; }}
        .scenario.failed {{ border-left: 4px solid #f87171; }}
        
        .scenario-header {{ display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; cursor: pointer; }}
        .scenario-header:hover {{ background: #1e2a4a; }}
        .status-icon {{ font-size: 1.2rem; }}
        .scenario-name {{ flex: 1; font-weight: 500; }}
        .scenario-stats {{ color: #888; }}
        .scenario-time {{ color: #888; font-size: 0.9rem; }}
        
        .scenario-body {{ display: none; padding: 0 1.5rem 1rem; }}
        .scenario.expanded .scenario-body {{ display: block; }}
        
        .step {{ display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; background: #0f1629; }}
        .step-success {{ }}
        .step-failed {{ background: #2d1f1f; }}
        .step-status {{ }}
        .step-desc {{ flex: 1; }}
        .step-time {{ color: #666; font-size: 0.85rem; }}
        
        .error-msg {{ color: #f87171; font-size: 0.9rem; margin-top: 0.5rem; padding: 0.5rem; background: #3d1f1f; border-radius: 4px; }}
        .screenshot {{ margin-top: 0.75rem; }}
        .screenshot a {{ color: #60a5fa; text-decoration: none; padding: 0.25rem 0.5rem; background: #1e3a5f; border-radius: 4px; }}
        .screenshot a:hover {{ background: #2563eb; color: white; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Test Raporu</h1>
        <div class="date">{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</div>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <div class="value">{total}</div>
            <div class="label">Toplam</div>
        </div>
        <div class="summary-card passed">
            <div class="value">{passed}</div>
            <div class="label">Başarılı</div>
        </div>
        <div class="summary-card failed">
            <div class="value">{failed}</div>
            <div class="label">Başarısız</div>
        </div>
        <div class="summary-card">
            <div class="value">{(passed/total*100):.0f}%</div>
            <div class="label">Başarı</div>
        </div>
    </div>
    
    <div class="scenarios">
        {scenarios_html}
    </div>
    
    <script>
        function toggleScenario(header) {{
            header.parentElement.classList.toggle('expanded');
        }}
        // Başarısız olanları otomatik aç
        document.querySelectorAll('.scenario.failed').forEach(s => s.classList.add('expanded'));
    </script>
</body>
</html>'''


async def main():
    """CLI"""
    import argparse
    
    parser = argparse.ArgumentParser(description='İpragaz E2E Test Runner')
    parser.add_argument('scenarios', nargs='?', default='scenarios/test_scenarios.json', help='Senaryo dosyası')
    parser.add_argument('-o', '--output', default='test_results', help='Çıktı dizini')
    parser.add_argument('-t', '--tags', nargs='+', help='Sadece bu tag\'leri çalıştır')
    parser.add_argument('-s', '--scenarios', dest='scenario_ids', nargs='+', help='Sadece bu senaryoları çalıştır')
    parser.add_argument('--headless', action='store_true', help='Headless mod')
    
    args = parser.parse_args()
    
    runner = TestRunner(args.scenarios, args.output)
    
    if args.headless:
        runner.config['headless'] = True
    
    await runner.run_all(tags=args.tags, scenario_ids=args.scenario_ids)


if __name__ == '__main__':
    asyncio.run(main())
