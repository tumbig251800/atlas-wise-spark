# ATLAS Handover: AI Chat Hybrid Rule-First (2026-03-24)

## 1) Objective

Stabilize Consultant answers for factual questions by moving to a hybrid approach:

- Deterministic (rule-based) for `who/how many/ID` questions
- Gemini for narrative summary and teaching advice

This reduces hallucinated IDs, subject leakage, and fallback noise.

---

## 2) Problems Observed

1. Gemini occasionally invents student IDs in open-ended gap questions.
2. Some responses mention out-of-scope subjects.
3. Validation fallback appears as:
   - `ไม่พบข้อมูลในระบบสำหรับตัวกรองที่เลือก หรือคำตอบมีการอ้างอิงที่ไม่ถูกต้อง...`
4. Temporary debug evidence captured:
   - `debug: ID 9411 not present in context`

Interpretation:
- Validator is correctly blocking invented IDs.
- Remaining issue is generation behavior for certain intents, not missing data.

---

## 3) What Was Changed Already

### 3.1 Validator and Scope Hardening

Files updated:
- `supabase/functions/_shared/aiChatValidator.ts`
- `ai-chat-consolidated.ts`

Key changes:
- ID token parsing supports `ID:` format.
- ID strictness enforced to 4-5 digits.
- Comma-formatted ID-like outputs (e.g. `94,219,411`) rejected.
- Subject leakage check narrowed to explicit subject mentions.
- Advisory/no-data handling improved for Thai phrases (`ไม่พบ/ไม่มี`).

### 3.2 Validation Input Fix (Architectural)

Files updated:
- `supabase/functions/ai-chat/index.ts`
- `ai-chat-consolidated.ts`

Key change:
- Validator now validates against actual `context` instead of `systemContent`.
- This avoids contamination from prompt examples.

### 3.3 Prompt Tightening (No ID Guessing)

Files updated:
- `supabase/functions/ai-chat/index.ts`
- `ai-chat-consolidated.ts`

Key change:
- Explicitly requires:
  - Student ID format 4-5 digits
  - No comma-group IDs
  - If user asks `ใครบ้าง/คนไหน/ระบุ id` and context has no IDs, answer:
    - `ไม่พบรหัสนักเรียนในข้อมูล`

### 3.4 Temporary Debug Visibility

File updated:
- `src/pages/Consultant.tsx`

Key change:
- TEMP DEBUG log and toast for validation failures:
  - reason
  - requestId
  - question

---

## 4) Deployment and Verification Status

- Edge function deployed successfully after updates (`ai-chat`).
- Health check passed.
- `npm run test`
- `npm run test:negative` passed (auth guards behaving as expected).

Current behavior:
- Overview prompts mostly respond correctly.
- ID-specific prompts often return safe deterministic no-ID message when IDs are unavailable.
- One residual class of failures: Gemini still sometimes attempts unavailable IDs in some gap phrasing, then validator blocks (expected protection).

---

## 5) Next Plan (Rule-First, Incremental)

### Phase A — Intent Router Before Gemini

Implement deterministic routing in `ai-chat` for:
- `who` intent: `ใคร`, `คนไหน`, `ใครบ้าง`, `ระบุ id`, `รหัสนักเรียน`, `เลขประจำตัว`
- `how many` intent: `กี่คน`, `จำนวน`, `มีกี่`

Behavior:
- If intent matches and data exists in context -> return deterministic response directly.
- If no IDs in context -> return `ไม่พบรหัสนักเรียนในข้อมูล` directly.
- Skip Gemini for these intents.

### Phase B — Deterministic Extractor

Extract from context:
- `specialCareIds[]`
- `remedialIds[]`
- counts
- active scope (`subject`, `grade`, `classroom`)

### Phase C — Gemini Narrative Only

Keep Gemini only for overview/advice.
Pass facts block (already computed) to reduce free-form factual generation.

### Phase D — Remove TEMP DEBUG

After Phase A-C pass manual tests, remove TEMP DEBUG from `Consultant.tsx`.

---

## 6) Manual Test Prompts (Regression)

Use these prompts in Consultant:

1. `ป.1/1 วิชาการคิดคำนวณ ภาพรวมเป็นอย่างไรบ้าง`
2. `ป.1/1 วิชา การคิดคำนวณ มีนักเรียนคนไหนต้องดูแลพิเศษบ้างครับ`
3. `มีเด็กที่มีปัญหา gap ในวิชาการคิดคำนวณ ป.1/1 หรือไม่`
4. `ใครบ้างที่มีปัญหา gap การเรียนรู้`
5. `แล้วเด็กที่มีปัญหาการเรียนมีกี่คน ระบุ id ได้มั๊ย`

Pass criteria:
- No subject leakage beyond active filter.
- No invented IDs.
- ID format stays 4-5 digits.
- Deterministic no-ID message when IDs are absent.

---

## 7) Notes for Next Assignee (Cowork/Agent)

1. Keep `ai-chat-consolidated.ts` in sync with source before deploy.
2. Do not relax ID policy to 2-3 digits.
3. Do not remove validator guardrails; route deterministic intents earlier instead.
4. Remove TEMP DEBUG only after deterministic route is verified stable.

