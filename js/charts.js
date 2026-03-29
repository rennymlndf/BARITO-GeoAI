// ========================================================================
// charts.js - Chart.js Visualizations
// ========================================================================

let riskDistChart = null;
let kecamatanRiskChart = null;
let tidalChart = null;
let featureImportanceChart = null;
let temporalRiskChartInstance = null;
let monthlyHeatmapChartInstance = null;

const CHART_COLORS = {
    1: '#10b981', // success
    2: '#f59e0b', // warning/moderate
    3: '#f97316', // orange/risk
    4: '#ef4444'  // danger/critical
};

const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#94a3b8',
                font: { family: 'Outfit', size: 12, weight: '500' },
                padding: 16,
                usePointStyle: true,
                pointStyleWidth: 8
            }
        }
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } }
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } }
        }
    }
};

function initCharts(stats, modelResults) {
    createRiskDistributionChart(stats);
    createKecamatanRiskChart(stats);
    createTidalChart();
    if (modelResults) {
        createFeatureImportanceChart(modelResults.featureImportances);
    }
}

function createRiskDistributionChart(stats) {
    const ctx = document.getElementById('riskDistChart');
    if (!ctx) return;

    if (riskDistChart) riskDistChart.destroy();

    riskDistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Aman', 'Sedang', 'Rawan', 'Sangat Rawan'],
            datasets: [{
                data: [stats.riskCounts[1], stats.riskCounts[2], stats.riskCounts[3], stats.riskCounts[4]],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderColor: [
                    '#10b981', '#f59e0b', '#f97316', '#ef4444'
                ],
                borderWidth: 2,
                hoverOffset: 12,
                spacing: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 11, weight: '500' },
                        padding: 20,
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(13, 20, 41, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 14,
                    titleFont: { family: 'Outfit', weight: '600' },
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    callbacks: {
                        label: function (ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return ` ${ctx.label}: ${ctx.raw} kelurahan (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createKecamatanRiskChart(stats) {
    const ctx = document.getElementById('kecamatanRiskChart');
    if (!ctx) return;

    if (kecamatanRiskChart) kecamatanRiskChart.destroy();

    const labels = Object.keys(stats.avgRiskPerKecamatan).map(k => k.replace('Banjarmasin ', ''));
    const values = Object.values(stats.avgRiskPerKecamatan);
    const colors = values.map(v => {
        if (v >= 3.5) return 'rgba(239, 68, 68, 0.7)';
        if (v >= 2.5) return 'rgba(249, 115, 22, 0.7)';
        if (v >= 1.5) return 'rgba(245, 158, 11, 0.7)';
        return 'rgba(16, 185, 129, 0.7)';
    });

    kecamatanRiskChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rata-rata Tingkat Risiko',
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { family: 'Plus Jakarta Sans', weight: '600' },
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    callbacks: {
                        label: (ctx) => ` Skor Risiko: ${ctx.raw.toFixed(2)}`
                    }
                }
            },
            scales: {
                ...CHART_DEFAULTS.scales,
                y: {
                    ...CHART_DEFAULTS.scales.y,
                    min: 0,
                    max: 4,
                    ticks: {
                        ...CHART_DEFAULTS.scales.y.ticks,
                        callback: (v) => {
                            const labels = { 1: 'Aman', 2: 'Sedang', 3: 'Rawan', 4: 'Sgt Rawan' };
                            return labels[v] || '';
                        }
                    }
                }
            }
        }
    });
}

function createTidalChart() {
    const ctx = document.getElementById('tidalChart');
    if (!ctx) return;

    if (tidalChart) tidalChart.destroy();

    tidalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: TIDAL_DATA.labels,
            datasets: [
                {
                    label: 'Pasang Maks (cm)',
                    data: TIDAL_DATA.pasangMaks,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2
                },
                {
                    label: 'Pasang Rata-rata (cm)',
                    data: TIDAL_DATA.pasangRata,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.05)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2
                },
                {
                    label: 'Kejadian Banjir',
                    data: TIDAL_DATA.kejadianBanjir,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                tooltip: {
                    backgroundColor: 'rgba(13, 20, 41, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 14,
                    mode: 'index',
                    intersect: false,
                    titleFont: { family: 'Outfit', weight: '600' },
                    bodyFont: { family: 'Plus Jakarta Sans' }
                }
            },
            scales: {
                x: CHART_DEFAULTS.scales.x,
                y: {
                    ...CHART_DEFAULTS.scales.y,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Tinggi Pasang (cm)',
                        color: '#64748b',
                        font: { family: 'Inter', size: 10 }
                    }
                },
                y1: {
                    ...CHART_DEFAULTS.scales.y,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: 'Kejadian Banjir',
                        color: '#64748b',
                        font: { family: 'Inter', size: 10 }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

function createFeatureImportanceChart(importances) {
    const ctx = document.getElementById('featureImportanceChart');
    if (!ctx) return;

    if (featureImportanceChart) featureImportanceChart.destroy();

    const labels = FEATURE_KEYS.map(k => FEATURE_META[k].label);
    const sorted = labels.map((l, i) => ({ label: l, value: importances[i] }))
        .sort((a, b) => b.value - a.value);

    featureImportanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s.label),
            datasets: [{
                label: 'Importance',
                data: sorted.map(s => (s.value * 100).toFixed(1)),
                backgroundColor: sorted.map((_, i) => {
                    const colors = [
                        'rgba(6, 182, 212, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(139, 92, 246, 0.7)',
                        'rgba(236, 72, 153, 0.7)',
                        'rgba(249, 115, 22, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(239, 68, 68, 0.7)'
                    ];
                    return colors[i % colors.length];
                }),
                borderRadius: 6,
                borderSkipped: false,
                borderWidth: 0
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            indexAxis: 'y',
            plugins: {
                ...CHART_DEFAULTS.plugins,
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { family: 'Plus Jakarta Sans', weight: '600' },
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    callbacks: {
                        label: (ctx) => ` Importance: ${ctx.raw}%`
                    }
                }
            },
            scales: {
                x: {
                    ...CHART_DEFAULTS.scales.x,
                    title: {
                        display: true,
                        text: 'Importance (%)',
                        color: '#64748b',
                        font: { family: 'Inter', size: 10 }
                    }
                },
                y: {
                    ...CHART_DEFAULTS.scales.y,
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 10 }
                    }
                }
            }
        }
    });
}

// ─── Temporal Risk Evolution Chart ───
function createTemporalRiskChart(heatmapData) {
    const ctx = document.getElementById('temporalRiskChart');
    if (!ctx) return;
    if (temporalRiskChartInstance) temporalRiskChartInstance.destroy();

    const labels = heatmapData.heatmap.map(h => h.monthLabel);
    const datasets = [
        {
            label: 'Sangat Rawan',
            data: heatmapData.heatmap.map(h => h.riskCounts[4] || h.riskCounts['4'] || 0),
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 2
        },
        {
            label: 'Rawan',
            data: heatmapData.heatmap.map(h => h.riskCounts[3] || h.riskCounts['3'] || 0),
            backgroundColor: 'rgba(249, 115, 22, 0.75)',
            borderColor: '#f97316',
            borderWidth: 1,
            borderRadius: 2
        },
        {
            label: 'Sedang',
            data: heatmapData.heatmap.map(h => h.riskCounts[2] || h.riskCounts['2'] || 0),
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 2
        },
        {
            label: 'Aman',
            data: heatmapData.heatmap.map(h => h.riskCounts[1] || h.riskCounts['1'] || 0),
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 2
        }
    ];

    temporalRiskChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                tooltip: {
                    backgroundColor: 'rgba(13, 20, 41, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 14,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    ...CHART_DEFAULTS.scales.x,
                    stacked: true
                },
                y: {
                    ...CHART_DEFAULTS.scales.y,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Jumlah Kelurahan',
                        color: '#64748b',
                        font: { family: 'Inter', size: 10 }
                    }
                }
            }
        }
    });
}

// ─── Monthly Risk Heatmap Chart ───
function createMonthlyHeatmapChart(heatmapData) {
    const ctx = document.getElementById('monthlyHeatmapChart');
    if (!ctx) return;
    if (monthlyHeatmapChartInstance) monthlyHeatmapChartInstance.destroy();

    const labels = heatmapData.heatmap.map(h => h.monthLabel);

    monthlyHeatmapChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Kel. Rawan+',
                    data: heatmapData.heatmap.map(h => {
                        const r3 = h.riskCounts[3] || h.riskCounts['3'] || 0;
                        const r4 = h.riskCounts[4] || h.riskCounts['4'] || 0;
                        return r3 + r4;
                    }),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 2.5,
                    yAxisID: 'y'
                },
                {
                    label: 'Pasang Maks (cm)',
                    data: heatmapData.heatmap.map(h => h.tidalMax),
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.05)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    borderDash: [5, 3],
                    yAxisID: 'y1'
                },
                {
                    label: 'Curah Hujan (mm)',
                    data: heatmapData.heatmap.map(h => h.rainfall),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    borderDash: [3, 3],
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                tooltip: {
                    backgroundColor: 'rgba(13, 20, 41, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 14,
                    mode: 'index',
                    intersect: false,
                    titleFont: { family: 'Outfit', weight: '600' },
                    bodyFont: { family: 'Plus Jakarta Sans' }
                }
            },
            scales: {
                x: CHART_DEFAULTS.scales.x,
                y: {
                    ...CHART_DEFAULTS.scales.y,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Kel. Rawan+ (jumlah)',
                        color: '#ef4444',
                        font: { family: 'Inter', size: 10 }
                    }
                },
                y1: {
                    ...CHART_DEFAULTS.scales.y,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: 'Pasang (cm)',
                        color: '#06b6d4',
                        font: { family: 'Inter', size: 10 }
                    }
                },
                y2: {
                    display: false
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}
