# ATLAS Teaching System

ATLAS (Adaptive Teaching & Learning Analytics System) is a web app that helps teachers and school leaders record teaching outcomes, analyze classroom signals, and generate AI-assisted teaching plans.

ATLAS (Adaptive Teaching & Learning Analytics System) คือเว็บแอปที่ช่วยครูและผู้บริหารโรงเรียนบันทึกผลหลังสอน วิเคราะห์สัญญาณการเรียนรู้ในห้องเรียน และสร้างแผนการสอนด้วย AI

## Core Features | คุณสมบัติหลัก

- AI Consultant ("Peat Rang-Thong") for evidence-based classroom insights
- AI Lesson Plan generation with streaming responses
- AI Summary for executive and policy-level overviews
- AI Exam generation and diagnostic support
- Scope-aware analysis by subject/classroom with citation style (`[REF-x]`)
- Validation-focused safety layer to reduce unsupported claims

- ที่ปรึกษา AI ("พีท ร่างทอง") สำหรับวิเคราะห์เชิงหลักฐานจากข้อมูลจริง
- สร้างแผนการสอนด้วย AI แบบตอบผลลัพธ์ต่อเนื่อง (streaming)
- สรุปภาพรวมสำหรับผู้บริหารและเชิงนโยบาย
- สร้างข้อสอบและช่วยวินิจฉัยจุดเสี่ยงการเรียนรู้
- ควบคุมขอบเขตตามวิชา/ชั้น/ห้อง พร้อมรูปแบบการอ้างอิง (`[REF-x]`)
- มีชั้นความปลอดภัยด้านการตรวจความสมเหตุสมผลของคำตอบ AI

## Tech Stack | เทคโนโลยี

### Frontend

- React + TypeScript + Vite
- Tailwind CSS + shadcn-ui

### Backend

- Supabase (Auth, Postgres, Edge Functions)
- Deno-based Edge Functions for AI workloads

### AI

- Gemini API (configured via server-side secrets)

## Repository Structure | โครงสร้างโปรเจกต์

```text
src/                           # Frontend pages, components, hooks, and libs
supabase/config.toml           # Function-level deploy/auth config
supabase/functions/            # Edge Functions (ai-chat, ai-summary, ai-lesson-plan, etc.)
supabase/functions/_shared/    # Shared helpers (auth guard, validators)
docs/                          # Operational notes, test evidence, runbooks
```

## Environment Variables | ตัวแปรแวดล้อม

Create `.env.local` (or `.env`) for frontend development:

สร้างไฟล์ `.env.local` (หรือ `.env`) สำหรับฝั่ง frontend:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-anon-key>
```

Server-side secrets are configured in Supabase (not in repo):

ค่า secrets ฝั่ง server ต้องตั้งใน Supabase เท่านั้น (ไม่เก็บใน repo):

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (only where required)

## Local Development | วิธีรันในเครื่อง

```bash
# 1) Install dependencies
npm install

# 2) Start dev server
npm run dev
```

Default local URL (Vite): `http://localhost:8080/`

URL ปกติสำหรับรัน local (Vite): `http://localhost:8080/`

## Deployment Notes | แนวทาง Deploy

### Frontend

Deploy frontend to your hosting target (for example, Vercel).

### Supabase Edge Functions

Functions are deployed via Supabase (CLI or Dashboard), including:

- `ai-chat`
- `ai-summary`
- `ai-lesson-plan`
- `ai-exam-gen`
- `atlas-diagnostic`

Function auth strategy is managed through:

- `supabase/config.toml` (`verify_jwt` settings)
- In-function manual auth guard (`requireAtlasUser`) in shared helpers

แนวทาง auth ของฟังก์ชันจะคุมผ่าน:

- `supabase/config.toml` (ค่า `verify_jwt`)
- ตัวตรวจ auth ในโค้ด (`requireAtlasUser`) จาก shared helpers

## Verification Checklist (Production) | เช็กลิสต์ยืนยันหลัง Deploy

After deploying `ai-lesson-plan`, verify gateway/auth behavior with `curl`:

หลัง deploy `ai-lesson-plan` ให้ทดสอบ auth ด้วย `curl`:

1. No `Authorization` header -> expect app-level 401 (`Missing Authorization`)
2. `Authorization: Bearer <anon-key>` -> expect app-level auth rejection, not gateway-level `{"code":401,"message":"Invalid JWT"}`
3. Logged-in app flow -> lesson plan generation should stream or complete

1. ไม่ส่ง `Authorization` -> ควรได้ 401 จากโค้ดแอป (`Missing Authorization`)
2. ส่ง `Authorization: Bearer <anon-key>` -> ควรถูกปฏิเสธจากโค้ดแอป ไม่ใช่ gateway `{"code":401,"message":"Invalid JWT"}`
3. ทดสอบจากแอปที่ล็อกอินแล้ว -> ควรสร้างแผนการสอนได้แบบ stream หรือสำเร็จ

Reference runbook: `docs/verify-ai-lesson-plan-deploy.md`

## Security and Safety | ความปลอดภัย

- Never commit API keys or access tokens
- Keep all AI provider keys in Supabase secrets
- Treat AI outputs as decision support; verify critical conclusions against source records

- ห้าม commit API keys หรือ access tokens
- เก็บคีย์ของผู้ให้บริการ AI ไว้ใน Supabase secrets เท่านั้น
- ให้ถือผลลัพธ์ AI เป็นเครื่องมือช่วยตัดสินใจ และตรวจทานกับข้อมูลจริงก่อนใช้งาน

## Contributing | แนวทางร่วมพัฒนา

1. Create a branch from `main`
2. Make focused changes
3. Run local verification
4. Open PR with summary + test evidence
