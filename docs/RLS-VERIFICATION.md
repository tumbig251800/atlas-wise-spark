# Phase 1.2: Verify RLS Migration

คู่มือการตรวจสอบ Row Level Security (RLS) ว่าถูก migrate และทำงานถูกต้องบน atlas_prod

## ขั้นตอน

### 1. เช็ค Migration Status (ถ้ามี Supabase CLI linked)

```bash
npx supabase link --project-ref ebyelctqcdhjmqujeskx
npx supabase migration list
```

**หมายเหตุ:** ถ้า Remote ว่าง (`|` ขวามือ) แสดงว่า migration นั้นยังไม่ถูก apply บน atlas_prod  
ให้รัน `npx supabase db push` เพื่อ apply migrations ที่ค้างอยู่ (รวม RLS policies ล่าสุด)

Migrations ที่เกี่ยวกับ RLS โดยตรง:
- `20260226081402` — Teacher delete own / Director delete all (diagnostic_events, remedial_tracking, strike_counter, pivot_events)
- `20260226083106` — Director insert for any teacher
- `20260226084029` — Director update all
- `20260306000000` — unit_assessments RLS

### 2. รัน SQL Verification ใน Supabase Dashboard

1. ไปที่ [SQL Editor](https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/sql)
2. เปิดไฟล์ `scripts/verify-rls-migration.sql` แล้ว copy ไปรัน
3. ตรวจผล:
   - ตาราง profiles, user_roles, teaching_logs, diagnostic_events, strike_counter, remedial_tracking, pivot_events, unit_assessments ต้องมี `rls_enabled = true`
   - topic_aliases อาจไม่มี (ถ้า migration ยังไม่สร้างตารางนี้)
   - Query ที่ 2 แสดง policy ทั้งหมด — ควรเห็น policy สำหรับ teacher/director ต่อตารางที่เกี่ยวข้อง

### 3. ทดสอบ RLS แบบ Negative (NEGATIVE_TESTS 4.4)

| ขั้นตอน | ผลที่คาดหวัง |
|---------|--------------|
| Login เป็นครู A → พยายามลบ log ของครู B (ผ่าน API หรือ PostgREST โดยตรง) | Deny — RLS ป้องกัน ไม่ให้ลบได้ |

**วิธีทดสอบด้วย curl:**
1. Login เป็นครู A ในแอป → copy JWT จาก DevTools (Application → Local Storage หรือดู request header)
2. หา `teaching_log_id` ของครู B จาก DB
3. เรียก DELETE ผ่าน REST API ด้วย JWT ของครู A:
   ```bash
   curl -X DELETE \
     "https://ebyelctqcdhjmqujeskx.supabase.co/rest/v1/teaching_logs?id=eq.<LOG_ID_OF_TEACHER_B>" \
     -H "Authorization: Bearer <JWT_TEACHER_A>" \
     -H "apikey: <ANON_KEY>"
   ```
4. คาดหวัง: HTTP 200 แต่ `[]` (0 แถวถูกลบ) หรือ ข้อความที่สื่อว่าไม่ได้รับอนุญาต

### 4. สรุปผล

| ตาราง | RLS Enabled | Policies | หมายเหตุ |
|-------|-------------|----------|----------|
| profiles | | | |
| user_roles | | | |
| teaching_logs | | | |
| diagnostic_events | | | |
| strike_counter | | | |
| remedial_tracking | | | |
| pivot_events | | | |
| unit_assessments | | | |

## ไฟล์ที่เกี่ยวข้อง

- `supabase/migrations/20260215095836_*.sql` — profiles, user_roles, teaching_logs
- `supabase/migrations/20260218052609_*.sql` — diagnostic_events, strike_counter, remedial_tracking
- `supabase/migrations/20260219011243_*.sql` — pivot_events
- `supabase/migrations/20260306000000_unit_assessments_rls.sql` — unit_assessments

## คำสั่งที่ใช้

```bash
# Health check ก่อน (รวม AI endpoints)
npm run check-setup

# ตรวจ migration list (ต้อง link ก่อน)
npx supabase link --project-ref ebyelctqcdhjmqujeskx
npx supabase migration list
```
