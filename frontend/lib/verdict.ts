import type { ModelVote } from "./api";

export type Verdict = "pass" | "unsure" | "fail";

export const VERDICT_TEXT: Record<Verdict, string> = {
  pass: "Likely to pass",
  unsure: "Too close to call",
  fail: "At risk of failing",
};

export const OUTLOOK_TEXT: Record<Verdict, string> = {
  pass: "Likely pass",
  unsure: "Close call",
  fail: "At risk",
};

/** Band from a single probability (percent). */
export function riskOf(p: number): Verdict {
  if (p >= 65) return "pass";
  if (p <= 35) return "fail";
  return "unsure";
}

/** Verdict for one student: if the models split, it is never a confident call. */
export function verdictOf(p: number, votes: ModelVote[]): Verdict {
  const passVotes = votes.filter((v) => v.prediction === "Pass").length;
  if (passVotes > 0 && passVotes < votes.length) return "unsure";
  return riskOf(p);
}

/** Never show 0 or 100: a model estimate is not a certainty. */
export function inHundred(p: number): string {
  if (p < 5) return "fewer than 5";
  if (p > 95) return "more than 95";
  return `about ${Math.round(p)}`;
}

export function agreementNote(p: number, votes: ModelVote[]): string | null {
  const n = votes.length;
  const passVotes = votes.filter((v) => v.prediction === "Pass").length;
  if (passVotes > 0 && passVotes < n) {
    return `The ${n} models disagree: ${passVotes} say pass, ${n - passVotes} say fail. Treat this as a rough guide, not an answer.`;
  }
  if (p > 35 && p < 65) {
    return "The estimate sits close to the 50% pass line, so it could go either way.";
  }
  return null;
}
