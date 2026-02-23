# ATLAS — AI Gateway Fix (2026-02-23)

## สิ่งที่แก้ไขแล้ว

### 1. เปลี่ยนโมเดล AI
- **เดิม:** `gpt-4o-mini` (OpenAI)
- **ใหม่:** `gemini-2.0-flash` (Gemini)

รองรับการใช้ **Gemini API Key** จาก Google AI Studio เป็นค่า `LOVABLE_API_KEY` ใน Supabase

### 2. ปรับปรุงข้อความ Error
- **401/403:** แจ้ง "API Key ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบ LOVABLE_API_KEY ใน Supabase"
- **429:** คำขอมากเกินไป
- **402:** เครดิต AI หมด
- **อื่นๆ:** แสดง status code เช่น `AI gateway error (500). ดู Supabase Logs สำหรับรายละเอียด`

### 3. ไฟล์ที่แก้ไข
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/ai-lesson-plan/index.ts`
- `supabase/functions/ai-summary/index.ts`
- `supabase/functions/atlas-diagnostic/index.ts`

---

## ขั้นตอน Deploy (ต้องทำเอง)

Deploy ล้มเหลวด้วย "Forbidden" — โปรเจกต์อยู่ภายใต้ Lovable Org อาจต้อง deploy ผ่าน Lovable หรือ link project

### วิธีที่ 1: ใช้ Supabase CLI (ถ้ามีสิทธิ์)
```bash
cd ~/atlas-wise-spark
supabase login
supabase link --project-ref ebyelctqcdhjmqujeskx
supabase functions deploy
```

### วิธีที่ 2: Deploy ผ่าน Lovable
ถ้าโปรเจกต์สร้างจาก Lovable — ตรวจสอบว่ามีปุ่ม Deploy หรือ Sync กับ Supabase ใน Lovable Dashboard

### วิธีที่ 3: Supabase Dashboard
บางเคสสามารถ deploy functions ผ่าน Supabase Dashboard โดยอัปโหลดโค้ด

---

## ตรวจสอบ LOVABLE_API_KEY

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/settings/functions)
2. Edge Functions → Secrets
3. ตรวจสอบ `LOVABLE_API_KEY` = ค่า **Gemini API Key** จาก Google AI Studio
4. Save แล้ว Deploy functions ใหม่
