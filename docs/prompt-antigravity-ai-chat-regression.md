# คำสั่ง / เกณฑ์ Regression สำหรับ Antigravity — `ai-chat`

ใช้สคริปต์ยิง `POST /functions/v1/ai-chat` แบบเดียวกับหน้าแอป

**สคริปต์ใน repo:** [`scripts/regression-ai-chat.py`](../scripts/regression-ai-chat.py) และคู่มือ [`scripts/README-regression-ai-chat.md`](../scripts/README-regression-ai-chat.md) — รัน `npm run test:regression-ai-chat` หลังตั้ง env (ดู README)

## Environment (ห้าม hardcode ใน repo)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ATLAS_TEST_EMAIL`
- `ATLAS_TEST_PASSWORD`

## Phase 4.2 — หมวด Multi-session citation

Edge มี validator `citation_presence_multi_session`: ถ้า context มีอย่างน้อยสองบรรทัด `[REF-n]` ที่ **Mastery คนละค่า** (`/5`) และคำตอบมี **ทั้งสองค่า** แต่มี **`[REF-…]` ไม่ครบสองเลขที่ต่างกัน** ระบบจะส่ง **fallback** (HTTP มักยัง 200) พร้อม `meta.validationFailed` และ `meta.reason === "citation_presence_multi_session"`

### เกณฑ์ PASS ที่แนะนำ (เลือกอย่างใดอย่างหนึ่ง)

1. **โมเดลผ่าน:** `source === "gemini"` และ `content` มีทั้ง `[REF-1]` และ `[REF-2]` (ปรับเลขให้ตรง context เทส)
2. **Enforcement ผ่าน:** `source === "fallback"` และ `meta.reason === "citation_presence_multi_session"` — ถือว่าระบบไม่ปล่อยคำตอบที่อ้างสองคาบแต่ REF ไม่ครบ

อย่า FAIL เฉพาะเพราะไม่มี `[REF-2]` ใน `content` ถ้าเป็น fallback ที่ reason ถูกต้อง

### ตัวอย่าง context มินิมอล (สอดคล้อง Vitest)

ถ้าคำตอบมีรูปแบบ `N/5` ฝั่ง validator ต้องการหลักฐาน Remedial/total ใน context — ใส่ `Remedial: X/Y` บนบรรทัด session หรือข้อความ `total_students ใน context: มี` ตามที่ Consultant ส่งจริง

```
[REF-1] 2026-03-27: Mastery: 3/5 | Remedial: 0/30
[REF-2] 2026-03-28: Mastery: 2/5 | Remedial: 0/30
```

คำถามตัวอย่าง: `สรุปทั้งสองคาบให้หน่อยว่า Mastery เป็นอย่างไร`

## อ้างอิงโค้ด

- Validator: `supabase/functions/_shared/aiChatValidator.ts` — `citationPresenceMultiSessionViolation`
- Prompt หลายคาบ: `supabase/functions/_shared/aiChatPrompts.ts` — กฎข้อ 3 ภายใต้ CITATION MANDATORY
