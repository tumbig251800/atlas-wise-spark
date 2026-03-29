import { describe, expect, it } from "vitest";
import { validateAiChatOutput } from "../../../supabase/functions/_shared/aiChatValidator.ts";

const emptyCtx = "";
const sampleCtx = `[REF-1] วันที่: 2026-01-01 | วิชา: คณิต | Mastery: 3/5 | Gap: P-Gap | Remedial: 1/30
[ACTIVE FILTER]
วิชา: คณิต
`;

const twoSessionCtx = `[REF-1] วันที่: 2026-01-01 | วิชา: คณิต | Mastery: 3/5 | Gap: P-Gap | Remedial: 1/30
[REF-2] วันที่: 2026-01-02 | วิชา: คณิต | Mastery: 2/5 | Gap: K-Gap | Remedial: 0/30
[ACTIVE FILTER]
วิชา: คณิต
`;

/** Minimal lines like Antigravity regression script (date prefix, Mastery on same line as [REF-n]) */
const antigravityTwoSessionCtx = `[REF-1] 2026-03-27: Mastery: 3/5 | Remedial: 0/30
[REF-2] 2026-03-28: Mastery: 2/5 | Remedial: 0/30
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

  it("allows PASS/STAY policy with Mastery threshold percents (no log REF)", () => {
    const out =
      "PASS หมายถึงนักเรียนผ่านเกณฑ์ซ่อมเสริมและระบบรีเซ็ต Strike กลับเป็น 0; STAY หมายถึงยังไม่ผ่านเกณฑ์ Strike จะเพิ่มขึ้น เกณฑ์ความสำเร็จมักผูกกับ Mastery ไม่ต่ำกว่า 70% ตามกรอบ ATLAS";
    const r = validateAiChatOutput(emptyCtx, out);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("no_claims");
  });

  it("allows Intervention policy with extra threshold-style percents (no log REF)", () => {
    const out =
      "Intervention Size: ไม่เกิน 25% ของห้องเป็น Individual; ช่วง 25–50% ใช้ Small Group; เกิน 50% พิจารณา Whole-Class Pivot ตามขนาดการช่วยเหลือของ ATLAS";
    const r = validateAiChatOutput(emptyCtx, out);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("no_claims");
  });

  it("rejects malformed REF labels in policy-style text", () => {
    const r = validateAiChatOutput(
      emptyCtx,
      "Strike แบ่งเป็น [REF-Strike 1/3] [REF-2/3] ตามระบบ ATLAS"
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("REF format is not numeric-only");
  });

  it("allows bracket Strike wording without REF prefix (not a citation)", () => {
    const r = validateAiChatOutput(
      emptyCtx,
      "ระดับแรกคือ [Strike 1/3] แจ้งเตือนครู ตามนโยบาย ATLAS"
    );
    expect(r.ok).toBe(true);
  });

  it("Phase 4.2: rejects single REF when citing two different Mastery scores from two sessions", () => {
    const r = validateAiChatOutput(
      twoSessionCtx,
      "### วิเคราะห์\nคาบล่าสุด Mastery 3/5 คาบก่อนหน้า 2/5 [REF-1]"
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("citation_presence_multi_session");
  });

  it("Phase 4.2: passes when two Mastery scores each have a distinct REF", () => {
    const r = validateAiChatOutput(
      twoSessionCtx,
      "### วิเคราะห์\nล่าสุด 3/5 [REF-1] คาบก่อน 2/5 [REF-2]"
    );
    expect(r.ok).toBe(true);
  });

  it("Phase 4.2 (Antigravity-style context): rejects single REF for two Mastery values", () => {
    const r = validateAiChatOutput(
      antigravityTwoSessionCtx,
      "สรุป: 3/5 และ 2/5 จากข้อมูล [REF-1]"
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("citation_presence_multi_session");
  });

  it("Phase 4.2 (Antigravity-style context): passes with both REFs", () => {
    const r = validateAiChatOutput(
      antigravityTwoSessionCtx,
      "คาบแรก 3/5 [REF-1] คาบถัดไป 2/5 [REF-2]"
    );
    expect(r.ok).toBe(true);
  });
});
