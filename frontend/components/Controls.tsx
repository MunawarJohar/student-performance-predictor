import type { CSSProperties, ReactNode } from "react";
import type { Choice } from "@/lib/features";
import type { FeatureSet } from "@/lib/api";

export function SliderField({
  id,
  title,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  title: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[0.95rem] font-medium">
          {title}
        </label>
        <span className="font-display text-2xl font-semibold tabular-nums">
          <output htmlFor={id}>{value}</output>
          {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-4"
        style={{ "--pct": `${pct}%` } as CSSProperties}
      />
      <div className="mt-2 flex justify-between text-sm tabular-nums text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/** Tappable options. Native radio inputs, so arrow keys work for free. */
export function ChoiceField({
  id,
  title,
  options,
  value,
  onChange,
  captions,
}: {
  id: string;
  title: string;
  options: Choice[];
  value: number;
  onChange: (v: number) => void;
  captions?: [string, string];
}) {
  return (
    <div>
      <span id={`${id}-label`} className="text-[0.95rem] font-medium">
        {title}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <label key={o.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={id}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-[46px] items-center justify-center rounded-md border border-ink/25 bg-white/70 px-1 text-center text-sm font-medium leading-tight transition-colors hover:border-ink/60 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink motion-reduce:transition-none">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {captions && (
        <div className="mt-1.5 flex justify-between text-sm text-muted">
          <span>{captions[0]}</span>
          <span>{captions[1]}</span>
        </div>
      )}
    </div>
  );
}

export function ModelPicker({
  id,
  set,
  model,
  onModel,
}: {
  id: string;
  set: FeatureSet;
  model: string;
  onModel: (name: string) => void;
}) {
  const m = set.models.find((x) => x.name === model)?.metrics;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        Model
      </label>
      <select
        id={id}
        value={model}
        onChange={(e) => onModel(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-ink/30 bg-white/80 px-3 py-2 text-[0.95rem]"
      >
        {set.models.map((x) => (
          <option key={x.name} value={x.name}>
            {x.name}
          </option>
        ))}
      </select>
      {m && (
        <p className="mt-2 text-sm leading-snug text-muted">
          Cross-validated accuracy {m["CV accuracy"]}%, test accuracy {m["Test accuracy"]}%.
        </p>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border-l-4 border-fail bg-fail-tint/60 px-4 py-3 text-sm text-ink">
      {children}
    </p>
  );
}
