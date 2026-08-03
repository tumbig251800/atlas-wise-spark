# ATLAS — วิธี Deploy Edge Functions

## สถานการณ์

Deploy ผ่าน CLI ได้ **Forbidden** — โปรเจกต์อาจอยู่ภายใต้ Lovable Organization  
ใช้วิธี Deploy ผ่าน **Supabase Dashboard** แทน

---

## วิธีที่ 1: Deploy ผ่าน Supabase Dashboard (แนะนำ)

### ขั้นตอน

1. **เปิด Supabase Dashboard**
   - ไปที่: https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/functions

2. **เลือก ai-chat**
   - คลิกที่ฟังก์ชัน **ai-chat**
   - หาปุ่ม **Edit** หรือ **Deploy new version**

3. **อัปเดตโค้ด**
   - ถ้า Dashboard ให้แก้ไขโค้ด: เปิดไฟล์ `supabase/functions/ai-chat/index.ts` ใน Cursor
   - Copy โค้ดทั้งหมด (Ctrl+A, Ctrl+C)
   - วางใน Editor ของ Supabase
   - กด **Deploy** หรือ **Save**

4. **ทำซ้ำสำหรับ ai-lesson-plan, ai-summary, atlas-diagnostic** (ถ้ามีตัวเลือกแก้ไข)

---

## วิธีที่ 2: ใช้ Supabase CLI (ต้อง Login ก่อน)

```bash
# 1. Login (จะเปิดเบราว์เซอร์)
cd ~/atlas-wise-spark
npx supabase login

# 2. Link project
npx supabase link --project-ref ebyelctqcdhjmqujeskx

# 3. Deploy — ต้องระบุชื่อฟังก์ชันเสมอ
npx supabase functions deploy <function-name>
# เช่น: npx supabase functions deploy atlas-mcp

# หรือใช้สคริปต์ที่มี guard กันเผลออยู่แล้ว (ต้องระบุชื่อฟังก์ชัน ไม่งั้น error ทันที):
./scripts/deploy-functions.sh <function-name>
# เช่น: ./scripts/deploy-functions.sh atlas-mcp
# หรือผ่าน npm สำหรับฟังก์ชันที่มีสคริปต์ตั้งไว้แล้ว: npm run deploy:atlas-mcp
```

⚠️ **ห้ามรัน `npx supabase functions deploy` แบบไม่ระบุชื่อฟังก์ชันเด็ดขาด** — คำสั่งนี้จะ deploy
**ทุกโฟลเดอร์** ใน `supabase/functions/` พร้อมกัน รวมถึงโฟลเดอร์ทดลอง โค้ดที่ยังไม่เสร็จ หรือแม้แต่
ไฟล์ที่ยังไม่ได้ commit เข้า git เลย เคยเกิดเหตุการณ์จริง: มีไฟล์ `delete-teacher-data` ที่ hard-delete
ข้อมูลนักเรียนโดยไม่เช็คสิทธิ์เลย นอนอยู่ในโฟลเดอร์นี้เป็นเดือนโดยไม่มีใครรู้ตัว — โชคดีที่ไม่เคยมีใคร
รันคำสั่งแบบไม่ระบุชื่อ ไม่งั้นจะขึ้น production ทันที (ดู `docs/SECURITY-AUDIT-2026-08-03-open-findings.md`)

**หมายเหตุ:** ถ้าได้ Forbidden หลัง login อาจเป็นเพราะโปรเจกต์อยู่ภายใต้ Lovable Org — ใช้วิธีที่ 1 แทน

---

## วิธีที่ 3: Deploy ผ่าน Lovable

ถ้าโปรเจกต์สร้างจาก Lovable:
- ตรวจสอบใน Lovable Dashboard ว่ามีปุ่ม **Deploy** หรือ **Sync** กับ Supabase หรือไม่
- Push โค้ดขึ้น GitHub แล้วให้ Lovable sync อาจช่วย (ขึ้นอยู่กับการตั้งค่า)

---

## ตรวจสอบหลัง Deploy

1. เปิดแอปที่ http://localhost:8084/ หรือ Lovable
2. ไปที่ **AI ที่ปรึกษา (Consultant)**
3. เลือก filter **คณิตศาสตร์ ป.4/1**
4. ถาม: "สรุปสถานการณ์ห้อง ป.4/1 ให้หน่อยครับ"
5. ตรวจว่า:
   - ไม่มี "AI gateway error"
   - คำตอบไม่มีข้อมูลวิชาศิลปะปน

---

## ตรวจสอบ LOVABLE_API_KEY

ก่อน Deploy ตรวจสอบว่า:
- Supabase → Edge Functions → Secrets
- มี `LOVABLE_API_KEY` = Gemini API Key จาก Google AI Studio
- กด Save และ Refresh
