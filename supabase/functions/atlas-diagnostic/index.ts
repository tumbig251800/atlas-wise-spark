import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Semantic Topic Matching via AI (ข้อกำชับ #1) ───
async function normalizeTopic(
  currentTopic: string,
  historicalTopics: string[],
  apiKey: string
): Promise<string> {
  const trimmed = currentTopic.trim();
  if (!trimmed) return trimmed;

  const uniqueTopics = [...new Set([trimmed, ...historicalTopics.map((t) => t.trim())].filter(Boolean))];
  if (uniqueTopics.length <= 1) return trimmed;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: `จัดกลุ่มหัวข้อการสอนเหล่านี้ว่าเรื่องใดเป็นเรื่องเดียวกัน: ${JSON.stringify(uniqueTopics)}\nสำหรับหัวข้อ "${trimmed}" ให้ตอบชื่อมาตรฐานที่สั้นที่สุด`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "normalize_topic",
              description: "Return the normalized/canonical topic name",
              parameters: {
                type: "object",
                properties: {
                  normalized: { type: "string", description: "ชื่อหัวข้อมาตรฐาน" },
                },
                required: ["normalized"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "normalize_topic" } },
      }),
    });

    if (!response.ok) {
      console.warn("AI topic normalization failed, using fallback:", response.status);
      return trimmed.toLowerCase();
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      return args.normalized || trimmed.toLowerCase();
    }
    return trimmed.toLowerCase();
  } catch (e) {
    console.warn("AI topic normalization error, using fallback:", e);
    return trimmed.toLowerCase();
  }
}

// ─── Classroom Normalization (Excel Auto-format Protection) ───
function normalizeClassroom(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  const thaiMatch = trimmed.match(/^(\d+)-[ก-ฮ]/);
  if (thaiMatch) return thaiMatch[1];
  const engMatch = trimmed.match(/^(\d+)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  if (engMatch) return engMatch[1];
  const classMatch = trimmed.match(/^ป\.\d+\/(\d+)$/);
  if (classMatch) return classMatch[1];
  return trimmed;
}

// ─── Color Logic ───
interface MasteryTrend {
  scores: number[];
  dates: string[];
  sameNormalizedTopic: boolean;
}

function determineColor(
  majorGap: string,
  masteryScore: number,
  trend: MasteryTrend,
  topicChanged: boolean
): { color: string; label: string } {
  if (majorGap === "system-gap") {
    return { color: "blue", label: "System-Gap (External Factor)" };
  }
  if (masteryScore >= 4 && majorGap === "success") {
    return { color: "green", label: "Success" };
  }
  if (topicChanged && trend.scores.length > 0) {
    const prevScore = trend.scores[trend.scores.length - 1];
    if (masteryScore < prevScore) {
      return { color: "yellow", label: "Learning Curve (New Topic)" };
    }
  }
  if (trend.sameNormalizedTopic && trend.scores.length >= 2) {
    const recent = trend.scores.slice(-2);
    const allDropping = recent.every((s, i) => {
      if (i === 0) return true;
      return s <= recent[i - 1];
    });
    if (allDropping && masteryScore < recent[recent.length - 1]) {
      return { color: "red", label: "Critical Regression" };
    }
  }
  if (trend.sameNormalizedTopic && trend.scores.length >= 1 && trend.dates.length >= 1) {
    const latestScore = trend.scores[trend.scores.length - 1];
    if (masteryScore === latestScore) {
      const firstDate = new Date(trend.dates[0]);
      const now = new Date();
      const daysDiff = (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff >= 7) {
        return { color: "orange", label: "Static Performance" };
      }
    }
  }
  if (masteryScore >= 4) return { color: "green", label: "Success" };
  return { color: "orange", label: "Needs Monitoring" };
}

// ─── Priority Array ───
function determinePriority(majorGap: string): { level: number; recommendation: string } {
  switch (majorGap) {
    case "a2-gap":
      return { level: 1, recommendation: "Immediate Referral — ส่งต่อผู้บริหารทันที" };
    case "a-gap":
      return { level: 2, recommendation: "Gamification/Role-play เพื่อดึงความสนใจ" };
    case "k-gap":
      return { level: 3, recommendation: "Re-teach: สอนซ้ำ/สาธิตใหม่" };
    case "p-gap":
      return { level: 3, recommendation: "Drill: ฝึกปฏิบัติซ้ำ" };
    case "system-gap":
      return { level: 4, recommendation: "แยกรายงานเข้า Executive Dashboard" };
    default:
      return { level: 4, recommendation: "บันทึกเข้า Knowledge Library" };
  }
}

// ─── Threshold Calculation ───
function determineInterventionSize(
  remedialCount: number,
  estimatedClassSize: number
): { size: string; pct: number } {
  if (estimatedClassSize <= 0) return { size: "individual", pct: 0 };
  const pct = Math.round((remedialCount / estimatedClassSize) * 100);
  if (pct > 40) return { size: "pivot", pct };
  if (pct > 20) return { size: "small-group", pct };
  return { size: "individual", pct };
}

// ─── Main Handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logId, remedialStatuses } = await req.json() as {
      logId: string;
      remedialStatuses?: { studentId: string; status: "pass" | "stay" }[];
    };

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the current log
    const { data: log, error: logError } = await supabase
      .from("teaching_logs")
      .select("*")
      .eq("id", logId)
      .single();

    if (logError || !log) {
      console.error("Log fetch error:", logError);
      return new Response(JSON.stringify({ error: "Log not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Normalize classroom data (Excel auto-format protection)
    const cleanClassroom = normalizeClassroom(log.classroom || "");

    // 3. Fetch historical logs (same teacher, subject, grade, classroom)
    const { data: historyLogs } = await supabase
      .from("teaching_logs")
      .select("id, topic, mastery_score, teaching_date, major_gap, classroom")
      .eq("teacher_id", log.teacher_id)
      .eq("subject", log.subject)
      .eq("grade_level", log.grade_level)
      .neq("id", logId)
      .order("teaching_date", { ascending: false })
      .limit(20);

    const matchedHistoryLogs = (historyLogs || []).filter(
      (h: any) => normalizeClassroom(h.classroom || "") === cleanClassroom
    );

    // 3. Deterministic Topic Normalization (v1.4 - Lookup Table + Fuzzy Match)
    const currentTopic = log.topic || "";
    const normResult: NormalizationResult = await normalizeTopic(
      currentTopic,
      log.subject,
      supabase,
      log.grade_level
    );
    const normalizedTopic = normResult.canonical;

    // Build trend for same normalized topic
    const sameTopicLogs = matchedHistoryLogs.filter((h: any) => {
      const ht = (h.topic || "").trim().toLowerCase();
      return ht === normalizedTopic || ht === currentTopic.trim().toLowerCase();
    });

    const trend: MasteryTrend = {
      scores: sameTopicLogs.map((h: any) => h.mastery_score).reverse(),
      dates: sameTopicLogs.map((h: any) => h.teaching_date).reverse(),
      sameNormalizedTopic: sameTopicLogs.length > 0,
    };

    const topicChanged = sameTopicLogs.length === 0 && matchedHistoryLogs.length > 0;

    // 4. Priority Array
    const priority = determinePriority(log.major_gap);

    // 5. Color Logic
    const { color, label } = determineColor(
      log.major_gap,
      log.mastery_score,
      trend,
      topicChanged
    );

    const finalColor = log.major_gap === "a2-gap" ? "red" : color;
    const finalLabel = log.major_gap === "a2-gap" ? "Immediate Referral" : label;

    // 6. Threshold Calculation
    const remedialIds = (log.remedial_ids || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    const classSize = log.total_students && log.total_students > 0 ? log.total_students : 30;
    const { size: interventionSize, pct: thresholdPct } = determineInterventionSize(
      remedialIds.length,
      classSize
    );

    // ═══════════════════════════════════════════════════════════════
    // v1.3 STRICT MODE: Compute gapRate + call RPC BEFORE inserting
    // ═══════════════════════════════════════════════════════════════

    // 7. Class Strike via transaction-safe RPC
    const classId = `${log.grade_level}/${cleanClassroom}`;
    const gapRate = classSize > 0 ? (remedialIds.length / classSize) * 100 : 0;

    let classStrikeResult: any = null;
    try {
      const { data, error: rpcError } = await supabase.rpc("update_class_strike", {
        p_teacher_id: log.teacher_id,
        p_scope_id: classId,
        p_normalized_topic: normalizedTopic,
        p_subject: log.subject,
        p_gap_type: log.major_gap,
        p_topic: currentTopic,
        p_session_id: logId,
        p_gap_rate: gapRate,
        p_is_system_gap: log.major_gap === "system-gap",
        p_is_a2_gap: log.major_gap === "a2-gap",
      });
      if (rpcError) console.error("Class strike RPC error:", rpcError);
      classStrikeResult = data;
    } catch (rpcErr) {
      console.error("Class strike RPC exception:", rpcErr);
    }

    // 8. Build decisionObject with audit fields (v1.4)
    const classStrikeAction = classStrikeResult?.action || "unknown";
    const decisionObject = {
      engine_version: "v1.4",
      computed_at: new Date().toISOString(),
      teaching_log_id: logId,
      class_id: classId,
      subject: log.subject,
      normalized_topic: normalizedTopic,
      original_topic: normResult.originalInput,
      normalization_method: normResult.method,
      normalization_confidence: normResult.confidence,
      gap_rate: gapRate,
      class_strike_count: classStrikeResult?.strike_count ?? 0,
      intervention_size: classStrikeAction === "force_pivot" ? "force-pivot"
        : classStrikeAction === "plan_fail" ? "plan-fail"
        : interventionSize,
      signal_color: classStrikeAction === "force_pivot" ? "red"
        : classStrikeAction === "plan_fail" ? "orange"
        : null,
      pivot_triggered: classStrikeAction === "force_pivot",
      pivot_event_id: classStrikeResult?.pivot_event_id || null,
      reason_codes: classStrikeAction === "force_pivot" ? ["FORCE_CLASS_PIVOT"] : [],
      evidence_refs: classStrikeResult?.evidence_refs || [],
    };

    // 9. Common fields for diagnostic_events rows
    const commonDiagFields = {
      teaching_log_id: logId,
      teacher_id: log.teacher_id,
      subject: log.subject,
      topic: currentTopic,
      normalized_topic: normalizedTopic,
      grade_level: log.grade_level,
      classroom: cleanClassroom,
      status_color: finalColor,
      status_label: finalLabel,
      gap_type: log.major_gap,
      priority_level: priority.level,
      intervention_size: interventionSize,
      threshold_pct: thresholdPct,
    };

    // 10. HARD RULE A: Upsert ONE canonical session row (student_id = NULL) with decision_object
    const { data: existingSession } = await supabase
      .from("diagnostic_events")
      .select("id")
      .eq("teaching_log_id", logId)
      .is("student_id", null)
      .maybeSingle();

    if (existingSession) {
      // Idempotent UPDATE
      const { error: updErr } = await supabase
        .from("diagnostic_events")
        .update({ ...commonDiagFields, intervention_size: decisionObject.intervention_size, decision_object: decisionObject })
        .eq("id", existingSession.id);
      if (updErr) console.error("Canonical session UPDATE error:", updErr);
    } else {
      // INSERT new session row
      const { error: insErr } = await supabase
        .from("diagnostic_events")
        .insert({ ...commonDiagFields, student_id: null, intervention_size: decisionObject.intervention_size, decision_object: decisionObject });
      if (insErr) console.error("Canonical session INSERT error:", insErr);
    }

    // 11. Insert per-student rows WITHOUT decision_object
    if (remedialIds.length > 0) {
      // Check if per-student rows already exist (idempotency for retries)
      const { data: existingStudentRows } = await supabase
        .from("diagnostic_events")
        .select("student_id")
        .eq("teaching_log_id", logId)
        .not("student_id", "is", null);

      const existingStudentIds = new Set((existingStudentRows || []).map((r: any) => r.student_id));
      const newStudentIds = remedialIds.filter((sid: string) => !existingStudentIds.has(sid));

      if (newStudentIds.length > 0) {
        const studentInserts = newStudentIds.map((studentId: string) => ({
          ...commonDiagFields,
          student_id: studentId,
          // NO decision_object here — HARD RULE A
        }));
        const { error: diagError } = await supabase
          .from("diagnostic_events")
          .insert(studentInserts);
        if (diagError) console.error("Diagnostic student insert error:", diagError);
      }
    }

    // 12. Remedial Tracking + Strike Management (ข้อกำชับ #3)
    const strikeGaps = ["k-gap", "p-gap", "a-gap"];
    const shouldTrackStrikes = strikeGaps.includes(log.major_gap);

    if (remedialStatuses && remedialStatuses.length > 0) {
      const remedialInserts = remedialStatuses.map((rs) => ({
        teacher_id: log.teacher_id,
        teaching_log_id: logId,
        student_id: rs.studentId,
        topic: currentTopic,
        normalized_topic: normalizedTopic,
        subject: log.subject,
        grade_level: log.grade_level,
        classroom: cleanClassroom,
        remedial_status: rs.status,
      }));

      const { error: remError } = await supabase
        .from("remedial_tracking")
        .insert(remedialInserts);

      if (remError) console.error("Remedial tracking insert error:", remError);

      for (const rs of remedialStatuses) {
        if (rs.status === "pass") {
          const { error: resetErr } = await supabase
            .from("strike_counter")
            .update({ strike_count: 0, status: "resolved", last_updated: new Date().toISOString() })
            .eq("teacher_id", log.teacher_id)
            .eq("scope", "student")
            .eq("scope_id", rs.studentId)
            .eq("normalized_topic", normalizedTopic)
            .eq("status", "active");

          if (resetErr) console.error("Strike reset error:", resetErr);
        } else if (rs.status === "stay" && shouldTrackStrikes) {
          await upsertStrike(supabase, {
            teacher_id: log.teacher_id,
            scope: "student",
            scope_id: rs.studentId,
            topic: currentTopic,
            normalized_topic: normalizedTopic,
            subject: log.subject,
            gap_type: log.major_gap,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        diagnostic: {
          color: finalColor,
          label: finalLabel,
          priority: priority.level,
          recommendation: priority.recommendation,
          interventionSize,
          thresholdPct,
          normalizedTopic,
          normalizationMethod: normResult.method,
          normalizationConfidence: normResult.confidence,
        },
        classStrike: decisionObject,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("atlas-diagnostic error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Upsert Strike Counter ───
async function upsertStrike(
  supabase: any,
  params: {
    teacher_id: string;
    scope: string;
    scope_id: string;
    topic: string;
    normalized_topic: string;
    subject: string;
    gap_type: string;
  }
) {
  const { data: existing } = await supabase
    .from("strike_counter")
    .select("id, strike_count")
    .eq("teacher_id", params.teacher_id)
    .eq("scope", params.scope)
    .eq("scope_id", params.scope_id)
    .eq("normalized_topic", params.normalized_topic)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const newCount = Math.min((existing.strike_count || 0) + 1, 3);
    const newStatus = newCount >= 3 ? "referred" : "active";
    await supabase
      .from("strike_counter")
      .update({
        strike_count: newCount,
        status: newStatus,
        last_updated: new Date().toISOString(),
        gap_type: params.gap_type,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("strike_counter").insert({
      teacher_id: params.teacher_id,
      scope: params.scope,
      scope_id: params.scope_id,
      topic: params.topic,
      normalized_topic: params.normalized_topic,
      subject: params.subject,
      gap_type: params.gap_type,
      strike_count: 1,
      first_strike_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      status: "active",
    });
  }
}
