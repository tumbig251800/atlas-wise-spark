

# แผนแก้ไข: CSV Import ล้มเหลว 20 แถว (mastery_score check constraint)

## สาเหตุหลัก (Root Cause)

ไฟล์ CSV จาก Google Forms มี **header แบบ multi-line** (หัวคอลัมน์ที่มีคำอธิบายยาวอยู่ในเครื่องหมายคำพูด ครอบคลุมบรรทัดที่ 1-32) แต่ parser ปัจจุบันแยกบรรทัดด้วย `\n` ก่อนแล้วค่อยจับคู่ — ทำให้:

1. **Column mapping ผิด**: บรรทัดที่ 1 ถูกตัดกลางทาง (เพราะ quoted field มี newline) → `buildColumnMap` จับคู่คอลัมน์ผิดตำแหน่ง → อ่าน mastery_score จากคอลัมน์ที่ไม่ใช่ตัวเลข → ได้ 0
2. **mastery_score = 0 ผิด constraint**: ฐานข้อมูลมี `CHECK (mastery_score BETWEEN 1 AND 5)` แต่ parser ใช้ `Math.max(0, ...)` ทำให้ค่าต่ำสุดเป็น 0

## ไฟล์ที่ต้องแก้ (1 ไฟล์)

| ไฟล์ | สิ่งที่ทำ |
|------|-----------|
| `src/lib/csvImport.ts` | 3 การแก้ไข |

### การแก้ไขที่ 1: รองรับ multi-line CSV rows

เพิ่มฟังก์ชัน `splitCSVRows(text)` ที่รวมบรรทัดที่อยู่ภายในเครื่องหมายคำพูดเข้าด้วยกัน แทนที่จะ split ด้วย `\n` ตรงๆ

```text
ก่อน: text.split(/\r?\n/).filter(l => l.trim())
หลัง: splitCSVRows(text)  // respect quoted multi-line fields
```

### การแก้ไขที่ 2: ตรวจจับ data row แรก (skip description lines)

เพิ่มการสแกนหาบรรทัดแรกที่เริ่มด้วยรูปแบบวันที่/timestamp เพื่อข้าม description block ของ Google Forms:

```text
// สแกนหาแถวแรกที่ขึ้นต้นด้วย timestamp หรือวันที่
// เช่น "15/12/2025, 14:04:34" หรือ "2026-02-09"
// แถวก่อนหน้า = header row จริง
```

### การแก้ไขที่ 3: mastery_score ขั้นต่ำ = 1

```text
ก่อน: Math.min(5, Math.max(0, parseInt(masteryStr, 10) || 0))
หลัง: Math.min(5, Math.max(1, parseInt(masteryStr, 10) || 1))
```

## ผลลัพธ์ที่คาดหวัง

- CSV จาก Google Forms (header multi-line 32 บรรทัด) นำเข้าได้สำเร็จ
- CSV จาก Export มาตรฐาน (header 1 บรรทัด) ยังทำงานได้เหมือนเดิม
- mastery_score จะอยู่ในช่วง 1-5 เสมอ ไม่มี constraint violation

