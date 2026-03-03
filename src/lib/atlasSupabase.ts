/**
 * Supabase client for atlas_prod (ebyelctqcdhjmqujeskx).
 * This file is NOT managed by Lovable Cloud — credentials are hardcoded
 * to prevent overwrite when deploying via Lovable.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ATLAS_URL = "https://ebyelctqcdhjmqujeskx.supabase.co";
const ATLAS_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";

// Remove stale session from old Lovable project to prevent JWT mismatch
const OLD_SESSION_KEY = "sb-iwlpqrulzkzpsiaddefq-auth-token";
if (typeof localStorage !== "undefined" && localStorage.getItem(OLD_SESSION_KEY)) {
  localStorage.removeItem(OLD_SESSION_KEY);
}

export const supabase = createClient<Database>(ATLAS_URL, ATLAS_ANON_KEY);
