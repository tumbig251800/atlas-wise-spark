

# แผนแก้ไข: CSV Import ไม่สร้าง Diagnostic Events (System Gap Report ว่างเปล่า)

## สาเหตุของปัญหา

จากการตรวจสอบไฟล์ CSV พบว่ามีข้อมูลที่ควรแสดงใน System Gap Report จริง เช่น แถววันที่ 17/12/2025 ที่ครูวรกานต์ระบุ Major Gap = **System-Gap** (เวลาไม่พอ / สื่อการสอนไม่มี)

ปัญหาคือ: **`UploadCSV.tsx` เพียงแค่ insert ข้อมูลลงตาราง `teaching_logs` เท่านั้น** แต่ไม่ได้เรียก Backend Function `atlas-diagnostic` ซึ่งเป็นตัวสร้างข้อมูลในตาราง `diagnostic_events` (รวมถึง strike_counter, remedial_tracking, pivot_events)

เมื่อไม่มี diagnostic_events → System Gap Report ที่กรอง `status_color === "blue"` จึงว่างเปล่า

```text
ปัจจุบัน:
  CSV → teaching_logs ✅ → (จบ) ❌

ที่ควรจะเป็น:
  CSV → teaching_logs ✅ → atlas-diagnostic ✅ → diagnostic_events ✅
```

## ไฟล์ที่ต้องแก้ (1 ไฟล์)

| ไฟล์ | สิ่งที่ทำ |
|------|-----------|
| `src/pages/UploadCSV.tsx` | หลัง insert สำเร็จแต่ละแถว เรียก `atlas-diagnostic` function |

### การแก้ไข: เรียก atlas-diagnostic หลัง insert สำเร็จ

ใน loop ที่ insert แต่ละแถว เมื่อ insert สำเร็จ (ไม่มี error):

1. เปลี่ยน insert ให้ใช้ `.select("id").single()` เพื่อรับ `logData.id` กลับมา
2. เรียก `supabase.functions.invoke("atlas-diagnostic", { body: { logId: logData.id } })` แบบ fire-and-forget (ใช้ `.catch(() => {})` เพื่อไม่ให้ error ของ diagnostic หยุดการ import)
3. เพิ่ม delay เล็กน้อย (100ms) ระหว่างแถว เพื่อไม่ให้ backend ทำงานหนักเกินไป

```typescript
// เปลี่ยนจาก:
const { error } = await supabase.from("teaching_logs").insert({...});

// เป็น:
const { data: logData, error } = await supabase.from("teaching_logs")
  .insert({...})
  .select("id")
  .single();

if (!error && logData?.id) {
  ok++;
  // Fire-and-forget: เรียก diagnostic engine
  supabase.functions.invoke("atlas-diagnostic", {
    body: { logId: logData.id }
  }).catch(() => {});
} else if (error) {
  errs.push(...);
}
```

## ผลลัพธ์ที่คาดหวัง

- CSV ที่มี `System-Gap` → สร้าง diagnostic_events ที่มี `status_color = "blue"` → แสดงใน System Gap Report
- CSV ที่มี `P-Gap`, `K-Gap` → สร้าง diagnostic_events สีอื่นๆ และอัปเดต Strike Counter
- ข้อมูลที่ import ไปแล้วก่อนหน้านี้จะไม่มี diagnostic events (ต้อง re-import หรือ trigger ด้วยตนเอง)

