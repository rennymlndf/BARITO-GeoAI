import sys
import os

# Add the current directory to sys.path to allow imports from beckend/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_session, RainfallData, FloodIncident, TidalData
from data import CURAH_HUJAN_2023, CURAH_HUJAN_2024, CURAH_HUJAN_2025, CURAH_HUJAN_2026, TIDAL_DATA
import datetime

def sync_live_data():
    session = db_session()
    print("Syncing Live Data (2023 - 2026)...")
    
    # 1. Sync Rainfall Data
    datasets = [
        (2023, CURAH_HUJAN_2023),
        (2024, CURAH_HUJAN_2024),
        (2025, CURAH_HUJAN_2025),
        (2026, CURAH_HUJAN_2026)
    ]
    
    for year, rain_list in datasets:
        for month_idx, val in enumerate(rain_list):
            month = month_idx + 1
            # For 2026, only sync up to April
            if year == 2026 and month > 4:
                break
                
            rain = session.query(RainfallData).filter_by(month=month, year=year).first()
            if not rain:
                session.add(RainfallData(month=month, year=year, rainfall=val))
                print(f"  [+] Added Rainfall {year}-{month:02d}: {val}mm")
            else:
                rain.rainfall = val
                print(f"  [*] Updated Rainfall {year}-{month:02d}: {val}mm")
    
    # 2. Sync Tidal Data (Monthly Patterns)
    print("Syncing Tidal Pattern for April...")
    tide = session.query(TidalData).filter_by(month=4).first()
    if tide:
        tide.pasang_maks = TIDAL_DATA['pasangMaks'][3]
        tide.pasang_rata = TIDAL_DATA['pasangRata'][3]
        tide.kejadian_banjir = TIDAL_DATA['kejadianBanjir'][3]
        print(f"  [*] Updated Tidal April: {tide.pasang_maks}cm")
    
    # 3. Add Live Flood Incidents for April 2026
    print("Adding April 2026 Flood Incidents...")
    recent_incidents = [
        {'kel_id': 1, 'date': datetime.datetime(2026, 4, 1, 8, 30), 'depth': 45, 'desc': 'Luapan sungai Barito akibat pasang tinggi'},
        {'kel_id': 39, 'date': datetime.datetime(2026, 4, 1, 10, 15), 'depth': 60, 'desc': 'Kenaikan debit air di pemukiman bantaran sungai'},
        {'kel_id': 52, 'date': datetime.datetime(2026, 4, 2, 5, 0), 'depth': 35, 'desc': 'Genangan di area pesisir Mantuil'}
    ]
    for inc in recent_incidents:
        exists = session.query(FloodIncident).filter_by(kelurahan_id=inc['kel_id'], date=inc['date']).first()
        if not exists:
            session.add(FloodIncident(
                kelurahan_id=inc['kel_id'],
                date=inc['date'],
                depth_cm=inc['depth'],
                description=inc['desc'],
                is_verified=1
            ))
            print(f"  [+] Added Incident in Kelurahan {inc['kel_id']} on {inc['date']}")
    
    try:
        session.commit()
        print("\nData April 2026 successfully synced and added to database!")
    except Exception as e:
        session.rollback()
        print(f"\nError committing data: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    sync_live_data()
