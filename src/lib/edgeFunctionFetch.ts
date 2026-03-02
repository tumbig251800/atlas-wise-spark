/**
 * Sanitize string for use in HTTP headers - prevents "not a valid ByteString" errors.
 * Keeps only printable ASCII (0x20-0x7E) to avoid control chars and invalid Unicode.
 */
// atlas_prod project (ebyelctqcdhjmqujeskx) — single source of truth for all Supabase calls
const FALLBACK_SUPABASE_URL = "https://ebyelctqcdhjmqujeskx.supabase.co";
const SUPABASE_ANON_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";

/**
 * Returns safe headers for Supabase Edge Function fetch calls.
 * Always uses the hardcoded Supabase anon JWT (same as client.ts) to avoid
 * "Headers of RequestInit is not a valid ByteString" errors caused by
 * non-JWT keys (e.g. Lovable publishable keys) in VITE_SUPABASE_PUBLISHABLE_KEY.
 */
export function getEdgeFunctionHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_JWT}`,
  };
}

/** Sanitize and validate URL - prevents "not a valid ByteString" errors */
function sanitizeAndValidateUrl(raw: string): string {
  if (!raw || raw === "undefined") return "";
  let s = String(raw).replace(/[\r\n\t]+/g, "").replace(/\s+/g, "").trim();
  if (!s || !s.startsWith("http")) return "";
  try {
    new URL(s);
    return s;
  } catch {
    return "";
  }
}

/** Base URL for Edge Functions - must be valid absolute URL */
function getBaseUrl(): string {
  const v = import.meta.env.VITE_SUPABASE_URL;
  return sanitizeAndValidateUrl(v ?? "") || FALLBACK_SUPABASE_URL;
}

/** Base URL for Edge Functions */
export function getEdgeFunctionsBaseUrl(): string {
  return getBaseUrl();
}

/** Full URL for ai-chat Edge Function - returns empty if not configured */
export function getAiChatUrl(): string {
  const base = getBaseUrl();
  return base ? `${base}/functions/v1/ai-chat` : "";
}

/** Full URL for ai-lesson-plan Edge Function */
export function getAiLessonPlanUrl(): string {
  const base = getBaseUrl();
  return base ? `${base}/functions/v1/ai-lesson-plan` : "";
}

/** Full URL for ai-exam-gen Edge Function (same project as all other functions) */
export function getAiExamGenUrl(): string {
  return `${getBaseUrl()}/functions/v1/ai-exam-gen`;
}

/** Headers for ai-exam-gen — same project, use shared headers */
export function getAiExamGenHeaders(): Record<string, string> {
  return getEdgeFunctionHeaders();
}
