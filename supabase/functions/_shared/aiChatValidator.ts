import { extractNumbersFromText } from "./numberExtractor.ts";
export interface AiChatValidationResult {
  ok: boolean;
  reason?: string;
}

const REF_NON_NUMERIC_RE = /\[REF-(?!\d+\])/i;
const REF_NUMERIC_RE = /\[REF-(\d+)\]/gi;
const ID_RE = /\bID\s*[:：]?\s*(\d{1,10})\b/gi;
const FRACTION_RE = /\b(\d+)\s*\/\s*(\d+)\b/g;
const PERCENT_RE = /(\d+(?:\.\d+)?)\s*%/g;
const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;

/** ATLAS policy / framework wording — answer must also pass isLikelyPolicyFrameworkOnly guards below */
const POLICY_FRAMEWORK_KEYWORDS_RE =
  /(Whole-?Class|Small\s+Group|Intervention|ขนาดการช่วยเหลือ|Individual|Pivot|Strike|PASS|STAY|เกณฑ์|ทั้งห้อง|กลุ่มย่อย|รายบุคคล|ร้อยละ|เปอร์เซ็นต์|ปรับแผนการสอน|ซ่อมเสริม|Remedial|Special\s+Care|การส่งต่อ|Referral|Escalation|แจ้งเตือน|ประชุมกลุ่มสาระ|รีเซ็ต|ผ่านเกณฑ์|คงอยู่|PASS\/STAY|Diagnostic\s+Engine|สถานะสี)/i;

/** Mastery + digit allowed when clearly defining thresholds (not class-level metrics) */
const MASTERY_POLICY_DEFINITION_RE =
  /(เกณฑ์|GREEN|🟢|≥|>=|ไม่ต่ำกว่า|ความสำเร็จ|ผ่านเกณฑ์|สถานะสี|Diagnostic|ระดับ.*Mastery|Mastery.*ระดับ)/i;

/** Common ATLAS threshold / copy percentages in policy text (after keyword gate) */
const POLICY_WHITELIST_TWO_DIGIT = new Set([
  10, 12, 15, 20, 21, 25, 40, 41, 50, 70, 80, 90, 100,
]);

/** Strike ladder only (1/3, 2/3, 3/3) — policy text, not teaching-log metrics */
function isStrikeLadderFraction(a: number, b: number): boolean {
  return b === 3 && a >= 1 && a <= 3;
}

/**
 * True when output looks like it cites teaching logs / class metrics and should carry [REF-n].
 * Excludes pure ATLAS policy definitions (Intervention %, Whole-Class Pivot, Strike wording only).
 */
function requiresTeachingLogCitation(output: string): boolean {
  const hasNullResultPhrase = /(ไม่พบ|ไม่มี)/.test(output);

  if (/\[REF-/i.test(output)) return true;
  if (DATE_RE.test(output)) return true;

  if (/\bRemedial\b/i.test(output) && !hasNullResultPhrase && !isLikelyPolicyFrameworkOnly(output)) return true;
  if (/\bSpecial Care\b/i.test(output) && !hasNullResultPhrase && !isLikelyPolicyFrameworkOnly(output)) return true;

  if (/(?:\bID\b|รหัสนักเรียน)\s*[:：]?\s*\d{4,5}\b/i.test(output)) return true;
  if (/Remedial:\s*\d+/i.test(output)) return true;

  if (/\b\d+(?:\.\d+)?\s*\/\s*5\b/.test(output)) return true;

  FRACTION_RE.lastIndex = 0;
  let fractionNeedsRef = false;
  for (const m of output.matchAll(/\b(\d+)\s*\/\s*(\d+)\b/g)) {
    const a = parseInt(m[1] ?? "0", 10);
    const b = parseInt(m[2] ?? "0", 10);
    if (b === 5) {
      fractionNeedsRef = true;
      break;
    }
    if (isStrikeLadderFraction(a, b)) continue;
    if (b >= 10 || a >= 10) {
      fractionNeedsRef = true;
      break;
    }
    if (a >= 2 && b >= 2 && !(a <= 3 && b === 3)) {
      fractionNeedsRef = true;
      break;
    }
  }
  if (fractionNeedsRef) return true;

  PERCENT_RE.lastIndex = 0;
  if (PERCENT_RE.test(output)) {
    if (isLikelyPolicyFrameworkOnly(output)) return false;
    const teachingNearPercent =
      /\bMastery\b|Gap:|major_gap|\[REF-|ซ่อมเสริม|\d+\s*\/\s*5|คาบ|Remedial:|เฉลี่ย|จำนวนนักเรียน|Teaching Logs/i.test(
        output
      );
    if (teachingNearPercent) return true;
    return true;
  }

  if (/\bMastery\b/i.test(output)) {
    if (isLikelyPolicyFrameworkOnly(output) && !/\b\d+(?:\.\d+)?\s*\/\s*5\b/.test(output)) {
      return false;
    }
    if (/\b\d+(?:\.\d+)?\s*\/\s*5\b/.test(output)) return true;
    if (/เฉลี่ย/.test(output)) return true;
    if (/\bMastery\b[^.\n]{0,80}?\d/.test(output)) return true;
  }

  if (/(คะแนน|เฉลี่ย|จำนวน|คาบ|วันที่)/.test(output)) {
    if (/\d/.test(output) && !isLikelyPolicyFrameworkOnly(output)) return true;
  }

  if (/\b\d{2,}\b/.test(output)) {
    if (isLikelyPolicyFrameworkOnly(output)) return false;
    return true;
  }

  return false;
}

function isLikelyPolicyFrameworkOnly(output: string): boolean {
  if (!POLICY_FRAMEWORK_KEYWORDS_RE.test(output)) {
    return false;
  }
  if (/\d{4}-\d{2}-\d{2}|\[REF-|\b9\d{3}\b/i.test(output)) return false;
  if (/\bMastery\b/i.test(output) && /\d/.test(output)) {
    if (!MASTERY_POLICY_DEFINITION_RE.test(output)) return false;
  }
  const nums = [...output.matchAll(/\b(\d{2,})\b/g)].map((x) => parseInt(x[1] ?? "0", 10));
  for (const v of nums) {
    if (v >= 1900 && v <= 2099) return false;
    if (POLICY_WHITELIST_TWO_DIGIT.has(v)) continue;
    if (v <= 12) continue;
    return false;
  }
  return true;
}

/** When there is no data context, relax REF requirement only for safe policy-shaped answers */
function emptyContextAllowsSkipRefRequirement(output: string): boolean {
  if (!isLikelyPolicyFrameworkOnly(output)) return false;
  if (DATE_RE.test(output)) return false;
  if (/(?:\bID\b|รหัสนักเรียน)\s*[:：]?\s*\d{4,5}\b/i.test(output)) return false;
  if (/Remedial:\s*\d+/i.test(output)) return false;
  if (/\b\d+(?:\.\d+)?\s*\/\s*5\b/.test(output)) return false;
  return true;
}

function extractAllowedRefNumbers(context: string): Set<string> {
  const s = new Set<string>();
  for (const m of context.matchAll(REF_NUMERIC_RE)) {
    if (m[1]) s.add(m[1]);
  }
  return s;
}

function extractAllowedIds(context: string): Set<string> {
  // Only allow IDs explicitly shown in context (e.g. "Remedial IDs: 101,205" or "Special Care: [103,207]")
  // We keep it simple: any standalone 2+ digit numbers near keywords get counted as allowed IDs.
  const allowed = new Set<string>();
  const lines = context.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!lower.includes("remedial ids") && !lower.includes("special care") && !lower.includes("remedial ids ที่พบ")) continue;
    for (const m of line.matchAll(/\b(\d{4,5})\b/g)) {
      allowed.add(m[1]);
    }
  }
  return allowed;
}

function extractSubjectsFromContext(context: string): Set<string> {
  const subjects = new Set<string>();
  for (const line of context.split("\n")) {
    // Parse subjects only from REF session lines to avoid prompt/rule noise.
    if (!line.includes("[REF-") || !line.includes("วิชา:")) continue;
    const m = line.match(/วิชา:\s*([^|\n]+)/);
    const subject = m?.[1]?.trim();
    if (subject && subject !== "ไม่ระบุ" && subject !== "ทั้งหมด") {
      subjects.add(subject);
    }
  }
  return subjects;
}

function extractActiveFilterSubject(context: string): string | null {
  const m = context.match(/\[ACTIVE FILTER\][\s\S]*?วิชา:\s*([^\n]+)/);
  const subject = m?.[1]?.trim();
  if (!subject || subject === "ทั้งหมด") return null;
  return subject;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contextHasTotalStudentsOrRemedialFraction(context: string): boolean {
  // Consultant context includes "Remedial: X/Y" when total_students exists; accept that.
  if (/Remedial:\s*\d+\s*\/\s*\d+/i.test(context)) return true;
  // If guard note says total_students exists, accept.
  if (/total_students.*มี/i.test(context)) return true;
  return false;
}

/** REF id -> Mastery numerator from that context line (e.g. 3 from 3/5). */
function extractRefToMasteryNumerator(context: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of context.split("\n")) {
    const refM = line.match(/\[REF-(\d+)\]/);
    if (!refM?.[1]) continue;
    const mm = line.match(/Mastery:\s*(\d+(?:\.\d+)?)\s*\/\s*5/i);
    if (mm?.[1]) map.set(refM[1], mm[1]);
  }
  return map;
}

/**
 * Phase 4.2 — Citation presence: if the model cites two different Mastery /5 scores that appear
 * on different [REF-n] lines in context, it must emit at least two distinct numeric REF tags.
 */
function citationPresenceMultiSessionViolation(context: string, output: string): boolean {
  const refToM = extractRefToMasteryNumerator(context);
  if (refToM.size < 2) return false;

  const masteryInOutput = new Set<string>();
  for (const m of output.matchAll(/\b(\d+(?:\.\d+)?)\s*\/\s*5\b/g)) {
    if (m[1]) masteryInOutput.add(m[1]);
  }
  if (masteryInOutput.size < 2) return false;

  const unionRefs = new Set<string>();
  for (const v of masteryInOutput) {
    for (const [refId, mv] of refToM) {
      if (mv === v) unionRefs.add(refId);
    }
  }
  if (unionRefs.size < 2) return false;

  const refsInOutput = new Set<string>();
  for (const m of output.matchAll(/\[REF-(\d+)\]/gi)) {
    if (m[1]) refsInOutput.add(m[1]);
  }
  return refsInOutput.size < 2;
}

export function validateAiChatOutput(context: string, output: string): AiChatValidationResult {
  // Pre-compute allowedIds once — used in multiple bypass checks below
  const allowedIds = extractAllowedIds(context);

  // Helper: true ถ้า output กล่าวถึง ID ที่ไม่อยู่ใน allowedIds (สมมติขึ้นเอง)
  function hasInventedId(): boolean {
    ID_RE.lastIndex = 0;
    for (const m of output.matchAll(ID_RE)) {
      if (m[1] && !allowedIds.has(m[1])) return true;
    }
    return false;
  }

  // 1) REF format enforcement — never relax: invalid [REF-...] must fail validation
  if (REF_NON_NUMERIC_RE.test(output)) {
    return { ok: false, reason: "REF format is not numeric-only" };
  }

  let outputHasClaims = requiresTeachingLogCitation(output);
  if (outputHasClaims && !context.trim() && emptyContextAllowsSkipRefRequirement(output)) {
    outputHasClaims = false;
  }

  const allowedRefs = extractAllowedRefNumbers(context);
  // REF subset (O ⊆ C): any numeric [REF-n] in output must appear on context lines.
  // When context has no REF labels (C empty) but output cites REF → reject (hallucinated labels).
  REF_NUMERIC_RE.lastIndex = 0;
  const refsInOutput = new Set<string>();
  for (const m of output.matchAll(REF_NUMERIC_RE)) {
    if (m[1]) refsInOutput.add(m[1]);
  }
  if (refsInOutput.size > 0 && allowedRefs.size === 0) {
    return { ok: false, reason: "refs_missing_from_context" };
  }
  for (const n of refsInOutput) {
    if (!allowedRefs.has(n)) {
      return { ok: false, reason: `REF-${n} not present in context` };
    }
  }

  // If there are no claims, do not require REF. (Greeting/general advice is allowed.)
  if (!outputHasClaims) {
    return { ok: true, reason: "no_claims" };
  }

  // If output cites teaching logs / metrics, require at least one numeric REF.
  const hasNumericRef = /\[REF-\d+\]/i.test(output);
  if (!hasNumericRef) {
    return { ok: false, reason: "claims_without_refs" };
  }

  if (citationPresenceMultiSessionViolation(context, output)) {
    return { ok: false, reason: "citation_presence_multi_session" };
  }

  // 2) ID invention enforcement
  // Reject malformed comma-grouped IDs such as "ID 94,219,411".
  if (/(?:\bID\b|รหัสนักเรียน)\s*[:：]?\s*\d{1,3}(?:,\d{3})+\b/i.test(output)) {
    return { ok: false, reason: "Malformed student ID format (comma-separated)" };
  }

  ID_RE.lastIndex = 0;
  for (const m of output.matchAll(ID_RE)) {
    const id = m[1];
    if (!id) continue;
    if (id.length < 4 || id.length > 5) {
      return { ok: false, reason: `ID ${id} length is invalid (expected 4-5 digits)` };
    }
    if (!allowedIds.has(id)) {
      return { ok: false, reason: `ID ${id} not present in context` };
    }
  }

  // 2.1) Scope leakage enforcement — reject subjects outside ACTIVE FILTER.
  const activeSubject = extractActiveFilterSubject(context);
  if (activeSubject) {
    const knownSubjects = extractSubjectsFromContext(context);
    for (const subject of knownSubjects) {
      // Enforce only when answer explicitly mentions subject labels.
      const mentionsSubjectLabel = /(วิชา|subject)/i.test(output);
      const subjectMentionRe = new RegExp(`(?:วิชา\\s*)?${escapeRegExp(subject)}`, "i");
      if (subject !== activeSubject && mentionsSubjectLabel && subjectMentionRe.test(output)) {
        return { ok: false, reason: `Subject leakage detected: ${subject}` };
      }
    }
  }

  // 3) Remedial invention enforcement
  const hasRemedialEvidence = contextHasTotalStudentsOrRemedialFraction(context);
  const hasFraction = /\b(\d+)\s*\/\s*(\d+)\b/.test(output);
  const hasPercent = /(\d+(?:\.\d+)?)\s*%/.test(output);
  if ((hasFraction || hasPercent) && !hasRemedialEvidence) {
    // Allow % if it is present in context (e.g., QWR METRICS contains %)
    const ctxHasPercent = /%/.test(context);
    if (!ctxHasPercent) {
      return { ok: false, reason: "Remedial fraction/percent without total_students evidence" };
    }
  }

  // Extra guard: if output contains numbers not in context at all, block only for high-risk patterns.
  // (We keep this narrow to avoid blocking harmless counts like "2 ข้อ")
  const ctxNums = new Set(extractNumbersFromText(context).map((n) => String(n)));
  for (const m of output.matchAll(/(\d{2,10})/g)) {
    const num = m[1];
    // Skip if it is part of REF already.
    if (output.slice(Math.max(0, m.index - 6), m.index + 1).includes("[REF-")) continue;
    if (num && !ctxNums.has(num) && !allowedIds.has(num)) {
      // only block if it's introduced as an ID-like token (e.g. "ID 9411") handled above,
      // or remedial-like patterns handled above. Otherwise allow.
      continue;
    }
  }

  return { ok: true };
}