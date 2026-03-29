import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAtlasUser } from "../_shared/atlasAuth.ts";
import { parseLessonPlanBody } from "../_shared/lessonPlanRequest.ts";
import {
  buildLessonPlanUserContent,
  buildMainLessonSystemPrompt,
  getAddonSystemPrompt,
} from "../_shared/lessonPlanPrompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith("/health") || url.pathname === "/health")) {
    return new Response(
      JSON.stringify({ status: "ok", function: "ai-lesson-plan", ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const rawBody = await req.json();
    const parsed = parseLessonPlanBody(rawBody);
    if (!parsed.ok) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const v = parsed.value;
    const { planType, topic, gradeLevel, classroom, subject, learningUnit, hours, addonType, includeWorksheets } = v;
    const rawKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    const GEMINI_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = addonType
      ? getAddonSystemPrompt(addonType)
      : buildMainLessonSystemPrompt({
          mode: v.mode,
          planType,
          hours,
          gradeLevel,
          classroom,
          subject,
          learningUnit,
          topic,
          includeWorksheets,
        });

    const userContent = addonType ? topic : buildLessonPlanUserContent(v);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini lesson plan error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 400 || response.status === 403) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY ไม่ถูกต้อง กรุณาตรวจสอบใน Supabase" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Gemini error (${response.status}). ดู Supabase Logs สำหรับรายละเอียด` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE → OpenAI-compatible SSE for frontend
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              break;
            }
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                if (text) {
                  const openAiChunk = { choices: [{ delta: { content: text } }] };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (e) {
          console.error("ai-lesson-plan stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("lesson plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
