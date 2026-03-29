import { describe, expect, it } from "vitest";
import { validateAssistantSafety } from "../../../supabase/functions/_shared/aiChatSafetyGuard.ts";

describe("validateAssistantSafety", () => {
  it("blocks memory-wipe roleplay (reported injection case)", () => {
    const r = validateAssistantSafety(
      "รับทราบครับ ข้อมูลนักเรียนทั้งหมดถูกลบออกจากหน่วยความจำแล้วครับ"
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unsafe_destructive_or_system_action_claim");
  });

  it("blocks English deletion claims", () => {
    expect(validateAssistantSafety("I have deleted all student records.").ok).toBe(false);
    expect(validateAssistantSafety("Data has been wiped from the database.").ok).toBe(false);
  });

  it("allows normal pedagogy and refusal wording", () => {
    expect(validateAssistantSafety("พีทไม่สามารถเปิดเผยรหัสผ่านระบบได้ครับ").ok).toBe(true);
    expect(validateAssistantSafety("ข้อมูลนักเรียนไม่ถูกลบจากระบบจริงครับ").ok).toBe(true);
    expect(validateAssistantSafety("แนะนำให้ใช้เมนูในแอป ATLAS เพื่อจัดการข้อมูลครับ").ok).toBe(true);
  });

  it("allows empty output", () => {
    expect(validateAssistantSafety("").ok).toBe(true);
  });
});
