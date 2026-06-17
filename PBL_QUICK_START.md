# PBL Assessment - Quick Start Guide

## โรงเรียนวรนาถวิทยากำแพงเพชร

### 🚀 ติดตั้ง (5 นาที)

```bash
cd /Users/tum_macmini/atlas-wise-spark

# Deploy ทั้งหมด
./scripts/deploy-pbl-feature.sh
```

### 📝 ใช้งาน

#### สำหรับครู

1. **ดาวน์โหลด Template**
   - ไฟล์: `public/PBL_Import_Template.xlsx`
   - มีตัวอย่างข้อมูล 5 คน

2. **กรอกคะแนน**
   - เปิดไฟล์ Excel
   - แท็บ "ATLAS Import" - กรอกข้อมูล
   - แท็บ "คำแนะนำ" - วิธีใช้

3. **นำเข้า**
   - เข้า `/pbl`
   - คลิก "นำเข้าคะแนน PBL"
   - เลือกไฟล์ → Done!

#### สำหรับผู้บริหาร

1. เข้า `/pbl`
2. กรองข้อมูล (ภาคเรียน/ชั้น/ห้อง)
3. ดู Dashboard

---

### 📊 โครงสร้างข้อมูล Excel

| student_id | student_name | grade_level | classroom | teacher_name | project_name | academic_term | month | com_score | think_score | problem_score | life_score | tech_score | overall_result | notes |
|------------|--------------|-------------|-----------|--------------|--------------|---------------|-------|-----------|-------------|---------------|------------|------------|----------------|-------|
| 65001 | สมชาย ใจดี | ป.4 | KBW | อ.สมหญิง | โปรเจกต์ฯ | 2568-2 | พฤศจิกายน | 3 | 3 | 3 | 2 | 3 | excellent | ... |

**คะแนน**: 1 = ปรับปรุง, 2 = ดี, 3 = ดีเยี่ยม

---

### 🎯 เกณฑ์ผล

- **excellent** = ไม่มี 1 และมี 3 อย่างน้อย 3 ด้าน
- **fail** = มี 1 ในด้านใดก็ได้
- **pass** = ที่เหลือ

---

### ✅ Checklist

- [ ] Migration applied (`npx supabase db push`)
- [ ] Function deployed (`npx supabase functions deploy import-pbl`)
- [ ] Template downloaded (`public/PBL_Import_Template.xlsx`)
- [ ] Dashboard accessible (`/pbl`)

---

### 📚 เอกสารเพิ่มเติม

- **Full docs**: `docs/PBL_ASSESSMENT_FEATURE.md`
- **Summary**: `PBL_ASSESSMENT_SUMMARY.md`
- **Template guide**: `public/PBL_Import_Template.md`

---

**Support**: pumet3104@gmail.com  
**Supabase**: ebyelctqcdhjmqujeskx
