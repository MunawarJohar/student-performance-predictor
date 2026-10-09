"""
train.py — trains several models on the real Student Performance dataset
and saves everything the app needs to model/artifacts.pkl.

Run: python train.py
"""

import os
import glob
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from utils import FEATURE_NAMES, FEATURE_SETS, LOCAL_DATA, MODEL_DIR, ARTIFACT_PATH, PASS_MARK


def find_dataset():
    """Use data/student-mat.csv if present, otherwise download with kagglehub."""
    if os.path.exists(LOCAL_DATA):
        return LOCAL_DATA
    import kagglehub
    path = kagglehub.dataset_download("danielcorredera/student-mat-csv")
    print("Downloaded to:", path)
    files = glob.glob(os.path.join(path, "**", "*.csv"), recursive=True)
    if not files:
        raise FileNotFoundError(f"No CSV found in {path}")
    return files[0]


def load_data():
    path = find_dataset()
    print("Reading:", path)
    # sep=None auto-detects ';' or ',' (the original UCI file uses ';')
    df = pd.read_csv(path, sep=None, engine="python")
    df.columns = [c.strip().strip('"') for c in df.columns]
    missing = [c for c in FEATURE_NAMES + ["G3"] if c not in df.columns]
    if missing:
        raise ValueError(f"Columns missing from dataset: {missing}. Found: {list(df.columns)}")
    return df


def train_set(df, features):
    """Train all models for one feature set. Returns a dict for the app."""
    X = df[features]
    y = (df["G3"] >= PASS_MARK).astype(int)   # 1 = Pass, 0 = Fail

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "Decision Tree": DecisionTreeClassifier(max_depth=5, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
        "KNN": KNeighborsClassifier(n_neighbors=7),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    metrics = {}
    for name, model in models.items():
        cv_acc = cross_val_score(model, X_train_s, y_train, cv=cv).mean()
        model.fit(X_train_s, y_train)
        pred = model.predict(X_test_s)
        metrics[name] = {
            "CV accuracy": round(cv_acc * 100, 2),
            "Test accuracy": round(accuracy_score(y_test, pred) * 100, 2),
            "Precision": round(precision_score(y_test, pred) * 100, 2),
            "Recall": round(recall_score(y_test, pred) * 100, 2),
            "F1": round(f1_score(y_test, pred) * 100, 2),
        }
        print(f"  {name:20s} CV {metrics[name]['CV accuracy']:6.2f}%  "
              f"Test {metrics[name]['Test accuracy']:6.2f}%  F1 {metrics[name]['F1']:6.2f}%")

    best = max(metrics, key=lambda n: metrics[n]["CV accuracy"])
    print(f"  -> best by cross-validation: {best}")
    return {"features": features, "scaler": scaler, "models": models,
            "metrics": metrics, "best": best}


def main():
    df = load_data()
    print(f"Loaded {len(df)} rows.")
    y = (df["G3"] >= PASS_MARK)
    print(f"Pass: {int(y.sum())}  Fail: {int((~y).sum())}")

    sets = {}
    for set_name, features in FEATURE_SETS.items():
        print(f"\n=== {set_name} ===")
        sets[set_name] = train_set(df, features)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump({"sets": sets}, ARTIFACT_PATH)
    print(f"\nSaved {ARTIFACT_PATH}")


if __name__ == "__main__":
    main()
