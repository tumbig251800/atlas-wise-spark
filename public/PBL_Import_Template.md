# PBL Assessment Import Template

## คำแนะนำการใช้งาน

### 1. โครงสร้างไฟล์ Excel

ไฟล์ Excel ต้องมี **แท็บชื่อ "ATLAS Import"** โดยมีโครงสร้างดังนี้:

| คอลัมน์ | ชื่อ field | ตอนประเภท | ตัวอย่าง |
|---------|-----------|-----------|----------|
| A | student_id | Text | 65001 |
| B | student_name | Text | สมชาย ใจดี |
| C | grade_level | Text | ป.4 |
| D | classroom | Text | KBW |
| E | teacher_name | Text | อ.สมหญิง |
| F | project_name | Text | โปรเจกต์สิ่งแวดล้อม |
| G | academic_term | Text | 2568-2 |
| H | month | Text | พฤศจิกายน |
| I | com_score | Number (1-3) | 2 |
| J | think_score | Number (1-3) | 3 |
| K | problem_score | Number (1-3) | 2 |
| L | life_score | Number (1-3) | 2 |
| M | tech_score | Number (1-3) | 3 |
| N | total_score | Number | 12 (คำนวณอัตโนมัติ) |
| O | overall_result | Text | excellent / pass / fail |
| P | notes | Text | (optional) หมายเหตุเพิ่มเติม |

### 2. กฎการกรอกข้อมูล

#### คะแนนสมรรถนะ (1-3)
- **3** = ดีเยี่ยม (Excellent)
- **2** = ดี (Good)
- **1** = ปรับปรุง (Needs Improvement)

#### สมรรถนะ 5 ด้าน
1. **com_score** - การสื่อสาร (Communication)
2. **think_score** - การคิด (Thinking)
3. **problem_score** - การแก้ปัญหา (Problem Solving)
4. **life_score** - ทักษะชีวิต (Life Skills)
5. **tech_score** - เทคโนโลยี (Technology)

#### เกณฑ์สรุปผล (overall_result)
- **excellent** = ไม่มีด้านใดได้ 1 และมีด้านที่ได้ 3 ตั้งแต่ 3 ด้านขึ้นไป
- **fail** = มีด้านใดด้านหนึ่งได้ 1
- **pass** = ที่เหลือ

### 3. ตัวอย่างข้อมูล

```
student_id | student_name | grade_level | classroom | teacher_name | project_name | academic_term | month | com_score | think_score | problem_score | life_score | tech_score | total_score | overall_result | notes
65001 | สมชาย ใจดี | ป.4 | KBW | อ.สมหญิง | โปรเจกต์สิ่งแวดล้อม | 2568-2 | พฤศจิกายน | 3 | 3 | 3 | 2 | 3 | 14 | excellent | นักเรียนมีความคิดสร้างสรรค์
65002 | สมหมาย รักเรียน | ป.4 | KBW | อ.สมหญิง | โปรเจกต์สิ่งแวดล้อม | 2568-2 | พฤศจิกายน | 2 | 2 | 2 | 2 | 2 | 10 | pass | 
65003 | สมศรี เรียนดี | ป.4 | KBW | อ.สมหญิง | โปรเจกต์สิ่งแวดล้อม | 2568-2 | พฤศจิกายน | 1 | 2 | 2 | 2 | 2 | 9 | fail | ต้องพัฒนาด้านการสื่อสาร
```

### 4. ข้อควรระวัง

✅ **ทำ**
- ใส่ชื่อแท็บเป็น "ATLAS Import" (ตัวพิมพ์ใหญ่-เล็กตรงกัน)
- กรอกข้อมูลโปรเจกต์ให้ครบทุกแถว (grade_level, classroom, teacher_name, project_name, academic_term, month)
- ใส่คะแนนเป็นตัวเลข 1, 2, หรือ 3 เท่านั้น
- ใส่ overall_result เป็น excellent, pass, หรือ fail (ตัวพิมพ์เล็กทั้งหมด)

❌ **ไม่ควรทำ**
- ข้ามแถวว่าง (ถ้า student_id ว่างจะข้ามแถวนั้น)
- ใส่คะแนนเป็นตัวอักษร หรือตัวเลขนอกช่วง 1-3
- ใส่ overall_result เป็นภาษาไทย (ต้องเป็นภาษาอังกฤษ)

### 5. วิธีการ Import

1. เตรียมไฟล์ Excel ตามโครงสร้างข้างต้น
2. เข้าหน้า PBL Dashboard (/pbl)
3. คลิกปุ่ม "นำเข้าคะแนน PBL"
4. เลือกไฟล์ Excel
5. ระบบจะแสดงผลการนำเข้า

### 6. กรณีนำเข้าซ้ำ

- หากนำเข้าโปรเจกต์เดิม (ชื่อ, ห้อง, ภาคเรียนเดียวกัน) → ระบบจะ **อัพเดต**
- หากนำเข้านักเรียนซ้ำในโปรเจกต์เดียวกัน → ระบบจะ **อัพเดตคะแนน**
- ไม่มีการลบข้อมูลเดิม

### 7. การตรวจสอบข้อมูล

หลังนำเข้าแล้ว สามารถตรวจสอบได้ที่:
- **Cards สรุป** - จำนวนโปรเจกต์, ดีเยี่ยม%, ผ่าน%, ไม่ผ่าน%
- **กราฟ** - คะแนนเฉลี่ย 5 ด้านรายโปรเจกต์
- **ตารางนักเรียนไม่ผ่าน** - รายชื่อนักเรียนที่ต้องเฝ้าระวัง

---

*โรงเรียนวรนาถวิทยากำแพงเพชร - ATLAS PBL Assessment System*
