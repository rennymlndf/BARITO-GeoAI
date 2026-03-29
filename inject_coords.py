import json
import re

with open('coords_updates.json', 'r') as f:
    updates = json.load(f)

# Update js/data.js
with open('js/data.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

for nama, coords in updates.items():
    lat, lng = coords
    # Matches: nama: 'Sungai Andai', kecamatan: '...', lat: -3.2780, lng: 114.5650,
    pattern = r"(nama:\s*['\"]" + re.escape(nama) + r"['\"].*?lat:\s*)-?\d+\.\d+(,\s*lng:\s*)-?\d+\.\d+"
    replacement = rf"\g<1>{lat}\g<2>{lng}"
    js_content = re.sub(pattern, replacement, js_content, flags=re.DOTALL)

with open('js/data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

# Update backend/data.py
with open('backend/data.py', 'r', encoding='utf-8') as f:
    py_content = f.read()

for nama, coords in updates.items():
    lat, lng = coords
    # Matches: 'nama': 'Sungai Andai', 'kecamatan': '...', 'lat': -3.2780, 'lng': 114.5650,
    pattern = r"('nama':\s*['\"]" + re.escape(nama) + r"['\"].*?'lat':\s*)-?\d+\.\d+(,\s*'lng':\s*)-?\d+\.\d+"
    replacement = rf"\g<1>{lat}\g<2>{lng}"
    py_content = re.sub(pattern, replacement, py_content, flags=re.DOTALL)

with open('backend/data.py', 'w', encoding='utf-8') as f:
    f.write(py_content)

print("Injeksi js/data.js dan backend/data.py selesai!")
