# PBL Assessment Feature - สรุปการพัฒนา

## โรงเรียนวรนาถวิทยากำแพงเพชร - ATLAS

**วันที่พัฒนา**: 17 มิถุนายน 2569  
**Supabase Project**: ebyelctqcdhjmqujeskx  
**Version**: 1.0.0

---

## 📦 ไฟล์ที่สร้าง

### 1. Database Migration
```
supabase/migrations/20260617000000_create_pbl_assessment_tables.sql
```
- สร้างตาราง `pbl_projects` (โปรเจกต์)
- สร้างตาราง `pbl_assessments` (คะแนนนักเรียน)
- สร้าง indexes และ triggers
- เพิ่ม constraints และ validations

### 2. Edge Function
```
supabase/functions/import-pbl/index.ts
```
- รับไฟล์ Excel (.xlsx)
- Parse ข้อมูลจากแท็บ "ATLAS Import"
- Upsert โปรเจกต์และคะแนน
- Return ผลการนำเข้า

### 3. Frontend Component
```
src/pages/PBLDashboard.tsx
```
- Dashboard หลักสำหรับ PBL Assessment
- Upload ไฟล์ Excel
- แสดงสถิติสรุป (cards)
- กราฟเปรียบเทียบ 5 ด้านสมรรถนะ
- ตารางนักเรียนไม่ผ่าน

### 4. Routing
```
src/App.tsx (แก้ไข)
```
- เพิ่ม route `/pbl` → PBLDashboard
- เพิ่ม lazy loading
- Protected route (teacher, director, lead)

### 5. Scripts
```
scripts/generate-pbl-template.mjs
scripts/deploy-pbl-feature.sh
```
- สร้าง Excel template พร้อมตัวอย่างข้อมูล
- Deploy ทั้งหมดอัตโนมัติ

### 6. Documentation
```
docs/PBL_ASSESSMENT_FEATURE.md
public/PBL_Import_Template.md
PBL_ASSESSMENT_SUMMARY.md (ไฟล์นี้)
```
- เอกสารคู่มือใช้งานครบถ้วน
- คำแนะนำ import Excel
- API reference

---

## 🗃️ Database Schema

### ตาราง pbl_projects
```sql
CREATE TABLE pbl_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,      -- ป.1 - ป.6
  classroom TEXT NOT NULL,         -- KBW, VKW, KW1, KW2
  teacher_name TEXT NOT NULL,
  academic_term TEXT NOT NULL,     -- 2568-2
  month TEXT NOT NULL,             -- พฤศจิกายน
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_name, grade_level, classroom, academic_term)
);
```

### ตาราง pbl_assessments
```sql
CREATE TABLE pbl_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES pbl_projects(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT,
  com_score SMALLINT CHECK (com_score BETWEEN 1 AND 3),
  think_score SMALLINT CHECK (think_score BETWEEN 1 AND 3),
  problem_score SMALLINT CHECK (problem_score BETWEEN 1 AND 3),
  life_score SMALLINT CHECK (life_score BETWEEN 1 AND 3),
  tech_score SMALLINT CHECK (tech_score BETWEEN 1 AND 3),
  total_score SMALLINT GENERATED ALWAYS AS (com_score + think_score + problem_score + life_score + tech_score) STORED,
  overall_result TEXT CHECK (overall_result IN ('excellent','pass','fail')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, student_id)
);
```

---

## 🎯 เกณฑ์การประเมิน

### คะแนนสมรรถนะ (1-3)
- **3** = ดีเยี่ยม
- **2** = ดี
- **1** = ปรับปรุง

### สมรรถนะ 5 ด้าน
1. **การสื่อสาร** (Communication)
2. **การคิด** (Thinking)
3. **การแก้ปัญหา** (Problem Solving)
4. **ทักษะชีวิต** (Life Skills)
5. **เทคโนโลยี** (Technology)

### ผลการประเมิน
- **excellent** = ไม่มีด้านใดได้ 1 และมีด้านที่ได้ 3 ≥ 3 ด้าน
- **fail** = มีด้านใดด้านหนึ่งได้ 1
- **pass** = ที่เหลือ

---

## 📊 ฟีเจอร์หลัก

### 1. Import ข้อมูล
- ✅ Upload Excel file (.xlsx)
- ✅ Parse แท็บ "ATLAS Import"
- ✅ Validate ข้อมูล
- ✅ Upsert (insert/update) อัตโนมัติ
- ✅ แสดง toast notification

### 2. Dashboard
- ✅ Filter: ภาคเรียน, ระดับชั้น, ห้อง
- ✅ Summary Cards: โปรเจกต์, ดีเยี่ยม%, ผ่าน%, ไม่ผ่าน%
- ✅ Bar Chart: คะแนนเฉลี่ย 5 ด้านรายโปรเจกต์
- ✅ Table: นักเรียนไม่ผ่าน (with badges)

### 3. Excel Template
- ✅ Script สร้าง template อัตโนมัติ
- ✅ ตัวอย่างข้อมูล 5 คน
- ✅ แท็บคำแนะนำภาษาไทย
- ✅ Column widths ที่เหมาะสม

---

## 🚀 วิธี Deploy

### แบบอัตโนมัติ (Recommended)
```bash
cd /Users/tum_macmini/atlas-wise-spark
./scripts/deploy-pbl-feature.sh
```

### แบบแยกขั้นตอน

**1. สร้าง Excel Template**
```bash
node scripts/generate-pbl-template.mjs
```

**2. Apply Database Migration**
```bash
npx supabase db push
```

**3. Deploy Edge Function**
```bash
npx supabase functions deploy import-pbl
```

**4. Build Frontend**
```bash
npm run build
```

---

## 📝 วิธีใช้งาน

### สำหรับครู

1. **ดาวน์โหลด Template**
   ```
   public/PBL_Import_Template.xlsx
   ```

2. **กรอกข้อมูล**
   - เปิดไฟล์ Excel
   - แท็บ "ATLAS Import" - กรอกคะแนนนักเรียน
   - แท็บ "คำแนะนำ" - อ่านวิธีใช้

3. **นำเข้า**
   - เข้า https://your-domain.com/pbl
   - คลิก "นำเข้าคะแนน PBL"
   - เลือกไฟล์
   - รอผลการนำเข้า

### สำหรับผู้บริหาร

1. **เข้าหน้า Dashboard**
   ```
   https://your-domain.com/pbl
   ```

2. **กรองข้อมูล**
   - เลือกภาคเรียน
   - เลือกระดับชั้น (optional)
   - เลือกห้อง (optional)

3. **วิเคราะห์**
   - ดูการ์ดสรุป
   - ดูกราฟเปรียบเทียบ
   - เช็คนักเรียนไม่ผ่าน

---

## 🔧 Troubleshooting

### Import ไม่สำเร็จ

**❌ "Sheet 'ATLAS Import' not found"**
- ชื่อแท็บต้องเป็น "ATLAS Import" (ตัวพิมพ์ใหญ่-เล็กตรงกัน)

**❌ "Missing required project information"**
- Row แรกต้องมี project_name, grade_level, classroom

**❌ "Invalid score value"**
- คะแนนต้องเป็น 1, 2, หรือ 3

### Dashboard ไม่แสดงข้อมูล

**❓ Cards แสดง 0**
- เช็ค filter (academic_term, grade_level, classroom)

**❓ กราฟว่าง**
- ต้องมีข้อมูลอย่างน้อย 1 โปรเจกต์

---

## 📈 Analytics Queries

### สรุปรายโปรเจกต์
```sql
SELECT
  p.project_name,
  p.grade_level,
  p.classroom,
  p.month,
  COUNT(a.id) as total_students,
  COUNT(CASE WHEN a.overall_result = 'excellent' THEN 1 END) as excellent,
  COUNT(CASE WHEN a.overall_result = 'pass' THEN 1 END) as pass,
  COUNT(CASE WHEN a.overall_result = 'fail' THEN 1 END) as fail,
  ROUND(AVG(a.com_score), 2) as avg_com,
  ROUND(AVG(a.think_score), 2) as avg_think,
  ROUND(AVG(a.problem_score), 2) as avg_problem,
  ROUND(AVG(a.life_score), 2) as avg_life,
  ROUND(AVG(a.tech_score), 2) as avg_tech
FROM pbl_projects p
JOIN pbl_assessments a ON a.project_id = p.id
WHERE p.academic_term = '2568-2'
GROUP BY p.id
ORDER BY p.month;
```

### นักเรียนไม่ผ่าน
```sql
SELECT
  a.student_id,
  a.student_name,
  p.project_name,
  p.grade_level,
  p.classroom,
  a.com_score,
  a.think_score,
  a.problem_score,
  a.life_score,
  a.tech_score,
  a.notes
FROM pbl_assessments a
JOIN pbl_projects p ON p.id = a.project_id
WHERE a.overall_result = 'fail'
  AND p.academic_term = '2568-2'
ORDER BY p.grade_level, p.classroom, a.student_id;
```

---

## ✅ Checklist การ Deploy

- [ ] Database migration applied
- [ ] Edge function deployed
- [ ] Frontend built
- [ ] Excel template generated
- [ ] Route `/pbl` accessible
- [ ] Upload ทดสอบได้
- [ ] Dashboard แสดงผลถูกต้อง
- [ ] Filter ทำงานได้
- [ ] Chart แสดงข้อมูล
- [ ] Table นักเรียนไม่ผ่านแสดง

---

## 🔐 Permissions

### RLS Policies (ควรเพิ่ม)

```sql
-- pbl_projects: SELECT สำหรับ teacher, director, lead
CREATE POLICY "Teachers can view PBL projects"
ON pbl_projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- pbl_projects: INSERT/UPDATE สำหรับ teacher, director, lead
CREATE POLICY "Teachers can manage PBL projects"
ON pbl_projects FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- pbl_assessments: SELECT สำหรับ teacher, director, lead
CREATE POLICY "Teachers can view PBL assessments"
ON pbl_assessments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- pbl_assessments: INSERT/UPDATE สำหรับ teacher, director, lead
CREATE POLICY "Teachers can manage PBL assessments"
ON pbl_assessments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);
```

**⚠️ หมายเหตุ**: RLS policies ยังไม่ได้สร้างใน migration ต้องเพิ่มเองตามความเหมาะสม

---

## 🎓 ตัวอย่างข้อมูล

### โปรเจกต์ตัวอย่าง
- **ชื่อ**: โปรเจกต์สิ่งแวดล้อม
- **ชั้น**: ป.4
- **ห้อง**: KBW
- **ครู**: อ.สมหญิง
- **ภาคเรียน**: 2568-2
- **เดือน**: พฤศจิกายน

### นักเรียนตัวอย่าง

| รหัส | ชื่อ | สื่อสาร | คิด | แก้ปัญหา | ชีวิต | เทค | รวม | ผล |
|------|------|---------|-----|----------|-------|-----|-----|-----|
| 65001 | สมชาย ใจดี | 3 | 3 | 3 | 2 | 3 | 14 | excellent |
| 65002 | สมหมาย รักเรียน | 2 | 2 | 2 | 2 | 2 | 10 | pass |
| 65003 | สมศรี เรียนดี | 1 | 2 | 2 | 2 | 2 | 9 | fail |

---

## 📞 Support

**ปัญหา/คำถาม**:
- เช็คเอกสาร: `docs/PBL_ASSESSMENT_FEATURE.md`
- ดูตัวอย่าง: `public/PBL_Import_Template.xlsx`
- อ่านคำแนะนำ: `public/PBL_Import_Template.md`

**ติดต่อ IT**:
- Email: pumet3104@gmail.com
- Supabase Project: ebyelctqcdhjmqujeskx

---

## 🚧 Future Enhancements

### Phase 2
- [ ] Export Excel report
- [ ] Student individual PBL history
- [ ] Trend analysis over time
- [ ] Integration with GPA

### Phase 3
- [ ] Mobile app
- [ ] Real-time grading
- [ ] AI suggestions
- [ ] Parent portal

---

**สร้างโดย**: Claude Cowork  
**วันที่**: 17 มิถุนายน 2569  
**โรงเรียน**: วรนาถวิทยากำแพงเพชร  
**Version**: 1.0.0

---

## ✨ สรุป

ระบบ PBL Assessment พร้อมใช้งาน ครบทั้ง:
1. ✅ Database schema (2 tables)
2. ✅ Import function (Edge Function)
3. ✅ Dashboard UI (React component)
4. ✅ Excel template (auto-generate)
5. ✅ Documentation (3 files)
6. ✅ Deploy scripts (automation)

**ขั้นตอนต่อไป**: Deploy แล้วทดสอบนำเข้าข้อมูลจริง 🎯
