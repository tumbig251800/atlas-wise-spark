# PBL Assessment Feature

โรงเรียนวรนาถวิทยากำแพงเพชร — ATLAS
ระบบประเมินสมรรถนะ Project-Based Learning (5 ด้าน)

> สถานะ: **deployed + live** บน Supabase `ebyelctqcdhjmqujeskx`
> หน้าใช้งาน: `/pbl` (เมนู "สมรรถนะ PBL")

---

## 1. ภาพรวม

ครูกรอกคะแนนสมรรถนะ 5 ด้านของนักเรียนต่อโปรเจกต์ลงไฟล์ Excel เทมเพลต แล้วอัปโหลดเข้าระบบผ่านหน้า `/pbl` ระบบจะ:

- แยกข้อมูลโปรเจกต์ + คะแนนนักเรียน
- **คำนวณผลสรุป (ผ่าน/ดีเยี่ยม/ไม่ผ่าน) ให้อัตโนมัติ** (ครูไม่ต้องกรอกเอง)
- แสดง dashboard: การ์ดสรุป, กราฟเฉลี่ย 5 ด้าน, ตารางนักเรียนไม่ผ่าน

สมรรถนะ 5 ด้าน (ให้คะแนนด้านละ **1–3**):

| field | ด้าน |
|-------|------|
| com_score | การสื่อสาร |
| think_score | การคิด |
| problem_score | การแก้ปัญหา |
| life_score | ทักษะชีวิต |
| tech_score | เทคโนโลยี |

**เกณฑ์ระดับคะแนน:** 1 = ปรับปรุง, 2 = ดี, 3 = ดีเยี่ยม

**เกณฑ์สรุปผล (คำนวณอัตโนมัติ):**
- `excellent` = ไม่มีด้านใดได้ 1 และมีด้านที่ได้ 3 ตั้งแต่ 3 ด้านขึ้นไป
- `fail` = มีด้านใดด้านหนึ่งได้ 1
- `pass` = ที่เหลือ

---

## 2. เทมเพลต Excel

ไฟล์: **`public/templates/PBL_Template_วรนาถ.xlsx`** (ดาวน์โหลดได้จากปุ่มในหน้า `/pbl`)

เทมเพลตมีชีต:
- **`📝 กรอกคะแนน`** ← ครูกรอกที่ชีตนี้ชีตเดียว
- `📤 ATLAS Import` ← ชีต mirror (ไม่ต้องแตะ)
- `📖 คู่มือ`

### โครงสร้างชีต `📝 กรอกคะแนน` (ตำแหน่งเซลล์ตายตัว)

ข้อมูลโปรเจกต์ — **แถวที่ 2**:

| เซลล์ | ความหมาย | ตัวอย่าง |
|-------|----------|----------|
| C2 | ชื่อโปรเจกต์ | โปรเจกต์สิ่งแวดล้อม |
| F2 | ชั้น/ห้อง (คั่นด้วย `/`) | ป.4/KBW |
| I2 | ชื่อครู | อ.สมหญิง |
| J2 | ปีการศึกษา | 2568 |
| K2 | เดือน (แทนที่ placeholder "เดือน") | พฤศจิกายน |
| L2 | ภาคเรียน | 2 |

คะแนนนักเรียน — **แถวที่ 5–34** (สูงสุด 30 คน):

| คอลัมน์ | ความหมาย |
|---------|----------|
| B | รหัสนักเรียน |
| C | ชื่อ-สกุล |
| D–H | คะแนน 5 ด้าน (1–3) |
| I, J | รวม / สรุปผล (สูตรในไฟล์ — ระบบไม่อ่าน คำนวณเองฝั่ง server) |
| K | หมายเหตุ / แผนพัฒนา |

---

## 3. การนำเข้า

1. หน้า `/pbl` → กล่อง "นำเข้าคะแนน PBL"
2. **① ดาวน์โหลดเทมเพลต** → **② กรอกคะแนนในชีต `📝 กรอกคะแนน`** → **③ อัปโหลด**
3. ระบบแสดงผล: จำนวนที่นำเข้า + แจ้งเตือน (ข้ามแถวไม่ครบ / ยังไม่กรอกเดือน / คะแนนนอกช่วง 1–3)

### พฤติกรรมการ import (edge function `import-pbl`)
- อ่านชีตที่ชื่อมีคำว่า `กรอกคะแนน` (fallback = ชีตแรก)
- ข้ามแถวที่ไม่มีรหัสนักเรียน หรือกรอกคะแนนไม่ครบ 5 ด้าน (นับไว้ใน `skipped_incomplete`)
- คะแนนนอกช่วง 1–3 → ใส่ใน `errors` และข้ามแถวนั้น
- **upsert** ตาม `project_name+grade_level+classroom+academic_term` (โปรเจกต์) และ `project_id+student_id` (คะแนน) → นำเข้าซ้ำ = อัปเดต ไม่สร้างซ้ำ
- `total_score` เป็นคอลัมน์ GENERATED ใน DB — function ไม่เคยส่งค่านี้

---

## 4. โครงสร้างข้อมูล

**`pbl_projects`**: id, project_name, grade_level, classroom, teacher_name, academic_term (เช่น `2568-2`), month

**`pbl_assessments`**: id, project_id, student_id, student_name, com/think/problem/life/tech_score (1–3), total_score (GENERATED), overall_result (`excellent`/`pass`/`fail`), notes
เชื่อมนักเรียนข้ามโปรเจกต์ด้วย `student_id`

Migrations: `supabase/migrations/20260617000000_create_pbl_assessment_tables.sql`, `20260617000001_pbl_rls_policies.sql` (RLS เปิดแล้ว)

---

## 5. ไฟล์ที่เกี่ยวข้อง

| ส่วน | path |
|------|------|
| หน้า dashboard | `src/pages/PBLDashboard.tsx` |
| Edge function | `supabase/functions/import-pbl/index.ts` |
| เทมเพลต | `public/templates/PBL_Template_วรนาถ.xlsx` |
| Route + เมนู | `src/App.tsx`, `src/components/AppSidebar.tsx` |

> ⚠️ **deploy:** frontend auto-deploy เมื่อ merge เข้า main (Vercel); edge function/migrations deploy แยกเอง — **ห้ามรัน `supabase db push` ซ้ำ** (ตารางสร้างแล้ว)
