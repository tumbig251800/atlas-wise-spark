# ATLAS Teaching System

## สถานะปัจจุบัน | Current Status

**อัปเดต: 28 เมษายน 2569**

| รายการ | สถานะ |
|--------|-------|
| Production URL | [https://atlas-wise-spark.vercel.app](https://atlas-wise-spark.vercel.app) |
| Deploy platform | Vercel (linked: `tumbigmans-projects/atlas-wise-spark`) |
| GitHub repo | [tumbig251800/atlas-wise-spark](https://github.com/tumbig251800/atlas-wise-spark) |
| Supabase project | `ebyelctqcdhjmqujeskx` (atlas_prod) |
| ระยะการพัฒนา | **พร้อมทดสอบกับครู** — ส่งลิงก์ให้ครูได้เลย |
| คู่มือครู | ยังไม่ได้จัดทำ (กำหนดทำก่อนอบรม) |
| อบรมครู | ยังไม่ได้นัด |

**สิ่งที่ต้องทำต่อ**
- [ ] จัดทำคู่มือการใช้งานสำหรับครู
- [ ] นัดอบรมครู
- [ ] รวบรวม feedback จากครูหลังทดสอบ

> **⚠️ Note on UI / Preview Sync:** ถ้าแสดงผลหน้า `/lesson-plan` เป็น UI แบบเก่า (เช่น มีช่อง Snapshot หรือ placeholder รวม ป. กับ ม.) ให้ยึด Code ใน Repo นี้เป็นหลัก (Source of Truth) รบกวนรัน `npm run dev` จาก root repo -> ทำ Hard Refresh -> เปิดใน Chrome ภายนอกที่ `http://localhost:8080/lesson-plan` และสังเกตให้มั่นใจว่าแท็บเบราว์เซอร์ชื่อ "ATLAS Teaching System"

ATLAS (Adaptive Teaching & Learning Analytics System) is a web app that helps teachers and school leaders record teaching outcomes, analyze classroom signals, and generate AI-assisted teaching plans.

ATLAS (Adaptive Teaching & Learning Analytics System) คือเว็บแอปที่ช่วยครูและผู้บริหารโรงเรียนบันทึกผลหลังสอน วิเคราะห์สัญญาณการเรียนรู้ในห้องเรียน และสร้างแผนการสอนด้วย AI

## Core Features | คุณสมบัติหลัก

- AI Consultant ("Peat Rang-Thong") for evidence-based classroom insights
- AI Lesson Plan generation with streaming responses (Reflection from Teaching Logs or Snapshot context; `learningUnit` in request body; DB table `lesson_plan_snapshots` exists but unused by UI)
- AI Summary for executive and policy-level overviews
- AI Exam generation and diagnostic support
- Scope-aware analysis by subject/classroom with citation style (`[REF-x]`)
- Validation-focused safety layer to reduce unsupported claims

**Project changelog (Edge + AI + deploy):** see [`docs/PROJECT-EDGE-AI-SUMMARY-2026-03.md`](docs/PROJECT-EDGE-AI-SUMMARY-2026-03.md) (TH/EN technical summary for handover).

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
docs/                          # Operational notes, test evidence, runbooks (start: PROJECT-EDGE-AI-SUMMARY-2026-03.md)
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

- `supabase/config.toml` — per-function **`verify_jwt = false`** so the gateway does not block valid app JWTs; auth is enforced in code.
- `supabase/functions/_shared/atlasAuth.ts` — **`requireAtlasUser(req)`** validates `Authorization: Bearer <user_access_token>`.

**Important:** After changing `config.toml`, **re-deploy each affected function** (`supabase functions deploy <name>`). If you skip deploy, the cloud may still use the old gateway setting — symptoms include `{"code":401,"message":"Missing authorization header"}` for functions that should return `{"error":"Missing Authorization"}` from app code.

แนวทาง auth ของฟังก์ชันจะคุมผ่าน:

- `supabase/config.toml` — ตั้ง **`verify_jwt = false`** ต่อฟังก์ชัน แล้วให้โค้ดเป็นคนตรวจ JWT
- `requireAtlasUser` ใน shared helpers

**สำคัญ:** หลังแก้ `config.toml` ต้อง **deploy ฟังก์ชันที่เกี่ยวข้องอีกครั้ง** ไม่งั้น production อาจยังบังคับ JWT ที่ gateway อยู่

## Verification Checklist (Production) | เช็กลิสต์ยืนยันหลัง Deploy

Use `curl` without `Authorization` on each AI function URL — expect **401** with **`error` / `Missing Authorization`** (app-level), **not** gateway-style `{"code":401,"message":"Missing authorization header"}`.

| Area | How to verify |
|------|----------------|
| **ai-chat** | `curl` POST without JWT → 401; Consultant chat works when logged in |
| **ai-summary** | Executive → **AI Policy Advice** → button **วิเคราะห์** returns summary |
| **ai-lesson-plan** | Logged in: stream completes; test health + 401 via `npm run test:regression-lesson-plan` (optional JWT for v2 both modes — see `docs/verify-ai-lesson-plan-deploy.md`) |
| **ai-exam-gen** | Consultant → post-unit exam → **สร้างข้อสอบ** streams; `GET .../ai-exam-gen/health` → 200 without auth |

Automated: `npm run test:negative`, `npm run test:regression-lesson-plan`, `node scripts/check-setup.mjs`

รัน `curl` ไม่ส่ง `Authorization` แต่ละฟังก์ชัน — ควรได้ **401** แบบโค้ดแอป ไม่ใช่ข้อความ gateway แบบ `Missing authorization header`

เอกสารเต็มและไทม์ไลน์: **`docs/PROJECT-EDGE-AI-SUMMARY-2026-03.md`**  
รายละเอียดทดสอบแผนการสอน: `docs/verify-ai-lesson-plan-deploy.md`  
Cowork checklist: `docs/prompt-for-cowork-deploy-ai-chat.md`

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
