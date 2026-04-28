import pandas as pd
import numpy as np
import os
import sys

# Path backend biar bisa ambil data.py
sys.path.append(os.path.join(os.getcwd(), 'backend'))

def run_export():
    try:
        from data import generate_spatiotemporal_dataset
        
        print("--- Memulai Ekspor Dataset BARITO ---")
        
        # Ambil data historis 12 tahun untuk training/testing
        # Hasilnya: X_spatial, X_temporal, y, dan metadata
        X_spatial, X_temporal, y, metadata = generate_spatiotemporal_dataset(years=12)
        
        dataset_list = []
        for idx in range(len(metadata)):
            m = metadata[idx]
            
            # Ambil fitur spasial (kelurahan)
            sp = X_spatial[idx]
            
            # Fitur temporal target (index ke-2 dari sliding window 3 bulan)
            # Format: [bulan, rain, tide, musim, trisakti, barito, martapura, hulu]
            temp = X_temporal[idx][2] 
            
            # Mapping ke dict untuk DataFrame
            item = {
                'id_kel': m['kelurahan_id'],
                'nama': m['nama'],
                'kecamatan': m['kecamatan'],
                'thn': m['year'],
                'bln': m['month'],
                'target_risiko': m['temporal_risk'],
                # Variabel Spasial (Input RF)
                'elevasi': sp[0],
                'jarak_sungai': sp[1],
                'ch_lokal': sp[2],
                'tgl': sp[3],
                'drainase': sp[4],
                'pasang_muara': sp[5],
                'populasi': sp[6],
                'tanah': sp[7],
                # Variabel Temporal (Input LSTM)
                'ch_bulanan': temp[1],
                'tide_max': temp[2],
                'musim': temp[3],
                'tide_trisakti': temp[4],
                'q_barito': temp[5],
                'q_martapura': temp[6],
                'ch_hulu': temp[7]
            }
            dataset_list.append(item)
        
        df = pd.DataFrame(dataset_list)
        
        # Simpan buat bahan lampiran skripsi
        fname = 'dataset_barito_final.csv'
        df.to_csv(fname, index=False)
        
        print(f"Selesai! File: {fname}")
        print(f"Total baris: {len(df)}")
        
    except Exception as e:
        print(f"Error pas ekspor: {e}")

if __name__ == "__main__":
    run_export()
