import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// atlas_prod project (ebyelctqcdhjmqujeskx) — primary project with full access
const SUPABASE_URL = "https://ebyelctqcdhjmqujeskx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";

// Remove stale session from old project to prevent JWT mismatch
const OLD_SESSION_KEY = "sb-iwlpqrulzkzpsiaddefq-auth-token";
if (typeof localStorage !== "undefined" && localStorage.getItem(OLD_SESSION_KEY)) {
  localStorage.removeItem(OLD_SESSION_KEY);
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
