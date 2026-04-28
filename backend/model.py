# pyre-ignore-all-errors
# ========================================================================
# model.py - Spatio-Temporal Hybrid RF-LSTM Model
# ========================================================================

import typing
import numpy as np
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' # Suppress TF warnings
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model # type: ignore
from tensorflow.keras.layers import LSTM, Dense, Input, Bidirectional, Dropout # type: ignore

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import (
    confusion_matrix, classification_report,
    accuracy_score, precision_score, recall_score, f1_score
)
from data import (
    generate_spatiotemporal_dataset, FEATURE_KEYS_ALL,
    FEATURE_KEYS_SPATIAL, FEATURE_KEYS_TEMPORAL,
    RISK_LABELS, KELURAHAN_DATA, TIDAL_DATA,
    CURAH_HUJAN_BULANAN, MUSIM_BULANAN, RIVER_DATA, REGIONAL_WEATHER_DATA
)

class HybridRFLSTM:
    """
    Model Hybrid Random Forest & LSTM untuk prediksi risiko banjir rob spatio-temporal.
    
    Logika Arsitektur Hibrida:
    1. LSTM mengolah 8 fitur temporal sebagai representasi tersembunyi (temporal embed).
    2. Random Forest menerima 8 fitur spasial DITAMBAH hasil embedding LSTM.
    3. Random Forest menghasilkan prediksi kelas risiko final (1-4).
    """
    
    def __init__(self, n_estimators=100, max_depth=8, lstm_units=16, random_state=42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.lstm_units = lstm_units
        self.random_state = random_state
        self.rf_model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=3,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=random_state,
            class_weight='balanced',
            n_jobs=-1
        )
        import typing
        self.lstm_fe: typing.Any = None
        self.lstm_classifier: typing.Any = None
        self.is_trained: bool = False
        self.accuracy: float = 0.0
        self.cv_scores: typing.Any = []
        self.feature_importances: typing.Dict[str, float] = {}
        self.X_train: typing.Any = []
        self.y_train: typing.Any = []
        self.metadata: typing.Any = []
        
    def _build_lstm(self):
        """Membangun arsitektur LSTM untuk penarikan fitur temporal."""
        inputs = Input(shape=(3, 8)) # 3 timestep (lookback window), 8 fitur temporal
        x = Bidirectional(LSTM(self.lstm_units, activation='relu', return_sequences=False))(inputs)
        x = Dropout(0.2)(x)
        embedding_layer = Dense(8, activation='relu', name='temporal_embedding')(x) 
        self.lstm_fe = Model(inputs=inputs, outputs=embedding_layer)
        
        outputs = Dense(4, activation='softmax')(embedding_layer)
        self.lstm_classifier = Model(inputs=inputs, outputs=outputs)
        self.lstm_classifier.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
    def _extract_hybrid_features(self, X_spatial, X_temporal):
        X_temp_reshape = X_temporal.reshape(-1, 3, 8)
        temporal_embeddings = self.lstm_fe.predict(X_temp_reshape, verbose=0)
        return np.hstack([X_spatial, temporal_embeddings])

    def train(self):
        X_spatial, X_temporal, y, metadata = generate_spatiotemporal_dataset()
        
        y_keras = y - 1 # 0-3
        
        X_spat_train, X_spat_test, X_temp_train, X_temp_test, y_train, y_test = train_test_split(
            X_spatial, X_temporal, y,
            test_size=0.2,      
            random_state=42,
            stratify=y          
        )
        y_keras_train = y_train - 1
        
        self.X_train = np.hstack([X_spatial, X_temporal.reshape(-1, 24)]) # flatten for reference 
        self.y_train = y_train
        self.metadata = metadata
        
        print("[BARITO] Sedang melatih komponen Bidirectional LSTM Feature Extractor (3-Month Sequence)...")
        self._build_lstm()
        X_temp_train_reshape = X_temp_train.reshape(-1, 3, 8)
        self.lstm_classifier.fit(X_temp_train_reshape, y_keras_train, epochs=40, batch_size=32, verbose=0)
        
        X_hybrid_train = self._extract_hybrid_features(X_spat_train, X_temp_train)
        X_hybrid_test = self._extract_hybrid_features(X_spat_test, X_temp_test)
        
        print("[BARITO] Sedang melatih Random Forest pada fitur Hybrid (Spatial + LSTM Embedding)...")
        self.rf_model.fit(X_hybrid_train, y_train)
        self.is_trained = True
        
        self.accuracy = accuracy_score(y_test, self.rf_model.predict(X_hybrid_test))
        
        # Cross validation scores
        X_hybrid_all = self._extract_hybrid_features(X_spatial, X_temporal)
        self.cv_scores = cross_val_score(self.rf_model, X_hybrid_all, y, cv=5, scoring='accuracy')
        
        hybrid_feature_names = FEATURE_KEYS_SPATIAL + [f"LSTM_Embed_{i}" for i in range(8)]
        self.feature_importances = dict(
            zip(hybrid_feature_names, self.rf_model.feature_importances_.tolist())
        )
        
        # -- Log to Database --
        try:
            from database import db_session, ModelEvaluation, ModelTrainingParam
            
            # Calculate full metrics
            y_pred = self.rf_model.predict(X_hybrid_test)
            acc = accuracy_score(y_test, y_pred)
            prec = precision_score(y_test, y_pred, average='weighted')
            rec = recall_score(y_test, y_pred, average='weighted')
            f1 = f1_score(y_test, y_pred, average='weighted')
            
            session = db_session()
            new_eval = ModelEvaluation(
                accuracy=float(acc),
                precision=float(prec),
                recall=float(rec),
                f1_score=float(f1),
                n_samples=len(X_spatial)
            )
            session.add(new_eval)
            session.flush() # Get ID
            
            new_params = ModelTrainingParam(
                evaluation_id=new_eval.id,
                n_estimators=self.n_estimators,
                max_depth=self.max_depth,
                lstm_units=self.lstm_units,
                random_state=self.random_state
            )
            session.add(new_params)
            session.commit()
            print(f"[BARITO] Evaluasi Model berhasil dicatat ke Database (ID: {new_eval.id}, Accuracy: {acc:.4f})")
        except Exception as db_err:
            print(f"[BARITO] Gagal mencatat evaluasi ke database: {db_err}")

        return {
            'accuracy': self.accuracy,
            'cv_mean': float(self.cv_scores.mean()),
            'cv_std': float(self.cv_scores.std()),
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'lstm_units': self.lstm_units,
            'n_samples_train': len(X_spat_train),
            'n_samples_test': len(X_spat_test),
            'n_features_spatial': 8,
            'n_features_temporal_raw': 24, # 3*8
            'n_features_hybrid_total': 16, # 8 + 8 embedding
            'feature_importances': self.feature_importances,
            'feature_names': hybrid_feature_names
        }

    
    def predict(self, features):
        if not self.is_trained:
            raise RuntimeError("Model belum dilatih. Panggil train() terlebih dahulu.")
        
        feature_vector = list(features) if not isinstance(features, dict) else [features.get(k, 0) for k in FEATURE_KEYS_ALL]
        
        # Jaminan kelengkapan fallback (jika dipanggil statis dengan spasial saja)
        if len(feature_vector) == 8:
            seq = []
            for step in range(3):
                m_idx = (0 - 2 + step) % 12
                seq.extend([
                    m_idx + 1, CURAH_HUJAN_BULANAN[m_idx], TIDAL_DATA['pasangMaks'][m_idx], MUSIM_BULANAN[m_idx],
                    TIDAL_DATA['pasangTrisakti'][m_idx], RIVER_DATA['debitBarito'][m_idx], 
                    RIVER_DATA['debitMartapura'][m_idx], REGIONAL_WEATHER_DATA['curahHujanHulu'][m_idx]
                ])
            feature_vector.extend(seq)
            
        feat_arr = np.array([feature_vector], dtype=np.float32)
        X_spat = feat_arr[:, :8]
        X_temp = feat_arr[:, 8:] # 24 temporal features
        
        X_hybrid = self._extract_hybrid_features(X_spat, X_temp)
        
        prediction = int(self.rf_model.predict(X_hybrid)[0])
        probabilities = self.rf_model.predict_proba(X_hybrid)[0]
        
        proba_dict = {}
        for i, cls in enumerate(self.rf_model.classes_):
            proba_dict[int(cls)] = float(probabilities[i])
            
        return {
            'prediction': prediction,
            'label': RISK_LABELS.get(prediction, 'Unknown'),
            'probabilities': proba_dict
        }

    def predict_with_month(self, spatial_features, month):
        month_idx = month - 1
        if isinstance(spatial_features, dict):
            spatial = [spatial_features.get(k, 0) for k in FEATURE_KEYS_SPATIAL]
        else:
            sf_list = list(spatial_features) # type: ignore
            spatial = [sf_list[i] for i in range(min(8, len(sf_list)))] # type: ignore
        
        temporal_seq = []
        for step in range(3):
            m_idx = (month_idx - 2 + step) % 12
            temporal_seq.extend([
                m_idx + 1,
                CURAH_HUJAN_BULANAN[m_idx],
                TIDAL_DATA['pasangMaks'][m_idx],
                MUSIM_BULANAN[m_idx],
                TIDAL_DATA['pasangTrisakti'][m_idx],
                RIVER_DATA['debitBarito'][m_idx],
                RIVER_DATA['debitMartapura'][m_idx],
                REGIONAL_WEATHER_DATA['curahHujanHulu'][m_idx]
            ])
        
        return self.predict(spatial + temporal_seq)
        
    def explain(self, features):
        if not self.is_trained:
            raise RuntimeError("Model belum dilatih.")
            
        import shap # type: ignore
        
        if isinstance(features, dict):
            feature_vector = [float(features.get(k, 0)) for k in FEATURE_KEYS_ALL]
        else:
            feature_vector = [float(f) for f in features]
        
        if len(feature_vector) == 8:
            seq = []
            for step in range(3):
                m_idx = (0 - 2 + step) % 12
                seq.extend([
                    m_idx + 1, CURAH_HUJAN_BULANAN[m_idx], TIDAL_DATA['pasangMaks'][m_idx], MUSIM_BULANAN[m_idx],
                    TIDAL_DATA['pasangTrisakti'][m_idx], RIVER_DATA['debitBarito'][m_idx], 
                    RIVER_DATA['debitMartapura'][m_idx], REGIONAL_WEATHER_DATA['curahHujanHulu'][m_idx]
                ])
            feature_vector.extend(seq)
            
        feat_arr = np.array([feature_vector], dtype=np.float32)
        X_spat = feat_arr[:, :8]
        X_temp = feat_arr[:, 8:]
        X_hybrid = self._extract_hybrid_features(X_spat, X_temp)
        hybrid_feature_names = FEATURE_KEYS_SPATIAL + [f"LSTM_Embed_{i}" for i in range(8)]
        
        if not hasattr(self, 'explainer'):
            self.explainer = shap.TreeExplainer(self.rf_model)
            
        shap_values = self.explainer.shap_values(X_hybrid)
        
        prediction = int(self.rf_model.predict(X_hybrid)[0])
        classes_list = list(self.rf_model.classes_)
        class_idx = classes_list.index(prediction) if prediction in classes_list else 0
        
        if isinstance(shap_values, list):
            instance_shap = shap_values[class_idx][0]
        else:
            if len(shap_values.shape) == 3:
                instance_shap = shap_values[0, :, class_idx]
            else:
                instance_shap = shap_values[0]
            
        if isinstance(self.explainer.expected_value, list) or isinstance(self.explainer.expected_value, np.ndarray):
            base_value = float(self.explainer.expected_value[class_idx])
        else:
            base_value = float(self.explainer.expected_value)
            
        breakdown = []
        for i, feat_name in enumerate(hybrid_feature_names):
            breakdown.append({
                'feature': feat_name,
                'value': float(X_hybrid[0][i]),
                'shap_value': float(instance_shap[i]),
                'impact': 'positive' if instance_shap[i] > 0 else 'negative'
            })
            
        breakdown.sort(key=lambda x: abs(x['shap_value']), reverse=True)
        
        return {
            'prediction': prediction,
            'label': RISK_LABELS.get(prediction, 'Unknown'),
            'base_value': base_value,
            'shap_values': breakdown
        }
    
    def predict_temporal_profile(self, spatial_features):
        if isinstance(spatial_features, dict):
            spatial = [spatial_features.get(k, 0) for k in FEATURE_KEYS_SPATIAL]
        else:
            sf_list = list(spatial_features) # type: ignore
            spatial = sf_list[:8]
        
        profile = []
        for month in range(1, 13):
            result = self.predict_with_month(spatial, month)
            result['month'] = month
            profile.append(result)
        
        return profile
    
    def get_evaluation(self) -> typing.Dict[str, typing.Any]:
        if not self.is_trained:
            raise RuntimeError("Model belum dilatih.")
        
        X_spat, X_temp, y, _ = generate_spatiotemporal_dataset()
        X_hyb_all = self._extract_hybrid_features(X_spat, X_temp)
        y_pred_all = self.rf_model.predict(X_hyb_all)
        
        classes = sorted(list(set(y)))
        class_labels = [RISK_LABELS.get(c, str(c)) for c in classes]
        
        cm = confusion_matrix(y, y_pred_all, labels=classes)
        report = classification_report(y, y_pred_all, labels=classes, target_names=class_labels, output_dict=True)
        
        per_class = {}
        for cls in classes:
            cls_key = RISK_LABELS.get(cls, str(cls))
            if cls_key in report:
                per_class[cls] = {
                    'label': cls_key,
                    'precision': report[cls_key]['precision'],
                    'recall': report[cls_key]['recall'],
                    'f1': report[cls_key]['f1-score'],
                    'support': report[cls_key]['support']
                }
        
        hybrid_feature_names = FEATURE_KEYS_SPATIAL + [f"LSTM_Embed_{i}" for i in range(8)]
        
        return {
            'accuracy': self.accuracy,
            'cv_mean': float(self.cv_scores.mean()),
            'cv_std': float(self.cv_scores.std()),
            'confusion_matrix': cm.tolist(),
            'class_labels': class_labels,
            'per_class': per_class,
            'feature_importances': self.feature_importances,
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'n_samples': int(np.size(y)),
            'n_features': 16,
            'feature_names': hybrid_feature_names
        }
    
    def get_model_info(self) -> typing.Dict[str, typing.Any]:
        if not self.is_trained:
            return {'status': 'not_trained'}
        
        return {
            'status': 'trained',
            'algorithm': 'Hybrid Random Forest & LSTM (scikit-learn + TensorFlow)',
            'accuracy': self.accuracy,
            'cv_accuracy': f"{self.cv_scores.mean():.4f} ± {self.cv_scores.std():.4f}",
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'lstm_units': self.lstm_units,
            'n_samples': 7488, # 52 * 12 * 12 tahun (2015-2026)
            'n_features_hybrid': 16,
            'spatial_features': FEATURE_KEYS_SPATIAL,
            'feature_importances': self.feature_importances
        }

# Singleton instance
_model_instance = None

def get_model():
    global _model_instance
    if _model_instance is None:
        _model_instance = HybridRFLSTM(
            n_estimators=100,
            max_depth=8,
            lstm_units=16,
            random_state=42
        )
        print("[BARITO] Training Hybrid RF-LSTM Model...")
        result = _model_instance.train()
        
        print(f"[BARITO] Model trained! Accuracy: {result['accuracy']:.4f}, "
              f"CV: {result['cv_mean']:.4f} ± {result['cv_std']:.4f}")
        print(f"[BARITO] Dataset: {result['n_samples_train']} latih, {result['n_samples_test']} uji, Hybrid {result['n_features_hybrid_total']} fitur")
    return _model_instance
