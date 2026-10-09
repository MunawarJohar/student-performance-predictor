"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL, getConfig, messageOf, type Config } from "@/lib/api";
import { BatchUpload } from "@/components/BatchUpload";
import { ErrorNote } from "@/components/Controls";
import { ModelTable } from "@/components/ModelTable";
import { ScenarioSwitch } from "@/components/ScenarioSwitch";
import { SingleStudent } from "@/components/SingleStudent";

type Tab = "single" | "batch";

function defaultsOf(config: Config): Record<string, number> {
  const d: Record<string, number> = {};
  for (const s of config.feature_sets) for (const f of s.features) d[f.key] = f.default;
  return d;
}

export default function Page() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setName, setSetName] = useState("");
  const [modelName, setModelName] = useState("");
  const [values, setValues] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>("single");

  const load = useCallback(() => {
    setLoadError(null);
    getConfig()
      .then((c) => {
        const first = c.feature_sets[0];
        setConfig(c);
        setSetName(first.name);
        // Logistic Regression gives smoother probabilities than a single tree.
        setModelName(
          first.models.some((m) => m.name === "Logistic Regression") ? "Logistic Regression" : first.best
        );
        setValues(defaultsOf(c));
      })
      .catch((e) => setLoadError(messageOf(e)));
  }, []);

  useEffect(load, [load]);

  const active = useMemo(
    () => config?.feature_sets.find((s) => s.name === setName),
    [config, setName]
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16">
      <header className="flex items-center justify-between gap-6 py-5">
        <p className="flex items-center gap-2.5 font-display text-xl font-semibold">
          <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border-2 border-ink bg-mark" />
          Student Performance
        </p>
        <a href={`${API_URL}/docs`} className="text-sm underline underline-offset-4 hover:text-muted">
          API docs
        </a>
      </header>

      <main>
        <div className="pb-7 pt-1 sm:pt-3">
          <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.98] tracking-tight sm:text-6xl">
            Will this student pass?
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
            Describe a student and see how a model sees them. Change anything and watch the crowd of
            100 move.
          </p>
        </div>

        {loadError && (
          <div className="space-y-3">
            <ErrorNote>{loadError}</ErrorNote>
            <button
              type="button"
              onClick={load}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        )}
        {!config && !loadError && <p className="text-muted">Loading models…</p>}

        {config && active && (
          <>
            <ScenarioSwitch config={config} active={active} onSet={setSetName} />

            <div role="tablist" aria-label="Prediction mode" className="mt-6 flex gap-8 border-b border-rule">
              {(
                [
                  ["single", "One student"],
                  ["batch", "Many students (CSV)"],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`panel-${id}`}
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 py-3 text-[0.95rem] font-medium ${
                    tab === id ? "border-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === "single" ? (
                <SingleStudent
                  set={active}
                  model={modelName}
                  onModel={setModelName}
                  values={values}
                  onValue={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
                  onReset={() => setValues(defaultsOf(config))}
                />
              ) : (
                <BatchUpload set={active} model={modelName} onModel={setModelName} />
              )}
            </div>

            <ModelTable set={active} />
          </>
        )}
      </main>

      <footer className="mt-12 max-w-2xl border-t border-rule pt-6 text-sm leading-relaxed text-muted">
        Trained on records of 395 students from two Portuguese schools. The estimates describe patterns
        in that data. They do not prove what will happen to any one student, and they should support a
        conversation, not replace one.
      </footer>
    </div>
  );
}
