# Panduan Menjalankan Platform BARITO

BARITO (Banjarmasin Adaptive Rob Intelligence and Temporal Observation) terdiri dari dua bagian yang harus berjalan bersamaan:

## 1. Menjalankan Backend (Otak AI)
Backend menggunakan Python Flask untuk memproses model Random Forest dan data real-time.

1. Buka Terminal/PowerShell.
2. Pastikan Anda berada di folder proyek.
3. Jalankan perintah:
   ```powershell
   python backend/app.py
   ```
4. Biarkan terminal ini tetap terbuka. Jika muncul tulisan `Running on http://127.0.0.1:5000`, berarti backend sudah aktif.

## 2. Menjalankan Frontend (Tampilan UI)
Frontend adalah antarmuka web tempat Anda melihat peta dan dashboard.

1. Buka folder proyek di File Explorer Windows.
2. Cari file bernama `index.html`.
3. **Klik kanan** pada `index.html` -> **Open with** -> Pilih Browser (Chrome/Edge/Firefox).
4. Selesai! Dashboard BARITO akan muncul dan otomatis terhubung ke backend.

---
**Penting**: Jika Backend tidak dijalankan, fitur "BARITO AI Assistant" dan "Intelligence Control Tower" akan masuk ke **Mode Lokal** (data statis) karena tidak bisa mengambil data real-time dari server.
