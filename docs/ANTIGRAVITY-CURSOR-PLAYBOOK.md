# ATLAS — Antigravity × Cursor Playbook

Version: 1.0  
Last updated: 2026-03-28

เอกสารนี้เป็น **แหล่งอ้างอิงเดียว (single source of truth)** สำหรับการทำงานคู่กันระหว่าง:

- **Cursor** — ผู้ช่วยหลักใน IDE (เน้น frontend / รีวิว / prototype)
- **Antigravity** (หรือ agent พื้นหลังอื่นที่มีสิทธิ์แก้ repo เต็ม) — เน้น backend, Edge, refactor ใหญ่

ทุกครั้งที่สั่งงาน agent ใด agent หนึ่ง ให้อ้างอิงไฟล์นี้ หรือแปะบล็อก **Master prompt** ด้านล่างแล้วระบุงานเฉพาะเจาะจงต่อท้าย

---

## 1) แบ่งหน้าที่ (Division of labor)

### Cursor — หน้าที่หลัก

- React, layout, Tailwind, การจัดการ state/UI บนหน้า
- แก้เร็วเฉพาะจุดที่ต้องเห็นผลบนหน้าจอ
- **รีวิว** diff ใหญ่จาก Antigravity ก่อน merge (logic, ขอบเขต, regression)
- แนะนำ manual test ฝั่งเบราว์เซอร์และการอ่าน console

### Antigravity — หน้าที่หลัก

- `supabase/functions/`, schema/ migration ที่เกี่ยวข้อง, `supabase/config.toml`
- debug เชิงลึก (เช่น 500, flow `ai-chat`), refactor ไฟล์ใหญ่
- เทอร์มินัลหนัก: install ชุดใหญ่, บาง git operation, deploy ฟังก์ชันตามที่โปรเจกต์กำหนด

### กฎข้ามขอบเขต (Override)

- ค่าเริ่มต้น: Cursor **ไม่**แก้ backend ซับซ้อนโดยไม่ได้รับคำสั่งชัดเจน
- ถ้าต้องสลับบทบาท ให้เจ้าของโปรเจกต์พิมพ์ชัดเช่น: **“รอบนี้ให้ Cursor แก้ Edge Functions ได้”** หรือ **“รอบนี้ให้ Antigravity แก้ UI ได้”**

---

## 2) สิ่งที่ทั้งสองฝ่ายต้องร่วมกันรักษา

| หัวข้อ | หมายเหตุ |
|--------|----------|
| **สัญญา API** | รูปแบบ request/response และ error (`message` / status) ต้องสอดคล้องกับ `src/lib/edgeFunctionFetch.ts` และผู้เรียกใน `src/` |
| **ไฟล์ร่วม** | เช่น client เรียก Edge, types ร่วม — กำหนดใน PR ว่าใครเป็นเจ้าของ diff หลัก |
| **ai-chat** | ถ้าแก้ `supabase/functions/ai-chat/` สามารถ deploy ได้ตามปกติผ่าน `npm run deploy:ai-chat` |

---

## 3) Checklist — Antigravity (งาน backend / Edge / DB)

ทำตามลำดับ ยกเว้นขั้นที่เจ้าของโปรเจกต์ยกเว้นชัดเจน

1. **Evidence ก่อนแก้** — ไม่เดา root cause  
   - ข้อความ prompt / request ที่ล้มเหลว  
   - ถ้าเป็น `ai-chat`: `source`, `meta.validationFailed`, `meta.reason`, `meta.requestId`  
   - ดูรายละเอียด workflow ใน [`docs/COWORK_COMMAND_MASTER_AI_CHAT_PHASED.md`](./COWORK_COMMAND_MASTER_AI_CHAT_PHASED.md) มาตรา 2
2. **Patch เล็กที่สุดที่พออธิบายด้วย evidence**
3. **Deploy:** ใช้คำสั่ง `npm run deploy:ai-chat` ได้เลย
4. **Verify อัตโนมัติ**
   - `npm run test`
   - `npm run test:negative` (ต้องมี network ถึง Supabase จริง — ดู [`docs/NEGATIVE_TESTS.md`](./NEGATIVE_TESTS.md))
5. **Manual regression** (เมื่อแตะ chat/context) — [`docs/AI-STRICT-TESTS.md`](./AI-STRICT-TESTS.md) และชุด prompt ใน cowork master มาตรา 4
6. **ลบ debug ชั่วคราว** หลังยอมรับงาน
7. **สรุปใน PR/commit:** เปลี่ยนอะไร เพราะอะไร รันอะไรแล้ว

---

## 4) Checklist — Cursor (งาน frontend)

1. แก้เฉพาะ `src/` (และ asset ที่ UI ใช้) เว้นแต่ได้รับ override
2. ถ้าต้องเปลี่ยนรูปแบบการเรียก API — ประสานกับสัญญาใน Edge / เอกสารด้านบน
3. หลังแก้ UI สำคัญ: แนะนำขั้นตอน click-through + ดู Network/Console
4. `npm run test` เมื่อแตะ logic ที่มี unit test

---

## 5) Master prompt — แปะให้ Antigravity (แม่แบบ)

คัดลอกบล็อกด้านล่างแล้วเติมเฉพาะงานในวงเล็บสุดท้าย

```text
You are working on the ATLAS repo (React + Vite + Supabase Edge Functions).

Read and follow the playbook file (authoritative):
- docs/ANTIGRAVITY-CURSOR-PLAYBOOK.md

Hard requirements:
- Evidence-first for backend bugs: capture failing prompt, response JSON fields (source, meta.validationFailed, meta.reason, meta.requestId) before coding. Do not guess.
- For ai-chat changes: deploy via npm run deploy:ai-chat, then run npm run test and npm run test:negative (with network).
- Minimal diffs; do not relax student ID rules or cross-subject scope rules unless explicitly instructed.
- Cursor owns default frontend; you own Edge/DB/heavy refactors unless the owner overrides.

Task (fill this in):
- <one clear goal, acceptance criteria, and any files already identified>
```

---

## 6) Master prompt — แปะให้ Cursor (แม่แบบ)

```text
You are the primary Cursor assistant for ATLAS.

Follow: docs/ANTIGRAVITY-CURSOR-PLAYBOOK.md
Default scope: React/UI in src/, quick UI fixes, and code review of backend PRs.
Do not change supabase/functions or DB unless the project owner explicitly overrides.

Task:
- <UI goal + acceptance criteria>
```

---

## 7) เอกสารอ้างอิงเพิ่มเติม

- [`docs/COWORK_COMMAND_MASTER_AI_CHAT_PHASED.md`](./COWORK_COMMAND_MASTER_AI_CHAT_PHASED.md) — workflow เฉพาะ ai-chat + Consultant
- [`docs/HANDOVER-AI-CHAT-HYBRID-RULE-FIRST-2026-03-24.md`](./HANDOVER-AI-CHAT-HYBRID-RULE-FIRST-2026-03-24.md) — สถาปัตยกรรม rule-first
- [`docs/NEGATIVE_TESTS.md`](./NEGATIVE_TESTS.md) — การรัน `test:negative`
- [`docs/AI-STRICT-TESTS.md`](./AI-STRICT-TESTS.md) — manual strict regression

---

## 8) การอัปเดตเวอร์ชัน

เมื่อเปลี่ยนกติกาการทำงานร่วม (เช่น ย้าย deploy script หรือเปลี่ยนเจ้าของชั้น) ให้แก้ไฟล์นี้และ **bump Version + Last updated** ด้านบน
