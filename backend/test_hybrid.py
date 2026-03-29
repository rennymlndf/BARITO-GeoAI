import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model import get_model
from data import KELURAHAN_DATA, FEATURE_KEYS_SPATIAL

def run_test():
    try:
        print("Testing HybridRFLSTM Initialization and Training...")
        model = get_model()
        
        eval_data = model.get_evaluation()
        print("\n=== Eval Results ===")
        print(f"Accuracy: {eval_data['accuracy']:.4f}")
        print(f"CV Mean: {eval_data['cv_mean']:.4f}")
        print(f"Features: {eval_data['feature_names']}")
        
        print("\n=== Temporal Profile Test ===")
        sample_kelurahan = KELURAHAN_DATA[0]
        profile = model.predict_temporal_profile(sample_kelurahan)
        print(f"Profile for {sample_kelurahan['nama']}:")
        for m in profile[:3]:
            print(f"  Month {m['month']}: Risk {m['prediction']} ({m['label']}) - Proba: {m['probabilities']}")
            
        print("\n=== SHAP Explainability Test ===")
        spatial = [sample_kelurahan[k] for k in FEATURE_KEYS_SPATIAL]
        explanation = model.explain(spatial)
        print(f"Base Value: {explanation['base_value']:.4f}")
        for breakdown in explanation['shap_values'][:3]:
            print(f"  {breakdown['feature']}: {breakdown['shap_value']:.4f}")
            
        print("\nAll tests passed successfully.")
    except Exception as e:
        print("\nError during test:", str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
