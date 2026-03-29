import urllib.request
import json
import time

# Tunggu sebentar untuk memastikan server Flask sudah merestart
time.sleep(2)

req = urllib.request.Request("http://localhost:5000/api/explain",
                             data=json.dumps({"elevasi": 2.5, "jarakSungai": 80.0, "curahHujan": 2791.0, 
                                              "tataGunaLahan": 1, "kualitasDrainase": 2, "pengaruhPasang": 9, 
                                              "kepadatanPenduduk": 7500, "jenisTanah": 1, "month": 6}).encode('utf-8'),
                             headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as response:
        print("Success:")
        result = json.loads(response.read().decode())
        print(f"Prediction: {result['prediction']} ({result['label']})")
        print(f"Base Value: {result['base_value']}")
        print("Top 3 SHAP Features:")
        for feat in result['shap_values'][:3]:
            print(f" - {feat['feature']}: val = {feat['value']}, shap = {feat['shap_value']:.4f} ({feat['impact']})")
except Exception as e:
    print("Error:", e.read().decode() if hasattr(e, 'read') else str(e))
