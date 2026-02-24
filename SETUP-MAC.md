# คู่มือตั้งค่า ATLAS บน Mac

## สรุปการตั้งค่า

| รายการ | ที่ตั้ง | สถานะ |
|--------|--------|--------|
| **VITE_SUPABASE_URL** | ไฟล์ `.env` | ต้องขึ้นต้นด้วย `https://` |
| **VITE_SUPABASE_PUBLISHABLE_KEY** | ไฟล์ `.env` | Anon key แบบ JWT |
| **VITE_SUPABASE_PROJECT_ID** | ไฟล์ `.env` | Project ref จาก Supabase |
| **LOVABLE_API_KEY** | Supabase Dashboard → Edge Functions → Secrets | ไม่ใส่ใน `.env` |

---

## ขั้นตอนตั้งค่า

### 1. โคลนโปรเจกต์ (ถ้ายังไม่มี)
```bash
git clone <repo-url> atlas-wise-spark
cd atlas-wise-spark
```

### 2. สร้างไฟล์ `.env`
```bash
cp .env.example .env
```

จากนั้นแก้ไข `.env` เติมค่าจาก Supabase Dashboard → Project Settings → API:
- Project URL → `VITE_SUPABASE_URL`
- anon/public key → `VITE_SUPABASE_PUBLISHABLE_KEY`
- Project ID (จาก URL) → `VITE_SUPABASE_PROJECT_ID`

### 3. ติดตั้ง dependencies
```bash
npm install
```

### 4. ตรวจสอบการตั้งค่า
```bash
npm run check-setup
```

ถ้าผ่านทั้งหมด แสดงว่าพร้อมใช้

### 5. รันแอป
```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ **http://localhost:8080**

---

## ถ้า AI (พีท) ไม่ตอบ

1. **เช็ค LOVABLE_API_KEY**  
   Supabase Dashboard → Project Settings → Edge Functions → Secrets  
   ต้องมี `LOVABLE_API_KEY` (ใช้คีย์จาก Lovable หรือ Gemini API Key จาก Google AI Studio)

2. **รัน check-setup**  
   ```bash
   npm run check-setup
   ```  
   จะทดสอบ ai-chat และแจ้ง error ถ้ามี

3. **เช็ค .env**  
   ต้องมีทั้ง `VITE_SUPABASE_URL` และ `VITE_SUPABASE_PUBLISHABLE_KEY`  
   ถ้าขาด จะเกิด error "Headers of RequestInit is not a valid ByteString"

---

## Port

- Dev server: **8080** (ตั้งใน `vite.config.ts`)
- ถ้า 8080 ถูกใช้ Vite จะเปลี่ยนเป็น 8081 อัตโนมัติ
