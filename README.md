# Student Performance Predictor

A full-stack machine learning app that estimates whether a student will **pass or fail**
and shows how small changes in habits move that estimate.

- **Backend:** FastAPI + scikit-learn (four models, cross-validated)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Data:** UCI Student Performance (`student-mat`), 395 students from two Portuguese schools

## What it does

- **Live prediction:** change a value and the estimate updates. The result is shown as a crowd
  of 100 students (filled circles pass), with a plain-language verdict: *Likely to pass*,
  *Too close to call*, or *At risk of failing*.
- **Honest uncertainty:** if the four models disagree, the app says so instead of showing a
  confident answer, and it never displays 0% or 100%.
- **Two modes:** with earlier grades (G1, G2), or habits and background only.
- **Model picker:** Logistic Regression, Decision Tree, Random Forest, KNN, with cross-validation,
  test accuracy, precision, recall and F1 for each.
- **What could change it:** tests one change at a time (more study time, fewer absences,
  going out less) and shows the shift in pass probability.
- **Batch mode:** upload a CSV, get predictions for every student, download the results.

## Project layout

```
backend/    FastAPI service, training script, tests
frontend/   Next.js app
```

## Run it locally

You need Python 3.10+ and Node.js 20+.

**1. Backend** (Windows commands)

```bat
cd backend
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
python train.py
python -m uvicorn main:app --reload
```

`train.py` uses `backend/data/student-mat.csv` if it exists, otherwise downloads the dataset
with `kagglehub`. The API runs at http://localhost:8000 (interactive docs at `/docs`).

**2. Frontend** (in a second terminal)

```bat
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/config` | Feature sets, slider ranges, models and their metrics |
| POST | `/api/predict` | Predict one student, with what-if tips and all-model results |
| POST | `/api/predict-batch` | Predict a CSV (multipart: `file`, `feature_set`, `model`) |
| GET | `/api/template?feature_set=...` | CSV template with the right columns |

Example:

```bash
curl -X POST http://localhost:8000/api/predict -H "Content-Type: application/json" -d '{
  "feature_set": "Habits only (no grades)",
  "model": "Random Forest",
  "values": {"studytime": 3, "failures": 0, "absences": 4, "goout": 2, "health": 3}
}'
```

## Tests

```bat
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest
```

The tests build a small synthetic dataset, so they run offline.

## Deploying (not tested in this repo)

- **Backend (e.g. Render):** root directory `backend`, build command
  `pip install -r requirements.txt && python train.py`, start command
  `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set `ALLOWED_ORIGINS` to your frontend URL.
- **Frontend (Vercel):** root directory `frontend`, set `NEXT_PUBLIC_API_URL` to the backend URL.

Free backend tiers may sleep when idle, so the first request can be slow.

## Limitations

- 395 students from two schools in one country. Results may not transfer elsewhere.
- Earlier grades (G1, G2) are very strong predictors. Habits-only accuracy is much lower.
- The what-if tips describe patterns in past data. They are **not** causal claims, and with a
  weak model they can look counterintuitive.
- Predictions should support a conversation with a student, not replace judgment.

## Next steps

- Repeated cross-validation, baselines, and significance tests
- Explainability (permutation importance, SHAP) and subgroup fairness checks
- Use all 30+ original features, and test on the Portuguese-language dataset
