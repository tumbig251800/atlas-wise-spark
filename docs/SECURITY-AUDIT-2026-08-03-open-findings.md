# Security audit 2026-08-03 — open findings (not fixed in this round)

Context: this audit started from checking `supabase/functions/delete-teacher-data/`
(an untracked, unauthenticated hard-delete function that turned out to have
never been deployed) and expanded into a full pass over every edge function
live on the `ebyelctqcdhjmqujeskx` Supabase project. Six functions with no
auth and no in-app caller were found and removed from production directly
(`cleanup-duplicate-setups`, `cleanup-wrong-term`, `fix-unit-setups`,
`create-all-missing-setups`, `debug-setups`, `atlas-delete-logs` — the last
one archived at `docs/archived-functions/atlas-delete-logs/`, not deleted,
since it had proper auth and just wasn't used).

This document records two categories of findings that were **not** acted on
in that round, so they don't get lost.

## 1. Fake-auth check — 3 functions still live

`import-pbl`, `generate-research-docx`, `generate-research-report` each check
only whether an `Authorization` header is *present*, never whether the token
in it is valid. All three then use `SUPABASE_SERVICE_ROLE_KEY`, which bypasses
RLS entirely. Sending `Authorization: Bearer anything` passes the check.

This is arguably worse than having no auth check at all — a reviewer skimming
the code sees an auth check and assumes it's real.

| Function | File:line | What it does |
|---|---|---|
| `import-pbl` | [supabase/functions/import-pbl/index.ts:185-188](../supabase/functions/import-pbl/index.ts) | `if (!authHeader) { throw ... }` then proceeds to `upsert` PBL student rows via service_role |
| `generate-research-docx` | [supabase/functions/generate-research-docx/index.ts:399-404](../supabase/functions/generate-research-docx/index.ts) | `if (!req.headers.get("Authorization")) { return 401 }` then reads `classroom_research_suggestions` via service_role, generates a docx |
| `generate-research-report` | [supabase/functions/generate-research-report/index.ts:742-747](../supabase/functions/generate-research-report/index.ts) | same pattern, reads `classroom_research_suggestions` via service_role, generates a report |

**Suggested fix** (not applied — needs your decision on scope/timing): replace
the presence check with an actual validity check, matching the pattern already
used elsewhere in this codebase —
`supabase/functions/_shared/atlasAuth.ts`'s `requireAtlasUser(req)`, which
calls `supabase.auth.getUser(token)` against the real token and returns
401 if it doesn't resolve to a real user. `ai-chat`, `ai-summary`,
`atlas-diagnostic`, etc. already import and use this helper — these 3 should
too. `import-pbl` is the more urgent of the three since it writes data
(`upsert`); the other two are read + generate only, so the exposure is data
disclosure (any `classroom_research_suggestions` row + generated document
content), not data loss.

## 2. Live functions with no source anywhere in this repo

The list of 22 live functions includes 7 that have **no matching folder** in
`atlas-wise-spark`, in any commit, on any branch:

| Function | Where the source actually is |
|---|---|
| `generate-day` | Found: `~/kindergarten-4domains/supabase/functions/generate-day` — a separate, unrelated local repo on this machine |
| `woranat-atlas-mcp` | Found: `~/supabase/functions/woranat-atlas-mcp` — another separate local repo. Also a stale, non-matching trace exists in this repo's unmerged branch `feat/atlas-incremental-tools` (commits `1ac328a`/`c44a2f0`, 2026-07-20) — that code does **not** match what's actually deployed, don't use it as reference |
| `generate-assessment` | Not found anywhere on this machine or in this repo's git history |
| `generate-kindergarten-research-suggestions` | Not found anywhere on this machine or in this repo's git history |
| `generate-kindergarten-research-report` | Not found anywhere on this machine or in this repo's git history |
| `kindergarten-mcp-7d40d75d3e4121d5b9d3034f2cd0db7253a28398` | Not found anywhere on this machine or in this repo's git history |
| `woranat-oauth-consent` | Not found anywhere on this machine or in this repo's git history |

None of these can be audited for auth/data-handling from this repo — their
governance (who deployed them, from where, what they do) needs to be
confirmed at the source, wherever that is. This is out of scope for
`atlas-wise-spark` to fix, but worth tracking since 5 of the 7 have no known
location at all.
