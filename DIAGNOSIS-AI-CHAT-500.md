# สาเหตุ Error 500 ของ ai-chat (พีทไม่ตอบ แสดงแจ้งเตือนแทน)

## สรุปผลการตรวจสอบ

จากการวิเคราะห์โค้ด `supabase/functions/ai-chat/index.ts` พบ **สาเหตุที่เป็นไปได้ของ Error 500** ดังนี้

---

## 1. LOVABLE_API_KEY ไม่ได้ตั้งค่า (สาเหตุหลัก)

```typescript
// บรรทัด 140-141 ใน ai-chat/index.ts
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
```

**ถ้าไม่มีค่า `LOVABLE_API_KEY` ใน Supabase Edge Function Secrets** → จะ throw Error → ส่งกลับ **500** ทันที

**แก้ไข:**
1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard) → เลือกโปรเจกต์ ATLAS
2. Settings → Edge Functions → **Secrets**
3. เพิ่ม/แก้ไข `LOVABLE_API_KEY` = **Gemini API Key** จาก [Google AI Studio](https://aistudio.google.com/apikey)
4. Deploy ฟังก์ชัน ai-chat ใหม่

---

## 2. AI Gateway (ai.gateway.lovable.dev) ตอบผิดพลาด

ฟังก์ชันเรียก:
```
https://ai.gateway.lovable.dev/v1/chat/completions
```

ถ้า Gateway ตอบไม่ใช่ 2xx (ยกเว้น 429, 402, 401/403 ที่มีข้อความเฉพาะ) → จะ return **500** พร้อมข้อความ `AI gateway error (status). ดู Supabase Logs สำหรับรายละเอียด`

**กรณีที่จัดการไว้แล้ว:**
| Status | ข้อความที่ผู้ใช้เห็น |
|--------|------------------------|
| 429 | คำขอมากเกินไป กรุณารอสักครู่ |
| 402 | เครดิต AI หมด กรุณาเติมเครดิต |
| 401/403 | API Key ไม่ถูกต้องหรือหมดอายุ |
| อื่นๆ | 500 + AI gateway error |

**ตรวจสอบ:** ดู **Supabase Logs** ของฟังก์ชัน ai-chat — จะมี `console.error("AI gateway error:", status, body)` บอกสาเหตุจริง

---

## 3. Request Body ไม่ถูกต้อง

```typescript
const { messages, context } = await req.json();
```

ถ้า body ไม่ใช่ JSON ที่ถูกต้อง หรือไม่มี `messages` → `req.json()` อาจ throw → จับได้ใน catch → ส่ง **500** พร้อม error message

---

## 4. VITE_SUPABASE_URL ไม่ได้ตั้งค่า (ฝั่ง Frontend)

ถ้า `.env` ไม่มี `VITE_SUPABASE_URL` → `getAiChatUrl()` จะ return `""` → Consultant จะแสดง toast **"VITE_SUPABASE_URL ไม่ได้ตั้งค่าใน .env"** (ไม่เรียก API เลย)

---

## รายการตรวจสอบ (Checklist)

| # | รายการ | วิธีตรวจ |
|---|--------|----------|
| 1 | LOVABLE_API_KEY ใน Supabase | Supabase Dashboard → Project → Edge Functions → Secrets |
| 2 | Gemini API Key ใช้งานได้ | สร้างใหม่ที่ [Google AI Studio](https://aistudio.google.com/apikey) ถ้าสงสัยหมดอายุ |
| 3 | VITE_SUPABASE_URL ใน .env | เปิดไฟล์ `.env` ในโปรเจกต์ ตรวจว่ามีค่าถูกต้อง |
| 4 | Logs ของ ai-chat | Supabase Dashboard → Edge Functions → ai-chat → Logs (ดู error message จริง) |

---

## ขั้นตอนแนะนำ

1. **เช็ก Supabase Logs ก่อน** — ดู error message จริงของ invocation ที่ 500
2. **เช็ก LOVABLE_API_KEY** — เป็นสาเหตุที่พบบ่อยที่สุด
3. **เช็กว่าใช้ Gemini API Key** — ตาม DEPLOY-AI-GATEWAY.md ระบบใช้ `gemini-2.0-flash` ผ่าน Lovable Gateway

---

*สร้างเมื่อ: 2026-02-23*
