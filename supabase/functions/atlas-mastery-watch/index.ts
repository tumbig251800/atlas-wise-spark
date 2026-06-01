import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAtlasUser } from "../_shared/atlasAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Tunables ───────────────────────────────────────────────────────────────
// delta = avg(latest 3 periods) - avg(3 periods before that)
const ACTION_THRESHOLD = -1.0; // delta <= this → straight to Action (status 'open')
const WATCH_THRESHOLD = -0.5; // delta <= this (but > ACTION) → Watch (status 'watching')

const BASE_METRIC_LABEL = "Mastery ลดลง (เฉลี่ย 3 คาบ)";
const ESCALATE_SUFFIX = "ตกต่อเนื่อง — เข้านิเทศ";
const RESOLVE_SUFFIX = "คะแนนฟื้นตัว — ปิดอัตโนมัติ";

type SupabaseClient = ReturnType<typeof createClient>;

interface RollingResult {
  recentAvg: number;
  previousAvg: number;
  delta: number;
  latestDate: string; // teaching_date of the most recent log (YYYY-MM-DD)
  teacherName: string | null;
  gradeLevel: string | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function avg(scores: number[]): number {
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}

function issueKeyFor(teacherId: string, subject: string, classroom: string): string {
  return `MasteryDrop:${teacherId}:${subject}:${classroom}`;
}

// ─── Rolling-average computation (latest 3 vs previous 3) ─────────────────────
async function computeRollingAverages(
  supabase: SupabaseClient,
  teacherId: string,
  subject: string,
  classroom: string,
): Promise<RollingResult | null> {
  const { data: logs, error } = await supabase
    .from("teaching_logs")
    .select("mastery_score, teaching_date, teacher_name, grade_level")
    .eq("teacher_id", teacherId)
    .eq("subject", subject)
    .eq("classroom", classroom)
    .order("teaching_date", { ascending: false })
    .limit(6);

  if (error) {
    console.error("computeRollingAverages fetch error:", error);
    return null;
  }
  // Need a full window: recent_3 (records 1-3) + previous_3 (records 4-6).
  if (!logs || logs.length < 6) return null;

  const recent3 = logs.slice(0, 3).map((l: { mastery_score: number }) => l.mastery_score);
  const previous3 = logs.slice(3, 6).map((l: { mastery_score: number }) => l.mastery_score);

  const recentAvg = round2(avg(recent3));
  const previousAvg = round2(avg(previous3));
  const delta = round2(recentAvg - previousAvg);

  return {
    recentAvg,
    previousAvg,
    delta,
    latestDate: logs[0].teaching_date as string,
    teacherName: (logs[0].teacher_name as string | null) ?? null,
    gradeLevel: (logs[0].grade_level as string | null) ?? null,
  };
}

// ─── STEP 3: Detection for a single teacher × subject × classroom combo ───────
async function runDetection(
  supabase: SupabaseClient,
  teacherId: string,
  subject: string,
  classroom: string,
): Promise<{ action: string; delta?: number }> {
  const roll = await computeRollingAverages(supabase, teacherId, subject, classroom);
  if (!roll) return { action: "skipped:insufficient-history" };

  const { delta, recentAvg, previousAvg } = roll;

  // Normal fluctuation — never create or update.
  if (delta > WATCH_THRESHOLD) return { action: "skipped:normal", delta };

  const issueKey = issueKeyFor(teacherId, subject, classroom);
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  // Dedup: an item with the same issue_key already exists?
  const { data: existing } = await supabase
    .from("action_plan_items")
    .select("id, status, watch_started_at")
    .eq("issue_key", issueKey)
    .maybeSingle();

  const goesToAction = delta <= ACTION_THRESHOLD;
  // Don't downgrade an existing Action item back to Watch.
  const existingStatus = existing?.status as string | undefined;
  const status = goesToAction || existingStatus === "open" ? "open" : "watching";

  const common = {
    issue_type: "MasteryDrop",
    severity: goesToAction ? "high" : "medium",
    grade_level: roll.gradeLevel,
    classroom,
    subject,
    teacher_id: teacherId,
    teacher_name: roll.teacherName,
    metric_label: BASE_METRIC_LABEL,
    metric_value: delta,
    mastery_avg_recent: recentAvg,
    mastery_avg_previous: previousAvg,
    run_date: today,
    updated_at: nowIso,
  };

  if (existing) {
    // Preserve the original watch start time if it was already watching.
    const watchStartedAt =
      status === "watching"
        ? ((existing.watch_started_at as string | null) ?? nowIso)
        : null;
    const { error: updErr } = await supabase
      .from("action_plan_items")
      .update({ ...common, status, watch_started_at: watchStartedAt })
      .eq("id", existing.id);
    if (updErr) {
      console.error("Detection update error:", updErr);
      return { action: "error:update", delta };
    }
    return { action: `updated:${status}`, delta };
  }

  const { error: insErr } = await supabase.from("action_plan_items").insert({
    ...common,
    issue_key: issueKey,
    status,
    watch_started_at: status === "watching" ? nowIso : null,
  });
  if (insErr) {
    console.error("Detection insert error:", insErr);
    return { action: "error:insert", delta };
  }
  return { action: `created:${status}`, delta };
}

// ─── STEP 4: Re-evaluate every 'watching' item ───────────────────────────────
async function runWatchReevaluation(
  supabase: SupabaseClient,
): Promise<{ escalated: number; resolved: number; held: number; skipped: number }> {
  const { data: watching, error } = await supabase
    .from("action_plan_items")
    .select("id, teacher_id, subject, classroom, watch_started_at")
    .eq("status", "watching");

  if (error) {
    console.error("Watch reevaluation fetch error:", error);
    return { escalated: 0, resolved: 0, held: 0, skipped: 0 };
  }

  let escalated = 0;
  let resolved = 0;
  let held = 0;
  let skipped = 0;

  for (const item of watching ?? []) {
    const teacherId = item.teacher_id as string | null;
    const subject = item.subject as string | null;
    const classroom = item.classroom as string | null;
    const nowIso = new Date().toISOString();

    if (!teacherId || !subject || !classroom) {
      skipped++;
      continue;
    }

    const roll = await computeRollingAverages(supabase, teacherId, subject, classroom);
    if (!roll) {
      // Can't re-evaluate yet — just stamp the check time.
      await supabase
        .from("action_plan_items")
        .update({ watch_checked_at: nowIso, updated_at: nowIso })
        .eq("id", item.id);
      skipped++;
      continue;
    }

    // Only escalate/resolve when NEW evidence has arrived since watching began;
    // otherwise the item would flip on the very cycle it was created.
    const watchStartedDate = ((item.watch_started_at as string | null) ?? "").slice(0, 10);
    const hasNewData = !watchStartedDate || roll.latestDate > watchStartedDate;

    const refreshed = {
      mastery_avg_recent: roll.recentAvg,
      mastery_avg_previous: roll.previousAvg,
      metric_value: roll.delta,
      watch_checked_at: nowIso,
      updated_at: nowIso,
    };

    if (!hasNewData) {
      await supabase.from("action_plan_items").update(refreshed).eq("id", item.id);
      held++;
      continue;
    }

    if (roll.delta <= WATCH_THRESHOLD) {
      // Still dropping → escalate to Action.
      await supabase
        .from("action_plan_items")
        .update({
          ...refreshed,
          status: "open",
          severity: "high",
          metric_label: `${BASE_METRIC_LABEL} — ${ESCALATE_SUFFIX}`,
          watch_started_at: null,
        })
        .eq("id", item.id);
      escalated++;
    } else if (roll.delta > 0) {
      // Recovered → auto-resolve.
      await supabase
        .from("action_plan_items")
        .update({
          ...refreshed,
          status: "resolved",
          auto_resolved: true,
          resolved_at: nowIso,
          resolution_note: RESOLVE_SUFFIX,
          metric_label: `${BASE_METRIC_LABEL} — ${RESOLVE_SUFFIX}`,
          watch_started_at: null,
        })
        .eq("id", item.id);
      resolved++;
    } else {
      // Between WATCH_THRESHOLD and 0 → keep watching, refresh figures only.
      await supabase.from("action_plan_items").update(refreshed).eq("id", item.id);
      held++;
    }
  }

  return { escalated, resolved, held, skipped };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith("/health") || url.pathname === "/health")) {
    return new Response(
      JSON.stringify({ status: "ok", function: "atlas-mastery-watch", ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const auth = await requireAtlasUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      mode?: "detect" | "reevaluate" | "both";
      teacherId?: string;
      subject?: string;
      classroom?: string;
    };
    const mode = body.mode ?? "both";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Re-evaluate pre-existing watching items FIRST so that any item created by
    // detection in this same call is not immediately re-processed.
    let reevaluation = null;
    if (mode === "reevaluate" || mode === "both") {
      reevaluation = await runWatchReevaluation(supabase);
    }

    let detection = null;
    if (mode === "detect" || mode === "both") {
      if (body.teacherId && body.subject && body.classroom) {
        detection = await runDetection(supabase, body.teacherId, body.subject, body.classroom);
      } else {
        detection = { action: "skipped:no-combo" };
      }
    }

    return new Response(
      JSON.stringify({ success: true, mode, detection, reevaluation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("atlas-mastery-watch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
