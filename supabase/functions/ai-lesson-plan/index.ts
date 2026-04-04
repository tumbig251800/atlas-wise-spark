import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAtlasUser } from "../_shared/atlasAuth.ts";
import { parseLessonPlanBody } from "../_shared/lessonPlanRequest.ts";
import {
  buildLessonPlanUserContent,
  buildMainLessonSystemPrompt,
  getAddonSystemPrompt,
} from "../_shared/lessonPlanPrompts.ts";

const RATE_LIMIT_SECONDS = 10;

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

    // --- Rate limit check (per user, 1 req / RATE_LIMIT_SECONDS) ---
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: rateData } = await supabaseAdmin
      .from("ai_rate_limits")
      .select("last_request_at")
      .eq("user_id", auth.userId)
      .eq("function_name", "ai-lesson-plan")
      .maybeSingle();

    if (rateData?.last_request_at) {
      const secondsSinceLast = (Date.now() - new Date(rateData.last_request_at).getTime()) / 1000;
      if (secondsSinceLast < RATE_LIMIT_SECONDS) {
        const wait = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLast);
        return new Response(
          JSON.stringify({ error: `กรุณารอ ${wait} วินาทีก่อนขอแผนการสอนใหม่` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // Record this request timestamp
    await supabaseAdmin.from("ai_rate_limits").upsert({
      user_id: auth.userId,
      function_name: "ai-lesson-plan",
      last_request_at: new Date().toISOString(),
    });
    // --- End rate limit ---

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
    const geminiBody = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0 },
    });

    // Retry up to 3 attempts on Gemini 429 with exponential backoff
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: geminiBody,
      });
      if (response.status !== 429) break;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    }

    if (!response!.ok) {
      const t = await response!.text();
      console.error("Gemini lesson plan error:", response!.status, t);
      if (response!.status === 429) {
        return new Response(JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response!.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response!.status === 400 || response!.status === 403) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY ไม่ถูกต้อง กรุณาตรวจสอบใน Supabase" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Gemini error (${response!.status}). ดู Supabase Logs สำหรับรายละเอียด` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE → OpenAI-compatible SSE for frontend
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response!.body!.getReader();
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
