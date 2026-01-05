"""
Proje Baglam Cikarici
Agent'larin proje hakkinda bilgi sahibi olmasi icin
dosya yapisi, veritabani semasi ve kod pattern'larini cikarir.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class TableInfo:
    """Veritabani tablo bilgisi"""
    name: str
    columns: List[str] = field(default_factory=list)
    foreign_keys: List[str] = field(default_factory=list)


@dataclass
class PageInfo:
    """HTML sayfa bilgisi"""
    filename: str
    title: str
    category: str  # bayi, isyerim, backoffice
    description: str
    js_files: List[str] = field(default_factory=list)
    services_used: List[str] = field(default_factory=list)


@dataclass
class MethodInfo:
    """Servis metod detaylari"""
    name: str
    params: List[str] = field(default_factory=list)
    is_async: bool = True


@dataclass
class ServiceInfo:
    """JS servis bilgisi"""
    name: str
    filename: str
    methods: List[str] = field(default_factory=list)
    method_details: List[MethodInfo] = field(default_factory=list)
    description: str = ""


class ProjectContextExtractor:
    """Proje baglamini cikarir"""

    def __init__(self, project_root: str = None):
        if project_root:
            self.project_root = Path(project_root)
        else:
            # scrum_agents klasorunun bir ust dizini
            self.project_root = Path(__file__).parent.parent

        self.tables: Dict[str, TableInfo] = {}
        self.pages: Dict[str, PageInfo] = {}
        self.services: Dict[str, ServiceInfo] = {}

    def extract_all(self) -> Dict:
        """Tum baglami cikar"""
        self._extract_database_schema()
        self._extract_pages()
        self._extract_services()

        return {
            "tables": self.tables,
            "pages": self.pages,
            "services": self.services
        }

    def _extract_database_schema(self):
        """Migration dosyalarindan veritabani semasini cikar"""
        migrations_dir = self.project_root / "supabase" / "migrations"

        if not migrations_dir.exists():
            return

        # Tum migration dosyalarini oku
        for sql_file in sorted(migrations_dir.glob("*.sql")):
            try:
                content = sql_file.read_text(encoding="utf-8")
                self._parse_sql_schema(content)
            except Exception:
                continue

    def _parse_sql_schema(self, sql_content: str):
        """SQL iceriginden tablo bilgilerini cikar"""
        # CREATE TABLE pattern
        table_pattern = r'create\s+table\s+["\']?(?:public\.)?(["\']?\w+["\']?)\s*\(([\s\S]*?)\);'

        for match in re.finditer(table_pattern, sql_content, re.IGNORECASE):
            table_name = match.group(1).strip('"\'')
            columns_str = match.group(2)

            if table_name not in self.tables:
                self.tables[table_name] = TableInfo(name=table_name)

            # Kolonlari cikar
            for line in columns_str.split('\n'):
                line = line.strip().strip(',')
                if not line or line.startswith('--'):
                    continue

                # Kolon adini al
                col_match = re.match(r'["\']?(\w+)["\']?\s+', line)
                if col_match:
                    col_name = col_match.group(1)
                    if col_name.lower() not in ['constraint', 'primary', 'unique', 'foreign', 'check']:
                        # Tip bilgisini de ekle
                        type_match = re.match(r'["\']?\w+["\']?\s+(\w+(?:\([^)]+\))?)', line)
                        if type_match:
                            col_type = type_match.group(1)
                            col_info = f"{col_name} ({col_type})"
                            if col_info not in self.tables[table_name].columns:
                                self.tables[table_name].columns.append(col_info)

        # ALTER TABLE ile eklenen FK'lari cikar
        fk_pattern = r'add\s+constraint\s+["\']?(\w+)["\']?\s+FOREIGN\s+KEY\s+\(([^)]+)\)\s+REFERENCES\s+(?:public\.)?(["\']?\w+["\']?)'
        for match in re.finditer(fk_pattern, sql_content, re.IGNORECASE):
            # FK'nin hangi tabloya ait oldugunu bul
            constraint_name = match.group(1)
            fk_columns = match.group(2)
            ref_table = match.group(3).strip('"\'')

            # Constraint adından tablo adını çıkar
            table_name_match = re.search(r'(\w+)_\w+_fkey', constraint_name)
            if table_name_match:
                source_table = table_name_match.group(1)
                if source_table in self.tables:
                    fk_info = f"{fk_columns.strip()} -> {ref_table}"
                    if fk_info not in self.tables[source_table].foreign_keys:
                        self.tables[source_table].foreign_keys.append(fk_info)

    def _extract_pages(self):
        """HTML sayfalarindan bilgi cikar"""
        html_files = list(self.project_root.glob("*.html"))

        for html_file in html_files:
            try:
                content = html_file.read_text(encoding="utf-8")
                page_info = self._parse_html_page(html_file.name, content)
                if page_info:
                    self.pages[html_file.name] = page_info
            except Exception:
                continue

    def _parse_html_page(self, filename: str, content: str) -> Optional[PageInfo]:
        """HTML sayfasini parse et"""
        # Kategori belirle
        if filename.startswith("bayi-"):
            category = "bayi"
        elif filename.startswith("isyerim-"):
            category = "isyerim-musteri"
        elif filename.startswith("backoffice-"):
            category = "backoffice"
        else:
            category = "genel"

        # Title cikar
        title_match = re.search(r'<title>([^<]+)</title>', content, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else filename

        # JS dosyalarini cikar
        js_files = re.findall(r'<script[^>]+src=["\']([^"\']+\.js)["\']', content)

        # Kullanilan servisleri tahmin et
        services_used = []
        service_patterns = [
            'CustomersService', 'OrdersService', 'ProductsService',
            'DealersService', 'OffersService', 'ReportsService',
            'PointsService', 'BranchesService', 'LocationsService',
            'CustomerUsersService', 'RecurringOrdersService'
        ]
        for svc in service_patterns:
            if svc in content:
                services_used.append(svc)

        # Sayfa aciklamasi olustur (icerikteki h1, h2 veya onemli elementlerden)
        description = self._generate_page_description(filename, content)

        return PageInfo(
            filename=filename,
            title=title,
            category=category,
            description=description,
            js_files=js_files,
            services_used=services_used
        )

    def _generate_page_description(self, filename: str, content: str) -> str:
        """Sayfa iceriginden aciklama uret"""
        descriptions = {
            "bayi-anasayfa.html": "Bayi dashboard - siparis ozeti, bekleyen siparisler, hizli islemler",
            "bayi-musteri-listesi.html": "Bayi musteri listesi - musterileri goruntule, ara, duzenle",
            "bayi-musteri-ekle.html": "Yeni musteri ekleme formu",
            "bayi-siparis-listesi.html": "Siparis listesi - tum siparisleri yonet",
            "bayi-baremli-fiyat-tanimla.html": "Baremli fiyat tanimlama - miktar bazli indirimler",
            "bayi-login.html": "Bayi giris sayfasi",
            "isyerim-musteri-login.html": "Isyerim musteri giris sayfasi",
            "isyerim-musteri-siparislerim.html": "Musteri siparisleri listesi",
            "isyerim-musteri-adreslerim.html": "Musteri adres yonetimi",
            "isyerim-musteri-puanlarim.html": "Musteri puan gecmisi ve bakiyesi",
            "isyerim-musteri-kuponlarim.html": "Musteri kuponlari",
            "isyerim-musteri-teslimat.html": "Teslimat takibi",
            "isyerim-musteri-kullanicilar.html": "Sube kullanicilari yonetimi",
            "isyerim-musteri-bayi-fiyatlari.html": "Musteriye ozel fiyatlar",
            "backoffice-login.html": "Backoffice giris sayfasi",
            "backoffice-bayi-listesi.html": "Tum bayilerin listesi",
            "backoffice-bayi-ekle.html": "Yeni bayi ekleme",
            "backoffice-bayi-duzenle.html": "Bayi bilgilerini duzenleme",
            "backoffice-raporlar.html": "Raporlar sayfasi - satis, siparis, musteri raporlari",
            "default.html": "Ana giris sayfasi - portal secimi"
        }

        return descriptions.get(filename, "Sayfa aciklamasi mevcut degil")

    def _extract_services(self):
        """JS servislerinden bilgi cikar"""
        services_dir = self.project_root / "js" / "services"

        if not services_dir.exists():
            return

        for js_file in services_dir.glob("*.js"):
            try:
                content = js_file.read_text(encoding="utf-8")
                service_info = self._parse_js_service(js_file.name, content)
                if service_info:
                    self.services[js_file.stem] = service_info
            except Exception:
                continue

    def _parse_js_service(self, filename: str, content: str) -> Optional[ServiceInfo]:
        """JS servis dosyasini parse et"""
        # Servis adini bul
        service_name_match = re.search(r'const\s+(\w+Service)\s*=\s*\{', content)
        if not service_name_match:
            return None

        service_name = service_name_match.group(1)

        # Metodlari bul (async function veya arrow function)
        methods = []

        # async method(params) pattern
        method_patterns = [
            r'async\s+(\w+)\s*\([^)]*\)\s*\{',  # async methodName() {
            r'(\w+)\s*:\s*async\s*\([^)]*\)\s*=>\s*\{',  # methodName: async () => {
            r'(\w+)\s*:\s*async\s+function\s*\([^)]*\)\s*\{',  # methodName: async function() {
        ]

        for pattern in method_patterns:
            for match in re.finditer(pattern, content):
                method_name = match.group(1)
                if method_name not in methods and not method_name.startswith('_'):
                    methods.append(method_name)

        # Servis aciklamasini doc comment'ten al
        desc_match = re.search(r'/\*\*\s*\n\s*\*\s*([^\n]+)', content)
        description = desc_match.group(1).strip() if desc_match else ""

        # Metod detaylarini cikar (parametre dahil)
        method_details = []
        detail_pattern = r'async\s+(\w+)\s*\(([^)]*)\)\s*\{'
        for match in re.finditer(detail_pattern, content):
            method_name = match.group(1)
            params_str = match.group(2).strip()
            params = [p.strip().split('=')[0].strip() for p in params_str.split(',') if p.strip()]
            method_details.append(MethodInfo(name=method_name, params=params))

        return ServiceInfo(
            name=service_name,
            filename=filename,
            methods=methods,
            method_details=method_details,
            description=description
        )

    def get_file_content(self, file_path: str, max_lines: int = 200) -> Optional[str]:
        """Belirli bir dosyanin icerigini oku"""
        full_path = self.project_root / file_path

        if not full_path.exists():
            return None

        try:
            content = full_path.read_text(encoding="utf-8")
            lines = content.split('\n')

            if len(lines) > max_lines:
                # Ilk max_lines satirini al ve uyari ekle
                truncated = '\n'.join(lines[:max_lines])
                truncated += f"\n\n// ... ({len(lines) - max_lines} satir daha var, truncated)"
                return truncated

            return content
        except Exception:
            return None

    def get_service_details(self, service_name: str) -> Optional[Dict]:
        """Servis dosyasinin detayli bilgisini getir"""
        # Servis adini dosya adina cevir (CustomersService -> customers-service.js)
        if service_name.endswith('Service'):
            base_name = service_name[:-7]  # 'Service' sil
            # CamelCase to kebab-case
            kebab_name = re.sub(r'([A-Z])', r'-\1', base_name).lower().lstrip('-')
            filename = f"{kebab_name}-service.js"
        else:
            filename = f"{service_name.lower()}-service.js"

        file_path = f"js/services/{filename}"
        content = self.get_file_content(file_path, max_lines=300)

        if not content:
            return None

        # Servisi parse et
        service_info = self._parse_js_service(filename, content)

        if not service_info:
            return None

        return {
            "name": service_info.name,
            "filename": filename,
            "file_path": file_path,
            "methods": [
                {
                    "name": md.name,
                    "params": md.params,
                    "signature": f"async {md.name}({', '.join(md.params)})"
                }
                for md in service_info.method_details
            ],
            "code_snippet": content[:3000] if len(content) > 3000 else content
        }

    def detect_target_files(self, user_request: str) -> List[str]:
        """Kullanici talebinden guncellenecek dosyalari tahmin et"""
        target_files = []
        request_lower = user_request.lower()

        # Sayfa adlari
        page_patterns = {
            "raporlar": "backoffice-raporlar.html",
            "bayi listesi": "backoffice-bayi-listesi.html",
            "musteri listesi": "bayi-musteri-listesi.html",
            "musteri ekle": "bayi-musteri-ekle.html",
            "siparis": "bayi-siparis-listesi.html",
            "login": None,  # Birden fazla olabilir
            "anasayfa": None,
            "dashboard": "backoffice-anasayfa.html",
        }

        for keyword, page in page_patterns.items():
            if keyword in request_lower and page:
                target_files.append(page)

        # Servis adlari
        service_keywords = {
            "musteri": "js/services/customers-service.js",
            "customer": "js/services/customers-service.js",
            "siparis": "js/services/orders-service.js",
            "order": "js/services/orders-service.js",
            "bayi": "js/services/dealers-service.js",
            "dealer": "js/services/dealers-service.js",
            "rapor": "js/services/reports-service.js",
            "report": "js/services/reports-service.js",
            "urun": "js/services/products-service.js",
            "product": "js/services/products-service.js",
            "teklif": "js/services/offers-service.js",
            "offer": "js/services/offers-service.js",
        }

        for keyword, service_file in service_keywords.items():
            if keyword in request_lower and service_file not in target_files:
                target_files.append(service_file)

        return target_files

    def get_related_files_content(self, target_files: List[str], max_chars_per_file: int = 2000) -> str:
        """Hedef dosyalarin mevcut iceriklerini formatli string olarak getir"""
        contents = []

        for file_path in target_files[:5]:  # Max 5 dosya
            content = self.get_file_content(file_path, max_lines=100)
            if content:
                # Cok uzunsa kirp
                if len(content) > max_chars_per_file:
                    content = content[:max_chars_per_file] + "\n// ... (truncated)"

                contents.append(f"""
### {file_path}
```{'javascript' if file_path.endswith('.js') else 'html'}
{content}
```
""")

        if not contents:
            return ""

        return "## GUNCELLENECEK DOSYALARIN MEVCUT HALI\n" + "\n".join(contents)

    def generate_context_string(self, max_length: int = 8000) -> str:
        """Agent'lara verilecek baglam stringi olustur"""
        self.extract_all()

        lines = []
        lines.append("=" * 60)
        lines.append("PROJE BAGLAMI: IPRAGAZ BAYI YONETIM SISTEMI")
        lines.append("=" * 60)

        # Teknoloji stack
        lines.append("\n## TEKNOLOJI")
        lines.append("- Frontend: Vanilla HTML/CSS/JavaScript (framework yok)")
        lines.append("- Backend: Supabase (PostgreSQL + Auth + Realtime)")
        lines.append("- Deployment: Vercel")

        # Veritabani semasi
        lines.append("\n## VERITABANI SEMASI")
        for table_name, table_info in sorted(self.tables.items()):
            if len(table_info.columns) > 0:
                cols_str = ", ".join(table_info.columns[:8])  # Ilk 8 kolon
                if len(table_info.columns) > 8:
                    cols_str += f" (+{len(table_info.columns) - 8} more)"
                lines.append(f"- {table_name}: {cols_str}")

                if table_info.foreign_keys:
                    fks = ", ".join(table_info.foreign_keys[:3])
                    lines.append(f"  FK: {fks}")

        # Sayfa envanteri
        lines.append("\n## SAYFALAR")

        # Kategorilere gore grupla
        categories = {"bayi": [], "isyerim-musteri": [], "backoffice": [], "genel": []}
        for page_name, page_info in self.pages.items():
            categories[page_info.category].append(page_info)

        for cat, pages in categories.items():
            if pages:
                lines.append(f"\n### {cat.upper()}")
                for page in sorted(pages, key=lambda x: x.filename):
                    services_str = f" [{', '.join(page.services_used)}]" if page.services_used else ""
                    lines.append(f"- {page.filename}: {page.description}{services_str}")

        # Servisler
        lines.append("\n## JS SERVİSLERİ")
        for service_name, service_info in sorted(self.services.items()):
            methods_str = ", ".join(service_info.methods[:5])
            if len(service_info.methods) > 5:
                methods_str += f" (+{len(service_info.methods) - 5} more)"
            lines.append(f"- {service_info.name}: {methods_str}")

        # CSS pattern'lari
        lines.append("\n## CSS PATTERN'LARI - KRITIK!")
        lines.append("- ONEMLI: Backoffice sayfalari INLINE CSS kullanir (<style> tag icinde)")
        lines.append("- ONEMLI: Bayi sayfalari INLINE CSS kullanir (<style> tag icinde)")
        lines.append("- Harici CSS dosyasi YOKTUR - css/ klasoru neredeyse bos!")
        lines.append("- CSS degiskenleri :root icinde tanimli (--bo-primary, --bo-sidebar-bg, vb.)")
        lines.append("- Sinif adlari prefix'li: bo-* (backoffice), bayi-* (bayi paneli)")
        lines.append("- Google Fonts: Poppins")

        # JS dosya yapisi
        lines.append("\n## JS DOSYA YAPISI - KRITIK!")
        lines.append("- Servis dosyalari: js/services/[isim]-service.js (kebab-case, kucuk harf)")
        lines.append("- Ornek: dealers-service.js, customers-service.js, orders-service.js")
        lines.append("- Supabase client: js/supabase-client.js (js/supabase.js DEGIL!)")
        lines.append("- UYARI: js/pages/ klasoru YOKTUR!")
        lines.append("- UYARI: css/components/ klasoru YOKTUR!")
        lines.append("- Sayfa JS'leri genelde inline <script> icinde veya root js/ altinda")

        # Kod pattern'lari
        lines.append("\n## KOD PATTERN'LARI")
        lines.append("- Supabase client: window.supabaseClient uzerinden erisim")
        lines.append("- Servisler: Global object olarak tanimli (window.XxxService)")
        lines.append("- Async/await kullanimi")
        lines.append("- Error handling: try/catch + {data, error} return pattern")
        lines.append("- Component loader: HTML parcalarini dinamik yukleme")
        lines.append("- Responsive: Mobile-first CSS")

        context = "\n".join(lines)

        # Uzunluk siniri
        if len(context) > max_length:
            context = context[:max_length - 100] + "\n\n... (truncated)"

        return context


# Singleton instance with time-based cache
_context_extractor: Optional[ProjectContextExtractor] = None
_context_cache: Optional[str] = None
_cache_timestamp: float = 0
_CACHE_TTL_SECONDS: int = 300  # 5 dakika


def get_project_context(project_root: str = None, refresh: bool = False) -> str:
    """
    Proje baglamini getir (time-based cache)
    - Her 5 dakikada bir otomatik yenilenir
    - refresh=True ile manuel yenileme yapilabilir
    """
    import time
    global _context_extractor, _context_cache, _cache_timestamp

    current_time = time.time()
    cache_expired = (current_time - _cache_timestamp) > _CACHE_TTL_SECONDS

    if _context_cache is None or refresh or cache_expired:
        _context_extractor = ProjectContextExtractor(project_root)
        _context_cache = _context_extractor.generate_context_string()
        _cache_timestamp = current_time

        if cache_expired and _context_cache:
            print(f"[ProjectContext] Cache yenilendi ({len(_context_cache)} karakter)")

    return _context_cache


def refresh_project_context() -> str:
    """Proje baglamini zorla yenile"""
    return get_project_context(refresh=True)


def get_file_content(file_path: str, project_root: str = None) -> Optional[str]:
    """Belirli bir dosyanin icerigini getir"""
    extractor = ProjectContextExtractor(project_root)
    return extractor.get_file_content(file_path)


def get_service_details(service_name: str, project_root: str = None) -> Optional[Dict]:
    """Servis dosyasinin detayli bilgisini getir"""
    extractor = ProjectContextExtractor(project_root)
    return extractor.get_service_details(service_name)


def detect_target_files(user_request: str, project_root: str = None) -> List[str]:
    """Kullanici talebinden guncellenecek dosyalari tahmin et"""
    extractor = ProjectContextExtractor(project_root)
    return extractor.detect_target_files(user_request)


def get_related_files_content(user_request: str, project_root: str = None) -> str:
    """Kullanici talebine gore ilgili dosyalarin iceriklerini getir"""
    extractor = ProjectContextExtractor(project_root)
    target_files = extractor.detect_target_files(user_request)
    return extractor.get_related_files_content(target_files)


# Test
if __name__ == "__main__":
    context = get_project_context()
    print(context)
    print(f"\n\nToplam karakter: {len(context)}")

    # Yeni metodlari test et
    print("\n" + "=" * 60)
    print("HEDEF DOSYA TESPITI TESTI")
    print("=" * 60)

    test_request = "Raporlar sayfasindaki bayi performans raporunu duzelt"
    targets = detect_target_files(test_request)
    print(f"Talep: {test_request}")
    print(f"Tespit edilen dosyalar: {targets}")

    print("\n" + "=" * 60)
    print("SERVIS DETAY TESTI")
    print("=" * 60)

    details = get_service_details("ReportsService")
    if details:
        print(f"Servis: {details['name']}")
        print(f"Dosya: {details['file_path']}")
        print("Metodlar:")
        for m in details['methods'][:5]:
            print(f"  - {m['signature']}")
