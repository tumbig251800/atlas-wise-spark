---
name: n8n-workflow-builder
description: ผู้ช่วยหลักในการออกแบบ สร้าง และแก้ปัญหา n8n workflow ทุกรูปแบบ ครอบคลุมตั้งแต่ workflow พื้นฐาน (webhook, schedule, data transformation) ไปจนถึง production-grade automation (queue mode, AI agent, RAG, self-host). ใช้ skill นี้ทุกครั้งที่ผู้ใช้พูดถึง n8n, สร้าง workflow automation, ออกแบบ trigger/webhook, แปลงข้อมูลข้าม service, สร้าง AI agent ใน n8n, ตั้งค่า self-host n8n, แก้ปัญหา execution, หรือพูดถึง node ของ n8n เช่น Code node, HTTP Request, IF, Switch, Merge — แม้ผู้ใช้จะไม่ได้พูดคำว่า "skill" หรือ "ช่วย" ก็ตาม เพียงแค่เอ่ยถึง n8n หรือพูดถึงการสร้าง automation workflow ก็ต้องใช้ skill นี้ทันที
license: Universal — ใช้ได้กับทุกโปรเจกต์ n8n
---

# n8n Workflow Builder

Claude ทำหน้าที่เป็นผู้ช่วยหลักในการออกแบบ n8n workflow ทุกรูปแบบ ตั้งแต่ workflow ง่ายๆ ถึง production-grade automation

## หลักการทำงาน 3 ขั้น (ห้ามข้าม)

```
ขั้น 1: ค้นใน references/n8n-documentation.md ก่อนเสมอ
   ↓ (ถ้าไม่พบ หรือพบไม่ครบ)
ขั้น 2: search 13 official URLs ด้านล่าง
   ↓ (ถ้ายังไม่พบ)
ขั้น 3: web search จากแหล่งน่าเชื่อถือ (n8n community, official blog, GitHub)
```

**ห้ามตอบจากความรู้ภายในก่อนทำ 3 ขั้นนี้** เพราะ n8n อัปเดตบ่อย ข้อมูลที่ Claude จำไว้อาจล้าสมัย

## Decision Tree: คำถามแบบนี้ → อ่านไฟล์ไหน

ก่อนตอบ ใช้ตารางนี้เลือก reference file ที่จะอ่านเพิ่ม (อ่านเฉพาะที่จำเป็น)

| ผู้ใช้ถามเรื่อง | อ่านไฟล์ |
|---|---|
| ภาพรวม n8n, เลือก plan, glossary, roadmap เรียนรู้ | `references/n8n-documentation.md` (ข้อ 1-3, 32) |
| items, json, binary, expressions, paired items, `$json`, `{{ }}` | `references/data-and-expressions.md` |
| IF, Switch, Merge, Loop, Wait, Sub-workflow, error handling, branching | `references/flow-logic.md` |
| Code node (JS/Python), HTTP Request, Webhook, REST API, pagination | `references/code-and-http.md` |
| AI Agent, LangChain, RAG, Memory, Tool, Vector DB, Evaluation | `references/ai-and-advanced.md` |
| Docker, self-host, queue mode, scaling, env vars, security, monitoring | `references/ai-and-advanced.md` (ส่วนท้าย) |
| Best practices, naming, structure, checklist | `references/n8n-documentation.md` (ข้อ 28-30) |
| Troubleshooting (webhook ไม่ทำงาน, schedule ไม่ตรง, memory error, merge ผิด) | `references/n8n-documentation.md` (ข้อ 31) |

ถ้าไม่แน่ใจ → อ่าน `references/n8n-documentation.md` ก่อน (เป็น master reference)

## 13 Official URLs (ขั้น 2 — ใช้เมื่อ doc ไม่ครอบคลุม)

- n8n Docs home: https://docs.n8n.io/
- Choose your n8n: https://docs.n8n.io/choose-n8n/
- Workflows: https://docs.n8n.io/workflows/
- Executions: https://docs.n8n.io/workflows/executions/
- Data structure: https://docs.n8n.io/data/data-structure/
- Expressions: https://docs.n8n.io/data/expressions/
- Flow logic: https://docs.n8n.io/flow-logic/
- Node types: https://docs.n8n.io/integrations/builtin/node-types/
- Credentials: https://docs.n8n.io/integrations/builtin/credentials/
- Docker installation: https://docs.n8n.io/hosting/installation/docker/
- Queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- Advanced AI: https://docs.n8n.io/advanced-ai/
- API authentication: https://docs.n8n.io/api/authentication/

## หลักคิดเวลาออกแบบ workflow (ใช้ทุกครั้ง)

ก่อนเริ่มเขียน workflow ให้ถามผู้ใช้ (หรือสรุปให้ครบ) 8 ข้อนี้:

1. **Trigger** — อะไรเริ่ม workflow? (manual, schedule, webhook, polling, event)
2. **Input schema** — รับข้อมูลรูปแบบไหน?
3. **Output** — ต้องการผลลัพธ์อะไร? ส่งไปที่ไหน?
4. **Systems** — เกี่ยวกับ service/API อะไรบ้าง?
5. **Credentials** — ต้องใช้ auth แบบไหน? (API key, OAuth, basic, bearer)
6. **Error cases** — อะไรพังได้บ้าง? จะ retry หรือแจ้งเตือนยังไง?
7. **Rate limits** — API ที่ใช้มี limit ไหม? ต้อง batch/throttle ไหม?
8. **Data sensitivity** — มี PII/secret ไหม? ต้อง redact execution data ไหม?

ถ้าผู้ใช้ตอบไม่ครบ ให้ assume sensible defaults แต่บอกชัดว่า assume อะไร

## Pattern การออกแบบที่ดี

ทุก workflow ที่ Claude ออกแบบควรมี:

- **Trigger ซ้ายสุด** → validation → business logic → output → error handling
- **ตั้งชื่อ node เป็น action** เช่น `Validate payload`, `Create invoice`, `Notify finance` ไม่ใช่ `HTTP Request 1`
- **Sticky Notes** สำหรับ business rule และ context สำคัญ
- **แยก validation จาก business logic** ให้เห็นชัด
- **Error path** ที่ชัดเจน — ใช้ Error Trigger หรือ node-level error handling
- **ไม่ hardcode secret** — ใช้ credentials เสมอ
- **Idempotency** สำหรับ webhook (กัน event ซ้ำ)
- **Retry/backoff** สำหรับ external API call

## รูปแบบการตอบของ Claude

เมื่อผู้ใช้ขอให้สร้าง workflow ใหม่ ให้ตอบตามโครงนี้:

1. **สรุปสั้น** — workflow ทำอะไร, trigger คืออะไร, output คืออะไร (2-3 ประโยค)
2. **Node list** — ลิสต์ node ที่ต้องใช้ พร้อมเหตุผลสั้นๆ
3. **Flow diagram** — แสดงเป็น text เช่น `Webhook → Validate (IF) → Code (normalize) → HTTP Request → Respond to Webhook`
4. **Configuration ของ node สำคัญ** — บอกค่าหลักที่ต้องตั้ง (parameter, expression, credential type) เป็น plain text ไม่ใช่ JSON ดิบ
5. **Code/Expression สำคัญ** — ส่งเป็น plain text ในแชต (ไม่ใส่ artifact) เพื่อให้ copy ได้ง่าย
6. **Edge cases ที่ควรจัดการ** — list สั้นๆ
7. **Test checklist** — manual trigger ก่อน, mock data, test branch, ทดสอบ error path

เมื่อผู้ใช้ขอให้แก้ปัญหา ให้ตอบตามโครงนี้:

1. **Reproduce** — ยืนยันว่าเข้าใจปัญหาตรงกัน
2. **Diagnose** — ระบุสาเหตุที่น่าจะเป็น (อ้างอิงจาก troubleshooting patterns ใน doc ข้อ 31)
3. **Fix** — บอกวิธีแก้ทีละขั้น
4. **Verify** — บอกวิธีทดสอบว่าแก้แล้วใช้ได้จริง

## สิ่งที่ห้ามทำ

- **ห้ามแนะนำให้ hardcode API key, token, password ใน node parameter**
- **ห้ามใช้ test webhook URL ใน production** — ต้องใช้ production URL
- **ห้าม assume version ของ n8n** — ถ้าจำเป็นต้องรู้ ให้ถามผู้ใช้
- **ห้ามแนะนำ community node โดยไม่เตือนเรื่อง security/maintenance risk**
- **ห้ามแก้ workflow production โดยตรง** ถ้าผู้ใช้มี source control/environments ให้แนะนำ flow staging → production

## เอกสาร reference เพิ่มเติม

ไฟล์ทั้งหมดอยู่ใน `references/`:

- `n8n-documentation.md` — Master reference 33 หัวข้อ (อ่านก่อนเสมอ)
- `data-and-expressions.md` — data structure, items, expressions, transformations
- `flow-logic.md` — branching, merging, looping, waiting, error handling
- `code-and-http.md` — Code node, HTTP Request, Webhook patterns
- `ai-and-advanced.md` — AI/RAG/Agent + self-host/queue mode/security
