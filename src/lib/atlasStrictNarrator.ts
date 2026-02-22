// ATLAS STRICT DIAGNOSTIC MODE v1.3 — Deterministic Narrator

export interface DecisionObject {
  engine_version: string;
  computed_at: string;
  teaching_log_id: string;
  class_id: string;
  subject: string;
  normalized_topic: string;
  gap_rate: number;
  class_strike_count: number;
  intervention_size: string;
  signal_color: string | null;
  pivot_triggered: boolean;
  pivot_event_id: string | null;
  reason_codes: string[];
  evidence_refs: (string | object)[];
}

export type Verdict = "NO_PIVOT" | "PLAN_FAIL" | "FORCE_PIVOT";

export interface StrictAnswer {
  ok: boolean;
  verdict: Verdict;
  answer_th: string;
  debug: string;
}

export interface StrictContext {
  date: string;
  classId: string;
  subject: string;
  topic: string;
  decision: DecisionObject;
}

export function buildStrictAnswerTH(ctx: StrictContext): StrictAnswer {
  const d = ctx.decision;

  // Determine verdict purely from decision_object
  let verdict: Verdict = "NO_PIVOT";
  if (d.pivot_triggered || d.intervention_size === "force-pivot") {
    verdict = "FORCE_PIVOT";
  } else if (d.class_strike_count === 1 || d.intervention_size === "plan-fail") {
    verdict = "PLAN_FAIL";
  }

  const debug = `[v${d.engine_version}] ${ctx.classId} | ${ctx.subject} | ${ctx.topic} | gap_rate=${d.gap_rate.toFixed(1)}% | strike=${d.class_strike_count} | signal=${d.signal_color ?? "none"} | pivot=${d.pivot_triggered}`;

  let answer_th: string;
  switch (verdict) {
    case "FORCE_PIVOT":
      answer_th = `🔴 เข้า PIVOT MODE (FORCE PIVOT)\nห้อง ${ctx.classId} วิชา ${ctx.subject} หัวข้อ "${ctx.topic}"\nGap Rate: ${d.gap_rate.toFixed(1)}% | Strike สะสม: ${d.class_strike_count} → ระบบสั่ง PIVOT แล้ว\nPivot Event ID: ${d.pivot_event_id ?? "N/A"}`;
      break;
    case "PLAN_FAIL":
      answer_th = `🟠 ยังไม่เข้า PIVOT MODE — Strike 1 (PLAN FAIL SIGNAL)\nห้อง ${ctx.classId} วิชา ${ctx.subject} หัวข้อ "${ctx.topic}"\nGap Rate: ${d.gap_rate.toFixed(1)}% | Strike สะสม: ${d.class_strike_count}\nหากคาบถัดไป gap_rate > 40% อีกครั้ง → จะเข้า PIVOT MODE`;
      break;
    default:
      answer_th = `🟢 ปกติ — ไม่มีสัญญาณวิกฤต\nห้อง ${ctx.classId} วิชา ${ctx.subject} หัวข้อ "${ctx.topic}"\nGap Rate: ${d.gap_rate.toFixed(1)}% | Strike: ${d.class_strike_count}`;
  }

  return { ok: true, verdict, answer_th, debug };
}
