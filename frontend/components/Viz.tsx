import type { ModelVote } from "@/lib/api";

/** 100 students. Filled circles pass, hollow circles don't. */
export function Crowd({ value }: { value: number }) {
  const n = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div
      className="grid grid-cols-10 gap-1.5 sm:gap-2"
      role="img"
      aria-label={`Out of 100 students like this, about ${n} would pass.`}
    >
      {Array.from({ length: 100 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`aspect-square rounded-full border-2 transition-colors duration-300 motion-reduce:transition-none ${
            i < n ? "border-pass bg-pass" : "border-fail/60 bg-transparent"
          }`}
          style={{ transitionDelay: `${i * 2}ms` }}
        />
      ))}
    </div>
  );
}

/** Where each model lands on the 0-100% scale. The picked model is the yellow mark. */
export function ModelSpread({ votes, selected }: { votes: ModelVote[]; selected: string }) {
  const summary = votes.map((v) => `${v.model} ${v.pass_probability.toFixed(0)} percent`).join(", ");
  const picked = votes.find((v) => v.model === selected);
  return (
    <div>
      <div
        className="relative mx-2 h-3"
        role="img"
        aria-label={`Chance of passing by model: ${summary}. The pass line is at 50 percent.`}
      >
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-sm bg-fail/15" />
        <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-sm bg-pass/15" />
        <div className="absolute -bottom-2 -top-2 left-1/2 w-px bg-ink/50" />
        {votes
          .filter((v) => v.model !== selected)
          .map((v) => (
            <span
              key={v.model}
              title={`${v.model}: ${v.pass_probability.toFixed(0)}%`}
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white transition-[left] duration-300 motion-reduce:transition-none"
              style={{ left: `${v.pass_probability}%` }}
            />
          ))}
        {picked && (
          <span
            title={`${picked.model}: ${picked.pass_probability.toFixed(0)}%`}
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-mark transition-[left] duration-300 motion-reduce:transition-none"
            style={{ left: `${picked.pass_probability}%` }}
          />
        )}
      </div>
      <div className="relative mx-2 mt-3 h-5 text-sm text-muted">
        <span className="absolute left-0">0%</span>
        <span className="absolute left-1/2 -translate-x-1/2">Pass line</span>
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
}

/** Small ruler showing how far one change moves the estimate. */
export function ShiftBar({ from, to }: { from: number; to: number }) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const up = to >= from;
  return (
    <div className="relative h-2 w-full rounded-sm bg-rule/70" aria-hidden="true">
      <div className="absolute inset-y-0 left-1/2 w-px bg-ink/40" />
      <div
        className={`absolute inset-y-0 rounded-sm ${up ? "bg-pass" : "bg-fail"}`}
        style={{ left: `${lo}%`, width: `${Math.max(hi - lo, 0.8)}%` }}
      />
      <div
        className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/60 bg-paper"
        style={{ left: `${from}%` }}
      />
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-mark"
        style={{ left: `${to}%` }}
      />
    </div>
  );
}
