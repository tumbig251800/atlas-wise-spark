

## แผนแก้ไข: เพิ่มคอลัมน์ `academic_term` ในตาราง `teaching_logs`

### ปัญหา
CSV upload ล้มเหลวเพราะโค้ดพยายาม insert คอลัมน์ `academic_term` ที่ยังไม่มีในฐานข้อมูล

### ขั้นตอน

**Step 1: สร้าง Migration เพิ่มคอลัมน์**
- เพิ่มคอลัมน์ `academic_term TEXT DEFAULT NULL` ในตาราง `teaching_logs`

```sql
ALTER TABLE public.teaching_logs 
ADD COLUMN academic_term text DEFAULT NULL;
```

**Step 2: ตรวจสอบโค้ดที่ใช้คอลัมน์นี้**
- `src/pages/UploadCSV.tsx` บรรทัด 92 — insert `academic_term` ✅ ใช้ได้ทันทีหลังเพิ่มคอลัมน์
- ไม่ต้องแก้โค้ดฝั่ง frontend เพราะ Cursor เขียนไว้ถูกต้องแล้ว

รวมทั้งหมด: **1 migration เท่านั้น ไม่ต้องแก้โค้ด**

