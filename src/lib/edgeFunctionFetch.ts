/**
 * Sanitize string for use in HTTP headers - prevents "not a valid ByteString" errors.
 * Keeps only printable ASCII (0x20-0x7E) to avoid control chars and invalid Unicode.
 */
// Edge Functions are auto-deployed to Lovable Cloud (iwlpqrulzkzpsiaddefq)
// Database lives on atlas_prod (ebyelctqcdhjmqujeskx) — but edge functions run here
const LOVABLE_CLOUD_URL = "https://iwlpqrulzkzpsiaddefq.supabase.co";
const SUPABASE_ANON_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bHBxcnVsemt6cHNpYWRkZWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDUzOTEsImV4cCI6MjA4NjcyMTM5MX0.31uIYLKq8kHZQHJp7M9XDxIvwM8mUHI8w1FqO5J5-48";

/** Strip non-ASCII and control chars — Fetch API requires valid ByteString for header values */
function toByteString(s: string): string {
  return String(s).replace(/[^\x20-\x7E]/g, "");
}

/**
 * Returns safe headers for Supabase Edge Function fetch calls.
 * All values are sanitized to valid ByteString to prevent "Headers of RequestInit
 * is not a valid ByteString" errors (e.g. from Lovable publishable keys or env).
 */
export function getEdgeFunctionHeaders(): Record<string, string> {
  const auth = toByteString(SUPABASE_ANON_JWT);
  return {
    "Content-Type": toByteString("application/json"),
    Authorization: toByteString(`Bearer ${auth}`),
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

/** Base URL for Edge Functions — use Lovable Cloud where functions auto-deploy */
function getBaseUrl(): string {
  return LOVABLE_CLOUD_URL;
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
