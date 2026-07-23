// PLC Impact Loop — status model (mirrors action_plan_items.impact_loop_status
// + the WP1A DB closure guard). Chain: Action Board → confirm → PLC → intervention
// → monitoring → close | continue.

export type ImpactLoopStatus =
  | "draft"
  | "awaiting_confirmation"
  | "confirmed"
  | "plc_planned"
  | "intervention_active"
  | "monitoring"
  | "closed"
  | "continued";

/** Linear steps shown in the stepper (closed/continued are the terminal outcomes). */
export const IMPACT_LOOP_STEPS: ImpactLoopStatus[] = [
  "draft",
  "awaiting_confirmation",
  "confirmed",
  "plc_planned",
  "intervention_active",
  "monitoring",
];

export const IMPACT_LOOP_LABEL: Record<ImpactLoopStatus, string> = {
  draft: "ร่าง",
  awaiting_confirmation: "รอยืนยันเคส",
  confirmed: "ยืนยันเคสแล้ว",
  plc_planned: "วางแผน PLC แล้ว",
  intervention_active: "กำลังแทรกแซง",
  monitoring: "กำลังติดตามผล",
  closed: "ปิดเคส (พิสูจน์ผลแล้ว)",
  continued: "ทำต่อรอบใหม่",
};

/** Short one-line description of what each step means for the teacher. */
export const IMPACT_LOOP_HINT: Record<ImpactLoopStatus, string> = {
  draft: "ระบบเสนอเคสจากข้อมูล ยังไม่ยืนยัน",
  awaiting_confirmation: "ตรวจร่างที่ AI เสนอ แล้วกดยืนยันเป็นเคสจริง",
  confirmed: "ยืนยันเคสแล้ว เลือกนักเรียนและวางแผนต่อได้",
  plc_planned: "ผูกเคสกับวง PLC ที่ผู้บริหารจัดแล้ว",
  intervention_active: "มีแผนแทรกแซงและกำลังดำเนินการ",
  monitoring: "บันทึกผล ก่อน/หลัง เพื่อพิสูจน์ว่าดีขึ้นจริง",
  closed: "ปิดเคสได้เมื่อผู้บริหารรับรองผลก่อน/หลังแล้ว",
  continued: "ยังไม่จบ เปิดรอบใหม่เพื่อพัฒนาต่อ",
};

/** 0-based index in the linear stepper; terminal states map to the last step. */
export function impactLoopStepIndex(status: ImpactLoopStatus | null): number {
  if (!status) return -1; // not started
  if (status === "closed" || status === "continued") return IMPACT_LOOP_STEPS.length - 1;
  return IMPACT_LOOP_STEPS.indexOf(status);
}

export function isImpactLoopStarted(status: ImpactLoopStatus | null): boolean {
  return status !== null;
}

export function isImpactLoopTerminal(status: ImpactLoopStatus | null): boolean {
  return status === "closed" || status === "continued";
}
