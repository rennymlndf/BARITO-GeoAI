import pandas as pd
import numpy as np
import os
import sys

# Menambahkan folder backend ke path agar bisa import data.py
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from data import generate_spatiotemporal_dataset, FEATURE_KEYS_SPATIAL, FEATURE_KEYS_TEMPORAL
    
    print("[BARITO] Mengekstrak dataset dari data.py...")
    
    # Generate data (default 12 tahun = 7488 sampel)
    X_spatial, X_temporal, y, metadata = generate_spatiotemporal_dataset(years=12)
    
    rows = []
    for i in range(len(metadata)):
        # Metadata dasar
        m = metadata[i]
        
        # Fitur Spasial
        spatial = X_spatial[i]
        
        # Fitur Temporal (ambil step ke-2 yaitu target month saat itu)
        # Sequence format: [bulan, rain, tide, musim, trisakti, barito, martapura, hulu]
        temporal_target = X_temporal[i][2] 
        
        row = {
            'id_kelurahan': m['kelurahan_id'],
            'nama_kelurahan': m['nama'],
            'kecamatan': m['kecamatan'],
            'tahun': m['year'],
            'bulan': m['month'],
            'label_risiko': m['temporal_risk'],
            # Fitur Spasial
            'elevasi': spatial[0],
            'jarak_sungai': spatial[1],
            'curah_hujan_lokal': spatial[2],
            'tata_guna_lahan': spatial[3],
            'kualitas_drainase': spatial[4],
            'pengaruh_pasang': spatial[5],
            'kepadatan_penduduk': spatial[6],
            'jenis_tanah': spatial[7],
            # Fitur Temporal
            'curah_hujan_bulanan': temporal_target[1],
            'pasang_maks_muara': temporal_target[2],
            'musim': temporal_target[3],
            'pasang_trisakti': temporal_target[4],
            'debit_barito': temporal_target[5],
            'debit_martapura': temporal_target[6],
            'curah_hujan_hulu': temporal_target[7]
        }
        rows.append(row)
    
    df = pd.DataFrame(rows)
    
    # Simpan ke CSV
    output_file = 'barito_flood_dataset.csv'
    df.to_csv(output_file, index=False)
    
    print(f"[BARITO] Berhasil! Dataset disimpan di: {output_file}")
    print(f"[BARITO] Total data: {len(df)} baris (52 Kelurahan x 12 Bulan x 12 Tahun)")
    print(f"[BARITO] Kolom: {', '.join(df.columns)}")

except ImportError as e:
    print(f"[ERROR] Gagal mengimpor data.py: {e}")
except Exception as e:
    print(f"[ERROR] Terjadi kesalahan: {e}")
