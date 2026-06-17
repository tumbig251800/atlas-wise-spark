# PBL Assessment Feature

## ภาพรวม

ระบบประเมินสมรรถนะ Project-Based Learning (PBL) สำหรับบันทึกและติดตามผลการเรียนรู้ผ่านโปรเจกต์ของนักเรียน โดยครูสามารถกรอกคะแนนผ่าน Excel และ upload เข้าระบบ

## โครงสร้างระบบ

### 1. Database Schema

**ตาราง pbl_projects** - เก็บข้อมูลโปรเจกต์
- id (UUID, PK)
- project_name (TEXT) - ชื่อโปรเจกต์
- grade_level (TEXT) - ระดับชั้น เช่น "ป.4"
- classroom (TEXT) - ชื่อห้อง เช่น "KBW"
- teacher_name (TEXT) - ชื่อครู
- academic_term (TEXT) - ภาคเรียน เช่น "2568-2"
- month (TEXT) - เดือน เช่น "พฤศจิกายน"
- created_at, updated_at (TIMESTAMPTZ)

**Unique constraint**: (project_name, grade_level, classroom, academic_term)

**ตาราง pbl_assessments** - เก็บคะแนนนักเรียน
- id (UUID, PK)
- project_id (UUID, FK → pbl_projects)
- student_id (TEXT) - รหัสนักเรียน
- student_name (TEXT) - ชื่อนักเรียน
- com_score (SMALLINT, 1-3) - การสื่อสาร
- think_score (SMALLINT, 1-3) - การคิด
- problem_score (SMALLINT, 1-3) - การแก้ปัญหา
- life_score (SMALLINT, 1-3) - ทักษะชีวิต
- tech_score (SMALLINT, 1-3) - เทคโนโลยี
- total_score (SMALLINT, GENERATED) - รวมคะแนนอัตโนมัติ
- overall_result (TEXT) - ผลสรุป: "excellent", "pass", "fail"
- notes (TEXT) - หมายเหตุ
- created_at, updated_at (TIMESTAMPTZ)

**Unique constraint**: (project_id, student_id)

### 2. Edge Function: import-pbl

**Endpoint**: `/functions/v1/import-pbl`
**Method**: POST (multipart/form-data)

**Input**:
- file: Excel file (.xlsx) with "ATLAS Import" sheet

**Process**:
1. อ่าน Excel sheet "ATLAS Import"
2. Parse ข้อมูลโปรเจกต์จาก row แรก
3. Upsert pbl_projects (by unique key)
4. Upsert pbl_assessments (batch, by unique key)

**Output**:
```json
{
  "success": true,
  "project_id": "uuid",
  "project_name": "ชื่อโปรเจกต์",
  "inserted": 5,
  "total": 5
}
```

### 3. Frontend: PBLDashboard Component

**Route**: `/pbl`
**Access**: teacher, director, lead

**Features**:
- ✅ Upload Excel file
- ✅ Filter by academic_term, grade_level, classroom
- ✅ Summary cards (projects, excellent%, pass%, fail%)
- ✅ Bar chart comparing 5 competencies across projects
- ✅ Table of failed students

**Key UI Components**:
- `<Select>` for filters
- `<Card>` for summary stats
- `<BarChart>` from recharts
- `<Table>` for failed students
- File upload button

## การติดตั้ง

### 1. Apply Migration

```bash
cd /Users/tum_macmini/atlas-wise-spark
npx supabase db push
```

หรือ apply ผ่าน Supabase Dashboard:
```bash
# Copy migration content from:
supabase/migrations/20260617000000_create_pbl_assessment_tables.sql
```

### 2. Deploy Edge Function

```bash
npx supabase functions deploy import-pbl
```

### 3. Generate Template

```bash
node scripts/generate-pbl-template.mjs
```

ไฟล์ template จะถูกสร้างที่: `public/PBL_Import_Template.xlsx`

## วิธีใช้งาน

### สำหรับครู

1. **ดาวน์โหลด Template**
   - เข้า `/public/PBL_Import_Template.xlsx`
   - หรือใช้คำสั่ง `node scripts/generate-pbl-template.mjs`

2. **กรอกข้อมูล**
   - เปิดไฟล์ Excel
   - แท็บ "ATLAS Import" - กรอกคะแนนนักเรียน
   - แท็บ "คำแนะนำ" - อ่านวิธีใช้

3. **นำเข้าข้อมูล**
   - เข้าหน้า PBL Dashboard (`/pbl`)
   - คลิกปุ่ม "นำเข้าคะแนน PBL"
   - เลือกไฟล์ Excel
   - ระบบจะแสดงผลการนำเข้า

### สำหรับผู้บริหาร

1. **ดูภาพรวม**
   - เข้าหน้า `/pbl`
   - ดูการ์ดสรุปด้านบน
   - กรองตามภาคเรียน/ระดับชั้น/ห้อง

2. **วิเคราะห์ข้อมูล**
   - ดูกราฟเปรียบเทียบ 5 ด้านสมรรถนะ
   - เช็คตารางนักเรียนไม่ผ่าน
   - วางแผนพัฒนาตามด้านที่อ่อน

## Excel Template Structure

```
| student_id | student_name | grade_level | classroom | teacher_name | project_name | academic_term | month | com_score | think_score | problem_score | life_score | tech_score | total_score | overall_result | notes |
|------------|--------------|-------------|-----------|--------------|--------------|---------------|-------|-----------|-------------|---------------|------------|------------|-------------|----------------|-------|
| 65001      | สมชาย ใจดี   | ป.4         | KBW       | อ.สมหญิง     | โปรเจกต์ฯ    | 2568-2        | พย.   | 3         | 3           | 3             | 2          | 3          | 14          | excellent      | ...   |
```

## เกณฑ์การประเมิน

### คะแนนสมรรถนะ (1-3)
- **3** = ดีเยี่ยม (Excellent)
- **2** = ดี (Good)
- **1** = ปรับปรุง (Needs Improvement)

### สมรรถนะ 5 ด้าน
1. **Communication** (การสื่อสาร)
2. **Thinking** (การคิด)
3. **Problem Solving** (การแก้ปัญหา)
4. **Life Skills** (ทักษะชีวิต)
5. **Technology** (เทคโนโลยี)

### ผลการประเมิน (Overall Result)
- **excellent** = ไม่มีด้านใดได้ 1 และมีด้านที่ได้ 3 ตั้งแต่ 3 ด้านขึ้นไป
- **fail** = มีด้านใดด้านหนึ่งได้ 1
- **pass** = ที่เหลือ

## API Endpoints

### Import PBL Assessments

**POST** `/functions/v1/import-pbl`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body**:
```
file: <Excel file>
```

**Response**:
```json
{
  "success": true,
  "project_id": "uuid",
  "project_name": "โปรเจกต์สิ่งแวดล้อม",
  "inserted": 5,
  "total": 5
}
```

### Query Projects

**GET** `pbl_projects` (via Supabase client)

```typescript
const { data, error } = await supabase
  .from('pbl_projects')
  .select(`
    *,
    pbl_assessments(*)
  `)
  .eq('academic_term', '2568-2')
  .eq('grade_level', 'ป.4');
```

### Query Assessments

**GET** `pbl_assessments` (via Supabase client)

```typescript
const { data, error } = await supabase
  .from('pbl_assessments')
  .select(`
    *,
    pbl_projects(project_name, grade_level, classroom)
  `)
  .eq('overall_result', 'fail');
```

## ข้อควรระวัง

### การ Import ซ้ำ
- ✅ **Safe**: นำเข้าซ้ำจะ UPDATE ข้อมูลเดิม ไม่ใช่ INSERT ใหม่
- ✅ **Safe**: ไม่มีการลบข้อมูลเดิม
- ⚠️ **Note**: ต้องมี unique key ตรงกัน (project + student)

### Validation
- ❌ student_id ว่าง → skip row
- ❌ คะแนนนอกช่วง 1-3 → error
- ❌ overall_result ไม่ใช่ excellent/pass/fail → error
- ❌ ไม่มีแท็บ "ATLAS Import" → error

### Performance
- ✅ Batch upsert (ทุก row ในครั้งเดียว)
- ✅ Index ทุก query column
- ✅ Lazy loading component (React.lazy)

## Troubleshooting

### Import ไม่สำเร็จ

**Problem**: "Sheet 'ATLAS Import' not found"
- **Solution**: ตรวจสอบชื่อแท็บว่าเป็น "ATLAS Import" (ตัวพิมพ์ใหญ่-เล็กตรงกัน)

**Problem**: "Missing required project information"
- **Solution**: ตรวจสอบว่า row แรกมี project_name, grade_level, classroom ครบ

**Problem**: "Invalid score value"
- **Solution**: คะแนนต้องเป็น 1, 2, หรือ 3 เท่านั้น

### Dashboard ไม่แสดงข้อมูล

**Problem**: การ์ดแสดง 0 ทั้งหมด
- **Solution**: ตรวจสอบ filter (academic_term, grade_level, classroom)

**Problem**: กราฟไม่แสดง
- **Solution**: ต้องมีข้อมูลอย่างน้อย 1 โปรเจกต์

## Future Enhancements

### Phase 2 (Optional)
- [ ] Export Excel report
- [ ] Student individual PBL history
- [ ] Competency trend over time
- [ ] Integration with GPA/unit scores
- [ ] Multi-teacher collaboration on same project
- [ ] PDF certificate for excellent students

### Phase 3 (Optional)
- [ ] Mobile app for on-the-go assessment
- [ ] Real-time collaborative grading
- [ ] AI-powered assessment suggestions
- [ ] Parent portal for viewing PBL results

## ผู้พัฒนา

- **โรงเรียน**: วรนาถวิทยากำแพงเพชร
- **ระบบ**: ATLAS (Academic Teaching & Learning Analytics System)
- **Supabase Project**: ebyelctqcdhjmqujeskx
- **Version**: 1.0.0
- **Release Date**: 2026-06-17

---

*Created by Claude Cowork - ATLAS PBL Assessment Feature*
