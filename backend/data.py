# pyre-ignore-all-errors
# ========================================================================
# data.py - Data Spasial & Temporal Kota Banjarmasin
# Sumber: BPS 2024, BPBD 2023-2024, BMKG Syamsudin Noor & Maritim Barito
# ========================================================================

import typing
import numpy as np # type: ignore

# ── Konstanta ──
FEATURE_KEYS_SPATIAL = [
    'elevasi', 'jarakSungai', 'curahHujan', 'tataGunaLahan',
    'kualitasDrainase', 'pengaruhPasang', 'kepadatanPenduduk', 'jenisTanah'
]

FEATURE_KEYS_TEMPORAL = [
    'bulan', 'curahHujanBulanan', 'pasangMaks', 'musim',
    'pasangTrisakti', 'debitBarito', 'debitMartapura', 'curahHujanHulu'
]

FEATURE_KEYS_ALL = FEATURE_KEYS_SPATIAL + FEATURE_KEYS_TEMPORAL

RISK_LABELS = {1: 'Aman', 2: 'Sedang', 3: 'Rawan', 4: 'Sangat Rawan'}

TATA_GUNA_LAHAN = {1: 'Permukiman Padat', 2: 'Permukiman', 3: 'Komersial', 4: 'Perairan/Rawa', 5: 'Campuran'}
JENIS_TANAH = {1: 'Gambut', 2: 'Lempung', 3: 'Lanau', 4: 'Aluvial'}

# ── Data Pasang Surut Bulanan (BMKG Maritim Pelabuhan Muara Sungai Barito) ──
TIDAL_DATA = {
    'pasangMaks': [260, 255, 265, 315, 290, 300, 275, 260, 255, 270, 295, 310],  # April diupdate ke 315 (Aktual 2026)
    'pasangRata': [195, 190, 200, 245, 220, 230, 210, 195, 190, 205, 225, 240],  # April diupdate ke 245
    'kejadianBanjir': [3, 2, 3, 8, 5, 6, 3, 1, 1, 2, 5, 7] # April diupdate ke 8 kejadian
}

# ── Curah Hujan Bulanan (BMKG Stasiun Meteorologi Syamsudin Noor & Proyeksi 2025-2026) ──
CURAH_HUJAN_2026 = [605.5, 310.2, 420.5, 435.2, 180.5, 220.0, 155.0, 45.5, 75.0, 150.0, 480.5, 410.0] # April diupdate ke 435.2 (Aktual 2026)
CURAH_HUJAN_2025 = [310.2, 240.1, 350.5, 120.4, 105.8, 60.2, 85.5, 12.0, 25.5, 95.0, 280.4, 150.2] # Realisasi El Nino
CURAH_HUJAN_2024 = [558.0, 285.9, 319.5, 190.0, 142.5, 203.4, 139.3, 16.2, 34.4, 106.4, 437.1, 358.1]
CURAH_HUJAN_2023 = [336.9, 264.7, 467.2, 147.2, 179.8, 86.6, 307.6, 145.2, 256.3, 152.9, 329.4, 114.6]

# Rata-rata 4 tahun berturut-turut untuk baseline bulanan (sampai Maret 2026)
CURAH_HUJAN_BULANAN = [
    (CURAH_HUJAN_2026[i] + CURAH_HUJAN_2025[i] + CURAH_HUJAN_2024[i] + CURAH_HUJAN_2023[i]) / 4 for i in range(12)
]

# -- Memuat Data Real-time Otomatis Jika Ada --
import os
import json
try:
    dyn_path = os.path.join(os.path.dirname(__file__), 'dynamic_weather.json')
    if os.path.exists(dyn_path):
        with open(dyn_path, 'r') as f:
            dyn_data = json.load(f)
            if "curah_hujan_bulanan" in dyn_data:
                CURAH_HUJAN_BULANAN = dyn_data["curah_hujan_bulanan"]
                print(f"[BARITO] Memuat CURAH_HUJAN_BULANAN aktual dari {dyn_data.get('source')} (Sync: {dyn_data.get('last_synced')})")
except Exception as e:
    print(f"[BARITO] Gagal memuat data dinamis: {e}")

# Musim: 1=Hujan (Nov-Apr), 2=Kemarau (Mei-Okt)
MUSIM_BULANAN = [1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1]

# ── Data Pelengkap Realistis Kalsel (Pelabuhan Trisakti, Sungai Barito, Sungai Martapura, Hulu Banjarbaru) ──
TIDAL_DATA['pasangTrisakti'] = [270, 265, 275, 280, 295, 305, 280, 265, 260, 280, 300, 315] # cm
RIVER_DATA = {
    'debitBarito': [4500, 4200, 4800, 5100, 3900, 3100, 2800, 2400, 2600, 3300, 4700, 5300], # m3/s
    'debitMartapura': [350, 320, 380, 410, 250, 180, 150, 120, 140, 210, 360, 420] # m3/s
}
REGIONAL_WEATHER_DATA = {
    'curahHujanHulu': [410, 320, 380, 250, 160, 110, 85, 40, 60, 140, 350, 430] # mm
}

# ── Data 52 Kelurahan Kota Banjarmasin ──
KELURAHAN_DATA = [
    # ── Kecamatan Banjarmasin Utara (10 Kelurahan) ──
    {'id': 1, 'nama': 'Alalak Utara', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.27816, 'lng': 114.5784169,
     'penduduk': 22210, 'luasKm2': 2.962,
     'elevasi': 2.0, 'jarakSungai': 80, 'curahHujan': 2791, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 7500, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 2, 'nama': 'Alalak Selatan', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.2850527, 'lng': 114.5716846,
     'penduduk': 14122, 'luasKm2': 1.262,
     'elevasi': 2.5, 'jarakSungai': 120, 'curahHujan': 2791, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 8, 'kepadatanPenduduk': 11190, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 3, 'nama': 'Alalak Tengah', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.2749815, 'lng': 114.5691767,
     'penduduk': 8836, 'luasKm2': 0.928,
     'elevasi': 2.0, 'jarakSungai': 100, 'curahHujan': 2791, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 9522, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 4, 'nama': 'Sungai Jingah', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.3145027, 'lng': 114.6058238,
     'penduduk': 13008, 'luasKm2': 3.904,
     'elevasi': 2.5, 'jarakSungai': 50, 'curahHujan': 2791, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 3332, 'jenisTanah': 2, 'riskLevel': 4},
    {'id': 5, 'nama': 'Sungai Miai', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.2945321, 'lng': 114.5947516,
     'penduduk': 14488, 'luasKm2': 1.685,
     'elevasi': 3.5, 'jarakSungai': 200, 'curahHujan': 2791, 'tataGunaLahan': 3, 'kualitasDrainase': 4, 'pengaruhPasang': 7, 'kepadatanPenduduk': 8598, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 6, 'nama': 'Surgi Mufti', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.308992, 'lng': 114.6007651,
     'penduduk': 15227, 'luasKm2': 1.52,
     'elevasi': 4.0, 'jarakSungai': 350, 'curahHujan': 2791, 'tataGunaLahan': 2, 'kualitasDrainase': 5, 'pengaruhPasang': 6, 'kepadatanPenduduk': 10018, 'jenisTanah': 2, 'riskLevel': 2},
    {'id': 7, 'nama': 'Pangeran', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.3012399, 'lng': 114.5848703,
     'penduduk': 9790, 'luasKm2': 1.48,
     'elevasi': 3.0, 'jarakSungai': 150, 'curahHujan': 2791, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 8, 'kepadatanPenduduk': 6615, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 8, 'nama': 'Antasan Kecil Timur', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.3056073, 'lng': 114.5932697,
     'penduduk': 9139, 'luasKm2': 0.716,
     'elevasi': 3.0, 'jarakSungai': 100, 'curahHujan': 2791, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 8, 'kepadatanPenduduk': 12764, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 9, 'nama': 'Kuin Utara', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.2923577, 'lng': 114.5716095,
     'penduduk': 13053, 'luasKm2': 1.691,
     'elevasi': 2.0, 'jarakSungai': 60, 'curahHujan': 2791, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 7720, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 10, 'nama': 'Sungai Andai', 'kecamatan': 'Banjarmasin Utara', 'lat': -3.2928772, 'lng': 114.6104962,
     'penduduk': 31926, 'luasKm2': 6.462,
     'elevasi': 5.0, 'jarakSungai': 600, 'curahHujan': 2791, 'tataGunaLahan': 2, 'kualitasDrainase': 7, 'pengaruhPasang': 3, 'kepadatanPenduduk': 4941, 'jenisTanah': 4, 'riskLevel': 1},

    # ── Kecamatan Banjarmasin Tengah (12 Kelurahan) ──
    {'id': 11, 'nama': 'Kertak Baru Ilir', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3253354, 'lng': 114.5897774,
     'penduduk': 2966, 'luasKm2': 0.47,
     'elevasi': 5.0, 'jarakSungai': 350, 'curahHujan': 2650, 'tataGunaLahan': 3, 'kualitasDrainase': 5, 'pengaruhPasang': 5, 'kepadatanPenduduk': 6311, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 12, 'nama': 'Kertak Baru Ulu', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3218665, 'lng': 114.5905741,
     'penduduk': 1436, 'luasKm2': 0.45,
     'elevasi': 5.5, 'jarakSungai': 300, 'curahHujan': 2650, 'tataGunaLahan': 3, 'kualitasDrainase': 5, 'pengaruhPasang': 5, 'kepadatanPenduduk': 3191, 'jenisTanah': 2, 'riskLevel': 2},
    {'id': 13, 'nama': 'Gadang', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3180146, 'lng': 114.5941655,
     'penduduk': 7660, 'luasKm2': 0.30,
     'elevasi': 6.0, 'jarakSungai': 500, 'curahHujan': 2650, 'tataGunaLahan': 3, 'kualitasDrainase': 4, 'pengaruhPasang': 4, 'kepadatanPenduduk': 25533, 'jenisTanah': 3, 'riskLevel': 2},
    {'id': 14, 'nama': 'Melayu', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3171899, 'lng': 114.6006391,
     'penduduk': 7677, 'luasKm2': 0.59,
     'elevasi': 3.5, 'jarakSungai': 120, 'curahHujan': 2650, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 13010, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 15, 'nama': 'Pekapuran Laut', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.325717, 'lng': 114.5985228,
     'penduduk': 5469, 'luasKm2': 0.22,
     'elevasi': 5.5, 'jarakSungai': 400, 'curahHujan': 2650, 'tataGunaLahan': 1, 'kualitasDrainase': 4, 'pengaruhPasang': 5, 'kepadatanPenduduk': 24859, 'jenisTanah': 3, 'riskLevel': 3},
    {'id': 16, 'nama': 'Teluk Dalam', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3202618, 'lng': 114.5783251,
     'penduduk': 23289, 'luasKm2': 1.83,
     'elevasi': 3.0, 'jarakSungai': 80, 'curahHujan': 2650, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 8, 'kepadatanPenduduk': 12727, 'jenisTanah': 2, 'riskLevel': 4},
    {'id': 17, 'nama': 'Pasar Lama', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3087778, 'lng': 114.5902535,
     'penduduk': 5331, 'luasKm2': 0.46,
     'elevasi': 3.5, 'jarakSungai': 90, 'curahHujan': 2650, 'tataGunaLahan': 3, 'kualitasDrainase': 4, 'pengaruhPasang': 7, 'kepadatanPenduduk': 11589, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 18, 'nama': 'Antasan Besar', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.313682, 'lng': 114.5888729,
     'penduduk': 6265, 'luasKm2': 0.81,
     'elevasi': 4.0, 'jarakSungai': 200, 'curahHujan': 2650, 'tataGunaLahan': 5, 'kualitasDrainase': 4, 'pengaruhPasang': 6, 'kepadatanPenduduk': 7735, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 19, 'nama': 'Mawar', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3259044, 'lng': 114.5820057,
     'penduduk': 4993, 'luasKm2': 0.46,
     'elevasi': 5.0, 'jarakSungai': 250, 'curahHujan': 2650, 'tataGunaLahan': 2, 'kualitasDrainase': 5, 'pengaruhPasang': 5, 'kepadatanPenduduk': 10854, 'jenisTanah': 3, 'riskLevel': 3},
    {'id': 20, 'nama': 'Seberang Mesjid', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3111516, 'lng': 114.59608,
     'penduduk': 6613, 'luasKm2': 0.41,
     'elevasi': 3.0, 'jarakSungai': 60, 'curahHujan': 2650, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 8, 'kepadatanPenduduk': 16127, 'jenisTanah': 2, 'riskLevel': 4},
    {'id': 21, 'nama': 'Kelayan Luar', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.328076, 'lng': 114.5968303,
     'penduduk': 5070, 'luasKm2': 0.24,
     'elevasi': 3.5, 'jarakSungai': 180, 'curahHujan': 2650, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 21125, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 22, 'nama': 'Sungai Baru', 'kecamatan': 'Banjarmasin Tengah', 'lat': -3.3226872, 'lng': 114.597187,
     'penduduk': 4330, 'luasKm2': 0.47,
     'elevasi': 3.0, 'jarakSungai': 70, 'curahHujan': 2650, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 8, 'kepadatanPenduduk': 9213, 'jenisTanah': 2, 'riskLevel': 3},

    # ── Kecamatan Banjarmasin Barat (9 Kelurahan) ──
    {'id': 23, 'nama': 'Pelambuan', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.3196587, 'lng': 114.5643648,
     'penduduk': 25831, 'luasKm2': 2.12,
     'elevasi': 2.5, 'jarakSungai': 70, 'curahHujan': 2900, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 12184, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 24, 'nama': 'Telaga Biru', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.3266301, 'lng': 114.5680904,
     'penduduk': 15886, 'luasKm2': 1.53,
     'elevasi': 3.5, 'jarakSungai': 180, 'curahHujan': 2900, 'tataGunaLahan': 2, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 10383, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 25, 'nama': 'Telawang', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.3296545, 'lng': 114.5799069,
     'penduduk': 10818, 'luasKm2': 0.68,
     'elevasi': 4.5, 'jarakSungai': 300, 'curahHujan': 2900, 'tataGunaLahan': 3, 'kualitasDrainase': 5, 'pengaruhPasang': 6, 'kepadatanPenduduk': 15909, 'jenisTanah': 3, 'riskLevel': 3},
    {'id': 26, 'nama': 'Kuin Selatan', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.2980453, 'lng': 114.5784008,
     'penduduk': 11555, 'luasKm2': 1.72,
     'elevasi': 2.5, 'jarakSungai': 90, 'curahHujan': 2900, 'tataGunaLahan': 4, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 6716, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 27, 'nama': 'Kuin Cerucuk', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.2952337, 'lng': 114.571576,
     'penduduk': 17704, 'luasKm2': 1.66,
     'elevasi': 2.0, 'jarakSungai': 50, 'curahHujan': 2900, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 10665, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 28, 'nama': 'Basirih', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.3345962, 'lng': 114.5654055,
     'penduduk': 21768, 'luasKm2': 3.65,
     'elevasi': 4.5, 'jarakSungai': 400, 'curahHujan': 2900, 'tataGunaLahan': 2, 'kualitasDrainase': 6, 'pengaruhPasang': 5, 'kepadatanPenduduk': 5964, 'jenisTanah': 2, 'riskLevel': 2},
    {'id': 29, 'nama': 'Belitung Selatan', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.30851, 'lng': 114.5772904,
     'penduduk': 14748, 'luasKm2': 0.70,
     'elevasi': 3.0, 'jarakSungai': 100, 'curahHujan': 2900, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 8, 'kepadatanPenduduk': 21069, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 30, 'nama': 'Belitung Utara', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.3040181, 'lng': 114.5798895,
     'penduduk': 7445, 'luasKm2': 0.74,
     'elevasi': 3.5, 'jarakSungai': 250, 'curahHujan': 2900, 'tataGunaLahan': 5, 'kualitasDrainase': 4, 'pengaruhPasang': 6, 'kepadatanPenduduk': 10061, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 31, 'nama': 'Teluk Tiram', 'kecamatan': 'Banjarmasin Barat', 'lat': -3.3385203, 'lng': 114.580662,
     'penduduk': 11696, 'luasKm2': 0.57,
     'elevasi': 3.0, 'jarakSungai': 130, 'curahHujan': 2900, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 20519, 'jenisTanah': 2, 'riskLevel': 3},

    # ── Kecamatan Banjarmasin Timur (9 Kelurahan) ──
    {'id': 32, 'nama': 'Kuripan', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.3227983, 'lng': 114.6051612,
     'penduduk': 11695, 'luasKm2': 1.43,
     'elevasi': 5.5, 'jarakSungai': 600, 'curahHujan': 2550, 'tataGunaLahan': 3, 'kualitasDrainase': 7, 'pengaruhPasang': 3, 'kepadatanPenduduk': 8178, 'jenisTanah': 3, 'riskLevel': 3},
    {'id': 33, 'nama': 'Kebun Bunga', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.3262793, 'lng': 114.6108194,
     'penduduk': 9792, 'luasKm2': 1.19,
     'elevasi': 7.0, 'jarakSungai': 800, 'curahHujan': 2550, 'tataGunaLahan': 2, 'kualitasDrainase': 7, 'pengaruhPasang': 2, 'kepadatanPenduduk': 8228, 'jenisTanah': 3, 'riskLevel': 1},
    {'id': 34, 'nama': 'Sungai Bilu', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.3167172, 'lng': 114.6094447,
     'penduduk': 7994, 'luasKm2': 0.57,
     'elevasi': 3.5, 'jarakSungai': 150, 'curahHujan': 2550, 'tataGunaLahan': 1, 'kualitasDrainase': 4, 'pengaruhPasang': 7, 'kepadatanPenduduk': 14024, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 35, 'nama': 'Pekapuran Raya', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.3349014, 'lng': 114.6038094,
     'penduduk': 12471, 'luasKm2': 0.96,
     'elevasi': 5.0, 'jarakSungai': 400, 'curahHujan': 2550, 'tataGunaLahan': 2, 'kualitasDrainase': 5, 'pengaruhPasang': 5, 'kepadatanPenduduk': 12991, 'jenisTanah': 3, 'riskLevel': 3},
    {'id': 36, 'nama': 'Pengambangan', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.315381, 'lng': 114.6182424,
     'penduduk': 9585, 'luasKm2': 1.21,
     'elevasi': 6.5, 'jarakSungai': 700, 'curahHujan': 2550, 'tataGunaLahan': 2, 'kualitasDrainase': 6, 'pengaruhPasang': 3, 'kepadatanPenduduk': 7922, 'jenisTanah': 4, 'riskLevel': 3},
    {'id': 37, 'nama': 'Karang Mekar', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.3297683, 'lng': 114.6061188,
     'penduduk': 10019, 'luasKm2': 0.70,
     'elevasi': 5.0, 'jarakSungai': 350, 'curahHujan': 2550, 'tataGunaLahan': 2, 'kualitasDrainase': 5, 'pengaruhPasang': 5, 'kepadatanPenduduk': 14313, 'jenisTanah': 3, 'riskLevel': 3},
    {'id': 38, 'nama': 'Benua Anyar', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.3070881, 'lng': 114.611671,
     'penduduk': 6632, 'luasKm2': 0.90,
     'elevasi': 3.5, 'jarakSungai': 100, 'curahHujan': 2550, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 7369, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 39, 'nama': 'Sungai Lulut', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.320308, 'lng': 114.6292072,
     'penduduk': 14313, 'luasKm2': 7.52,
     'elevasi': 1.5, 'jarakSungai': 30, 'curahHujan': 2550, 'tataGunaLahan': 4, 'kualitasDrainase': 1, 'pengaruhPasang': 10, 'kepadatanPenduduk': 1904, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 40, 'nama': 'Pemurus Luar', 'kecamatan': 'Banjarmasin Timur', 'lat': -3.3443, 'lng': 114.630484,
     'penduduk': 9732, 'luasKm2': 2.45,
     'elevasi': 3.5, 'jarakSungai': 200, 'curahHujan': 2550, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 3972, 'jenisTanah': 2, 'riskLevel': 3},

    # ── Kecamatan Banjarmasin Selatan (12 Kelurahan) ──
    {'id': 41, 'nama': 'Kelayan Tengah', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3355019, 'lng': 114.5931336,
     'penduduk': 5370, 'luasKm2': 0.19,
     'elevasi': 2.5, 'jarakSungai': 100, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 8, 'kepadatanPenduduk': 28263, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 42, 'nama': 'Kelayan Selatan', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3374693, 'lng': 114.5866138,
     'penduduk': 13892, 'luasKm2': 1.14,
     'elevasi': 2.5, 'jarakSungai': 120, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 8, 'kepadatanPenduduk': 12186, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 43, 'nama': 'Kelayan Barat', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.330909, 'lng': 114.5940261,
     'penduduk': 5501, 'luasKm2': 0.29,
     'elevasi': 3.0, 'jarakSungai': 150, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 18969, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 44, 'nama': 'Kelayan Timur', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3441688, 'lng': 114.5907524,
     'penduduk': 18678, 'luasKm2': 4.09,
     'elevasi': 2.5, 'jarakSungai': 80, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 8, 'kepadatanPenduduk': 4567, 'jenisTanah': 2, 'riskLevel': 4},
    {'id': 45, 'nama': 'Kelayan Dalam', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.332853, 'lng': 114.5969671,
     'penduduk': 10015, 'luasKm2': 0.34,
     'elevasi': 2.5, 'jarakSungai': 130, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 8, 'kepadatanPenduduk': 29456, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 46, 'nama': 'Pemurus Dalam', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3518937, 'lng': 114.6186072,
     'penduduk': 19888, 'luasKm2': 4.35,
     'elevasi': 2.5, 'jarakSungai': 90, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 2, 'pengaruhPasang': 9, 'kepadatanPenduduk': 4572, 'jenisTanah': 2, 'riskLevel': 4},
    {'id': 47, 'nama': 'Pemurus Baru', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3433334, 'lng': 114.6127117,
     'penduduk': 13645, 'luasKm2': 1.38,
     'elevasi': 3.5, 'jarakSungai': 250, 'curahHujan': 2800, 'tataGunaLahan': 5, 'kualitasDrainase': 4, 'pengaruhPasang': 6, 'kepadatanPenduduk': 9888, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 48, 'nama': 'Pekauman', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3313421, 'lng': 114.58873,
     'penduduk': 10641, 'luasKm2': 0.37,
     'elevasi': 3.0, 'jarakSungai': 160, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 28759, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 49, 'nama': 'Tanjung Pagar', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3655308, 'lng': 114.5994347,
     'penduduk': 9130, 'luasKm2': 4.56,
     'elevasi': 3.0, 'jarakSungai': 100, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 8, 'kepadatanPenduduk': 2002, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 50, 'nama': 'Murung Raya', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3423774, 'lng': 114.5952693,
     'penduduk': 13742, 'luasKm2': 0.67,
     'elevasi': 3.0, 'jarakSungai': 180, 'curahHujan': 2800, 'tataGunaLahan': 1, 'kualitasDrainase': 3, 'pengaruhPasang': 7, 'kepadatanPenduduk': 20510, 'jenisTanah': 2, 'riskLevel': 3},
    {'id': 51, 'nama': 'Basirih Selatan', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3494785, 'lng': 114.5746565,
     'penduduk': 14815, 'luasKm2': 8.66,
     'elevasi': 1.5, 'jarakSungai': 40, 'curahHujan': 2800, 'tataGunaLahan': 4, 'kualitasDrainase': 1, 'pengaruhPasang': 10, 'kepadatanPenduduk': 1711, 'jenisTanah': 1, 'riskLevel': 4},
    {'id': 52, 'nama': 'Mantuil', 'kecamatan': 'Banjarmasin Selatan', 'lat': -3.3511548, 'lng': 114.5466382,
     'penduduk': 15852, 'luasKm2': 12.22,
     'elevasi': 1.0, 'jarakSungai': 20, 'curahHujan': 2800, 'tataGunaLahan': 4, 'kualitasDrainase': 1, 'pengaruhPasang': 10, 'kepadatanPenduduk': 1297, 'jenisTanah': 1, 'riskLevel': 4},
]


def get_month_label(month):
    """Mendapatkan label bulan (1-indexed)"""
    labels = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
              'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return labels[month - 1] if 1 <= month <= 12 else 'Unknown'


def compute_temporal_risk(base_risk, month, elevasi, pengaruh_pasang, kualitas_drainase):
    """
    Menghitung risiko temporal berdasarkan risiko spasial dasar + faktor temporal.
    
    Logika:
    - Bulan puncak pasang (Jun, Nov, Des) → risiko naik untuk wilayah rentan
    - Bulan kemarau (Agu, Sep) → risiko turun untuk wilayah moderat
    - Curah hujan tinggi + pasang tinggi → risiko naik
    - Elevasi tinggi + drainase baik → lebih tahan terhadap variasi temporal
    """
    month_idx = month - 1  # 0-indexed
    
    pasang_maks = TIDAL_DATA['pasangMaks'][month_idx]
    curah_hujan = CURAH_HUJAN_BULANAN[month_idx]
    musim = MUSIM_BULANAN[month_idx]
    
    # Temporal modifier score
    temporal_score = 0
    
    # Faktor pasang surut (pasang > 280 cm = tinggi)
    if pasang_maks >= 300:
        temporal_score += 1.5
    elif pasang_maks >= 280:
        temporal_score += 1.0
    elif pasang_maks >= 265:
        temporal_score += 0.5
    elif pasang_maks <= 255:
        temporal_score -= 0.5
    
    # Faktor curah hujan bulanan (> 350mm = sangat tinggi)
    if curah_hujan >= 400:
        temporal_score += 1.5
    elif curah_hujan >= 300:
        temporal_score += 1.0
    elif curah_hujan >= 200:
        temporal_score += 0.3
    elif curah_hujan <= 50:
        temporal_score -= 0.5
    
    # Faktor ketahanan wilayah (elevasi tinggi + drainase baik = lebih tahan)
    resilience = (elevasi / 7.0) * 0.4 + (kualitas_drainase / 10.0) * 0.3 + ((10 - pengaruh_pasang) / 10.0) * 0.3
    temporal_score *= (1 - resilience * 0.6)
    
    # Hitung risiko temporal
    temporal_risk = base_risk + temporal_score
    temporal_risk = max(1, min(4, round(temporal_risk)))
    
    return int(temporal_risk)


def generate_spatiotemporal_dataset(years=12) -> typing.Tuple[np.ndarray, np.ndarray, np.ndarray, typing.List[typing.Dict[str, typing.Any]]]:
    """
    Ekstraksi data spasial dari 52 Kelurahan x 12 Bulan x 12 Tahun
    menjadi 7488 sampel data historis untuk pelatihan Hybrid Bidirectional RF-LSTM.
    Dataset sekarang mensuplai riwayat 3 bulan ke belakang (Sliding Window).
    """
    import typing
    import random
    
    random.seed(42)
    
    X_spatial_list = []
    X_temporal_list = []
    y_list = []
    metadata = []
    
    base_year = 2026
    
    # Iterasi data historis (12 tahun ke belakang)
    for year_offset in range(years):
        current_year = base_year - year_offset
        
        # Variasi Iklim Historis Syamsudin Noor s.d. Maret 2026:
        # La Nina (Basah ekstrim): 2020, 2021, 2022, awal 2026
        # El Nino (Kering): 2015, 2019, 2023, 2025
        
        if current_year in [2020, 2021, 2022, 2026]:
            rain_multiplier = random.uniform(1.15, 1.30) # La Nina lebih basah 15-30%
            tide_modifier = random.randint(5, 15) # Pasang naik 5-15 cm di laut Jawa
        elif current_year in [2015, 2019, 2023, 2025]:
            rain_multiplier = random.uniform(0.70, 0.85) # El Nino lebih kering
            tide_modifier = random.randint(-5, 5)
        else:
            rain_multiplier = random.uniform(0.95, 1.05) # Fluktuasi normal tahunan
            tide_modifier = random.randint(-2, 5)
            
        for kel_raw in KELURAHAN_DATA:
            kel = typing.cast(typing.Any, kel_raw)
            for month in range(1, 13):  # 1-12
                month_idx = month - 1
                
                # Fitur spasial
                spatial_features = [
                    kel['elevasi'],
                    kel['jarakSungai'],
                    kel['curahHujan'],  # Baseline curah hujan spasial kelurahan
                    kel['tataGunaLahan'],
                    kel['kualitasDrainase'],
                    kel['pengaruhPasang'],
                    kel['kepadatanPenduduk'], # Asumsikan konstan u/ geospasial basemap
                    kel['jenisTanah']
                ]
                
                # Modifikasi fitur temporal tahunan (Simulasi data sensor historis 3 Bulan Lookback)
                temporal_sequence = []
                for step in range(3): # lookback t-2, t-1, t
                    hist_m_idx = (month_idx - 2 + step) % 12
                    
                    hist_rain = CURAH_HUJAN_BULANAN[hist_m_idx] * rain_multiplier
                    hist_tide_max = TIDAL_DATA['pasangMaks'][hist_m_idx] + tide_modifier
                    hist_tide_trisakti = TIDAL_DATA['pasangTrisakti'][hist_m_idx] + tide_modifier
                    hist_river_barito = RIVER_DATA['debitBarito'][hist_m_idx] * rain_multiplier
                    hist_river_martapura = RIVER_DATA['debitMartapura'][hist_m_idx] * rain_multiplier
                    hist_rain_hulu = REGIONAL_WEATHER_DATA['curahHujanHulu'][hist_m_idx] * rain_multiplier
                    
                    temporal_sequence.append([
                        (hist_m_idx + 1),                                    
                        hist_rain,           
                        hist_tide_max,      
                        MUSIM_BULANAN[hist_m_idx],
                        hist_tide_trisakti,
                        hist_river_barito,
                        hist_river_martapura,
                        hist_rain_hulu
                    ])
                
                # Target bulan saat ini untuk kalkulasi label heuristik (bulan step=2)
                target_rain = temporal_sequence[2][1]
                target_tide_max = temporal_sequence[2][2]
                
                # Menghitung probabilitas risiko spesifik tahun historis tsb
                temp_risk = kel['riskLevel']
                
                # Temporal modifier score based on dynamic historical variables
                temporal_score = 0
                if target_tide_max >= 300: temporal_score += 1.5
                elif target_tide_max >= 280: temporal_score += 1.0
                elif target_tide_max >= 265: temporal_score += 0.5
                elif target_tide_max <= 255: temporal_score -= 0.5
                
                if target_rain >= 400: temporal_score += 1.5
                elif target_rain >= 300: temporal_score += 1.0
                elif target_rain >= 200: temporal_score += 0.3
                elif target_rain <= 50: temporal_score -= 0.5
                
                resilience = (kel['elevasi'] / 7.0) * 0.4 + (kel['kualitasDrainase'] / 10.0) * 0.3 + ((10 - kel['pengaruhPasang']) / 10.0) * 0.3
                temporal_score *= (1 - resilience * 0.6)
                
                risk = temp_risk + temporal_score
                risk = max(1, min(4, round(risk)))
                
                X_spatial_list.append(spatial_features)
                X_temporal_list.append(temporal_sequence)
                y_list.append(int(risk))
                metadata.append({
                    'kelurahan_id': kel['id'],
                    'nama': kel['nama'],
                    'kecamatan': kel['kecamatan'],
                    'month': month,
                    'year': current_year,
                    'base_risk': kel['riskLevel'],
                    'temporal_risk': int(risk)
                })
    
    return np.array(X_spatial_list), np.array(X_temporal_list), np.array(y_list), metadata

def get_kelurahan_by_id(kel_id):
    """Mendapatkan data kelurahan berdasarkan ID"""
    import typing
    for kel_raw in KELURAHAN_DATA:
        kel = typing.cast(typing.Any, kel_raw)
        if kel['id'] == kel_id:
            return kel
    return None


def get_all_kelurahan_temporal():
    """Mendapatkan semua data kelurahan dengan profil risiko per bulan"""
    import typing
    result = []
    for kel_raw in KELURAHAN_DATA:
        kel = typing.cast(typing.Any, kel_raw)
        temporal_risks = []
        for month in range(1, 13):
            risk = compute_temporal_risk(
                kel['riskLevel'], month,
                kel['elevasi'], kel['pengaruhPasang'], kel['kualitasDrainase']
            )
            temporal_risks.append(risk)
        
        kel_data = {**kel, 'temporalRisks': temporal_risks}
        result.append(kel_data)
    
    return result


def get_stats_by_month(month=None):
    """Mendapatkan statistik agregat, opsional per bulan"""
    import typing
    risk_counts = {1: 0, 2: 0, 3: 0, 4: 0} # type: ignore
    kecamatan_risk = {} # type: ignore
    
    for kel_raw in KELURAHAN_DATA:
        kel = typing.cast(typing.Any, kel_raw)
        if month is not None:
            risk = compute_temporal_risk(
                kel['riskLevel'], month,
                kel['elevasi'], kel['pengaruhPasang'], kel['kualitasDrainase']
            )
        else:
            risk = kel['riskLevel']
        
        risk_counts[risk] = risk_counts.get(risk, 0) + 1 # type: ignore
        
        kec = str(kel['kecamatan']).replace('Banjarmasin ', '')
        if kec not in kecamatan_risk:
            kecamatan_risk[kec] = []
        kecamatan_risk[kec].append(risk)
    
    avg_risk_per_kecamatan = {}
    for kec, risks in kecamatan_risk.items(): # type: ignore
        total_score = sum(risks)
        count = len(risks)
        avg_risk = float(total_score) / count if count > 0 else 1.0
        avg_risk_per_kecamatan[kec] = avg_risk
    
    return {
        'total': len(KELURAHAN_DATA),
        'riskCounts': risk_counts,
        'avgRiskPerKecamatan': avg_risk_per_kecamatan,
        'month': month,
        'monthLabel': get_month_label(month) if month else None
    }
