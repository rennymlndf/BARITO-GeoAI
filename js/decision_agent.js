// ========================================================================
// decision_agent.js - Layer 3: Adaptive Decision Making
// AI Agent logic to decide warning levels based on L1 & L2 signals.
// ========================================================================

class AdaptiveDecisionAgent {
    constructor() {
        this.alertLevels = {
            1: { color: "#10b981", label: "HIJAU", desc: "Aman", icon: "fa-check-circle" },
            2: { color: "#f59e0b", label: "KUNING", desc: "Waspada", icon: "fa-info-circle" },
            3: { color: "#f97316", label: "ORANYE", desc: "Siaga", icon: "fa-exclamation-triangle" },
            4: { color: "#ef4444", label: "MERAH", desc: "Bahaya", icon: "fa-skull-crossbones" }
        };
        this.currentContext = null;
    }

    /**
     * Determines the final alert level by reconciling Random Forest probability
     * with real-time intelligence context (Layer 3).
     */
    decideAlertLevel(rfPrediction, rfProbabilities, intelligence) {
        let baseLevel = rfPrediction;
        let weightedScore = baseLevel;

        if (!intelligence || !intelligence.signals) return this.alertLevels[baseLevel];

        const signals = intelligence.signals;

        // Adaptive Rule 1: High Tide Extremes
        if (signals.bmkg.tide_alert === "Extreme") weightedScore += 0.8;
        else if (signals.bmkg.tide_alert === "High") weightedScore += 0.4;

        // Adaptive Rule 2: Heavy Rainfall Warning
        if (signals.bmkg.rainfall_warning === "Heavy") weightedScore += 0.7;
        
        // Adaptive Rule 3: Social Media Sentiment (Active NLP signals)
        const socialIntensity = signals.social.active_reports ? 
            signals.social.active_reports.length : 0;
        
        if (socialIntensity > 3) weightedScore += 0.5;
        else if (socialIntensity > 0) weightedScore += 0.2;

        // Final reconciliation
        let finalLevel = Math.max(1, Math.min(4, Math.round(weightedScore)));
        
        // Contextual override: If social media detects active flooding, minimum level is ORANYE
        if (socialIntensity > 5 && finalLevel < 3) finalLevel = 3;

        return {
            ...this.alertLevels[finalLevel],
            score: weightedScore,
            confidence: (rfProbabilities[finalLevel] || 0.5) * 100,
            reasoning: this._generateReasoning(finalLevel, signals)
        };
    }

    _generateReasoning(level, signals) {
        let reasons = [];
        if (signals.bmkg.tide_alert === "Extreme") reasons.push("Pasang air laut ekstrem terdeteksi (BMKG)");
        if (signals.bmkg.rainfall_warning === "Heavy") reasons.push("Peringatan curah hujan tinggi aktif");
        if (signals.social.active_reports.length > 0) reasons.push(`Analisis NLP mendeteksi ${signals.social.active_reports.length} laporan banjir lokal di media sosial`);
        
        if (reasons.length === 0) return "Prediksi stabil berdasarkan data historis geospasial.";
        return reasons.join(". ") + ".";
    }
}

const DecisionAgent = new AdaptiveDecisionAgent();
