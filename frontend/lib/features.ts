export type FieldKind = "choice" | "scale" | "slider";
export type Choice = { value: number; label: string };

export type FieldMeta = {
  title: string;
  group: "Habits and health" | "Academic record";
  kind: FieldKind;
  options?: Choice[];
  captions?: [string, string];
  unit?: string;
  half?: boolean;
};

const scale = (from: number, to: number): Choice[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: String(from + i) }));

export const GROUPS: FieldMeta["group"][] = ["Habits and health", "Academic record"];

/** Presentation details the API doesn't need to know about. */
export const FEATURE_META: Record<string, FieldMeta> = {
  studytime: {
    title: "Weekly study time",
    group: "Habits and health",
    kind: "choice",
    options: [
      { value: 1, label: "Under 2 h" },
      { value: 2, label: "2 to 5 h" },
      { value: 3, label: "5 to 10 h" },
      { value: 4, label: "Over 10 h" },
    ],
  },
  goout: {
    title: "Going out with friends",
    group: "Habits and health",
    kind: "scale",
    options: scale(1, 5),
    captions: ["Rarely", "Very often"],
  },
  absences: { title: "Absences", group: "Habits and health", kind: "slider", unit: "classes" },
  health: {
    title: "Health",
    group: "Habits and health",
    kind: "scale",
    options: scale(1, 5),
    captions: ["Very bad", "Very good"],
  },
  failures: {
    title: "Past class failures",
    group: "Academic record",
    kind: "choice",
    options: [
      { value: 0, label: "None" },
      { value: 1, label: "1" },
      { value: 2, label: "2" },
      { value: 3, label: "3 or more" },
    ],
  },
  G1: { title: "First period grade", group: "Academic record", kind: "slider", unit: "/ 20", half: true },
  G2: { title: "Second period grade", group: "Academic record", kind: "slider", unit: "/ 20", half: true },
};
