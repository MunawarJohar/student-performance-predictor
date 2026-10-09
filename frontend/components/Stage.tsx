import type { FeatureSet, Prediction } from "@/lib/api";
import { agreementNote, inHundred, verdictOf, VERDICT_TEXT, type Verdict } from "@/lib/verdict";
import { ErrorNote, ModelPicker } from "./Controls";
import { Crowd, ModelSpread } from "./Viz";

const TINT: Record<Verdict, string> = {
  pass: "bg-pass-tint",
  unsure: "bg-unsure-tint",
  fail: "bg-fail-tint",
};
const COLOR: Record<Verdict, string> = {
  pass: "text-pass",
  unsure: "text-ink",
  fail: "text-fail",
};

/** The result panel. Its color follows the verdict. */
export function Stage({
  result,
  set,
  model,
  onModel,
  busy,
  error,
}: {
  result: Prediction | null;
  set: FeatureSet;
  model: string;
  onModel: (name: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const p = result?.pass_probability ?? 0;
  const verdict: Verdict = result ? verdictOf(p, result.all_models) : "unsure";
  const note = result ? agreementNote(p, result.all_models) : null;

  return (
    <div
      className={`rounded-2xl p-6 transition-colors duration-500 motion-reduce:transition-none sm:p-7 ${TINT[verdict]}`}
    >
      {error && (
        <div className="mb-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {result ? (
        <div className={`transition-opacity motion-reduce:transition-none ${busy ? "opacity-70" : ""}`}>
          <h2
            aria-live="polite"
            className={`font-display text-4xl font-bold leading-[1.05] tracking-tight ${COLOR[verdict]}`}
          >
            {VERDICT_TEXT[verdict]}
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed">
            The <span className="font-medium">{model}</span> model puts the chance of passing at{" "}
            <span className="font-semibold">{inHundred(p)} in 100</span>.
          </p>

          <div className="mt-6">
            <Crowd value={p} />
            <p className="mt-3 text-sm text-muted">
              Each circle is one student out of 100. Filled circles pass.
            </p>
          </div>

          <div className="mt-7">
            <ModelSpread votes={result.all_models} selected={model} />
            <p className="mt-2 text-sm text-muted">
              Each circle is one model. The yellow one is the model you picked.
            </p>
          </div>

          {note && <p className="mt-5 border-l-4 border-ink pl-3 text-sm leading-snug">{note}</p>}
        </div>
      ) : (
        !error && <p className="text-muted">Estimating…</p>
      )}

      <div className="mt-7 border-t border-ink/15 pt-5">
        <ModelPicker id="stage-model" set={set} model={model} onModel={onModel} />
      </div>
    </div>
  );
}
