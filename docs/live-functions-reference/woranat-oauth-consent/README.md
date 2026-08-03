# woranat-oauth-consent — ⚠️ STILL LIVE, DO NOT DELETE

**This is not an archived/removed function.** Unlike everything under
`docs/archived-functions/`, `woranat-oauth-consent` is live on production
right now and actively used. This copy exists purely as a **reference/backup**
because the function has no source anywhere in `atlas-wise-spark`'s git
history — it was retrieved directly from the Supabase Dashboard on
2026-08-03. If it's ever missing from production with no backup, the ChatGPT
Workspace ↔ ATLAS MCP integration breaks with no way to recover the code.

If you're cleaning up `docs/` and this looks unfamiliar: **check that it is
still live on the Supabase Dashboard before assuming it's stale and removing
it.** It's kept in a separate directory from `docs/archived-functions/`
specifically so it doesn't get swept up by "clean up archived stuff" the way
`atlas-delete-logs` was intentionally retired.

## ทำอะไร

Consent/authorization page ที่ ChatGPT Workspace เปิดขึ้นตอนขอเชื่อมต่อกับ
ATLAS MCP (`woranat-chatgpt-mcp`) — ให้ director/lead login แล้วกด
อนุมัติ/ปฏิเสธการเชื่อมต่อ ก่อนจะสร้าง OAuth token ให้ ChatGPT ใช้เรียก MCP
tools ต่อไป

- `GET`/`HEAD` → คืนหน้า HTML consent page
- `POST` → endpoint ตรวจสิทธิ์ (`roleCheck`) ที่หน้าเว็บเรียกกลับมาเพื่อยืนยัน
  ว่า user ที่ login มี role `director` หรือ `lead` ก่อนจะแสดงหน้า consent

## ทำไมถึงปลอดภัย ไม่ต้องแก้อะไร

- **ไม่ได้เขียน OAuth flow เอง** — ใช้ `supabase.auth.oauth.getAuthorizationDetails()`,
  `.approveAuthorization()`, `.denyAuthorization()` ซึ่งเป็น API ในตัวของ
  Supabase Auth โดยตรง ไม่มีความเสี่ยงจาก custom OAuth implementation ที่เขียน
  เอง (state/PKCE/redirect validation ทั้งหมดเป็นหน้าที่ของ Supabase)
- **ตรวจสิทธิ์ 2 ชั้น**: (1) ฝั่ง client เช็ค `supabase.auth.getSession()` ต้อง
  login อยู่ก่อน (2) เรียก `POST` กลับมาที่ตัวเอง (`roleCheck`) ซึ่งตรวจ JWT จริง
  ผ่าน `auth.getUser(token)` แล้ว query `user_roles` ต้องมี role อยู่ใน
  `["director", "lead"]` เท่านั้น — ถ้าไม่ใช่ ตอบ 403 และหน้าเว็บ sign out ทันที
- **Security headers ครบ** บน response ของหน้า HTML:
  - `Content-Security-Policy`: `default-src 'none'`, จำกัด script/connect/style/img
    เฉพาะที่จำเป็น, `frame-ancestors 'none'`, `form-action 'self'`
  - `Referrer-Policy: no-referrer`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Cache-Control: no-store` (ไม่ cache หน้า consent ที่มีข้อมูล session)

## หมายเหตุ

- ไฟล์ต้นฉบับมีข้อความภาษาไทยใน HTML ที่ดู mojibake (encoding เพี้ยน) เมื่อเปิด
  ดูตรงๆ — คัดลอกมาเก็บตามที่ได้รับจริงจาก Dashboard โดยไม่ได้แก้ไข ถ้าจะแก้
  encoding ควรทำที่ต้นทาง (Supabase Dashboard) แล้วค่อยอัปเดตสำเนานี้ตาม ไม่ใช่
  แก้ในสำเนานี้แล้วลืม sync กลับ
- สำเนานี้อาจไม่ตรงกับเวอร์ชันที่ deploy จริงถ้ามีคนแก้ผ่าน Dashboard ในอนาคต
  โดยไม่มาอัปเดตที่นี่ — ถือเป็น snapshot ณ วันที่ 2026-08-03 ไม่ใช่ source of
  truth ที่ sync อัตโนมัติ
