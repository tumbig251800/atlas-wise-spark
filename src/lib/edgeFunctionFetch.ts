/**
 * Sanitize string for use in HTTP headers - prevents "not a valid ByteString" errors.
 * Keeps only printable ASCII (0x20-0x7E) to avoid control chars and invalid Unicode.
 */
const FALLBACK_SUPABASE_URL = "https://iwlpqrulzkzpsiaddefq.supabase.co";
// Supabase anon JWT for project iwlpqrulzkzpsiaddefq — used for Edge Function Authorization header
const SUPABASE_ANON_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bHBxcnVsemt6cHNpYWRkZWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDUzOTEsImV4cCI6MjA4NjcyMTM5MX0.31uIYLKq8kHZQHJp7M9XDxIvwM8mUHI8w1FqO5J5-48";

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
