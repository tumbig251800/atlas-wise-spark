/**
 * Returns safe headers for Supabase Edge Function fetch calls.
 * Ensures all header values are valid ByteStrings to prevent
 * "Headers of RequestInit is not a valid ByteString" errors.
 */
export function getEdgeFunctionHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const authValue =
    key != null && typeof key === "string" ? String(key).trim() : "";
  return {
    "Content-Type": "application/json",
    Authorization: authValue ? `Bearer ${authValue}` : "",
  };
}

/** Base URL for Edge Functions - must be valid absolute URL */
function getBaseUrl(): string {
  const v = import.meta.env.VITE_SUPABASE_URL;
  const s = v != null && typeof v === "string" ? String(v).trim() : "";
  if (!s || s === "undefined" || !s.startsWith("http")) return "";
  return s;
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
