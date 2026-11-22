"""Comprueba los hashes de la entrega: python docs/verificar_integridad.py."""
from pathlib import Path
import hashlib, json, sys

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/'docs/manifest_archivos.json').read_text(encoding='utf-8'))
errors = []
for item in manifest['archivos']:
    path = root/item['archivo']
    if not path.is_file(): errors.append('Falta: '+item['archivo'])
    elif hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
        errors.append('Cambió: '+item['archivo'])
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('Todos los archivos enumerados coinciden con la entrega auditada.')
print('Esto verifica integridad, no funcionamiento de la URL de GitHub Pages.')
