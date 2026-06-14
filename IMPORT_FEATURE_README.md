# ฟีเจอร์นำเข้าคะแนนหลังหน่วยจาก Excel

## 📁 ไฟล์ที่สร้าง/แก้ไข

### ไฟล์ใหม่
1. **src/lib/unitScoreExcelParser.ts**
   - Parser สำหรับอ่านไฟล์ Excel template
   - คำนวณ k_score จาก SUM(col E-H)
   - คำนวณ p_score จาก SUM(col I-N)
   - อ่าน a_score จาก col O
   - Validate รายข้อ (ต้องเป็น 0 หรือ 1)
   - Validate คะแนนไม่เกินเต็ม

2. **src/components/unit-score/UnitScoreImporter.tsx**
   - Dialog 4 ขั้นตอน:
     - ขั้น 1: เลือกไฟล์ .xlsx
     - ขั้น 2: Parse + Validate
     - ขั้น 3: Preview พร้อมแจ้งเตือนรหัสที่ไม่พบ
     - ขั้น 4: บันทึกลง unit_assessments (upsert)
   - Responsive - ใช้งานได้บนมือถือ
   - แสดง progress ระหว่างบันทึก

3. **public/templates/แบบบันทึกคะแนนหลังหน่วย_ATLAS.xlsx**
   - ไฟล์ placeholder (ขนาด 0 bytes)
   - **TODO: ต้อง copy ไฟล์ template จริงมาแทนที่**

### ไฟล์แก้ไข
1. **src/components/unit-score/UnitScoreEntry.tsx**
   - เพิ่ม import `UnitScoreImporter`
   - เพิ่ม state `showImporter`
   - เพิ่มปุ่ม 2 ปุ่ม:
     - 🔽 **ดาวน์โหลด Template** (ดาวน์โหลดจาก /templates/)
     - 📤 **นำเข้าจาก Excel** (เปิด dialog)
   - เพิ่ม callback `onImportSuccess` เพื่อ reload ข้อมูลหลังนำเข้าสำเร็จ

---

## 🏗️ โครงสร้าง Excel Template (อ้างอิงจากโจทย์)

```
แถว 1: หัวเอกสาร (ข้าม)
แถว 2: metadata
  - B2: วิชา
  - D2: ชั้น
  - F2: ห้อง
  - H2: หน่วย
  - J2: ภาคเรียน
  - L2: วันที่สอบ

แถว 3: คะแนนเต็ม
  - C3: k_total
  - F3: p_total
  - I3: a_total

แถว 7-36: ข้อมูลนักเรียน (30 คน)
  - C: student_id
  - D: ชื่อ-สกุล
  - E-H: K รายข้อ (4 ข้อ) — ต้องเป็น 0 หรือ 1
  - I-N: P รายข้อ (6 ข้อ) — ต้องเป็น 0 หรือ 1
  - O: A score (0-2)
  - P: K รวม (สูตร — ไม่ใช้ แต่คำนวณเอง)
  - Q: P รวม (สูตร — ไม่ใช้ แต่คำนวณเอง)
  - R: A รวม (link จาก O)
  - S: รวมทั้งหมด (สูตร)
```

**สำคัญ:** Parser คำนวณ k_score และ p_score จากรายข้อเอง ไม่ใช้ค่าจากคอลัมน์ P, Q
เพราะ SheetJS อาจอ่านค่าสูตรไม่ได้ถ้าไม่ recalc

---

## 🧪 วิธีทดสอบ

### ก่อน deploy

1. **ทดสอบ TypeScript compile**
   ```bash
   cd /Users/tum_macmini/atlas-wise-spark
   npm run build
   ```
   ✅ ผ่านแล้ว (ไม่มี error)

2. **เตรียมไฟล์ template จริง**
   - Copy ไฟล์ `แบบบันทึกคะแนนหลังหน่วย_ATLAS.xlsx` ที่มีข้อมูลจริง
   - วางทับไฟล์ที่ `public/templates/แบบบันทึกคะแนนหลังหน่วย_ATLAS.xlsx`
   - ตรวจสอบว่าโครงสร้าง cell ตรงกับที่ parser คาดหวัง (B2, D2, F2, ...)

3. **ทดสอบ dev server**
   ```bash
   npm run dev
   ```
   - เปิด http://localhost:5173
   - ไปที่หน้า "บันทึกคะแนนหน่วย" > แท็บ "📝 บันทึกคะแนน Grid"
   - ตรวจสอบปุ่ม 2 ปุ่มปรากฏ:
     - 🔽 ดาวน์โหลด Template
     - 📤 นำเข้าจาก Excel

4. **ทดสอบดาวน์โหลด template**
   - กดปุ่ม "ดาวน์โหลด Template"
   - ควรดาวน์โหลดไฟล์ .xlsx ได้

5. **ทดสอบนำเข้า Excel**
   - กรอกข้อมูลในไฟล์ template (วิชา, ชั้น, ห้อง, หน่วย, K/P/A total, ข้อมูลนักเรียน)
   - กดปุ่ม "นำเข้าจาก Excel"
   - เลือกไฟล์
   - ตรวจสอบ:
     - ✅ อ่านไฟล์ได้ ไม่มี error
     - ✅ แสดง preview ถูกต้อง
     - ✅ คำนวณ k_score, p_score ถูกต้อง (เช็คกับค่าที่กรอก)
     - ✅ แสดงเตือนถ้ารหัสนักเรียนไม่พบ
     - ✅ กด "ยืนยันนำเข้า" บันทึกได้
     - ✅ หลังบันทึก ข้อมูลปรากฏในหน้ากรอกคะแนนเดิมทันที

6. **ทดสอบ edge cases**
   - อัปโหลดไฟล์ที่มี student_id ไม่ตรงกับในระบบ → ควรแจ้งเตือนและข้าม
   - อัปโหลดไฟล์ที่มีข้อมูลซ้ำ (หน่วยเดิม) → ควรถาม confirm และ UPDATE
   - อัปโหลดไฟล์ที่มีค่ารายข้อไม่ใช่ 0/1 → ควรแจ้ง error
   - อัปโหลดไฟล์ที่คะแนนเกินเต็ม → ควระแจ้ง error

7. **ทดสอบบนมือถือ**
   - เปิด dev server ด้วย `npm run dev -- --host`
   - เปิดจากมือถือ
   - ตรวจสอบ:
     - ✅ Dialog ใช้งานได้
     - ✅ ตาราง preview scroll ได้
     - ✅ ปุ่มกดได้สะดวก

---

## ✅ Acceptance Criteria

- [x] อ่านโค้ดเดิมครบ (UnitScorePage, UnitScoreEntry, UnitScoreGrid, auth hooks)
- [x] สร้าง `unitScoreExcelParser.ts` - parser + validator
- [x] สร้าง `UnitScoreImporter.tsx` - dialog 4 ขั้นตอน
- [x] แก้ไข `UnitScoreEntry.tsx` - เพิ่ม 2 ปุ่ม
- [x] สร้างโฟลเดอร์ `public/templates/` + placeholder
- [x] ทดสอบ TypeScript compile ผ่าน
- [ ] **TODO: วางไฟล์ template จริง**
- [ ] **TODO: ทดสอบ UI responsive บนมือถือ**
- [ ] **TODO: ทดสอบ end-to-end กับข้อมูลจริง**

---

## 🔧 ปรับแต่ง metadata cell positions

**สำคัญ:** Parser ตอนนี้ใช้ตำแหน่ง cell ตามที่เดา:
- วิชา = B2
- ชั้น = D2
- ห้อง = F2
- หน่วย = H2
- ภาคเรียน = J2
- วันที่สอบ = L2

**ถ้าไฟล์ template จริงใช้ตำแหน่งต่าง** ให้แก้ไขที่:
```typescript
// src/lib/unitScoreExcelParser.ts
const subject = getCellString(sheet, "B2");      // ← แก้ตรงนี้
const gradeLevel = getCellString(sheet, "D2");   // ← แก้ตรงนี้
const classroom = getCellString(sheet, "F2");    // ← แก้ตรงนี้
// ...
```

---

## 📝 Next Steps

1. Copy ไฟล์ template จริงมาแทนที่ placeholder
2. ตรวจสอบ cell positions ในไฟล์จริง แก้ parser ถ้าจำเป็น
3. ทดสอบ end-to-end
4. Deploy to Vercel
