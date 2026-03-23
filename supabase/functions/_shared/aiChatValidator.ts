import { extractNumbersFromText } from "./numberExtractor.ts";

export interface AiChatValidationResult {
  ok: boolean;
  reason?: string;
}

const REF_NON_NUMERIC_RE = /\[REF-(?!\d+\])/i;
const REF_NUMERIC_RE = /\[REF-(\d+)\]/gi;
const ID_RE = /\bID\s*(\d{1,10})\b/gi;
const FRACTION_RE = /\b(\d+)\s*\/\s*(\d+)\b/g;
const PERCENT_RE = /(\d+(?:\.\d+)?)\s*%/g;
const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;

function hasClaims(output: string): boolean {
  // Claim-aware enforcement: only require REF if output contains factual claims.
  // Claims include numbers, dates, mastery/remedial mentions, ID mentions, or fractions/percent.
  if (FRACTION_RE.test(output)) return true;
  if (PERCENT_RE.test(output)) return true;
  if (DATE_RE.test(output)) return true;
  if (ID_RE.test(output)) return true;
  if (/\bMastery\b/i.test(output)) return true;
  if (/\bRemedial\b/i.test(output)) return true;
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
    for (const m of line.matchAll(/\b(\d{2,10})\b/g)) {
      allowed.add(m[1]);
    }
  }
  return allowed;
}

function contextHasTotalStudentsOrRemedialFraction(context: string): boolean {
  // Consultant context includes "Remedial: X/Y" when total_students exists; accept that.
  if (/Remedial:\s*\d+\s*\/\s*\d+/i.test(context)) return true;
  // If guard note says total_students exists, accept.
  if (/total_students.*มี/i.test(context)) return true;
  return false;
}

export function validateAiChatOutput(context: string, output: string): AiChatValidationResult {
  // 1) REF format enforcement
  if (REF_NON_NUMERIC_RE.test(output)) {
    return { ok: false, reason: "REF format is not numeric-only" };
  }

  const outputHasClaims = hasClaims(output);

  const allowedRefs = extractAllowedRefNumbers(context);
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
    // Advisory responses with no factual numbers/mastery/remedial are allowed without REF.
    const hasAdvisoryPhrase = /(แนะนำ|ควร|อย่างไร|เป็นอย่างไร|แบบไหน|ภาพรวม|สรุป)/.test(output);
    const hasNoFactualClaims = !/\b\d{2,}\b/.test(output) &&
      !/\bMastery\b/i.test(output) &&
      !/\bRemedial\b/i.test(output) &&
      !FRACTION_RE.test(output) &&
      !PERCENT_RE.test(output) &&
      !DATE_RE.test(output) &&
      !ID_RE.test(output);
    if (hasAdvisoryPhrase && hasNoFactualClaims) {
      return { ok: true, reason: "advice_only" };
    }
    return { ok: false, reason: "claims_without_refs" };
  }

  // 2) ID invention enforcement
  const allowedIds = extractAllowedIds(context);
  for (const m of output.matchAll(ID_RE)) {
    const id = m[1];
    if (!id) continue;
    if (!allowedIds.has(id)) {
      return { ok: false, reason: `ID ${id} not present in context` };
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

