"""
utils.py — shared config and loaders.
"""

import os
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
LOCAL_DATA = os.path.join(BASE_DIR, "data", "student-mat.csv")
ARTIFACT_PATH = os.path.join(MODEL_DIR, "artifacts.pkl")

# Pass if final grade G3 >= 10 (Portuguese scale is 0-20)
PASS_MARK = 10

# feature name -> (label, min, max, default, step)
FEATURES = {
    "studytime": ("Weekly study time (1: <2h, 2: 2-5h, 3: 5-10h, 4: >10h)", 1, 4, 2, 1),
    "failures":  ("Past class failures", 0, 3, 0, 1),
    "absences":  ("Absences", 0, 75, 4, 1),
    "goout":     ("Going out with friends (1 = very low, 5 = very high)", 1, 5, 3, 1),
    "health":    ("Health status (1 = very bad, 5 = very good)", 1, 5, 3, 1),
    "G1":        ("First period grade (0-20)", 0, 20, 10, 1),
    "G2":        ("Second period grade (0-20)", 0, 20, 10, 1),
}
FEATURE_NAMES = list(FEATURES.keys())

# Two versions of the model: with and without the previous grades
GRADES_SET = "With previous grades (G1, G2)"
HABITS_SET = "Habits only (no grades)"
FEATURE_SETS = {
    GRADES_SET: FEATURE_NAMES,
    HABITS_SET: [f for f in FEATURE_NAMES if f not in ("G1", "G2")],
}

# Things a student can actually change: feature -> (change, description)
ACTIONS = {
    "studytime": (+1, "Study one level more per week"),
    "absences":  (-5, "Have 5 fewer absences"),
    "goout":     (-1, "Go out with friends one level less"),
}


def ensure_trained():
    """Train automatically if the saved artifacts are missing or empty."""
    if not os.path.exists(ARTIFACT_PATH) or os.path.getsize(ARTIFACT_PATH) == 0:
        print("Artifacts missing -> training now...")
        import train
        train.main()


def load_artifacts():
    ensure_trained()
    art = joblib.load(ARTIFACT_PATH)
    if "sets" not in art:  # old format from an earlier version -> retrain
        import train
        train.main()
        art = joblib.load(ARTIFACT_PATH)
    return art


def read_uploaded_csv(file):
    """Read an uploaded CSV, auto-detecting ',' or ';' as separator."""
    import pandas as pd
    df = pd.read_csv(file, sep=None, engine="python")
    df.columns = [str(c).strip().strip('"') for c in df.columns]
    return df


def predict_batch(df, features, scaler, model):
    """
    Predict Pass/Fail for every row of df.
    Returns (result_df, n_invalid, n_out_of_range).
    Rows with missing / non-numeric values are marked 'Invalid row'.
    """
    import numpy as np
    import pandas as pd

    missing = [f for f in features if f not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    X = df[features].apply(pd.to_numeric, errors="coerce")
    valid = X.notna().all(axis=1)

    out = df.copy()
    out["Prediction"] = "Invalid row"
    out["Pass probability (%)"] = np.nan
    if valid.any():
        proba = model.predict_proba(scaler.transform(X[valid]))[:, 1] * 100
        out.loc[valid, "Pass probability (%)"] = proba.round(1)
        out.loc[valid, "Prediction"] = np.where(proba >= 50, "Pass", "Fail")

    out_of_range = 0
    for f in features:
        _, lo, hi, _, _ = FEATURES[f]
        out_of_range += int(((X[f] < lo) | (X[f] > hi)).sum())
    return out, int((~valid).sum()), out_of_range


def template_csv(features):
    """A small example CSV the user can fill in."""
    import pandas as pd
    rows = []
    for k in range(3):
        rows.append({f: FEATURES[f][3] + (k if FEATURES[f][2] - FEATURES[f][3] > k else 0)
                     for f in features})
    return pd.DataFrame(rows, columns=features).to_csv(index=False)
