import os
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from geoalchemy2 import Geometry

# Database configuration
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:rennymlndf@localhost:5432/flood_analysis")

engine = create_engine(DB_URL)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default='admin') # admin or viewer

class Kelurahan(Base):
    __tablename__ = 'kelurahan'
    id = Column(Integer, primary_key=True)
    nama = Column(String(100), nullable=False)
    kecamatan = Column(String(100), nullable=False)
    geom = Column(Geometry('POINT', srid=4326))
    penduduk = Column(Integer)
    luas_km2 = Column(Float)
    elevasi = Column(Float)
    jarak_sungai = Column(Float)
    curah_hujan_tahunan = Column(Float)
    tata_guna_lahan_id = Column(Integer)
    kualitas_drainase = Column(Integer)
    pengaruh_pasang = Column(Integer)
    kepadatan_penduduk = Column(Integer)
    jenis_tanah_id = Column(Integer)
    base_risk_level = Column(Integer)

    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.nama,
            'kecamatan': self.kecamatan,
            'penduduk': self.penduduk,
            'luasKm2': self.luas_km2,
            'elevasi': self.elevasi,
            'jarakSungai': self.jarak_sungai,
            'curahHujan': self.curah_hujan_tahunan,
            'tataGunaLahan': self.tata_guna_lahan_id,
            'kualitasDrainase': self.kualitas_drainase,
            'pengaruhPasang': self.pengaruh_pasang,
            'kepadatanPenduduk': self.kepadatan_penduduk,
            'jenisTanah': self.jenis_tanah_id,
            'riskLevel': self.base_risk_level
        }

class TidalData(Base):
    __tablename__ = 'tidal_data'
    month = Column(Integer, primary_key=True)
    pasang_maks = Column(Integer)
    pasang_rata = Column(Integer)
    kejadian_banjir = Column(Integer)

class RainfallData(Base):
    __tablename__ = 'rainfall_data'
    month = Column(Integer, primary_key=True)
    year = Column(Integer, primary_key=True)
    rainfall = Column(Float)

def get_db():
    return db_session()
