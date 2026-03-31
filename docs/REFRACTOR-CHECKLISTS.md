# ATLAS Refactor Checklists (Pre-Merge / Pre-Deploy)

ใช้ checklist นี้กับทุก PR ใน roadmap refactor

## Pre-Merge Checklist

- Scope ตรง stage ปัจจุบัน และไม่แตะไฟล์นอกขอบเขตโดยไม่จำเป็น
- PR เป็น single concern และ rollback ได้ง่าย
- ไม่เพิ่ม `any` ใหม่; จุดที่แตะต้อง type-safe มากขึ้น
- ไม่มี empty `catch {}` หรือ empty block ใน flow ที่แก้
- error message ที่ผู้ใช้เห็นชัดเจน และมี log สำหรับ debug
- `npm run lint` ผ่านในขอบเขตที่แก้ (หรือมีเหตุผลชัดเจนถ้ายังไม่ผ่านทั้ง repo)
- `npm run build` ผ่าน
- เอกสารที่เกี่ยวข้องอัปเดต (`docs/*`) อย่างน้อย 1 จุด
- PR description มี:
  - Verify evidence
  - Impact note (UX / data flow / API/edge)
  - Rollback note

## Stage Exit Checklist

- Exit Criteria ของ stage ผ่านครบ
- Regression matrix ของ stage ผ่านใน critical flows
- ไม่มี regression ใหม่จาก smoke test
- มี handover note สั้นใน docs

## Pre-Deploy Checklist

- ยืนยัน migration ที่เกี่ยวข้อง (`supabase/migrations/*`) ถูก apply แล้ว
- ยืนยัน Edge Functions ที่แตะถูก deploy แล้ว
- ยืนยัน env vars/secret จำเป็นครบ
- ทดสอบ auth failure path (401/403) และ error shape สำคัญ
- ทดสอบ happy path ของ feature ที่เปลี่ยน
- เตรียม rollback path:
  - revert commit(s) ที่เกี่ยวข้อง
  - disable feature flag (ถ้ามี)
  - redeploy function/version ก่อนหน้า (ถ้าจำเป็น)

## Post-Deploy Checklist

- ตรวจ health endpoint และ flow หลัก
- monitor error logs ช่วงแรกหลัง deploy
- บันทึกผล verify + เวลา deploy ลง docs
- แจ้งทีมว่าปิดงาน stage แล้ว พร้อม residual risks
