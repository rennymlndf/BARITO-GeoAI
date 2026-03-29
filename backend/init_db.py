from database import engine, Base, Kelurahan, TidalData, RainfallData, User, db_session
from data import KELURAHAN_DATA, TIDAL_DATA, CURAH_HUJAN_2024, CURAH_HUJAN_2023
from sqlalchemy import text
from werkzeug.security import generate_password_hash

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
        
        print("Migrating Kelurahan data...")
        for kel in KELURAHAN_DATA:
            new_kel = Kelurahan(
                id=kel['id'],
                nama=kel['nama'],
                kecamatan=kel['kecamatan'],
                geom=f'SRID=4326;POINT({kel["lng"]} {kel["lat"]})',
                penduduk=kel['penduduk'],
                luas_km2=kel['luasKm2'],
                elevasi=kel['elevasi'],
                jarak_sungai=kel['jarakSungai'],
                curah_hujan_tahunan=kel['curahHujan'],
                tata_guna_lahan_id=kel['tataGunaLahan'],
                kualitas_drainase=kel['kualitasDrainase'],
                pengaruh_pasang=kel['pengaruhPasang'],
                kepadatan_penduduk=kel['kepadatanPenduduk'],
                jenis_tanah_id=kel['jenisTanah'],
                base_risk_level=kel['riskLevel']
            )
            session.add(new_kel)
            
        print("Migrating Tidal data...")
        for i in range(12):
            new_tide = TidalData(
                month=i+1,
                pasang_maks=TIDAL_DATA['pasangMaks'][i],
                pasang_rata=TIDAL_DATA['pasangRata'][i],
                kejadian_banjir=TIDAL_DATA['kejadianBanjir'][i]
            )
            session.add(new_tide)
            
        print("Migrating Rainfall data (10 Years Historical Data 2015-2024)...")
        import random
        random.seed(42)
        base_rain = [(CURAH_HUJAN_2024[i] + CURAH_HUJAN_2023[i])/2 for i in range(12)]
        for year in range(2015, 2025):
            rain_multiplier = 1.0
            if year in [2020, 2021, 2022]:
                rain_multiplier = random.uniform(1.15, 1.30)
            elif year in [2015, 2019, 2023]:
                rain_multiplier = random.uniform(0.70, 0.85)
            else:
                rain_multiplier = random.uniform(0.95, 1.05)
                
            for i in range(12):
                if year == 2024:
                    val = CURAH_HUJAN_2024[i]
                elif year == 2023:
                    val = CURAH_HUJAN_2023[i]
                else:
                    val = base_rain[i] * rain_multiplier
                session.add(RainfallData(month=i+1, year=year, rainfall=round(val, 2)))
            
        session.commit()
        
        print("Creating default admin user...")
        admin_user = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='admin'
        )
        session.add(admin_user)
        session.commit()
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nTIP: Make sure PostgreSQL and PostGIS are installed and running.")
        print("Check if the database connection details in database.py / DATABASE_URL are correct.")

if __name__ == "__main__":
    init_db()
