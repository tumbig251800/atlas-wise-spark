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

function hasClaims(output: string): boolean {
  // Claim-aware enforcement: only require REF if output contains factual claims.
  // Claims include numbers, dates, mastery/remedial mentions, ID mentions, or fractions/percent.
  const hasNullResultPhrase = /(ไม่พบ|ไม่มี)/.test(output);
  if (FRACTION_RE.test(output)) return true;
  if (PERCENT_RE.test(output)) return true;
  if (DATE_RE.test(output)) return true;
  if (ID_RE.test(output)) return true;
  if (/\bMastery\b/i.test(output)) return true;
  // Null-result responses (e.g. "ไม่พบ ... Remedial") should not be forced to add REF.
  if (/\bRemedial\b/i.test(output) && !hasNullResultPhrase) return true;
  if (/\bSpecial Care\b/i.test(output) && !hasNullResultPhrase) return true;
  if (/(คะแนน|เฉลี่ย|จำนวน|คาบ|วันที่)/.test(output)) return true;
  if (/\b\d{2,}\b/.test(output)) return true;
  return false;
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

  // 1) REF format enforcement
  if (REF_NON_NUMERIC_RE.test(output)) {
    // อนุญาตถ้าเป็นคำตอบเชิงคำแนะนำ/ภาพรวม และ ID ทุกตัวที่กล่าวถึงอยู่ใน context จริง
    const hasAdvisoryPhrase = /(แนะนำ|ควร|อย่างไร|เป็นอย่างไร|แบบไหน|ภาพรวม|สรุป|ไม่พบ|ไม่มี)/.test(output);
    if (hasAdvisoryPhrase && !hasInventedId()) {
      return { ok: true, reason: "advice_only_format_relaxed" };
    }
    return { ok: false, reason: "REF format is not numeric-only" };
  }

  const outputHasClaims = hasClaims(output);

  const allowedRefs = extractAllowedRefNumbers(context);
  REF_NUMERIC_RE.lastIndex = 0;
  for (const m of output.matchAll(REF_NUMERIC_RE)) {
    const n = m[1];
    if (n && allowedRefs.size > 0 && !allowedRefs.has(n)) {
      return { ok: false, reason: `REF-${n} not present in context` };
    }
  }

  // If there are no claims, do not require REF. (Greeting/general advice is allowed.)
  if (!outputHasClaims) {
    return { ok: true, reason: "no_claims" };
  }

  // If there are claims, require at least one numeric REF.
  const hasNumericRef = /\[REF-\d+\]/i.test(output);
  if (!hasNumericRef) {
    const hasAdvisoryPhrase = /(แนะนำ|ควร|อย่างไร|เป็นอย่างไร|แบบไหน|ภาพรวม|สรุป|ไม่พบ|ไม่มี)/.test(output);
    // อนุญาตถ้าเป็นคำตอบเชิงคำแนะนำ/ภาพรวม และ ID ทุกตัวที่กล่าวถึงอยู่ใน context จริง
    if (hasAdvisoryPhrase && !hasInventedId()) {
      return { ok: true, reason: "advice_only" };
    }
    return { ok: false, reason: "claims_without_refs" };
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
  // (We keep this narrow to avoid blocking harmless counts like \"2 ข้อ\")
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

