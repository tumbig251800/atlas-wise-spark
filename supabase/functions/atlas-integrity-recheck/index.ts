import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAtlasUser } from "../_shared/atlasAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_TERM = "2569-1";

type SupabaseClient = ReturnType<typeof createClient>;

interface RecheckBody {
  teacher_id?: string;
  subject?: string;
  classroom?: string;
  grade_level?: string;
  academic_term?: string;
}

interface TeachingLogRow {
  mastery_score: number | null;
  major_gap: string | null;
  health_care_status: boolean | null;
  health_care_ids: string | null;
  remedial_ids: string | null;
}

// An id-list field counts as "empty" when unset/blank or one of the sentinels.
function isEmptyIds(v: string | null): boolean {
  if (v == null) return true;
  const t = v.trim();
  return t === "" || t === "null" || t === "[]" || t === "[None]";
}

// Replicates the n8n FLAG CASE precedence exactly, server-side, per log row.
function detectFlag(row: TeachingLogRow): string | null {
  const gap = row.major_gap;
  const mastery = row.mastery_score;
  const gapNorm = (gap ?? "").trim();

  if (gap === "a2-gap") return "FLAG5";
  if (mastery == null || mastery < 1 || mastery > 5) return "FLAG6";
  if (row.health_care_status === true && isEmptyIds(row.health_care_ids)) return "FLAG1";
  if (mastery >= 4 && (gapNorm === "" ? "-" : gapNorm) !== "success") return "FLAG2";
  if (mastery <= 3 && (gapNorm === "" || gap === "success")) return "FLAG3";
  if (gap === "a-gap" && isEmptyIds(row.remedial_ids)) return "FLAG4";
  return null;
}

// Split a detail string into per-FLAG segments so we can drop resolved ones
// while preserving the original Thai descriptions.
function extractFlagSegments(detail: string): { code: string; text: string }[] {
  const matches = [...detail.matchAll(/FLAG\d+/g)];
  const segs: { code: string; text: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? detail.length) : detail.length;
    const text = detail.slice(start, end).trim().replace(/[;,\s]+$/, "");
    segs.push({ code: matches[i][0], text });
  }
  return segs;
}

async function fetchActiveFlags(
  supabase: SupabaseClient,
  body: Required<Pick<RecheckBody, "teacher_id" | "subject" | "classroom" | "grade_level">>,
  academicTerm: string,
): Promise<Set<string>> {
  let query = supabase
    .from("teaching_logs")
    .select("mastery_score, major_gap, health_care_status, health_care_ids, remedial_ids, teaching_date, academic_term")
    .eq("teacher_id", body.teacher_id)
    .eq("subject", body.subject)
    .eq("classroom", body.classroom)
    .eq("grade_level", body.grade_level);

  // teaching_date >= today - 7 days
  const since = new Date();
  since.setDate(since.getDate() - 7);
  query = query.gte("teaching_date", since.toISOString().slice(0, 10));

  // COALESCE(academic_term, '2569-1') = $academic_term
  if (academicTerm === DEFAULT_TERM) {
    query = query.or(`academic_term.eq.${DEFAULT_TERM},academic_term.is.null`);
  } else {
    query = query.eq("academic_term", academicTerm);
  }

  const { data, error } = await query;
  if (error) throw error;

  const active = new Set<string>();
  for (const row of (data ?? []) as TeachingLogRow[]) {
    const flag = detectFlag(row);
    if (flag) active.add(flag);
  }
  return active;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    return new Response(
      JSON.stringify({ status: "ok", function: "atlas-integrity-recheck", ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: accept the internal service-role bearer (cron/internal), otherwise
    // require a valid user JWT.
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();
    const isInternal = bearer.length > 0 && bearer === SUPABASE_SERVICE_ROLE_KEY;

    if (!isInternal) {
      const auth = await requireAtlasUser(req);
      if (!auth.ok) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const raw = (await req.json().catch(() => ({}))) as RecheckBody;
    const teacher_id = raw.teacher_id?.trim();
    const subject = raw.subject?.trim();
    const classroom = raw.classroom?.trim();
    const grade_level = raw.grade_level?.trim();
    const academic_term = raw.academic_term?.trim() || DEFAULT_TERM;

    if (!teacher_id || !subject || !classroom || !grade_level) {
      return new Response(
        JSON.stringify({ error: "teacher_id, subject, classroom, grade_level are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1-2. Which FLAGs are still present after the teacher's fix.
    const activeFlags = await fetchActiveFlags(
      supabase,
      { teacher_id, subject, classroom, grade_level },
      academic_term,
    );

    // 3. Open/watching IntegrityFlag items for this teacher×subject×classroom.
    const { data: items, error: itemsErr } = await supabase
      .from("action_plan_items")
      .select("id, issue_key, detail, status")
      .eq("issue_type", "IntegrityFlag")
      .eq("teacher_id", teacher_id)
      .eq("subject", subject)
      .eq("classroom", classroom)
      .in("status", ["open", "watching"]);
    if (itemsErr) throw itemsErr;

    const nowIso = new Date().toISOString();
    let resolved_count = 0;
    let remaining_count = 0;
    const resolved_items: string[] = [];

    // 4. Resolve items whose flags are all gone; trim those partially resolved.
    for (const item of items ?? []) {
      const detail = (item.detail as string | null) ?? "";
      const segments = extractFlagSegments(detail);
      const itemCodes = [...new Set(segments.map((s) => s.code))];

      // No parseable flag code → can't verify; leave it untouched.
      if (itemCodes.length === 0) {
        remaining_count++;
        continue;
      }

      const remaining = itemCodes.filter((c) => activeFlags.has(c));

      if (remaining.length === 0) {
        const { error } = await supabase
          .from("action_plan_items")
          .update({
            status: "resolved",
            auto_resolved: true,
            resolved_at: nowIso,
            resolution_note: "ตรวจสอบซ้ำแล้ว — ข้อมูลถูกต้อง",
            updated_at: nowIso,
          })
          .eq("id", item.id)
          .in("status", ["open", "watching"]);
        if (error) throw error;
        resolved_count++;
        resolved_items.push(item.issue_key as string);
      } else {
        remaining_count++;
        // Partially resolved → keep only the remaining flag segments in detail.
        if (remaining.length < itemCodes.length) {
          const newDetail = segments
            .filter((s) => activeFlags.has(s.code))
            .map((s) => s.text)
            .join("; ");
          await supabase
            .from("action_plan_items")
            .update({ detail: newDetail, updated_at: nowIso })
            .eq("id", item.id)
            .in("status", ["open", "watching"]);
        }
      }
    }

    return new Response(
      JSON.stringify({
        resolved_count,
        remaining_count,
        resolved_items,
        active_flags: [...activeFlags],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("atlas-integrity-recheck error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
