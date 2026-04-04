# PROJECT_CONTEXT.md
> ไฟล์นี้สำหรับให้ AI ทุกตัวที่ร่วมพัฒนาโปรเจคต์นี้อ่าน เพื่อให้ทำงานต่อเนื่องได้โดยไม่ต้องอธิบายซ้ำ
> อัปเดตล่าสุด: 2026-04-04

---

## โปรเจคต์คืออะไร
**ATLAS** — ระบบช่วยครูบันทึกและวิเคราะห์การสอน (Teaching Log, Competency Report, Executive Dashboard, AI Chat, Lesson Plan)

---

## Stack
| Layer | Tech |
|-------|------|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix UI) |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions) |
| AI | Gemini (via Supabase Edge Functions) |
| Auth | Supabase Auth |

---

## โครงสร้างโปรเจคต์
```
atlas-wise-spark/
├── src/
│   ├── pages/              # หน้าหลัก (TeachingLog, Executive, CompetencyReport, LessonPlan, ...)
│   ├── components/
│   │   ├── teaching-log/   # Step1General, Step2Quality, Step3Gap, Step4Action, PreSubmitSummary
│   │   ├── executive/      # ExecutiveFilters, MasteryBarChart, GapPieChart, ...
│   │   ├── competency/     # ActiveClassroomAssessment, CompetencyRadarChart, StudentSelector
│   │   ├── lesson-plan/
│   │   ├── chat/
│   │   └── shared/
│   ├── hooks/              # useAuth, useDashboardData, useCompetencyReport, useTrendAlerts, ...
│   ├── domain/             # consultantContext, executiveLogsSummary, lessonPlanRequest
│   ├── lib/                # atlasSupabase, utils, capabilityConstants2026
│   └── types/
├── supabase/
│   ├── functions/          # ai-chat, ai-lesson-plan, ai-exam-gen, ai-summary, atlas-diagnostic, ...
│   └── migrations/
├── scripts/                # load-test-lesson-plan.mjs, regression tests
└── PROJECT_CONTEXT.md
```

---

## ข้อมูล Form หลัก (TeachingLogForm)
```typescript
{
  teachingDate, gradeLevel, classroom, subject, learningUnit, topic,
  totalStudents, masteryScore,
  activityMode: "active" | "passive" | "constructive",
  keyIssue, majorGap: "k-gap" | "p-gap" | "a-gap" | "a2-gap" | "system-gap" | "success",
  classroomManagement, healthCareStatus, healthCareIds,
  remedialIds, remedialStatuses: Record<id, "pass" | "stay">,
  nextStrategy, reflection
}
```

---

## Tables หลักใน Supabase (project: ebyelctqcdhjmqujeskx, region: ap-southeast-1)
| Table | ใช้ทำอะไร |
|-------|-----------|
| `teaching_logs` | บันทึกการสอนรายคาบ |
| `unit_assessments` | ผลประเมิน competency รายนักเรียน |
| `lesson_plan_snapshots` | snapshot context สำหรับ lesson plan (per user) |
| `ai_rate_limits` | rate limit per user per edge function (user_id, function_name, last_request_at) |

---

## Conventions
- Path alias `@/` → `src/`
- Supabase client: `import { supabase } from "@/lib/atlasSupabase"`
- Auth: `import { useAuth } from "@/hooks/useAuth"`
- Toast: `import { useToast } from "@/hooks/use-toast"`
- localStorage key ที่ใช้: `atlas_smart_persist`, `atlas_draft_log`
- mastery_score scale: **1–5** (ไม่ใช่ 0–100)
- Role: `teacher` | `director` (ดึงจาก useAuth)

---

## สิ่งที่ทำเสร็จแล้ว ✅

### Core Features (เสร็จก่อน 2026-04-04)
- Teaching Log form 4 ขั้นตอน + PreSubmitSummary
- Executive Dashboard (filters, charts, PolicySummary, StrikeEscalation, ReferralQueue)
- AI Chat (Peer Tutor + Analytics mode, fast guard, safety validator)
- AI Lesson Plan (streaming, reflection mode + context_snapshot mode)
- Competency Report + ActiveClassroomAssessment
- Diagnostic Engine (`atlas-diagnostic` edge function)
- CSV Upload
- Supabase Auth + RLS

### Concurrency & Reliability Fixes (2026-04-04)
- **Double-submit guard**: `TeachingLog.tsx` — `if (submitting) return` ป้องกัน submit ซ้ำ
- **Diagnostic dedup**: ใช้ `useRef<Set<string>>` track logId + `setTimeout 500ms` กระจายโหลด
- **LessonPlan generate guard**: `loadingRef` (useRef) ป้องกัน concurrent generate
- **Rate limit (atomic)**: `ai-lesson-plan` edge function — 1 request / user / 10 วินาที
  - ใช้ PostgreSQL function `check_and_set_rate_limit` (atomic INSERT...ON CONFLICT...WHERE)
  - ตาราง `ai_rate_limits` + migration `20260404120000`, `20260404130000`
  - **Verified**: load test 10 concurrent → 1 success + 9 blocked ✅
- **Gemini retry**: retry สูงสุด 3 ครั้ง (1s, 2s backoff) เมื่อ Gemini ตอบ 429

### Trend Alerts (2026-04-04) ✅
- **`src/hooks/useTrendAlerts.ts`**: ตรวจ 2 pattern จาก teaching_logs:
  - **Falling Down**: mastery ลดทุกคาบ 3 คาบติดกัน (strictly decreasing)
  - **Red Zone**: mastery ≤ 2.5/5 (50%) ทุกคาบ 3 คาบติดกัน
- **`src/pages/Executive.tsx`**: Orange banner ด้านบน แสดง alert พร้อมชื่อครู + score sequence
- **`src/components/AppSidebar.tsx`**: Red dot 🔴 บนเมนู "ภาพรวมผู้บริหาร" เมื่อมี alert
- ไม่ต้องสร้าง DB table ใหม่ — คำนวณจาก teaching_logs ที่มีอยู่

---

## Roadmap — สิ่งที่ต้องพัฒนาต่อ

### Phase A — รอเปิดเทอม (ทำได้ทันที)

#### Priority 1a: ปุ่ม "คัดลอกจากคาบล่าสุด" ⏳
- **Goal**: ลด friction การกรอก form ซ้ำทุกคาบ
- **Files**: `src/pages/TeachingLog.tsx`, `src/components/teaching-log/Step1General.tsx`
- **Logic**:
  1. Query `teaching_logs` → `SELECT * WHERE teacher_id = ? AND classroom = ? ORDER BY created_at DESC LIMIT 1`
  2. ดึง `topic`, `activity_mode`, `next_strategy`
  3. Pre-fill ค่าใน form state เมื่อกดปุ่ม (ไม่ override `teachingDate`)
- **Effort**: ~1 วัน | **Impact**: สูงมาก

#### Priority 1b: Voice-to-Log ⏳ (ทำหลัง 1a)
- Web Speech API → Gemini แปลง free-text → pre-fill form fields
- **Effort**: ~2 วัน

---

### Phase B — หลังเปิดเทอม (รอข้อมูลจริงจากครู)

#### Priority 3: Student Portfolio ⏳
- **3a**: Mastery trend line chart ใน `CompetencyReport.tsx` (data จาก `teaching_logs`)
- **3b**: At-risk badge ข้างชื่อนักเรียน (remedialStatus `stay` ≥ 2 ครั้ง)
- **3c**: Wire `ActiveClassroomAssessment` → `upsert unit_assessments` จริง
  - form มี logic ครบแล้ว (`onSave` callback) แต่ยัง orphan (ไม่ได้ save จริงลง DB)
  - **สำคัญ**: นี่คือ bug ที่ต้องแก้ก่อนเปิดเทอม

---

### Phase C — ระยะยาว (~1 เดือน+)

#### Priority 4: Parent Portal ⏳
- ต้องสร้างใหม่ทั้งหมด: role `parent`, table `parent_student_links` + RLS, edge function cron, email (Resend), `/parent` route
- **รอทำหลังสุด** — รอให้ teacher adoption มั่นคงก่อน

---

## จุดที่ต้องระวังเมื่อพัฒนาต่อ

### Rate Limit
- `ai-lesson-plan` มี rate limit 10 วินาที/user ผ่าน `check_and_set_rate_limit()` RPC
- ถ้าจะเพิ่ม rate limit ให้ edge function อื่น (เช่น ai-chat) → ใช้ function เดิม เปลี่ยนแค่ `p_function_name`

### Diagnostic Engine
- `atlas-diagnostic` ถูกยิงหลัง save teaching log ทุกครั้ง (fire-and-forget)
- มี dedup ด้วย `useRef<Set<string>>` ใน TeachingLog.tsx — ป้องกัน double invoke
- delay 500ms ก่อน invoke เพื่อกระจายโหลด

### Trend Alerts
- คำนวณ client-side ใน `useTrendAlerts.ts` — ไม่มี DB เพิ่ม
- staleTime 5 นาที — ไม่ refetch ทุกครั้ง
- แสดงเฉพาะ role `director`

### mastery_score
- scale **1–5** (integer) — threshold Red Zone = ≤ 2.5 (covers score 1 และ 2)
- อย่าสับสนกับ percentage

---

## หมายเหตุ
- โปรเจคต์เริ่มพัฒนาด้วย Cursor จากนั้นส่งงานต่อให้ Claude Code
- AI ทุกตัวควรอัปเดตไฟล์นี้เมื่อ feature เสร็จหรือมี decision สำคัญ
- Supabase project ref: `ebyelctqcdhjmqujeskx`
- GitHub: `tumbig251800/atlas-wise-spark` (branch: main)
