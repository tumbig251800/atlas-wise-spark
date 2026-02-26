

## ผลการตรวจสอบ: กราฟ vs ข้อมูลจริงในบันทึกหลังสอน

### ข้อมูลจริงจาก CSV (20 แถว) เทียบกับฐานข้อมูล — ตรงกัน 100%

| วันที่ | Mastery | Gap | DB ตรง? |
|--------|---------|-----|---------|
| 15/12 | 2 | P-Gap | ✓ |
| 16/12 | 4 | Success | ✓ |
| 17/12 | 3 | System-Gap | ✓ |
| 19/12 | 4 | Success | ✓ |
| 22/12 | 3 | K-Gap | ✓ |
| 23/12 | 4 | Success | ✓ |
| 5/1 | 5 | Success | ✓ |
| 6/1 | 4 | System-Gap | ✓ |
| 7/1 | 4 | Success | ✓ |
| 19/1 | 4 | Success | ✓ |
| 21/1 | 4 | P-Gap | ✓ |
| 23/1 | 4 | Success | ✓ |
| 26/1 | 4 | Success | ✓ |
| 30/1 | 4 | Success | ✓ |
| 2/2 | 4 | Success | ✓ |
| 4/2 | 5 | Success | ✓ |
| 9/2 | 4 | Success | ✓ |
| 10/2 | 5 | Success | ✓ |
| 11/2 | 4 | Success | ✓ |
| 18/2 | 4 | Success | ✓ |

---

### กราฟที่ถูกต้อง

| กราฟ | ค่าที่แสดง | ข้อมูลจริง | ตรง? |
|------|-----------|-----------|------|
| **Gap Pie Chart** | Success 75%, P-Gap 10%, System 10%, K-Gap 5% | 15/2/2/1 จาก 20 | ✓ |
| **Data Pack (5 คาบล่าสุด)** | mastery 5,4,5,4,4 — all Success | ตรงกับ DB | ✓ |
| **QWR Trend** | Baseline 3.25, Current 4.25, +20% | (2+4+3+4)/4=3.25, last4=4.25 | ✓ |
| **Strike Escalation** | 1 รายการ, strike 0/2, PASS | ตรงกับ DB | ✓ |

---

### BUG ที่พบ (2 จุด)

#### BUG 1: Diagnostic Color Counts นับรวมแถวรายนักเรียน (ร้ายแรง)

หน้าจอแสดง: RED=0, **ORANGE=13**, Learning Curve=0, **System Gap=4**, **GREEN=44**
ค่าจริง (session-level เท่านั้น): ORANGE=**3**, System Gap=**2**, GREEN=**15**

**สาเหตุ**: `useDiagnosticData.ts` ดึง `diagnostic_events` ทั้งหมด 61 แถว (20 session + 41 student) แล้วนับสีรวมกัน ทำให้ตัวเลขบวมเกินจริง

**แก้ไข**: เพิ่ม `.is("student_id", null)` ในคิวรี `diagnostic_events` ที่ใช้คำนวณ `colorCounts` หรือกรองเฉพาะ `student_id === null` ก่อนนับสี

#### BUG 2: Mastery เฉลี่ยแสดงเป็น "4%" (ทำให้เข้าใจผิด)

ค่าจริง: เฉลี่ย 4.05 จากสเกล 1-5 แต่ `ExecutiveMetricCards` แสดงเป็น `4%` ซึ่งดูเหมือน 4 เปอร์เซ็นต์

**แก้ไข**: เปลี่ยนการแสดงผลเป็น `4.0/5` หรือแปลงเป็นเปอร์เซ็นต์จริง `81%` (= 4.05/5 × 100)

---

### แผนแก้ไข

1. **แก้ `useDiagnosticData.ts`**: กรอง `student_id IS NULL` ก่อนคำนวณ `colorCounts` เพื่อให้นับเฉพาะ Session-Level ตามกฎ Strict UI Policy
2. **แก้ `ExecutiveMetricCards.tsx`**: เปลี่ยนจาก `${avgMastery}%` เป็น `${(avgMastery/5*100).toFixed(0)}%` หรือแสดงเป็นสเกล `/5`

