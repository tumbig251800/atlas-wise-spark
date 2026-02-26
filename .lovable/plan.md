

## Bug: AI Policy Advice แสดง Mastery "4%" แทนที่จะเป็น "81%"

### สาเหตุ

ไฟล์ `src/components/executive/PolicySummary.tsx` ส่งค่า mastery ดิบ (สเกล 1-5) ต่อท้ายด้วย `%` ให้ AI:

- **บรรทัด 25**: `avgMastery = Math.round(4.05)` → `4`
- **บรรทัด 36**: ส่งเป็น `"Mastery เฉลี่ย: 4%"` → AI อ่านแล้วรายงาน "Mastery ต่ำมากที่ 4%"
- **บรรทัด 38**: Mastery ตามชั้นก็ส่งค่าดิบ `"ป.4: 4%"` เช่นกัน

(หมายเหตุ: `ExecutiveSummary.tsx` ไม่มีปัญหานี้ เพราะส่งเป็น `"4.0/5"` อยู่แล้ว)

### แผนแก้ไข

**แก้ `src/components/executive/PolicySummary.tsx`** (3 จุด):

1. **บรรทัด 25**: คำนวณเป็นเปอร์เซ็นต์จริง `Math.round((raw / 5) * 100)` → `81`
2. **บรรทัด 36**: `"Mastery เฉลี่ย: 81% (4.0/5)"` — ส่งทั้ง % และสเกลเพื่อให้ AI ไม่ตีความผิด
3. **บรรทัด 38**: Mastery ตามชั้นก็แปลงเป็น `%` จริงเช่นกัน `Math.round((v.total / v.count / 5) * 100)`

