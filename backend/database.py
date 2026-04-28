import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session, relationship
from geoalchemy2 import Geometry

# Database configuration
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:rennymlndf@localhost:5432/flood_analysis")

engine = create_engine(DB_URL)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

# ── 1. Master Data Tables ──

class Kecamatan(Base):
    __tablename__ = 'kecamatan'
    id = Column(Integer, primary_key=True)
    nama = Column(String(100), nullable=False)
    kelurahan_rel = relationship("Kelurahan", back_populates="kecamatan_rel")

class JenisTanah(Base):
    __tablename__ = 'jenis_tanah'
    id = Column(Integer, primary_key=True)
    nama = Column(String(100), nullable=False)
    deskripsi = Column(Text)
    kelurahan_rel = relationship("Kelurahan", back_populates="jenis_tanah_rel")

class TataGunaLahan(Base):
    __tablename__ = 'tata_guna_lahan'
    id = Column(Integer, primary_key=True)
    nama = Column(String(100), nullable=False)
    koefisien_limpasan = Column(Float)
    kelurahan_rel = relationship("Kelurahan", back_populates="tata_guna_lahan_rel")

class RiskLevelModel(Base):
    __tablename__ = 'risk_levels'
    id = Column(Integer, primary_key=True)
    label = Column(String(50), nullable=False)
    warna_hex = Column(String(7))
    kelurahan_rel = relationship("Kelurahan", back_populates="risk_level_rel")

# ── 2. Core Data Tables ──

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default='admin')
    logs = relationship("AdminLog", back_populates="user_rel")

class Kelurahan(Base):
    __tablename__ = 'kelurahan'
    id = Column(Integer, primary_key=True)
    nama = Column(String(100), nullable=False)
    
    # Foreign Keys
    kecamatan_id = Column(Integer, ForeignKey('kecamatan.id'))
    tata_guna_lahan_id = Column(Integer, ForeignKey('tata_guna_lahan.id'))
    jenis_tanah_id = Column(Integer, ForeignKey('jenis_tanah.id'))
    base_risk_level_id = Column(Integer, ForeignKey('risk_levels.id'))

    geom = Column(Geometry('POINT', srid=4326))
    penduduk = Column(Integer)
    luas_km2 = Column(Float)
    elevasi = Column(Float)
    jarak_sungai = Column(Float)
    curah_hujan_tahunan = Column(Float)
    kualitas_drainase = Column(Integer)
    pengaruh_pasang = Column(Integer)
    kepadatan_penduduk = Column(Integer)

    # Relationships
    kecamatan_rel = relationship("Kecamatan", back_populates="kelurahan_rel")
    jenis_tanah_rel = relationship("JenisTanah", back_populates="kelurahan_rel")
    tata_guna_lahan_rel = relationship("TataGunaLahan", back_populates="kelurahan_rel")
    risk_level_rel = relationship("RiskLevelModel", back_populates="kelurahan_rel")

    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.nama,
            'kecamatan': self.kecamatan_rel.nama if self.kecamatan_rel else 'Uncategorized',
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
            'riskLevel': self.base_risk_level_id
        }

# ── 3. Temporal Data Tables ──

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

# ── 4. AI & Metadata Tables ──

class ModelEvaluation(Base):
    __tablename__ = 'model_evaluation'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    n_samples = Column(Integer)
    training_params = relationship("ModelTrainingParam", back_populates="evaluation_rel", uselist=False)

class ModelTrainingParam(Base):
    __tablename__ = 'model_training_params'
    id = Column(Integer, primary_key=True)
    evaluation_id = Column(Integer, ForeignKey('model_evaluation.id'))
    n_estimators = Column(Integer)
    max_depth = Column(Integer)
    lstm_units = Column(Integer)
    random_state = Column(Integer)
    evaluation_rel = relationship("ModelEvaluation", back_populates="training_params")

# ── 5. Audit & Operations ──

class AdminLog(Base):
    __tablename__ = 'admin_logs'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    action = Column(String(255))
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user_rel = relationship("User", back_populates="logs")

class FloodIncident(Base):
    __tablename__ = 'flood_incidents'
    id = Column(Integer, primary_key=True)
    kelurahan_id = Column(Integer, ForeignKey('kelurahan.id'))
    date = Column(DateTime, nullable=False)
    depth_cm = Column(Integer)
    description = Column(Text)
    is_verified = Column(Integer, default=0) # 0: unverified, 1: verified

class WeatherStation(Base):
    __tablename__ = 'weather_stations'
    id = Column(Integer, primary_key=True)
    nama = Column(String(100))
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String(50), default='Active')

def get_db():
    return db_session()
