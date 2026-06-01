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

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Fetch open action items
    const { data: actionItems, error: itemsError } = await supabaseClient
      .from("action_plan_items")
      .select("id, teacher_id, subject, grade_level, detail, severity, issue_type, metric_label, metric_value")
      .in("status", ["open", "watching"])
      .order("severity", { ascending: true }); // critical first

    if (itemsError) throw itemsError;

    if (!actionItems || actionItems.length === 0) {
      return new Response(
        JSON.stringify({ plans: [], message: "ไม่มี open items ในระบบ" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fetch teacher names
    const teacherIds = [...new Set(actionItems.map((i) => i.teacher_id).filter(Boolean))];
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", teacherIds);

    if (profilesError) throw profilesError;

    const teacherMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.full_name])
    );

    // Step 3: Build context summary
    const itemsSummary = actionItems.map((item) => {
      const teacherName = teacherMap.get(item.teacher_id) ?? "ไม่ระบุ";
      return {
        id: item.id,
        teacher_id: item.teacher_id,
        teacher_name: teacherName,
        subject: item.subject ?? "ไม่ระบุ",
        grade_level: item.grade_level ?? "ไม่ระบุ",
        issue_type: item.issue_type ?? "ไม่ระบุ",
        severity: item.severity,
        detail: item.detail ?? "",
        metric_label: item.metric_label ?? "",
        metric_value: item.metric_value ?? "",
      };
    });

    const contextText = JSON.stringify(itemsSummary, null, 2);

    // Step 4: Call Gemini API
    const rawKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const GEMINI_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!GEMINI_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `คุณคือ AI ผู้ช่วยวางแผน PLC สำหรับโรงเรียนประถมเอกชนขนาดเล็ก
ครู 1 คนมักสอนหลายวิชา หลายชั้น
วิเคราะห์ open items ต่อไปนี้ และเสนอ 3 แผน PLC ที่เป็นไปได้

Open Items:
${contextText}

แต่ละแผนต้องระบุ:
- plan_name (ชื่อสั้นๆ เช่น 'PLC ทักษะภาษา')
- topic (หัวข้อ PLC เป็นประโยคเต็ม)
- rationale (เหตุผลที่จัดกลุ่มแบบนี้)
- members (array ของ { teacher_id, teacher_name } ที่ควรเข้าร่วม)
- covered_item_ids (array ของ action_item.id ที่ครอบคลุม)
- coverage_percent (เลขเปอร์เซ็นต์เป็นตัวเลข เช่น 54.5)
- plc_type ('subject' | 'grade_band' | 'cross')
- grade_band ('ป.1-3' | 'ป.4-6' | 'ทั้งโรงเรียน' ถ้าเป็น grade_band หรือ cross)
- subject (string ถ้าเป็น subject-based)
- problem_statement (ประเด็นปัญหาเบื้องต้น)
- root_cause (สาเหตุที่คาดว่าจะเป็น)
- approach (แนวทางแก้ไขเบื้องต้น)

ทั้ง 3 แผนควรต่างกัน:
- แผน A: กลุ่มเล็ก specific (ครูน้อย items น้อย แต่ targeted)
- แผน B: กลุ่มช่วงชั้น (ป.4-6 หรือ ป.1-3)
- แผน C: ทั้งโรงเรียน (cover ทุก items)

Return ONLY valid JSON in this format:
{
  "plans": [
    {
      "plan_name": "string",
      "topic": "string",
      "rationale": "string",
      "members": [{"teacher_id": "uuid", "teacher_name": "string"}],
      "covered_item_ids": [1, 2, 3],
      "coverage_percent": 54.5,
      "plc_type": "subject",
      "grade_band": "ป.1-3",
      "subject": "string",
      "problem_statement": "string",
      "root_cause": "string",
      "approach": "string"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown, no explanation text.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("GEMINI_API_ERROR:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const aiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!aiText) {
      throw new Error("No response from Gemini API");
    }

    // Parse JSON from AI response (handle markdown code blocks)
    let jsonText = aiText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/```\s*$/, "");
    }

    let plans;
    try {
      const parsed = JSON.parse(jsonText);
      plans = parsed.plans || [];
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("AI response:", aiText);
      throw new Error("AI returned invalid JSON");
    }

    // Step 5: Return result
    return new Response(
      JSON.stringify({ plans }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PLC Planner error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
