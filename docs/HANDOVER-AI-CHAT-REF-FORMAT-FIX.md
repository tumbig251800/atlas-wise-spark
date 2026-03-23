# Handover: แก้ REF format is not numeric-only (พีทตอบภาพรวมไม่ได้)

**สำหรับ:** Cowork / Technical Architecture  
**วันที่:** 2026-03-23  
**สถานะ:** ยังไม่ resolve — คำถาม "ภาพรวมป.1/1 วิชาการคิดคำนวณเป็นอย่างไรบ้าง" ยัง fail

---

## 1. ปัญหา

เมื่อถาม "ภาพรวมป.1/1 วิชาการคิดคำนวณเป็นอย่างไรบ้าง" ได้ข้อความ:

```
ไม่พบข้อมูลในระบบสำหรับตัวกรองที่เลือก หรือคำตอบมีการอ้างอิงที่ไม่ถูกต้อง
สาเหตุ: REF format is not numeric-only
```

---

## 2. สาเหตุ (จากการวิเคราะห์)

**Gemini สร้าง REF ในรูปแบบผิด** — ใช้ `[REF-ภาพรวม]`, `[REF-สรุป]`, `[REF-1-20]` ฯลฯ แทน `[REF-1]`, `[REF-2]`

Validator ใน `aiChatValidator.ts` อนุญาตเฉพาะ `[REF-<ตัวเลข>]` เท่านั้น

---

## 3. สิ่งที่แก้ไปแล้ว (ยังไม่เพียงพอ)

- เพิ่ม fallback: ถ้า REF format ผิด แต่มีคำว่า "ภาพรวม"/"อย่างไร" และไม่ระบุ ID → อนุญาต
- **แต่ fallback ไม่ trigger** — อาจเพราะคำตอบของ AI ไม่มีคำเหล่านั้นใน output หรือใช้ pattern อื่น (เช่น [REF-1-20])

---

## 4. แนวทางแก้ที่เสนอ

### แนวทาง A: Sanitize ก่อน validate (แนะนำ)

**ไอเดีย:** ลบ REF ที่ format ผิดออกจาก output ก่อน validate

```typescript
// ก่อน validateAiChatOutput
const sanitized = output.replace(/\[REF-[^\]]*\]/g, "");
const validation = validateAiChatOutput(systemContent, sanitized);
if (validation.ok) {
  return respond(output, "gemini", 200, ...);  // return ต้นฉบับ
}
```

ถ้า sanitized ผ่าน (เช่น เป็น advisory / no claims) → ยอมรับและ return output ต้นฉบับ

**ไฟล์:** `supabase/functions/ai-chat/index.ts` ตรงก่อนเรียก `validateAiChatOutput`

---

### แนวทาง B: ขยาย fallback ให้ครอบคลุม

เมื่อ REF format ผิด → **อนุญาตเสมอ** ถ้าไม่มี ID (ไม่ invent student ID)

```typescript
if (REF_NON_NUMERIC_RE.test(output)) {
  ID_RE.lastIndex = 0;
  if (!ID_RE.test(output)) {
    return { ok: true, reason: "format_relaxed_no_id" };
  }
  return { ok: false, reason: "REF format is not numeric-only" };
}
```

**ความเสี่ยง:** ปล่อยคำตอบที่ REF ผิดรูปแบบได้มากขึ้น

---

### แนวทาง C: ปรับ System Prompt ให้ Gemini ใส่ REF ถูกต้อง

เพิ่ม few-shot example ใน SYSTEM_PROMPT:

```
ตัวอย่างที่ถูก:
"ภาพรวมชั้นเรียน [REF-1] มี 20 คาบ..."
ตัวอย่างที่ผิด:
"[REF-ภาพรวม]" หรือ "[REF-สรุป]" — ห้ามใช้
```

---

## 5. ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|------|--------|
| `supabase/functions/_shared/aiChatValidator.ts` | validation logic |
| `supabase/functions/ai-chat/index.ts` | เรียก validate, return response |

---

## 6. หลังแก้

1. แก้โค้ดตามแนวทางที่เลือก
2. `npx supabase functions deploy ai-chat`
3. ทดสอบ: "ภาพรวมป.1/1 วิชาการคิดคำนวณเป็นอย่างไรบ้าง"
4. รายงานผล
