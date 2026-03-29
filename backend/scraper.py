import requests
import json
import os
import datetime
from dateutil.relativedelta import relativedelta

def fetch_latest_weather_data():
    """
    Menarik data curah hujan historis (12 bulan terakhir) dari Open-Meteo Archive API
    Untuk koordinat Banjarmasin (Lat: -3.3166, Lon: 114.5901)
    """
    print("[SCRAPER] Mengambil data iklim terbaru untuk Banjarmasin dari Open-Meteo API...")
    
    # Koordinat Banjarmasin
    lat = -3.3166
    lon = 114.5901
    
    # Menghitung tanggal (12 bulan ke belakang dari hari ini)
    today = datetime.date.today()
    # Paskan ke akhir bulan lalu
    end_date = today.replace(day=1) - datetime.timedelta(days=1)
    start_date = (end_date - relativedelta(months=11)).replace(day=1)
    
    url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}&daily=precipitation_sum&timezone=Asia%2FJakarta"
    
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        daily_precipitation = data['daily']['precipitation_sum']
        time_array = data['daily']['time']
        
        # Agregasi data harian menjadi bulanan
        monthly_rain = {}
        for i, date_str in enumerate(time_array):
            month_key = date_str[:7] # YYYY-MM
            precip = daily_precipitation[i] if daily_precipitation[i] is not None else 0.0
            
            if month_key not in monthly_rain:
                monthly_rain[month_key] = 0.0
            monthly_rain[month_key] += precip
            
        print(f"[SCRAPER] Data historis ditarik ({len(monthly_rain)} bulan).")
        
        # Susun array 12 bulan (Jan-Des) berdasarkan data terbaru dari 12 bulan ini
        # Karena kita mungkin mengambil misalnya dari Mar 2025 ke Feb 2026, 
        # kita akan petakan ke array index 0-11 (Bulan 1 - 12)
        
        # Inisialisasi default jika API gagal untuk bulan tertentu
        final_monthly_rain = [200.0] * 12 
        
        for k, v in monthly_rain.items():
            month_idx = int(k.split('-')[1]) - 1 # 0 to 11
            final_monthly_rain[month_idx] = round(v, 2)
            
        # Simpan ke JSON
        output_data = {
            "source": "Open-Meteo API",
            "last_synced": today.strftime('%Y-%m-%d %H:%M:%S'),
            "curah_hujan_bulanan": final_monthly_rain
        }
        
        file_path = os.path.join(os.path.dirname(__file__), 'dynamic_weather.json')
        with open(file_path, 'w') as f:
            json.dump(output_data, f, indent=4)
            
        print(f"[SCRAPER] Sukses. Data curah hujan bulanan terupdate: {final_monthly_rain}")
        return True, "Data berhasil ditarik dari Open-Meteo API."
        
    except Exception as e:
        print(f"[SCRAPER] Error menarik data API: {e}")
        return False, str(e)

if __name__ == '__main__':
    fetch_latest_weather_data()
