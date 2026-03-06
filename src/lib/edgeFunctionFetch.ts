/**
 * Sanitize string for use in HTTP headers - prevents "not a valid ByteString" errors.
 * Keeps only printable ASCII (0x20-0x7E) to avoid control chars and invalid Unicode.
 */
// Edge Functions — unified at atlas_prod (ebyelctqcdhjmqujeskx)
const ATLAS_PROD_URL = "https://ebyelctqcdhjmqujeskx.supabase.co";
const ATLAS_ANON_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";

/** Strip non-ASCII and control chars — Fetch API requires valid ByteString for header values */
function toByteString(s: string): string {
  return String(s).replace(/[^\x20-\x7E]/g, "");
}

/**
 * Returns safe headers for Supabase Edge Function fetch calls (atlas_prod).
 */
export function getEdgeFunctionHeaders(): Record<string, string> {
  const auth = toByteString(ATLAS_ANON_JWT);
  return {
    "Content-Type": toByteString("application/json"),
    Authorization: toByteString(`Bearer ${auth}`),
  };
}

/** Base URL for Edge Functions — atlas_prod (unified) */
function getBaseUrl(): string {
  return ATLAS_PROD_URL;
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

/** Headers for ai-exam-gen */
export function getAiExamGenHeaders(): Record<string, string> {
  return getEdgeFunctionHeaders();
}
