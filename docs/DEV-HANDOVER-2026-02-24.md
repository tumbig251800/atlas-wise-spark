# สรุปปัญหาแอป ATLAS — สำหรับ Dev วิเคราะห์และแก้ไขต่อ

**วันที่:** 2026-02-24  
**โปรเจกต์:** atlas-wise-spark  
**Supabase Project ID:** ebyelctqcdhjmqujeskx

---

## ภาพรวม: ฟีเจอร์ที่ยังทำงานไม่ได้ 2 อย่าง

1. **AI ไม่ตอบแชท** — หน้า AI ที่ปรึกษา (พีท ร่างทอง) ส่งข้อความแล้วไม่มีคำตอบ
2. **โหลดไฟล์ CSV ไม่ได้** — นำเข้าข้อมูล teaching_logs จาก CSV แล้ว error

---

# 1. ปัญหา: AI ไม่ตอบแชท

## อาการ
- ผู้ใช้กดส่งข้อความในแชท AI ที่ปรึกษา (Consultant / พีท ร่างทอง) แล้วไม่มีคำตอบจาก AI

## สถานะฝั่ง Frontend
- หน้า: `src/pages/Consultant.tsx`
- เรียก Edge Function ผ่าน `getAiChatUrl()` + `getEdgeFunctionHeaders()`
- URL: `{VITE_SUPABASE_URL}/functions/v1/ai-chat`
- Method: POST, Body: `{ messages, context }`
- อ่าน response แบบ streaming (Server-Sent Events / newline-delimited JSON)

## สถานะฝั่ง Backend (Edge Function)
- ไฟล์: `supabase/functions/ai-chat/index.ts`
- ใช้ **LOVABLE_API_KEY** จาก `Deno.env.get("LOVABLE_API_KEY")` เท่านั้น
- ถ้าไม่มี key: throw และ return 500 พร้อมข้อความ "LOVABLE_API_KEY is not configured"
- เรียก API ภายนอก: `https://ai.gateway.lovable.dev/v1/chat/completions` (model: gemini-2.0-flash)

## สิ่งที่ Dev ควรตรวจ
1. **Deploy Edge Function** — รัน `supabase functions deploy` (หรือ deploy เฉพาะ `ai-chat`) ให้แน่ใจว่าโค้ดล่าสุดถูก deploy แล้ว
2. **Secret ใน Supabase** — Dashboard → Edge Functions → ai-chat → Secrets (หรือ Project Settings → Edge Functions) ต้องมี **LOVABLE_API_KEY** ถูกตั้งค่าและไม่หมดอายุ
3. **Authorization จาก Frontend** — `.env` ใช้ `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` (รูปแบบไม่ใช่ JWT ปกติ) ตรวจว่า Supabase รับ key นี้สำหรับเรียก Edge Function ได้หรือไม่
4. **Network / CORS** — เปิด DevTools → Network ดู request ไปที่ `/functions/v1/ai-chat` ว่า status เป็นอะไร (401, 403, 500, etc.) และดู response body หรือข้อความ error ใน toast
5. **Supabase Logs** — Dashboard → Edge Functions → ai-chat → Logs ดูว่ามี error อะไร (เช่น LOVABLE_API_KEY is not configured, 401 จาก gateway, 429, 402)

## ไฟล์ที่เกี่ยวข้อง
- `src/pages/Consultant.tsx` — เรียกแชท
- `src/lib/edgeFunctionFetch.ts` — getAiChatUrl(), getEdgeFunctionHeaders()
- `supabase/functions/ai-chat/index.ts` — ตัว Edge Function
- `.env` — VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

---

# 2. ปัญหา: โหลดไฟล์ CSV ไม่ได้

## อาการ
- เลือกไฟล์ CSV แล้วกดนำเข้าข้อมูล
- แสดง error ประมาณ: **"insert or update on table \"teaching_logs\" violates foreign key constraint \"teaching_logs_teacher_id_fkey\" (Key (teacher_id)=(c9e9927d-...) is not present in table ...)"**

## สถานะที่แก้ไปแล้ว (ไม่ต้องกลับไปแก้)
- **การแปลงวันที่:** แก้แล้ว — `src/lib/csvImport.ts` ฟังก์ชัน `toISODate()` รองรับ DD/MM/YYYY, MM/DD/YYYY, เวลา, BOM, \r, พ.ศ. และมี fallback แปลงเป็น YYYY-MM-DD; `src/pages/UploadCSV.tsx` ใช้ `ensureISODate(row.teaching_date)` ก่อน insert
- **Schema teaching_logs:** มีการรัน repair script แล้ว (activity_mode, total_students, classroom_management, learning_unit, topic, mastery_score, key_issue, major_gap, health_care_status, health_care_ids, remedial_ids, next_strategy, reflection)
- **PostgREST cache:** มีการรัน `NOTIFY pgrst, 'reload schema';` ใน script แล้ว

## สาเหตุหลักที่เหลือ (ทำไมยังโหลด CSV ไม่ได้)
- **Foreign key ของ teacher_id:** ใน **migrations ของ repo** กำหนดว่า `teaching_logs.teacher_id` อ้างถึง **auth.users(id)** แต่ใน **production (Supabase จริง)** เมื่อเช็คด้วย `supabase gen types` พบว่า schema มีตาราง **teachers** และ `teaching_logs.teacher_id` อ้างถึง **teachers(user_id)** ไม่ใช่ auth.users — แอปส่ง `teacher_id: user.id` (จาก useAuth) ซึ่งเป็น id ใน **auth.users** ถ้า production ยังใช้ FK ไปที่ **teachers(user_id)** และ user ที่ล็อกอินยังไม่มีแถวใน `teachers` จะทำให้ insert fail ด้วย FK violation

## สิ่งที่ Dev ควรตรวจและแก้
1. **ยืนยัน schema จริงบน production** — รันใน SQL Editor:
   ```sql
   SELECT tc.constraint_name, tc.table_name, kcu.column_name,
          ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'teaching_logs' AND kcu.column_name = 'teacher_id';
   ```
   ดูว่า teacher_id ชี้ไปที่ตาราง/คอลัมน์ไหน (auth.users(id) หรือ teachers(user_id))
2. **ทางเลือกแก้ (เลือกอย่างใดอย่างหนึ่ง):**
   - **ทาง A:** ให้ทุก user ที่ล็อกอินมีแถวใน `teachers` — สร้าง/อัปเดตแถวใน `teachers` เมื่อ user sign in หรือก่อน insert teaching_logs (เช่น INSERT ... ON CONFLICT DO NOTHING สำหรับ user_id = auth.uid())
   - **ทาง B:** ให้ production ใช้ FK ไปที่ auth.users แทน — สร้าง migration: DROP constraint เดิมของ teacher_id แล้ว ADD FOREIGN KEY (teacher_id) REFERENCES auth.users(id) แล้วรัน migration บน production ตามขั้นตอนที่ทีมใช้
3. **ตรวจ RLS** — ตรวจว่านโยบาย RLS ของ teaching_logs อนุญาต INSERT สำหรับ teacher_id = auth.uid() และไม่มี policy อื่นที่ขัด

## ไฟล์ที่เกี่ยวข้อง
- `src/pages/UploadCSV.tsx` — เรียก parseCSVFile แล้ว insert ลง teaching_logs ด้วย teacher_id: user.id
- `src/lib/csvImport.ts` — parse CSV, toISODate(), ensureISODate()
- `scripts/repair-activity-mode.sql` — script ซ่อมคอลัมน์ teaching_logs (รันบน production ไปแล้ว)
- Migrations ใน `supabase/migrations/` — โครงสร้าง teaching_logs และ FK

---

# สรุปสั้น ๆ สำหรับ Dev

| ฟีเจอร์ | อาการ | จุดที่ต้องโฟกัส |
|--------|--------|------------------|
| AI ไม่ตอบแชท | ส่งข้อความแล้วไม่มีคำตอบ | LOVABLE_API_KEY ใน Supabase, deploy ai-chat, Authorization header จากแอป |
| โหลด CSV ไม่ได้ | Error FK teacher_id | Schema จริงของ teaching_logs.teacher_id บน production; ให้ user อยู่ในตารางที่ FK ชี้ หรือเปลี่ยน FK ไปที่ auth.users |

---

# Environment / Config ที่ใช้อยู่

- **Supabase URL:** https://ebyelctqcdhjmqujeskx.supabase.co
- **Project ID:** ebyelctqcdhjmqujeskx
- **.env (ตัวอย่าง):** VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

**คำสั่งที่ใช้บ่อย:** `npm run dev`, `supabase functions deploy`
