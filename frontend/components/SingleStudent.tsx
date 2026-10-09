"use client";

import { useEffect, useMemo, useState } from "react";
import { messageOf, predict, type Feature, type FeatureSet, type Prediction } from "@/lib/api";
import { FEATURE_META, GROUPS } from "@/lib/features";
import { inHundred, verdictOf, VERDICT_TEXT } from "@/lib/verdict";
import { ChoiceField, SliderField } from "./Controls";
import { Stage } from "./Stage";
import { ShiftBar } from "./Viz";

export function SingleStudent({
  set,
  model,
  onModel,
  values,
  onValue,
  onReset,
}: {
  set: FeatureSet;
  model: string;
  onModel: (name: string) => void;
  values: Record<string, number>;
  onValue: (key: string, v: number) => void;
  onReset: () => void;
}) {
  const [result, setResult] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Predict live: wait briefly after the last change, cancel stale requests.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const payload = Object.fromEntries(set.features.map((f) => [f.key, values[f.key]]));
        const r = await predict({ feature_set: set.name, model, values: payload }, controller.signal);
        setResult(r);
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) setError(messageOf(e));
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [set, model, values]);

  const groups = useMemo(
    () =>
      GROUPS.map((name) => ({
        name,
        features: set.features.filter((f) => (FEATURE_META[f.key]?.group ?? GROUPS[0]) === name),
      })).filter((g) => g.features.length > 0),
    [set]
  );

  function field(f: Feature) {
    const meta = FEATURE_META[f.key];
    const id = `field-${f.key}`;
    const title = meta?.title ?? f.label;
    const value = values[f.key];

    if (meta && (meta.kind === "choice" || meta.kind === "scale") && meta.options) {
      return (
        <div key={f.key} className="sm:col-span-2">
          <ChoiceField
            id={id}
            title={title}
            options={meta.options}
            captions={meta.captions}
            value={value}
            onChange={(v) => onValue(f.key, v)}
          />
        </div>
      );
    }
    return (
      <div key={f.key} className={meta?.half ? "" : "sm:col-span-2"}>
        <SliderField
          id={id}
          title={title}
          unit={meta?.unit}
          min={f.min}
          max={f.max}
          step={f.step}
          value={value}
          onChange={(v) => onValue(f.key, v)}
        />
      </div>
    );
  }

  const p = result?.pass_probability ?? 0;
  const verdict = result ? verdictOf(p, result.all_models) : "unsure";

  return (
    <div className="pb-24 lg:pb-0">
      <div className="grid gap-10 py-8 lg:grid-cols-[1fr_420px] lg:gap-14">
        <div className="space-y-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold">Describe the student</h2>
            <button
              type="button"
              onClick={onReset}
              className="text-sm underline underline-offset-4 hover:text-muted"
            >
              Reset values
            </button>
          </div>
          {groups.map((g) => (
            <section key={g.name} aria-label={g.name}>
              <h3 className="border-b border-rule pb-2 font-display text-lg font-semibold">{g.name}</h3>
              <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2">{g.features.map(field)}</div>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Stage result={result} set={set} model={model} onModel={onModel} busy={busy} error={error} />
        </aside>
      </div>

      {result && (
        <section className="border-t border-rule py-10">
          <h2 className="font-display text-3xl font-semibold">What could move it</h2>
          <p className="mt-2 max-w-prose text-[0.95rem] leading-relaxed text-muted">
            One change at a time, everything else the same. Based on the {model} model only. These
            are patterns in past students, not promises about this one.
          </p>
          {result.tips.length === 0 ? (
            <p className="mt-6">Nothing to adjust. This student is already at the limit for these factors.</p>
          ) : (
            <ul className="mt-8 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-rule">
              {result.tips.map((t) => {
                const flat = Math.abs(t.change) < 1;
                const big = Math.abs(t.change) >= 30;
                return (
                  <li key={t.feature} className="md:px-8 md:first:pl-0 md:last:pr-0">
                    <p className="font-medium">{t.action}</p>
                    <p
                      className={`mt-2 font-display font-bold tabular-nums ${
                        flat ? "text-2xl text-muted" : `text-4xl ${t.change > 0 ? "text-pass" : "text-fail"}`
                      }`}
                    >
                      {flat ? "No change" : `${t.change > 0 ? "+" : ""}${Math.round(t.change)}`}
                      {!flat && <span className="ml-1.5 text-base font-medium text-muted">in 100</span>}
                    </p>
                    <p className="mb-3 mt-1 text-sm text-muted">
                      {flat ? "The estimate stays put." : `Moves it to ${inHundred(t.new_probability)} in 100.`}
                    </p>
                    <ShiftBar from={p} to={t.new_probability} />
                    {big && (
                      <p className="mt-3 text-sm text-muted">
                        A jump this large usually means this model is unstable here. Check the other
                        models before trusting it.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* On phones the result is far below the controls, so keep a compact copy in view. */}
      {result && (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-rule bg-paper/95 px-5 pt-3 backdrop-blur lg:hidden"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <span
            className={`font-display text-xl font-bold ${
              verdict === "pass" ? "text-pass" : verdict === "fail" ? "text-fail" : "text-ink"
            }`}
          >
            {VERDICT_TEXT[verdict]}
          </span>
          <span className="whitespace-nowrap text-sm tabular-nums">{inHundred(p)} in 100</span>
        </div>
      )}
    </div>
  );
}
