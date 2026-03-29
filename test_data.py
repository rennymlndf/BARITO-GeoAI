import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from data import generate_spatiotemporal_dataset
from model import HybridRFLSTM

X_spatial, X_temporal, y, meta = generate_spatiotemporal_dataset()
print(f"Total rows generated: {len(X_spatial)}")
print(f"Sample X_spatial[0]: {X_spatial[0]}")
print(f"Sample y[0]: {y[0]}")

print("\nRetraining model with new dataset size...")
model = HybridRFLSTM(n_estimators=100)
model.train()
print(f"Model trained! Accuracy: {model.accuracy:.4f}")
print(f"Trees: {model.n_estimators}, Data Shape: {model.get_model_info().get('n_samples', 'N/A')}")
