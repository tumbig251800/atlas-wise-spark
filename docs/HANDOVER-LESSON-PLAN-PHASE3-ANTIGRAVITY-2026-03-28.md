# Handover — Lesson Plan Phase 3, DB & Edge (2026-03-28)

เอกสารนี้แจ้ง **Antigravity / ผู้รับงานต่อ** ว่าทำอะไรไปแล้วบนโปรเจกต์ **atlas-wise-spark** รอบแผนการสอน (โหมด Snapshot / Reflection), Edge **`ai-lesson-plan`**, และ migration ฐานข้อมูล

**Supabase Project ID:** `ebyelctqcdhjmqujeskx`  
**GitHub:** branch `main`

---

## 1. สรุปการดำเนินการ (ทำเสร็จแล้ว)

### 1.1 Phase 3 — UI หน้าแผนการสอน

- โหมดสร้างแผน: **ต่อยอดจากบันทึกหลังสอน** (`reflection`) กับ **ปรับตามบริบทห้อง** (`context_snapshot`)
- โหมด Snapshot: กลุ่มผู้เรียน (เก่ง / อ่อน / ปานกลาง), อุปกรณ์ (checkbox ตาม constants), ช่องบันทึก/บริบท
- ส่ง request ให้สอดคล้องกับสัญญา Edge: `context_snapshot` + payload `snapshot` ร่วมกับ `context` ที่รวมแล้ว
- โหมด Reflection: ยังโหลด Teaching Logs ตามเดิม; การ์ดคำแนะนำเมื่อไม่มี log เฉพาะเมื่อเลือก reflection

**ไฟล์หลักฝั่งแอป**

| พื้นที่ | ตำแหน่ง |
|---------|---------|
| ฟอร์ม + โหมด | `src/components/lesson-plan/LessonPlanForm.tsx` |
| ค่าคงที่อุปกรณ์ | `src/components/lesson-plan/lessonPlanSnapshotConstants.ts` |
| ประกอบ body / snapshot | `src/pages/LessonPlan.tsx` |

### 1.2 Edge — `ai-lesson-plan`

- ใช้ shared parsing / prompts: `supabase/functions/_shared/lessonPlanRequest.ts`, `lessonPlanPrompts.ts`
- Entry: `supabase/functions/ai-lesson-plan/index.ts`
- Auth: `verify_jwt = false` ใน `supabase/config.toml` + `requireAtlasUser` ในโค้ด (มาตรฐาน ATLAS — ดู `docs/PROJECT-EDGE-AI-SUMMARY-2026-03.md`)

**การ deploy:** รัน `npx supabase functions deploy ai-lesson-plan` ไปแล้วบนโปรเจกต์ด้านบน (รวม asset ที่อัปโหลดตาม dependency)

### 1.3 ฐานข้อมูล — ตาราง `lesson_plan_snapshots`

- Migration: `supabase/migrations/20260328120000_lesson_plan_snapshots.sql`
- สร้างตาราง `public.lesson_plan_snapshots`, RLS (เจ้าของ + director ผ่าน `has_role`), index, trigger `updated_at`

**ปัญหาที่เจอและวิธีแก้**

- ครั้งแรก `supabase db push` ล้มเพราะบน remote **ไม่มี** `public.update_updated_at_column()` (บาง environment ไม่ได้รัน migration เก่าที่ประกาศฟังก์ชันนี้)
- **แก้:** เพิ่ม `CREATE OR REPLACE FUNCTION public.update_updated_at_column()` ใน migration เดียวกันก่อนสร้าง trigger (idempotent กับ DB ที่มีฟังก์ชันอยู่แล้ว)

**สถานะ:** `npx supabase db push` สำเร็จ — schema บน DB จริงตรงกับไฟล์ migration หลังแก้

### 1.4 Git

- ฟีเจอร์หลัก Phase 3: commit ตัวแทน **`e4385b3`** (`feat(lesson-plan): Phase 3 context mode UI and ai-lesson-plan Edge alignment`)
- แก้ migration + helper: **`9d0a33a`** (`fix(db): ensure update_updated_at_column exists before lesson_plan_snapshots trigger`)
- ทั้งหมดอยู่บน **`main`** และ push ขึ้น GitHub แล้ว

---

## 2. สคริปต์ / เอกสารที่เกี่ยวข้อง

| รายการ | ตำแหน่ง |
|--------|---------|
| Regression lesson plan (Node) | `scripts/regression-ai-lesson-plan.mjs` |
| คู่มือ verify deploy | `docs/verify-ai-lesson-plan-deploy.md` |
| สรุป Edge + Auth ทั่วโปรเจกต์ | `docs/PROJECT-EDGE-AI-SUMMARY-2026-03.md` |
| Types (ถ้า sync จาก DB) | `src/integrations/supabase/types.ts` |

การรัน regression มักต้องมี JWT / env ตามเอกสาร — **ห้าม** commit secret

---

## 3. สิ่งที่ Antigravity ไม่ต้องทำซ้ำ (ถ้าไม่มีงานใหม่)

- Deploy `ai-lesson-plan` รอบนี้ทำแล้ว
- Migration `20260328120000` apply บน remote แล้ว
- โค้ด Phase 3 อยู่บน `main` แล้ว

---

## 4. สิ่งที่อาจตรวจเพิ่ม (ถ้าต้องการ)

- **Frontend hosting:** ถ้า deploy แยกจาก Git (เช่น Vercel) ให้ยืนยันว่า build ล่าสุดจาก `main` ผ่าน
- **Regression:** `npm run test:regression-lesson-plan` (หรือตาม `package.json`) เมื่อมี `SUPABASE_*` + user ทดสอบ

---

## 5. อ้างอิงสั้นๆ

- JWT / `requireAtlasUser`: `supabase/functions/_shared/atlasAuth.ts`
- เรียก Edge จากแอป: `src/lib/edgeFunctionFetch.ts`
