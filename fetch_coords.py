import json
import re
import time
import requests

def extract_kelurahan_data():
    with open('backend/data.py', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the KELURAHAN_DATA list
    match = re.search(r'KELURAHAN_DATA\s*=\s*(.*?\])', content, re.DOTALL)
    if not match:
        print("Could not find KELURAHAN_DATA")
        return None
        
    try:
        data_str = match.group(1).replace("'", '"')
        # This regex might not be perfect for complete valid JSON, so let's parse via eval
        # However, backend/data.py is valid python.
        namespace = {}
        exec(f"KELURAHAN_DATA = {match.group(1)}", namespace)
        return namespace['KELURAHAN_DATA']
    except Exception as e:
        print(f"Error extracting data: {e}")
        return None

def fetch_coords(kelurahans):
    print("Mulai pemindaian satelit 52 Kelurahan...")
    updates = {}
    for kel in kelurahans:
        nama = kel['nama']
        query = f"Kelurahan {nama}, Banjarmasin, Indonesia"
        try:
            r = requests.get('https://nominatim.openstreetmap.org/search', 
                             params={'q': query, 'format': 'json'}, 
                             headers={'User-Agent': 'BaritoApp/1.0'})
            res = r.json()
            if len(res) > 0:
                lat = float(res[0]['lat'])
                lng = float(res[0]['lon'])
                updates[nama] = (lat, lng)
                print(f"[OK] {nama}: {lat}, {lng}")
            else:
                # Fallback fuzzy search
                q2 = f"{nama}, Banjarmasin, Indonesia"
                r2 = requests.get('https://nominatim.openstreetmap.org/search', 
                                 params={'q': q2, 'format': 'json'}, 
                                 headers={'User-Agent': 'BaritoApp/1.0'})
                res2 = r2.json()
                if len(res2) > 0:
                    lat = float(res2[0]['lat'])
                    lng = float(res2[0]['lon'])
                    updates[nama] = (lat, lng)
                    print(f"[OK fuzzy] {nama}: {lat}, {lng}")
                else:
                    print(f"[FAILED] {nama}")
        except Exception as e:
            print(f"[ERROR] {nama}: {e}")
        time.sleep(1.2) # strict nominatim policy
    
    with open('coords_updates.json', 'w') as f:
        json.dump(updates, f)
    print("Scraping selesai.")

kel_list = extract_kelurahan_data()
if kel_list:
    fetch_coords(kel_list)
