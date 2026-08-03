# atlas-delete-logs — archived

Archived on 2026-08-03. Source retrieved from the live Supabase deployment
(Dashboard → Edge Functions → atlas-delete-logs → Code) since this function
was never committed to this repo's git history — it only ever existed as a
deployed function, unlike the other functions under `supabase/functions/`.

## ทำอะไร

ลบ `teaching_logs` ผ่าน `service_role` (bypass RLS) พร้อม cascade delete ตาม
ลำดับที่ถูกต้อง:

1. `pivot_events` (`trigger_session_id` ตรงกับ log ที่จะลบ)
2. `diagnostic_events` (`teaching_log_id`)
3. `remedial_tracking` (`teaching_log_id`)
4. `strike_counter` (`last_session_id`)
5. `teaching_logs` เอง (ตัวหลัก)

รับ body เป็น `{ subject?: string; ids?: string[] }` — ถ้าส่ง `ids` มาลบตาม ID
ตรงๆ ถ้าส่ง `subject` มาแทน จะ query หา `teaching_logs.id` ทั้งหมดที่
`subject` ตรงกัน (ไม่มีเงื่อนไขอื่นเลย) แล้วลบทั้งหมดนั้น

**Auth**: ตรวจ Bearer JWT จริงผ่าน `supabase.auth.getUser()` แล้วเช็ค
`user_roles.role === 'director'` เท่านั้น — ถ้าไม่ใช่ director ตอบ 403 นี่คือ
ฟังก์ชันเดียวในบรรดาที่ตรวจสอบรอบนี้ที่มี auth ครบทั้ง authentication +
authorization ตั้งแต่ต้น

## ทำไมถูกถอดออกจาก production

- ยืนยันจาก Supabase logs: **0 invocations ใน 5 เดือนที่ผ่านมา**
- ค้นทั้ง repo `atlas-wise-spark` แล้ว **ไม่มี UI, hook, หรือฟังก์ชันไหนเรียกใช้เลย**
  — เป็น dead code ที่ไม่มีใครใช้งานจริง
- การมีฟังก์ชันที่ทำ hard delete + cascade อยู่บน production โดยไม่มีใครเรียก
  ใช้เลยคือความเสี่ยงล้วนๆ โดยไม่มีประโยชน์ที่จับต้องได้ — ถอดออกดีกว่าเก็บไว้

## ข้อควรระวังถ้าจะ deploy กลับมาใช้งานจริง

- **`.eq("subject", subject.trim())` ลบทุกห้อง ทุกครู ทุกภาคเรียนที่เคยสอน
  วิชานั้น** ไม่มี filter เพิ่มเติมด้วย `academic_term`, `grade_level`, หรือ
  `teacher_id` เลย — ถ้าตั้งใจจะลบ log ของครูคนเดียวหรือเทอมเดียว ต้องเพิ่ม
  เงื่อนไขเหล่านี้ก่อนใช้งานจริง ไม่งั้นจะลบข้ามครู ข้ามเทอมโดยไม่ตั้งใจ
- **ไม่มี audit log** — response จะคืนรายการ `id` ที่ลบไปให้ตอนนั้น แต่ไม่มีการ
  บันทึกลงตาราง DB ว่าใคร (director คนไหน) ลบอะไรไปเมื่อไหร่ ถ้าจะใช้งานจริง
  ควรเพิ่ม insert ลง audit table ก่อน delete จริง
- **ไม่มีการยืนยันสองชั้น** — เรียกครั้งเดียวลบทันที ไม่มี dry-run/preview mode
- Cascade order ต้องคงไว้แบบนี้เป๊ะ (ลบตารางลูกก่อน ตารางหลักทีหลัง) ไม่งั้นจะ
  ชน foreign key constraint

## วิธี deploy กลับ (ถ้าตัดสินใจจะใช้งานจริงในอนาคต)

1. แก้ไขตามข้อควรระวังด้านบนก่อน (อย่างน้อยควรเพิ่ม `academic_term`/`teacher_id`
   filter และ audit log)
2. คัดลอก `index.ts` จากโฟลเดอร์นี้ไปที่ `supabase/functions/atlas-delete-logs/index.ts`
3. Deploy เฉพาะฟังก์ชันนี้ — **ห้ามใช้คำสั่ง deploy แบบไม่ระบุชื่อ**:
   ```bash
   ./scripts/deploy-functions.sh atlas-delete-logs
   ```
4. ทดสอบด้วย account ที่ไม่ใช่ director ก่อนว่าโดนบล็อก 403 จริง แล้วค่อยทดสอบ
   ด้วย director account บนข้อมูลทดสอบ ไม่ใช่ข้อมูลจริง
