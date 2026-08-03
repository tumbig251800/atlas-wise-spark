# kindergarten-mcp — archived

ถอดออกจาก production เมื่อ **3 ส.ค. 2569** และย้ายโค้ดมาเก็บที่นี่ (ไม่ได้ลบทิ้ง)
พร้อมกับ `atlas-mcp` ที่โดนเหตุการณ์เดียวกัน ดูบันทึกรวมที่
[`docs/SECURITY-AUDIT-2026-08-03-open-findings.md` §3](../../SECURITY-AUDIT-2026-08-03-open-findings.md)

## ทำอะไร

HTTP remote MCP server (Supabase Edge Function) เปิด **7 tools** ตระกูล
`kinder_*` ให้ AI client query ข้อมูลพัฒนาการเด็กอนุบาล 4 ด้าน (สุขภาวะทางกาย,
อารมณ์จิตใจสังคม, สติปัญญา, ความเป็นพลเมือง) — เช่น `kinder_list_classrooms`,
`kinder_classroom_summary`, `kinder_at_risk`, `kinder_student_profile`,
`kinder_domain_detail`, `kinder_lesson_plans`

**Auth**: `verify_jwt = false` — ตรวจเองภายในด้วย header `x-api-key` ที่ต้องตรง
กับ secret `KINDERGARTEN_MCP_API_KEY` **เฉพาะ request ที่เป็น POST เท่านั้น**
`HEAD`/`GET` ตอบ `{status:"ok",...}` 200 กลับไปทันทีโดยไม่ตรวจ auth และไม่แตะ DB
(ดู `index.ts` บรรทัด ~404)

## ทำไมถูกถอดออกจาก production

ไม่ใช่ปัญหาความปลอดภัย — เป็นปัญหา **resource exhaustion**

3 ส.ค. 2569 พบว่ามีอะไรบางอย่างยิง **GET** เข้า endpoint นี้ (สลับกับ
`atlas-mcp`) ทุก ~2 วินาที ตลอด 24 ชม. ตั้งแต่ 1 ส.ค. รวมแล้วโครงการใช้ Edge
Function Invocations ไป 363,319 จากลิมิต 500,000 ของ Free Plan (รอบบิล
16 ก.ค.–16 ส.ค.) อัตรา ~5,867 req/ชม. — เต็มโควตาในไม่ถึงวัน ซึ่งจะทำให้
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

1. ตัวที่ยิงอาจยังทำงานอยู่ — ถ้า deploy กลับ **ให้เฝ้าดู invocation count ทันที**
   เพราะทราฟฟิกอาจกลับมายิงใหม่
2. **มี dependency ที่ค้างอยู่**: `woranat-chatgpt-mcp` (ฟังก์ชัน live) proxy ฝั่ง
   kindergarten ไปที่ `/functions/v1/kindergarten-mcp` ตัวนี้ (ดู
   `supabase/functions/woranat-chatgpt-mcp/index.ts:100`) — ตอนนี้เส้นทางนั้น
   ตอบ 404 แต่**ยังไม่กระทบใคร**เพราะ ChatGPT connector ถูก disconnect ไปแล้ว
   รายละเอียด + ทางแก้อยู่ใน audit doc §4 (ยังไม่แก้ในรอบนี้)

## ทางเลือกที่ใช้งานอยู่จริง (ควรใช้แทน)

connector ที่คนใช้จริงคือ
**`kindergarten-mcp-7d40d75d3e4121d5b9d3034f2cd0db7253a28398`** ซึ่งยัง live และ
ไม่ถูกแตะในรอบนี้ — ฟังก์ชัน `kindergarten-mcp` ตัวนี้ไม่จำเป็นต่อการใช้งานปกติ

## วิธี deploy กลับ (ถ้าจำเป็นจริง ๆ)

1. คัดลอก `index.ts` จากโฟลเดอร์นี้กลับไปที่
   `supabase/functions/kindergarten-mcp/index.ts`
2. เพิ่มบล็อกใน `supabase/config.toml` กลับ:
   ```toml
   [functions.kindergarten-mcp]
   verify_jwt = false
   ```
3. ยืนยันว่า secret `KINDERGARTEN_MCP_API_KEY` ยังตั้งไว้บนโครงการ
4. Deploy **เฉพาะฟังก์ชันนี้** — ห้าม deploy แบบไม่ระบุชื่อ:
   ```bash
   ./scripts/deploy-functions.sh kindergarten-mcp
   ```
5. เฝ้าดู invocation count ตามคำเตือนด้านบน

> หมายเหตุ: มี local stdio MCP server ที่ `~/kindergarten-mcp` (อ้างถึงใน
> migration `20260801150000_restore_exec_sql_service_role_grant.sql`) ที่บังเอิญ
> ชื่อซ้ำ — คนละตัวกับ edge function นี้ ไม่เกี่ยวกัน
