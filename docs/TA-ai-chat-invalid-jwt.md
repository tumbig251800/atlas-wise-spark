# Technical Architecture Consultation — `ai-chat` 401 Invalid JWT (Browser)

## TL;DR
- Browser เรียก `POST /functions/v1/ai-chat` แล้วได้ **`401 Invalid JWT`** จาก Supabase Edge gateway (verify layer)  
- ยืนยันจาก debug ใน UI: `raw={"code":401,"message":"Invalid JWT"}`  
- แปลว่า request “ถึง endpoint แล้ว” แต่ **Authorization token ไม่ผ่านการ verify** (ไม่ใช่ปัญหา LLM / ไม่ใช่แอปไม่ยิง request)
- คาดว่าเกิดจาก **session/token mismatch** (stale session จาก project เก่า, multiple Supabase clients, storage key mismatch, หรือ header contract ไม่ถูกต้องเมื่อ `verify_jwt=true`)

## Environment
- Frontend: React + TypeScript + Vite (local dev server)
- Backend: Supabase Edge Functions (`ai-chat`) — Project ref: `ebyelctqcdhjmqujeskx`
- Edge Functions: เปิดใช้งาน `verify_jwt=true` (ตาม phase ก่อนหน้า)

## Repro Steps (Deterministic)
1) เปิดหน้า Executive/Dashboard ในเว็บ
2) เปิด Chat Sidebar: “พีท ร่างทอง — AI ที่ปรึกษา”
3) พิมพ์ “สวัสดีพีท” แล้วกดส่ง
4) ดู debug ใต้แชท (เพิ่มเพื่อ trace):

```
rid=d264c51e status=401 url=https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/ai-chat raw={"code":401,"message":"Invalid JWT"}
```

## Observed Result
- `POST https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/ai-chat` → **401**
- Response body:

```json
{"code":401,"message":"Invalid JWT"}
```

## Expected Result
- ถ้ามี session token ถูกต้อง → 200 และ JSON `{ ok: true, content: "..." }`
- ถ้าไม่มี session → 401/403 ที่อธิบายได้ชัด และ UI ควรบอกให้ login

## Hard Evidence

### A) UI debug confirms 401 (Network OK, Auth failed)
ภาพจากผู้ใช้ (ตัวอย่าง):
- `/Users/tum_macmini/.cursor/projects/Users-tum-macmini-atlas-wise-spark/assets/______________2569-03-18______21.01.48__2_-733aa561-4ebf-450e-9767-290c85924441.png`

### B) Edge Function logs show requests arriving (context)
ภาพ Supabase Dashboard logs:
- `/Users/tum_macmini/.cursor/projects/Users-tum-macmini-atlas-wise-spark/assets/______________2569-03-18______20.47.57__2_-f278d4e8-20a9-42d3-a5a2-4943228351c9.png`

> หมายเหตุ: ต้องแยกให้ชัดว่า log ที่เห็น `200` เป็น `OPTIONS` หรือ `POST` และเป็น request ชุดเดียวกับที่ browser ได้ `401` หรือไม่ (ดูหัวข้อ “Observability”)

## Code References (Current Implementation)

### 1) Edge function headers & base URL
File: `src/lib/edgeFunctionFetch.ts`

```1:93:/Users/tum_macmini/atlas-wise-spark/src/lib/edgeFunctionFetch.ts
export async function getEdgeFunctionHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const accessTokenRaw = (data.session?.access_token ?? "").trim();

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;
  const accessTokenOk =
    looksLikeJwt(accessTokenRaw) && (safeJwtRef(accessTokenRaw) ?? PROJECT_REF) === PROJECT_REF;
  const bearer = accessTokenOk ? accessTokenRaw : anonKey;
  const headers: Record<string, string> = {
    "Content-Type": toByteString("application/json"),
    apikey: toByteString(anonKey),
    Authorization: toByteString(`Bearer ${bearer}`),
  };

  return headers;
}
```

### 2) Supabase client used to fetch session
File: `src/lib/atlasSupabase.ts`

```1:22:/Users/tum_macmini/atlas-wise-spark/src/lib/atlasSupabase.ts
const ATLAS_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const ATLAS_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;
export const supabase = createClient<Database>(ATLAS_URL, ATLAS_ANON_KEY);
```

### 3) Potential duplicated Supabase client
File: `src/integrations/supabase/client.ts`

```1:18:/Users/tum_macmini/atlas-wise-spark/src/integrations/supabase/client.ts
const SUPABASE_URL = "https://ebyelctqcdhjmqujeskx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "...";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

> Risk: multiple clients + storage/session key mismatch → stale/foreign session token

### 4) UI fetch + debug
File: `src/components/chat/ChatSidebar.tsx`

```42:115:/Users/tum_macmini/atlas-wise-spark/src/components/chat/ChatSidebar.tsx
const headers = await getEdgeFunctionHeaders();
headers["x-request-id"] = requestId;
const resp = await fetch(chatUrl, { method: "POST", headers, body: ... });
const raw = await resp.text();
setLastDebug(`rid=${requestId} status=${resp.status} url=${chatUrl} raw=${raw.slice(0,160)}`);
```

## Diagnosis (Most Likely Root Cause)
**401 Invalid JWT** มาจาก Supabase Edge gateway (verify_jwt layer) → token ที่ส่งใน `Authorization`:
- ไม่ใช่ JWT ที่ถูกต้อง (malformed/trim/encoding) หรือ
- เป็น JWT จาก project/ref อื่น (stale session จาก project เก่า) หรือ
- `Authorization`/`apikey` contract ไม่ถูกต้องตาม policy ของ Supabase ในโหมด `verify_jwt=true`

สาเหตุเชิงระบบที่มีความเสี่ยงสูง:
- มี Supabase client มากกว่า 1 ตัว → session store “ไม่ deterministic”
- การ clear stale session key ลบแค่บาง key (ยังคงเหลือ keys อื่น)

## Questions / Requests for Technical Architecture

### 1) Header Contract when `verify_jwt=true`
- ต้องส่ง **`Authorization: Bearer <user access_token>` เท่านั้น** หรืออนุญาต anon JWT เป็น bearer ได้?
- ต้องส่ง `apikey` เสมอหรือไม่ (best practice)?
- หากไม่มี session ควร “hard fail” ให้ UI บังคับ login หรือควรมี fallback?

### 2) Frontend Supabase Client Strategy
- ควรบังคับให้มี Supabase client เดียว (singleton) ทั้ง repo หรือไม่?
- แนะนำกำหนด `storageKey` เองเพื่อกัน session ข้าม project ไหม?
- แนวทาง “clear stale session” ที่ครบถ้วน (ทุก key ที่ Supabase-js ใช้) ควรทำอย่างไร?

### 3) Deterministic Token Ownership Check
- TA แนะนำตรวจ `iss/ref/aud` จาก JWT payload ใน FE หรือควรทำใน backend?
- มี official/best approach ใน Supabase ที่ให้ตรวจ token validity ก่อนเรียก edge function หรือไม่?

### 4) Observability
- วิธีดู logs ให้ชัดว่า `POST` ได้ 401/200 (แยกจาก `OPTIONS 200`) และ correlate ด้วย request-id
- ข้อเสนอ: standardize `x-request-id` end-to-end และ log แบบไม่รั่วข้อมูลส่วนบุคคล

## Proposed Next Actions (for TA approval)
- Consolidate Supabase client to single source of truth
- Define clear auth policy:
  - If `verify_jwt=true`: require valid user session JWT; if missing/invalid → show login prompt
- Add a deterministic “auth sanity check” flow in FE:
  - call Supabase auth endpoint (e.g., `/auth/v1/user`) with current token and fail early if invalid
- Improve logging correlation between browser request and function logs (request-id)

