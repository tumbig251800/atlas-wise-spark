# การตรวจสอบ deploy ai-lesson-plan (หลัง Cowork deploy v22)

## Phase 1 — ผลการเทส curl (ยืนยันแล้ว)

| เคส | คำสั่ง | Status | Body | ผล |
|-----|--------|--------|------|-----|
| 1 | ไม่ส่ง Authorization | 401 | `{"error":"Missing Authorization"}` | ผ่าน — มาจากโค้ดเรา (atlasAuth) ไม่ใช่ gateway |
| 2 | ส่ง anon key ใน Authorization | 401 | `{"error":"Invalid JWT"}` | ผ่าน — มาจากโค้ดเรา (getUser ปฏิเสธ anon) ไม่ใช่ `{"code":401,"message":"Invalid JWT"}` จาก gateway |

สรุป: **Gateway ไม่ block อีกแล้ว** — request ผ่านไปถึงฟังก์ชันและได้ response จาก `requireAtlasUser` / atlasAuth.ts

---

## Phase 2 — ขั้นตอนเทสจากแอป (ให้คุณทำ)

1. เปิดแอปแล้ว login ให้มี session ปกติ
2. ไปหน้า **สร้างแผนการสอน**
3. เลือก ชั้น/ห้อง/วิชา/หัวข้อ แล้วกด **สร้างแผนการสอน**
4. สังเกตผล:
   - **สำเร็จ:** มีเนื้อหาแผน streaming มา หรือโหลดเสร็จ
   - **Error:** ดู toast/Console ว่าเป็นอะไร
     - ถ้าเป็น `GEMINI_API_KEY ไม่ถูกต้อง` หรือ `เครดิต AI หมด` → ไป Supabase Dashboard → Edge Functions → Secrets ตรวจ/ตั้งค่า `GEMINI_API_KEY` แล้วลองกดสร้างแผนอีกครั้ง

---

## Phase 3 (ใช้เฉพาะเมื่อ Phase 1 ไม่ผ่าน)

ถ้า curl ยังได้ `{"code":401,"message":"Invalid JWT"}`:
- ไป Supabase Dashboard → Edge Functions → `ai-lesson-plan` → ตรวจว่า JWT Verification / Verify JWT ถูกปิด (OFF) แล้ว redeploy ถ้าจำเป็น
