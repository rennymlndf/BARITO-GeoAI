// ========================================================================
// data.js - Data Spasial Nyata Kota Banjarmasin (Verified)
// Sumber Penduduk & Luas: Satu Data Kota Banjarmasin / BPS 2024
// Sumber Curah Hujan: BMKG Stasiun Meteorologi Syamsudin Noor 2023-2024
// Sumber Risiko Banjir: BPBD Kota Banjarmasin 2023-2024
// Sumber Elevasi: topographic-map.com / BIG DEMNAS
// Sumber Pasang Surut: BMKG Maritim Pelabuhan Muara Sungai Barito
// ========================================================================

const BANJARMASIN_CENTER = [-3.3194, 114.5907];
const BANJARMASIN_ZOOM = 13;

const RISK_LEVELS = {
    1: { label: 'Aman', color: '#059669', bg: 'rgba(5,150,105,0.08)', icon: 'fa-check-circle' },
    2: { label: 'Sedang', color: '#d97706', bg: 'rgba(217,119,6,0.08)', icon: 'fa-info-circle' },
    3: { label: 'Rawan', color: '#ea580c', bg: 'rgba(234,88,12,0.08)', icon: 'fa-exclamation-triangle' },
    4: { label: 'Sangat Rawan', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: 'fa-exclamation-circle' }
};

const FEATURE_KEYS = [
    'elevasi', 'jarakSungai', 'curahHujan', 'tataGunaLahan',
    'kualitasDrainase', 'pengaruhPasang', 'kepadatanPenduduk', 'jenisTanah'
];

const FEATURE_META = {
    elevasi: { label: 'Elevasi (m dpl)', min: 0.5, max: 8.0, step: 0.1, unit: 'm', defaultVal: 3.0 },
    jarakSungai: { label: 'Jarak ke Sungai (m)', min: 10, max: 1200, step: 10, unit: 'm', defaultVal: 200 },
    curahHujan: { label: 'Curah Hujan (mm/thn)', min: 2000, max: 3200, step: 50, unit: 'mm', defaultVal: 2600 },
    tataGunaLahan: {
        label: 'Tata Guna Lahan', type: 'select',
        options: { 1: 'Permukiman Padat', 2: 'Permukiman', 3: 'Komersial', 4: 'Perairan/Rawa', 5: 'Campuran' },
        defaultVal: 2
    },
    kualitasDrainase: { label: 'Kualitas Drainase', min: 1, max: 10, step: 1, unit: '/10', defaultVal: 5 },
    pengaruhPasang: { label: 'Pengaruh Pasang Surut', min: 1, max: 10, step: 1, unit: '/10', defaultVal: 7 },
    kepadatanPenduduk: { label: 'Kepadatan Penduduk', min: 1000, max: 30000, step: 500, unit: 'jiwa/km²', defaultVal: 10000 },
    jenisTanah: {
        label: 'Jenis Tanah', type: 'select',
        options: { 1: 'Gambut', 2: 'Lempung', 3: 'Lanau', 4: 'Aluvial' },
        defaultVal: 2
    }
};

// ========================================================================
// Data 52 Kelurahan Kota Banjarmasin (Data Terverifikasi)
//
// Penduduk & Luas: Satu Data Kota Banjarmasin (banjarmasinkota.go.id) 2024
// Kepadatan: Dihitung = Penduduk / Luas (jiwa/km²)
// Koordinat: Google Maps / OpenStreetMap centroid kelurahan
// Elevasi: topographic-map.com (rata-rata Banjarmasin 4m, range -1m s/d 14m)
// Curah Hujan: BMKG 2024 total ~2791 mm, variasi per zona kota
// Risiko: BPBD Kota Banjarmasin - 41 kelurahan rawan banjir rob (2023-2024)
// Jenis Tanah: Peta tanah BBSDLP - Kota Banjarmasin dominan lempung lunak & gambut
// ========================================================================

const KELURAHAN_DATA = [
    // ── Kecamatan Banjarmasin Utara (10 Kelurahan) ──
    // Penduduk total: 151.799 jiwa, Luas: 17,75 km²
    // BPBD: 9 kelurahan rawan banjir rob
    // Elevasi kecamatan: rata-rata 3m (topographic-map.com)
    { id: 1, nama: 'Alalak Utara', kecamatan: 'Banjarmasin Utara', lat: -3.27816, lng: 114.5784169,
      penduduk: 22210, luasKm2: 2.962,
      elevasi: 2.0, jarakSungai: 80, curahHujan: 2791, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 7500, jenisTanah: 1, riskLevel: 4 },
    { id: 2, nama: 'Alalak Selatan', kecamatan: 'Banjarmasin Utara', lat: -3.2850527, lng: 114.5716846,
      penduduk: 14122, luasKm2: 1.262,
      elevasi: 2.5, jarakSungai: 120, curahHujan: 2791, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 8, kepadatanPenduduk: 11190, jenisTanah: 1, riskLevel: 4 },
    { id: 3, nama: 'Alalak Tengah', kecamatan: 'Banjarmasin Utara', lat: -3.2749815, lng: 114.5691767,
      penduduk: 8836, luasKm2: 0.928,
      elevasi: 2.0, jarakSungai: 100, curahHujan: 2791, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 9522, jenisTanah: 1, riskLevel: 4 },
    { id: 4, nama: 'Sungai Jingah', kecamatan: 'Banjarmasin Utara', lat: -3.3145027, lng: 114.6058238,
      penduduk: 13008, luasKm2: 3.904,
      elevasi: 2.5, jarakSungai: 50, curahHujan: 2791, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 3332, jenisTanah: 2, riskLevel: 4 },
    { id: 5, nama: 'Sungai Miai', kecamatan: 'Banjarmasin Utara', lat: -3.2945321, lng: 114.5947516,
      penduduk: 14488, luasKm2: 1.685,
      elevasi: 3.5, jarakSungai: 200, curahHujan: 2791, tataGunaLahan: 3, kualitasDrainase: 4, pengaruhPasang: 7, kepadatanPenduduk: 8598, jenisTanah: 2, riskLevel: 3 },
    { id: 6, nama: 'Surgi Mufti', kecamatan: 'Banjarmasin Utara', lat: -3.308992, lng: 114.6007651,
      penduduk: 15227, luasKm2: 1.52,
      elevasi: 4.0, jarakSungai: 350, curahHujan: 2791, tataGunaLahan: 2, kualitasDrainase: 5, pengaruhPasang: 6, kepadatanPenduduk: 10018, jenisTanah: 2, riskLevel: 2 },
    { id: 7, nama: 'Pangeran', kecamatan: 'Banjarmasin Utara', lat: -3.3012399, lng: 114.5848703,
      penduduk: 9790, luasKm2: 1.48,
      elevasi: 3.0, jarakSungai: 150, curahHujan: 2791, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 8, kepadatanPenduduk: 6615, jenisTanah: 2, riskLevel: 3 },
    { id: 8, nama: 'Antasan Kecil Timur', kecamatan: 'Banjarmasin Utara', lat: -3.3056073, lng: 114.5932697,
      penduduk: 9139, luasKm2: 0.716,
      elevasi: 3.0, jarakSungai: 100, curahHujan: 2791, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 8, kepadatanPenduduk: 12764, jenisTanah: 2, riskLevel: 3 },
    { id: 9, nama: 'Kuin Utara', kecamatan: 'Banjarmasin Utara', lat: -3.2923577, lng: 114.5716095,
      penduduk: 13053, luasKm2: 1.691,
      elevasi: 2.0, jarakSungai: 60, curahHujan: 2791, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 7720, jenisTanah: 1, riskLevel: 4 },
    { id: 10, nama: 'Sungai Andai', kecamatan: 'Banjarmasin Utara', lat: -3.2928772, lng: 114.6104962,
      penduduk: 31926, luasKm2: 6.462,
      elevasi: 5.0, jarakSungai: 600, curahHujan: 2791, tataGunaLahan: 2, kualitasDrainase: 7, pengaruhPasang: 3, kepadatanPenduduk: 4941, jenisTanah: 4, riskLevel: 1 },

    // ── Kecamatan Banjarmasin Tengah (12 Kelurahan) ──
    // Penduduk total: 81.099 jiwa, Luas: 6,72 km²
    // BPBD: 9 kelurahan rawan banjir rob
    // Elevasi kecamatan: rata-rata 6m (topographic-map.com: avg 20ft/6.1m, min 7ft/2.1m, max 26ft/7.9m)
    { id: 11, nama: 'Kertak Baru Ilir', kecamatan: 'Banjarmasin Tengah', lat: -3.3253354, lng: 114.5897774,
      penduduk: 2966, luasKm2: 0.47,
      elevasi: 5.0, jarakSungai: 350, curahHujan: 2650, tataGunaLahan: 3, kualitasDrainase: 5, pengaruhPasang: 5, kepadatanPenduduk: 6311, jenisTanah: 2, riskLevel: 3 },
    { id: 12, nama: 'Kertak Baru Ulu', kecamatan: 'Banjarmasin Tengah', lat: -3.3218665, lng: 114.5905741,
      penduduk: 1436, luasKm2: 0.45,
      elevasi: 5.5, jarakSungai: 300, curahHujan: 2650, tataGunaLahan: 3, kualitasDrainase: 5, pengaruhPasang: 5, kepadatanPenduduk: 3191, jenisTanah: 2, riskLevel: 2 },
    { id: 13, nama: 'Gadang', kecamatan: 'Banjarmasin Tengah', lat: -3.3180146, lng: 114.5941655,
      penduduk: 7660, luasKm2: 0.30,
      elevasi: 6.0, jarakSungai: 500, curahHujan: 2650, tataGunaLahan: 3, kualitasDrainase: 4, pengaruhPasang: 4, kepadatanPenduduk: 25533, jenisTanah: 3, riskLevel: 2 },
    { id: 14, nama: 'Melayu', kecamatan: 'Banjarmasin Tengah', lat: -3.3171899, lng: 114.6006391,
      penduduk: 7677, luasKm2: 0.59,
      elevasi: 3.5, jarakSungai: 120, curahHujan: 2650, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 13010, jenisTanah: 2, riskLevel: 3 },
    { id: 15, nama: 'Pekapuran Laut', kecamatan: 'Banjarmasin Tengah', lat: -3.325717, lng: 114.5985228,
      penduduk: 5469, luasKm2: 0.22,
      elevasi: 5.5, jarakSungai: 400, curahHujan: 2650, tataGunaLahan: 1, kualitasDrainase: 4, pengaruhPasang: 5, kepadatanPenduduk: 24859, jenisTanah: 3, riskLevel: 3 },
    { id: 16, nama: 'Teluk Dalam', kecamatan: 'Banjarmasin Tengah', lat: -3.3202618, lng: 114.5783251,
      penduduk: 23289, luasKm2: 1.83,
      elevasi: 3.0, jarakSungai: 80, curahHujan: 2650, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 8, kepadatanPenduduk: 12727, jenisTanah: 2, riskLevel: 4 },
    { id: 17, nama: 'Pasar Lama', kecamatan: 'Banjarmasin Tengah', lat: -3.3087778, lng: 114.5902535,
      penduduk: 5331, luasKm2: 0.46,
      elevasi: 3.5, jarakSungai: 90, curahHujan: 2650, tataGunaLahan: 3, kualitasDrainase: 4, pengaruhPasang: 7, kepadatanPenduduk: 11589, jenisTanah: 2, riskLevel: 3 },
    { id: 18, nama: 'Antasan Besar', kecamatan: 'Banjarmasin Tengah', lat: -3.313682, lng: 114.5888729,
      penduduk: 6265, luasKm2: 0.81,
      elevasi: 4.0, jarakSungai: 200, curahHujan: 2650, tataGunaLahan: 5, kualitasDrainase: 4, pengaruhPasang: 6, kepadatanPenduduk: 7735, jenisTanah: 2, riskLevel: 3 },
    { id: 19, nama: 'Mawar', kecamatan: 'Banjarmasin Tengah', lat: -3.3259044, lng: 114.5820057,
      penduduk: 4993, luasKm2: 0.46,
      elevasi: 5.0, jarakSungai: 250, curahHujan: 2650, tataGunaLahan: 2, kualitasDrainase: 5, pengaruhPasang: 5, kepadatanPenduduk: 10854, jenisTanah: 3, riskLevel: 3 },
    { id: 20, nama: 'Seberang Mesjid', kecamatan: 'Banjarmasin Tengah', lat: -3.3111516, lng: 114.59608,
      penduduk: 6613, luasKm2: 0.41,
      elevasi: 3.0, jarakSungai: 60, curahHujan: 2650, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 8, kepadatanPenduduk: 16127, jenisTanah: 2, riskLevel: 4 },
    { id: 21, nama: 'Kelayan Luar', kecamatan: 'Banjarmasin Tengah', lat: -3.328076, lng: 114.5968303,
      penduduk: 5070, luasKm2: 0.24,
      elevasi: 3.5, jarakSungai: 180, curahHujan: 2650, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 21125, jenisTanah: 2, riskLevel: 3 },
    { id: 22, nama: 'Sungai Baru', kecamatan: 'Banjarmasin Tengah', lat: -3.3226872, lng: 114.597187,
      penduduk: 4330, luasKm2: 0.47,
      elevasi: 3.0, jarakSungai: 70, curahHujan: 2650, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 8, kepadatanPenduduk: 9213, jenisTanah: 2, riskLevel: 3 },

    // ── Kecamatan Banjarmasin Barat (9 Kelurahan) ──
    // Penduduk total: 137.451 jiwa, Luas: 13,37 km²
    // BPBD: 8 kelurahan rawan banjir rob
    // Elevasi kecamatan: rata-rata 3m (area rendah dekat sungai)
    { id: 23, nama: 'Pelambuan', kecamatan: 'Banjarmasin Barat', lat: -3.3196587, lng: 114.5643648,
      penduduk: 25831, luasKm2: 2.12,
      elevasi: 2.5, jarakSungai: 70, curahHujan: 2900, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 12184, jenisTanah: 1, riskLevel: 4 },
    { id: 24, nama: 'Telaga Biru', kecamatan: 'Banjarmasin Barat', lat: -3.3266301, lng: 114.5680904,
      penduduk: 15886, luasKm2: 1.53,
      elevasi: 3.5, jarakSungai: 180, curahHujan: 2900, tataGunaLahan: 2, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 10383, jenisTanah: 2, riskLevel: 3 },
    { id: 25, nama: 'Telawang', kecamatan: 'Banjarmasin Barat', lat: -3.3296545, lng: 114.5799069,
      penduduk: 10818, luasKm2: 0.68,
      elevasi: 4.5, jarakSungai: 300, curahHujan: 2900, tataGunaLahan: 3, kualitasDrainase: 5, pengaruhPasang: 6, kepadatanPenduduk: 15909, jenisTanah: 3, riskLevel: 3 },
    { id: 26, nama: 'Kuin Selatan', kecamatan: 'Banjarmasin Barat', lat: -3.2980453, lng: 114.5784008,
      penduduk: 11555, luasKm2: 1.72,
      elevasi: 2.5, jarakSungai: 90, curahHujan: 2900, tataGunaLahan: 4, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 6716, jenisTanah: 1, riskLevel: 4 },
    { id: 27, nama: 'Kuin Cerucuk', kecamatan: 'Banjarmasin Barat', lat: -3.2952337, lng: 114.571576,
      penduduk: 17704, luasKm2: 1.66,
      elevasi: 2.0, jarakSungai: 50, curahHujan: 2900, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 10665, jenisTanah: 1, riskLevel: 4 },
    { id: 28, nama: 'Basirih', kecamatan: 'Banjarmasin Barat', lat: -3.3345962, lng: 114.5654055,
      penduduk: 21768, luasKm2: 3.65,
      elevasi: 4.5, jarakSungai: 400, curahHujan: 2900, tataGunaLahan: 2, kualitasDrainase: 6, pengaruhPasang: 5, kepadatanPenduduk: 5964, jenisTanah: 2, riskLevel: 2 },
    { id: 29, nama: 'Belitung Selatan', kecamatan: 'Banjarmasin Barat', lat: -3.30851, lng: 114.5772904,
      penduduk: 14748, luasKm2: 0.70,
      elevasi: 3.0, jarakSungai: 100, curahHujan: 2900, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 8, kepadatanPenduduk: 21069, jenisTanah: 2, riskLevel: 3 },
    { id: 30, nama: 'Belitung Utara', kecamatan: 'Banjarmasin Barat', lat: -3.3040181, lng: 114.5798895,
      penduduk: 7445, luasKm2: 0.74,
      elevasi: 3.5, jarakSungai: 250, curahHujan: 2900, tataGunaLahan: 5, kualitasDrainase: 4, pengaruhPasang: 6, kepadatanPenduduk: 10061, jenisTanah: 2, riskLevel: 3 },
    { id: 31, nama: 'Teluk Tiram', kecamatan: 'Banjarmasin Barat', lat: -3.3385203, lng: 114.580662,
      penduduk: 11696, luasKm2: 0.57,
      elevasi: 3.0, jarakSungai: 130, curahHujan: 2900, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 20519, jenisTanah: 2, riskLevel: 3 },

    // ── Kecamatan Banjarmasin Timur (9 Kelurahan) ──
    // Penduduk total: 92.233 jiwa, Luas: 23,86 km²
    // BPBD: 8 kelurahan rawan banjir rob
    // Elevasi kecamatan: rata-rata 5m (topographic-map.com), area paling tinggi
    { id: 32, nama: 'Kuripan', kecamatan: 'Banjarmasin Timur', lat: -3.3227983, lng: 114.6051612,
      penduduk: 11695, luasKm2: 1.43,
      elevasi: 5.5, jarakSungai: 600, curahHujan: 2550, tataGunaLahan: 3, kualitasDrainase: 7, pengaruhPasang: 3, kepadatanPenduduk: 8178, jenisTanah: 3, riskLevel: 3 },
    { id: 33, nama: 'Kebun Bunga', kecamatan: 'Banjarmasin Timur', lat: -3.3262793, lng: 114.6108194,
      penduduk: 9792, luasKm2: 1.19,
      elevasi: 7.0, jarakSungai: 800, curahHujan: 2550, tataGunaLahan: 2, kualitasDrainase: 7, pengaruhPasang: 2, kepadatanPenduduk: 8228, jenisTanah: 3, riskLevel: 1 },
    { id: 34, nama: 'Sungai Bilu', kecamatan: 'Banjarmasin Timur', lat: -3.3167172, lng: 114.6094447,
      penduduk: 7994, luasKm2: 0.57,
      elevasi: 3.5, jarakSungai: 150, curahHujan: 2550, tataGunaLahan: 1, kualitasDrainase: 4, pengaruhPasang: 7, kepadatanPenduduk: 14024, jenisTanah: 2, riskLevel: 3 },
    { id: 35, nama: 'Pekapuran Raya', kecamatan: 'Banjarmasin Timur', lat: -3.3349014, lng: 114.6038094,
      penduduk: 12471, luasKm2: 0.96,
      elevasi: 5.0, jarakSungai: 400, curahHujan: 2550, tataGunaLahan: 2, kualitasDrainase: 5, pengaruhPasang: 5, kepadatanPenduduk: 12991, jenisTanah: 3, riskLevel: 3 },
    { id: 36, nama: 'Pengambangan', kecamatan: 'Banjarmasin Timur', lat: -3.315381, lng: 114.6182424,
      penduduk: 9585, luasKm2: 1.21,
      elevasi: 6.5, jarakSungai: 700, curahHujan: 2550, tataGunaLahan: 2, kualitasDrainase: 6, pengaruhPasang: 3, kepadatanPenduduk: 7922, jenisTanah: 4, riskLevel: 3 },
    { id: 37, nama: 'Karang Mekar', kecamatan: 'Banjarmasin Timur', lat: -3.3297683, lng: 114.6061188,
      penduduk: 10019, luasKm2: 0.70,
      elevasi: 5.0, jarakSungai: 350, curahHujan: 2550, tataGunaLahan: 2, kualitasDrainase: 5, pengaruhPasang: 5, kepadatanPenduduk: 14313, jenisTanah: 3, riskLevel: 3 },
    { id: 38, nama: 'Benua Anyar', kecamatan: 'Banjarmasin Timur', lat: -3.3070881, lng: 114.611671,
      penduduk: 6632, luasKm2: 0.90,
      elevasi: 3.5, jarakSungai: 100, curahHujan: 2550, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 7369, jenisTanah: 2, riskLevel: 3 },
    { id: 39, nama: 'Sungai Lulut', kecamatan: 'Banjarmasin Timur', lat: -3.320308, lng: 114.6292072,
      penduduk: 14313, luasKm2: 7.52,
      elevasi: 1.5, jarakSungai: 30, curahHujan: 2550, tataGunaLahan: 4, kualitasDrainase: 1, pengaruhPasang: 10, kepadatanPenduduk: 1904, jenisTanah: 1, riskLevel: 4 },
    { id: 40, nama: 'Pemurus Luar', kecamatan: 'Banjarmasin Timur', lat: -3.3443, lng: 114.630484,
      penduduk: 9732, luasKm2: 2.45,
      elevasi: 3.5, jarakSungai: 200, curahHujan: 2550, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 3972, jenisTanah: 2, riskLevel: 3 },

    // ── Kecamatan Banjarmasin Selatan (12 Kelurahan) ──
    // Penduduk total: 151.169 jiwa, Luas: 38,26 km²
    // BPBD: 6 kelurahan rawan banjir rob
    // Elevasi kecamatan: rata-rata 3m, area selatan dekat muara sangat rendah
    { id: 41, nama: 'Kelayan Tengah', kecamatan: 'Banjarmasin Selatan', lat: -3.3355019, lng: 114.5931336,
      penduduk: 5370, luasKm2: 0.19,
      elevasi: 2.5, jarakSungai: 100, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 8, kepadatanPenduduk: 28263, jenisTanah: 1, riskLevel: 4 },
    { id: 42, nama: 'Kelayan Selatan', kecamatan: 'Banjarmasin Selatan', lat: -3.3374693, lng: 114.5866138,
      penduduk: 13892, luasKm2: 1.14,
      elevasi: 2.5, jarakSungai: 120, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 8, kepadatanPenduduk: 12186, jenisTanah: 1, riskLevel: 4 },
    { id: 43, nama: 'Kelayan Barat', kecamatan: 'Banjarmasin Selatan', lat: -3.330909, lng: 114.5940261,
      penduduk: 5501, luasKm2: 0.29,
      elevasi: 3.0, jarakSungai: 150, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 18969, jenisTanah: 2, riskLevel: 3 },
    { id: 44, nama: 'Kelayan Timur', kecamatan: 'Banjarmasin Selatan', lat: -3.3441688, lng: 114.5907524,
      penduduk: 18678, luasKm2: 4.09,
      elevasi: 2.5, jarakSungai: 80, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 8, kepadatanPenduduk: 4567, jenisTanah: 2, riskLevel: 4 },
    { id: 45, nama: 'Kelayan Dalam', kecamatan: 'Banjarmasin Selatan', lat: -3.332853, lng: 114.5969671,
      penduduk: 10015, luasKm2: 0.34,
      elevasi: 2.5, jarakSungai: 130, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 8, kepadatanPenduduk: 29456, jenisTanah: 1, riskLevel: 4 },
    { id: 46, nama: 'Pemurus Dalam', kecamatan: 'Banjarmasin Selatan', lat: -3.3518937, lng: 114.6186072,
      penduduk: 19888, luasKm2: 4.35,
      elevasi: 2.5, jarakSungai: 90, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 2, pengaruhPasang: 9, kepadatanPenduduk: 4572, jenisTanah: 2, riskLevel: 4 },
    { id: 47, nama: 'Pemurus Baru', kecamatan: 'Banjarmasin Selatan', lat: -3.3433334, lng: 114.6127117,
      penduduk: 13645, luasKm2: 1.38,
      elevasi: 3.5, jarakSungai: 250, curahHujan: 2800, tataGunaLahan: 5, kualitasDrainase: 4, pengaruhPasang: 6, kepadatanPenduduk: 9888, jenisTanah: 2, riskLevel: 3 },
    { id: 48, nama: 'Pekauman', kecamatan: 'Banjarmasin Selatan', lat: -3.3313421, lng: 114.58873,
      penduduk: 10641, luasKm2: 0.37,
      elevasi: 3.0, jarakSungai: 160, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 28759, jenisTanah: 2, riskLevel: 3 },
    { id: 49, nama: 'Tanjung Pagar', kecamatan: 'Banjarmasin Selatan', lat: -3.3655308, lng: 114.5994347,
      penduduk: 9130, luasKm2: 4.56,
      elevasi: 3.0, jarakSungai: 100, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 8, kepadatanPenduduk: 2002, jenisTanah: 2, riskLevel: 3 },
    { id: 50, nama: 'Murung Raya', kecamatan: 'Banjarmasin Selatan', lat: -3.3423774, lng: 114.5952693,
      penduduk: 13742, luasKm2: 0.67,
      elevasi: 3.0, jarakSungai: 180, curahHujan: 2800, tataGunaLahan: 1, kualitasDrainase: 3, pengaruhPasang: 7, kepadatanPenduduk: 20510, jenisTanah: 2, riskLevel: 3 },
    { id: 51, nama: 'Basirih Selatan', kecamatan: 'Banjarmasin Selatan', lat: -3.3494785, lng: 114.5746565,
      penduduk: 14815, luasKm2: 8.66,
      elevasi: 1.5, jarakSungai: 40, curahHujan: 2800, tataGunaLahan: 4, kualitasDrainase: 1, pengaruhPasang: 10, kepadatanPenduduk: 1711, jenisTanah: 1, riskLevel: 4 },
    { id: 52, nama: 'Mantuil', kecamatan: 'Banjarmasin Selatan', lat: -3.3511548, lng: 114.5466382,
      penduduk: 15852, luasKm2: 12.22,
      elevasi: 1.0, jarakSungai: 20, curahHujan: 2800, tataGunaLahan: 4, kualitasDrainase: 1, pengaruhPasang: 10, kepadatanPenduduk: 1297, jenisTanah: 1, riskLevel: 4 }
];

// ========================================================================
// Kecamatan Boundaries & Data Agregat
// Sumber penduduk: Satu Data Kota Banjarmasin 2024
// Sumber luas: BPS Kota Banjarmasin 2024
// ========================================================================
const KECAMATAN_BOUNDARIES = [
    {
        nama: 'Banjarmasin Utara',
        luasKm2: 17.75,
        penduduk: 151799,
        color: '#dc2626',
        bounds: [[-3.272, 114.555], [-3.272, 114.600], [-3.310, 114.600], [-3.310, 114.555]]
    },
    {
        nama: 'Banjarmasin Tengah',
        luasKm2: 6.72,
        penduduk: 81099,
        color: '#d97706',
        bounds: [[-3.305, 114.575], [-3.305, 114.600], [-3.330, 114.600], [-3.330, 114.575]]
    },
    {
        nama: 'Banjarmasin Barat',
        luasKm2: 13.37,
        penduduk: 137451,
        color: '#ea580c',
        bounds: [[-3.295, 114.540], [-3.295, 114.575], [-3.340, 114.575], [-3.340, 114.540]]
    },
    {
        nama: 'Banjarmasin Timur',
        luasKm2: 23.86,
        penduduk: 92233,
        color: '#059669',
        bounds: [[-3.310, 114.595], [-3.310, 114.640], [-3.350, 114.640], [-3.350, 114.595]]
    },
    {
        nama: 'Banjarmasin Selatan',
        luasKm2: 38.26,
        penduduk: 151169,
        color: '#1d4ed8',
        bounds: [[-3.325, 114.560], [-3.325, 114.610], [-3.370, 114.610], [-3.370, 114.560]]
    }
];

// ========================================================================
// Data Pasang Surut Bulanan (Sumber: BMKG Maritim Pelabuhan Muara Sungai Barito)
// Pasang maks muara Sungai Barito: 2.5 - 3.0 m (puncak Mei-Jun, Nov-Des)
// ========================================================================
const TIDAL_DATA = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    pasangMaks: [260, 255, 265, 270, 290, 300, 275, 260, 255, 270, 295, 310],    // cm
    pasangRata: [195, 190, 200, 205, 220, 230, 210, 195, 190, 205, 225, 240],    // cm
    kejadianBanjir: [3, 2, 3, 2, 5, 6, 3, 1, 1, 2, 5, 7]                         // kejadian/bulan
};

// ========================================================================
// Curah Hujan Bulanan (Sumber: BMKG Stasiun Meteorologi Syamsudin Noor)
// Data terverifikasi dari BMKG
// ========================================================================
const CURAH_HUJAN_2024 = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    data: [558.0, 285.9, 319.5, 190.0, 142.5, 203.4, 139.3, 16.2, 34.4, 106.4, 437.1, 358.1]
};

const CURAH_HUJAN_2023 = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    data: [336.9, 264.7, 467.2, 147.2, 179.8, 86.6, 307.6, 145.2, 256.3, 152.9, 329.4, 114.6]
};

// Global temporal reference (averages/baseline)
const TIDAL_PASANG_MAKS = [260, 255, 265, 270, 290, 300, 275, 260, 255, 270, 295, 310];
const CURAH_HUJAN_BLN = [447.5, 275.3, 393.4, 168.6, 161.2, 145.0, 223.5, 80.7, 145.4, 129.7, 383.3, 236.4];

// ========================================================================
// Helper Functions
// ========================================================================

function getFeatureVector(data) {
    return FEATURE_KEYS.map(key => data[key]);
}

function getTrainingData() {
    const X = [];
    const y = [];
    KELURAHAN_DATA.forEach(kel => {
        X.push(getFeatureVector(kel));
        y.push(kel.riskLevel);
    });
    return { X, y };
}

/**
 * Menghitung statistik risiko (Spatio-Temporal)
 * @param {number|null} month - Bulan (0-11), null untuk rata-rata
 */
function getStats(month = null) {
    const riskCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const kecamatanRisk = {};
    const riskLabels = { 1: 'Aman', 2: 'Sedang', 3: 'Rawan', 4: 'Sangat Rawan' };

    KELURAHAN_DATA.forEach(kel => {
        let currentRisk = kel.riskLevel;

        // Apply temporal logic if month is specified
        if (month !== null && typeof month !== 'undefined') {
            // Logic mirrors backend data.py
            const rain = (typeof CURAH_HUJAN_BLN !== 'undefined') ? CURAH_HUJAN_BLN[month] : 200;
            const tidal = (typeof TIDAL_PASANG_MAKS !== 'undefined') ? TIDAL_PASANG_MAKS[month] : 200;
            
            // Base modifier
            let modifier = 0;
            if (tidal > 290) modifier += 1; // Puncak pasang
            if (rain > 350) modifier += 1;  // Hujan sangat tinggi
            if (tidal < 260 && rain < 150) modifier -= 1; // Kering & Pasang rendah
            
            currentRisk = Math.max(1, Math.min(4, kel.riskLevel + modifier));
        }

        riskCounts[currentRisk]++;
        const kec = kel.kecamatan.replace('Banjarmasin ', '');
        if (!kecamatanRisk[kec]) kecamatanRisk[kec] = [];
        kecamatanRisk[kec].push(currentRisk);
    });

    const avgRiskPerKecamatan = {};
    Object.entries(kecamatanRisk).forEach(([kec, risks]) => {
        avgRiskPerKecamatan[kec] = risks.reduce((a, b) => a + b, 0) / risks.length;
    });

    return {
        total: KELURAHAN_DATA.length,
        totalKelurahan: KELURAHAN_DATA.length,
        riskCounts,
        avgRiskPerKecamatan,
        tidalData: TIDAL_DATA,
        activeMonth: month
    };
}
