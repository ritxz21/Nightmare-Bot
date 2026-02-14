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

    const { query, jobRoleId, sessions } = await req.json();
    if (!query?.trim()) throw new Error("Query required");

    const sessionsSummary = (sessions || []).map((s: any) => ({
      id: s.id,
      bluff_score: s.final_bluff_score,
      concepts: (s.concept_coverage || []).map((c: any) => `${c.name}: ${c.status}`).join(", "),
      status: s.status,
      date: s.created_at,
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI hiring intelligence assistant. You have access to interview session data for a specific job role. Answer the interviewer's questions about candidate performance, rankings, strengths, and weaknesses. Be concise and data-driven. Only reference data provided — never fabricate candidates or scores.

Session data:
${JSON.stringify(sessionsSummary, null, 2)}`,
          },
          { role: "user", content: query },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "No response generated.";

    return new Response(JSON.stringify({ response: answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("company-ai-query error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
