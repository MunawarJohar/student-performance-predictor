"""
Tests build a small synthetic dataset, so they run offline (no Kaggle needed).
Run: pytest
"""
import io
import os
import sys

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

GRADES = "With previous grades (G1, G2)"
HABITS = "Habits only (no grades)"


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    import train
    import utils

    tmp = tmp_path_factory.mktemp("spa")
    rng = np.random.default_rng(0)
    n = 300
    df = pd.DataFrame({
        "studytime": rng.integers(1, 5, n),
        "failures": rng.choice([0, 0, 0, 1, 2, 3], n),
        "goout": rng.integers(1, 6, n),
        "health": rng.integers(1, 6, n),
        "absences": rng.integers(0, 40, n),
        "G1": rng.integers(3, 19, n),
    })
    df["G2"] = (df.G1 + rng.integers(-3, 4, n)).clip(0, 20)
    df["G3"] = (df.G2 + rng.integers(-3, 3, n) - df.failures + df.studytime - 2).clip(0, 20)
    csv_path = tmp / "student-mat.csv"
    df.to_csv(csv_path, sep=";", index=False)

    mp = pytest.MonkeyPatch()
    artifact = str(tmp / "model" / "artifacts.pkl")
    mp.setattr(train, "LOCAL_DATA", str(csv_path))
    mp.setattr(train, "MODEL_DIR", str(tmp / "model"))
    mp.setattr(train, "ARTIFACT_PATH", artifact)
    mp.setattr(utils, "ARTIFACT_PATH", artifact)
    train.main()

    import main
    main.get_sets.cache_clear()
    yield TestClient(main.app)
    mp.undo()


GOOD = {"studytime": 3, "failures": 0, "absences": 4, "goout": 2, "health": 3, "G1": 14, "G2": 15}


def body(values=None, fs=GRADES, model="Logistic Regression"):
    return {"feature_set": fs, "model": model, "values": values or GOOD}


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_config(client):
    sets = client.get("/api/config").json()["feature_sets"]
    assert {s["name"] for s in sets} == {GRADES, HABITS}
    habits = next(s for s in sets if s["name"] == HABITS)
    assert "G1" not in [f["key"] for f in habits["features"]]
    assert len(habits["models"]) == 4


def test_predict_shape(client):
    r = client.post("/api/predict", json=body())
    assert r.status_code == 200
    data = r.json()
    assert data["prediction"] in ("Pass", "Fail")
    assert 0 <= data["pass_probability"] <= 100
    assert len(data["all_models"]) == 4
    assert all({"action", "change", "new_probability"} <= set(t) for t in data["tips"])


def test_better_grades_raise_probability(client):
    low = client.post("/api/predict", json=body({**GOOD, "G1": 4, "G2": 4})).json()
    high = client.post("/api/predict", json=body({**GOOD, "G1": 17, "G2": 17})).json()
    assert high["pass_probability"] > low["pass_probability"]


def test_habits_set_ignores_grades(client):
    vals = {k: v for k, v in GOOD.items() if k not in ("G1", "G2")}
    assert client.post("/api/predict", json=body(vals, fs=HABITS)).status_code == 200


def test_missing_value(client):
    vals = {k: v for k, v in GOOD.items() if k != "absences"}
    assert client.post("/api/predict", json=body(vals)).status_code == 422


def test_out_of_range(client):
    assert client.post("/api/predict", json=body({**GOOD, "absences": 999})).status_code == 422


def test_unknown_model_and_set(client):
    assert client.post("/api/predict", json=body(model="Nope")).status_code == 404
    assert client.post("/api/predict", json=body(fs="Nope")).status_code == 404


def _upload(client, text, fs=GRADES):
    return client.post(
        "/api/predict-batch",
        data={"feature_set": fs, "model": "Random Forest"},
        files={"file": ("students.csv", io.BytesIO(text.encode()), "text/csv")},
    )


def test_batch_ok_with_bad_row(client):
    csv = "studytime,failures,absences,goout,health,G1,G2\n3,0,2,2,4,15,15\nabc,1,5,4,4,11,11\n"
    r = _upload(client, csv)
    assert r.status_code == 200
    data = r.json()
    assert data["summary"]["total"] == 2 and data["summary"]["invalid"] == 1
    assert data["rows"][1]["Prediction"] == "Invalid row"
    assert data["rows"][1]["Pass probability (%)"] is None


def test_batch_semicolon_file(client):
    csv = "studytime;failures;absences;goout;health;G1;G2\n3;0;2;2;4;15;15\n"
    assert _upload(client, csv).status_code == 200


def test_batch_missing_column(client):
    assert _upload(client, "studytime,failures\n1,0\n").status_code == 422


def test_template(client):
    r = client.get("/api/template", params={"feature_set": HABITS})
    assert r.status_code == 200
    assert r.text.splitlines()[0] == "studytime,failures,absences,goout,health"
