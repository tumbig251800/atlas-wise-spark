/**
 * Sanitize string for use in HTTP headers - prevents "not a valid ByteString" errors.
 * Keeps only printable ASCII (0x20-0x7E) to avoid control chars and invalid Unicode.
 */
import { supabase, ATLAS_AUTH_STORAGE_KEY, ATLAS_URL, ATLAS_ANON_KEY } from "@/lib/atlasSupabase";

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID || "ebyelctqcdhjmqujeskx";

/** Strip non-ASCII and control chars — Fetch API requires valid ByteString for header values */
function toByteString(s: string): string {
  return String(s).replace(/[^\x20-\x7E]/g, "");
}

function looksLikeJwt(token: string): boolean {
  const t = String(token || "").trim();
  return t.split(".").length === 3 && t.length > 20;
}

function safeJwtRef(token: string): string | null {
  // Extract "ref" from JWT payload if possible.
  // This helps ignore stale sessions from other Supabase projects.
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // base64url → base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    const obj = JSON.parse(json) as { ref?: string };
    return obj?.ref ?? null;
  } catch {
    return null;
  }
}

function safeJwtPayload(token: string): { iss?: string; ref?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    return JSON.parse(json) as { iss?: string; ref?: string; exp?: number };
  } catch {
    return null;
  }
}

async function clearAuthState(reason: string, meta?: Record<string, unknown>): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {}
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ATLAS_AUTH_STORAGE_KEY);
      // also clear any old default keys just in case
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("sb-")) localStorage.removeItem(k);
      }
    }
  } catch {}

  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "atlas_auth_recover",
        JSON.stringify({
          reason,
          meta: meta ?? null,
          ts: Date.now(),
        })
      );
    }
  } catch {}
}

/**
 * Returns safe headers for Supabase Edge Function fetch calls (atlas_prod).
 */
export async function getEdgeFunctionHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const accessTokenRaw = (data.session?.access_token ?? "").trim();

  // Always use the same anon key as the singleton supabase client.
  const anonKey = ATLAS_ANON_KEY;
  const payload = looksLikeJwt(accessTokenRaw) ? safeJwtPayload(accessTokenRaw) : null;
  const refOk = (payload?.ref ?? safeJwtRef(accessTokenRaw) ?? PROJECT_REF) === PROJECT_REF;
  const issOk = typeof payload?.iss === "string" ? payload.iss.includes(PROJECT_REF) : true;
  const expOk = typeof payload?.exp === "number" ? payload.exp * 1000 > Date.now() + 30_000 : true;
  const accessTokenOk = looksLikeJwt(accessTokenRaw) && refOk && issOk && expOk;

  // verify_jwt=true: require a valid user session JWT for Authorization.
  if (!accessTokenOk) {
    await clearAuthState("access_token_failed_local_checks", {
      hasToken: Boolean(accessTokenRaw),
      ref: payload?.ref ?? safeJwtRef(accessTokenRaw),
      iss: payload?.iss ?? null,
      exp: payload?.exp ?? null,
    });
    throw new Error("เซสชันไม่ถูกต้อง/หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
  }

  // Hard-validate token against Supabase Auth (signature/expiry/server truth).
  // If this fails, we must not call Edge Functions with a bad JWT.
  const userCheck = await supabase.auth.getUser(accessTokenRaw);
  if (userCheck.error || !userCheck.data?.user) {
    await clearAuthState("access_token_failed_supabase_auth_getUser", {
      error: userCheck.error?.message ?? String(userCheck.error ?? ""),
    });
    throw new Error("เซสชันไม่ผ่านการยืนยันตัวตน กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
  }

  const bearer = accessTokenRaw;
  const headers: Record<string, string> = {
    "Content-Type": toByteString("application/json"),
    apikey: toByteString(anonKey),
    Authorization: toByteString(`Bearer ${bearer}`),
  };

  return headers;
}

function getBaseUrl(): string {
  return ATLAS_URL;
}

/** Base URL for Edge Functions */
export function getEdgeFunctionsBaseUrl(): string {
  return getBaseUrl();
}

/** Full URL for ai-chat Edge Function */
export function getAiChatUrl(): string {
  return `${getBaseUrl()}/functions/v1/ai-chat`;
}

/** Full URL for ai-lesson-plan Edge Function */
export function getAiLessonPlanUrl(): string {
  return `${getBaseUrl()}/functions/v1/ai-lesson-plan`;
}

/** Full URL for ai-exam-gen Edge Function */
export function getAiExamGenUrl(): string {
  return `${getBaseUrl()}/functions/v1/ai-exam-gen`;
}

/** Full URL for ai-summary Edge Function */
export function getAiSummaryUrl(): string {
  return `${getBaseUrl()}/functions/v1/ai-summary`;
}

/** Headers for ai-exam-gen */
export async function getAiExamGenHeaders(): Promise<Record<string, string>> {
  return getEdgeFunctionHeaders();
}
