/**
 * studentReportRules.ts
 * กฎการคำนวณ "รายงานภาพรวมพัฒนาการนักเรียน" (K/P/A หลังหน่วย + PBL)
 * ล้วนเป็นการคำนวณจากคะแนนจริง ไม่มี AI — กฎ 3 ชั้นตามที่ตกลงกันไว้:
 *  1. ไม่อวดเกินจริง — จุดเด่นต้องมาจากด้านที่ถึงระดับ "ดี" ขึ้นไปจริง
 *  2. เจาะจงจุดที่ควรพัฒนาจากสัญญาณที่ต่ำสุดจริง (ไม่ใช่แค่ชื่อด้าน)
 *  3. ทิปที่บ้านต้องตรงกับจุดที่ควรพัฒนา ไม่ใช่สุ่ม
 */

export type Level = "ดีเยี่ยม" | "ดี" | "กำลังพัฒนา";

export function levelFromPercent(pct: number): Level {
  if (pct >= 80) return "ดีเยี่ยม";
  if (pct >= 60) return "ดี";
  return "กำลังพัฒนา";
}

export function levelFromPblResult(result: string | null): Level {
  if (result === "excellent") return "ดีเยี่ยม";
  if (result === "pass") return "ดี";
  return "กำลังพัฒนา"; // fail หรือไม่มีข้อมูล
}

// ชื่อวิชาหลักสูตรฐานสมรรถนะ (ป.1-3) → ชื่อที่ผู้ปกครองคุ้นเคย ใส่วงเล็บกันสับสน
export const SUBJECT_FRIENDLY_NAME: Record<string, string> = {
  "การอ่านและการเขียนเพื่อการสื่อสาร": "ภาษาไทย",
  "การคิดคำนวณ": "คณิตศาสตร์",
  "การเรียนรู้เพื่อเข้าใจธรรมชาติและวิทยาศาสตร์": "วิทยาศาสตร์",
};

// unit_name เป็น free text บางแถวเก่ากรอกเป็น "หน่วยที่ 1" แทน "1" — ดึงเฉพาะเลขหน่วย
// (ใช้ logic เดียวกับ UnitScoreAdminOverview.tsx เพื่อไม่ให้แสดงผลสับสน)
export function normalizeUnitNumber(unitName: string): string {
  const match = unitName.match(/\d+/);
  return match ? match[0] : unitName.trim();
}

// คำอธิบายสั้นๆ แสดงใต้หัวข้อในรายงาน กันผู้ปกครองไม่คุ้นศัพท์
export const UNIT_SCORE_EXPLANATION =
  "คะแนนที่ครูวัดหลังจบแต่ละหน่วยการเรียนรู้ แบ่งเป็น K ความรู้ความเข้าใจ P ทักษะ/กระบวนการ และ A เจตคติ";
export const PBL_EXPLANATION =
  "PBL (Project-Based Learning) คือการเรียนรู้ผ่านการลงมือทำโครงงานจริง ฝึกให้นักเรียนคิด วางแผน แก้ปัญหา และทำงานร่วมกับผู้อื่น";

/** ป.1-3 vs ป.4-6 ใช้เลือกโทน/ความซับซ้อนของทิปให้เหมาะกับวัย (เด็กประถม ไม่ใช่เด็กอนุบาล) */
export function isJuniorPrimary(gradeLevel: string): boolean {
  return ["ป.1", "ป.2", "ป.3"].includes(gradeLevel);
}

export const PBL_AXES = [
  {
    key: "com_score", label: "การสื่อสาร",
    tipJunior: "ชวนน้องเล่าเรื่องราวในแต่ละวันอย่างละเอียด ฝึกพูดให้ครบประเด็น (ใคร ทำอะไร ที่ไหน อย่างไร) และฝึกฟังผู้อื่นพูดจนจบก่อนตอบ",
    tipSenior: "ชวนน้องนำเสนอความคิดเห็นหรือถกประเด็นต่างๆ ในครอบครัว ฝึกพูดแสดงเหตุผลสนับสนุนความคิดของตัวเองอย่างมีระบบ",
  },
  {
    key: "think_score", label: "การคิด",
    tipJunior: "ชวนน้องเล่นเกมฝึกตรรกะ เช่น หมากรุก จับผิดภาพ หรือให้ลองอธิบายเหตุผลก่อนตัดสินใจเรื่องต่างๆ ในชีวิตประจำวัน",
    tipSenior: "ชวนน้องวิเคราะห์ข่าวหรือเหตุการณ์รอบตัว ตั้งคำถามเชิงเหตุผล เช่น \"ทำไมถึงเป็นแบบนั้น\" \"มีทางเลือกอื่นไหม\"",
  },
  {
    key: "problem_score", label: "การแก้ปัญหา",
    tipJunior: "เมื่อน้องเจอปัญหา ให้ลองถามว่า \"คิดว่าจะแก้ยังไงได้บ้าง\" ก่อนช่วยแนะนำ ฝึกให้คิดหาทางออกด้วยตัวเองก่อน",
    tipSenior: "ให้น้องรับผิดชอบแก้ปัญหาที่ซับซ้อนขึ้นด้วยตัวเอง เช่น วางแผนการเดินทาง จัดการเวลาเรียน-เล่น แล้วให้สรุปสิ่งที่เรียนรู้จากผลลัพธ์",
  },
  {
    key: "life_score", label: "ทักษะชีวิต",
    tipJunior: "มอบหมายงานบ้านที่มีความรับผิดชอบต่อเนื่อง เช่น รดน้ำต้นไม้ จัดโต๊ะอาหาร และให้วางแผนเวลาทำการบ้านด้วยตัวเอง",
    tipSenior: "ให้น้องมีส่วนร่วมวางแผนและจัดการเรื่องในบ้าน เช่น งบใช้จ่ายค่าขนม จัดตารางเวลาตัวเอง เพื่อฝึกความรับผิดชอบ",
  },
  {
    key: "tech_score", label: "เทคโนโลยี",
    tipJunior: "ชวนน้องค้นหาข้อมูลที่สนใจจากอินเทอร์เน็ตภายใต้การดูแล แล้วฝึกแยกแยะว่าข้อมูลไหนน่าเชื่อถือ",
    tipSenior: "สนับสนุนให้น้องใช้เทคโนโลยีสร้างสรรค์ผลงาน เช่น ทำสื่อนำเสนอ ตัดต่อวิดีโอสั้นๆ ควบคู่กับฝึกใช้อย่างปลอดภัยและมีจริยธรรม",
  },
] as const;

const SUBJECT_TIP_BANK: { match: (subject: string) => boolean; tipJunior: string; tipSenior: string }[] = [
  {
    match: (s) => s.includes("อ่าน") || s.includes("ภาษาไทย") || s.includes("เขียน"),
    tipJunior: "ชวนน้องอ่านหนังสือที่สนใจวันละ 10-15 นาที แล้วให้เล่าเนื้อเรื่องหรือเขียนสรุปสั้นๆ ด้วยคำพูดตัวเอง",
    tipSenior: "ชวนน้องอ่านบทความหรือข่าวสั้นๆ แล้วสรุปใจความสำคัญ ฝึกเขียนแสดงความคิดเห็นต่อเรื่องที่อ่าน",
  },
  {
    match: (s) => s.includes("คิดคำนวณ") || s.includes("คณิตศาสตร์"),
    tipJunior: "ชวนน้องคิดเลขจากสถานการณ์จริง เช่น คิดเงินทอนตอนซื้อของ คำนวณเวลาเดินทาง ฝึกคิดในใจก่อนใช้เครื่องคิดเลข",
    tipSenior: "ชวนน้องแก้โจทย์ปัญหาจากสถานการณ์จริง เช่น วางแผนงบประมาณ คำนวณส่วนลด เพื่อเห็นประโยชน์ของคณิตศาสตร์ในชีวิตจริง",
  },
  {
    match: (s) => s.includes("ธรรมชาติ") || s.includes("วิทยาศาสตร์"),
    tipJunior: "ชวนน้องทำการทดลองเล็กๆที่บ้าน เช่น ปลูกพืชแล้วบันทึกการเจริญเติบโต หรือสังเกตปรากฏการณ์รอบตัวแล้วตั้งคำถามว่า \"ทำไมถึงเป็นแบบนี้\"",
    tipSenior: "ชวนน้องตั้งสมมติฐานและทดลองพิสูจน์ด้วยตัวเอง หรือดูสารคดีวิทยาศาสตร์แล้วอภิปรายสิ่งที่ได้เรียนรู้ร่วมกัน",
  },
  {
    match: (s) => s.includes("สังคม") || s.includes("พลเมือง"),
    tipJunior: "ชวนน้องพูดคุยเรื่องกฎระเบียบในบ้านและเหตุผลของกฎแต่ละข้อ ให้มีส่วนร่วมตัดสินใจเรื่องเล็กๆในครอบครัว",
    tipSenior: "ชวนน้องติดตามข่าวสังคม/ชุมชนรอบตัว แล้วพูดคุยแลกเปลี่ยนมุมมองว่าเกี่ยวข้องกับตัวเราอย่างไร",
  },
  {
    match: (s) => s.includes("อังกฤษ") || s.includes("จีน"),
    tipJunior: "ชวนน้องดูการ์ตูน/ฟังเพลงภาษาต่างประเทศสั้นๆ แล้วฝึกพูดประโยคง่ายๆตาม",
    tipSenior: "ชวนน้องฝึกสนทนาโต้ตอบสั้นๆ เป็นภาษาต่างประเทศในชีวิตประจำวัน หรือดูสื่อที่สนใจแบบมีซับไตเติล",
  },
];
const DEFAULT_TIP = "ให้กำลังใจและชมเชยความพยายามของน้องสม่ำเสมอ จะช่วยให้น้องมีแรงจูงใจเรียนต่อ";

function subjectTip(subject: string, isJunior: boolean): string {
  const entry = SUBJECT_TIP_BANK.find((b) => b.match(subject));
  if (!entry) return DEFAULT_TIP;
  return isJunior ? entry.tipJunior : entry.tipSenior;
}

export type UnitRow = {
  subject: string;
  unit_name: string;
  k_score: number; k_total: number;
  p_score: number; p_total: number;
  a_score: number; a_total: number;
  assessed_date: string | null;
};

export type PblRow = {
  project_name: string;
  com_score: number | null; think_score: number | null; problem_score: number | null;
  life_score: number | null; tech_score: number | null;
  total_score: number | null;
  overall_result: string | null;
  notes: string | null;
};

export type SubjectSummary = {
  subject: string;
  friendlyName: string | null;
  unitLabel: string;
  score: number;
  maxScore: number;
  percent: number;
  level: Level;
  prevPercent: number | null;
};

export type PblSummary = {
  projectName: string;
  axes: { key: string; label: string; score: number; max: number; percent: number }[];
  totalScore: number;
  maxTotal: number;
  overallResult: string | null;
  overallLevel: Level;
  notes: string | null;
};

export type ReportSignal = {
  kind: "subject" | "pbl-axis" | "pbl-overall";
  label: string;
  percent: number;
  level: Level;
};

export type StudentReport = {
  subjects: SubjectSummary[];
  pbl: PblSummary | null;
  overallLevel: Level;
  highlightText: string;
  improvementText: string;
  homeTips: string[];
};

function summarizeSubjects(unitRows: UnitRow[]): SubjectSummary[] {
  const bySubject = new Map<string, UnitRow[]>();
  for (const row of unitRows) {
    if (!bySubject.has(row.subject)) bySubject.set(row.subject, []);
    bySubject.get(row.subject)!.push(row);
  }

  const summaries: SubjectSummary[] = [];
  for (const [subject, rows] of bySubject) {
    const sorted = [...rows].sort((a, b) =>
      (a.assessed_date ?? "").localeCompare(b.assessed_date ?? "")
    );
    const latest = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

    const maxScore = latest.k_total + latest.p_total + latest.a_total;
    const score = latest.k_score + latest.p_score + latest.a_score;
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const prevPercent = prev
      ? Math.round(((prev.k_score + prev.p_score + prev.a_score) / (prev.k_total + prev.p_total + prev.a_total)) * 100)
      : null;

    summaries.push({
      subject,
      friendlyName: SUBJECT_FRIENDLY_NAME[subject] ?? null,
      unitLabel: `หน่วยที่ ${normalizeUnitNumber(latest.unit_name)}`,
      score,
      maxScore,
      percent,
      level: levelFromPercent(percent),
      prevPercent,
    });
  }

  return summaries.sort((a, b) => a.subject.localeCompare(b.subject, "th"));
}

function summarizePbl(pblRow: PblRow | null): PblSummary | null {
  if (!pblRow) return null;
  const axes = PBL_AXES.map((a) => {
    const score = (pblRow[a.key as keyof PblRow] as number | null) ?? 0;
    return { key: a.key, label: a.label, score, max: 3, percent: Math.round((score / 3) * 100) };
  });
  const maxTotal = axes.length * 3;
  const totalScore = pblRow.total_score ?? axes.reduce((s, a) => s + a.score, 0);

  return {
    projectName: pblRow.project_name,
    axes,
    totalScore,
    maxTotal,
    overallResult: pblRow.overall_result,
    overallLevel: levelFromPblResult(pblRow.overall_result),
    notes: pblRow.notes,
  };
}

/** ป้ายชื่อสำหรับแสดงในข้อความ (ใช้ friendlyName ถ้ามี) */
function displayName(subject: string, friendlyName: string | null): string {
  return friendlyName ? `${friendlyName} (${subject})` : subject;
}

export function buildStudentReport(unitRows: UnitRow[], pblRow: PblRow | null, gradeLevel: string): StudentReport {
  const subjects = summarizeSubjects(unitRows);
  const pbl = summarizePbl(pblRow);
  const isJunior = isJuniorPrimary(gradeLevel);

  // สัญญาณทั้งหมด (วิชา + แต่ละมิติ PBL) ใช้หาจุดที่ควรพัฒนาแบบเจาะจงที่สุด
  const allSignals: ReportSignal[] = [
    ...subjects.map((s) => ({
      kind: "subject" as const,
      label: displayName(s.subject, s.friendlyName),
      percent: s.percent,
      level: s.level,
    })),
    ...(pbl?.axes.map((a) => ({
      kind: "pbl-axis" as const,
      label: `PBL — ${a.label}`,
      percent: a.percent,
      level: levelFromPercent(a.percent),
    })) ?? []),
  ];

  // กฎ 1: จุดเด่นเลือกได้เฉพาะสัญญาณที่ถึงระดับ "ดี" ขึ้นไปจริง
  // PBL รวมนับเป็นจุดเด่นได้ก็ต่อเมื่อผลรวมไม่ตกเกณฑ์ (ไม่ใช่ fail) กันไม่ให้ขัดกับ badge ผลรวม
  const highlightCandidates = subjects
    .filter((s) => s.level !== "กำลังพัฒนา")
    .map((s) => ({ label: displayName(s.subject, s.friendlyName), percent: s.percent, level: s.level }));
  if (pbl && pbl.overallLevel !== "กำลังพัฒนา") {
    highlightCandidates.push({ label: `PBL — "${pbl.projectName}"`, percent: Math.round((pbl.totalScore / pbl.maxTotal) * 100), level: pbl.overallLevel });
  }
  const best = highlightCandidates.sort((a, b) => b.percent - a.percent)[0] ?? null;

  const highlightText = best
    ? `${best.label} ทำคะแนนได้${best.level === "ดีเยี่ยม" ? "ดีเยี่ยม" : "ดี"} ${best.percent}% แสดงถึงความตั้งใจและความรับผิดชอบในการเรียน`
    : "น้องกำลังปรับตัวและตั้งใจเรียนรู้ ควรให้กำลังใจและติดตามอย่างใกล้ชิดต่อไป";

  // กฎ 2: จุดที่ควรพัฒนาเลือกจากสัญญาณต่ำสุดจริงในทุกสัญญาณ (ละเอียดถึงระดับมิติ PBL ได้)
  const weakest = [...allSignals].sort((a, b) => a.percent - b.percent)[0] ?? null;
  let improvementText = "ยังไม่มีข้อมูลเพียงพอสำหรับสรุปจุดที่ควรพัฒนา";
  if (weakest) {
    if (weakest.kind === "pbl-axis" && pbl?.notes) {
      improvementText = `ด้าน${weakest.label.replace("PBL — ", "")}ในกิจกรรม PBL — ครูผู้สอนบันทึกไว้ว่า "${pbl.notes}"`;
    } else if (weakest.kind === "pbl-axis") {
      improvementText = `ด้าน${weakest.label.replace("PBL — ", "")}ในกิจกรรม PBL (${weakest.percent}%) ควรฝึกฝนเพิ่มเติม`;
    } else {
      improvementText = `วิชา${weakest.label} (${weakest.percent}%) ควรฝึกฝนเพิ่มเติม`;
    }
  }

  // กฎ 3: ทิปที่บ้านต้องตรงกับจุดอ่อนจริง — เอาสัญญาณต่ำสุด 2 อันดับที่ "คนละหมวด" กัน
  const sortedWeak = [...allSignals].sort((a, b) => a.percent - b.percent);
  const homeTips: string[] = [];
  const seenCategories = new Set<string>();
  for (const signal of sortedWeak) {
    if (signal.level === "ดีเยี่ยม") break; // ไม่ต้องให้ทิปถ้าไม่มีจุดอ่อนจริง
    const category = signal.kind === "pbl-axis" ? signal.label : "subject";
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    if (signal.kind === "pbl-axis") {
      const axis = PBL_AXES.find((a) => signal.label === `PBL — ${a.label}`);
      if (axis) homeTips.push(isJunior ? axis.tipJunior : axis.tipSenior);
    } else {
      const subj = subjects.find((s) => displayName(s.subject, s.friendlyName) === signal.label);
      if (subj) homeTips.push(subjectTip(subj.subject, isJunior));
    }
    if (homeTips.length >= 2) break;
  }
  if (homeTips.length === 0) homeTips.push(DEFAULT_TIP);

  // ระดับภาพรวม: เฉลี่ยทุกสัญญาณระดับวิชา + PBL รวม (ไม่ลงถึงมิติย่อย กันเอียงไปทาง PBL มากเกิน)
  const overallSignals = [
    ...subjects.map((s) => s.percent),
    ...(pbl ? [Math.round((pbl.totalScore / pbl.maxTotal) * 100)] : []),
  ];
  const overallPercent = overallSignals.length
    ? Math.round(overallSignals.reduce((s, v) => s + v, 0) / overallSignals.length)
    : 0;

  return {
    subjects,
    pbl,
    overallLevel: levelFromPercent(overallPercent),
    highlightText,
    improvementText,
    homeTips,
  };
}
