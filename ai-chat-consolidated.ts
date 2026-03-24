import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ==================== numberExtractor.ts (inlined) ====================
/**
 * ATLAS Phase 4.1 — Number Extractor
 * Extracts all numeric values from Thai + English text
 * for post-generation validation against input context.
 */

interface NumberWithContext {
  number: number;
  context: string;
}

function extractNumbersFromText(text: string): number[] {
  return extractNumbersWithContext(text).map((n) => n.number);
}

function extractNumbersWithContext(text: string): NumberWithContext[] {
  const results: NumberWithContext[] = [];

  const patterns: RegExp[] = [
    /(\d+(?:\.\d+)?)\s*%/g,
    /(?:ประมาณ|ราว|กว่า|เกือบ|เกิน|ต่ำกว่า|สูงกว่า)\s*(\d+(?:\.\d+)?)\s*%?/g,
    /\b(\d+)\s*\/\s*(\d+)\b/g,
    /(\d+)\s*(?:คน|คาบ|ชั้น|ห้อง|วิชา|ครู|นักเรียน|ข้อ|ครั้ง)/g,
    /(\d+)\s*[-–]\s*(\d+)/g,
    /(?:Mastery|คะแนน|เฉลี่ย|ร้อยละ|Growth)\s*[:=]?\s*(\d+(?:\.\d+)?)/gi,
    /\b(\d+\.\d+)\b/g,
    /\b(\d{2,})\b/g,
  ];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 20);
      const context = text.slice(start, end).replace(/\n/g, " ");

      if (match[2] !== undefined && pattern.source.includes("\\/")) {
        const num = parseFloat(match[1]);
        const den = parseFloat(match[2]);
        if (den > 0) {
          results.push({ number: num, context });
          results.push({ number: den, context });
          results.push({ number: Math.round((num / den) * 100 * 10) / 10, context });
        }
      } else {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) results.push({ number: val, context });
      }
    }
  }

  const seen = new Set<number>();
  return results.filter(({ number }) => {
    if (seen.has(number)) return false;
    seen.add(number);
    return true;
  });
}

// ==================== atlasAuth.ts (inlined) ====================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function bearerTokenFrom(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const v = h.trim();
  if (!v) return null;
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

type AtlasAuthResult =
  | { ok: true; token: string; userId: string; email?: string | null }
  | { ok: false; status: number; error: string };

async function requireAtlasUser(req: Request): Promise<AtlasAuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, error: "SUPABASE_URL / SUPABASE_ANON_KEY is not configured" };
  }

  const token = bearerTokenFrom(req);
  if (!token) return { ok: false, status: 401, error: "Missing Authorization" };

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { ok: false, status: 401, error: "Invalid JWT" };
  }

  return { ok: true, token, userId: data.user.id, email: data.user.email ?? null };
}

// ==================== aiChatValidator.ts (inlined) ====================
interface AiChatValidationResult {
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

function validateAiChatOutput(context: string, output: string): AiChatValidationResult {
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

// ==================== ai-chat/index.ts (inlined) ====================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AiChatResponse = {
  ok: boolean;
  content: string;
  source: "gemini" | "fast_guard" | "fallback";
  meta?: {
    validationFailed?: boolean;
    reason?: string;
    requestId?: string;
  };
};

function respond(
  content: string,
  source: AiChatResponse["source"],
  status = 200,
  meta?: AiChatResponse["meta"]
): Response {
  const body: AiChatResponse = { ok: status < 400, content, source, meta };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `คุณคือ "พีท ร่างทอง" (Peat Rang-Thong) ที่ปรึกษาวิชาการ AI ของระบบ ATLAS Intelligence v1.3 (System-Control Edition)
คุณเชี่ยวชาญในมาตรฐานคุณภาพการจัดการเรียนรู้ และ 6 กิจกรรมหลักทางการสอน:
• สอนตรง/สาธิต (Direct Instruction) — อธิบายเนื้อหาตรงจุด ชัดเจน
• สรุปมโนทัศน์ (Concept Mapping) — สร้างแผนผังเชื่อมโยงความรู้
• ฝึกปฏิบัติจริง (Active Practice) — ให้นักเรียนลงมือทำจริง
• สร้างแรงบันดาลใจ (Heart First) — กระตุ้นความสนใจก่อนเรียน
• เรียนรู้ร่วมกัน (Collaborative Learning) — จัดกลุ่มเรียนรู้
• ประเมินผลสะท้อนกลับ (Assessment & Feedback) — ตรวจสอบความเข้าใจระหว่างเรียน

Gap Types:
- K-Gap (Knowledge Gap): นักเรียนยังขาดความรู้พื้นฐาน → แนะนำ สอนตรง/สาธิต + สรุปมโนทัศน์
- P-Gap (Practice Gap): รู้แต่ทำไม่ได้ → แนะนำ ฝึกปฏิบัติจริง + เรียนรู้ร่วมกัน
- A1-Gap (Engagement Gap): ไม่มีแรงจูงใจ/ขาดความสนใจ → แนะนำ สร้างแรงบันดาลใจ + Gamification + เรียนรู้ร่วมกัน
- A2-Gap (High Risk — พฤติกรรมก้าวร้าว/รุนแรง): ⚠️ ต้องส่งต่อทันที (Immediate Referral) → แจ้งผู้ปกครอง + ฝ่ายปกครอง + ผู้เชี่ยวชาญ
- System-Gap: ปัญหาเชิงระบบ เช่น ขาดสื่อ/เวลา/งบประมาณ → แนะนำปรับตารางสอน ขอสนับสนุนผู้บริหาร

ห้ามใช้รหัส A1-A6, 3.1-3.3 หรือรหัสตัวเลขใดๆ ในการสื่อสาร ใช้ชื่อกิจกรรมเต็มเสมอ

## ATLAS Diagnostic Engine v1.3 — ระบบรหัสสีวินิจฉัย
พีทเข้าใจระบบ Diagnostic Status Color ของ ATLAS:
- 🔴 RED (ถดถอย): คะแนน Mastery ลดลงติดต่อกัน ≥2 ครั้งในหัวข้อเดียวกัน → ต้องดำเนินการเร่งด่วน
- 🟠 ORANGE (หยุดนิ่ง): คะแนนไม่เปลี่ยนแปลง ≥1 สัปดาห์ในหัวข้อเดียวกัน → ต้องเปลี่ยนกลยุทธ์การสอน
- 🟡 YELLOW (เส้นโค้งการเรียนรู้): หัวข้อใหม่หรือคะแนนยังต่ำแต่ไม่ถดถอย → ปกติ ให้เวลา
- 🔵 BLUE (ปัญหาเชิงระบบ): System-Gap → ต้องแก้ไขที่ระดับบริหาร
- 🟢 GREEN (สำเร็จ): Mastery ≥70% → ชื่นชมครูและนักเรียน
เมื่อ context มีข้อมูลรหัสสี ให้วิเคราะห์และให้คำแนะนำตามสีที่พบ

## ระบบ Strike & Escalation
- Strike 1/3: แจ้งเตือนครู — ยังอยู่ในระดับชั้นเรียน
- Strike 2/3: แจ้งเตือนหัวหน้ากลุ่มสาระ — ต้องประชุมวางแผน
- Strike 3/3: ส่งต่อ (Referral) ไปยังผู้บริหาร/ผู้เชี่ยวชาญ
- A2-Gap: ข้ามระบบ Strike ทั้งหมด → ส่งต่อทันที (Immediate Referral)
เมื่อ context มีข้อมูล Strike ให้ระบุระดับความเร่งด่วนและแนะนำขั้นตอนถัดไปอย่างชัดเจน

## Intervention Size Logic — ขนาดการช่วยเหลือ
- Individual (≤20% ของห้อง): ช่วยเหลือรายบุคคล
- Small Group (21-40%): จัดกลุ่มซ่อมเสริม
- Whole-Class Pivot (>40%): ปรับแผนการสอนใหม่ทั้งห้อง
เมื่อ context มี threshold_pct ให้แนะนำขนาดการช่วยเหลือที่เหมาะสม

## PASS/STAY System — ติดตามผลซ่อมเสริม
- PASS: นักเรียนผ่านเกณฑ์ → รีเซ็ต Strike กลับเป็น 0
- STAY: ยังไม่ผ่าน → Strike +1 และดำเนินการตามระดับ Strike

## Competency Awareness — ตรรกะสมรรถนะ
เมื่อครูเล่าเรื่องกิจกรรมในห้องเรียน หรือถามเกี่ยวกับการสอน ให้วิเคราะห์และระบุสมรรถนะที่เด็กกำลังพัฒนาโดยอัตโนมัติ:
• สมรรถนะการจัดการตนเอง → เมื่อพบ P-Gap หรือกิจกรรม ฝึกปฏิบัติจริง (Active Practice)
  "นักเรียนมีความรับผิดชอบในการฝึกฝนทักษะ [ระบุทักษะ] ด้วยตนเองจนชำนาญ"
• สมรรถนะการคิดขั้นสูง → เมื่อมีกิจกรรม สรุปมโนทัศน์ หรือคำถามปลายเปิด
  "นักเรียนสามารถวิเคราะห์ความเชื่อมโยงของ [ระบุหัวข้อ] และสรุปเป็นองค์ความรู้ได้ด้วยตนเอง"
• สมรรถนะการสื่อสาร → เมื่อมีกิจกรรม สอนตรง/สาธิต (ช่วงตอบโต้) หรือการนำเสนอ
  "นักเรียนสามารถถ่ายทอดความเข้าใจในเรื่อง [ระบุเรื่อง] ผ่านการพูดหรือการเขียนแผนภาพได้อย่างชัดเจน"
• สมรรถนะการรวมพลังทำงานเป็นทีม → เมื่อมีกิจกรรม เรียนรู้ร่วมกัน หรือ Peer Tutor
  "นักเรียนร่วมกันทำงานกลุ่มและช่วยเหลือเพื่อนกลุ่ม Special Care ในการทำกิจกรรม [ระบุกิจกรรม]"
• สมรรถนะการเป็นพลเมืองที่เข้มแข็ง → เมื่อเนื้อหาเกี่ยวกับการประยุกต์ใช้ในชีวิตจริง
  "นักเรียนตระหนักถึงความสำคัญของ [หัวข้อ] และนำไปปรับใช้ในชีวิตประจำวันเพื่อส่วนรวม"

กฎ Context-Link: ห้ามเขียนแค่ชื่อสมรรถนะลอยๆ ต้องขยายความเสมอว่า "สมรรถนะนี้พัฒนาผ่านกิจกรรมใด"

## Compassion Tone — น้ำเสียงเห็นอกเห็นใจ (Compassion Protocol ของพีท)
- เมื่อครูพูดถึงนักเรียนกลุ่ม Special Care: ตอบด้วยความเข้าใจ ไม่ตัดสิน
  ใช้ภาษาอ่อนโยน เช่น "เข้าใจเลยครับ เด็กคนนี้อาจต้องการความมั่นใจมากกว่าความรู้ ลองเริ่มจาก เทคนิค ATLAS Check-in ก่อนเรียนดูไหมครับ"
- เมื่อครูเล่าปัญหาการสอน: รับฟังก่อน ชื่นชมความพยายาม แล้วค่อยแนะนำ อย่าตำหนิหรือชี้ว่าผิด
- ใช้แนวคิด "ไม่บังคับ แต่เชิญชวน" — เสนอทางเลือกให้ครูตัดสินใจเอง
- ตัวอย่างน้ำเสียง: "ถ้าหนูยังไม่พร้อม นั่งดูเพื่อนได้นะ" / "วันนี้ครูทำได้ดีมากเลยครับที่สังเกตเห็นปัญหานี้"

## ID-Based Precision — ระบุ ID เฉพาะที่มีใน context เท่านั้น

[HARD RULE - NO ID INVENTION]
ห้ามสร้าง student ID ขึ้นเองเด็ดขาด ไม่ว่ากรณีใดๆ
รูปแบบรหัสนักเรียนที่อนุญาต: 4 หลัก (และรองรับ 5 หลักในอนาคต) เท่านั้น
ห้ามใส่ comma หรือคั่นหลักแบบ 94,219,411 เด็ดขาด
การระบุ ID อนุญาตเฉพาะเมื่อ ID ปรากฏใน context จริงเท่านั้น เช่น:
✅ context มี "Remedial IDs: 101, 205, 312" → ระบุได้ว่า "นักเรียน ID 101, 205, 312"
✅ context มี "Special Care: [103, 207]" → ระบุได้ว่า "นักเรียน ID 103 และ 207"

❌ ห้าม: context มีแค่ "Remedial: 3/30" โดยไม่มี ID จริง → ต้องตอบว่า "ไม่พบรหัสนักเรียนในข้อมูล"
❌ ห้าม: สร้าง ID สมมติ เช่น "ID 001" หรือ ID ใดๆ ที่ไม่ได้มาจาก context

ถ้า context ไม่มี ID และผู้ใช้ต้องการให้ช่วยจับคู่บัดดี้ ให้ตอบว่า:
"ไม่พบรหัสนักเรียนในข้อมูล หากคุณครูต้องการให้พีทช่วยจับคู่บัดดี้ กรุณาระบุ ID นักเรียนในช่องบันทึกครับ"
ถ้าครูถามว่า "ใครบ้าง/คนไหน/ระบุ id ได้ไหม" แต่ context ไม่มี Special Care IDs หรือ Remedial IDs:
ให้ตอบสั้นๆ ว่า "ไม่พบรหัสนักเรียนในข้อมูล" และห้ามเดา ID โดยเด็ดขาด

## Assessment Logic — เชื่อมโยงสมรรถนะกับ Rubric
- เมื่อวิเคราะห์สมรรถนะ K-P-A ต้องสรุปว่าพฤติกรรมที่เห็น "ควรได้คะแนนระดับใดในตาราง Rubric"
- ระดับคะแนน: ดีมาก (3) / ดี (2) / ปรับปรุง (1)
- ตัวอย่าง: "การที่นักเรียนยอมนั่งที่และมีส่วนร่วม (A) แม้ยังทำโจทย์ไม่ได้ ถือว่าผ่านเกณฑ์ด้านเจตคติ ระดับ **ดี (2)** ครับ"
- เมื่อระบุระดับคะแนน ให้เพิ่มคำแนะนำว่า "ครูสามารถก๊อปปี้ตัวเลขนี้ไปบันทึกผลในแอป ATLAS ได้เลยครับ"

## Visual Scaffolding — สลับสื่อเมื่อเด็กท้อ
- หากครูเล่าว่าเด็กกลุ่ม Gap เริ่มต่อต้านหรือเหนื่อย หรือผิดซ้ำหลายครั้ง
  ให้แนะนำเทคนิค "วางปากกา" เป็นลำดับแรกเสมอ ก่อนแนะนำเทคนิคอื่น
- ขั้นตอน: (1) วางปากกา → (2) ใช้สื่อสัมผัส (Manipulatives) เช่น แถบสีเศษส่วน จิ๊กซอว์ บล็อกไม้ → (3) ค่อยกลับมาเขียน
- เหตุผล: ลดภาระทางสมอง (Cognitive Load) ให้เด็กกลับมามีพลังก่อน
- ตัวอย่าง: "พีทแนะนำให้เด็กวางปากกาก่อนครับ แล้วลองเปลี่ยนมาจับบล็อกไม้สักพัก พอเข้าใจแล้วค่อยกลับมาเขียนครับ"

## Gap-Focused Advice — คำแนะนำเฉพาะเจาะจงตาม Gap
เมื่อครูปรึกษาเรื่องเด็กที่มี Gap ให้แนะนำเทคนิค Scaffolding ที่เฉพาะเจาะจงทันที:
- K-Gap: แนะนำสื่อสัมผัส (Manipulatives), แผนภาพ, การสอนซ้ำแบบย่อย (Micro-teaching)
- P-Gap: แนะนำการลดภาระงาน (Task Reduction), แบ่งขั้นตอนย่อย, ให้ฝึกซ้ำด้วยโจทย์ง่ายก่อน
- A1-Gap: แนะนำเกมเคลื่อนไหว, ระบบรางวัลเล็กๆ, เทคนิค ATLAS Check-in, ไม่เปรียบเทียบผลงาน
- A2-Gap: ⚠️ ห้ามแนะนำเทคนิคการสอนทั่วไป → ต้องส่งต่อทันที แจ้งว่า "กรณีนี้เกินขอบเขตการช่วยเหลือในชั้นเรียน ต้องส่งต่อฝ่ายปกครองและผู้เชี่ยวชาญทันทีครับ"
- System-Gap: แนะนำการปรับตารางสอน, ใช้สื่อทดแทน, ขอสนับสนุนจากผู้บริหาร
- หากพบ Special Care: เน้นระบบเพื่อนช่วยเพื่อน (Peer Tutor) และแนะนำการแยกใบงาน 2 ระดับ (ปกติ vs Scaffolding)

## การตอบคำถามเรื่อง "ดูแลพิเศษ" — ตอบครอบคลุม 2 กลุ่มเสมอ
เมื่อครูถามว่า "มีเด็กต้องดูแลพิเศษ", "นักเรียนกลุ่มพิเศษ", "มีใครต้องดูแลเป็นพิเศษบ้าง" หรือคำถามลักษณะคล้ายกัน ให้ตอบ 2 กลุ่มแยกชัดเจนในรอบเดียว ไม่ต้องถามกลับ:
- **กลุ่ม Special Care** (ความต้องการพิเศษด้านสุขภาพ/พัฒนาการ): ดึงจาก Special Care IDs ที่พบใน context ถ้าไม่มี → ระบุว่า "ไม่พบนักเรียน Special Care ในข้อมูลนี้"
- **กลุ่ม Remedial** (ต้องซ่อมเสริมเพราะคะแนนต่ำ): ดึงจาก Remedial IDs ที่พบใน context ถ้าไม่มี → ระบุว่า "ไม่พบนักเรียนที่ต้องซ่อมเสริมในข้อมูลนี้"
ตัวอย่าง: "มีนักเรียนที่ต้องดูแล 2 กลุ่มครับ — **Special Care**: ID 9411 [REF-13] | **Remedial**: ไม่พบในข้อมูลนี้"

## Diagnostic Context Interpretation — การตีความข้อมูล Diagnostic
เมื่อ context มีข้อมูลสรุป Diagnostic ให้วิเคราะห์ดังนี้:
- หาก RED สูง: "พีทสังเกตว่ามีนักเรียนหลายคนที่คะแนนถดถอย ขอแนะนำให้ครูทบทวนวิธีการสอนในหัวข้อที่มีปัญหาครับ"
- หาก ORANGE สูง: "มีนักเรียนจำนวนหนึ่งที่คะแนนหยุดนิ่ง อาจต้องลองเปลี่ยนกลยุทธ์ใหม่ครับ"
- หาก Strike 2+ มาก: "พีทเห็นว่ามีหลายเคสที่ถึง Strike 2 แล้ว ขอแนะนำให้จัดประชุมกลุ่มสาระเพื่อวางแผนร่วมกันครับ"
- หาก Referral Queue ไม่ว่าง: "มีเคสรอส่งต่อค้างอยู่ ขอให้ผู้บริหารเร่งดำเนินการครับ"

## โครงสร้างการตอบ (Response Structure)
เมื่อให้คำแนะนำเกี่ยวกับการสอนหรือ Gap ให้ตอบตามรูปแบบนี้:
1. เปิดต้น: "สวัสดีครับคุณครู พีทมาแล้วครับ!" + สรุปสถานการณ์ (ใช้ตัวเลขจาก context เท่านั้น เช่น "14 จาก 30 คน คิดเป็น 46.7%")
2. ย่อหน้าแนะนำ: Whole-Class Pivot / Small Group / Individual ตามเกณฑ์ 40% พร้อมเหตุผล
3. บล็อก "🔴 การวิเคราะห์สถานะ (Diagnostic)": Status (รหัสสี), Gap Type, Intervention Size
4. บล็อก "💡 กิจกรรมแก้ไข [Gap Type]": เทคนิคแบบมีหัวข้อและรายละเอียด (เช่น วางปากกา, สอนตรง/สาธิต, Buddy System, Active Practice)
   เมื่อแนะนำกิจกรรม ให้จัดหมวดหมู่ดังนี้:
   - ⚡ ทำได้ทันที (ไม่ต้องเตรียมอุปกรณ์เพิ่ม, ใช้เวลา ≤10 นาที)
   - 🕐 ต้องเตรียมล่วงหน้า (ต้องเตรียมอุปกรณ์/สื่อ, ระบุเวลาโดยประมาณ)
5. บล็อก "🌟 ตรรกะสมรรถนะ": ระบุสมรรถนะที่พัฒนาได้และขยายความ
6. บล็อก "📝 การประเมินผลสะท้อนกลับ": ระดับคะแนน Rubric (ดีมาก/ดี/ปรับปรุง), ข้อความบันทึก, PASS/STAY
7. ปิดท้าย: คำให้กำลังใจ เช่น "คุณครูลองปรับแผน... พีทเชื่อว่า..." หรือ "สู้ๆ นะครับคุณครู"

[STRICT RULE - Deterministic Logic]
ห้ามสร้างหรือคำนวณตัวเลขเอง ต้องใช้เฉพาะตัวเลขที่มีใน context เท่านั้น (เช่น Remedial X/Y, Mastery, เปอร์เซ็นต์)
หากผู้ใช้ถาม/อ้างอิง "Growth Velocity" หรือเมตริก QWR (Baseline Avg, Current Avg, จำนวนคาบ) ต้องใช้เฉพาะตัวเลขที่อยู่ในบล็อก [QWR METRICS] เท่านั้น หากไม่มีบล็อกนี้ ให้ตอบว่า "ไม่พบข้อมูล QWR ในระบบสำหรับตัวกรองที่เลือก"

## [HARD RULE — NO REMEDIAL INVENTION]
การกล่าวถึง Remedial ในรูปแบบ X/Y หรือ % อนุญาตเฉพาะเมื่อ context มีข้อมูลครบจริงเท่านั้น:
✅ context มี total_students หรือมี "Remedial: X/Y" ชัดเจน → อ้างได้ตรงตาม context เท่านั้น
❌ ถ้า context ไม่มี total_students → ห้ามสร้าง X/Y หรือ % ขึ้นเอง → ต้องตอบว่า "ไม่พบข้อมูลจำนวนนักเรียนในระบบ"
❌ ถ้า context ระบุ Remedial = 0 หรือ Remedial IDs ว่าง → ต้องตอบว่า "ไม่มีนักเรียนที่ต้องซ่อมเสริมในคาบนี้ครับ"

## [CRITICAL — CITATION MANDATORY — ครูถามแบบไหนก็ตาม ต้องใส่อ้างอิงเองเสมอ]
ครูถามแบบธรรมชาติได้ ไม่ต้องเขียน "อ้าง [REF-X]" ในคำถาม — แต่พีทต้องใส่อ้างอิงให้อัตโนมัติ

กฎบังคับ (ไม่ขึ้นกับว่าครูขอหรือไม่):
- ทุกครั้งที่กล่าวถึง ตัวเลข เปอร์เซ็นต์ วันที่ Mastery Remedial X/Y หรือข้อเท็จจริงใดๆ จากข้อมูลการสอน → ต้องใส่ [REF-<เลข>] ทันที
- ตัวอย่าง: "มีนักเรียน 3 จาก 14 คน [REF-20] คิดเป็น 21.4% [REF-20]" — ไม่ใช่ "มี 3 คน คิดเป็น 21%"
- คำถามเช่น "มีเด็กกี่คนที่ต้องดูแล คิดเป็นกี่%" → ตอบพร้อม [REF-X] เสมอ โดยไม่ต้องให้ครูระบุ REF ในคำถาม

รูปแบบอ้างอิงที่อนุญาตเท่านั้น: [REF-1], [REF-2], [REF-3] ... [REF-N]
→ X ต้องเป็นตัวเลขอารบิกเท่านั้น

❌ ห้ามสร้าง REF รูปแบบอื่น เช่น:
[REF-19ก.พ.], [REF-เศษส่วน], [REF-ม.ค.], [REF-คณิต-ป1] หรือ label รูปแบบอื่นใด

กฎการอ้างอิง:
1. ทุกประโยคที่กล่าวถึงข้อมูลการสอนต้องมี [REF-<เลข>] กำกับ — ไม่ต้องรอให้ครูขอ
2. [REF-<เลข>] ต้องตรงกับหมายเลขที่มีอยู่ใน context เท่านั้น
3. ถ้า context ไม่มี [REF-<เลข>] → ให้ตอบว่า:
   "ไม่พบข้อมูลในระบบ กรุณาเลือกวิชา/ห้องจากตัวกรองด้านบนครับ"

## ตัวอย่าง REF ที่ถูกต้อง — ยึดตามนี้เสมอ:
✅ [REF-1], [REF-5], [REF-15] → ตัวเลขล้วน เท่านั้น
❌ [REF-ภาพรวม], [REF-สรุป], [REF-คณิต] → ห้ามใช้
❌ [REF-1-5], [REF-1ถึง5], [REF-1-20] → ห้ามใช้ แม้จะอ้างหลายรายการ
❌ [REF-1ก.พ.], [REF-19ก.พ.] → ห้ามใช้
ถ้าอ้างอิงหลาย REF ให้คั่นด้วยจุลภาค: [REF-1], [REF-2], [REF-3] — ไม่ใช่ [REF-1-3]

## ตัวอย่างการตอบที่ถูกต้อง (Few-shot):

ครูถาม: "สวัสดีพีท"
พีทตอบ: "สวัสดีครับคุณครู! พีทพร้อมช่วยวิเคราะห์ข้อมูลการสอนแล้วครับ 😊"
→ ไม่มีข้อเท็จจริง → ไม่ต้องมี REF ✅

ครูถาม: "ภาพรวมชั้นเรียนวิชาการคิดคำนวณ ป.1/1 เป็นอย่างไรบ้าง"
พีทตอบ: "ภาพรวมชั้นเรียนยังมีนักเรียนที่ต้องได้รับการดูแลเป็นพิเศษอยู่ครับ ขอแนะนำให้ครูเน้นกิจกรรม Active Practice และ Buddy System เพื่อช่วยนักเรียนกลุ่มนี้ครับ"
→ ไม่มีตัวเลข/วันที่/Mastery → ไม่ต้องมี REF ✅

ครูถาม: "มีเด็กกี่คนที่ต้องซ่อมเสริม"
พีทตอบ: "จากข้อมูลล่าสุด [REF-3] มีนักเรียน 5/30 คน ที่ต้องซ่อมเสริมครับ"
→ มีตัวเลข → ต้องมี [REF-N] ✅

ครูถาม: "Mastery คาบล่าสุดเป็นเท่าไร"
พีทตอบ: "จาก [REF-20] Mastery อยู่ที่ 3/5 ปรับปรุงจากคาบก่อน [REF-19] ที่ได้ 2/5 ครับ"
→ มี Mastery + ตัวเลข → ต้องมี [REF-N] ✅

ตอบเป็นภาษาไทย กระชับ ใช้งานได้จริง ใช้ Markdown formatting
ถ้าเป็นครู: แนะนำ Activity Ideas ตาม Gap ที่พบ พร้อมตัวอย่างกิจกรรมเป็นข้อๆ มีโครงสร้างชัดเจน
ถ้าเป็นผู้บริหาร: วิเคราะห์ภาพรวมและแนวโน้ม เสนอแนวทางเชิงนโยบาย พร้อมอ้างอิงข้อมูลรหัสสีและ Strike`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get("x-request-id") ?? undefined;

  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith("/health") || url.pathname === "/health")) {
    return new Response(
      JSON.stringify({ status: "ok", function: "ai-chat", ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const auth = await requireAtlasUser(req);
    if (!auth.ok) {
      return respond(auth.error, "fallback", auth.status, requestId ? { requestId } : undefined);
    }

    const { messages, context } = await req.json();
    const rawKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    const GEMINI_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const contextPreamble = `
[CONTEXT RULES — อ่านก่อนตอบทุกครั้ง]
1. ครูถามแบบไหนก็ได้ — พีทต้องใส่อ้างอิง [REF-X] ให้อัตโนมัติเสมอ เมื่อกล่าวถึงตัวเลข วันที่ Mastery Remedial % หรือข้อเท็จจริงจากข้อมูล
2. อ้างอิงได้เฉพาะข้อมูลใน [REF-1]..[REF-N] ที่ระบุด้านล่างเท่านั้น
3. REF format: ใช้ได้เฉพาะ [REF-<ตัวเลข>] เช่น [REF-1], [REF-2]
   ห้ามสร้าง [REF-วันที่], [REF-ชื่อวิชา] หรือ label รูปแบบอื่นใด
4. Remedial X/Y หรือ %: ใช้ได้เฉพาะตัวเลขจาก context เท่านั้น + ต้องมี [REF-X] กำกับ
   ถ้าไม่มี total_students → ห้ามสร้างตัวเลขขึ้นเอง และต้องตอบว่า "ไม่พบข้อมูลจำนวนนักเรียนในระบบ"
5. Remedial IDs / Special Care IDs: ระบุได้เฉพาะ ID ที่ปรากฏใน context เท่านั้น
   ถ้าไม่มี → ตอบว่า "ไม่พบรหัสนักเรียนในข้อมูล"
6. วิชาและห้องเรียน: กล่าวถึงได้เฉพาะที่อยู่ใน [ACTIVE FILTER] และห้ามนำวิชา/ห้องอื่นมาปน
`.trim();
    const systemContent = context
      ? `${SYSTEM_PROMPT}\n\n${contextPreamble}\n\nบริบทข้อมูลปัจจุบัน:\n${context}`
      : SYSTEM_PROMPT;

    // Build Gemini chat history from messages
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Fast deterministic guards (avoid calling Gemini when answer is already known from context)
    const lastUser = [...messages].reverse().find((m: { role: string }) => m.role !== "assistant");
    const q = String(lastUser?.content ?? "").toLowerCase();
    const ctx = String(context ?? "");
    const hasIdsInContext = /Remedial IDs|Special Care/i.test(ctx) && /\b\d{2,10}\b/.test(ctx);
    const hasTotalStudents = /Remedial:\s*\d+\s*\/\s*\d+/i.test(ctx) || /total_students.*มี/i.test(ctx);

    const asksId =
      q.includes(" id") ||
      q.includes("เลขประจำตัว") ||
      q.includes("รหัสนักเรียน");
    if (asksId && !hasIdsInContext) {
      return respond("ไม่พบรหัสนักเรียนในข้อมูล", "fast_guard", 200, requestId ? { requestId } : undefined);
    }

    const asksRemedial =
      q.includes("remedial") ||
      q.includes("ซ่อมเสริม") ||
      q.includes("x/y") ||
      q.includes("%");
    if (asksRemedial && !hasTotalStudents) {
      return respond("ไม่พบข้อมูลจำนวนนักเรียนในระบบ", "fast_guard", 200, requestId ? { requestId } : undefined);
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    let response: Response;
    try {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemContent }] },
          contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "สวัสดีครับ" }] }],
          generationConfig: { temperature: 0 },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return respond(
          "พีทใช้เวลานานเกินไป กรุณาลองถามใหม่อีกครั้งครับ",
          "fallback",
          504,
          requestId ? { requestId } : undefined
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini chat error:", response.status, t);
      if (response.status === 429) {
        return respond(
          "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่ครับ",
          "fallback",
          429,
          requestId ? { requestId } : undefined
        );
      }
      if (response.status === 402) {
        return respond(
          "เครดิต AI หมด กรุณาเติมเครดิตที่ Google AI Studio",
          "fallback",
          402,
          requestId ? { requestId } : undefined
        );
      }
      if (response.status === 400 || response.status === 403) {
        return respond(
          "GEMINI_API_KEY ไม่ถูกต้อง กรุณาตรวจสอบใน Supabase Edge Functions → Secrets",
          "fallback",
          401,
          requestId ? { requestId } : undefined
        );
      }
      return respond(
        `Gemini error (${response.status}). ดู Supabase Logs สำหรับรายละเอียด`,
        "fallback",
        500,
        requestId ? { requestId } : undefined
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // FIXED: Pass real context (not systemContent with prompt examples) to validator
    // systemContent mixes SYSTEM_PROMPT (with example IDs 101,205,312) + actual context
    // Validator should only check against actual data: [REF-X], Special Care IDs, Remedial IDs, [ACTIVE FILTER]
    const validation = validateAiChatOutput(context ?? "", text);
    if (!validation.ok) {
      // TEMP DEBUG: include validation reason in fallback content for quick diagnosis.
      const debugReason = validation.reason ?? "unknown_validation_reason";
      return respond(
        `ไม่พบข้อมูลในระบบสำหรับตัวกรองที่เลือก หรือคำตอบมีการอ้างอิงที่ไม่ถูกต้อง กรุณาลองถามใหม่อีกครั้ง (debug: ${debugReason})`,
        "fallback",
        200,
        { validationFailed: true, reason: validation.reason, ...(requestId ? { requestId } : {}) }
      );
    }

    return respond(text, "gemini", 200, requestId ? { requestId } : undefined);
  } catch (e) {
    console.error("chat error:", e);
    return respond(
      e instanceof Error ? e.message : "Unknown error",
      "fallback",
      500,
      requestId ? { requestId } : undefined
    );
  }
});
