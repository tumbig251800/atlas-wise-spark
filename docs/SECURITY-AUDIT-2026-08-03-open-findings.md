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

This document records findings that were **not** fully resolved, so they
don't get lost. Sections 1–2 are the original two categories from the morning
pass. Sections 3–4 were added in the afternoon of the same day and are a
**different class of problem** — not auth/data-exposure but a resource-exhaustion
incident and a downstream dependency it exposed (see each section's note).

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
| `woranat-oauth-consent` | **Recovered** — source retrieved from the Supabase Dashboard and kept at [docs/live-functions-reference/woranat-oauth-consent/](live-functions-reference/woranat-oauth-consent/README.md). Reviewed: uses `supabase.auth.oauth.*` (no custom OAuth flow), JWT + director/lead role check, full security-header set (CSP with `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, etc.) — **this one is fine as-is, no fix needed.** Note it's still live and in active use — see the README's warning before treating it like the archived functions above |

None of the remaining 6 can be audited for auth/data-handling from this repo
— their governance (who deployed them, from where, what they do) needs to be
confirmed at the source, wherever that is. This is out of scope for
`atlas-wise-spark` to fix, but worth tracking since 5 of them have no known
location at all.

## 3. Resource-exhaustion incident — phantom health-check traffic on two MCP functions

**This is NOT a security finding.** No data was read and the caller held a
valid credential. It is a cost/availability problem, and its root cause is
**still unknown** — it is an open finding.

### What happened

On 2026-08-03 the Supabase project `ebyelctqcdhjmqujeskx` had burned
**363,319 of its 500,000** Free-plan Edge Function Invocations for the
16 Jul – 16 Aug billing cycle. The burn rate was **~5,867 requests/hour
(~98/min)** — enough to exhaust the quota in well under a day, at which point
Supabase throttles the project and **every edge function stops**, taking down
both ATLAS and the kindergarten system.

`function_edge_logs` showed something hitting these two endpoints, alternating,
every ~2 seconds, 24/7, since 2026-08-01:

```
GET | 200 | https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/atlas-mcp
GET | 200 | https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/kindergarten-mcp
```

### Evidence it was a forgotten health check, not real use or an attack

- **All `GET`, never `POST`.** The MCP protocol always calls tools over POST;
  ~25,000 requests with zero POSTs means **no tool was ever invoked.**
- Both functions answer `HEAD`/`GET` with a static `{status:"ok",...}` 200
  **before any auth or DB access** (see `docs/archived-functions/atlas-mcp/index.ts`
  line ~1127 and `docs/archived-functions/kindergarten-mcp/index.ts` line ~404).
  That is exactly why every hit was **200, ~114 ms, 0 % 4xx, and produced only
  `booted`/`shutdown` log lines with no query activity.**
- **No `OPTIONS` preflight** → not a browser; server-to-server.
- 4xx rate was 0 % → the caller had a valid credential (or was hitting the
  unauthenticated GET path, which needs none).

Conclusion: an automated health/uptime check that someone configured and
forgot — real *usage* would be POSTs that touch the DB.

### Action taken (2026-08-03)

Both functions were **deleted from production** via
`npx supabase functions delete {atlas-mcp,kindergarten-mcp} --project-ref ebyelctqcdhjmqujeskx`,
then their source was **archived (not deleted)** to
`docs/archived-functions/atlas-mcp/` and `docs/archived-functions/kindergarten-mcp/`
and their `[functions.*]` blocks removed from `supabase/config.toml`. The
`deploy:atlas-mcp` npm script was also removed from `package.json` — otherwise
copying the folder back from the archive would make `npm run deploy:atlas-mcp`
work again immediately, which is exactly what this cleanup is meant to prevent.
See each archived folder's `README.md` for the full record and redeploy
instructions.

The Claude connectors people actually use run on **different** endpoints that
were left untouched and are still live:

| Connector | Endpoint | Status |
|---|---|---|
| Woranat School Atlas MCP | `/woranat-atlas-mcp` | live |
| Woranat Kindergarten | `/kindergarten-mcp-7d40d75d3e4121d5b9d3034f2cd0db7253a28398` | live |

After deletion, `woranat-atlas-mcp`'s logs showed **No results in 1 hour** —
the caller did **not** move to another endpoint.

### Still open — root cause not found

The source of the traffic was **not** identified. Ruled out so far:
n8n cloud (all 12 workflows checked), n8n local (Docker not installed on this
machine), the ChatGPT connector (disconnecting it did not reduce the traffic),
and the Claude connector (uses a different endpoint).

**Warning:** if either function is ever redeployed, watch the invocation count
immediately — whatever was polling may still be running and will resume hitting
it.

## 4. Downstream dependency exposed by section 3 — `woranat-chatgpt-mcp` still points at the removed `kindergarten-mcp`

Separate item, surfaced while auditing references to the removed functions.

`woranat-chatgpt-mcp` (a **live** function, still deployed — do not treat it
like the archived ones) proxies its "kindergarten" upstream to the endpoint
that was just removed:

```js
// supabase/functions/woranat-chatgpt-mcp/index.ts:100
} else {
    endpoint = `${supabaseUrl}/functions/v1/kindergarten-mcp`;   // ← removed in section 3
    headers["x-api-key"] = env("KINDERGARTEN_MCP_API_KEY");
}
```

Note the asymmetry: the same file's **atlas** branch already points at the
current `woranat-atlas-mcp` (line 96), but the **kindergarten** branch still
points at the bare `kindergarten-mcp` — **not** the live
`kindergarten-mcp-7d40d75d3e4121d5b9d3034f2cd0db7253a28398`. So the kindergarten
path of this proxy now targets a function that no longer exists and would return
404.

**Impact right now: none.** The ChatGPT connector this proxy serves has already
been disconnected, so nothing is calling this path today.

**Suggested fix (NOT applied this round — no code change and no deploy):** point
line 100 at the live endpoint instead —
`endpoint = \`${supabaseUrl}/functions/v1/kindergarten-mcp-7d40d75d3e4121d5b9d3034f2cd0db7253a28398\`;`
— and confirm `KINDERGARTEN_MCP_API_KEY` matches what that function expects.
Only do this if/when the ChatGPT kindergarten path is meant to work again;
until then it can stay as-is since nothing depends on it.
