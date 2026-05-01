# BARITO - Sistem Prediksi Banjir Spatio-Temporal Banjarmasin
> **Dokumentasi Penelitian**: Implementasi Algoritma Hybrid Random Forest dan Long Short-Term Memory (LSTM)

BARITO (Banjarmasin Adaptive Rob Intelligence and Temporal Observation) merupakan platform analisis dan prediksi risiko banjir rob yang dikembangkan khusus untuk karakteristik wilayah Kota Banjarmasin. Sistem ini menggunakan pendekatan kecerdasan buatan untuk mengolah data geospasial dan temporal.

## Prosedur Penggunaan Sistem

### 1. Inisialisasi Backend (Server & Model AI)
Sistem backend dibangun menggunakan framework Flask. Seluruh dependensi yang diperlukan tercantum dalam file `requirements.txt`.

1. Buka terminal atau Command Prompt.
2. Jalankan perintah berikut untuk mengaktifkan server:
   ```bash
   python backend/app.py
   ```
3. Tunggu hingga proses pelatihan model selesai dan indikator akurasi muncul. Server akan berjalan pada port 5000.

### 2. Akses Dashboard (Frontend)
Bagian antarmuka pengguna dibangun dengan standar HTML5, CSS3, dan Leaflet.js untuk pemetaan interaktif.

1. Buka file `index.html` yang terletak di direktori utama.
2. Gunakan peramban modern seperti Google Chrome atau Microsoft Edge.
3. Dashboard akan secara otomatis terhubung dengan API backend untuk menampilkan data prediksi terbaru.

---
**Informasi Teknis**: 
- Data latih (*training dataset*) dihasilkan secara dinamis melalui modul `backend/data.py`.
- Untuk keperluan lampiran penelitian atau analisis eksternal, dataset dapat diekspor ke format CSV dengan menjalankan `python export_dataset.py`.
- Sistem dilengkapi dengan mekanisme *failover* (data statis) jika server backend sedang tidak aktif.
