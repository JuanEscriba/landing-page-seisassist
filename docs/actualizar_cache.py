"""Ejecutar desde cualquier carpeta: python docs/actualizar_cache.py.
Actualiza la caché y la copia legible del código; no declara aprobada una auditoría.
"""
from pathlib import Path
import hashlib, html, json, re

root = Path(__file__).resolve().parents[1]
files = sorted(p for p in root.rglob('*') if p.is_file()
               and 'docs' not in p.relative_to(root).parts
               and p.name != 'sw.js'
               and p.suffix in ('.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.mp4', '.webm'))
digest = hashlib.sha256()
for path in files:
    digest.update(path.relative_to(root).as_posix().encode())
    digest.update(path.read_bytes())
version = digest.hexdigest()[:12]
paths = ['./'] + ['./' + p.relative_to(root).as_posix() for p in files]
sw = root / 'sw.js'
source = sw.read_text(encoding='utf-8')
source = re.sub(r"const CACHE = PREFIX \+ '[^']+';", f"const CACHE = PREFIX + '{version}';", source)
source = re.sub(r'const PATHS = .*?;', 'const PATHS = ' + json.dumps(paths) + ';', source)
sw.write_text(source, encoding='utf-8')

code_files = ['pages/index.html', 'css/styles.css', 'js/main.js', 'sw.js', 'index.html', '.gitignore', 'docs/README.md']
sections = []
for name in code_files:
    text = (root / name).read_text(encoding='utf-8')
    sections.append(f'<details open><summary>{html.escape(name)} · archivo completo</summary><pre><code>{html.escape(text)}</code></pre></details>')
page = '''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="../favicon.ico"><title>Código completo · SeisAssist</title><style>body{font:16px/1.6 system-ui;margin:2rem;color:#0F2F3F}h1{font-size:28px}summary{font-weight:700;padding:1rem;background:#E2F2F0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#F2F4F6;padding:1rem;font:14px/1.5 monospace}details{margin:2rem 0}</style></head><body><h1>Código completo corregido</h1><p>Cada bloque reproduce un archivo íntegro. Copia todo su contenido en la ruta indicada. Los recursos binarios y SVG se suministran en el ZIP.</p>''' + ''.join(sections) + '</body></html>'
(root / 'docs/codigo_completo.html').write_text(page, encoding='utf-8')
print('Caché actualizada:', version)
print('Recursos locales:', len(files))
print('Actualiza las pruebas y el manifiesto después de verificar los cambios.')
