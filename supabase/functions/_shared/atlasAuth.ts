import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function bearerTokenFrom(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const v = h.trim();
  if (!v) return null;
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

export type AtlasAuthResult =
  | { ok: true; token: string; userId: string; email?: string | null }
  | { ok: false; status: number; error: string };

export async function requireAtlasUser(req: Request): Promise<AtlasAuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, error: "SUPABASE_URL / SUPABASE_ANON_KEY is not configured" };
  }

  const token = bearerTokenFrom(req);
  if (!token) return { ok: false, status: 401, error: "Missing Authorization" };

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { ok: false, status: 401, error: "Invalid JWT" };
  }

  return { ok: true, token, userId: data.user.id, email: data.user.email ?? null };
}