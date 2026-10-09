import type { FeatureSet } from "@/lib/api";

export function ModelTable({ set }: { set: FeatureSet }) {
  const cols = ["CV accuracy", "Test accuracy", "Precision", "Recall", "F1"] as const;
  return (
    <details className="mt-10 border-y border-rule py-4">
      <summary className="cursor-pointer text-sm font-medium">How the four models compare</summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-muted">
              <th className="py-2 pr-4 font-medium">Model</th>
              {cols.map((c) => (
                <th key={c} className="py-2 pr-4 text-right font-medium">
                  {c} (%)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {set.models.map((m) => (
              <tr key={m.name} className="border-b border-rule/60">
                <td className="py-2 pr-4 font-medium">
                  {m.name}
                  {m.name === set.best && <span className="ml-2 text-pass">highest cross-validation</span>}
                </td>
                {cols.map((c) => (
                  <td key={c} className="py-2 pr-4 text-right tabular-nums">
                    {m.metrics[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Cross-validation repeats the test on 5 different splits of the training data, so it is
          steadier than the single test score. The best model is chosen by cross-validation.
        </p>
      </div>
    </details>
  );
}
