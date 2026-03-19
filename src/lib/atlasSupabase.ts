/**
 * Supabase client for atlas_prod (ebyelctqcdhjmqujeskx).
 * This file is NOT managed by Lovable Cloud — credentials are hardcoded
 * to prevent overwrite when deploying via Lovable.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_URL = "https://ebyelctqcdhjmqujeskx.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";

const ATLAS_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const ATLAS_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  FALLBACK_ANON_KEY;

export const ATLAS_AUTH_STORAGE_KEY = "atlas_prod_auth";

export { ATLAS_URL, ATLAS_ANON_KEY };

export const supabase = createClient<Database>(ATLAS_URL, ATLAS_ANON_KEY, {
  auth: {
    storageKey: ATLAS_AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
