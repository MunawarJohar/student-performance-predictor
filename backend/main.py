"""
main.py — FastAPI service for the Student Performance model.

Run:   uvicorn main:app --reload
Docs:  http://localhost:8000/docs
"""

import io
import json
import os
from functools import lru_cache
from typing import Dict

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from utils import (
    ACTIONS,
    FEATURES,
    load_artifacts,
    predict_batch,
    read_uploaded_csv,
    template_csv,
)

MAX_UPLOAD_BYTES = 2 * 1024 * 1024   # 2 MB
MAX_ROWS = 5000

app = FastAPI(
    title="Student Performance API",
    version="1.0.0",
    description="Estimates whether a student will pass, and how small changes "
                "in habits move that estimate.",
)

# Allowed browser origins. Set ALLOWED_ORIGINS="https://my-app.vercel.app,http://localhost:3000"
origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX") or None,  # e.g. https://.*\.vercel\.app
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------- helpers ----------
@lru_cache(maxsize=1)
def get_sets():
    """Load the trained models once (trains first if they are missing)."""
    return load_artifacts()["sets"]


def resolve_set(feature_set: str):
    sets = get_sets()
    if feature_set not in sets:
        raise HTTPException(404, f"Unknown feature_set '{feature_set}'. Options: {list(sets)}")
    return sets[feature_set]


def resolve(feature_set: str, model_name: str):
    art = resolve_set(feature_set)
    if model_name not in art["models"]:
        raise HTTPException(404, f"Unknown model '{model_name}'. Options: {list(art['models'])}")
    return art, art["models"][model_name]


def pass_probability(art, model, row: dict) -> float:
    """Probability of passing, in percent."""
    frame = pd.DataFrame([row], columns=art["features"])
    return float(model.predict_proba(art["scaler"].transform(frame))[0][1]) * 100


# ---------- schemas ----------
class PredictRequest(BaseModel):
    feature_set: str
    model: str
    values: Dict[str, float]


# ---------- routes ----------
@app.get("/")
def root():
    return {"service": "Student Performance API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def config():
    """Everything the frontend needs: feature sets, slider ranges, models, metrics."""
    result = []
    for set_name, art in get_sets().items():
        result.append({
            "name": set_name,
            "best": art["best"],
            "features": [
                {
                    "key": f,
                    "label": FEATURES[f][0],
                    "min": FEATURES[f][1],
                    "max": FEATURES[f][2],
                    "default": FEATURES[f][3],
                    "step": FEATURES[f][4],
                }
                for f in art["features"]
            ],
            "models": [{"name": n, "metrics": art["metrics"][n]} for n in art["models"]],
        })
    return {"feature_sets": result}


@app.post("/api/predict")
def predict(req: PredictRequest):
    art, model = resolve(req.feature_set, req.model)
    features = art["features"]

    missing = [f for f in features if f not in req.values]
    if missing:
        raise HTTPException(422, f"Missing values for: {missing}")

    problems = []
    for f in features:
        _, lo, hi, _, _ = FEATURES[f]
        if not lo <= req.values[f] <= hi:
            problems.append(f"{f} must be between {lo} and {hi}")
    if problems:
        raise HTTPException(422, "; ".join(problems))

    row = {f: req.values[f] for f in features}
    p = pass_probability(art, model, row)

    # What-if: change one actionable habit at a time and re-predict
    tips = []
    for feat, (delta, text) in ACTIONS.items():
        if feat not in row:
            continue
        _, lo, hi, _, _ = FEATURES[feat]
        new_val = min(max(row[feat] + delta, lo), hi)
        if new_val == row[feat]:
            continue  # already at the limit
        new_p = pass_probability(art, model, {**row, feat: new_val})
        tips.append({
            "feature": feat,
            "action": text,
            "new_probability": round(new_p, 1),
            "change": round(new_p - p, 1),
        })
    tips.sort(key=lambda t: t["change"], reverse=True)

    all_models = []
    for name, m in art["models"].items():
        pp = pass_probability(art, m, row)
        all_models.append({
            "model": name,
            "prediction": "Pass" if pp >= 50 else "Fail",
            "pass_probability": round(pp, 1),
        })

    return {
        "prediction": "Pass" if p >= 50 else "Fail",
        "pass_probability": round(p, 1),
        "tips": tips,
        "all_models": all_models,
    }


@app.post("/api/predict-batch")
async def predict_batch_route(
    file: UploadFile = File(...),
    feature_set: str = Form(...),
    model: str = Form(...),
):
    art, mdl = resolve(feature_set, model)

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File is larger than 2 MB.")
    try:
        df = read_uploaded_csv(io.StringIO(raw.decode("utf-8-sig", errors="replace")))
    except Exception:
        raise HTTPException(400, "Could not read the file as a CSV.")
    if df.empty:
        raise HTTPException(400, "The file has no rows.")
    if len(df) > MAX_ROWS:
        raise HTTPException(413, f"Too many rows ({len(df)}). The limit is {MAX_ROWS}.")

    try:
        result, n_invalid, n_range = predict_batch(df, art["features"], art["scaler"], mdl)
    except ValueError as e:
        raise HTTPException(422, str(e))

    counts = result["Prediction"].value_counts()
    return {
        "columns": list(result.columns),
        "rows": json.loads(result.to_json(orient="records")),  # NaN -> null
        "summary": {
            "total": len(result),
            "passed": int(counts.get("Pass", 0)),
            "failed": int(counts.get("Fail", 0)),
            "invalid": n_invalid,
            "out_of_range_values": n_range,
        },
    }


@app.get("/api/template")
def template(feature_set: str):
    art = resolve_set(feature_set)
    return Response(
        content=template_csv(art["features"]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="students_template.csv"'},
    )
