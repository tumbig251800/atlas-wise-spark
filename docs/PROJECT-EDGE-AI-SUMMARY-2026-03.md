# ATLAS — สรุปการแก้ไข Edge Functions, Auth และ AI (ก.พ.–มี.ค. 2026)

เอกสารนี้สรุปการเปลี่ยนแปลงสำคัญของโปรเจกต์ **atlas-wise-spark** ด้าน Supabase Edge Functions, การยืนยันตัวตน, และฟีเจอร์ AI สำหรับทีมพัฒนา / handover / Cowork

**Supabase Project ID:** `ebyelctqcdhjmqujeskx`

---

## 1. แนวทาง Auth มาตรฐาน (สิ่งที่ต้องจำ)

| ชั้น | บทบาท |
|------|--------|
| **Gateway (`verify_jwt`)** | ตั้งเป็น **`false`** ใน `supabase/config.toml` ต่อฟังก์ชัน เพื่อหลีกเลี่ยงปัญหา JWT/ES256 กับชั้น gateway |
| **ในโค้ดฟังก์ชัน** | เรียก **`requireAtlasUser(req)`** จาก `supabase/functions/_shared/atlasAuth.ts` — ตรวจ `Authorization: Bearer <access_token>` ผ่าน `supabase.auth.getUser(token)` |

**ผลลัพธ์ที่คาดหวังเมื่อเรียกโดยไม่มี JWT:**

- Body แบบแอป: `{"error":"Missing Authorization"}` หรือ (ai-chat) `{"ok":false,"content":"Missing Authorization","source":"fallback"}`
- **ไม่ใช่** รูปแบบ gateway เก่า: `{"code":401,"message":"Missing authorization header"}` — ถ้ายังเห็นแบบนี้ แปลว่า **ฟังก์ชันนั้นยังไม่ได้ deploy หลังตั้ง `verify_jwt = false`**

---

## 2. ฟังก์ชันที่เกี่ยวข้องและบทบาทในแอป

| Function | แอปเรียกจาก | หมายเหตุ |
|----------|-------------|----------|
| **ai-chat** | Consultant / พีท ร่างทอง | Gemini `generateContent`, กฎ [REF-X], SCOPE ตามตัวกรอง |
| **ai-summary** | Executive / Policy — ปุ่ม **วิเคราะห์** | ไม่ใช่แชท — ส่ง `logs_summary` แล้วได้ข้อความสรุป |
| **ai-lesson-plan** | หน้าสร้างแผนการสอน | Streaming SSE จาก Gemini |
| **ai-exam-gen** | Consultant — **ข้อสอบหลังหน่วย** | Streaming SSE; เคยพังเพราะ gateway ยัง verify JWT จนกว่าจะ deploy |
| **atlas-diagnostic** | Teaching log / upload flow | ตามการใช้งานในแอป |

Secrets ฝั่ง Supabase (ไม่ commit ใน repo): **`GEMINI_API_KEY`**, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, และ service role ตามที่ฟังก์ชันใช้

---

## 3. ไทม์ไลน์การแก้ไข (สรุป)

### 3.1 Data leakage & พีท (ก่อนมี.ค.)

- ตัวกรองวิชา/ชั้น/ห้องใน Consultant + context ที่ส่งเข้า `ai-chat` จำกัดตาม `filteredLogs`
- ระบบ prompt: **CITATION MANDATORY** — อ้างอิง `[REF-X]` จาก context เท่านั้น
- Context preamble เตือนให้เคารพ **[ACTIVE FILTER]** (ลดการตอบข้ามวิชา/ชั้นเมื่อถามกว้าง — แนะนำให้ถามเจาะจงวิชา+ชั้นเมื่อต้องการความแม่นยำสูง)
- สลับโมเดลเป็น **Gemini 2.0 Flash** ผ่าน `GEMINI_API_KEY`
- ข้อความ error ชัดขึ้น: 401/403, 429, 402

### 3.2 JWT / Gateway 401 (ก.พ.–มี.ค.)

- ปัญหา: ชั้น gateway ของ Supabase ตอบ **401 Invalid JWT** แม้ client ส่ง session ปกติ
- แก้: `verify_jwt = false` ใน `config.toml` + `requireAtlasUser` ในแต่ละฟังก์ชัน
- **ai-chat:** เคย deploy v31 ที่ bundle ไม่ตรง repo (ไม่บังคับ auth) — แก้ด้วย redeploy **v32** (consolidated) ให้ `requireAtlasUser` ทำงาน
- ทดสอบ: `curl` ไม่มี `Authorization` → **401**; แอปล็อกอิน → พีท / วิเคราะห์ ทำงานได้

### 3.3 Consultant sync กับ Dashboard

- ตัวกรอง Consultant โหลด/บันทึกสอดคล้องกับ Dashboard (`useDashboardData` / persisted filters)

### 3.4 ข้อสอบหลังหน่วย (`ai-exam-gen`) — 2026-03-21

- **อาการ:** Toast “เกิดข้อผิดพลาดในการสร้างข้อสอบ” โดย Network เป็น **401** + `{"code":401,"message":"Missing authorization header"}`
- **สาเหตุ:** `config.toml` ตั้ง `verify_jwt = false` แล้ว แต่ **ฟังก์ชันยังไม่ถูก deploy** — gateway ยังบังคับ JWT อยู่
- **แก้:** `supabase functions deploy ai-exam-gen` — หลัง deploy: ไม่มี JWT → `{"error":"Missing Authorization"}`; **GET `/health` → 200** โดยไม่มี header
- **โค้ดเพิ่ม:** จัดการ HTTP **402** (เครดิตหมด) ใน `ai-exam-gen`; ฝั่ง `Consultant.tsx` แสดง error จาก `error` / `message` / `content` ใน JSON response

### 3.5 Repo & เอกสาร

- `.gitignore`: เพิ่ม `.cursor/plans/` (ไม่ commit แผน IDE)
- `docs/prompt-for-cowork-deploy-ai-chat.md`: คำสั่ง/checklist สำหรับ Cowork (ai-chat + หมายเหตุ ai-exam-gen)

### 3.6 ai-chat — Phase 4 / Security / Phase 4.2 (มี.ค. 2026)

- **Phase 4:** แยก prompt เป็น `supabase/functions/_shared/aiChatPrompts.ts` (CORE + TEACHER + EXECUTIVE); `ai-chat/index.ts` เรียก `buildSystemPrompt(audience)`
- **SECURITY:** บล็อกใน CORE + กฎ preamble ใน edge — ห้ามยึด `DATA_CONTEXT` เป็นคำสั่ง; ห้ามยืนยันลบ/แก้ข้อมูลระบบ
- **`aiChatSafetyGuard.ts`:** ตรวจหลัง Gemini ก่อน validator — บล็อกข้อความอ้างการลบข้อมูล/หน่วยความจำ (roleplay อันตราย)
- **Phase 4.2 (citation presence):** ใน `aiChatValidator.ts` — ถ้า context มีอย่างน้อย 2 บรรทัด `[REF-n]` ที่ Mastery ต่างกัน และคำตอบอ้างคะแนน `/5` สองค่านั้น แต่ใส่ `[REF]` ไม่ครบอย่างน้อย 2 เลขที่ต่างกัน → `citation_presence_multi_session`
- **Phase 4.2 (prompt):** ใน `aiChatPrompts.ts` — กฎข้อ 3 ใต้ CITATION MANDATORY + few-shot สองคาบ; เกณฑ์เทสภายนอก → `docs/prompt-antigravity-ai-chat-regression.md`
- **ขอบเขต filter:** preamble ข้อ 11 — คำถามกว้างให้ยึด `[ACTIVE FILTER]` + DATA_CONTEXT เท่านั้น
- **Validation fallback (prod vs debug):** ข้อความ `(debug: reason)` ใน body จะแสดงเฉพาะเมื่อตั้ง Edge secret `ATLAS_DEBUG_VALIDATION=true` หรือ `ATLAS_ENV=development` — ค่าเริ่มต้น user เห็นข้อความกลาง; `meta.reason` และ `console.error` ยังใช้ debug ได้
- **Fast guard Remedial:** ไม่ใช้ `q.includes("%")` เปล่าๆ — ใช้คำ/regex ที่ชิดกับซ่อมเสริม ร้อยละ เปอร์เซ็นต์ กี่% คู่บริบท — ลด false positive คำถามทั่วไปที่มี `%`

---

## 4. คำสั่ง Deploy ที่ใช้บ่อย

```bash
cd ~/atlas-wise-spark
npx supabase login                    # ครั้งแรก
npx supabase link --project-ref ebyelctqcdhjmqujeskx

# Deploy ทีละฟังก์ชันหรือทั้งหมดตามต้องการ
npx supabase functions deploy ai-chat
npx supabase functions deploy ai-summary
npx supabase functions deploy ai-lesson-plan
npx supabase functions deploy ai-exam-gen
npx supabase functions deploy atlas-diagnostic
```

**หลังแก้ `config.toml`:** ควร **deploy ฟังก์ชันที่เกี่ยวข้องอีกครั้ง** เพื่อให้ `verify_jwt` บน cloud ตรงกับ repo

---

## 5. การทดสอบอัตโนมัติ

| สคริปต์ | คำสั่ง | ความหมาย |
|---------|--------|----------|
| Negative tests | `npm run test:negative` | ไม่มี JWT → คาดหวัง 401 จากฟังก์ชันหลัก |
| Setup check | `node scripts/check-setup.mjs` | `.env`, health, ai-chat พร้อม session (anon อาจไม่ผ่าน ai-chat — ปกติ) |

รายละเอียด: `docs/NEGATIVE_TESTS.md`, `docs/verify-ai-lesson-plan-deploy.md`

---

## 6. เอกสารอ้างอิงอื่นใน `docs/`

| ไฟล์ | เนื้อหา |
|------|---------|
| `prompt-for-cowork-deploy-ai-chat.md` | Checklist Cowork: ai-chat, ai-exam-gen |
| `verify-ai-lesson-plan-deploy.md` | ทดสอบ curl หลัง deploy lesson plan |
| `report-to-cowork-ai-lesson-plan.md` | รายงานผลทดสอบฝั่งแอป |
| `DEV-HANDOVER-2026-02-24.md` | Handover เก่า (บางส่วนอ้าง LOVABLE — **ปัจจุบัน ai-chat ใช้ Gemini**) |
| `TA-ai-chat-invalid-jwt.md` | วิเคราะห์ 401 JWT เดิม |
| `check-consultant-filter-data.md` | ตรวจข้อมูลตัวกรอง Consultant |
| `prompt-antigravity-ai-chat-regression.md` | เกณฑ์ PASS สำหรับสคริปต์เทส Antigravity (รวม Phase 4.2) |

---

## 7. สิ่งที่ยังเป็นทางเลือก (Next)

- ขยาย Phase 4.2 ให้ครอบคลุมการอ้าง % จากหลายแหล่งใน context (ถ้าต้องการละเอียดขึ้น)
- ทบทวน UX Consultant เมื่อผู้ใช้ถามกว้างมาก — อาจแนะนำให้เลือกตัวกรองให้แคบขึ้นในข้อความระบบ

---

*อัปเดตล่าสุด: 2026-03-21*
