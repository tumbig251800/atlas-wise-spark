import { describe, it, expect } from "vitest";
import { Packer } from "docx";
import JSZip from "jszip";
import { buildTeachingLogsDocument } from "@/lib/downloadTeachingLogsDocx";
import type { Tables } from "@/integrations/supabase/types";

type TeachingLog = Tables<"teaching_logs">;

const log = (over: Partial<TeachingLog>): TeachingLog =>
  ({
    teaching_date: "2026-09-01",
    teacher_name: "ครูทดสอบ",
    subject: "คณิตศาสตร์",
    grade_level: "ป.4",
    classroom: "1",
    learning_unit: "หน่วยที่ 3 เศษส่วน",
    topic: "การบวกเศษส่วน",
    total_students: 30,
    mastery_score: 3,
    major_gap: "k-gap",
    minor_gaps: ["p-gap"],
    activity_mode: "active",
    key_issue: "นักเรียนสับสนตัวส่วน",
    next_strategy: "ใช้แผ่นภาพเศษส่วน",
    reflection: "บรรทัดแรก\nบรรทัดสอง",
    remedial_ids: "12, 15",
    health_care_ids: null,
    classroom_management: null,
    ...over,
  }) as TeachingLog;

async function documentXml(logs: TeachingLog[]) {
  const buf = await Packer.toBuffer(buildTeachingLogsDocument(logs, { ownerLabel: "ครูทดสอบ" }));
  const zip = await JSZip.loadAsync(buf);
  return zip.file("word/document.xml")!.async("string");
}

describe("buildTeachingLogsDocument", () => {
  it("uses Thai labels instead of the old English ones", async () => {
    const xml = await documentXml([log({})]);
    for (const th of ["ระดับความเข้าใจของนักเรียน", "ปัญหาหลักที่พบ", "ด้านความรู้ (K-Gap)", "ปัญหารอง",
      "ลงมือปฏิบัติ (ระดับ 2)", "ประเด็นปัญหาสำคัญ", "แนวทางแก้ไขครั้งต่อไป", "สะท้อนผลการสอน",
      "นักเรียนสับสนตัวส่วน", "นักเรียนที่ต้องสอนซ่อมเสริม"]) {
      expect(xml).toContain(th);
    }
    for (const en of ["Mastery", "Key Issue", "Next Strategy", "Reflection"]) {
      expect(xml).not.toContain(en);
    }
    expect(xml).not.toContain("นักเรียนที่ต้องดูแลเป็นพิเศษ");
  });

  it("keeps teacher line breaks and orders logs by date", async () => {
    const xml = await documentXml([log({ teaching_date: "2026-09-10", topic: "เรื่องที่สอนทีหลัง" }), log({ topic: "เรื่องที่สอนก่อน" })]);
    expect(xml).toContain("<w:br/>");
    expect(xml.indexOf("เรื่องที่สอนก่อน")).toBeLessThan(xml.indexOf("เรื่องที่สอนทีหลัง"));
  });
});
