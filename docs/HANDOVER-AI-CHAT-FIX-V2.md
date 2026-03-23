# Handover: แก้ ai-chat validation ยัง fail ต่อ (Test 1-2 ไม่ผ่าน)

**สำหรับ:** Claude Cowork  
**วันที่:** 2026-03-23  
**สถานะ:** ต้องแก้ — deploy แล้วแต่ Test 1-2 ยังขึ้น "ไม่พบข้อมูล..."

---

## 1. ปัญหาปัจจุบัน

หลัง deploy ai-chat (แก้ hasClaims ลบ คน/ห้อง/ชั้น แล้ว) การทดสอบยังได้ผลดังนี้:

| เคส | คำถาม | ผลที่ได้ | ผลที่คาดหวัง |
|-----|-------|----------|--------------|
| 1 | "ป.1/1 วิชาการคิดคำนวณ มีเด็กคนไหนต้องดูแลเป็นพิเศษ" | ไม่พบข้อมูล... | ตอบได้ + [REF-X] |
| 2 | "ภาพรวมชั้นเรียนวิชา การคิดคำนวณ ป.1/1 เป็นอย่างไร" | ไม่พบข้อมูล... | ตอบได้ ไม่ error |
| 3 | "เลข id 3345 วิชาการคิดคำนวณ ป.1/1 เป็นอย่างไรบ้าง" | ไม่พบรหัสนักเรียนในข้อมูล | ต้อง block (ผ่านแล้ว) |

**Test 3 ผ่านแล้ว** (fast_guard ทำงานถูกต้อง)  
**Test 1-2 ยัง fail** → validation ยัง reject คำตอบของ Gemini

---

## 2. สาเหตุที่เป็นไปได้

1. **REF ไม่พอใน context** — `buildContextWithCitation` ใช้ `logs.slice(-10)` = มีแค่ REF-1 ถึง REF-10 ถ้า AI ใช้เลข REF สูงกว่า (เช่น จากความจำในแชท) → `REF-X not present in context` fail

2. **claims_without_refs** — คำตอบมีคำที่เป็น claim (เช่น วันที่, คาบ, จำนวน, ตัวเลข) แต่ AI ไม่ใส่ [REF-X] → fail

3. **คำตอบเชิงคำแนะนำไม่มี REF** — ประโยคแบบ "ภาพรวม...", "คำแนะนำ..." อาจไม่มีตัวเลข แต่มีคำเช่น "คาบ", "วันที่" ในประโยค → ยังถือเป็น claim → ต้องมี REF → AI ไม่ใส่ → fail

---

## 3. ภารกิจ: แก้ 2 จุด (เท่าที่จำเป็น)

### แก้ที่ 1: เพิ่มจำนวน REF ใน context (Consultant)

**ไฟล์:** `src/pages/Consultant.tsx`  
**ฟังก์ชัน:** `buildContextWithCitation` (บรรทัด ~58)

**เปลี่ยน:**
```typescript
const slice = logs.slice(-10);
```
**เป็น:**
```typescript
const slice = logs.slice(-20);
```

**เหตุผล:** ให้มี REF-1 ถึง REF-20 ใน context เพื่อลดโอกาส "REF-X not present in context"

---

### แก้ที่ 2: ผ่อนปรน validation สำหรับคำตอบเชิงคำแนะนำ (ai-chat)

**ไฟล์:** `supabase/functions/_shared/aiChatValidator.ts`  
**ฟังก์ชัน:** `validateAiChatOutput`

**เพิ่ม logic** ก่อนบรรทัดที่ check `claims_without_refs` (ก่อน `if (!hasNumericRef)`):

ถ้าคำตอบเป็น "คำแนะนำทั่วไป" (ไม่มีตัวเลขจริง ไม่มี Mastery/Remedial/เศษส่วน/เปอร์เซ็นต์) และมีคำบ่งชี้คำแนะนำ → ให้ผ่าน โดยไม่บังคับ REF

**เปลี่ยน** บล็อกเดิม:
```typescript
  const hasNumericRef = /\[REF-\d+\]/i.test(output);
  if (!hasNumericRef) {
    return { ok: false, reason: "claims_without_refs" };
  }
```

**เป็น:**
```typescript
  const hasNumericRef = /\[REF-\d+\]/i.test(output);
  if (!hasNumericRef) {
    const hasAdvisoryPhrase = /(แนะนำ|ควร|อย่างไร|เป็นอย่างไร|แบบไหน|ภาพรวม|สรุป)/.test(output);
    const hasNoFactualClaims = !/\b\d{2,}\b/.test(output) && !/\bMastery\b/i.test(output) &&
      !/\bRemedial\b/i.test(output) && !FRACTION_RE.test(output) && !PERCENT_RE.test(output) &&
      !DATE_RE.test(output) && !ID_RE.test(output);
    if (hasAdvisoryPhrase && hasNoFactualClaims) {
      return { ok: true, reason: "advice_only" };
    }
    return { ok: false, reason: "claims_without_refs" };
  }
```

**เหตุผล:** คำตอบเชิงคำแนะนำ (เช่น "ภาพรวม...เป็นอย่างไร") ที่ไม่มีตัวเลข/ Mastery/Remedial → ให้ผ่านโดยไม่บังคับ REF

---

## 4. สิ่งที่ห้ามแก้

- REF format, REF-in-context check
- ID invention blocking
- Remedial fraction/percent blocking
- ข้อความ error ที่ user เห็น (คงเดิม)

---

## 5. หลังแก้แล้ว

1. Commit + push
2. Deploy: `npx supabase functions deploy ai-chat`
3. ทดสอบ 3 เคสอีกครั้ง
4. รายงานผล: Test 1-2-3 ผ่านหรือไม่

---

## 6. ถ้ายัง fail อยู่

ให้ตรวจ `meta.reason` จาก response ของ ai-chat (DevTools → Network → ดู response body) แล้วส่งค่ากลับมาจะได้ไล่ต่อ

---

## 7. Prompt สำหรับส่งต่อ Cowork

```
Coworker — ai-chat validation ยัง fail (Test 1-2 ไม่ผ่าน)

มี handover ที่ docs/HANDOVER-AI-CHAT-FIX-V2.md

ให้ทำ 2 อย่าง:
1. Consultant.tsx: เปลี่ยน logs.slice(-10) เป็น logs.slice(-20) ใน buildContextWithCitation
2. aiChatValidator.ts: เพิ่ม advisory bypass ก่อน claims_without_refs (ดูรายละเอียดในไฟล์)

Commit + push แล้ว deploy ai-chat ไป Supabase
ทดสอบ 3 เคส แล้วรายงานผลกลับมา
```
