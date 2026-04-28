# BARITO - Sistem Prediksi Banjir Spatio-Temporal Banjarmasin
> **Project Skripsi/Riset**: Implementasi Algoritma Hybrid Random Forest & LSTM

BARITO (Banjarmasin Adaptive Rob Intelligence and Temporal Observation) adalah platform monitoring dan prediksi risiko banjir rob yang dikembangkan khusus untuk wilayah Kota Banjarmasin.

## Cara Menjalankan Sistem

### 1. Menjalankan Backend (Server API & Model AI)
Backend dibangun dengan Python Flask. Pastikan semua library di `requirements.txt` sudah terinstall.

1. Buka terminal (CMD/PowerShell).
2. Jalankan perintah:
   ```bash
   python backend/app.py
   ```
3. Tunggu sampai muncul status akurasi model. Server akan running di port 5000.

### 2. Menjalankan Frontend (Dashboard)
Frontend menggunakan HTML5, CSS3, dan Vanilla JS (Leaflet.js).

1. Cari file `index.html` di folder utama.
2. Buka pakai browser favorit (Chrome/Edge direkomendasikan).
3. Dashboard akan otomatis menarik data dari backend lokal.

---
**Catatan Teknis**: 
- Dataset training digenerate otomatis lewat `backend/data.py`.
- Jika ingin mengambil dataset mentah untuk lampiran, jalankan `python export_dataset.py`.
- Sistem mendukung mode "Offline" jika server backend tidak aktif (menggunakan data statis).
