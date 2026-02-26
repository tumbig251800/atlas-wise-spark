import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const defaultPrompt = `คุณคือผู้ช่วยสรุปข้อมูลการสอนของระบบ ATLAS
เขียนสรุปสถานการณ์ภาพรวมเป็นภาษาไทย 2-3 ประโยค กระชับ อ่านง่าย
ใช้โทนเป็นมิตร ให้ข้อมูลเชิงบวกก่อน ตามด้วยจุดที่ควรปรับปรุง
ห้ามใช้ bullet points ให้เขียนเป็นย่อหน้าสั้นๆ

[STRICT RULE - Deterministic Logic]
ห้ามสร้าง สุ่ม หรือคิดเลขเองเด็ดขาด ต้องใช้เฉพาะตัวเลขและข้อมูลที่มีใน logs_summary เท่านั้น หากไม่มีข้อมูลใด ให้ระบุว่า "ไม่มีข้อมูล"`;

const executivePrompt = `คุณคือ "พีท ร่างทอง" ที่ปรึกษาวิชาการ AI ของระบบ ATLAS
วิเคราะห์ข้อมูลการสอนระดับโรงเรียนและให้ข้อเสนอแนะเชิงนโยบาย (Policy Advice) เป็นภาษาไทย
โครงสร้างคำตอบ:
1. สรุปสถานการณ์ภาพรวม (จุดแข็ง/จุดอ่อนของโรงเรียน)
2. วิเคราะห์แนวโน้มปัญหาที่ต้องเฝ้าระวัง
3. ข้อเสนอแนะ 2-3 ข้อสำหรับผู้บริหาร เพื่อยกระดับคุณภาพการสอน
เขียนเป็น Markdown กระชับ ชัดเจน ตอบไม่เกิน 200 คำ

[STRICT RULE - Deterministic Logic]
ห้ามสร้าง สุ่ม หรือคิดเลขเองเด็ดขาด ต้องใช้เฉพาะตัวเลขและข้อมูลที่มีใน logs_summary เท่านั้น`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logs_summary, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemContent = mode === "executive" ? executivePrompt : defaultPrompt;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: `สรุปข้อมูลการสอนต่อไปนี้:\n${logs_summary}` },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "เครดิต AI หมด" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "API Key ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบ LOVABLE_API_KEY ใน Supabase" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI summary error:", response.status, t);
      return new Response(
        JSON.stringify({ error: `AI gateway error (${response.status}). ดู Supabase Logs สำหรับรายละเอียด` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content ?? "ไม่สามารถสร้างสรุปได้";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
