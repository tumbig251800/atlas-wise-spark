# คำสั่งสำหรับ Cowork — Deploy ai-chat เพื่อบังคับ Auth

**ส่งถึง:** Claude Cowork  
**วันที่:** 2026-02-24  
**เรื่อง:** ให้ deploy Edge Function `ai-chat` อีกครั้ง เพื่อให้ production บังคับตรวจ JWT ตามโค้ดใน repo

> **อัปเดต (แก้แล้ว):** Cowork deploy **ai-chat v32** — ทดสอบ `curl` ไม่มี JWT → **401** และปุ่ม Executive **AI Policy Advice → วิเคราะห์** ทำงานได้ เอกสารด้านล่างใช้เป็น checklist หลัง deploy รอบถัดไป

---

## 1. สถานะเดิม (ก่อน v32 — อ้างอิงเมื่อ redeploy)

เมื่อเรียก `ai-chat` **โดยไม่ส่ง Authorization header** (กรณี v31 ไม่ตรงโค้ด):

- **โค้ดใน repo:** ควรตอบ `401` พร้อม `Missing Authorization`
- **Production เก่า (v31):** เคยตอบ `200` — แสดงว่า bundle บน Supabase ไม่ตรงกับ repo

---

## 2. สิ่งที่ขอให้ Cowork ทำ

1. **Deploy Edge Function `ai-chat`** จาก repo ล่าสุด (main branch)
2. **ตรวจสอบว่า** `config.toml` มี `verify_jwt = false` สำหรับ ai-chat (เราใช้ `requireAtlasUser` ในโค้ดแทน gateway)

---

## 3. การ Deploy

**หมายเหตุ:** โปรเจกต์ได้ถูก refactor ให้รองรับ modular imports ปกติแล้ว ไม่ต้องใช้ไฟล์ consolidated อีกต่อไป

**แก้ไข:** ใช้ script `deploy:ai-chat` ที่จะ:
deploy ขึ้น Supabase โดยตรงจาก Source file

---

## 4. คำสั่งที่ใช้

```bash
cd <path-to-atlas-wise-spark>
npm run deploy:ai-chat
```

หรือรัน script โดยตรง:
```bash
./scripts/deploy-ai-chat.sh
```

(ถ้าต้อง login หรือ link project ก่อน ให้รัน `npx supabase login` และ `npx supabase link --project-ref ebyelctqcdhjmqujeskx` ก่อน)

---

## 5. การยืนยันผลหลัง deploy

รันคำสั่งทดสอบนี้ — **ควรได้ HTTP 401** (ไม่ใช่ 200):

```bash
curl -sS -w "\nHTTP Status: %{http_code}\n" -X POST "https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/ai-chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"context":""}'
```

**ผลที่คาดหวัง:**
- HTTP Status: **401**
- Body: `{"ok":false,"content":"Missing Authorization","source":"fallback"}` (หรือข้อความคล้ายกัน)

**ถ้าได้ 200:** แปลว่า deploy ยังไม่ถูกต้อง — ตรวจว่าโค้ดจาก `supabase/functions/ai-chat/index.ts` มีการเรียก `requireAtlasUser(req)` ก่อนประมวลผลคำขอ

---

## 6. ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | Source File หลักที่ใช้รัน AI Chat (deploy จากไฟล์นี้โดยตรง) |
| `supabase/functions/_shared/` | atlasAuth, aiChatValidator, numberExtractor (แชร์ให้ Edge function อื่น ๆ ด้วย) |
| `supabase/config.toml` | `[functions.ai-chat] verify_jwt = false` |

---

## 7. หมายเหตุ

- **แอป ATLAS** ส่ง JWT ของ user ที่ login แล้วใน `Authorization: Bearer <jwt>` — flow ปกติจะทำงานได้หลัง deploy นี้
- จุดประสงค์: ป้องกันการเรียก ai-chat โดยไม่มี session (เช่น script ภายนอก) เพื่อลดความเสี่ยงด้านความปลอดภัยและค่าใช้จ่าย Gemini

---

---

## 8. หมายเหตุ — `ai-exam-gen` (ข้อสอบหลังหน่วย)

ถ้าปุ่มสร้างข้อสอบใน Consultant ขึ้น toast ทั่วไปแต่ Network เป็น **401** พร้อม `{"code":401,"message":"Missing authorization header"}` แปลว่า **gateway ยัง verify JWT** อยู่ — ต้อง deploy ฟังก์ชันนี้ให้สอดคล้อง `config.toml`:

```bash
supabase functions deploy ai-exam-gen
```

หลัง deploy การเรียกไม่มี JWT ควรได้ `{"error":"Missing Authorization"}` (จาก `requireAtlasUser`) และ **GET `/health` → 200** โดยไม่ต้องมี header

**อัปเดต 2026-03-21:** deploy `ai-exam-gen` แล้ว — แก้ปัญหาข้อสอบหลังหน่วยที่โดน gateway block

---

**ขอบคุณครับ**
