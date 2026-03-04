/**
 * 2026 Curriculum: 8 capabilities (Basic + Functional Literacy)
 */
export type CapabilityKey2026 =
  | "reading"
  | "writing"
  | "calculating"
  | "sci_tech"
  | "social_civic"
  | "economy_finance"
  | "health"
  | "art_culture";

export const CAPABILITY_LABELS_2026: Record<CapabilityKey2026, string> = {
  reading: "การอ่าน",
  writing: "การเขียน",
  calculating: "การคิดคำนวณ",
  sci_tech: "วิทย์/เทคโนโลยี",
  social_civic: "สังคม/พลเมือง",
  economy_finance: "เศรษฐกิจ/การเงิน",
  health: "สุขภาพ",
  art_culture: "ศิลปะ/วัฒนธรรม",
};

export const CAPABILITY_KEYS_2026: CapabilityKey2026[] = [
  "reading",
  "writing",
  "calculating",
  "sci_tech",
  "social_civic",
  "economy_finance",
  "health",
  "art_culture",
];
