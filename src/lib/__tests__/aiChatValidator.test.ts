import { describe, expect, it } from "vitest";
import { validateAiChatOutput } from "../../../supabase/functions/_shared/aiChatValidator.ts";

const emptyCtx = "";
const sampleCtx = `[REF-1] วันที่: 2026-01-01 | วิชา: คณิต | Mastery: 3/5 | Gap: P-Gap | Remedial: 1/30
[ACTIVE FILTER]
วิชา: คณิต
`;

describe("validateAiChatOutput", () => {
  it("rejects grouped REF tokens (comma inside brackets)", () => {
    const r = validateAiChatOutput(
      sampleCtx,
      "สรุป [REF-1, REF-2] Mastery 3.6/5 จากข้อมูล"
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("REF format is not numeric-only");
  });

  it("rejects REF-ALL", () => {
    const r = validateAiChatOutput(sampleCtx, "เฉลี่ย [REF-ALL] ครับ");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("REF format is not numeric-only");
  });

  it("allows Whole-Class / Intervention policy answer with percents (no log REF)", () => {
    const out =
      "Whole-Class Pivot ใช้เมื่อสัดส่วนนักเรียนที่ต้องช่วยเหลือเกิน 40% ของห้อง; ช่วง 21–40% เป็น Small Group; ไม่เกิน 20% เป็น Individual ตาม Intervention Size Logic ของ ATLAS";
    const r = validateAiChatOutput(emptyCtx, out);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("no_claims");
  });

  it("allows Thai-only intervention policy with percent (no log REF)", () => {
    const out =
      "เมื่อนักเรียนที่ต้องช่วยเหลือเกินร้อยละ 40 ของห้อง ให้พิจารณาปรับแผนการสอนทั้งห้อง; ช่วงร้อยละ 21–40 จัดกลุ่มย่อย; ไม่เกินร้อยละ 20 ช่วยรายบุคคล ตามขนาดการช่วยเหลือของ ATLAS";
    const r = validateAiChatOutput(emptyCtx, out);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("no_claims");
  });

  it("requires REF when Mastery /5 appears with log context", () => {
    const r = validateAiChatOutput(
      sampleCtx,
      "Mastery เฉลี่ย 3.6/5 จากชุดคาบ"
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("claims_without_refs");
  });

  it("passes Mastery line with valid REF", () => {
    const r = validateAiChatOutput(
      sampleCtx,
      "Mastery เฉลี่ย 3.6/5 [REF-1]"
    );
    expect(r.ok).toBe(true);
  });

  it("allows Strike ladder fractions in policy-style answer without REF", () => {
    const r = validateAiChatOutput(
      emptyCtx,
      "Strike 1/3 แจ้งเตือนครู Strike 2/3 ประชุมกลุ่มสาระ Strike 3/3 ส่งต่อ ตามระบบ ATLAS"
    );
    expect(r.ok).toBe(true);
  });
});
