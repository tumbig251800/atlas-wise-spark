import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActionItemInput {
  id: number;
  teacher_id: string | null;
  teacher_name: string | null;
  subject: string | null;
  grade_level: string | null;
  classroom: string | null;
  issue_type: string;
  severity: string;
  detail: string | null;
  metric_label: string | null;
  metric_value: number | null;
}

interface RequestBody {
  items: ActionItemInput[];
  subject: string;
  gradeBand: string;
}

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

    // Parse request body
    const body: RequestBody = await req.json();
    const { items, subject, gradeBand } = body;

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Build context summary
    const itemsSummary = items.map((item) => ({
      id: item.id,
      teacher_name: item.teacher_name ?? "ไม่ระบุ",
      classroom: item.classroom ?? "",
      subject: item.subject ?? "",
      grade_level: item.grade_level ?? "",
      issue_type: item.issue_type,
      severity: item.severity,
      detail: item.detail ?? "",
      metric_label: item.metric_label ?? "",
      metric_value: item.metric_value ?? null,
    }));

    const contextText = JSON.stringify(itemsSummary, null, 2);

    // Get unique teachers
    const uniqueTeachers = [
      ...new Map(
        items
          .filter((i) => i.teacher_id && i.teacher_name)
          .map((i) => [i.teacher_id, { teacher_id: i.teacher_id!, teacher_name: i.teacher_name! }])
      ).values(),
    ];

    const teachersText = uniqueTeachers.map((t) => `- ${t.teacher_name} (ID: ${t.teacher_id})`).join("\n");

    // Call Gemini API
    const rawKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const GEMINI_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!GEMINI_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `คุณคือ AI ผู้ช่วยสร้าง PLC Draft สำหรับโรงเรียนประถม

วิชาที่ครอบคลุมในการประชุมนี้: ${subject}
ช่วงชั้น: ${gradeBand}

Action Items ที่จะครอบคลุมใน PLC นี้:
${contextText}

ครูที่เกี่ยวข้อง:
${teachersText}

โปรดวิเคราะห์และสร้าง PLC Draft ที่สมบูรณ์:

1. **topic**: หัวข้อ PLC ที่เหมาะสม (เป็นประโยคสั้นๆ กระชับ)
2. **problem_statement**: สรุปปัญหารวมจาก items ทั้งหมด (2-3 ประโยค)
3. **root_cause**: วิเคราะห์สาเหตุที่คาดว่าจะเป็น (2-3 ประโยค)
4. **approach**: แนวทางแก้ไขที่เหมาะสม (2-3 ประโยค)
5. **discussion_points**: ประเด็นที่ควรอภิปรายในที่ประชุม (3-5 ข้อ) เรียงตามลำดับการประชุม เช่น
   - แต่ละครูนำเสนอข้อมูลห้องตัวเอง
   - วิเคราะห์รูปแบบที่พบร่วมกัน
   - แลกเปลี่ยนวิธีที่ได้ผล/ไม่ได้ผล
   - กำหนด action steps รายคน
   - นัดติดตามผลครั้งถัดไป
6. **action_steps_per_teacher**: สำหรับแต่ละครู ให้ระบุ action steps เฉพาะที่ครูคนนั้นควรทำ (แยกเป็น array)

กรุณา Return ONLY valid JSON ในรูปแบบนี้:
{
  "draft": {
    "topic": "string",
    "problem_statement": "string",
    "root_cause": "string",
    "approach": "string",
    "discussion_points": ["string", "string", "string"],
    "action_steps_per_teacher": [
      {
        "teacher_id": "uuid",
        "teacher_name": "string",
        "action_steps": "string (bullet points หรือ numbered list)"
      }
    ]
  }
}

IMPORTANT:
- Return ONLY the JSON object, no markdown code blocks, no explanation text
- discussion_points ต้องเป็น array ของ string แต่ละข้อเป็นประเด็นที่จะอภิปรายในที่ประชุม
- action_steps_per_teacher ต้องมีครบทุกคนที่อยู่ใน uniqueTeachers
- action_steps ให้เขียนเป็น bullet points หรือ numbered list ที่ชัดเจน`;

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

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("AI response:", aiText);
      throw new Error("AI returned invalid JSON");
    }

    if (!result.draft) {
      throw new Error("AI response missing 'draft' field");
    }

    // Return result
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PLC Bundle Draft error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
