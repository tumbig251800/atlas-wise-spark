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

## ถ้า AI (พีท) ไม่ตอบ หรือ check-setup แสดง ai-chat HTTP 500

1. **ตั้งค่า LOVABLE_API_KEY** (จำเป็น!)  
   ไปที่: https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/settings/functions  
   → เปิดแท็บ **Edge Function Secrets**  
   → เพิ่ม `LOVABLE_API_KEY` = คีย์จาก Lovable หรือ **Gemini API Key** จาก [Google AI Studio](https://aistudio.google.com/apikey)

2. **รัน check-setup**  
   ```bash
   npm run check-setup
   ```  
   จะทดสอบ ai-chat และแจ้ง error ถ้ามี

3. **เช็ค .env**  
   ต้องมีทั้ง `VITE_SUPABASE_URL` และ `VITE_SUPABASE_PUBLISHABLE_KEY`  
   ถ้าขาด จะเกิด error "Headers of RequestInit is not a valid ByteString"

---

## อัปโหลด CSV แล้ว error "Could not find activity_mode column"

ถ้าเจอ error นี้ตอนนำเข้า CSV หมายความว่า schema ของ Supabase ยังไม่มีคอลัมน์ `activity_mode`:

1. เปิด Supabase Dashboard → SQL Editor
2. เลือก project ที่ app เชื่อมต่อ (ดูจาก `.env` → `VITE_SUPABASE_URL`)
3. Copy เนื้อหาจาก `scripts/repair-activity-mode.sql` มา Run
4. ลองอัปโหลด CSV อีกครั้ง

ถ้ามี Supabase CLI: `supabase db push` จะ apply migrations ทั้งหมดรวม repair

---

## Port

- Dev server: **8080** (ตั้งใน `vite.config.ts`)
- ถ้า 8080 ถูกใช้ Vite จะเปลี่ยนเป็น 8081 อัตโนมัติ
