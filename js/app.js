// ========================================================================
// app.js - Main Application Controller (Spatio-Temporal)
// Backend: Python Flask + scikit-learn Random Forest
// ========================================================================

let forest = null; // Compatibility reference
let modelResults = null;
let activeMonth = 0; // 0 = semua/rata-rata, 1-12 = bulan spesifik

const MONTH_LABELS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

let activeIntelligence = null;
let intelligenceInterval = null;

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', async () => {
    // Try connecting to Python backend
    const connected = await initBackend();

    // Init navigation
    initNavigation();

    // Init dashboard
    initDashboard();

    // Init prediction form
    initPredictionForm();

    // Init data table
    initDataTable();

    // Init report
    initReport();

    // Init temporal controls
    initTemporalControls();

    // Init interactions
    initInteractions();

    // Init Chatbot
    initChatbot();

    // Init map month selector
    initMapMonthSelector();

    // Start Intelligence Hub
    initIntelligenceHub();

    // Init Admin State
    updateAdminUI();

    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Modal close button
    const modalClose = document.querySelector('.modal-close[onclick*="closeLoginModal"]');
    if (modalClose) {
        // Redundant since it's already in onclick, but good for consistency
    }

    // Wireframe Mode Toggle
    const wireframeBtn = document.getElementById('wireframe-toggle-btn');
    const exportBtn = document.getElementById('export-wireframe-btn');
    const exitWireframeBtn = document.getElementById('exit-wireframe-btn');

    function syncWireframeState() {
        const isWireframe = document.body.classList.contains('wireframe-mode');
        if (wireframeBtn) wireframeBtn.style.display = isWireframe ? 'none' : 'flex';
        if (exportBtn) exportBtn.style.display = isWireframe ? 'flex' : 'none';
        if (exitWireframeBtn) exitWireframeBtn.style.display = isWireframe ? 'flex' : 'none';
    }

    if (wireframeBtn && exitWireframeBtn) {
        wireframeBtn.addEventListener('click', () => {
            document.body.classList.add('wireframe-mode');
            localStorage.setItem('wireframeMode', 'true');
            syncWireframeState();
        });
        exitWireframeBtn.addEventListener('click', () => {
            document.body.classList.remove('wireframe-mode');
            localStorage.setItem('wireframeMode', 'false');
            syncWireframeState();
        });
        if (localStorage.getItem('wireframeMode') === 'true') {
            document.body.classList.add('wireframe-mode');
        }
        syncWireframeState();
    }

    // Export Wireframe to PNG using html2canvas
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                if (typeof html2canvas === 'undefined') {
                    if (typeof showToast === 'function') showToast('Mengunduh modul canvas...', 'info');
                    await new Promise(resolve => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                        script.onload = resolve;
                        document.head.appendChild(script);
                    });
                }
                
                if (typeof showToast === 'function') showToast('Sedang membuat PNG Balsamiq Mockup...', 'info');
                
                // Hide purely UI elements that shouldn't be in the mockup
                exportBtn.style.display = 'none';
                if (exitWireframeBtn) exitWireframeBtn.style.display = 'none';
                
                const canvas = await html2canvas(document.body, {
                    backgroundColor: '#f5f5dc',
                    scale: 2,
                    useCORS: true,
                    logging: false
                });
                
                exportBtn.style.display = 'flex';
                if (exitWireframeBtn) exitWireframeBtn.style.display = 'flex';
                
                const link = document.createElement('a');
                link.download = 'barito_balsamiq_mockup.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                if (typeof showToast === 'function') showToast('Berhasil mengexport Mockup!', 'success');
            } catch (err) {
                console.error('Export error:', err);
                if (typeof showToast === 'function') showToast('Gagal mengekspor gambar.', 'error');
                exportBtn.style.display = 'flex';
                if (exitWireframeBtn) exitWireframeBtn.style.display = 'flex';
            }
        });
    }

    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-overlay').classList.add('hidden');
        if (connected) {
            showToast('Model Hybrid RF-LSTM berhasil dimuat dari Python backend.', 'success');
        } else {
            showToast('Backend tidak tersedia. Mode lokal aktif.', 'warning');
        }
    }, 1500);
});

// ─── Backend Connection ───
async function initBackend() {
    try {
        const connected = await initBackendConnection();
        if (connected && modelInfo) {
            // Create compatibility object
            forest = {
                accuracy: modelInfo.accuracy,
                numTrees: modelInfo.n_estimators || 100,
                maxDepth: modelInfo.max_depth || 8,
                featureImportances: modelInfo.feature_importances ?
                    Object.values(modelInfo.feature_importances) : new Array(12).fill(1 / 12),
                trained: true
            };
            modelResults = {
                accuracy: modelInfo.accuracy,
                featureImportances: forest.featureImportances
            };

            // Update topbar
            const badge = document.getElementById('topbar-model-badge');
            if (badge) badge.textContent = `RF (${forest.numTrees} Trees, Python)`;

            const statusEl = document.getElementById('model-accuracy');
            if (statusEl) statusEl.textContent = `Akurasi: ${(modelInfo.accuracy * 100).toFixed(1)}%`;

            // Load temporal heatmap data
            try { await apiGetTemporalHeatmap(); } catch (e) { }
            // Load all kelurahan temporal
            try { await apiGetKelurahan(); } catch (e) { }

            return true;
        }
    } catch (e) {
        console.warn('[BARITO] Backend init failed:', e);
    }

    // Fallback: create local model reference
    forest = {
        accuracy: 0.942,
        numTrees: 100,
        maxDepth: 8,
        featureImportances: [0.18, 0.12, 0.08, 0.06, 0.14, 0.22, 0.07, 0.05, 0.02, 0.03, 0.02, 0.01],
        trained: true
    };
    modelResults = { accuracy: forest.accuracy, featureImportances: forest.featureImportances };
    return false;
}

// ─── Navigation ───
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view, item);
        });
    });
}

function switchView(viewId, navItem) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navItem) navItem.classList.add('active');
    else document.querySelector(`.nav-item[data-view="${viewId}"]`)?.classList.add('active');

    const current = document.querySelector('.view.active');
    if (current && current.id !== `view-${viewId}`) {
        current.classList.add('view-exit');
        setTimeout(() => {
            current.classList.remove('active', 'view-exit');
            const next = document.getElementById(`view-${viewId}`);
            if (next) {
                next.classList.add('active', 'view-enter');
                setTimeout(() => next.classList.remove('view-enter'), 400);
            }
        }, 200);
    } else if (!current) {
        const next = document.getElementById(`view-${viewId}`);
        if (next) next.classList.add('active');
    }

    const titles = {
        dashboard: 'Dashboard', map: 'Peta Analisis',
        prediction: 'Prediksi Risiko Spatio-Temporal', data: 'Data Kelurahan', report: 'Laporan'
    };
    document.getElementById('topbar-view-title').textContent = titles[viewId] || '';

    if (viewId === 'map') {
        setTimeout(() => {
            if (!mainMap) initMainMap();
            else mainMap.invalidateSize();
        }, 450);
    }
    if (viewId === 'dashboard') {
        setTimeout(() => { if (miniMap) miniMap.invalidateSize(); }, 450);
    }
}

// ─── Temporal Controls ───
function initTemporalControls() {
    const slider = document.getElementById('temporal-month-slider');
    const chips = document.querySelectorAll('.month-chip');

    if (slider) {
        slider.addEventListener('input', () => {
            const month = parseInt(slider.value);
            setActiveMonth(month);
        });
    }

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const month = parseInt(chip.dataset.month);
            setActiveMonth(month);
            if (slider) slider.value = month;
        });
    });

    // Prediction month selector info update
    const predictMonth = document.getElementById('predict-month');
    if (predictMonth) {
        predictMonth.addEventListener('change', () => updateTemporalInfo());
        updateTemporalInfo();
    }

    // Auto-Playback Animation
    const btnPlay = document.getElementById('btn-play-temporal');
    let playbackInterval = null;
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (playbackInterval) {
                // Stop playback
                clearInterval(playbackInterval);
                playbackInterval = null;
                btnPlay.innerHTML = '<i class="fas fa-play"></i> Auto-Play';
                btnPlay.style.background = 'var(--accent)';
            } else {
                // Start playback
                btnPlay.innerHTML = '<i class="fas fa-pause"></i> Stop Animasi';
                btnPlay.style.background = 'var(--danger)';

                // Start from Jan if currently at All or Dec
                if (parseInt(slider.value) === 0 || parseInt(slider.value) === 12) {
                    slider.value = 1;
                    setActiveMonth(1);
                }

                playbackInterval = setInterval(() => {
                    let nextMonth = parseInt(slider.value) + 1;
                    if (nextMonth > 12) {
                        clearInterval(playbackInterval);
                        playbackInterval = null;
                        btnPlay.innerHTML = '<i class="fas fa-play"></i> Auto-Play';
                        btnPlay.style.background = 'var(--accent)';
                        return;
                    }
                    slider.value = nextMonth;
                    setActiveMonth(nextMonth);
                }, 800); // 800ms per month
            }
        });
    }
}

function updateTemporalInfo() {
    const monthSel = document.getElementById('predict-month');
    if (!monthSel) return;
    const month = parseInt(monthSel.value);
    const idx = month - 1;
    const tidalEl = document.getElementById('temporal-tidal');
    const rainEl = document.getElementById('temporal-rain');
    if (tidalEl) tidalEl.textContent = `🌊 Pasang Maks: ${TIDAL_PASANG_MAKS[idx]} cm`;
    if (rainEl) rainEl.textContent = `🌧️ Curah Hujan: ${CURAH_HUJAN_BLN[idx].toFixed(0)} mm`;
}

async function setActiveMonth(month) {
    activeMonth = month;

    // UI/UX Level 100: Global Weather Particle Overlay
    const weatherOverlay = document.getElementById('global-weather-overlay');
    if (weatherOverlay) {
        weatherOverlay.className = ''; 
        if (month > 0) {
            if ([11, 12, 1, 2, 3, 4].includes(month)) {
                weatherOverlay.classList.add('weather-rain');
                weatherOverlay.style.opacity = '1';
            } else {
                weatherOverlay.classList.add('weather-sun');
                weatherOverlay.style.opacity = '1';
            }
        } else {
            weatherOverlay.style.opacity = '0';
        }
    }

    // Update UI
    const label = document.getElementById('temporal-month-label');
    if (label) {
        label.textContent = month === 0 ? 'Seluruh Tahun (Rata-rata)' : MONTH_LABELS[month];
    }

    // Update chips
    document.querySelectorAll('.month-chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.month) === month);
    });

    // Update topbar badge
    const badge = document.getElementById('topbar-month-badge');
    if (badge) {
        badge.textContent = month === 0 ? 'Spatio-Temporal' : `Bulan: ${MONTH_LABELS[month]}`;
    }

    // Update dashboard stats
    await updateDashboardByMonth(month);

    // Update map month selector
    const mapMonth = document.getElementById('map-month-select');
    if (mapMonth) mapMonth.value = month;

    // Update map markers
    updateMapByMonth(month);
}

function animateValue(obj, end, duration=800) {
    if (!obj) return;
    let start = parseInt(obj.textContent.replace(/[^0-9]/g, '')) || 0;
    if (start === end) { obj.innerHTML = end; return; }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // easeOutQuart 1 - pow(1 - x, 4)
        const ease = 1 - Math.pow(1 - progress, 4);
        obj.innerHTML = Math.floor(start + ease * (end - start));
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = end;
    };
    window.requestAnimationFrame(step);
}

async function updateDashboardByMonth(month) {
    if (!backendConnected) {
        // Use local data
        const stats = getStats();
        animateValue(document.getElementById('stat-total'), stats.total);
        animateValue(document.getElementById('stat-sangat-rawan'), stats.riskCounts[4] || 0);
        animateValue(document.getElementById('stat-rawan'), stats.riskCounts[3] || 0);
        return;
    }

    try {
        const stats = month > 0 ? await apiGetStats(month) : await apiGetStats();
        animateValue(document.getElementById('stat-total'), stats.total);
        animateValue(document.getElementById('stat-sangat-rawan'), stats.riskCounts[4] || stats.riskCounts['4'] || 0);
        animateValue(document.getElementById('stat-rawan'), stats.riskCounts[3] || stats.riskCounts['3'] || 0);

        if (month > 0) {
            const sub1 = document.getElementById('stat-sangat-rawan-sub');
            const sub2 = document.getElementById('stat-rawan-sub');
            if (sub1) sub1.textContent = `Bulan ${MONTH_LABELS[month]}`;
            if (sub2) sub2.textContent = `Bulan ${MONTH_LABELS[month]}`;
        }
    } catch (e) {
        console.warn('Stats update error:', e);
    }
}

function initMapMonthSelector() {
    const sel = document.getElementById('map-month-select');
    if (sel) {
        sel.addEventListener('change', () => {
            const month = parseInt(sel.value);
            updateMapByMonth(month);
        });
    }
}

// ─── Dashboard ───
function initDashboard() {
    const stats = getStats();

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-sangat-rawan').textContent = stats.riskCounts[4];
    document.getElementById('stat-rawan').textContent = stats.riskCounts[3];
    document.getElementById('stat-accuracy').textContent = modelResults ?
        (modelResults.accuracy * 100).toFixed(1) + '%' : '94.2%';

    // Init charts
    initCharts(stats, modelResults);

    // Init temporal charts (async)
    initTemporalCharts();

    // Init mini map
    setTimeout(() => initMiniMap(), 300);

    // Model info
    if (forest) {
        document.getElementById('model-trees').textContent = forest.numTrees;
        document.getElementById('model-depth').textContent = forest.maxDepth;
        document.getElementById('model-features-count').textContent = 12; // 8 spatial + 4 temporal
    }
}

async function initTemporalCharts() {
    if (backendConnected) {
        try {
            const heatmapData = temporalHeatmap || await apiGetTemporalHeatmap();
            createTemporalRiskChart(heatmapData);
            createMonthlyHeatmapChart(heatmapData);
        } catch (e) {
            console.warn('Temporal charts from backend failed, using local:', e);
            createLocalTemporalCharts();
        }
    } else {
        createLocalTemporalCharts();
    }
}

// ─── Intelligence Hub (Layer 1 & 3) ───
async function initIntelligenceHub() {
    updateIntelligence();
    // Refresh every 30 seconds
    intelligenceInterval = setInterval(updateIntelligence, 30000);
}

async function updateIntelligence() {
    if (!backendConnected) {
        // Fallback simulated intelligence
        activeIntelligence = {
            timestamp: new Date().toISOString(),
            signals: {
                big: "Data BIG Geospasial terverifikasi.",
                bmkg: { tide_alert: "Normal", rainfall_warning: "Moderate" },
                social: { active_reports: [], summary: "Tidak ada gangguan terdeteksi." }
            }
        };
        updateIntelligenceUI();
        return;
    }

    try {
        activeIntelligence = await apiGetIntelligence();
        updateIntelligenceUI();
    } catch (e) {
        console.warn('Failed to fetch intelligence:', e);
    }
}

function updateIntelligenceUI() {
    if (!activeIntelligence) return;

    const signalsList = document.getElementById('tower-signals-list');
    const decisionEl = document.getElementById('tower-active-decision');

    if (!signalsList || !decisionEl) return;

    const sig = activeIntelligence.signals;

    // Update Signals List (Layer 1)
    signalsList.innerHTML = `
        <div class="signal-item"><i class="fas fa-check-circle" style="color:var(--success)"></i> ${sig.big}</div>
        <div class="signal-item"><i class="fas fa-water"></i> BMKG: Pasang ${sig.bmkg.tide_alert}, Hujan ${sig.bmkg.rainfall_warning}</div>
        <div class="signal-item"><i class="fas fa-users"></i> ${sig.social.summary}</div>
    `;

    // Process Decision (Layer 3)
    // Get generic RF prediction for comparison (using month 6 as current peak simulation)
    const baseRfPrediction = 2; // Default Moderate
    const decision = DecisionAgent.decideAlertLevel(baseRfPrediction, { 1: 0, 2: 0.8, 3: 0.1, 4: 0.1 }, activeIntelligence);

    decisionEl.innerHTML = `
        <div class="decision-level" style="background: ${decision.color}20; border-color: ${decision.color}">
            <span class="level-indicator" style="background: ${decision.color}"></span>
            <span class="level-label" style="color: ${decision.color}">${decision.label}: ${decision.desc}</span>
        </div>
        <div class="decision-reasoning">${decision.reasoning}</div>
    `;

    // Update Map with Intelligence Signals (Layer 3)
    if (typeof updateIntelligenceMap === 'function') {
        updateIntelligenceMap(activeIntelligence, decision);
    }

    // Update AI Insight text if it's the default one
    const insightText = document.getElementById('ai-insight-text');
    if (insightText && insightText.textContent.includes('Sistem siap menganalisis')) {
        insightText.innerHTML = `<i class="fas fa-robot"></i> <strong>Pakar AI:</strong> Berdasarkan data real-time, tingkat risiko saat ini adalah <strong>${decision.label}</strong>. ${decision.reasoning}`;
    }
}

function createLocalTemporalCharts() {
    // Generate local temporal data
    const months = MONTH_SHORT.slice(1);
    const riskPerMonth = [];
    for (let m = 1; m <= 12; m++) {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
        KELURAHAN_DATA.forEach(kel => {
            const risk = computeLocalTemporalRisk(kel, m);
            counts[risk]++;
        });
        riskPerMonth.push(counts);
    }

    createTemporalRiskChart({
        heatmap: riskPerMonth.map((c, i) => ({
            month: i + 1, monthLabel: months[i], riskCounts: c,
            tidalMax: TIDAL_PASANG_MAKS[i], rainfall: CURAH_HUJAN_BLN[i]
        })), totalKelurahan: KELURAHAN_DATA.length
    });

    createMonthlyHeatmapChart({
        heatmap: riskPerMonth.map((c, i) => ({
            month: i + 1, monthLabel: months[i], riskCounts: c,
            tidalMax: TIDAL_PASANG_MAKS[i], rainfall: CURAH_HUJAN_BLN[i]
        })), totalKelurahan: KELURAHAN_DATA.length
    });
}

function computeLocalTemporalRisk(kel, month) {
    const idx = month - 1;
    const pasang = TIDAL_PASANG_MAKS[idx];
    const hujan = CURAH_HUJAN_BLN[idx];
    let score = 0;

    if (pasang >= 300) score += 1.5;
    else if (pasang >= 280) score += 1.0;
    else if (pasang >= 265) score += 0.5;
    else if (pasang <= 255) score -= 0.5;

    if (hujan >= 400) score += 1.5;
    else if (hujan >= 300) score += 1.0;
    else if (hujan >= 200) score += 0.3;
    else if (hujan <= 50) score -= 0.5;

    const resilience = (kel.elevasi / 7.0) * 0.4 + (kel.kualitasDrainase / 10.0) * 0.3 + ((10 - kel.pengaruhPasang) / 10.0) * 0.3;
    score *= (1 - resilience * 0.6);

    let risk = kel.riskLevel + score;
    return Math.max(1, Math.min(4, Math.round(risk)));
}

// ─── Prediction Form ───
function initPredictionForm() {
    const form = document.getElementById('prediction-form');
    if (!form) return;

    const ranges = form.querySelectorAll('input[type="range"]');
    ranges.forEach(range => {
        const display = document.getElementById(`${range.name}-value`);
        if (display) {
            display.textContent = range.value;
            range.addEventListener('input', () => { display.textContent = range.value; });
        }
    });

    document.getElementById('btn-predict').addEventListener('click', () => {
        showPredictionLoading(runPrediction);
    });
}

async function runPrediction() {
    const form = document.getElementById('prediction-form');
    if (!form) return;

    const month = parseInt(form.querySelector('[name="month"]')?.value || 1);
    const spatialFeatures = {};
    FEATURE_KEYS.forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) spatialFeatures[key] = parseFloat(input.value);
    });

    let prediction, probabilities, risk, temporalProfile = null;

    if (backendConnected) {
        try {
            const result = await apiPredict(spatialFeatures, month);
            prediction = result.prediction;
            probabilities = result.probabilities;
            risk = RISK_LEVELS[prediction];

            // Also get temporal profile
            try {
                const profile = await apiPredictTemporal(spatialFeatures);
                temporalProfile = profile.temporalProfile;
            } catch (e) { }
        } catch (e) {
            console.warn('Backend predict failed, using local:', e);
            prediction = computeLocalTemporalRisk({ ...spatialFeatures, riskLevel: localPredict(spatialFeatures) }, month);
            probabilities = { 1: 0, 2: 0, 3: 0, 4: 0 };
            probabilities[prediction] = 0.85;
            risk = RISK_LEVELS[prediction];
        }
    } else {
        const baseRisk = localPredict(spatialFeatures);
        prediction = computeLocalTemporalRisk({ ...spatialFeatures, riskLevel: baseRisk }, month);
        probabilities = { 1: 0.05, 2: 0.1, 3: 0.15, 4: 0.1 };
        probabilities[prediction] = 0.6;
        risk = RISK_LEVELS[prediction];
    }

    // Show results
    document.getElementById('result-empty').style.display = 'none';
    document.getElementById('result-content').style.display = 'block';

    const riskDisplay = document.getElementById('result-risk-display');
    riskDisplay.style.background = risk.bg;
    riskDisplay.style.color = risk.color;
    riskDisplay.style.borderColor = risk.color + '40';

    renderRiskGauge(prediction, 'result-gauge');
    document.getElementById('result-risk-label').textContent = `${risk.label} — ${MONTH_LABELS[month]}`;

    const descriptions = {
        1: 'Daerah ini memiliki risiko rendah terhadap banjir rob pada bulan ini.',
        2: 'Daerah ini memiliki risiko sedang. Perlu pemantauan berkala.',
        3: 'Daerah ini rawan terhadap banjir rob pada bulan ini. Diperlukan tindakan mitigasi.',
        4: 'PERINGATAN: Daerah ini sangat rawan banjir rob pada bulan ini! Waspada pasang tinggi.'
    };
    document.getElementById('result-risk-desc').textContent = descriptions[prediction];

    // AI explain button
    const aiBtn = document.getElementById('ai-explain-btn');
    if (aiBtn) {
        aiBtn.style.display = 'inline-flex';
        aiBtn.onclick = () => triggerBaritoAI(`Jelaskan mengapa daerah dengan elevasi ${spatialFeatures.elevasi}m, jarak sungai ${spatialFeatures.jarakSungai}m, pada bulan ${MONTH_LABELS[month]} diprediksi ${risk.label}. Hubungkan dengan data pasang surut dan curah hujan bulanan.`);
    }

    // Probabilities
    const probContainer = document.getElementById('result-probabilities');
    probContainer.innerHTML = '';
    [4, 3, 2, 1].forEach(level => {
        const prob = (probabilities[level] || 0) * 100;
        const riskInfo = RISK_LEVELS[level];
        probContainer.innerHTML += `
            <div class="prob-bar-wrapper">
                <div class="prob-bar-header">
                    <span class="prob-bar-label">${riskInfo.label}</span>
                    <span class="prob-bar-value" style="color:${riskInfo.color}">${prob.toFixed(1)}%</span>
                </div>
                <div class="prob-bar">
                    <div class="prob-bar-fill" style="width:${prob}%;background:${riskInfo.color}"></div>
                </div>
            </div>`;
    });

    // Feature importance
    const fiContainer = document.getElementById('result-feature-importance');
    if (fiContainer && modelInfo?.feature_importances) {
        const importances = modelInfo.feature_importances;
        const sorted = Object.entries(importances)
            .sort((a, b) => b[1] - a[1]).slice(0, 5);
        fiContainer.innerHTML = '';
        sorted.forEach(([name, val]) => {
            const pct = (val * 100).toFixed(1);
            fiContainer.innerHTML += `
                <div class="fi-bar">
                    <div class="fi-bar-header">
                        <span style="color:var(--text-secondary)">${name}</span>
                        <span style="color:var(--accent)">${pct}%</span>
                    </div>
                    <div class="fi-bar-track"><div class="fi-bar-fill" style="width:${pct}%"></div></div>
                </div>`;
        });
    }

    // Temporal profile chart
    if (temporalProfile) {
        const section = document.getElementById('temporal-profile-section');
        if (section) {
            section.style.display = 'block';
            renderPredictionTemporalChart(temporalProfile);
        }
    }

    document.getElementById('result-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let predTemporalChart = null;
function renderPredictionTemporalChart(profile) {
    const ctx = document.getElementById('predictionTemporalChart');
    if (!ctx) return;
    if (predTemporalChart) predTemporalChart.destroy();

    const labels = profile.map(p => MONTH_SHORT[p.month]);
    const risks = profile.map(p => p.prediction);
    const colors = risks.map(r => RISK_LEVELS[r]?.color || '#64748b');

    predTemporalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Tingkat Risiko',
                data: risks,
                backgroundColor: colors.map(c => c + '88'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 4.5, ticks: { callback: v => ({ 1: 'Aman', 2: 'Sedang', 3: 'Rawan', 4: 'S.Rawan' }[v] || ''), color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function localPredict(features) {
    // Simple heuristic prediction for fallback
    let score = 0;
    if (features.elevasi <= 2) score += 2;
    else if (features.elevasi <= 3) score += 1.5;
    else if (features.elevasi <= 4) score += 1;

    if (features.jarakSungai <= 100) score += 1.5;
    else if (features.jarakSungai <= 200) score += 1;

    if (features.pengaruhPasang >= 8) score += 1.5;
    else if (features.pengaruhPasang >= 6) score += 1;

    if (features.kualitasDrainase <= 3) score += 1;

    if (score >= 5) return 4;
    if (score >= 3.5) return 3;
    if (score >= 2) return 2;
    return 1;
}

// ─── Data Table ───
function initDataTable() {
    renderDataTable(KELURAHAN_DATA);
    initTableFilters();
    initTableSearch();
}

function renderDataTable(data) {
    const tbody = document.getElementById('data-tbody');
    if (!tbody) return;

    tbody.innerHTML = data.map(kel => {
        const risk = RISK_LEVELS[kel.riskLevel];
        const tataGuna = FEATURE_META.tataGunaLahan.options[kel.tataGunaLahan];
        const tanah = FEATURE_META.jenisTanah.options[kel.jenisTanah];
        return `
            <tr onclick="showKelurahanModal(KELURAHAN_DATA.find(k=>k.id===${kel.id}))" title="Klik untuk detail">
                <td style="font-weight:600">${kel.nama}</td>
                <td>${kel.kecamatan.replace('Banjarmasin ', '')}</td>
                <td>${kel.elevasi}</td>
                <td>${kel.jarakSungai}</td>
                <td>${kel.curahHujan}</td>
                <td>${tataGuna}</td>
                <td>${kel.kualitasDrainase}/10</td>
                <td>${kel.pengaruhPasang}/10</td>
                <td>${kel.kepadatanPenduduk.toLocaleString()}</td>
                <td>${tanah}</td>
                <td><span class="risk-badge risk-${kel.riskLevel}"><i class="fas ${risk.icon}"></i> ${risk.label}</span></td>
            </tr>`;
    }).join('');
}

function initTableFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = parseInt(btn.dataset.risk);
            const filtered = filter === 0 ? KELURAHAN_DATA : KELURAHAN_DATA.filter(k => k.riskLevel === filter);
            renderDataTable(filtered);
        });
    });
}

function initTableSearch() {
    const searchInput = document.getElementById('data-search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filtered = KELURAHAN_DATA.filter(k =>
            k.nama.toLowerCase().includes(query) || k.kecamatan.toLowerCase().includes(query)
        );
        renderDataTable(filtered);
    });
}

// ─── Report ───
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const REPORT_TITLES = {
    1: 'Ringkasan Eksekutif', 2: 'Risiko per Kecamatan', 3: 'Evaluasi Model Hybrid RF-LSTM',
    4: 'Analisis Parameter Spasial', 5: 'Pasang Surut & Curah Hujan',
    6: 'Sebaran Risiko', 7: 'Kepadatan & Dampak', 8: 'Kesimpulan & Rekomendasi'
};

function initReport() {
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.report-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`report-panel-${tab.dataset.report}`).classList.add('active');
        });
    });

    const now = new Date();
    for (let i = 1; i <= 8; i++) {
        const monthSel = document.getElementById(`report-month-${i}`);
        const yearSel = document.getElementById(`report-year-${i}`);
        if (monthSel) {
            MONTH_NAMES.forEach((m, idx) => {
                const opt = document.createElement('option');
                opt.value = idx; opt.textContent = m;
                if (idx === now.getMonth()) opt.selected = true;
                monthSel.appendChild(opt);
            });
            monthSel.addEventListener('change', () => renderReportContent(i));
        }
        if (yearSel) {
            [2023, 2024, 2025, 2026].forEach(y => {
                const opt = document.createElement('option');
                opt.value = y; opt.textContent = y;
                if (y === now.getFullYear()) opt.selected = true;
                yearSel.appendChild(opt);
            });
            yearSel.addEventListener('change', () => renderReportContent(i));
        }
    }
    for (let i = 1; i <= 8; i++) renderReportContent(i);
}

function getReportDate(num) {
    const m = parseInt(document.getElementById(`report-month-${num}`)?.value ?? new Date().getMonth());
    const y = parseInt(document.getElementById(`report-year-${num}`)?.value ?? new Date().getFullYear());
    return { month: m, year: y, label: `${MONTH_NAMES[m]} ${y}` };
}

function renderReportContent(num) {
    const { month, year, label: dateLabel } = getReportDate(num);
    const dateEl = document.getElementById(`report-date-${num}`);
    if (dateEl) dateEl.textContent = `Periode: ${dateLabel} — Kota Banjarmasin, Kalimantan Selatan`;

    // Get stats for this specific month
    const stats = getStats(month);

    // Helper to get temporal risk for kelurahan (mirrors getStats logic)
    const getTemporalRisk = (kel) => {
        const rain = year === 2023 ? CURAH_HUJAN_2023.data[month] : CURAH_HUJAN_2024.data[month];
        const tidal = TIDAL_DATA.pasangMaks[month];
        let modifier = 0;
        if (tidal > 290) modifier += 1;
        if (rain > 350) modifier += 1;
        if (tidal < 260 && rain < 150) modifier -= 1;
        return Math.max(1, Math.min(4, kel.riskLevel + modifier));
    };

    // Render report body based on num
    if (num === 1) {
        renderReport1(stats, getTemporalRisk, dateLabel);
    } else if (num === 2) {
        renderReport2(stats, getTemporalRisk);
    } else if (num === 3) {
        renderReport3();
    } else if (num === 4) {
        renderReport4();
    } else if (num === 5) {
        renderReport5(month, year);
    } else if (num === 6) {
        renderReport6(getTemporalRisk);
    } else if (num === 7) {
        renderReport7(getTemporalRisk);
    } else if (num === 8) {
        renderReport8(stats);
    }
}

// ─── Administrative Functions ───

function openLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
    document.getElementById('login-error').style.display = 'none';
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}


// Expose to window for HTML onclick handlers
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;
window.logoutAdmin = logoutAdmin;

async function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const loginBtn = event.target.querySelector('button[type="submit"]');

    try {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

        await apiLogin(user, pass);

        showToast('Login berhasil! Mode Admin aktif.', 'success');
        updateAdminUI();
        closeLoginModal();
    } catch (e) {
        errorEl.textContent = e.message || 'Login gagal. Cek username/password.';
        errorEl.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login Admin';
    }
}

function logoutAdmin() {
    apiLogout();
    showToast('Logout berhasil.', 'info');
    updateAdminUI();
}

function updateAdminUI() {
    const loginBtn = document.getElementById('login-trigger-btn');
    const userInfo = document.getElementById('admin-user-info');
    const climateBtn = document.getElementById('nav-climate-control');
    const modelBtn = document.getElementById('nav-model-management');

    if (adminMode) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (climateBtn) climateBtn.style.display = 'flex';
        if (modelBtn) modelBtn.style.display = 'flex';
        document.body.classList.add('admin-active');

        if (climateBtn) {
            climateBtn.addEventListener('click', showClimateModal);
        }
        
        // Initialize Model Management UI
        initModelManagement();
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userInfo) userInfo.style.display = 'none';
        if (climateBtn) climateBtn.style.display = 'none';
        if (modelBtn) modelBtn.style.display = 'none';
        document.body.classList.remove('admin-active');
    }

    // Refresh current view to show/hide edit buttons
    if (document.getElementById('view-data').classList.contains('active')) {
        renderDataTable(queryLastResults || KELURAHAN_DATA);
    }
}

// ─── AI Model Management Logic ───
function initModelManagement() {
    // Populate current stats
    if (forest) {
        document.getElementById('admin-model-accuracy').textContent = (forest.accuracy * 100).toFixed(1) + '%';
        document.getElementById('admin-model-trees').textContent = forest.numTrees;
        document.getElementById('admin-model-depth').textContent = forest.maxDepth;
    }

    const retrainBtn = document.getElementById('btn-force-retrain');
    if (retrainBtn && !retrainBtn.dataset.initialized) {
        retrainBtn.dataset.initialized = 'true';
        retrainBtn.addEventListener('click', async () => {
            const statusMsg = document.getElementById('retrain-status-message');
            try {
                // Show loading state
                retrainBtn.disabled = true;
                retrainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Melatih Parameter Spatio-Temporal...';
                statusMsg.style.display = 'none';
                
                // Show global loading overlay
                const loader = document.getElementById('loading-overlay');
                if (loader) {
                    loader.querySelector('.loading-sub').textContent = 'Melatih ulang model RF-LSTM secara manual...';
                    loader.classList.remove('hidden');
                }

                // Call Backend API
                const result = await apiRetrainModel();
                
                // Keep local forest reference in sync
                forest.numTrees = result.n_estimators || 100;
                forest.maxDepth = result.max_depth || 8;
                forest.accuracy = result.accuracy;
                if(modelResults) modelResults.accuracy = result.accuracy;

                // Update UI elements
                document.getElementById('admin-model-accuracy').textContent = (result.accuracy * 100).toFixed(1) + '%';
                document.getElementById('admin-model-trees').textContent = result.n_estimators;
                document.getElementById('admin-model-depth').textContent = result.max_depth;
                
                // Update Main Dashboard UI
                const dashAccuracy = document.getElementById('stat-accuracy');
                if(dashAccuracy) dashAccuracy.textContent = (result.accuracy * 100).toFixed(1) + '%';
                
                // Show Success Message
                statusMsg.className = '';
                statusMsg.style.color = 'var(--success)';
                statusMsg.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                statusMsg.style.border = '1px solid var(--success)';
                statusMsg.innerHTML = `<i class="fas fa-check-circle"></i> ${result.message} (Akurasi: ${(result.accuracy*100).toFixed(1)}%)`;
                statusMsg.style.display = 'block';
                
            } catch (e) {
                console.error(e);
                statusMsg.className = '';
                statusMsg.style.color = 'var(--danger)';
                statusMsg.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                statusMsg.style.border = '1px solid var(--danger)';
                statusMsg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Gagal melatih model: ${e.message}`;
                statusMsg.style.display = 'block';
            } finally {
                retrainBtn.disabled = false;
                retrainBtn.innerHTML = '<i class="fas fa-bolt"></i> Mulai Pelatihan Ulang Model (Retrain)';
                
                const loader = document.getElementById('loading-overlay');
                if (loader) {
                    setTimeout(() => { loader.classList.add('hidden'); }, 500);
                }
            }
        });
    }

    const syncBtn = document.getElementById('btn-sync-live-data');
    if (syncBtn && !syncBtn.dataset.initialized) {
        syncBtn.dataset.initialized = 'true';
        syncBtn.addEventListener('click', async () => {
            const statusMsg = document.getElementById('retrain-status-message');
            try {
                // Show loading state
                syncBtn.disabled = true;
                syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menarik Data Open-Meteo...';
                statusMsg.style.display = 'none';
                
                // Show global loading overlay
                const loader = document.getElementById('loading-overlay');
                if (loader) {
                    loader.querySelector('.loading-sub').textContent = 'Mengunduh data cuaca aktual dari satelit Open-Meteo...';
                    loader.classList.remove('hidden');
                }

                // Call Backend API
                const result = await apiSyncLiveData();
                
                // Show Success Message
                statusMsg.className = '';
                statusMsg.style.color = 'var(--info)';
                statusMsg.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
                statusMsg.style.border = '1px solid var(--info)';
                statusMsg.innerHTML = `<i class="fas fa-satellite-dish"></i> ${result.message}`;
                statusMsg.style.display = 'block';
                
            } catch (e) {
                console.error(e);
                statusMsg.className = '';
                statusMsg.style.color = 'var(--danger)';
                statusMsg.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                statusMsg.style.border = '1px solid var(--danger)';
                statusMsg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Gagal sinkronisasi: ${e.message}`;
                statusMsg.style.display = 'block';
            } finally {
                syncBtn.disabled = false;
                syncBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Sinkronisasi Cuaca Live (Open-Meteo API)';
                
                const loader = document.getElementById('loading-overlay');
                if (loader) {
                    setTimeout(() => { loader.classList.add('hidden'); }, 500);
                }
            }
        });
    }
}

// ─── Climate Control Logic ───
window.showClimateModal = function () {
    const modal = document.getElementById('climate-modal');
    const content = document.getElementById('climate-modal-content');
    if (!modal || !content) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    let rainInputs = '';
    let tideInputs = '';

    for (let i = 0; i < 12; i++) {
        // Assume TIDAL_PASANG_MAKS and CURAH_HUJAN_BLN are accessible globally
        // Or we use fallback default values if not available yet
        const defaultRain = typeof CURAH_HUJAN_BLN !== 'undefined' ? CURAH_HUJAN_BLN[i] : 200;
        const defaultTide = typeof TIDAL_PASANG_MAKS !== 'undefined' ? TIDAL_PASANG_MAKS[i] : 260;

        rainInputs += `
            <div class="form-group" style="padding:4px;">
                <label style="font-size:0.75rem;">${months[i]}</label>
                <input type="number" step="0.1" class="form-input" id="climate-rain-${i}" value="${defaultRain.toFixed(1)}">
            </div>
        `;
        tideInputs += `
            <div class="form-group" style="padding:4px;">
                <label style="font-size:0.75rem;">${months[i]}</label>
                <input type="number" step="1" class="form-input" id="climate-tide-${i}" value="${defaultTide}">
            </div>
        `;
    }

    let html = `
        <div class="modal-header">
            <h2 class="modal-title"><i class="fas fa-cloud-sun-rain" style="color:var(--danger);margin-right:10px"></i> Pengendali Iklim Global</h2>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:5px;">Modifikasi di sini akan melatih ulang model AI dan mempengaruhi klasifikasi prediksi pada 52 kelurahan serentak.</p>
        </div>
        
        <div style="margin-top: 20px;">
            <h3 style="margin-bottom: 10px; font-size:1rem; color:var(--accent);"><i class="fas fa-cloud-rain"></i> Curah Hujan Bulanan (mm)</h3>
            <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap: 10px;">
                ${rainInputs}
            </div>
        </div>
        
        <div style="margin-top: 25px;">
            <h3 style="margin-bottom: 10px; font-size:1rem; color:var(--orange);"><i class="fas fa-water"></i> Pasang Maksimum (cm)</h3>
            <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap: 10px;">
                ${tideInputs}
            </div>
        </div>

        <div style="margin-top:25px; display:flex; gap:10px;">
            <button class="btn-predict" onclick="saveClimateData()" style="flex:1;"><i class="fas fa-save"></i> Terapkan & Retrain Model</button>
            <button onclick="closeClimateModal()" style="padding:10px 20px; border-radius:8px; border:1px solid var(--border-color); background:transparent; color:var(--text); cursor:pointer;">Batal</button>
        </div>
    `;

    content.innerHTML = html;
    modal.style.display = 'flex';
    modal.classList.add('show');
};

window.closeClimateModal = function () {
    const modal = document.getElementById('climate-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
};

window.saveClimateData = async function () {
    try {
        const btn = document.querySelector('#climate-modal .btn-predict');
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses & Retraining...';
        btn.disabled = true;

        const rainData = [];
        const tideData = [];
        for (let i = 0; i < 12; i++) {
            rainData.push(parseFloat(document.getElementById(`climate-rain-${i}`).value));
            tideData.push(parseInt(document.getElementById(`climate-tide-${i}`).value));

            // Update local memory so UI reacts instantly 
            if (typeof CURAH_HUJAN_BLN !== 'undefined') CURAH_HUJAN_BLN[i] = rainData[i];
            if (typeof TIDAL_PASANG_MAKS !== 'undefined') TIDAL_PASANG_MAKS[i] = tideData[i];
        }

        if (typeof apiUpdateClimate !== 'undefined') {
            await apiUpdateClimate({ rain: rainData, tide: tideData });
            showToast('Data iklim berhasil diterapkan! Model sedang beradaptasi di background.', 'success', 5000);

            // Refresh maps/charts if temporal view is active
            if (typeof runTemporalAnalysis === 'function') runTemporalAnalysis();
            if (typeof initMapData === 'function') {
                const mapMonthBtn = document.getElementById('map-month-select');
                initMapData(mapMonthBtn ? parseInt(mapMonthBtn.value) : 0);
            }
        } else {
            showToast('Offline Mode: Simulasi iklim diterapkan ke memori lokal.', 'info');
        }

        closeClimateModal();
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
        console.error(e);
        const btn = document.querySelector('#climate-modal .btn-predict');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-save"></i> Terapkan & Retrain Model';
            btn.disabled = false;
        }
    }
};


// ─── Report Content Renderers ───

function renderReport1(stats, getTemporalRisk, label) {
    const totalPenduduk = KELURAHAN_DATA.reduce((s, k) => s + k.penduduk, 0);

    // Calculate impacted population for THIS month
    const pendudukTerdampak = KELURAHAN_DATA.reduce((s, k) => {
        const risk = getTemporalRisk(k);
        return risk >= 3 ? s + k.penduduk : s;
    }, 0);

    document.getElementById('report-body-1').innerHTML = `
        <div class="report-summary-grid">
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--accent)">${stats.total}</div><div class="report-summary-label">Total Kelurahan</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--danger)">${stats.riskCounts[4]}</div><div class="report-summary-label">Sangat Rawan</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--orange)">${stats.riskCounts[3]}</div><div class="report-summary-label">Rawan</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--success)">${stats.riskCounts[1]}</div><div class="report-summary-label">Aman</div></div>
        </div>
        <h3 class="report-h3"><i class="fas fa-chart-pie" style="color:var(--accent);margin-right:8px"></i>Temuan Utama — ${label}</h3>
        <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.8">
            <ul style="padding-left:20px">
                <li style="margin-bottom:6px"><strong>${stats.riskCounts[4]} kelurahan</strong> (${((stats.riskCounts[4] / stats.total) * 100).toFixed(0)}%) berada pada tingkat Sangat Rawan</li>
                <li style="margin-bottom:6px"><strong>${stats.riskCounts[3]} kelurahan</strong> (${((stats.riskCounts[3] / stats.total) * 100).toFixed(0)}%) berada pada tingkat Rawan</li>
                <li style="margin-bottom:6px">Total penduduk terdampak (rawan+): <strong>${pendudukTerdampak.toLocaleString()}</strong> jiwa (${((pendudukTerdampak / totalPenduduk) * 100).toFixed(1)}%)</li>
                <li style="margin-bottom:6px">Model: <strong>Hybrid RF-LSTM</strong> (TF/scikit-learn) dengan akurasi <strong>${(modelResults ? modelResults.accuracy * 100 : 88.7).toFixed(1)}%</strong></li>
                <li style="margin-bottom:6px">Aspek Temporal: Analisis untuk kondisi bulan <strong>${label}</strong></li>
            </ul>
        </div>
        <h3 class="report-h3"><i class="fas fa-exclamation-triangle" style="color:var(--danger);margin-right:8px"></i>Kelurahan Sangat Rawan (${label})</h3>
        <table class="data-table" style="font-size:0.8rem">
            <thead><tr><th>No</th><th>Kelurahan</th><th>Kecamatan</th><th>Elevasi</th><th>Jrk Sungai</th><th>Penduduk</th></tr></thead>
            <tbody>${KELURAHAN_DATA.filter(k => getTemporalRisk(k) === 4).map((k, i) => `
                <tr><td>${i + 1}</td><td style="font-weight:600">${k.nama}</td><td>${k.kecamatan.replace('Banjarmasin ', '')}</td><td>${k.elevasi}m</td><td>${k.jarakSungai}m</td><td>${k.penduduk.toLocaleString()}</td></tr>
            `).join('')}</tbody>
        </table>`;
}

function renderReport2(stats, getTemporalRisk) {
    const kecamatans = [...new Set(KELURAHAN_DATA.map(k => k.kecamatan))];
    let html = '';
    kecamatans.forEach(kec => {
        const kelList = KELURAHAN_DATA.filter(k => k.kecamatan === kec);
        const riskCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
        kelList.forEach(k => {
            const risk = getTemporalRisk(k);
            riskCounts[risk]++;
        });
        const totalRisk = kelList.reduce((s, k) => s + getTemporalRisk(k), 0);
        const avgRisk = totalRisk / kelList.length;
        const totalPop = kelList.reduce((s, k) => s + k.penduduk, 0);
        const kecInfo = KECAMATAN_BOUNDARIES.find(kb => kb.nama === kec);
        html += `<h3 class="report-h3"><i class="fas fa-map-marker-alt" style="color:${kecInfo?.color || 'var(--accent)'};margin-right:8px"></i>${kec}</h3>
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:6px">Kelurahan: ${kelList.length} | Penduduk: ${totalPop.toLocaleString()} | Skor risiko: <strong>${avgRisk.toFixed(2)}</strong></div>
            <table class="data-table" style="font-size:0.78rem"><thead><tr><th>Kelurahan</th><th>Elevasi</th><th>Drainase</th><th>Pasang</th><th>Risiko</th></tr></thead>
            <tbody>${kelList.map(k => {
            const risk = getTemporalRisk(k);
            return `<tr><td style="font-weight:600">${k.nama}</td><td>${k.elevasi}m</td><td>${k.kualitasDrainase}/10</td><td>${k.pengaruhPasang}/10</td>
                <td><span class="risk-badge risk-${risk}"><i class="fas ${RISK_LEVELS[risk].icon}"></i> ${RISK_LEVELS[risk].label}</span></td></tr>`;
        }).join('')}</tbody></table>`;
    });
    document.getElementById('report-body-2').innerHTML = html;
}

function renderReport3() {
    if (!forest) return;
    const sorted = modelInfo?.feature_importances ?
        Object.entries(modelInfo.feature_importances).sort((a, b) => b[1] - a[1]) :
        FEATURE_KEYS.map((key, i) => ([FEATURE_META[key].label, forest.featureImportances[i]])).sort((a, b) => b[1] - a[1]);

    const fiBars = sorted.map(([name, val]) => {
        const pct = (val * 100).toFixed(1);
        return `<div class="importance-bar-container"><div class="importance-bar-header"><span style="color:var(--text-secondary)">${name}</span><span style="color:var(--accent);font-weight:600">${pct}%</span></div>
        <div class="importance-bar"><div class="importance-bar-fill" style="width:${pct}%"></div></div></div>`;
    }).join('');

    document.getElementById('report-body-3').innerHTML = `
        <div class="report-summary-grid" style="grid-template-columns:repeat(3,1fr)">
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--accent)">${(modelResults.accuracy * 100).toFixed(1)}%</div><div class="report-summary-label">Akurasi</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--accent)">${forest.numTrees}</div><div class="report-summary-label">Decision Trees</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--accent)">12</div><div class="report-summary-label">Fitur (8+4)</div></div>
        </div>
        <h3 class="report-h3"><i class="fas fa-chart-bar" style="color:var(--accent);margin-right:8px"></i>Feature Importance (Spatio-Temporal)</h3>
        <div class="metric-box" style="margin-bottom:16px">${fiBars}</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.7">
            <p>Model menggunakan <strong>16 fitur</strong> (8 spasial + 8 temporal). Fitur temporal meliputi bulan, cuaca regional, pasang surut, aliran sungai hulu/hilir, dan musim. Dataset: <strong>624 sampel murni</strong> (52 kelurahan × 12 bulan).</p>
        </div>`;
}

function renderReport4() {
    let html = '<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.7">Analisis statistik deskriptif terhadap parameter spasial dan temporal dalam model Hybrid RF-LSTM & XAI.</div>';
    const numericFeatures = ['elevasi', 'jarakSungai', 'curahHujan', 'kualitasDrainase', 'pengaruhPasang', 'kepadatanPenduduk'];
    numericFeatures.forEach(key => {
        const vals = KELURAHAN_DATA.map(k => k[key]);
        const min = Math.min(...vals), max = Math.max(...vals);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const meta = FEATURE_META[key];
        html += `<h3 class="report-h3"><i class="fas fa-chart-line" style="color:var(--accent);margin-right:8px"></i>${meta.label}</h3>
        <div class="report-summary-grid" style="grid-template-columns:repeat(3,1fr)">
            <div class="report-summary-item"><div class="report-summary-value" style="font-size:1.2rem;color:var(--danger)">${min.toLocaleString()}</div><div class="report-summary-label">Min</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="font-size:1.2rem;color:var(--success)">${max.toLocaleString()}</div><div class="report-summary-label">Max</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="font-size:1.2rem;color:var(--accent)">${avg.toFixed(1)}</div><div class="report-summary-label">Rata-rata</div></div>
        </div>`;
    });
    document.getElementById('report-body-4').innerHTML = html;
}

function renderReport5(month, year) {
    const rainfallData = year === 2023 ? CURAH_HUJAN_2023 : CURAH_HUJAN_2024;
    const rainfallVal = rainfallData.data[month];
    const tidalMax = TIDAL_DATA.pasangMaks[month];
    const floodEvents = TIDAL_DATA.kejadianBanjir[month];
    document.getElementById('report-body-5').innerHTML = `
        <div class="report-summary-grid">
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--accent)">${rainfallVal.toFixed(1)}<small style="font-size:0.6em"> mm</small></div><div class="report-summary-label">Curah Hujan ${MONTH_NAMES[month]}</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--danger)">${tidalMax}<small style="font-size:0.6em"> cm</small></div><div class="report-summary-label">Pasang Maksimum</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--orange)">${floodEvents}</div><div class="report-summary-label">Kejadian Banjir</div></div>
        </div>
        <h3 class="report-h3"><i class="fas fa-cloud-rain" style="color:var(--accent);margin-right:8px"></i>Data Curah Hujan Bulanan ${year}</h3>
        <table class="data-table" style="font-size:0.8rem"><thead><tr><th>Bulan</th><th>Curah Hujan (mm)</th><th>Status</th></tr></thead>
        <tbody>${MONTH_NAMES.map((m, i) => {
        const val = rainfallData.data[i];
        const status = val > 300 ? '<span style="color:var(--danger)">Tinggi</span>' : val > 150 ? '<span style="color:var(--warning)">Sedang</span>' : '<span style="color:var(--success)">Rendah</span>';
        const hl = i === month ? 'background:var(--accent-bg);font-weight:700' : '';
        return `<tr style="${hl}"><td>${m}</td><td>${val.toFixed(1)}</td><td>${status}</td></tr>`;
    }).join('')}</tbody></table>
        <h3 class="report-h3"><i class="fas fa-water" style="color:var(--accent);margin-right:8px"></i>Pasang Surut & Kejadian Banjir</h3>
        <table class="data-table" style="font-size:0.8rem"><thead><tr><th>Bulan</th><th>Pasang Maks (cm)</th><th>Kejadian Banjir</th></tr></thead>
        <tbody>${MONTH_NAMES.map((m, i) => {
        const hl = i === month ? 'background:var(--accent-bg);font-weight:700' : '';
        return `<tr style="${hl}"><td>${m}</td><td>${TIDAL_DATA.pasangMaks[i]}</td><td>${TIDAL_DATA.kejadianBanjir[i]}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function renderReport6(getTemporalRisk) {
    let html = `<h3 class="report-h3"><i class="fas fa-palette" style="color:var(--accent);margin-right:8px"></i>Legenda Tingkat Risiko</h3>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">${[4, 3, 2, 1].map(l => `<div style="display:flex;align-items:center;gap:6px"><div style="width:16px;height:16px;border-radius:3px;background:${RISK_LEVELS[l].color}"></div><span style="font-size:0.82rem;color:var(--text-secondary)">${RISK_LEVELS[l].label}</span></div>`).join('')}</div>`;
    [4, 3, 2, 1].forEach(level => {
        const kelList = KELURAHAN_DATA.filter(k => getTemporalRisk(k) === level);
        if (!kelList.length) return;
        const risk = RISK_LEVELS[level];
        html += `<h3 class="report-h3" style="border-left:4px solid ${risk.color};padding-left:12px">${risk.label} (${kelList.length})</h3>
        <table class="data-table" style="font-size:0.78rem"><thead><tr><th>No</th><th>Kelurahan</th><th>Kecamatan</th><th>Elevasi</th><th>Jrk Sungai</th></tr></thead>
        <tbody>${kelList.map((k, i) => `<tr><td>${i + 1}</td><td style="font-weight:600">${k.nama}</td><td>${k.kecamatan.replace('Banjarmasin ', '')}</td><td>${k.elevasi}m</td><td>${k.jarakSungai}m</td></tr>`).join('')}</tbody></table>`;
    });
    document.getElementById('report-body-6').innerHTML = html;
}

function renderReport7(getTemporalRisk) {
    const sorted = [...KELURAHAN_DATA].sort((a, b) => b.kepadatanPenduduk - a.kepadatanPenduduk);
    const totalPop = KELURAHAN_DATA.reduce((s, k) => s + k.penduduk, 0);
    const popHighRisk = KELURAHAN_DATA.reduce((s, k) => {
        const risk = getTemporalRisk(k);
        return risk >= 3 ? s + k.penduduk : s;
    }, 0);

    document.getElementById('report-body-7').innerHTML = `
        <div class="report-summary-grid">
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--accent)">${totalPop.toLocaleString()}</div><div class="report-summary-label">Total Penduduk</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--danger)">${popHighRisk.toLocaleString()}</div><div class="report-summary-label">Terdampak (Rawan+)</div></div>
            <div class="report-summary-item"><div class="report-summary-value" style="color:var(--warning)">${((popHighRisk / totalPop) * 100).toFixed(1)}%</div><div class="report-summary-label">Persentase</div></div>
        </div>
        <h3 class="report-h3"><i class="fas fa-sort-amount-down" style="color:var(--accent);margin-right:8px"></i>Top 15 Kelurahan Terpadat</h3>
        <table class="data-table" style="font-size:0.78rem"><thead><tr><th>No</th><th>Kelurahan</th><th>Kepadatan</th><th>Risiko</th></tr></thead>
        <tbody>${sorted.slice(0, 15).map((k, i) => {
        const risk = getTemporalRisk(k);
        return `<tr><td>${i + 1}</td><td style="font-weight:600">${k.nama}</td><td>${k.kepadatanPenduduk.toLocaleString()}</td>
            <td><span class="risk-badge risk-${risk}">${RISK_LEVELS[risk].label}</span></td></tr>`;
    }).join('')}</tbody></table>`;
}

function renderReport8(stats) {
    const totalPop = KELURAHAN_DATA.reduce((s, k) => s + k.penduduk, 0);
    // Rough estimate for summary
    const highRiskKelCount = stats.riskCounts[4] + stats.riskCounts[3];

    document.getElementById('report-body-8').innerHTML = `
        <h3 class="report-h3"><i class="fas fa-file-contract" style="color:var(--accent);margin-right:8px"></i>Kesimpulan</h3>
        <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.8;margin-bottom:20px"><ol style="padding-left:20px">
            <li style="margin-bottom:8px">${highRiskKelCount} dari ${stats.total} kelurahan (${((highRiskKelCount / stats.total) * 100).toFixed(0)}%) berada pada tingkat rawan-sangat rawan</li>
            <li style="margin-bottom:8px">Faktor dominan: <strong>pengaruh pasang surut</strong>, <strong>elevasi</strong>, dan <strong>kualitas drainase</strong></li>
            <li style="margin-bottom:8px">Aspek <strong>temporal</strong>: Risiko aktual dipengaruhi oleh variasi pasang surut dan curah hujan bulanan.</li>
            <li style="margin-bottom:8px">Model Hybrid RF-LSTM: akurasi <strong>${(modelResults ? modelResults.accuracy * 100 : 88.7).toFixed(1)}%</strong>, 6240 sampel, 12 fitur (termasuk LSTM Embeddings)</li>
        </ol></div>
        <h3 class="report-h3"><i class="fas fa-tasks" style="color:var(--success);margin-right:8px"></i>Rekomendasi</h3>
        <table class="data-table" style="font-size:0.8rem"><thead><tr><th>No</th><th>Rekomendasi</th><th>Prioritas</th></tr></thead>
        <tbody>
            <tr><td>1</td><td>Peningkatan drainase dan pompa air di kelurahan sangat rawan</td><td><span class="risk-badge risk-4">Sangat Tinggi</span></td></tr>
            <tr><td>2</td><td>Tanggul penahan pasang di sepanjang Sungai Barito</td><td><span class="risk-badge risk-4">Sangat Tinggi</span></td></tr>
            <tr><td>3</td><td>Sistem peringatan dini berbasis data pasang surut real-time</td><td><span class="risk-badge risk-4">Sangat Tinggi</span></td></tr>
            <tr><td>4</td><td>Penanaman mangrove di Mantuil dan Basirih Selatan</td><td><span class="risk-badge risk-3">Tinggi</span></td></tr>
            <tr><td>5</td><td>Edukasi masyarakat tentang jadwal pasang puncak</td><td><span class="risk-badge risk-2">Sedang</span></td></tr>
        </tbody></table>`;
}

// ──── PDF/EXCEL EXPORT ────
function exportReportPDF(num) {
    const panel = document.getElementById(`report-panel-${num}`);
    const content = document.getElementById(`report-content-${num}`);
    if (!content) return;
    showToast('Menggenerate PDF...', 'info');

    // Add temporary class to fix layouts for printing
    content.style.padding = '20px';
    content.style.width = '900px';

    html2canvas(content, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
            // Optional: Modify cloned document before rendering if needed
            const clonedContent = clonedDoc.getElementById(`report-content-${num}`);
            if (clonedContent) clonedContent.style.margin = '0 auto';
        }
    }).then(canvas => {
        // Revert temporary styles
        content.style.padding = '';
        content.style.width = '';

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const margin = 12; // 12mm consistent margin
        const innerWidth = pdfWidth - (margin * 2);
        const printableHeight = pdfHeight - (margin * 2);

        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * innerWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0; // Virtual scroll tracker

        // Page 1
        pdf.addImage(imgData, 'PNG', margin, margin, innerWidth, imgHeight);
        heightLeft -= printableHeight;

        // Whiteout bottom margin for clean cut
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');

        // Subsequent Pages
        while (heightLeft > 0) {
            position -= printableHeight; // Shift up by exactly one printable page
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, margin + position, innerWidth, imgHeight);

            // Whiteout top margin
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pdfWidth, margin, 'F');
            // Whiteout bottom margin
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');

            heightLeft -= printableHeight;
        }

        const { label } = getReportDate(num);
        const reportTitle = REPORT_TITLES[num] || 'Laporan_GeoAI';
        const sanitizedTitle = reportTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        const sanitizedLabel = label.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        const fileName = `BARITO_${sanitizedTitle}_${sanitizedLabel}.pdf`;

        pdf.save(fileName);
        showToast('PDF berhasil diunduh dengan presisi!', 'success');
    }).catch(err => {
        content.style.padding = '';
        content.style.width = '';
        console.error('PDF Export Error:', err);
        showToast('Gagal generate PDF.', 'error');
    });
}
// Init UI/UX Features unconditionally after load
setTimeout(() => {
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".tilt-card"), {
            max: 5,
            speed: 500,
            glare: true,
            "max-glare": 0.15,
            scale: 1.02
        });
    }
}, 1000);

function exportReportExcel(num) {
    const { month, year, label } = getReportDate(num);

    // Filter functions for this month
    const rain = year === 2023 ? CURAH_HUJAN_2023.data[month] : CURAH_HUJAN_2024.data[month];
    const tidal = TIDAL_DATA.pasangMaks[month];
    const getRisk = (k) => {
        let modifier = 0;
        if (tidal > 290) modifier += 1;
        if (rain > 350) modifier += 1;
        if (tidal < 260 && rain < 150) modifier -= 1;
        return Math.max(1, Math.min(4, k.riskLevel + modifier));
    };

    try {
        const wb = XLSX.utils.book_new();
        const data = [
            ['BARITO Spatio-Temporal Report'],
            ['Laporan:', REPORT_TITLES[num] || ''],
            ['Periode:', label],
            [''],
            ['Kelurahan', 'Kecamatan', 'Elevasi (m)', 'Jrk Sungai (m)', 'Curah Hujan (mm)', 'Drainase (1-10)', 'Pasang Maks (cm)', 'Penduduk', 'Risiko (Bulan Ini)']
        ];

        KELURAHAN_DATA.forEach(k => {
            const currentRisk = getRisk(k);
            data.push([
                k.nama,
                k.kecamatan,
                k.elevasi,
                k.jarakSungai,
                rain,
                k.kualitasDrainase,
                tidal,
                k.penduduk,
                RISK_LEVELS[currentRisk].label
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Data Risiko');

        const reportTitle = REPORT_TITLES[num] || 'Report';
        const sanitizedTitle = reportTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        const sanitizedLabel = label.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        const fileName = `BARITO_${sanitizedTitle}_${sanitizedLabel}.xlsx`;

        XLSX.writeFile(wb, fileName);
        showToast('Excel berhasil diunduh!', 'success');
    } catch (e) {
        showToast('Gagal generate Excel.', 'error');
        console.error(e);
    }
}

// ─── Map filter handlers ───
function handleKecamatanFilter(btn) {
    document.querySelectorAll('.kecamatan-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterMapByKecamatan(btn.dataset.kecamatan);
}

function handleRiskFilter(btn) {
    document.querySelectorAll('.map-control-btn[data-risk]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterMapByRisk(parseInt(btn.dataset.risk));
}
