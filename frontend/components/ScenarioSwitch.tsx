import type { Config, FeatureSet } from "@/lib/api";

export function ScenarioSwitch({
  config,
  active,
  onSet,
}: {
  config: Config;
  active: FeatureSet;
  onSet: (name: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Information to use" className="grid gap-3 sm:grid-cols-2">
      {config.feature_sets.map((s) => {
        const habits = s.name.startsWith("Habits");
        const best = s.models.find((m) => m.name === s.best);
        const accuracy = Math.round(best?.metrics["CV accuracy"] ?? 0);
        return (
          <label key={s.name} className="relative cursor-pointer">
            <input
              type="radio"
              name="scenario"
              checked={s.name === active.name}
              onChange={() => onSet(s.name)}
              className="peer sr-only"
            />
            <div className="h-full rounded-lg border-2 border-ink/20 bg-white/60 p-4 transition-colors hover:border-ink/50 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink motion-reduce:transition-none">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-display text-xl font-semibold">
                  {habits ? "Habits only" : "With earlier grades"}
                </span>
                <span className="text-sm tabular-nums opacity-80">about {accuracy}% accurate</span>
              </div>
              <p className="mt-1 text-sm leading-snug opacity-80">
                {habits
                  ? "Uses habits and background only. Weaker, but it works before any grades exist."
                  : "Adds the first two period grades. Accurate, but only possible once those grades exist."}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
