# การตรวจสอบ deploy ai-lesson-plan

## Phase 1 — ผลการเทส curl (ยืนยันแล้ว)

| เคส | คำสั่ง | Status | Body | ผล |
|-----|--------|--------|------|-----|
| 1 | ไม่ส่ง Authorization | 401 | `{"error":"Missing Authorization"}` | ผ่าน — มาจากโค้ดเรา (atlasAuth) ไม่ใช่ gateway |
| 2 | ส่ง anon key ใน Authorization | 401 | `{"error":"Invalid JWT"}` | ผ่าน — มาจากโค้ดเรา (getUser ปฏิเสธ anon) ไม่ใช่ `{"code":401,"message":"Invalid JWT"}` จาก gateway |

สรุป: **Gateway ไม่ block อีกแล้ว** — request ผ่านไปถึงฟังก์ชันและได้ response จาก `requireAtlasUser` / atlasAuth.ts

---

## Phase 2 — ขั้นตอนเทสจากแอป (ให้คุณทำ)

1. เปิดแอปแล้ว login ให้มี session ปกติ
2. ไปหน้า **สร้างแผนการสอน**
3. เลือก ชั้น/ห้อง/วิชา/หน่วยการเรียน/หัวข้อ แล้วกด **สร้างแผนการสอน**
4. สังเกตผล:
   - **สำเร็จ:** มีเนื้อหาแผน streaming มา หรือโหลดเสร็จ
   - **Error:** ดู toast/Console ว่าเป็นอะไร
     - ถ้าเป็น `GEMINI_API_KEY ไม่ถูกต้อง` หรือ `เครดิต AI หมด` → ไป Supabase Dashboard → Edge Functions → Secrets ตรวจ/ตั้งค่า `GEMINI_API_KEY` แล้วลองกดสร้างแผนอีกครั้ง

---

## Phase 3 (ใช้เฉพาะเมื่อ Phase 1 ไม่ผ่าน)

ถ้า curl ยังได้ `{"code":401,"message":"Invalid JWT"}`:

- ไป Supabase Dashboard → Edge Functions → `ai-lesson-plan` → ตรวจว่า JWT Verification / Verify JWT ถูกปิด (OFF) แล้ว redeploy ถ้าจำเป็น

---

## Phase 5 — โหมดสองแบบ (Reflection / Snapshot) + API v2

### สัญญา request (Edge `parseLessonPlanBody`)

| รูปแบบ | คำอธิบาย |
|--------|-----------|
| **Legacy (v1)** | JSON แบน ไม่มี `version` — แมปเป็น `mode: reflection` |
| **v2** | `version: 2` + `mode: "reflection" \| "context_snapshot"` + ฟิลด์แผน (`planType`, `gradeLevel`, `learningUnit`, …) |

- **Reflection:** ส่ง `context` เป็นข้อความสรุปจาก Teaching Logs (ฝั่งแอปดึงจาก `teaching_logs`)
- **context_snapshot:** ส่ง `snapshot` เป็น object (เช่น `class_profile`, `focus`) และ `context` เป็นหมายเหตุเพิ่มเติมได้
- `snapshot` ต้องเป็น object — ถ้าเป็น array จะได้ **400** `{ "error": "snapshot must be an object when provided" }`

Prompt หลักอยู่ที่ `supabase/functions/_shared/lessonPlanPrompts.ts` (แยกจาก ai-chat)

### ตัวอย่าง curl (ต้องมี user access token จริง)

ตั้ง `$URL` = `https://<project>.supabase.co/functions/v1/ai-lesson-plan` และ `$JWT` = access token จาก session

**Health (ไม่ต้อง JWT):**

```bash
curl -sS "$URL/health"
```

**Reflection v2 (ย่อ):**

```bash
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 2,
    "mode": "reflection",
    "planType": "hourly",
    "gradeLevel": "ม.1",
    "classroom": "1",
    "subject": "คณิตศาสตร์",
    "learningUnit": "หน่วยการเรียนที่ 1",
    "topic": "เศษส่วน",
    "hours": 1,
    "includeWorksheets": false,
    "context": "จาก 1 คาบล่าสุด: Gap หลัก: k-gap (1 ครั้ง)"
  }'
```

**Snapshot v2 (ย่อ):**

```bash
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 2,
    "mode": "context_snapshot",
    "planType": "hourly",
    "gradeLevel": "ม.1",
    "classroom": "1",
    "subject": "คณิตศาสตร์",
    "learningUnit": "หน่วยการเรียนที่ 1",
    "topic": "เศษส่วน",
    "hours": 1,
    "includeWorksheets": false,
    "context": "",
    "snapshot": { "class_profile": "ห้องเรียนทดสอบ", "focus": "ทบทวนพื้นฐาน" }
  }'
```

ผลตอบกลับเป็น **SSE** (OpenAI-compatible chunks) — ทดสอบด้วยสคริปต์ด้านล่างสะดวกกว่า

### สคริปต์ regression อัตโนมัติ

```bash
npm run test:regression-lesson-plan
```

- ไม่ต้อง JWT: ทดสอบ `GET /health` และ `POST` ไม่มี Authorization → 401
- ถ้าตั้ง **`ATLAS_LESSON_PLAN_TEST_JWT`** (access token จริง) ใน `.env` หรือ environment:
  - ทดสอบ body ผิด (`snapshot` เป็น array) → 400
  - ทดสอบสตรีม v2 reflection และ v2 context_snapshot (อ่าน chunk แรก)

หมายเหตุ: การทดสอบที่มี JWT เรียก Gemini จริง — อาจได้ 429/402 หากโควต้าหมด (สคริปต์จะแจ้งเป็นหมายเหตุ)

### ฐานข้อมูล — ตาราง `lesson_plan_snapshots` (ไม่บังคับใช้ใน UI)

- มี migration `20260328120000_lesson_plan_snapshots.sql` + RLS ไว้สำหรับกรณีต้องการเก็บชุดบริบทในอนาคต — **หน้าแผนการสอนปัจจุบันไม่บันทึก/โหลดจากตารางนี้**

### เช็กลิสต์แอป (ทั้งสองโหมด)

| โหมด | สิ่งที่ตรวจ |
|------|-------------|
| **Reflection** | เลือกชั้น/ห้อง/วิชาจาก dropdown (เมื่อมี teaching_logs); กรอกหน่วยการเรียนและหัวข้อ; สร้างแผนได้; บริบทจาก logs ถูกส่งใน `context` |
| **Snapshot** | กรอกชั้น/ห้อง/วิชา (หรือจากฟอร์ม); กรอกหน่วยการเรียนและหัวข้อ; กรอกบริบทอย่างน้อยหนึ่งช่องในสามช่อง Snapshot; สร้างแผนได้ |

---

## เอกสารที่เกี่ยวข้อง

- `docs/PROJECT-EDGE-AI-SUMMARY-2026-03.md` — handover Edge + AI
- `npm run test:negative` — ไม่มี JWT → 401 หลายฟังก์ชัน รวม ai-lesson-plan
