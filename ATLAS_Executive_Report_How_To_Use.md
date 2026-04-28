# 📊 ATLAS Executive Report Template — คู่มือการใช้งาน

## ภาพรวม

ไฟล์ `ATLAS_Executive_Report_Template.xlsx` เป็นเทมเพลตสำเร็จรูปสำหรับสร้างรายงานผู้บริหารจากข้อมูล ATLAS ทันที

ประกอบด้วย **6 Sheets** ที่ออกแบบมาพร้อม:

- ✅ การจัดรูปแบบแบบ Executive
- ✅ สีตามธีม ATLAS (RED/ORANGE/YELLOW/BLUE/GREEN)
- ✅ ข้อมูลตัวอย่างพร้อมใช้งาน
- ✅ เตรียมให้ปรับปรุงข้อมูลได้ทันที

---

## 📑 โครงสร้าง 6 Sheets

### Sheet 1: 📊 Executive Summary (หน้าแรก)

**ผู้บริหารจะเห็นก่อน**


| ส่วน                  | เนื้อหา                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| **KPI Cards**         | • Total Sessions: 140 • Avg Mastery Score: 4.28/5 • Growth Velocity: +11% • Success Rate: 73.6%              |
| **Diagnostic Status** | • RED (วิกฤต): 2 • ORANGE (เฝ้าระวัง): 3 • YELLOW (Learning): 5 • BLUE (System-Gap): 0 • GREEN (สำเร็จ): 130 |
| **Top 3 Problems**    | 1. การอ่านและการเขียน (P-Gap) 2. เลขคณิต (K-Gap) 3. ภาษาอังกฤษ (System-Gap)                                  |
| **Action Items**      | • 2 Strike Force Pivot • 1 A2-Gap Referral • 3 TrendAlert Falling                                            |


**ปรับปรุง**: เปลี่ยนตัวเลขในช่องขาว (B5-B8, B11-B15)

---

### Sheet 2: 🎨 Diagnostic Analysis

**การแจกแจงสถานะสี**

ตาราง:

- Status (สี) | Count | Percentage | Category
- ใช้สำหรับแสดงเห็นภาพว่า distribution ของปัญหาเป็นอย่างไร

**ตัวอย่าง**:

```
RED:    2/140 = 1.4%
ORANGE: 3/140 = 2.1%
...
GREEN: 130/140 = 92.9%
```

**ปรับปรุง**: อัปเดตตัวเลขใน Column B

---

### Sheet 3: 🚨 Alert Status

**รายการแจ้งเตือนและ Escalation**

ตาราง:

- Alert Type | Count | Action Required
- TrendAlert - Falling: 2
- TrendAlert - Redzone: 1
- Strike 1 (Plan Fail): 4
- Strike 2+ (Force Pivot): 2
- A2-Gap Referral: 1

**สำหรับ**: ติดตามระบบแจ้งเตือน

---

### Sheet 4: 🎯 Problem Hotspots

**รายละเอียดปัญหาอันดับต้น 3**

ตาราง:


| Subject    | Avg Score | Red Zone Count | Main Gap   | Recommendation |
| ---------- | --------- | -------------- | ---------- | -------------- |
| การอ่าน    | 3.39      | 5              | P-Gap      | เพิ่มแบบฝึกหัด |
| เลขคณิต    | 3.85      | 3              | K-Gap      | ทบทวนพื้นฐาน   |
| ภาษาอังกฤษ | 4.10      | 2              | System-Gap | ปรับหลักสูตร   |


**ปรับปรุง**: เปลี่ยนชื่อวิชา คะแนน และข้อเสนอแนะ

---

### Sheet 5: 💡 Recommendations

**คำแนะนำเชิงกลยุทธ์**

ตาราง:


| Recommendation                  | Priority | Implementation           |
| ------------------------------- | -------- | ------------------------ |
| เพิ่มคำวิจารณ์การสอนวิชาการอ่าน | HIGH     | ครูนำเสนอแผนในสัปดาห์นี้ |
| เพิ่มชั่วโมงสวนกิจ              | HIGH     | วิชาการประสานงาน         |
| ทบทวนหลักสูตร                   | MEDIUM   | ผู้บริหารเรียกประชุม     |


**ลักษณะ**:

- HIGH = สีแดง
- MEDIUM = สีเหลือง

---

### Sheet 6: 📋 Data Input

**แบบจำเป็นสำหรับอัปเดตข้อมูล**

รายการ input:

- Total Sessions
- Average Mastery Score
- Count สำหรับแต่ละ Diagnostic Color
- Count Alert แต่ละประเภท
- Growth Velocity %

**วิธีใช้**: แก้ไขตัวเลขใน Column B เพื่ออัปเดตรายงาน

---

## 🔄 วิธีการใช้งาน (3 ขั้นตอน)

### ขั้นที่ 1 — เตรียมข้อมูล

จากระบบ ATLAS ดึง:

1. จำนวน Teaching Log ทั้งหมด
2. Diagnostic Events (นับแยกตามสี)
3. Strike Counter (รวมทั้ง Active)
4. TrendAlerts (Falling + Redzone)
5. A2-Gap Referral Queue

### ขั้นที่ 2 — อัปเดตข้อมูล

1. เปิด Sheet 6 "📋 Data Input"
2. แก้ไขตัวเลขในช่องสีฟ้า (Column B)
3. Sheet อื่น ๆ จะอัปเดตอัตโนมัติ

### ขั้นที่ 3 — เสนอรายงาน

1. ดู Sheet 1 "📊 Executive Summary" เป็นอันดับแรก
2. Drill-down ไปยัง Sheet อื่น ๆ ตามตัวบ่งชี้
3. Print หรือ Export เป็น PDF

---

## 🎨 Color Scheme ATLAS


| สี        | Hex    | ความหมาย            | ตัวอย่าง                            |
| --------- | ------ | ------------------- | ----------------------------------- |
| 🔴 RED    | EF4444 | วิกฤต/ต้องดำเนินการ | Strike 2+, Critical Alert           |
| 🟠 ORANGE | F97316 | เฝ้าระวัง/สำคัญ     | Priority: HIGH                      |
| 🟡 YELLOW | FBC924 | Learning/ระวัง      | Priority: MEDIUM, Yellow diagnostic |
| 🔵 BLUE   | 3B82F6 | System-Gap          | System-level issues                 |
| 🟢 GREEN  | 22C55E | สำเร็จ              | Success path, all clear             |


---

## 💡 เคล็ดลับ

### ✅ Best Practices

- **อัปเดตข้อมูลสัปดาห์ละครั้ง** → สังเกตแนวโน้ม
- **เก็บสำเนา** → เปรียบเทียบรายงานช่วงต่าง ๆ
- **ใช้ Conditional Formatting** → ชั้นเรียนที่มี Strike 2+ ให้สี RED
- **เพิ่ม Chart** → Visual ช่วยให้ผู้บริหารจำได้ดีกว่า

### ⚠️ หลีกเลี่ยง

- ❌ ไม่เปลี่ยนชื่อ Sheet (ระบบอาจเสียหายได้)
- ❌ ไม่ลบแถวใน Sheet 6 "Data Input"
- ❌ ไม่ Hardcode ตัวเลขใน Sheet อื่น (ใช้ Data Input เท่านั้น)

---

## 📈 ตัวอย่างการใช้จริง

### สถานการณ์ 1: จำนวน Red Zone เพิ่มขึ้น

```
Data Input → Sheet 6: เปลี่ยน "Sessions - RED" จาก 2 → 5
→ Sheet 1: KPI card เปลี่ยนเป็น 5
→ Sheet 2: Percentage อัปเดต
→ ผู้บริหาร: "มีปัญหาเพิ่มขึ้น ต้องดำเนินการ"
```

### สถานการณ์ 2: Strike 2+ มี 3 รายการ

```
Data Input → Sheet 6: เปลี่ยน "Strike 2+ Count" จาก 2 → 3
→ Sheet 3: Alert Status อัปเดต
→ Sheet 5: Recommendations ระบุการดำเนินการ
→ ผู้บริหาร: "ต้อง Force Pivot 3 วิชา"
```

---

## 📞 การสนับสนุน

หากต้องการ:

- **เพิ่ม Chart** → ใช้ Insert Chart เลือกข้อมูล
- **เปลี่ยน Layout** → แก้ไข font/สี ตามต้องการ
- **เพิ่ม Sheet ใหม่** → คัดลอก Sheet ที่มีอยู่ แล้วปรับเปลี่ยน

---

*Template Version 1.0 | April 2025 | ATLAS Analytics System*