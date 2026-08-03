# atlas-mcp — archived

ถอดออกจาก production เมื่อ **3 ส.ค. 2569** และย้ายโค้ดมาเก็บที่นี่ (ไม่ได้ลบทิ้ง)
พร้อมกับ `kindergarten-mcp` ที่โดนเหตุการณ์เดียวกัน ดูบันทึกรวมที่
[`docs/SECURITY-AUDIT-2026-08-03-open-findings.md` §3](../../SECURITY-AUDIT-2026-08-03-open-findings.md)

## ทำอะไร

HTTP remote MCP server (Supabase Edge Function) เปิด **20 tools** ตระกูล
`atlas_*` ให้ AI client (Claude/ChatGPT ผ่าน connector) query ข้อมูล ATLAS —
เช่น `atlas_list_terms`, `atlas_classroom_kpi`, `atlas_gap_distribution`,
`atlas_red_zone`, `atlas_plc_sessions` ฯลฯ

**Auth**: `verify_jwt = false` — ตรวจเองภายในด้วย header `x-api-key` ที่ต้องตรง
กับ secret `ATLAS_MCP_API_KEY` **เฉพาะ request ที่เป็น POST เท่านั้น**
`HEAD`/`GET` ตอบ `{status:"ok",...}` 200 กลับไปทันทีโดยไม่ตรวจ auth และไม่แตะ DB
(ดู `index.ts` บรรทัด ~1127)

## ทำไมถูกถอดออกจาก production

ไม่ใช่ปัญหาความปลอดภัย — เป็นปัญหา **resource exhaustion**

3 ส.ค. 2569 พบว่ามีอะไรบางอย่างยิง **GET** เข้า endpoint นี้ (สลับกับ
`kindergarten-mcp`) ทุก ~2 วินาที ตลอด 24 ชม. ตั้งแต่ 1 ส.ค. รวมแล้วโครงการ
ใช้ Edge Function Invocations ไป 363,319 จากลิมิต 500,000 ของ Free Plan
(รอบบิล 16 ก.ค.–16 ส.ค.) อัตรา ~5,867 req/ชม. — เต็มโควตาในไม่ถึงวัน ซึ่งจะทำให้
edge function **ทั้งโครงการ** หยุดทำงาน กระทบทั้ง ATLAS และระบบอนุบาล

## หลักฐานที่ใช้ตัดสินว่าเป็น health check ที่ลืมไว้ ไม่ใช่การใช้งานจริง/การโจมตี

- **GET ล้วน ไม่มี POST เลย** — MCP เรียก tool ผ่าน POST เสมอ แปลว่า ~25,000
  request ไม่มีการเรียก tool สักครั้ง
- **200 / ~114ms / 4xx = 0% / log มีแค่ `booted`/`shutdown`** — ตรงกับ GET handler
  ที่ตอบ 200 ก่อนตรวจ auth และไม่ query DB พอดี
- **ไม่มี OPTIONS นำหน้า** — ไม่ใช่เบราว์เซอร์ เป็น server-to-server

## ยังหาต้นตอไม่พบ (open finding)

ตัดออกไปแล้ว: **n8n cloud** (ตรวจครบ 12 workflow), **n8n local** (ไม่ได้ติดตั้ง
Docker บนเครื่อง), **ChatGPT connector** (disconnect แล้วทราฟฟิกไม่ลด),
**Claude connector** (ใช้คนละ endpoint) — ยังไม่รู้ว่าใครยิง

## ⚠️ คำเตือนถ้า deploy กลับ

ตัวที่ยิงอาจยังทำงานอยู่ — ถ้า deploy ฟังก์ชันนี้กลับขึ้น production **ให้เฝ้าดู
invocation count ทันที** เพราะทราฟฟิกอาจกลับมายิงใหม่และวนกลับเป็นปัญหาเดิม

## ทางเลือกที่ใช้งานอยู่จริง (ควรใช้แทน)

connector ที่คนใช้จริงคือ **`woranat-atlas-mcp`** (endpoint `/woranat-atlas-mcp`)
ซึ่งยัง live และไม่ถูกแตะในรอบนี้ — ฟังก์ชัน `atlas-mcp` ตัวนี้ไม่จำเป็นต่อการ
ใช้งานปกติ

## วิธี deploy กลับ (ถ้าจำเป็นจริง ๆ)

1. คัดลอก `index.ts` จากโฟลเดอร์นี้กลับไปที่
   `supabase/functions/atlas-mcp/index.ts`
2. เพิ่มบล็อกใน `supabase/config.toml` กลับ:
   ```toml
   [functions.atlas-mcp]
   verify_jwt = false
   ```
3. ยืนยันว่า secret `ATLAS_MCP_API_KEY` ยังตั้งไว้บนโครงการ
4. Deploy **เฉพาะฟังก์ชันนี้** — ห้าม deploy แบบไม่ระบุชื่อ:
   ```bash
   ./scripts/deploy-functions.sh atlas-mcp
   ```
5. เฝ้าดู invocation count ตามคำเตือนด้านบน

> หมายเหตุ: มี local stdio MCP server ที่ `~/atlas-mcp/index.js` (อ้างถึงใน
> `CODEX_MCP_PATCH.md`, `push_atlas_mcp_to_github.sh`, `atlas-mcp-index-fixed.js`)
> ที่บังเอิญชื่อซ้ำ — คนละตัวกับ edge function นี้ ไม่เกี่ยวกัน
