// Before/after evidence for PLC Impact Loop monitoring — pure logic, no data
// access. Mirrors src/domain/impactLoop.ts.

export type ScoreSnapshot = {
  score: number;
  total_score: number;
  pct: number;
  assessed_date: string;
};

export type EvidenceResult =
  | { kind: "ok"; snapshot: ScoreSnapshot }
  | { kind: "unavailable"; reason: string };

export type MonitoringResultStatus = "improved" | "no_change" | "declined" | "inconclusive";

/** Percentage-point delta that counts as a real change, not noise. */
export const IMPROVEMENT_THRESHOLD_PP = 0.05;

/**
 * Only pre-fills an editable dropdown in the UI — the teacher can override
 * before saving, so this threshold is a UX default, not a data-integrity rule.
 */
export function deriveResultStatus(before: EvidenceResult, after: EvidenceResult): MonitoringResultStatus {
  if (before.kind !== "ok" || after.kind !== "ok") return "inconclusive";
  const delta = after.snapshot.pct - before.snapshot.pct;
  if (delta >= IMPROVEMENT_THRESHOLD_PP) return "improved";
  if (delta <= -IMPROVEMENT_THRESHOLD_PP) return "declined";
  return "no_change";
}

export function toEvidenceJsonb(r: EvidenceResult): Record<string, unknown> {
  return r.kind === "ok"
    ? { available: true, ...r.snapshot }
    : { available: false, reason: r.reason };
}
