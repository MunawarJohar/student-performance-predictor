export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  ""
);

export type Feature = {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
};
export type Metrics = {
  "CV accuracy": number;
  "Test accuracy": number;
  Precision: number;
  Recall: number;
  F1: number;
};
export type ModelInfo = { name: string; metrics: Metrics };
export type FeatureSet = {
  name: string;
  best: string;
  features: Feature[];
  models: ModelInfo[];
};
export type Config = { feature_sets: FeatureSet[] };

export type Tip = { feature: string; action: string; new_probability: number; change: number };
export type ModelVote = { model: string; prediction: "Pass" | "Fail"; pass_probability: number };
export type Prediction = {
  prediction: "Pass" | "Fail";
  pass_probability: number;
  tips: Tip[];
  all_models: ModelVote[];
};

export type BatchRow = Record<string, string | number | null>;
export type BatchResult = {
  columns: string[];
  rows: BatchRow[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    invalid: number;
    out_of_range_values: number;
  };
};

export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error(
      `Can't reach the API at ${API_URL}. Start the backend with "uvicorn main:app --reload" and try again.`
    );
  }
  if (!res.ok) {
    let detail = `The API returned an error (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (body.detail) detail = JSON.stringify(body.detail);
    } catch {
      /* keep the default message */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const getConfig = () => request<Config>("/api/config");

export const predict = (
  body: { feature_set: string; model: string; values: Record<string, number> },
  signal?: AbortSignal
) =>
  request<Prediction>("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

export const predictBatch = (
  file: File,
  featureSet: string,
  model: string,
  signal?: AbortSignal
) => {
  const form = new FormData();
  form.append("file", file);
  form.append("feature_set", featureSet);
  form.append("model", model);
  return request<BatchResult>("/api/predict-batch", { method: "POST", body: form, signal });
};

export const templateUrl = (featureSet: string) =>
  `${API_URL}/api/template?feature_set=${encodeURIComponent(featureSet)}`;
