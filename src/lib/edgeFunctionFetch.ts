/**
 * Sanitize string for use in HTTP headers - prevents "not a valid ByteString" errors.
 * Keeps only printable ASCII (0x20-0x7E) to avoid control chars and invalid Unicode.
 */
const FALLBACK_SUPABASE_URL = "https://iwlpqrulzkzpsiaddefq.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bHBxcnVsemt6cHNpYWRkZWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDUzOTEsImV4cCI6MjA4NjcyMTM5MX0.31uIYLKq8kHZQHJp7M9XDxIvwM8mUHI8w1FqO5J5-48";

function sanitizeHeaderValue(s: string): string {
  return String(s)
    .replace(/[\r\n\t]+/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

/**
 * Returns safe headers for Supabase Edge Function fetch calls.
 * Ensures all header values are valid HTTP tokens to prevent
 * "Headers of RequestInit is not a valid ByteString" errors.
 */
export function getEdgeFunctionHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const raw = key != null && typeof key === "string" ? String(key) : FALLBACK_KEY;
  const authValue = sanitizeHeaderValue(raw);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authValue && authValue.length >= 30) {
    headers.Authorization = `Bearer ${authValue}`;
  }
  return headers;
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
