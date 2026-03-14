"""
Predictive Maintenance ML Model — Training Script

Uses RandomForestClassifier with road condition features.
Run this to train the model before deploying:

    python ai/prediction/train_model.py

The trained model is saved to ai/models/predictive_model.pkl
"""

import os
import pickle
import json
import random
import numpy as np
from pathlib import Path
from datetime import datetime

# Feature names
FEATURE_NAMES = [
    "health_score_normalized", "age_years", "traffic_intensity",
    "pothole_count_30d", "repair_count_1y", "rainfall_mm",
    "temperature_variance", "surface_hardness_index"
]


def generate_training_data(n_samples: int = 5000):
    """Generate realistic synthetic training data."""
    X = []
    y = []

    for _ in range(n_samples):
        # Simulate road conditions
        health = random.uniform(0.1, 1.0)
        age = random.randint(0, 30)
        traffic = random.uniform(1, 10)
        potholes = random.randint(0, 20)
        repairs = random.randint(0, 15)
        rainfall = random.uniform(200, 2000)
        temp_var = random.uniform(10, 45)
        hardness = random.uniform(0.2, 1.0)

        features = [health, age, traffic, potholes, repairs, rainfall, temp_var, hardness]

        # Label: 1 if road needs urgent maintenance (probabilistic)
        failure_prob = (
            (1 - health) * 0.4 +
            min(age / 25, 1.0) * 0.25 +
            min(potholes / 15, 1.0) * 0.2 +
            (traffic / 10) * 0.1 +
            (1 - hardness) * 0.05
        )
        label = 1 if random.random() < failure_prob else 0

        X.append(features)
        y.append(label)

    return np.array(X), np.array(y)


def train_model():
    """Train RandomForest model for road failure prediction."""
    print("🤖 Training Predictive Maintenance Model...")
    print(f"   Features: {len(FEATURE_NAMES)}")

    try:
        from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
        from sklearn.model_selection import train_test_split, cross_val_score
        from sklearn.preprocessing import StandardScaler
        from sklearn.pipeline import Pipeline
        from sklearn.metrics import classification_report, roc_auc_score
    except ImportError:
        print("❌ scikit-learn not installed. Run: pip install scikit-learn")
        return False

    # Generate training data
    print("\n📊 Generating training data (5000 samples)...")
    X, y = generate_training_data(5000)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)} | Test: {len(X_test)}")
    print(f"   Positive samples: {y.sum()} ({y.mean()*100:.1f}%)")

    # Model pipeline
    model = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1
        ))
    ])

    # Train
    print("\n🏋️  Training RandomForest (200 trees)...")
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n📈 Model Performance:")
    print(classification_report(y_test, y_pred, target_names=['Normal', 'At Risk']))
    print(f"   ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")

    # Feature importance
    rf = model.named_steps['classifier']
    importances = rf.feature_importances_
    print("\n🔑 Feature Importances:")
    for name, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1]):
        print(f"   {name}: {imp:.4f}")

    # Save model
    model_dir = Path("ai/models")
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "predictive_model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    # Save metadata
    metadata = {
        "model_type": "RandomForestClassifier",
        "version": "1.0",
        "trained_at": datetime.utcnow().isoformat(),
        "n_samples": 5000,
        "n_features": len(FEATURE_NAMES),
        "feature_names": FEATURE_NAMES,
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
        "model_path": str(model_path)
    }
    with open(model_dir / "predictive_model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✅ Model saved: {model_path}")
    print(f"   Model size: {os.path.getsize(model_path) / 1024:.1f} KB")
    return True


if __name__ == "__main__":
    success = train_model()
    if not success:
        print("\n⚠️  Model training failed. System will use heuristic fallback.")
