// ========================================================================
// map.js - Leaflet Map Integration
// ========================================================================

let mainMap = null;
let miniMap = null;
let kelurahanMarkers = [];
let kecamatanLayers = [];
let selectedKelurahan = null;
let intelligenceLayerGroup = null;
let floodHeatmapLayer = null;
let mapLayerControl = null;
let evacuationRouteLayer = null;

function initMainMap() {
    mainMap = L.map('main-map', {
        center: BANJARMASIN_CENTER,
        zoom: BANJARMASIN_ZOOM,
        zoomControl: true,
        attributionControl: false
    });

    // ─── Geo AI & Traditional Basemaps ───
    const darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '&copy; CartoDB'
    });
    
    // Satelit beresolusi tinggi (Esri)
    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: '&copy; Esri'
    });
    
    // Peta standar mirip Google Maps (OSM / Positron)
    const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OSM'
    });

    const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17, attribution: '&copy; OpenTopoMap'
    });

    // Default layer: Citra Satelit Diutamakan (Atas permintaan)
    esriSatellite.addTo(mainMap);

    const baseMaps = {
        "🛰️ Citra Satelit Mutakhir": esriSatellite,
        "🗺️ Peta Jalan Standar": streetMap,
        "🌙 Tampilan Gelap (GeoAI)": darkMatter,
        "⛰️ Peta Topografi Air": openTopo
    };

    // Tambahkan kontrol ke pojok kiri bawah peta
    mapLayerControl = L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(mainMap);

    // Add attribution
    L.control.attribution({
        prefix: 'BARITO &copy; 2026'
    }).addTo(mainMap);

    addKecamatanBoundaries(mainMap);
    addKelurahanMarkers(mainMap);

    // Force resize after init
    setTimeout(() => mainMap.invalidateSize(), 200);
}

function initMiniMap() {
    const miniMapEl = document.getElementById('mini-map');
    if (!miniMapEl) return;

    miniMap = L.map('mini-map', {
        center: BANJARMASIN_CENTER,
        zoom: 12,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        attributionControl: false
    });

    const darkMatterMini = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(miniMap);

    addKecamatanBoundaries(miniMap, true);
    addKelurahanMarkers(miniMap, true);

    setTimeout(() => miniMap.invalidateSize(), 200);
}

function addKecamatanBoundaries(map, isMini = false) {
    KECAMATAN_BOUNDARIES.forEach(kec => {
        // Bugfix: Dynamically calculate bounding box based on precise Kelurahan coordinates
        const kels = KELURAHAN_DATA.filter(k => k.kecamatan === kec.nama);
        if (kels.length === 0) return;

        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        kels.forEach(k => {
            if (k.lat < minLat) minLat = k.lat;
            if (k.lat > maxLat) maxLat = k.lat;
            if (k.lng < minLng) minLng = k.lng;
            if (k.lng > maxLng) maxLng = k.lng;
        });

        const pad = 0.005; // ~500 meters padding
        const dynamicBounds = [
            [minLat - pad, minLng - pad], // SW
            [maxLat + pad, minLng - pad], // NW
            [maxLat + pad, maxLng + pad], // NE
            [minLat - pad, maxLng + pad]  // SE
        ];

        const polygon = L.polygon(dynamicBounds, {
            color: kec.color,
            fillColor: kec.color,
            fillOpacity: 0.05,
            weight: isMini ? 1 : 2,
            opacity: 0.4,
            dashArray: '8, 4'
        }).addTo(map);

        if (!isMini) {
            polygon.bindTooltip(kec.nama, {
                permanent: false,
                direction: 'center',
                className: 'kecamatan-tooltip'
            });

            // Interactive Polygon Hover Effect
            polygon.on('mouseover', function () {
                this.setStyle({ fillOpacity: 0.15, opacity: 0.8, weight: 3 });
            });
            polygon.on('mouseout', function () {
                this.setStyle({ fillOpacity: 0.05, opacity: 0.4, weight: 2 });
            });

            kecamatanLayers.push({ layer: polygon, nama: kec.nama });
        }
    });
}

function addKelurahanMarkers(map, isMini = false) {
    KELURAHAN_DATA.forEach(kel => {
        const risk = RISK_LEVELS[kel.riskLevel];
        const radius = isMini ? 6 : 10;

        const marker = L.circleMarker([kel.lat, kel.lng], {
            radius: radius,
            fillColor: risk.color,
            color: risk.color,
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.5
        }).addTo(map);

        if (!isMini) {
            // Popup content
            const popupHTML = createPopupContent(kel);
            marker.bindPopup(popupHTML, { maxWidth: 280 });

            marker.on('click', () => {
                selectedKelurahan = kel;
                updateInfoPanel(kel);
                
                // Cinematic Fly-To Animation
                mainMap.flyTo([kel.lat, kel.lng], 16, {
                    animate: true,
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            });

            marker.on('mouseover', function () {
                this.setStyle({ radius: 14, fillOpacity: 0.8, weight: 3 });
            });

            marker.on('mouseout', function () {
                this.setStyle({ radius: 10, fillOpacity: 0.5, weight: 2 });
            });

            kelurahanMarkers.push({ marker, data: kel });
        }
    });
}

function createPopupContent(kel) {
    const risk = RISK_LEVELS[kel.riskLevel];
    const tataGuna = FEATURE_META.tataGunaLahan.options[kel.tataGunaLahan];
    const tanah = FEATURE_META.jenisTanah.options[kel.jenisTanah];

    return `
        <div class="popup-content">
            <div class="popup-title">${kel.nama}</div>
            <div class="popup-kecamatan">${kel.kecamatan}</div>
            <div class="popup-risk" style="background:${risk.bg};color:${risk.color}">
                <i class="fas ${risk.icon}"></i> ${risk.label}
            </div>
            <div class="popup-features">
                <div class="popup-feature">
                    <span class="popup-feature-label">Elevasi</span>
                    <span class="popup-feature-value">${kel.elevasi} m</span>
                </div>
                <div class="popup-feature">
                    <span class="popup-feature-label">Jrk Sungai</span>
                    <span class="popup-feature-value">${kel.jarakSungai} m</span>
                </div>
                <div class="popup-feature">
                    <span class="popup-feature-label">Drainase</span>
                    <span class="popup-feature-value">${kel.kualitasDrainase}/10</span>
                </div>
                <div class="popup-feature">
                    <span class="popup-feature-label">Pasang</span>
                    <span class="popup-feature-value">${kel.pengaruhPasang}/10</span>
                </div>
                <div class="popup-feature">
                    <span class="popup-feature-label">Jenis Tanah</span>
                    <span class="popup-feature-value">${tanah}</span>
                </div>
            </div>
            <button class="ai-mini-btn" style="width:100%; margin-top:12px; justify-content:center;" onclick="triggerBaritoAI('Berikan analisis risiko mendalam dan rekomendasi mitigasi spesifik untuk Kelurahan ${kel.nama} di ${kel.kecamatan}. Berdasarkan data: Elevasi ${kel.elevasi}m, Jarak Sungai ${kel.jarakSungai}m, dan Pasang Surut ${kel.pengaruhPasang}/10.')">
                <i class="fas fa-robot"></i> Analisis Lokasi dengan AI
            </button>
        </div>
    `;
}

function updateInfoPanel(kel) {
    const panel = document.getElementById('map-info-detail');
    const placeholder = document.getElementById('map-info-placeholder');
    if (!panel || !placeholder) return;

    placeholder.style.display = 'none';
    panel.style.display = 'block';

    const risk = RISK_LEVELS[kel.riskLevel];
    const tataGuna = FEATURE_META.tataGunaLahan.options[kel.tataGunaLahan];
    const tanah = FEATURE_META.jenisTanah.options[kel.jenisTanah];

    panel.innerHTML = `
        <div class="kelurahan-detail">
            <div class="detail-header">
                <div>
                    <div class="detail-name">${kel.nama}</div>
                    <div class="detail-kecamatan">${kel.kecamatan}</div>
                </div>
                <span class="detail-risk-badge" style="background:${risk.bg};color:${risk.color}">
                    <i class="fas ${risk.icon}"></i> ${risk.label}
                </span>
            </div>
            <div class="detail-features">
                <div class="detail-feature">
                    <div class="detail-feature-label">Elevasi</div>
                    <div class="detail-feature-value">${kel.elevasi} m dpl</div>
                </div>
                <div class="detail-feature">
                    <div class="detail-feature-label">Jarak Sungai</div>
                    <div class="detail-feature-value">${kel.jarakSungai} m</div>
                </div>
                <div class="detail-feature">
                    <div class="detail-feature-label">Curah Hujan</div>
                    <div class="detail-feature-value">${kel.curahHujan} mm/thn</div>
                </div>
                <div class="detail-feature">
                    <div class="detail-feature-label">Tata Guna Lahan</div>
                    <div class="detail-feature-value">${tataGuna}</div>
                </div>
                <div class="detail-feature">
                    <div class="detail-feature-label">Kualitas Drainase</div>
                    <div class="detail-feature-value">${kel.kualitasDrainase}/10</div>
                </div>
                <div class="detail-feature">
                    <div class="detail-feature-label">Pengaruh Pasang</div>
                    <div class="detail-feature-value">${kel.pengaruhPasang}/10</div>
                </div>
                <div class="detail-feature">
                    <div class="detail-feature-label">Kepadatan Penduduk</div>
                    <div class="detail-feature-value">${kel.kepadatanPenduduk.toLocaleString()}/km²</div>
                </div>
                <div class="detail-feature">
                    <div class="detail-feature-label">Jenis Tanah</div>
                    <div class="detail-feature-value">${tanah}</div>
                </div>
            </div>
        </div>
    `;

    // Geo AI: Draw Evacuation Route to Nearest Safe Zone
    drawEvacuationRoute(kel);
}

// ─── Geo AI Evacuation Routing ───
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function drawEvacuationRoute(originKel) {
    if (evacuationRouteLayer) {
        mainMap.removeLayer(evacuationRouteLayer);
        evacuationRouteLayer = null;
    }

    // Only draw route if Origin is Rawan or Sangat Rawan (>= 3)
    if (originKel.riskLevel < 3) return;

    // Find nearest Safe (Aman: <= 1) Kelurahan
    let nearestSafe = null;
    let minDistance = Infinity;

    KELURAHAN_DATA.forEach(kel => {
        if (kel.riskLevel <= 1 && kel.id !== originKel.id) { 
            const dist = calculateDistance(originKel.lat, originKel.lng, kel.lat, kel.lng);
            if (dist < minDistance) {
                minDistance = dist;
                nearestSafe = kel;
            }
        }
    });

    if (nearestSafe) {
        const latlngs = [
            [originKel.lat, originKel.lng],
            [nearestSafe.lat, nearestSafe.lng]
        ];
        
        evacuationRouteLayer = L.polyline(latlngs, {
            color: '#10b981', // green safe color
            weight: 4,
            dashArray: '10, 10',
            lineCap: 'round',
            className: 'animated-data-flow'
        }).addTo(mainMap);

        mainMap.fitBounds(evacuationRouteLayer.getBounds(), { padding: [50, 50] });

        evacuationRouteLayer.bindTooltip(`Rute Evakuasi ke ${nearestSafe.nama} (${minDistance.toFixed(2)} km)`, {
            permanent: true,
            direction: 'center',
            className: 'evacuation-tooltip'
        }).openTooltip();
    }
}

function filterMapByKecamatan(kecamatan) {
    kelurahanMarkers.forEach(({ marker, data }) => {
        if (kecamatan === 'Semua' || data.kecamatan === kecamatan) {
            marker.setStyle({ opacity: 0.8, fillOpacity: 0.5 });
        } else {
            marker.setStyle({ opacity: 0.1, fillOpacity: 0.05 });
        }
    });
}

function filterMapByRisk(riskLevel) {
    kelurahanMarkers.forEach(({ marker, data }) => {
        if (riskLevel === 0 || data.riskLevel === riskLevel) {
            marker.setStyle({ opacity: 0.8, fillOpacity: 0.5 });
        } else {
            marker.setStyle({ opacity: 0.1, fillOpacity: 0.05 });
        }
    });
}

// ─── Temporal Map Update ───
function updateMapByMonth(month) {
    if (!kelurahanMarkers.length) return;

    let heatPoints = [];

    kelurahanMarkers.forEach(({ marker, data }) => {
        let risk;
        let temporalRisk = data.riskLevel;
        
        if (month === 0) {
            risk = RISK_LEVELS[data.riskLevel];
        } else {
            if (typeof allKelurahanTemporal !== 'undefined' && allKelurahanTemporal) {
                const kelT = allKelurahanTemporal.find(k => k.id === data.id);
                if (kelT && kelT.temporalRisks) {
                    temporalRisk = kelT.temporalRisks[month - 1];
                }
            } else if (typeof computeLocalTemporalRisk === 'function') {
                temporalRisk = computeLocalTemporalRisk(data, month);
            }
            risk = RISK_LEVELS[temporalRisk] || RISK_LEVELS[data.riskLevel];
        }

        // Simulasi Pola Genangan (Inundation Polygon)
        let newRadius = 10;
        if (temporalRisk === 4) newRadius = 45;       // Sangat Rawan
        else if (temporalRisk === 3) newRadius = 30;  // Rawan
        else if (temporalRisk === 2) newRadius = 18;  // Sedang
        else newRadius = 10;

        marker.setStyle({
            radius: newRadius,
            fillColor: risk.color,
            color: risk.color,
            opacity: temporalRisk >= 3 ? 0.9 : 0.8,
            fillOpacity: temporalRisk >= 3 ? 0.4 : 0.5
        });

        // Kalkulasi Intensitas Peta Panas (Heatmap)
        let intensity = temporalRisk / 4.0;
        heatPoints.push([data.lat, data.lng, intensity]);
    });

    // Update Heatmap Layer dinamis
    if (mainMap) {
        if (!floodHeatmapLayer) {
            floodHeatmapLayer = L.heatLayer(heatPoints, {
                radius: 45,
                blur: 30,
                maxZoom: 15,
                gradient: {
                    0.2: '#4ade80', // green (safe)
                    0.5: '#facc15', // yellow (mid)
                    0.8: '#f97316', // orange (high)
                    1.0: '#ef4444'  // red (severe)
                }
            });
            if (mapLayerControl) {
                mapLayerControl.addOverlay(floodHeatmapLayer, "🔥 Lapisan Peta Panas (Heatmap)");
            }
        } else {
            floodHeatmapLayer.setLatLngs(heatPoints);
        }
    }
}

// ─── NEW: Layer 3 Smart Alerts (Additive) ───
function updateIntelligenceMap(intelligence, decision) {
    if (!mainMap) return;
    
    // Create layer group if not exists
    if (!intelligenceLayerGroup) {
        intelligenceLayerGroup = L.layerGroup().addTo(mainMap);
    }
    
    // Clear old intelligence signals
    intelligenceLayerGroup.clearLayers();

    if (!intelligence || !intelligence.signals) return;

    // Add Social Media NLP Signals (Layer 1)
    if (intelligence.signals.social && intelligence.signals.social.active_reports) {
        intelligence.signals.social.active_reports.forEach(report => {
            // Find kelurahan lat/lng
            const kel = KELURAHAN_DATA.find(k => k.nama.includes(report.location));
            if (kel) {
                const pulseIcon = L.divIcon({
                    className: 'intelligence-pulse-icon',
                    html: `<div class="pulse" style="background:${decision.color}"></div>`,
                    iconSize: [20, 20]
                });

                const pulseMarker = L.marker([kel.lat, kel.lng], { icon: pulseIcon }).addTo(intelligenceLayerGroup);
                pulseMarker.bindTooltip(`<strong>SINYAL NLP:</strong> ${report.keyword}<br>Intensitas: ${report.intensity}/10`, {
                    direction: 'top',
                    offset: [0, -10]
                });
            }
        });
    }

    // Add Intelligence Hub Global Alert Marker
    const alertIcon = L.divIcon({
        className: 'global-alert-icon',
        html: `<div class="alert-badge" style="background:${decision.color}"><i class="fas ${decision.icon}"></i> ${decision.label}</div>`,
        iconSize: [100, 30],
        iconAnchor: [50, 0]
    });

    // Add a floating alert at the top of the map area
    const mapBounds = mainMap.getBounds();
    const alertPos = [mapBounds.getNorth() - 0.005, mapBounds.getCenter().lng];
    L.marker(alertPos, { icon: alertIcon, interactive: false }).addTo(intelligenceLayerGroup);
}

// ─── NEW: GeoAI Ultra-Advanced 3D & Radar ───
let is3DModeActive = false;
function toggle3DMapMode(btnElement) {
    const mapContainer = document.querySelector('.map-container');
    const radarContainer = document.getElementById('radar-sweep-container');
    
    is3DModeActive = !is3DModeActive;
    
    if (is3DModeActive) {
        mapContainer.classList.add('is-3d');
        radarContainer.style.display = 'block';
        btnElement.classList.add('active');
        btnElement.innerHTML = '<i class="fas fa-cube"></i> Mode 2D';
        
        mainMap.flyTo(BANJARMASIN_CENTER, BANJARMASIN_ZOOM - 0.5, {
            animate: true,
            duration: 1.0
        });
        
    } else {
        mapContainer.classList.remove('is-3d');
        radarContainer.style.display = 'none';
        btnElement.classList.remove('active');
        btnElement.innerHTML = '<i class="fas fa-cube"></i> Mode 3D';
        
        mainMap.flyTo(BANJARMASIN_CENTER, BANJARMASIN_ZOOM, {
            animate: true,
            duration: 1.0
        });
    }
}
