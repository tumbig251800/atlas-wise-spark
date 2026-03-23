# เอกสารรวบรวม: ปัญหา AI Consultant (พีท) และแนวทางแก้ไข

**สำหรับ:** Technical Architecture  
**โปรเจกต์:** ATLAS (atlas-wise-spark)  
**วันที่:** 2026-03-23  
**Supabase Project:** `ebyelctqcdhjmqujeskx`

---

## 1. Executive Summary

AI Consultant (พีท) ใช้ validation layer เพื่อป้องกัน data leakage และการอ้างอิงผิด โดยบังคับให้ AI อ้างอิง `[REF-X]` และ ID จาก context เท่านั้น แต่ validation เข้มงวดเกินไป ทำให้คำตอบที่ควรผ่านถูก reject

---

## 2. ปัญหาที่พบ (ลำดับเหตุการณ์)

### ปัญหา 1: คำถาม follow-up ตอบไม่ได้

**อาการ:** คำถามแรกตอบได้ แต่คำถามต่อมา ("ภาพรวมชั้นเรียน...", "มีคำแนะนำสำหรับครู...", "ทำบันทึกแจ้งครู...") ได้ "ไม่พบข้อมูลในระบบ..."

**สาเหตุ:** `hasClaims()` นับคำว่า "ชั้น", "ห้อง", "คน" เป็น claim → บังคับ REF → คำตอบเชิงคำแนะนำไม่มี REF → fail

**แก้ไขแล้ว:** ลบ "คน", "ห้อง", "ชั้น" ออกจาก pattern ใน `hasClaims()`

---

### ปัญหา 2: REF format is not numeric-only

**อาการ:** คำถาม "ภาพรวมป.1/1 วิชาการคิดคำนวณเป็นอย่างไรบ้าง" fail — สาเหตุ `REF format is not numeric-only`

**สาเหตุ:** Gemini สร้าง REF ในรูปแบบผิด เช่น `[REF-ภาพรวม]`, `[REF-สรุป]`, `[REF-1-20]` แทน `[REF-1]`, `[REF-2]`

**แก้ไขแล้ว:** Sanitize ก่อน validate — ลบ REF format ผิดด้วย regex ใน `ai-chat/index.ts`

---

### ปัญหา 3: ID 9421 not present in context

**อาการ:** หลังแก้ปัญหา 2 แล้ว คำถามภาพรวมยัง fail — สาเหตุ `ID 9421 not present in context`

**สาเหตุ:** `extractAllowedIds()` ดึง ID จาก guard note ซึ่ง `extractedRemedialIds` มาจาก **slice (20 คาบล่าสุด)** เท่านั้น ถ้า 9421 อยู่ใน log ที่ไม่อยู่ใน slice → ไม่อยู่ใน allowedIds → fail

**แก้ไขแล้ว:** ขยาย `extractedRemedialIds` ให้ดึงจาก `logs` ทั้งหมด แทน `slice`

---

## 3. โครงสร้างเทคนิคที่เกี่ยวข้อง

### Flow หลัก

```
Frontend (Consultant.tsx)
  → buildContextWithCitation(filteredLogs)  สร้าง context
  → POST /ai-chat { messages, context }
       ↓
Edge Function (ai-chat/index.ts)
  → Sanitize output (ลบ REF format ผิด)
  → validateAiChatOutput(systemContent, sanitized)
       ↓
aiChatValidator.ts
  → 1) REF format check
  → 2) REF ต้องอยู่ใน context
  → 3) hasClaims → ต้องมี REF
  → 4) advisory bypass (คำแนะนำ/ภาพรวม)
  → 5) ID invention check
  → 6) Remedial fraction check
       ↓
  fail → return error + meta.reason
  pass → return คำตอบ Gemini
```

### ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | รับ request, เรียก Gemini, sanitize, validate, return response |
| `supabase/functions/_shared/aiChatValidator.ts` | logic validation ทั้งหมด |
| `src/pages/Consultant.tsx` | `buildContextWithCitation()` สร้าง context + guard note |
| `src/hooks/useDashboardData.ts` | ดึง logs, filter |

### โครงสร้าง Context ที่ส่งให้ AI

```
## ข้อมูลการสอนที่กรองแล้ว (N คาบ)
Mastery เฉลี่ย: X/5

### รายละเอียด (ใช้ [REF-X] อ้างอิงเสมอ):
[REF-1] วันที่: ... | วิชา: ... | Remedial: X/Y | ...
...
[REF-20] ...

[GUARD RULES]
- REF ที่ถูกต้อง: [REF-1], ... [REF-20]
- Remedial IDs ที่พบใน context: 9411, 9421  (หรือ "ไม่มี")
- total_students ใน context: มี/ไม่มี
```

---

## 4. สิ่งที่แก้ไปแล้ว (สรุป)

| รายการ | ไฟล์ | สถานะ |
|--------|------|--------|
| ลบ "คน", "ห้อง", "ชั้น" จาก hasClaims | aiChatValidator.ts | ✅ |
| ขยาย slice เป็น 20 คาบ (REF-1..REF-20) | Consultant.tsx | ✅ |
| Advisory bypass (คำแนะนำ/ภาพรวม ไม่บังคับ REF) | aiChatValidator.ts | ✅ |
| Fallback เมื่อ REF format ผิด + advisory | aiChatValidator.ts | ✅ |
| Sanitize REF format ผิดก่อน validate | ai-chat/index.ts | ✅ |
| Regex lastIndex reset | aiChatValidator.ts | ✅ |
| แสดง meta.reason ใน error message | ai-chat/index.ts | ✅ |
| History sync filter กับ Consultant | History.tsx | ✅ |
| **extractedRemedialIds จาก logs ทั้งหมด** | Consultant.tsx | ✅ |

---

## 5. แนวทางแก้ที่ใช้

### แก้ปัญหา ID not present in context

**ที่แก้:** `Consultant.tsx` — `buildContextWithCitation`

เปลี่ยน `extractedRemedialIds` จาก `slice` เป็น `logs`:

```typescript
const extractedRemedialIds = [...new Set(
  logs.flatMap((l) => (l.remedial_ids || "").split(","))
    .map((s) => s.trim())
    .filter((s) => s && s !== "[None]" && s !== "[N/A]")
)];
```

---

## 6. กรณีทดสอบ

| เคส | คำถาม | ผลที่คาดหวัง |
|-----|--------|--------------|
| 1 | "สวัสดีพีท" | ตอบได้ พร้อม [REF-X] |
| 2 | "ป.1/1 วิชาการคิดคำนวณ มีเด็กคนไหนต้องดูแลเป็นพิเศษ" | ตอบได้ + [REF-X] + รหัสนักเรียน |
| 3 | "ภาพรวมป.1/1 วิชาการคิดคำนวณเป็นอย่างไรบ้าง" | ตอบได้ ไม่ error |
| 4 | "มีคำแนะนำสำหรับครูที่สอนวิชา การคิดคำนวณ ป.1/1 หรือไม่" | ตอบได้ ไม่ error |
| 5 | "เลข id 3345 วิชาการคิดคำนวณ ป.1/1 เป็นอย่างไรบ้าง" | block (ID ไม่อยู่ใน context) |

---

## 7. ข้อมูลสำหรับการวิเคราะห์ต่อ

- Validation rules: `supabase/functions/_shared/aiChatValidator.ts` (~140 บรรทัด)
- Context building: `src/pages/Consultant.tsx` ฟังก์ชัน `buildContextWithCitation`
- System prompt: `supabase/functions/ai-chat/index.ts` (~180 บรรทัด)
- เอกสารโปรเจกต์: `docs/PROJECT-EDGE-AI-SUMMARY-2026-03.md`
- Deploy: `npx supabase functions deploy ai-chat`

---

## 8. สรุปสำหรับ Technical Architecture

ปัญหาหลักคือ validation เข้มงวดเกินไป จากการแก้ไขหลายรอบ ปัญหาส่วนใหญ่ได้รับการแก้แล้ว ปัญหาล่าสุด "ID not present in context" แก้โดยขยาย allowed IDs ให้ครอบคลุม logs ทั้งชุดที่ filter แล้ว
