

# สรุปสถานการณ์ปัจจุบัน + สิ่งที่ต้องทำ

## สิ่งที่ทำเสร็จแล้ว (ใน Cursor)

1. **`src/integrations/supabase/client.ts`** — คืนค่าเป็นมาตรฐาน Lovable, hardcode URL + key ของ project `iwlpqrulzkzpsiaddefq`
2. **`supabase/config.toml`** — เปลี่ยน project_id เป็น `iwlpqrulzkzpsiaddefq`
3. Commit + Push ขึ้น GitHub แล้ว

---

## ปัญหาที่เห็นจากภาพหน้าจอ

จากภาพ: Edge Functions ยังอยู่บน **project เก่า** (`ebyelctqcdhjmqujeskx`) ซึ่งเป็น **คนละ project** กับที่แอป Lovable ใช้ (`iwlpqrulzkzpsiaddefq`)

นั่นหมายความว่า:
- แอป Lovable → ชี้ไปที่ project `iwlpqrulzkzpsiaddefq` ✅
- Edge Functions (ai-chat, ai-lesson-plan, ai-summary, atlas-diagnostic) → ยังอยู่บน project `ebyelctqcdhjmqujeskx` ❌

**ไม่ต้อง deploy เองครับ** — เพราะ Lovable Cloud จะ deploy Edge Functions ให้อัตโนมัติบน project `iwlpqrulzkzpsiaddefq` เมื่อโค้ดถูก push/sync เข้ามา

---

## สิ่งที่ต้องแก้ไขก่อน (Build Error)

ตอนนี้มี **build error** ในไฟล์ `supabase/functions/atlas-diagnostic/index.ts` ทำให้ deploy ไม่ผ่าน:

### Error 1: `NormalizationResult` — type ไม่มีอยู่
### Error 2: `normalizeTopic()` — ถูกเรียกผิด (ส่ง 4 arguments แต่ฟังก์ชันรับแค่ 3)

**บรรทัด 221-227 ปัจจุบัน (ผิด):**
```typescript
const normResult: NormalizationResult = await normalizeTopic(
  currentTopic,
  log.subject,
  supabase,
  log.grade_level
);
const normalizedTopic = normResult.canonical;
```

**แก้เป็น (ถูกต้อง):**
```typescript
const historicalTopics = matchedHistoryLogs.map((h: any) => h.topic || "");
const normalizedTopic = await normalizeTopic(
  currentTopic,
  historicalTopics,
  LOVABLE_API_KEY
);
```

### ไฟล์ที่ต้องแก้
| ไฟล์ | สิ่งที่ทำ |
|------|-----------|
| `supabase/functions/atlas-diagnostic/index.ts` บรรทัด 221-227 | แก้การเรียก `normalizeTopic` ให้ตรงกับ function signature เดิม (3 arguments), ลบ `NormalizationResult` type ออก |

---

## สิ่งที่ต้องตั้งค่าเอง

### ตรวจสอบ LOVABLE_API_KEY

`LOVABLE_API_KEY` **มีตั้งค่าไว้แล้ว** ในระบบของ Lovable Cloud (project `iwlpqrulzkzpsiaddefq`) — ไม่ต้องตั้งค่าเพิ่ม ✅

### สรุปสิ่งที่ต้องทำ

| ลำดับ | งาน | ใครทำ |
|-------|-----|-------|
| 1 | แก้ build error ใน `atlas-diagnostic/index.ts` (แก้ `normalizeTopic` call) | Agent ทำให้ได้ |
| 2 | Lovable Cloud จะ deploy Edge Functions อัตโนมัติ | อัตโนมัติ |
| 3 | ทดสอบ Login เข้าแอป | คุณทดสอบเอง |
| 4 | ทดสอบ AI Chat และ CSV Upload | คุณทดสอบเอง |

> **ขั้นตอนถัดไป:** อนุมัติให้ Agent แก้ build error แล้ว Lovable Cloud จะ deploy ให้อัตโนมัติ ไม่ต้องรัน `supabase functions deploy` เอง

