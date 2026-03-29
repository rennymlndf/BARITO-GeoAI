// ========================================================================
// interactions.js - UI/UX Interactive Enhancements
// ========================================================================

// ─── Animated Number Counter ───
function animateCounter(el, target, duration = 1200) {
    const start = 0;
    const isFloat = String(target).includes('.');
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * eased;

        if (isFloat) {
            el.textContent = current.toFixed(1) + (el.dataset.suffix || '');
        } else {
            el.textContent = Math.floor(current).toLocaleString() + (el.dataset.suffix || '');
        }

        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function initCounters() {
    document.querySelectorAll('[data-counter]').forEach(el => {
        const target = parseFloat(el.dataset.counter);
        const suffix = el.dataset.suffix || '';
        el.dataset.suffix = suffix;
        animateCounter(el, target);
    });
}

// ─── Toast Notification System ───
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);
    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── Ripple Effect on Buttons ───
function initRipple() {
    document.querySelectorAll('.btn-predict, .btn-print, .nav-item, .filter-btn, .map-control-btn, .kecamatan-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            const rect = this.getBoundingClientRect();
            ripple.style.left = (e.clientX - rect.left) + 'px';
            ripple.style.top = (e.clientY - rect.top) + 'px';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// ─── Scroll Reveal Animation ───
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
}

// ─── Sidebar Toggle ───
function initSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main-content');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        main.classList.toggle('sidebar-collapsed');
        // Refresh maps
        setTimeout(() => {
            if (mainMap) mainMap.invalidateSize();
            if (miniMap) miniMap.invalidateSize();
        }, 350);
    });
}

// ─── Sortable Table ───
function initSortableTable() {
    const headers = document.querySelectorAll('.data-table th[data-sort]');
    let currentSort = { key: null, dir: 'asc' };

    headers.forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (currentSort.key === key) {
                currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = { key, dir: 'asc' };
            }

            // Update sort indicators
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            th.classList.add(`sort-${currentSort.dir}`);

            // Sort data
            const sorted = [...KELURAHAN_DATA].sort((a, b) => {
                let va = a[key], vb = b[key];
                if (typeof va === 'string') {
                    return currentSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                }
                return currentSort.dir === 'asc' ? va - vb : vb - va;
            });

            renderDataTable(sorted);
            showToast(`Diurutkan berdasarkan ${th.textContent.trim()}`, 'info', 1500);
        });
    });
}

// ─── Prediction Loading Animation ───
function showPredictionLoading(callback) {
    const btn = document.getElementById('btn-predict');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
        <span class="btn-spinner"></span>
        Menganalisis data...
    `;
    btn.classList.add('loading');

    setTimeout(() => {
        callback();
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.classList.remove('loading');
        showToast('Prediksi selesai! Hasil analisis tersedia.', 'success');
    }, 1000);
}

// ─── Risk Gauge (Circular Meter) ───
function renderRiskGauge(level, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const percentage = (level / 4) * 100;
    const colors = { 1: '#059669', 2: '#d97706', 3: '#ea580c', 4: '#dc2626' };
    const color = colors[level];
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (percentage / 100) * circumference;

    container.innerHTML = `
        <svg class="risk-gauge" viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e6ed" stroke-width="8"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="${color}" stroke-width="8"
                stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
                stroke-linecap="round" transform="rotate(-90 60 60)"
                class="gauge-fill" style="--target-offset: ${offset}"/>
            <text x="60" y="55" text-anchor="middle" fill="${color}"
                font-size="28" font-weight="800" font-family="Plus Jakarta Sans">${level}</text>
            <text x="60" y="72" text-anchor="middle" fill="#6b7280"
                font-size="9" font-weight="600" font-family="Plus Jakarta Sans">/ 4</text>
        </svg>
    `;

    // Trigger animation
    requestAnimationFrame(() => {
        const fill = container.querySelector('.gauge-fill');
        if (fill) fill.style.strokeDashoffset = offset;
    });
}

// ─── Live Preview as Sliders Change ───
function initLivePreview() {
    const form = document.getElementById('prediction-form');
    const preview = document.getElementById('live-risk-preview');
    if (!form || !preview || !forest) return;

    const updatePreview = () => {
        const features = FEATURE_KEYS.map(key => {
            const input = form.querySelector(`[name="${key}"]`);
            return input ? parseFloat(input.value) : 0;
        });

        const prediction = forest.predict(features);
        const risk = RISK_LEVELS[prediction];

        preview.style.display = 'flex';
        preview.innerHTML = `
            <i class="fas ${risk.icon}" style="color:${risk.color}"></i>
            <span style="color:${risk.color};font-weight:700">${risk.label}</span>
        `;
        preview.style.borderColor = risk.color;
        preview.className = 'live-risk-preview pulse-border';
    };

    form.querySelectorAll('input[type="range"], select').forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });

    // Initial preview
    setTimeout(updatePreview, 500);
}

// ─── Kelurahan Detail Modal ───
function showKelurahanModal(kel) {
    const modal = document.getElementById('kelurahan-modal');
    if (!modal) return;

    const risk = RISK_LEVELS[kel.riskLevel];
    const tataGuna = FEATURE_META.tataGunaLahan.options[kel.tataGunaLahan];
    const tanah = FEATURE_META.jenisTanah.options[kel.jenisTanah];

    // Check if in Admin Mode
    const isAdmin = (typeof adminMode !== 'undefined' && adminMode);

    let content = `
        <div class="modal-header-content">
            <div>
                <h2 class="modal-kel-name">${kel.nama}</h2>
                <p class="modal-kel-kec">${kel.kecamatan}</p>
            </div>
            <span class="modal-risk-badge" style="background:${risk.bg};color:${risk.color};border:1px solid ${risk.color}20">
                <i class="fas ${risk.icon}"></i> ${risk.label}
            </span>
        </div>
    `;

    if (isAdmin) {
        // Admin Edit Form
        content += `
            <div class="admin-edit-form" id="admin-edit-form">
                <div class="admin-edit-title"><i class="fas fa-edit"></i> Edit Data Geospasial</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Elevasi (m)</label>
                        <input type="number" step="0.1" class="form-input" id="edit-elevasi" value="${kel.elevasi}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Penduduk</label>
                        <input type="number" class="form-input" id="edit-penduduk" value="${kel.penduduk}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kualitas Drainase (1-10)</label>
                        <input type="number" min="1" max="10" class="form-input" id="edit-drainase" value="${kel.kualitasDrainase}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pengaruh Pasang (1-10)</label>
                        <input type="number" min="1" max="10" class="form-input" id="edit-pasang" value="${kel.pengaruhPasang}">
                    </div>
                </div>
                <div id="edit-error" class="login-error-msg" style="display:none; margin: 10px 0;"></div>
                <div class="admin-edit-actions">
                    <button class="btn-predict" onclick="saveKelurahanData(${kel.id})">
                        <i class="fas fa-save"></i> Simpan Perubahan
                    </button>
                </div>
            </div>
            <hr style="margin: 20px 0; opacity: 0.1">
        `;
    }

    content += `
        <div class="modal-features-grid">
            <div class="modal-feature-item">
                <i class="fas fa-mountain"></i>
                <div class="modal-feature-val">${kel.elevasi} m</div>
                <div class="modal-feature-lbl">Elevasi</div>
            </div>
            <div class="modal-feature-item">
                <i class="fas fa-water"></i>
                <div class="modal-feature-val">${kel.jarakSungai} m</div>
                <div class="modal-feature-lbl">Jarak Sungai</div>
            </div>
            <div class="modal-feature-item">
                <i class="fas fa-cloud-rain"></i>
                <div class="modal-feature-val">${kel.curahHujan}</div>
                <div class="modal-feature-lbl">Curah Hujan</div>
            </div>
            <div class="modal-feature-item">
                <i class="fas fa-city"></i>
                <div class="modal-feature-val">${tataGuna}</div>
                <div class="modal-feature-lbl">Tata Guna Lahan</div>
            </div>
            <div class="modal-feature-item">
                <i class="fas fa-arrows-down-to-line"></i>
                <div class="modal-feature-val">${kel.kualitasDrainase}/10</div>
                <div class="modal-feature-lbl">Drainase</div>
            </div>
            <div class="modal-feature-item">
                <i class="fas fa-wave-square"></i>
                <div class="modal-feature-val">${kel.pengaruhPasang}/10</div>
                <div class="modal-feature-lbl">Pasang Surut</div>
            </div>
            <div class="modal-feature-item">
                <i class="fas fa-users"></i>
                <div class="modal-feature-val">${kel.kepadatanPenduduk.toLocaleString()}</div>
                <div class="modal-feature-lbl">Kepadatan</div>
            </div>
            <div class="modal-feature-item">
                <i class="fas fa-layer-group"></i>
                <div class="modal-feature-val">${tanah}</div>
                <div class="modal-feature-lbl">Jenis Tanah</div>
            </div>
        </div>
        <div class="modal-coords">
            <i class="fas fa-map-pin"></i>
            Koordinat: ${kel.lat.toFixed(4)}, ${kel.lng.toFixed(4)}
        </div>
    `;

    document.getElementById('modal-content').innerHTML = content;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

async function saveKelurahanData(id) {
    const errorEl = document.getElementById('edit-error');
    const saveBtn = document.querySelector('.admin-edit-actions button');
    
    const updateData = {
        id: id,
        elevasi: document.getElementById('edit-elevasi').value,
        penduduk: document.getElementById('edit-penduduk').value,
        kualitasDrainase: document.getElementById('edit-drainase').value,
        pengaruhPasang: document.getElementById('edit-pasang').value
    };

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        
        await apiUpdateKelurahan(updateData);
        
        showToast('Data berhasil diperbarui di database!', 'success');
        
        // Update local reference and UI
        const kel = KELURAHAN_DATA.find(k => k.id === id);
        if (kel) {
            kel.elevasi = parseFloat(updateData.elevasi);
            kel.penduduk = parseInt(updateData.penduduk);
            kel.kualitasDrainase = parseInt(updateData.kualitasDrainase);
            kel.pengaruhPasang = parseInt(updateData.pengaruhPasang);
            
            // Re-render table if open
            if (typeof renderDataTable === 'function') {
                renderDataTable(queryLastResults || KELURAHAN_DATA);
            }
            
            // Re-render modal to show updated static values
            showKelurahanModal(kel);
        }
    } catch (e) {
        errorEl.textContent = e.message || 'Gagal menyimpan data.';
        errorEl.style.display = 'block';
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
    }
}

function closeModal() {
    const modal = document.getElementById('kelurahan-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// ─── View Transition Enhancement ───
function enhancedSwitchView(viewId) {
    const current = document.querySelector('.view.active');
    if (current) {
        current.classList.add('view-exit');
        setTimeout(() => {
            current.classList.remove('active', 'view-exit');
        }, 200);
    }

    setTimeout(() => {
        const next = document.getElementById(`view-${viewId}`);
        if (next) {
            next.classList.add('active', 'view-enter');
            setTimeout(() => next.classList.remove('view-enter'), 400);
        }
    }, 200);
}

// ─── Initialize All Interactions ───
function initInteractions() {
    initRipple();
    initScrollReveal();
    initSidebarToggle();
    initSortableTable();
    initLivePreview();

    // Close modal on backdrop click
    const modal = document.getElementById('kelurahan-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Login modal trigger
    const loginBtn = document.getElementById('login-trigger-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Login trigger clicked');
            if (typeof openLoginModal === 'function') {
                openLoginModal();
            } else {
                console.error('openLoginModal function not found');
            }
        });
    }

    // ESC to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            if (typeof closeLoginModal === 'function') closeLoginModal();
        }
    });
}
