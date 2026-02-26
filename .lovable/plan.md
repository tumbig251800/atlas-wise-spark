

## แก้ System-Gap Report: กรองเฉพาะ Session-Level

### ปัญหา
System-Gap Report แสดง 4 แถว ทั้งที่มีเพียง 2 session จริง เพราะรวมแถวรายนักเรียน (student_id มีค่า) เข้ามาด้วย ซึ่งผิดหลัก **Strict UI Policy** ที่กำหนดว่าต้องใช้เฉพาะแถว Session-Level (`student_id IS NULL`)

### แผนแก้ไข

**แก้ `src/components/executive/SystemGapReport.tsx`** — 1 จุด:

- **บรรทัด 13**: เพิ่มเงื่อนไข `&& !e.student_id` ในการกรอง `blueEvents` เพื่อแสดงเฉพาะแถว Session-Level

```typescript
// จาก
const blueEvents = events.filter((e) => e.status_color === "blue");
// เป็น
const blueEvents = events.filter((e) => e.status_color === "blue" && !e.student_id);
```

ผลลัพธ์: จาก 4 แถวซ้ำ → 2 แถว (1 แถวต่อ 1 คาบสอน) ตรงกับข้อมูลจริง

