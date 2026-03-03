/**
 * Phase D: Competency framework A1-A6 (หลักสูตร)
 * K-P-A mapping for พีท ร่างทอง
 */

export type CompetencyKey = "a1" | "a2" | "a3" | "a4" | "a5" | "a6";

export const COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  a1: "การจัดการตนเอง",
  a2: "การคิดขั้นสูง",
  a3: "การสื่อสาร",
  a4: "การรวมพลังทำงานเป็นทีม",
  a5: "การเป็นพลเมืองที่เข้มแข็ง",
  a6: "การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน",
};

export const COMPETENCY_DESCRIPTIONS: Record<CompetencyKey, string> = {
  a1: "วางแผน ควบคุมตนเอง รับผิดชอบงานจนสำเร็จ มีวินัย",
  a2: "คิดวิเคราะห์ เชื่อมโยง สังเคราะห์ แก้ปัญหาอย่างมีเหตุผล",
  a3: "พูด เขียน นำเสนอ รับฟัง และสื่อสารอย่างสร้างสรรค์",
  a4: "ทำงานร่วมกับผู้อื่น เคารพความคิดเห็น ช่วยเหลือกัน",
  a5: "มีวินัย ซื่อสัตย์ รับผิดชอบ มีจิตสาธารณะ",
  a6: "ใช้เทคโนโลยีอย่างรู้เท่าทัน ดูแลสิ่งแวดล้อม ใช้ทรัพยากรอย่างรับผิดชอบ",
};

/** K-P-A gap type to competency mapping */
export const KPA_TO_COMPETENCIES: Record<string, CompetencyKey[]> = {
  K: ["a2"],
  P: ["a1", "a6"],
  A: ["a3", "a4", "a5"],
};

export const RUBRIC_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "เริ่มต้น",
  2: "พัฒนา",
  3: "ชำนาญ",
  4: "เชี่ยวชาญ",
};
