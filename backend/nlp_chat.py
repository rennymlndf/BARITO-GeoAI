# pyre-ignore-all-errors
import json
import numpy as np
import threading
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
# --- Corpus Data (Knowledge Base Skripsi) ---
QA_CORPUS = [
    {
        "intents": ["apa itu barito", "barito adalah", "jelaskan sistem ini", "sistem apa ini", "apa kepanjangan barito"],
        "answer": "BARITO merupakan sistem yang saya kembangkan untuk melakukan pemantauan dan prediksi risiko banjir rob di Kota Banjarmasin. Sistem ini menggunakan pendekatan Hybrid Random Forest dan LSTM untuk mendapatkan hasil yang presisi."
    },
    {
        "intents": ["berapa banyak fitur yang digunakan", "fitur apa saja", "parameter apa saja", "berapa parameter", "jelaskan 16 fitur"],
        "answer": "Model BARITO menggunakan 16 fitur: 8 fitur spasial dasar (Elevasi, Jarak Sungai, Curah Hujan, Tata Guna Lahan, Kualitas Drainase, Kepadatan Penduduk, Pasang Surut, Jenis Tanah) dan 8 fitur regional makro (Hujan Hulu Sungai, Pasang Trisakti, Debit Barito, Debit Martapura, Siklon Tropis, Indeks Monsun, Curah Hujan Bulanan, dan Elevasi Tanah Rata-rata)."
    },
    {
        "intents": ["berapa data yang dipakai", "jumlah dataset", "sampel data", "berapa baris data", "dataset skripsi"],
        "answer": "Dataset terdiri dari 6.240 sampel riil historis (52 kelurahan × 12 bulan × 10 tahun). Data ini di-split menjadi 80% (4992 data latih) dan 20% (1248 data uji), menyimulasikan iklim La Nina dan El Nino untuk pengujian akurasi tinggi."
    },
    {
        "intents": ["algoritma apa yang dipakai", "metode penelitian", "kenapa random forest", "model ai apa"],
        "answer": "Penelitian ini menggunakan arsitektur Hybrid yang menggabungkan Long Short-Term Memory (LSTM) untuk analisis pola waktu dan Random Forest untuk klasifikasi akhir. LSTM bertugas mengekstraksi fitur temporal, sementara Random Forest menentukan tingkat risiko banjirnya."
    },
    {
        "intents": ["kelurahan mana yang paling rawan", "daerah rawan banjir", "sangat rawan", "paling terdampak", "lokasi banjir terparah"],
        "answer": "Berdasarkan data BARITO, kelurahan berstatus 'Sangat Rawan' (Kategori 4) didominasi oleh wilayah Banjarmasin Selatan dan Barat, seperti Kelurahan Kuin, Pekauman, dan Alalak. Daerah ini memiliki jarak sangat dekat dengan muara Sungai Barito dan elevasi umumnya di bawah 1 mdpl."
    },
    {
        "intents": ["daerah mana yang aman", "kelurahan bebas banjir", "lokasi paling aman", "tidak terkena rob"],
        "answer": "Kelurahan berstatus 'Aman' (Kategori 1) sebagian besar berada di daratan tinggi Banjarmasin Timur (seperti Sungai Paring/Pemurus). Wilayah ini terlindungi karena jaraknya jauh dari muara sungai dan memiliki sistem drainase yang lebih baik dengan kepadatan sedang."
    },
    {
        "intents": ["bagaimana cara kerja heatmap", "peta panas", "interpolasi spasial", "apa itu heatmap", "lapisan api di peta"],
        "answer": "Sistem Heatmap BARITO menggunakan Spatial Interpolation dari Leaflet.js. Peta Panas ini memberikan visualisasi gradien warna sebaran radius tak beraturan (hijau=Aman, kuning=Sedang, merah=Sangat Rawan) berdasarkan tingkat risiko spatio-temporal kelurahan, mempertegas area krisis di kanvas 2D."
    },
    {
        "intents": ["apa itu geo routing", "rute evakuasi otomatis", "kemana harus lari jika banjir", "titik aman terdekat", "garis putus putus hijau"],
        "answer": "Geo-Routing Evakuasi adalah fitur cerdas yang menghitung jarak melengkung Bumi (Haversine Formula) secara mikrosekon. Jika Anda mengklik kelurahan Merah (Rawan), AI otomatis menarik garis panah menuju Kelurahan berstatus 'Aman' (Hijau) berserta hitungan presisi jarak evakuasi ke penampungan terdekat."
    },
    {
        "intents": ["akurasi model", "berapa akurasi", "tingkat keberhasilan", "performa model", "evaluasi model"],
        "answer": "Berdasarkan pengujian, akurasi model Hybrid RF-LSTM ini secara konsisten berada di angka 88% hingga 90%. Metrik ini menunjukkan bahwa model cukup handal untuk digunakan sebagai sistem pendukung keputusan dalam mitigasi banjir."
    },
    {
        "intents": ["rekomendasi mitigasi", "solusi banjir", "apa yang harus dilakukan", "kebijakan pemerintah", "bagaimana mencegah rob", "solusi teknis"],
        "answer": "Rekomendasi mitigasi dari BARITO mencakup 3 poros: 1) Pembangunan tanggul & pintu air hidrolik pompa di percabangan Barito-Martapura, 2) Pemeliharaan kapasitas drainase (pengerukan sedimen lumpur minimal 1x setahun), 3) Relokasi bertahap rumah tepian sungai (lanting) ke rumah susun tahan air pasang (Polder System)."
    },
    {
        "intents": ["siapa kamu", "apakah kamu gemini", "kamu ai apa", "siapa yang membuatmu", "nlp offline", "chatbot ini apa"],
        "answer": "Saya adalah asisten virtual berbasis NLP yang terintegrasi dalam sistem BARITO. Saya diprogram menggunakan metode TF-IDF untuk memahami pertanyaan Anda seputar data penelitian, dataset, dan cara kerja algoritma yang digunakan dalam proyek ini."
    },
    {
        "intents": ["kapan banjir paling tinggi", "bulan rawan rob", "musim banjir", "puncak pasang surut", "bulan apa banjir parah"],
        "answer": "Analisis Spatio-Temporal membuktikan porsi probabilitas bahaya banjir rob mencapai ekstrem setiap bulan JUNI dan DESEMBER. Pasang air laut pelabuhan Trisakti seringkali melampaui 300 cm bertepatan Sinkronisasi Bulan Purnama, ditambah Curah Hujan Hulu yang ekstrem pada musim angin La Nina (Des-Jan)."
    },
    {
        "intents": ["kualitas drainase", "bagaimana saluran air", "faktor selokan", "drainase buruk", "pengaruh drainase"],
        "answer": "Kualitas Drainase adalah fitur kritis penentu durasi kelumpuhan logistik air genangan. Drainase berskala nilai < 5 (Buruk/Tersumbat) memperlambat surutnya air rob masuk ke badan sungai. Peningkatan kualitas 3 tingkat saja bisa menurunkan level suatu RW dari matriks Risiko 4 turun drastis ke level Risiko 2."
    },
    {
        "intents": ["jenis tanah", "pengaruh gambut", "tanah aluvial", "mengapa lempung penting", "geologi banjarmasin"],
        "answer": "Mayoritas topologi Banjarmasin adalah tanah Aluvial (lempung rawa) dan daratan Gambut lunak. Struktur mikrologi jenis tanah ini memiliki daya resap (infiltrasi) yang relatif pelan. Yang patut ditakutkan adalah fenomena Subsidence akibat intrusi air asam."
    },
    {
        "intents": ["kepadatan penduduk", "populasi padat", "rumah kumuh", "mengapa penduduk penting", "dampak jumlah manusia", "dampak sosial"],
        "answer": "Kepadatan Penduduk tinggi (>8000 jiwa/km2) secara AI terbukti linear dengan degradasi lingkungan, penyempitan sempadan anak sungai, dan membeludaknya pembuangan sampah rumah tangga. Aspek demografi ini secara eksplisit masuk ke algoritma prediksi sebagai faktor penghambat hidrologi resapan."
    },
    {
        "intents": ["apa itu shap", "explainable ai", "transparansi model", "alasan keputusan", "bagaimana rf memutuskan", "fitur paling penting"],
        "answer": "SHAP (SHapley Additive exPlanations) adalah metode inovatif ilmu teori permainan matematika (Game Theory). Ia membongkar sifat 'Black Box' dari model Hybrid AI untuk menjabarkan di UI Dasbor seberapa gigih persentase pengaruh satu fitur (seperti Elevasi 1m) mempengaruhi vonis banjir."
    },
    {
        "intents": ["animasi spatio", "pemutar waktu", "waktu berjalan otomatis", "simulasi cuaca", "cara memutar bulan"],
        "answer": "BARITO telah ditanami modul Time-Series Playback. Jika Anda menekan ikon panah 'Auto-Play' pada kendali bulan di atas peta, Sistem AI otomatis menggerakkan slider berdurasi transisi 800ms dari Januari merayap ke Desember. Dasbor melukis perubahan matriks kelurahan (ukuran, warna merah/hijau, dan label panas peta)."
    },
    {
        "intents": ["simulasi genangan", "poligon air", "radius membesar", "lingkaran marker meluas", "animasi genangan map"],
        "answer": "Fitur Inundation Polygon (Simulasi Pelebaran Genangan) dirancang mendeteksi kelurahan berisiko level 4 (Sangat Rawan) dan otomatis meregangkan diameter markernya hingga 3x lipat, menutupi batas tanah dalam visual peta 2D. Tujuan efek visualisasi puitis ini adalah memberi getaran tanda gawat pada skala wilayah tenggelam."
    },
    {
        "intents": ["arsitektur web", "teknologi web", "database yang dipakai", "framework apa", "frontend backend", "cara kerja aplikasi"],
        "answer": "Secara topologi sistem, Backend (Akar logis BARITO) disuplai oleh Python (Kerangka Flask & ORM Database PostgreSQL + PostGIS (SRID 4326 WGS 84)) demi kecepatan rotasi matematis pelatih AI. Antarmuka UI (Daun yang cantik) dibangun murni dengan Vanilla ES6 JavaScript Murni, DOM API, CSS 3 Custom Properties, Chart.js, dan Leaflet.js."
    },
    {
        "intents": ["cara login admin", "fungsi dashboard admin", "merubah data", "cara menambah kelurahan", "menu rahasia intelijen"],
        "answer": "Portal Pengendali Terpusat diakses dengan Rute '/api/login' alias tombol 'Admin Login' pada Navbar. Ruang kendali rahasia terenkripsi JSON Web Token (JWT) ini (default access: user 'admin' pass 'admin123') melegitimasi sang pemilik web mengganti parameter Elevasi/Hujan kapanpun. Setiap Perubahan parameter Admin akan otomatis memaksa Random Forest mem-plot ulang semua probabilitas tanpa perlu Anda melatih skrip di IDE!"
    }
]

class LocalNLPChatbot:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(lowercase=True)
        self.corpus_docs = []
        self.responses = []
        self._initialize_model()

    def _initialize_model(self):
        # Flatten intents into documents
        for item in QA_CORPUS:
            for intent in item["intents"]:
                self.corpus_docs.append(intent)
                self.responses.append(item["answer"])
                
        # Train TF-IDF
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus_docs)
        print("[NLP] Model TF-IDF Chatbot Offline Berhasil Dilatih (10 Dokumen)")

    def get_response(self, query):
        if not query.strip():
            return "Silakan ketik pertanyaan Anda."
            
        # Convert query to vector
        query_vec = self.vectorizer.transform([query])
        
        # Compute cosine similarity
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
        best_match_idx = np.argmax(similarities)
        best_score = similarities[best_match_idx]
        
        # Thresholding
        if best_score > 0.25:  # Lower threshold because queries might be short
            return self.responses[best_match_idx]
        else:
            return "Maaf, pertanyaan Anda di luar lingkup data skripsi saya. Coba tanyakan spesifik mengenai Random Forest, 16 fitur, dataset, atau fitur peta BARITO."

# Singleton instance
nlp_engine = LocalNLPChatbot()

def chat_backend(query):
    return nlp_engine.get_response(query)
