# app.py - Layanan Backend API untuk Sistem BARITO
# Implementasi Algoritma Hybrid RF-LSTM untuk Analisis Risiko Banjir Spatio-Temporal

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from model import get_model
from data import (
    KELURAHAN_DATA, TIDAL_DATA, CURAH_HUJAN_BULANAN,
    CURAH_HUJAN_2024, CURAH_HUJAN_2023, MUSIM_BULANAN,
    RIVER_DATA, REGIONAL_WEATHER_DATA,
    FEATURE_KEYS_SPATIAL, FEATURE_KEYS_TEMPORAL, FEATURE_KEYS_ALL,
    RISK_LABELS, TATA_GUNA_LAHAN, JENIS_TANAH,
    get_kelurahan_by_id, get_all_kelurahan_temporal,
    get_stats_by_month, get_month_label, compute_temporal_risk
)
from intelligence_gatherer import get_intelligence
from database import (
    db_session, Kelurahan, TidalData, RainfallData, User, 
    AdminLog, ModelEvaluation, ModelTrainingParam, FloodIncident
)
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
from datetime import timedelta
from sqlalchemy import text
from nlp_chat import chat_backend

app = Flask(__name__)
CORS(app)

# JWT Configuration
app.config["JWT_SECRET_KEY"] = "super-secret-key-barito-2026" # Change in production
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
jwt = JWTManager(app)

# Database connectivity helper
def get_db_data_available():
    try:
        # Check connection
        db_session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

# ── Static File Serving (Root Directory) ──
@app.route('/<path:path>')
def serve_static(path):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    return send_from_directory(root_dir, path)

@app.route('/')
def serve_index():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    return send_from_directory(root_dir, 'index.html')

# ── Auto-train model on startup ──
model = get_model()

@app.route('/', methods=['GET'])
def index():
    """Halaman Utama API"""
    return f"<h1>Layanan Backend BARITO Aktif</h1><p>Banjarmasin Adaptive Rob Intelligence and Temporal Observation</p><p>Titik akhir API tersedia pada direktori /api</p>"


# --- API ENDPOINTS ---

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_trained': model.is_trained,
        'accuracy': model.accuracy
    })

@app.route('/api/model', methods=['GET'])
def model_info():
    """Informasi teknis model"""
    return jsonify(model.get_model_info())


@app.route('/api/intelligence', methods=['GET'])
def intelligence():
    """Get real-time intelligence signals (Layer 1 & 3)"""
    return jsonify(get_intelligence())


@app.route('/api/login', methods=['POST'])
def login():
    """Endpoint untuk autentikasi admin"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username dan password diperlukan"}), 400
    
    # Mekanisme bypass autentikasi untuk keperluan demonstrasi atau sidang penelitian.
    if username == 'admin' and password == 'admin123':
        access_token = create_access_token(identity=username)
        return jsonify(access_token=access_token, role='admin')
        
    if not get_db_data_available():
        return jsonify({"error": "Database tidak tersedia dan login fallback gagal"}), 401
        
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        # Log successful login
        try:
            log = AdminLog(user_id=user.id, action="Login", details=f"User {username} berhasil login")
            db_session.add(log)
            db_session.commit()
        except Exception: pass
            
        access_token = create_access_token(identity=username)
        return jsonify(access_token=access_token, role=user.role)
    
    return jsonify({"error": "Username atau password salah"}), 401

@app.route('/api/admin/kelurahan/update', methods=['POST'])
@jwt_required()
def update_kelurahan():
    """Update data kelurahan (Admin only)"""
    data = request.get_json()
    kel_id = data.get('id')
    
    if not kel_id:
        return jsonify({"error": "ID Kelurahan diperlukan"}), 400
        
    if not get_db_data_available():
        return jsonify({"error": "Database tidak tersedia. Perubahan tidak dapat disimpan."}), 503
        
    try:
        from database import db_session
        kel = db_session.get(Kelurahan, kel_id)
        if not kel:
            return jsonify({"error": "Kelurahan tidak ditemukan"}), 404
            
        # Update fields if provided in database
        if 'elevasi' in data: kel.elevasi = float(data['elevasi'])
        if 'kualitasDrainase' in data: kel.kualitas_drainase = int(data['kualitasDrainase'])
        if 'pengaruhPasang' in data: kel.pengaruh_pasang = int(data['pengaruhPasang'])
        if 'penduduk' in data: kel.penduduk = int(data['penduduk'])
        
        db_session.commit()
        
        # Log update
        try:
            current_user = get_jwt_identity()
            admin = User.query.filter_by(username=current_user).first()
            log = AdminLog(user_id=admin.id if admin else None, action="Update Kelurahan", details=f"Update data spasial Kelurahan {kel.nama}")
            db_session.add(log)
            db_session.commit()
        except Exception: pass
        
        # Update in-memory data that model.train() actually uses
        for kel_data in KELURAHAN_DATA:
            if kel_data['id'] == kel_id:
                if 'elevasi' in data: kel_data['elevasi'] = float(data['elevasi'])
                if 'kualitasDrainase' in data: kel_data['kualitasDrainase'] = int(data['kualitasDrainase'])
                if 'pengaruhPasang' in data: kel_data['pengaruhPasang'] = int(data['pengaruhPasang'])
                if 'penduduk' in data: kel_data['penduduk'] = int(data['penduduk'])
                break
        
        # Training ulang otomatis model Random Forest di background thread agar tidak lemot
        import threading
        def background_train():
            try:
                model.train()
                print(f"[BARITO] Pelatihan ulang model berhasil dilakukan secara otomatis setelah pembaruan data Kelurahan {kel.nama}.")
            except Exception as train_err:
                print(f"[BARITO] Error saat training ulang otomatis: {train_err}")
                
        threading.Thread(target=background_train).start()
            
        return jsonify({"message": f"Data {kel.nama} berhasil diperbarui (Model otomatis dilatih ulang di background)", "kelurahan": kel.to_dict()})
        
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/climate/update', methods=['POST'])
@jwt_required()
def update_climate():
    """Update data iklim makro global (Admin only)"""
    data_req = request.get_json()
    rain_data = data_req.get('rain')
    tide_data = data_req.get('tide')
    
    if not rain_data or len(rain_data) != 12 or not tide_data or len(tide_data) != 12:
        return jsonify({"error": "Data curah hujan dan pasang surut (masing-masing 12 bulan) diperlukan"}), 400
        
    try:
        # Update in-memory local data
        for i in range(12):
            CURAH_HUJAN_BULANAN[i] = float(rain_data[i])
            TIDAL_DATA['pasangMaks'][i] = int(tide_data[i])
            
        # Update Database
        if get_db_data_available():
            from database import db_session
            
            db_tides = db_session.query(TidalData).order_by(TidalData.month).all()
            for t in db_tides:
                if 1 <= t.month <= 12:
                    t.pasang_maks = int(tide_data[t.month - 1])
                    
            db_rains = db_session.query(RainfallData).filter(RainfallData.year == 2024).all()
            for r in db_rains:
                if 1 <= r.month <= 12:
                    r.rainfall = float(rain_data[r.month - 1])
                    
            db_session.commit()
            
            # Log update
            try:
                current_user = get_jwt_identity()
                admin = User.query.filter_by(username=current_user).first()
                log = AdminLog(user_id=admin.id if admin else None, action="Update Iklim", details="Update dataset curah hujan & pasang surut global")
                db_session.add(log)
                db_session.commit()
            except Exception: pass
            
        # Retrain model automatically
        import threading
        def background_train_climate():
            try:
                model.train()
                print("[BARITO] Model dilatih ulang pasca-update Data Cuaca Makro")
            except Exception as e:
                print(f"[BARITO] Error retraining: {e}")
                
        threading.Thread(target=background_train_climate).start()
        
        return jsonify({"message": "Data Iklim Global berhasil diperbarui"})
        
    except Exception as e:
        if get_db_data_available(): db_session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/model/retrain', methods=['POST'])
@jwt_required()
def retrain_model():
    """Manual trigger to retrain the AI Model (Admin only)"""
    try:
        model.train()
        return jsonify({
            "message": "Model AI (Hybrid RF-LSTM) berhasil dilatih ulang",
            "accuracy": model.accuracy,
            "n_estimators": model.n_estimators,
            "max_depth": model.max_depth,
            "is_trained": model.is_trained
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/system/sync', methods=['POST'])
@jwt_required()
def sync_live_data():
    from scraper import fetch_latest_weather_data
    import os, json, threading
    import data as bdm_data
    
    success, msg = fetch_latest_weather_data()
    if success:
        try:
            dyn_path = os.path.join(os.path.dirname(__file__), 'dynamic_weather.json')
            with open(dyn_path, 'r') as f:
                dyn_data = json.load(f)
                new_rain = dyn_data["curah_hujan_bulanan"]
                
                # Update in-memory data
                bdm_data.CURAH_HUJAN_BULANAN = new_rain
                
                # Background train so the API unblocks quickly
                def bg_train():
                    try:
                        model.train()
                        print("[BARITO] Model berhasil dilatih ulang setelah Sinkronisasi API.")
                    except Exception as e:
                        print(f"[BARITO] Background train error: {e}")
                        
                threading.Thread(target=bg_train).start()
                
            return jsonify({
                'message': 'Sinkronisasi berhasil! 12 Bulan data curah hujan diperbarui dari Open-Meteo API. Model sedang dilatih ulang di latar belakang.',
                'curah_hujan_bulanan': new_rain
            })
        except Exception as e:
            return jsonify({'error': f'Gagal membaca file data dinamis: {str(e)}'}), 500
    else:
        return jsonify({'error': f'Gagal sinkronisasi API: {msg}'}), 500


# --- ADMIN & MONITORING ---

@app.route('/api/admin/logs', methods=['GET'])
@jwt_required()
def get_admin_logs():
    """Mengambil log aktivitas admin terbaru"""
    try:
        logs = AdminLog.query.order_by(AdminLog.timestamp.desc()).limit(50).all()
        return jsonify({
            "logs": [{
                "id": log.id,
                "user": log.user_rel.username if log.user_rel else "System",
                "action": log.action,
                "details": log.details,
                "timestamp": log.timestamp.isoformat()
            } for log in logs]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/model/history', methods=['GET'])
@jwt_required()
def get_model_history():
    """Mengambil histori evaluasi pelatihan model AI"""
    try:
        history = ModelEvaluation.query.order_by(ModelEvaluation.timestamp.desc()).all()
        return jsonify({
            "history": [{
                "id": h.id,
                "timestamp": h.timestamp.isoformat(),
                "accuracy": h.accuracy,
                "precision": h.precision,
                "recall": h.recall,
                "f1": h.f1_score,
                "n_samples": h.n_samples,
                "params": {
                    "n_estimators": h.training_params.n_estimators,
                    "max_depth": h.training_params.max_depth,
                    "lstm_units": h.training_params.lstm_units
                } if h.training_params else None
            } for h in history]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/incidents', methods=['GET'])
def get_flood_incidents():
    """Mengambil laporan kejadian banjir lapangan"""
    try:
        incidents = FloodIncident.query.order_by(FloodIncident.date.desc()).all()
        return jsonify({
            "incidents": [{
                "id": inc.id,
                "kelurahan": Kelurahan.query.get(inc.kelurahan_id).nama if Kelurahan.query.get(inc.kelurahan_id) else "Unknown",
                "date": inc.date.isoformat(),
                "depth": inc.depth_cm,
                "description": inc.description,
                "verified": bool(inc.is_verified)
            } for inc in incidents]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Prediksi risiko spatio-temporal.
    
    Body JSON:
    {
        "elevasi": 2.0,
        "jarakSungai": 80,
        "curahHujan": 2791,
        "tataGunaLahan": 1,
        "kualitasDrainase": 2,
        "pengaruhPasang": 9,
        "kepadatanPenduduk": 7500,
        "jenisTanah": 1,
        "month": 6  // bulan (1-12), opsional (default: 1)
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body JSON diperlukan'}), 400
    
    month = data.get('month', 1)
    if month < 1 or month > 12:
        return jsonify({'error': 'Bulan harus antara 1-12'}), 400
    
    # Extract spatial features
    spatial = {}
    for key in FEATURE_KEYS_SPATIAL:
        if key not in data:
            return jsonify({'error': f'Parameter {key} diperlukan'}), 400
        spatial[key] = float(data[key])
    
    result = model.predict_with_month(spatial, month)
    result['month'] = month
    result['monthLabel'] = get_month_label(month)
    
    return jsonify(result)


@app.route('/api/predict/temporal', methods=['POST'])
def predict_temporal():
    """
    Prediksi profil temporal 12 bulan untuk satu set fitur spasial.
    
    Body JSON: 8 fitur spasial (sama seperti /api/predict tanpa month)
    Response: Array 12 prediksi (satu per bulan)
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body JSON diperlukan'}), 400
    
    spatial = {}
    for key in FEATURE_KEYS_SPATIAL:
        if key not in data:
            return jsonify({'error': f'Parameter {key} diperlukan'}), 400
        spatial[key] = float(data[key])
    
    profile = model.predict_temporal_profile(spatial)
    
    # Add month labels
    for item in profile:
        item['monthLabel'] = get_month_label(item['month'])
    
    return jsonify({
        'spatialFeatures': spatial,
        'temporalProfile': profile
    })


@app.route('/api/explain', methods=['POST'])
def explain_prediction():
    """
    Menghitung SHAP values untuk suatu prediksi (Explainable AI).
    
    Body JSON: 8 fitur spasial (sama seperti /api/predict) + month
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body JSON diperlukan'}), 400
        
    month = data.get('month', 1)
    if month < 1 or month > 12:
        return jsonify({'error': 'Bulan harus antara 1-12'}), 400
        
    spatial = {}
    for key in FEATURE_KEYS_SPATIAL:
        if key not in data:
            return jsonify({'error': f'Parameter {key} diperlukan'}), 400
        spatial[key] = float(data[key])
        
    # Gabungkan dengan fitur temporal
    month_idx = month - 1
    features_list = list(spatial.values()) + [
        month,
        CURAH_HUJAN_BULANAN[month_idx],
        TIDAL_DATA['pasangMaks'][month_idx],
        MUSIM_BULANAN[month_idx],
        TIDAL_DATA['pasangTrisakti'][month_idx],
        RIVER_DATA['debitBarito'][month_idx],
        RIVER_DATA['debitMartapura'][month_idx],
        REGIONAL_WEATHER_DATA['curahHujanHulu'][month_idx]
    ]
    
    try:
        explanation = model.explain(features_list)
        return jsonify(explanation)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Offline NLP Chatbot endpoint using local TF-IDF matcher.
    Body JSON: {"prompt": "pertanyaan user"}
    """
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Parameter prompt diperlukan'}), 400
    
    query = data.get('prompt', '')
    try:
        response = chat_backend(query)
        return jsonify({'response': response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/kelurahan', methods=['GET'])
def kelurahan_list():
    """
    Data semua kelurahan dengan profil risiko temporal.
    Query params: month (opsional, 1-12)
    """
    month = request.args.get('month', type=int)
    
    # Try database first
    db_available = get_db_data_available()
    if db_available:
        try:
            kel_list = Kelurahan.query.all()
            result = []
            for k in kel_list:
                k_dict = k.to_dict()
                # Compute temporal risks
                temporal_risks = []
                for m in range(1, 13):
                    risk = compute_temporal_risk(
                        k.base_risk_level, m,
                        k.elevasi, k.pengaruh_pasang, k.kualitas_drainase
                    )
                    temporal_risks.append(risk)
                k_dict['temporalRisks'] = temporal_risks
                result.append(k_dict)
        except Exception:
            result = get_all_kelurahan_temporal()
    else:
        result = get_all_kelurahan_temporal()
    
    # Jika bulan spesifik diminta, tambahkan risiko aktif
    if month and 1 <= month <= 12:
        for kel in result:
            kel['activeRisk'] = kel['temporalRisks'][month - 1]
            kel['activeMonth'] = month
            kel['activeMonthLabel'] = get_month_label(month)
    
    return jsonify({
        'kelurahan': result,
        'total': len(result),
        'month': month,
        'monthLabel': get_month_label(month) if month else None,
        'source': 'database' if db_available else 'fallback'
    })


@app.route('/api/kelurahan/<int:kel_id>/temporal', methods=['GET'])
def kelurahan_temporal(kel_id):
    """Profil temporal satu kelurahan"""
    # Try database first
    db_available = get_db_data_available()
    kel = None
    if db_available:
        try:
            db_kel = Kelurahan.query.get(kel_id)
            if db_kel:
                kel = db_kel.to_dict()
        except Exception:
            kel = get_kelurahan_by_id(kel_id)
    else:
        kel = get_kelurahan_by_id(kel_id)

    if not kel:
        return jsonify({'error': f'Kelurahan dengan ID {kel_id} tidak ditemukan'}), 404
    
    spatial = {k: kel[k] for k in FEATURE_KEYS_SPATIAL}
    profile = model.predict_temporal_profile(spatial)
    
    for item in profile:
        item['monthLabel'] = get_month_label(item['month'])
    
    # Tidal and Rainfall data from DB if possible
    t_data = TIDAL_DATA
    r_monthly = CURAH_HUJAN_BULANAN
    if db_available:
        try:
            db_tide = TidalData.query.order_by(TidalData.month).all()
            if db_tide:
                t_data = {
                    'pasangMaks': [t.pasang_maks for t in db_tide],
                    'pasangRata': [t.pasang_rata for t in db_tide],
                    'kejadianBanjir': [t.kejadian_banjir for t in db_tide]
                }
        except Exception:
            pass

    return jsonify({
        'id': kel['id'],
        'nama': kel['nama'],
        'kecamatan': kel['kecamatan'],
        'lat': kel.get('lat', 0), # Lat/Lng from DBgeom would be better but keeping simple for now
        'lng': kel.get('lng', 0),
        'penduduk': kel['penduduk'],
        'baseRisk': kel['riskLevel'],
        'spatial': spatial,
        'temporalProfile': profile,
        'tidalData': t_data,
        'rainfallData': r_monthly,
        'source': 'database' if db_available else 'fallback'
    })


@app.route('/api/stats', methods=['GET'])
def stats():
    """
    Statistik agregat. Query params: month (opsional, 1-12)
    """
    month = request.args.get('month', type=int)
    if month and (month < 1 or month > 12):
        return jsonify({'error': 'Bulan harus antara 1-12'}), 400
    
    db_available = get_db_data_available()
    t_data = TIDAL_DATA
    r_monthly = CURAH_HUJAN_BULANAN
    r_2024 = CURAH_HUJAN_2024
    r_2023 = CURAH_HUJAN_2023

    if db_available:
        try:
            db_tide = TidalData.query.order_by(TidalData.month).all()
            if db_tide:
                t_data = {
                    'pasangMaks': [t.pasang_maks for t in db_tide],
                    'pasangRata': [t.pasang_rata for t in db_tide],
                    'kejadianBanjir': [t.kejadian_banjir for t in db_tide]
                }
            
            # Fetch all rainfall data ordered by month
            db_rain = RainfallData.query.order_by(RainfallData.year, RainfallData.month).all()
            if db_rain:
                r_2024 = [r.rainfall for r in db_rain if r.year == 2024]
                r_2023 = [r.rainfall for r in db_rain if r.year == 2023]
                
                # Robust average calculation (handle missing years/data)
                r_monthly = []
                for i in range(12):
                    vals = []
                    if i < len(r_2024): vals.append(r_2024[i])
                    if i < len(r_2023): vals.append(r_2023[i])
                    
                    if vals:
                        r_monthly.append(sum(vals) / len(vals))
                    else:
                        r_monthly.append(CURAH_HUJAN_BULANAN[i]) # Global fallback
        except Exception as e:
            print(f"[BARITO] Error fetching stats data: {e}")
            pass

    result = get_stats_by_month(month)
    result['tidalData'] = t_data
    result['rainfallMonthly'] = r_monthly
    result['rainfall2024'] = r_2024
    result['rainfall2023'] = r_2023
    result['source'] = 'database' if db_available else 'fallback'
    
    return jsonify(result)


@app.route('/api/evaluation', methods=['GET'])
def evaluation():
    """Evaluasi lengkap model: confusion matrix, classification report, feature importance"""
    return jsonify(model.get_evaluation())


@app.route('/api/temporal/heatmap', methods=['GET'])
def temporal_heatmap():
    """
    Data heatmap temporal: distribusi risiko per bulan untuk semua kelurahan.
    Response: matrix [12 bulan × 4 level risiko] counts
    """
    heatmap = []
    for month in range(1, 13):
        month_stats = get_stats_by_month(month)
        heatmap.append({
            'month': month,
            'monthLabel': get_month_label(month),
            'riskCounts': month_stats['riskCounts'],
            'tidalMax': TIDAL_DATA['pasangMaks'][month - 1],
            'rainfall': CURAH_HUJAN_BULANAN[month - 1],
            'floodEvents': TIDAL_DATA['kejadianBanjir'][month - 1]
        })
    
    return jsonify({
        'heatmap': heatmap,
        'totalKelurahan': len(KELURAHAN_DATA)
    })


@app.route('/api/temporal/compare', methods=['GET'])
def temporal_compare():
    """
    Perbandingan risiko antara 2 bulan.
    Query params: month1, month2
    """
    month1 = request.args.get('month1', type=int, default=8)  # Agustus (kemarau)
    month2 = request.args.get('month2', type=int, default=12) # Desember (puncak)
    
    if not (1 <= month1 <= 12 and 1 <= month2 <= 12):
        return jsonify({'error': 'Bulan harus antara 1-12'}), 400
    
    comparison = []
    for kel in KELURAHAN_DATA:
        spatial = {k: kel[k] for k in FEATURE_KEYS_SPATIAL}
        r1 = model.predict_with_month(spatial, month1)
        r2 = model.predict_with_month(spatial, month2)
        
        comparison.append({
            'id': kel['id'],
            'nama': kel['nama'],
            'kecamatan': kel['kecamatan'],
            'month1Risk': r1['prediction'],
            'month1Label': r1['label'],
            'month2Risk': r2['prediction'],
            'month2Label': r2['label'],
            'riskChange': r2['prediction'] - r1['prediction']
        })
    
    # Sort by risk change (descending)
    comparison.sort(key=lambda x: x['riskChange'], reverse=True)
    
    stats1 = get_stats_by_month(month1)
    stats2 = get_stats_by_month(month2)
    
    return jsonify({
        'month1': {'month': month1, 'label': get_month_label(month1), 'stats': stats1},
        'month2': {'month': month2, 'label': get_month_label(month2), 'stats': stats2},
        'comparison': comparison,
        'increased': len([c for c in comparison if c['riskChange'] > 0]),
        'decreased': len([c for c in comparison if c['riskChange'] < 0]),
        'unchanged': len([c for c in comparison if c['riskChange'] == 0])
    })


if __name__ == '__main__':
    print("-" * 30)
    print(" BARITO Backend Running...")
    print(f" Akurasi Model: {model.accuracy:.4f}")
    print("-" * 30)
    app.run(debug=True, host='0.0.0.0', port=5000)
