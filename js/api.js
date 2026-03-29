// ========================================================================
// api.js - API Client untuk Python Backend BARITO
// ========================================================================

const API_CONFIG = {
    baseUrl: 'http://localhost:5000',
    timeout: 10000
};

// State global dari backend
let backendConnected = false;
let modelInfo = null;
let temporalHeatmap = null;
let allKelurahanTemporal = null;

// Auth State
let authToken = localStorage.getItem('barito_token') || null;
let adminMode = !!authToken;

// ─── Core API Call ───
async function apiCall(endpoint, options = {}) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutDuration = options.timeout || API_CONFIG.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    // Tambahkan token jika ada (untuk admin)
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: headers
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Request timeout - backend tidak merespons');
        }
        throw err;
    }
}

// ─── API Methods ───

async function apiLogin(username, password) {
    try {
        const data = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        authToken = data.access_token;
        localStorage.setItem('barito_token', authToken);
        adminMode = true;
        return data;
    } catch (e) {
        throw e;
    }
}

function apiLogout() {
    authToken = null;
    localStorage.removeItem('barito_token');
    adminMode = false;
}

async function apiUpdateKelurahan(updateData) {
    return await apiCall('/api/admin/kelurahan/update', {
        method: 'POST',
        body: JSON.stringify(updateData)
    });
}

async function apiUpdateClimate(climateData) {
    return await apiCall('/api/admin/climate/update', {
        method: 'POST',
        body: JSON.stringify(climateData)
    });
}

async function apiRetrainModel() {
    return await apiCall('/api/admin/model/retrain', {
        method: 'POST',
        timeout: 120000 // 2 minutes for model training
    });
}

async function apiSyncLiveData() {
    return await apiCall('/api/admin/system/sync', {
        method: 'POST',
        timeout: 120000 // External API fetch + Model Retrain
    });
}


async function apiHealthCheck() {
    try {
        const data = await apiCall('/api/health');
        backendConnected = true;
        return data;
    } catch (e) {
        backendConnected = false;
        throw e;
    }
}

async function apiGetModelInfo() {
    const data = await apiCall('/api/model');
    modelInfo = data;
    return data;
}

async function apiGetIntelligence() {
    return await apiCall('/api/intelligence');
}

async function apiPredict(spatialFeatures, month) {
    return await apiCall('/api/predict', {
        method: 'POST',
        body: JSON.stringify({ ...spatialFeatures, month })
    });
}

async function apiPredictTemporal(spatialFeatures) {
    return await apiCall('/api/predict/temporal', {
        method: 'POST',
        body: JSON.stringify(spatialFeatures)
    });
}

async function apiGetKelurahan(month) {
    const query = month ? `?month=${month}` : '';
    const data = await apiCall(`/api/kelurahan${query}`);
    allKelurahanTemporal = data.kelurahan;
    return data;
}

async function apiGetKelurahanTemporal(kelId) {
    return await apiCall(`/api/kelurahan/${kelId}/temporal`);
}

async function apiGetStats(month) {
    const query = month ? `?month=${month}` : '';
    return await apiCall(`/api/stats${query}`);
}

async function apiGetEvaluation() {
    return await apiCall('/api/evaluation');
}

async function apiGetTemporalHeatmap() {
    const data = await apiCall('/api/temporal/heatmap');
    temporalHeatmap = data;
    return data;
}

async function apiCompareTemporal(month1, month2) {
    return await apiCall(`/api/temporal/compare?month1=${month1}&month2=${month2}`);
}

// ─── Initialize Backend Connection ───
async function initBackendConnection() {
    try {
        await apiHealthCheck();
        const info = await apiGetModelInfo();
        console.log('[BARITO] Backend connected!', info);
        return true;
    } catch (e) {
        console.warn('[BARITO] Backend not available, using local mode:', e.message);
        backendConnected = false;
        return false;
    }
}
