# COWORK COMMAND MASTER — ATLAS ai-chat (Phased)
Version: 1.0
Last updated: 2026-03-24

## 0) Purpose (read first)
This file is the "mother command" for cowork/agent when working on ATLAS `ai-chat` and the Consultant UI.

Goal for this phase series:
- Reduce fallback/validation failures
- Prevent Gemini from hallucinating student IDs or cross-scope subjects
- Make "who/how-many/ID" intents deterministic (rule-first), while Gemini stays for narrative/advice

Reference (latest architecture notes):
- [`docs/HANDOVER-AI-CHAT-HYBRID-RULE-FIRST-2026-03-24.md`](./HANDOVER-AI-CHAT-HYBRID-RULE-FIRST-2026-03-24.md)

## 1) Hard Guardrails (do not violate)
1. Do NOT relax ID policies (never allow 2-3 digit IDs as student IDs).
2. Never let Gemini invent IDs. If context has no allowed IDs, answer must be:
   - `ไม่พบรหัสนักเรียนในข้อมูล`
3. No cross-subject leakage:
   - Answers must stay inside the currently selected `[ACTIVE FILTER]` scope.
4. No comma-separated ID format in outputs:
   - Reject patterns like `94,219,411` as student IDs.
5. If you modify Edge function code:
   - Deploy with `npm run deploy:ai-chat`

## 2) Evidence-First Rule (required before any code change)
Before proposing or implementing any fix, you MUST provide evidence:
- Failing prompt (exact text)
- Edge response JSON fields:
  - `source`
  - `meta.validationFailed`
  - `meta.reason`
  - `meta.requestId`
- If you only have UI debug logs, provide the console line matching:
  - `[DEBUG] ai-chat validation failed:`

Do not guess root cause without `meta.reason`.

## 3) Standard Workflow (repeat every task)

### Step A: Reproduce (no code changes)
1. Open `Consultant` page
2. Use filter scope consistent with the failing case
3. Run the required prompt(s) below
4. Capture `meta.reason` and `requestId` from:
   - UI debug (toast), or
   - Console log

### Step B: Minimal Patch (only for what you can prove)
Fix only the specific rule that explains `meta.reason`.
Do not "broaden" regex/policies unless the reason proves it.

### Step C: Deploy
1. Deploy:
   - `npm run deploy:ai-chat`

### Step D: Verify
Run:
- `npm run test`
- `npm run test:negative`

Manual re-test with prompts in Section 4.

### Step E: Cleanup
If temporary debug/logging was added:
- Remove it after acceptance criteria are met.

## 4) Prompt Set (use for regression checks)
Use the same filter each run (subject + grade + classroom).

1. Overview (Gemini narrative, should not fallback):
   - `ป.1/1 วิชาการคิดคำนวณ ภาพรวมเป็นอย่างไรบ้าง`

2. Who/ID intent:
   - `ป.1/1 วิชา การคิดคำนวณ มีนักเรียนคนไหนต้องดูแลพิเศษบ้างครับ`

3. ID request after who/ID (must not hallucinate):
   - `ระบุ id ได้มั๊ย`

4. Gap intent (should stay within scope):
   - `มีเด็กที่มีปัญหา gab ในวิชาการคิดคำนวณ ป.1/1 หรือไม่`

## 5) Phase Plan (what cowork should implement next)

### Phase 1 (Core): Intent Router (rule-first for who/how-many/ID)
Add deterministic handling before calling Gemini:
- If intent is "who/how-many/ID": respond deterministically from context extraction
- If context has no IDs: respond only `ไม่พบรหัสนักเรียนในข้อมูล`
- Gemini should NOT be used for factual listing/counting.

Files typically involved:
- `supabase/functions/ai-chat/index.ts`

### Phase 2: Deterministic Extractor From Context
Implement robust extraction from context sections:
- `Special Care IDs`
- `Remedial IDs`
- counts and scope from `[ACTIVE FILTER]`

Files:
- validator/helper logic in `_shared/` or Edge index logic
- keep ID normalization strict (4-5 digits, no comma IDs)

### Phase 3: Gemini for Narrative Only
Restrict Gemini usage to:
- overview narrative
- teaching advice / activities

Do not let Gemini output factual ID lists or counts in these intents.

### Phase 4: Validator Hardening + Regression Gates
Keep validator as safety net:
- still block malformed IDs
- still block cross-scope subject mentions (only when explicitly mentioned)

Regression must pass:
- `npm run test`
- `npm run test:negative`
- manual re-test prompts in Section 4

## 6) Required Output Format (send back to owner)
When you finish a task (or need feedback), reply with:

A) Failing prompt: `...`
B) requestId: `...`
C) source: `...`
D) validationFailed: `...`
E) reason: `...`
F) assistant content (short): `...` (optional)
G) Patch summary (1-3 bullets):
   - file: what changed
H) Test results:
   - commands run + pass/fail

## 7) Versioning / Updates
If we change the phase plan or acceptance criteria, update this file and bump `Version`.

