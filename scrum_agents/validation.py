"""
Kod Dogrulama Modulu
Agent'larin urettigi kodlarin gecerliligini kontrol eder.
"""

import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """Dogrulama sonucu"""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    file_path: Optional[str] = None


class CodeValidator:
    """Kod dogrulama sinifi"""

    def __init__(self, project_root: str = None):
        if project_root:
            self.project_root = Path(project_root)
        else:
            self.project_root = Path(__file__).parent.parent

    def validate_js_syntax(self, code: str, filename: str = "temp.js") -> ValidationResult:
        """
        JavaScript syntax kontrolu (node --check ile)
        """
        errors = []

        # Gecici dosya olustur
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(code)
            temp_path = f.name

        try:
            # node --check ile syntax kontrolu
            result = subprocess.run(
                ['node', '--check', temp_path],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                # Hata mesajini parse et
                error_msg = result.stderr.strip()
                if error_msg:
                    errors.append(f"JS Syntax Error: {error_msg}")
        except FileNotFoundError:
            errors.append("Node.js bulunamadi - syntax kontrolu yapilamadi")
        except subprocess.TimeoutExpired:
            errors.append("Syntax kontrolu zaman asimina ugradi")
        except Exception as e:
            errors.append(f"Syntax kontrolu hatasi: {str(e)}")
        finally:
            # Gecici dosyayi sil
            try:
                os.unlink(temp_path)
            except:
                pass

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            file_path=filename
        )

    def validate_html_basic(self, html_content: str, filename: str = "temp.html") -> ValidationResult:
        """
        HTML temel syntax kontrolu (regex ile)
        """
        errors = []
        warnings = []

        # DOCTYPE kontrolu
        if not re.search(r'<!DOCTYPE\s+html>', html_content, re.IGNORECASE):
            warnings.append("DOCTYPE eksik")

        # html, head, body tag kontrolu
        if not re.search(r'<html[^>]*>', html_content, re.IGNORECASE):
            errors.append("HTML tag'i eksik")

        if not re.search(r'<head[^>]*>', html_content, re.IGNORECASE):
            warnings.append("HEAD tag'i eksik")

        if not re.search(r'<body[^>]*>', html_content, re.IGNORECASE):
            errors.append("BODY tag'i eksik")

        # Acilmamis/kapanmamis tag kontrolu (basit)
        # script, style, div, span icin kontrol
        tags_to_check = ['script', 'style', 'div', 'span', 'table', 'form']
        for tag in tags_to_check:
            open_count = len(re.findall(f'<{tag}[^>]*>', html_content, re.IGNORECASE))
            close_count = len(re.findall(f'</{tag}>', html_content, re.IGNORECASE))
            # Self-closing olmayanlar icin kontrol
            if tag not in ['br', 'hr', 'img', 'input', 'meta', 'link']:
                if open_count != close_count:
                    errors.append(f"<{tag}> tag sayisi uyusmuyor (acik: {open_count}, kapali: {close_count})")

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            file_path=filename
        )

    def check_file_references(self, html_content: str, filename: str = None) -> ValidationResult:
        """
        HTML'deki dosya referanslarinin var olup olmadigini kontrol et
        """
        errors = []
        warnings = []

        # CSS referanslari (href)
        css_refs = re.findall(r'href=["\']([^"\']+\.css)["\']', html_content)
        for ref in css_refs:
            if ref.startswith('http') or ref.startswith('//'):
                continue  # CDN, skip

            file_path = self.project_root / ref
            if not file_path.exists():
                errors.append(f"CSS dosyasi bulunamadi: {ref}")

        # JS referanslari (src)
        js_refs = re.findall(r'src=["\']([^"\']+\.js)["\']', html_content)
        for ref in js_refs:
            if ref.startswith('http') or ref.startswith('//'):
                continue  # CDN, skip

            file_path = self.project_root / ref
            if not file_path.exists():
                errors.append(f"JS dosyasi bulunamadi: {ref}")

        # Image referanslari (src)
        img_refs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html_content)
        for ref in img_refs:
            if ref.startswith('http') or ref.startswith('//') or ref.startswith('data:'):
                continue  # CDN veya data URL, skip

            file_path = self.project_root / ref
            if not file_path.exists():
                warnings.append(f"Gorsel bulunamadi: {ref}")

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            file_path=filename
        )

    def check_service_methods(self, code: str, service_name: str) -> ValidationResult:
        """
        Kod icinde cagirilan metodlarin serviste var olup olmadigini kontrol et
        """
        from project_context import get_service_details

        errors = []
        warnings = []

        # Servis detaylarini al
        details = get_service_details(service_name)
        if not details:
            warnings.append(f"Servis bulunamadi: {service_name}")
            return ValidationResult(is_valid=True, warnings=warnings)

        # Serviste tanimli metodlar
        defined_methods = {m['name'] for m in details['methods']}

        # Kodda cagirilan metodlari bul (ServiceName.methodName pattern)
        called_methods = set(re.findall(rf'{service_name}\.(\w+)\s*\(', code))

        # Eksik metodlari bul
        missing_methods = called_methods - defined_methods
        for method in missing_methods:
            errors.append(f"{service_name}.{method}() metodu serviste tanimli degil")

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def validate_generated_code(self, code: str, file_type: str, filename: str = None) -> ValidationResult:
        """
        Uretilen kodu dosya tipine gore dogrula
        """
        all_errors = []
        all_warnings = []

        if file_type in ['js', 'javascript']:
            # JS syntax kontrolu
            js_result = self.validate_js_syntax(code, filename)
            all_errors.extend(js_result.errors)
            all_warnings.extend(js_result.warnings)

            # Servis metod kontrolu (eger servis kullaniliyorsa)
            service_patterns = [
                'CustomersService', 'OrdersService', 'ProductsService',
                'DealersService', 'OffersService', 'ReportsService',
                'PointsService', 'BranchesService', 'LocationsService'
            ]
            for service in service_patterns:
                if service in code:
                    method_result = self.check_service_methods(code, service)
                    all_errors.extend(method_result.errors)
                    all_warnings.extend(method_result.warnings)

        elif file_type in ['html']:
            # HTML syntax kontrolu
            html_result = self.validate_html_basic(code, filename)
            all_errors.extend(html_result.errors)
            all_warnings.extend(html_result.warnings)

            # Dosya referans kontrolu
            ref_result = self.check_file_references(code, filename)
            all_errors.extend(ref_result.errors)
            all_warnings.extend(ref_result.warnings)

        return ValidationResult(
            is_valid=len(all_errors) == 0,
            errors=all_errors,
            warnings=all_warnings,
            file_path=filename
        )


def validate_code(code: str, file_type: str, filename: str = None, project_root: str = None) -> ValidationResult:
    """
    Kolaylik icin module-level fonksiyon
    """
    validator = CodeValidator(project_root)
    return validator.validate_generated_code(code, file_type, filename)


def validate_js(code: str, filename: str = None, project_root: str = None) -> ValidationResult:
    """JavaScript kodu dogrula"""
    validator = CodeValidator(project_root)
    return validator.validate_js_syntax(code, filename)


def validate_html(html_content: str, filename: str = None, project_root: str = None) -> ValidationResult:
    """HTML kodu dogrula"""
    validator = CodeValidator(project_root)
    result1 = validator.validate_html_basic(html_content, filename)
    result2 = validator.check_file_references(html_content, filename)

    return ValidationResult(
        is_valid=result1.is_valid and result2.is_valid,
        errors=result1.errors + result2.errors,
        warnings=result1.warnings + result2.warnings,
        file_path=filename
    )


# Test
if __name__ == "__main__":
    print("=" * 60)
    print("CODE VALIDATOR TEST")
    print("=" * 60)

    validator = CodeValidator()

    # JS Test
    print("\n1. JS Syntax Test:")
    valid_js = """
    const test = async () => {
        const result = await fetch('/api/data');
        return result.json();
    };
    """
    result = validator.validate_js_syntax(valid_js)
    print(f"   Valid JS: is_valid={result.is_valid}")

    invalid_js = """
    const test = async () => {
        const result = await fetch('/api/data'
        return result.json();
    };
    """
    result = validator.validate_js_syntax(invalid_js)
    print(f"   Invalid JS: is_valid={result.is_valid}, errors={result.errors}")

    # HTML Test
    print("\n2. HTML Reference Test:")
    html_with_refs = """
    <!DOCTYPE html>
    <html>
    <head>
        <link href="css/nonexistent.css" rel="stylesheet">
        <script src="js/supabase-client.js"></script>
        <script src="js/nonexistent.js"></script>
    </head>
    <body></body>
    </html>
    """
    result = validator.check_file_references(html_with_refs)
    print(f"   References: is_valid={result.is_valid}")
    for error in result.errors:
        print(f"   - {error}")

    # Service Method Test
    print("\n3. Service Method Test:")
    code_with_methods = """
    async function getData() {
        const result = await CustomersService.getAll();
        const single = await CustomersService.nonExistentMethod();
        return result;
    }
    """
    result = validator.check_service_methods(code_with_methods, "CustomersService")
    print(f"   Methods: is_valid={result.is_valid}")
    for error in result.errors:
        print(f"   - {error}")
