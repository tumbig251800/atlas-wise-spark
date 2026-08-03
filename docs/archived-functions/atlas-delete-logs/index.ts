/**
 * atlas-delete-logs — ลบ teaching_logs ผ่าน service role (bypass RLS)
 * ใช้เมื่อลบจากแอปไม่ได้เนื่องจาก RLS
 * อนุญาตเฉพาะ director เท่านั้น
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith("/health") || url.pathname === "/health")) {
    return new Response(
      JSON.stringify({ status: "ok", function: "atlas-delete-logs", ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "ไม่มี Authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server config missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user with anon client (uses JWT)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "ไม่พบผู้ใช้" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check director role
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = roleData?.role;
    if (role !== "director") {
      return new Response(
        JSON.stringify({ error: "เฉพาะ director เท่านั้นที่ลบได้" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { subject, ids } = body as { subject?: string; ids?: string[] };

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let targetIds: string[];
    if (ids && Array.isArray(ids) && ids.length > 0) {
      targetIds = ids;
    } else if (subject && typeof subject === "string") {
      const { data: rows, error } = await adminClient
        .from("teaching_logs")
        .select("id")
        .eq("subject", subject.trim());
      if (error) throw error;
      targetIds = (rows ?? []).map((r) => r.id);
    } else {
      return new Response(
        JSON.stringify({ error: "ต้องระบุ subject หรือ ids ใน body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ deleted: 0, message: "ไม่มีข้อมูลให้ลบ" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cascade delete order
    await adminClient.from("pivot_events").delete().in("trigger_session_id", targetIds);
    await adminClient.from("diagnostic_events").delete().in("teaching_log_id", targetIds);
    await adminClient.from("remedial_tracking").delete().in("teaching_log_id", targetIds);

    await adminClient.from("strike_counter").delete().in("last_session_id", targetIds);

    const { data: deleted, error: delErr } = await adminClient
      .from("teaching_logs")
      .delete()
      .in("id", targetIds)
      .select("id");

    if (delErr) throw delErr;

    return new Response(
      JSON.stringify({ deleted: (deleted ?? []).length, ids: deleted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("atlas-delete-logs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
