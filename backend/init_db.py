from database import (
    engine, Base, Kelurahan, TidalData, RainfallData, User, db_session,
    Kecamatan, JenisTanah, TataGunaLahan, RiskLevelModel, WeatherStation
)
from data import (
    KELURAHAN_DATA, TIDAL_DATA, CURAH_HUJAN_2024, CURAH_HUJAN_2023,
    TATA_GUNA_LAHAN, JENIS_TANAH, RISK_LABELS
)
from sqlalchemy import text
from werkzeug.security import generate_password_hash
import random

def init_db():
    print(f"Connecting to database...")
    try:
        # Create extension postgis if not exists
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.commit()
            
        print("Dropping existing tables and creating new ones...")
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        
        session = db_session()
        
        # 1. Seed Master Data: Risk Levels
        print("Seeding Master Data: Risk Levels...")
        colors = {1: "#27ae60", 2: "#f1c40f", 3: "#e67e22", 4: "#c0392b"}
        for rid, label in RISK_LABELS.items():
            session.add(RiskLevelModel(id=rid, label=label, warna_hex=colors.get(rid, "#7f8c8d")))
        
        # 2. Seed Master Data: Jenis Tanah
        print("Seeding Master Data: Jenis Tanah...")
        for tid, tname in JENIS_TANAH.items():
            session.add(JenisTanah(id=tid, nama=tname, deskripsi=f"Karakteristik tanah {tname} di lahan basah Banjarmasin"))
            
        # 3. Seed Master Data: Tata Guna Lahan
        print("Seeding Master Data: Tata Guna Lahan...")
        runoff = {1: 0.8, 2: 0.6, 3: 0.85, 4: 0.95, 5: 0.7}
        for lid, lname in TATA_GUNA_LAHAN.items():
            session.add(TataGunaLahan(id=lid, nama=lname, koefisien_limpasan=runoff.get(lid, 0.5)))
            
        # 4. Seed Master Data: Kecamatan
        print("Seeding Master Data: Kecamatan...")
        kec_names = sorted(list(set([k['kecamatan'] for k in KELURAHAN_DATA])))
        kec_map = {}
        for i, kname in enumerate(kec_names):
            new_kec = Kecamatan(id=i+1, nama=kname)
            session.add(new_kec)
            kec_map[kname] = i+1
        
        session.flush() # Ensure IDs are available

        # 5. Migrate Kelurahan Data
        print("Migrating Kelurahan data (with Foreign Keys)...")
        for kel in KELURAHAN_DATA:
            new_kel = Kelurahan(
                id=kel['id'],
                nama=kel['nama'],
                kecamatan_id=kec_map.get(kel['kecamatan']),
                tata_guna_lahan_id=kel['tataGunaLahan'],
                jenis_tanah_id=kel['jenisTanah'],
                base_risk_level_id=kel['riskLevel'],
                geom=f'SRID=4326;POINT({kel["lng"]} {kel["lat"]})',
                penduduk=kel['penduduk'],
                luas_km2=kel['luasKm2'],
                elevasi=kel['elevasi'],
                jarak_sungai=kel['jarakSungai'],
                curah_hujan_tahunan=kel['curahHujan'],
                kualitas_drainase=kel['kualitasDrainase'],
                pengaruh_pasang=kel['pengaruhPasang'],
                kepadatan_penduduk=kel['kepadatanPenduduk']
            )
            session.add(new_kel)
            
        # 6. Migrate Tidal data
        print("Migrating Tidal data...")
        for i in range(12):
            new_tide = TidalData(
                month=i+1,
                pasang_maks=TIDAL_DATA['pasangMaks'][i],
                pasang_rata=TIDAL_DATA['pasangRata'][i],
                kejadian_banjir=TIDAL_DATA['kejadianBanjir'][i]
            )
            session.add(new_tide)
            
        # 7. Migrate Rainfall data (12 Years Historical up to April 2026)
        print("Migrating Rainfall data (Extended to 2026)...")
        from data import CURAH_HUJAN_2025, CURAH_HUJAN_2026
        random.seed(42)
        
        for year in range(2015, 2027): # Include 2026
            for i in range(12):
                # Only seed up to April for 2026
                if year == 2026 and i > 3: break 
                
                if year == 2026: val = CURAH_HUJAN_2026[i]
                elif year == 2025: val = CURAH_HUJAN_2025[i]
                elif year == 2024: val = CURAH_HUJAN_2024[i]
                elif year == 2023: val = CURAH_HUJAN_2023[i]
                else: 
                    base_avg = (CURAH_HUJAN_2024[i] + CURAH_HUJAN_2023[i]) / 2
                    rain_multiplier = 1.0
                    if year in [2020, 2021, 2022]: rain_multiplier = random.uniform(1.15, 1.30)
                    elif year in [2015, 2019]: rain_multiplier = random.uniform(0.70, 0.85)
                    val = base_avg * rain_multiplier
                
                session.add(RainfallData(month=i+1, year=year, rainfall=round(val, 2)))
        
        # 8. Seed Weather Stations
        print("Seeding Weather Stations...")
        stations = [
            ("Stasiun Syamsudin Noor", -3.44, 114.76),
            ("Stasiun Maritim Barito", -3.32, 114.54),
            ("Pos Pengamatan Alalak", -3.27, 114.57),
            ("Pos Pengamatan Sungai Lulut", -3.32, 114.63)
        ]
        for name, lat, lng in stations:
            session.add(WeatherStation(nama=name, lat=lat, lng=lng, status='Active'))

        # 9. Seed Recent Flood Incidents (April 2026)
        print("Seeding Recent Flood Incidents (April 2026)...")
        from database import FloodIncident
        import datetime
        recent_incidents = [
            {'kel_id': 1, 'date': datetime.datetime(2026, 4, 1, 8, 30), 'depth': 45, 'desc': 'Luapan sungai Barito akibat pasang tinggi'},
            {'kel_id': 39, 'date': datetime.datetime(2026, 4, 1, 10, 15), 'depth': 60, 'desc': 'Kenaikan debit air di pemukiman bantaran sungai'},
            {'kel_id': 52, 'date': datetime.datetime(2026, 4, 2, 5, 00), 'depth': 35, 'desc': 'Genangan di area pesisir Mantuil'}
        ]
        for inc in recent_incidents:
            session.add(FloodIncident(
                kelurahan_id=inc['kel_id'],
                date=inc['date'],
                depth_cm=inc['depth'],
                description=inc['desc'],
                is_verified=1
            ))

        # 10. Create default admin user
        print("Creating default admin user...")
        admin_user = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='admin'
        )
        session.add(admin_user)
        
        session.commit()
        print("Migration completed successfully for all 13 tables!")
        
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")

if __name__ == "__main__":
    init_db()
