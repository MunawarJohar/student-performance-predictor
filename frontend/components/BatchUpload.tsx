"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { messageOf, predictBatch, templateUrl, type BatchResult, type FeatureSet } from "@/lib/api";
import { downloadText, toCsv } from "@/lib/csv";
import { OUTLOOK_TEXT, riskOf, type Verdict } from "@/lib/verdict";
import { ErrorNote, ModelPicker } from "./Controls";

const SHOWN_ROWS = 200;
const PROB = "Pass probability (%)";

const PILL: Record<Verdict, string> = {
  pass: "bg-pass-tint text-pass",
  unsure: "bg-unsure-tint text-ink",
  fail: "bg-fail-tint text-fail",
};

function Pill({ p }: { p: unknown }) {
  if (typeof p !== "number") {
    return (
      <span className="inline-block rounded-full border border-rule px-2.5 py-0.5 text-xs font-medium text-muted">
        Invalid row
      </span>
    );
  }
  const v = riskOf(p);
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL[v]}`}>
      {OUTLOOK_TEXT[v]}
    </span>
  );
}

export function BatchUpload({
  set,
  model,
  onModel,
}: {
  set: FeatureSet;
  model: string;
  onModel: (name: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-run whenever the file, input type, or model changes.
  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    predictBatch(file, set.name, model, controller.signal)
      .then(setResult)
      .catch((e) => {
        if (controller.signal.aborted) return;
        setResult(null);
        setError(messageOf(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [file, set.name, model]);

  const stats = useMemo(() => {
    if (!result) return null;
    const s = { pass: 0, unsure: 0, fail: 0, invalid: 0 };
    for (const r of result.rows) {
      const p = r[PROB];
      if (typeof p !== "number") s.invalid++;
      else s[riskOf(p)]++;
    }
    return s;
  }, [result]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setResult(null);
      setError("Choose a .csv file.");
      return;
    }
    setFile(f);
  };

  const download = () => {
    if (!result) return;
    const rows = result.rows.map((r) => {
      const p = r[PROB];
      return { ...r, Outlook: typeof p === "number" ? OUTLOOK_TEXT[riskOf(p)] : "Invalid row" };
    });
    downloadText("predictions.csv", toCsv([...result.columns, "Outlook"], rows));
  };

  const total = stats ? stats.pass + stats.unsure + stats.fail : 0;

  return (
    <div className="grid gap-12 py-8 lg:grid-cols-[360px_1fr]">
      <div>
        <h2 className="font-display text-3xl font-semibold">Predict a whole class</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed">
          Upload a CSV with one row per student. It needs these columns:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {set.features.map((f) => (
            <li key={f.key} className="rounded border border-rule bg-white/60 px-2 py-0.5 text-sm">
              {f.key}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Other columns are kept in the results. Commas or semicolons both work.
        </p>
        <a
          href={templateUrl(set.name)}
          download
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4 hover:text-muted"
        >
          Download CSV template
        </a>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-ink ${
            dragging ? "border-ink bg-mark/30" : "border-ink/40 bg-white/50"
          }`}
        >
          <span className="font-medium">{file ? file.name : "Drop a CSV file here"}</span>
          <span className="mt-1 text-sm text-muted">
            {file ? "Click to choose a different file" : "or click to choose one (up to 2 MB)"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>

        <div className="mt-8 border-t border-rule pt-5">
          <ModelPicker id="batch-model" set={set} model={model} onModel={onModel} />
        </div>
      </div>

      <div className="min-w-0">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!file && !error && (
          <p className="text-[0.95rem] text-muted">
            Results appear here after you upload a file. Start with the template if you are not sure
            about the format.
          </p>
        )}
        {busy && !result && <p className="text-[0.95rem] text-muted">Predicting…</p>}

        {result && stats && (
          <div className={busy ? "opacity-60" : ""} aria-live="polite">
            <dl className="grid grid-cols-3 gap-4">
              {(
                [
                  ["Likely to pass", stats.pass, "text-pass"],
                  ["Close calls", stats.unsure, "text-ink"],
                  ["At risk", stats.fail, "text-fail"],
                ] as [string, number, string][]
              ).map(([label, value, color]) => (
                <div key={label}>
                  <dd className={`font-display text-5xl font-bold tabular-nums ${color}`}>{value}</dd>
                  <dt className="text-sm text-muted">{label}</dt>
                </div>
              ))}
            </dl>

            {total > 0 && (
              <div
                className="mt-5 flex h-3 overflow-hidden rounded-full bg-rule/60"
                role="img"
                aria-label={`${stats.pass} likely to pass, ${stats.unsure} close calls, ${stats.fail} at risk`}
              >
                <div className="bg-pass" style={{ width: `${(stats.pass / total) * 100}%` }} />
                <div className="bg-ink/30" style={{ width: `${(stats.unsure / total) * 100}%` }} />
                <div className="bg-fail" style={{ width: `${(stats.fail / total) * 100}%` }} />
              </div>
            )}

            {stats.invalid > 0 && (
              <p className="mt-4 text-sm">
                {stats.invalid} row(s) have missing or non-numeric values and were marked “Invalid row”.
              </p>
            )}
            {result.summary.out_of_range_values > 0 && (
              <p className="mt-2 text-sm">
                {result.summary.out_of_range_values} value(s) are outside the range the model was trained
                on, so those predictions are less reliable.
              </p>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-muted">
                {result.rows.length > SHOWN_ROWS
                  ? `Showing the first ${SHOWN_ROWS} of ${result.rows.length} rows.`
                  : `${result.rows.length} rows.`}
              </p>
              <button
                type="button"
                onClick={download}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
              >
                Download predictions
              </button>
            </div>

            <div className="mt-3 max-h-[480px] overflow-auto border-y border-rule">
              <table className="w-full min-w-max text-left text-sm">
                <thead className="sticky top-0 bg-paper">
                  <tr className="border-b border-rule text-muted">
                    {result.columns.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">
                        {c === "Prediction" ? "Outlook" : c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, SHOWN_ROWS).map((row, i) => (
                    <tr key={i} className="border-b border-rule/60">
                      {result.columns.map((c) => {
                        const v = row[c];
                        if (c === "Prediction") {
                          return (
                            <td key={c} className="px-3 py-2">
                              <Pill p={row[PROB]} />
                            </td>
                          );
                        }
                        if (c === PROB) {
                          return (
                            <td key={c} className="px-3 py-2 tabular-nums">
                              {typeof v === "number" ? (
                                <span className="flex items-center gap-2">
                                  <span className="relative h-1.5 w-16 rounded-full bg-rule/70">
                                    <span
                                      className="absolute inset-y-0 left-0 rounded-full bg-ink"
                                      style={{ width: `${v}%` }}
                                    />
                                  </span>
                                  {v.toFixed(1)}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          );
                        }
                        return (
                          <td key={c} className="px-3 py-2 tabular-nums">
                            {v === null ? "—" : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
