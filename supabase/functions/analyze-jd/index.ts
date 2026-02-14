import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { jdText, resumeText } = await req.json();
    if (!jdText?.trim()) throw new Error("Job description text required");

    const resumeContext = resumeText ? `\n\nCandidate Resume for gap analysis:\n${resumeText}` : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are a job description analyzer. Extract key requirements and, if a resume is provided, perform gap analysis. Be deterministic.`,
          },
          { role: "user", content: jdText + resumeContext },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_jd",
            description: "Extract JD data and perform gap analysis",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Extracted job title" },
                extracted_data: {
                  type: "object",
                  properties: {
                    required_skills: { type: "array", items: { type: "string" } },
                    technologies: { type: "array", items: { type: "string" } },
                    seniority_level: { type: "string" },
                    core_responsibilities: { type: "array", items: { type: "string" } },
                  },
                  required: ["required_skills", "technologies", "seniority_level", "core_responsibilities"],
                },
                gap_analysis: {
                  type: "object",
                  properties: {
                    matching_skills: { type: "array", items: { type: "string" } },
                    missing_skills: { type: "array", items: { type: "string" } },
                    improvement_roadmap: { type: "array", items: { type: "string" } },
                    resume_suggestions: { type: "array", items: { type: "string" } },
                  },
                  required: ["matching_skills", "missing_skills", "improvement_roadmap", "resume_suggestions"],
                },
              },
              required: ["title", "extracted_data", "gap_analysis"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_jd" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No output from AI");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-jd error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
