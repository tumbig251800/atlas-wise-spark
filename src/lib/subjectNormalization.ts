/**
 * subjectNormalization.ts
 * Single source of truth for canonical subject names + import-time normalization.
 *
 * Why: teachers' import files sometimes carry a non-standard spelling of a subject
 * (e.g. the ป.1-3 English subject was entered as 'การอ่านและการเขียนภาษาอังกฤษ'
 * instead of the canonical 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ'), which broke
 * matching between unit_assessments and teaching_logs. Normalizing at import time
 * keeps that drift out of the database.
 */

// ===== Canonical subject lists (moved here from Step1General.tsx) =====
// วิชาที่ชื่อเปลี่ยนไปตามหลักสูตรฐานสมรรถนะ (ป.1-3 พ.ศ. 2568) — ป.4-6 ยังใช้ชื่อเดิม
// เพราะหลักสูตรฐานสมรรถนะระดับประถมปลายยังไม่ประกาศใช้ อย่ารวมสองชุดนี้ไว้ใน list เดียวกัน
// ไม่งั้นครูจะเลือกชื่อวิชาผิดชั้นได้ (เคยเกิดขึ้นจริงกับ teaching_logs)
export const SUBJECTS_UPPER_PRIMARY = ["ภาษาไทย", "คณิตศาสตร์", "วิทยาศาสตร์"]; // ป.4-6
export const SUBJECTS_LOWER_PRIMARY = [
  "การอ่านและการเขียนเพื่อการสื่อสาร",
  "การคิดคำนวณ",
  "การเรียนรู้เพื่อเข้าใจธรรมชาติและวิทยาศาสตร์",
]; // ป.1-3

// วิชาที่ชื่อเหมือนกันทุกชั้น ไม่ได้เปลี่ยนตามหลักสูตรฐานสมรรถนะ
export const SUBJECTS_SHARED = [
  "การงานอาชีพ",
  "ศิลปะ",
  "สังคมศึกษา",
  "ภาษาจีน",
  "ภาษาอังกฤษเพื่อการสื่อสาร",
  "ประวัติศาสตร์",
  "หน้าที่พลเมือง",
  "ต้านทุจริต",
  "ความเป็นพลเมืองและชีวิตในสังคม",
  "การเรียนรู้ทักษะศิลปะและวัฒนธรรม",
  "พลศึกษาและสุขภาวะ",
  "สุขศึกษาและพลศึกษา",
  "ภาษาอังกฤษ",
  "ภาษาอังกฤษ KBW",
  "การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ",
];

const LOWER_GRADES = ["ป.1", "ป.2", "ป.3"];
const UPPER_GRADES = ["ป.4", "ป.5", "ป.6"];

/** วิชาที่ให้เลือกได้ตามระดับชั้น (ป.1-3 กับ ป.4-6 คนละชุดชื่อ) */
export function getSubjectsForGrade(gradeLevel: string): string[] {
  if (LOWER_GRADES.includes(gradeLevel)) {
    return [...SUBJECTS_LOWER_PRIMARY, ...SUBJECTS_SHARED];
  }
  if (UPPER_GRADES.includes(gradeLevel)) {
    return [...SUBJECTS_UPPER_PRIMARY, ...SUBJECTS_SHARED];
  }
  // ยังไม่เลือกชั้น — โชว์ทุกวิชาไปก่อน
  return [...SUBJECTS_LOWER_PRIMARY, ...SUBJECTS_UPPER_PRIMARY, ...SUBJECTS_SHARED];
}

// ===== Whitespace helper =====
/** trim + ยุบช่องว่างซ้ำ (รวม tab/newline) ให้เหลือช่องว่างเดียว เพื่อใช้เทียบชื่อ */
function collapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

// ชื่อวิชา canonical ทุกชั้น (ยุบช่องว่างแล้ว) สำหรับ lookup
const ALL_CANONICAL = new Set(
  [...SUBJECTS_UPPER_PRIMARY, ...SUBJECTS_LOWER_PRIMARY, ...SUBJECTS_SHARED].map(
    collapseWhitespace,
  ),
);

// ===== Alias map: ชื่อที่เคยกรอกผิด -> ชื่อ canonical =====
// เพิ่ม alias ใหม่ได้ที่นี่ (key = ชื่อที่เจอในไฟล์นำเข้า, value = ชื่อมาตรฐาน)
// ⚠️ ห้ามใส่ KBW ('ภาษาอังกฤษเสริม (KBW)' / 'ภาษาอังกฤษ KBW') — หลักสูตรพิเศษ ยังรอออกแบบรูปแบบกรอก
export const SUBJECT_ALIAS_MAP: Record<string, string> = {
  การอ่านและการเขียนภาษาอังกฤษ: "การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ",
};

// pre-collapse alias keys เพื่อให้ lookup ไม่สนใจช่องว่างส่วนเกิน
const ALIAS_LOOKUP = new Map<string, string>(
  Object.entries(SUBJECT_ALIAS_MAP).map(([k, v]) => [collapseWhitespace(k), v]),
);

export type SubjectNormalizationStatus = "canonical" | "aliased" | "unknown";

export interface SubjectNormalizationResult {
  /** ชื่อวิชาหลัง normalize (canonical เมื่อ status = canonical/aliased, ไม่งั้นคืน raw เดิม) */
  subject: string;
  status: SubjectNormalizationStatus;
  /** ค่า raw ที่รับเข้ามา (ไว้ log / เตือน) */
  original: string;
}

/**
 * แปลงชื่อวิชาให้เป็นมาตรฐาน ก่อน validate/insert
 *  - trim + ยุบช่องว่างซ้ำ ก่อนเทียบ
 *  - ตรง canonical อยู่แล้ว → 'canonical'
 *  - ตรง alias ที่รู้จัก → คืนชื่อ canonical + 'aliased'
 *  - ไม่รู้จัก → คืน raw เดิม + 'unknown' (ห้ามเดามั่ว)
 *
 * @param gradeLevel ระดับชั้น (ไม่บังคับ) — ใช้เลือกชุดวิชาของชั้นก่อน แล้ว fallback ทุกชั้น
 */
export function normalizeSubject(
  raw: string,
  gradeLevel?: string,
): SubjectNormalizationResult {
  const original = raw ?? "";
  const cleaned = collapseWhitespace(original);

  if (!cleaned) {
    return { subject: original, status: "unknown", original };
  }

  // 1) canonical อยู่แล้ว (เช็คชุดของชั้นก่อน ถ้าระบุ แล้ว fallback ทุกชั้น)
  const gradeSet = gradeLevel
    ? new Set(getSubjectsForGrade(gradeLevel).map(collapseWhitespace))
    : null;
  if ((gradeSet && gradeSet.has(cleaned)) || ALL_CANONICAL.has(cleaned)) {
    return { subject: cleaned, status: "canonical", original };
  }

  // 2) alias ที่รู้จัก → canonical
  const aliased = ALIAS_LOOKUP.get(cleaned);
  if (aliased) {
    return { subject: aliased, status: "aliased", original };
  }

  // 3) ไม่รู้จัก — ห้ามเดา คืน raw เดิม
  return { subject: original, status: "unknown", original };
}

/**
 * Helper สำหรับ importer: normalize + จัดการ side-effect ให้สม่ำเสมอทุก parser
 *  - aliased → แปลงเงียบๆ (ปลอดภัย) + log ว่าแปลงจากอะไรเป็นอะไร
 *  - unknown → ดันเข้า warnings ให้ครูเห็น (ไม่บล็อคการนำเข้า)
 * คืนค่าชื่อวิชาที่ควรบันทึกลงฐานข้อมูล
 */
export function resolveSubjectForImport(
  raw: string,
  gradeLevel: string | undefined,
  warnings: string[],
): string {
  const result = normalizeSubject(raw, gradeLevel);
  if (result.status === "aliased") {
    console.info(
      `[subjectNormalization] ปรับชื่อวิชา "${result.original}" → "${result.subject}" (ชื่อมาตรฐาน)`,
    );
  } else if (result.status === "unknown" && result.original.trim()) {
    warnings.push(`ชื่อวิชา "${result.original}" ไม่ตรงมาตรฐาน กรุณาตรวจสอบ`);
  }
  return result.subject;
}
