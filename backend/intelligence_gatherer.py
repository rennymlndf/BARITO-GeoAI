# ========================================================================
# intelligence_gatherer.py - Layer 1: Data Gathering & NLP Simulation
# Simulates an AI Agent collecting data from BMKG, BIG, and Social Media.
# ========================================================================

import random
import time
from datetime import datetime

class IntelligenceGatherer:
    """
    Simulates the 'Lapis Pertama' - pengumpulan data multi-sumber.
    """
    
    def __init__(self):
        self.last_update = None
        self.sources = ["BMKG Maritim", "BIG (Badan Informasi Geospasial)", "BMKG Syamsudin Noor", "Social Media Feed"]
        self.status = "Idle"

    def get_realtime_signals(self):
        """
        Simulates gathering real-time signals, including NLP sentiment from social media.
        """
        self.status = "Gathering data..."
        
        # Simulate BIG Data (Elevation - stable)
        big_signals = "Elevation data verified from BIG Digital Elevation Model (DEM)."
        
        # Simulate BMKG Data (Tides/Rain - dynamic)
        bmkg_signals = {
            "tide_alert": random.choice(["Normal", "High", "Extreme"]),
            "rainfall_warning": random.choice(["Low", "Moderate", "Heavy"]),
            "station": "BMKG Maritim Muara Barito"
        }
        
        # Simulate Social Media NLP Signals
        # Keywords extracted: 'banjir', 'genangan', 'air naik', 'rob'
        social_signals = self._simulate_nlp_extraction()
        
        self.last_update = datetime.now().isoformat()
        self.status = "Synchronized"
        
        return {
            "timestamp": self.last_update,
            "sources": self.sources,
            "signals": {
                "big": big_signals,
                "bmkg": bmkg_signals,
                "social": social_signals
            }
        }

    def _simulate_nlp_extraction(self):
        """
        Simulates NLP extraction from localized social media posts.
        """
        locations = ["Alalak", "Kelayan", "Kuin", "Pemurus", "Sungai Andai"]
        active_reports = []
        
        for loc in locations:
            if random.random() > 0.7:  # 30% chance of a localized report
                intensity = random.randint(1, 10)
                active_reports.append({
                    "location": loc,
                    "intensity": intensity,
                    "keyword": random.choice(["#banjirbjm", "genangan air", "pasang dalam"]),
                    "timestamp": "Real-time"
                })
        
        return {
            "platform": "X (Twitter) / Facebook Local Groups",
            "active_reports": active_reports,
            "summary": f"Detected {len(active_reports)} localized flooding signals via NLP filtering."
        }

# Singleton instance
gatherer = IntelligenceGatherer()

def get_intelligence():
    return gatherer.get_realtime_signals()
