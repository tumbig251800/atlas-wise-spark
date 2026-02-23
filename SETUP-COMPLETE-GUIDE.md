# ATLAS — คู่มือตั้งค่าให้ AI (พีท) ทำงานได้ครบ

## ภาพรวม

เมื่อถามพีท (AI ที่ปรึกษา) แล้วได้แจ้งเตือน/Error 500 แทนคำตอบ — ต้องตั้งค่า **2 ส่วน** ให้ครบ:

1. **Frontend** — ไฟล์ `.env`
2. **Backend** — LOVABLE_API_KEY ใน Supabase

---

## ส่วนที่ 1: Frontend (.env)

### ขั้นตอน

1. สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ (ถ้ายังไม่มี)
2. Copy จาก `.env.example` แล้วเติมค่าจริง:

```
VITE_SUPABASE_URL=https://ebyelctqcdhjmqujeskx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... (จาก Supabase Dashboard)
```

3. ค่าทั้งสองได้จาก: [Supabase Dashboard](https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/settings/api) → Project Settings → API

### ตรวจสอบ

```bash
node scripts/check-setup.mjs
```

---

## ส่วนที่ 2: LOVABLE_API_KEY (สาเหตุหลักของ Error 500)

### ขั้นตอน

1. **สร้าง Gemini API Key**
   - ไปที่ [Google AI Studio](https://aistudio.google.com/apikey)
   - กด "Create API Key"
   - Copy ค่า Key ที่ได้

2. **ตั้งค่าใน Supabase**
   - ไปที่ [Supabase Edge Functions Secrets](https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/settings/functions)
   - หา "Secrets" หรือ "Environment Variables"
   - เพิ่ม/แก้ไข:
     - **Name:** `LOVABLE_API_KEY`
     - **Value:** วาง Gemini API Key ที่ copy มา
   - กด **Save**

3. **Deploy ฟังก์ชันใหม่** (เพื่อให้ Secret มีผล)
   - ไปที่ [Edge Functions](https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/functions)
   - เลือก `ai-chat` → Deploy / Redeploy

### หมายเหตุ

- ถ้าโปรเจกต์อยู่ภายใต้ **Lovable Org** และคุณไม่มีสิทธิ์เข้า Supabase โดยตรง → ต้อง deploy หรือตั้งค่าผ่าน Lovable Dashboard
- Gemini API Key ฟรีมี quota — ถ้าเกินจะได้ Error 429

---

## ส่วนที่ 3: Deploy Edge Functions (ถ้ายังไม่ได้ deploy)

ดูรายละเอียดใน [DEPLOY-EDGE-FUNCTIONS.md](./DEPLOY-EDGE-FUNCTIONS.md)

สรุปสั้นๆ:
- **Dashboard:** ไปที่ Functions → แก้ไขโค้ด → Deploy
- **CLI:** `npx supabase login` → `npx supabase link --project-ref ebyelctqcdhjmqujeskx` → `npx supabase functions deploy`

---

## ตรวจสอบหลังตั้งค่า

1. รัน:
   ```bash
   node scripts/check-setup.mjs
   ```

2. เปิดแอป → ไปที่ **AI ที่ปรึกษา** → ถาม "พีท นายช่วยอะไรได้บ้าง"

3. ถ้ายังได้ Error → ดู [Supabase Logs](https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/functions/ai-chat/logs) ของฟังก์ชัน ai-chat เพื่อดู error message จริง

---

## ลิงก์สำคัญ

| รายการ | ลิงก์ |
|--------|------|
| Supabase Project | https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx |
| Edge Functions Secrets | https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/settings/functions |
| Google AI Studio (Gemini Key) | https://aistudio.google.com/apikey |
| Deploy Edge Functions | [DEPLOY-EDGE-FUNCTIONS.md](./DEPLOY-EDGE-FUNCTIONS.md) |
| วินิจฉัย Error 500 | [DIAGNOSIS-AI-CHAT-500.md](./DIAGNOSIS-AI-CHAT-500.md) |
