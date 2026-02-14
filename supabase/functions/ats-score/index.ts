import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === '[' ? ']' : '}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { resumeText, jdText } = await req.json();
    if (!resumeText?.trim()) throw new Error("Resume text required");

    const resumeHash = await sha256(resumeText.trim());

    // Check cache
    const { data: cached } = await supabase
      .from("ats_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("resume_hash", resumeHash)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jdContext = jdText ? `\n\nJob Description for comparison:\n${jdText}` : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are an ATS (Applicant Tracking System) scoring engine. Analyze the resume and produce a detailed ATS compatibility score.

CRITICAL RULES:
- Only evaluate skills and keywords that are EXPLICITLY present in the resume text.
- Do NOT hallucinate or infer skills that are not written in the resume.
- missing_skills should only list skills from the JD (if provided) that are NOT in the resume. If no JD is provided, list commonly expected skills for the candidate's apparent role that are missing.
- All scores must be numbers between 0 and 100.
- Be deterministic — always produce the same output for the same input.${jdContext ? "\n- Compare against the provided JD for keyword_match and missing_skills." : ""}`,
          },
          { role: "user", content: resumeText + jdContext },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_resume",
            description: "Return ATS scoring analysis based ONLY on what is explicitly in the resume.",
            parameters: {
              type: "object",
              properties: {
                ats_score: { type: "number", description: "Overall ATS score 0-100" },
                keyword_match: { type: "number", description: "Keyword relevance score 0-100" },
                skill_completeness: { type: "number", description: "How complete the skills section is 0-100" },
                project_impact: { type: "number", description: "Quality of project descriptions 0-100" },
                action_verb_strength: { type: "number", description: "Use of strong action verbs 0-100" },
                measurable_achievements: { type: "number", description: "Presence of measurable results 0-100" },
                missing_skills: { type: "array", items: { type: "string" }, description: "Skills missing from the resume (from JD or role expectations)" },
                improvement_recommendations: { type: "array", items: { type: "string" }, description: "Specific improvement suggestions" },
                role_fit_summary: { type: "string", description: "Overall fit summary" },
              },
              required: ["ats_score", "keyword_match", "skill_completeness", "project_impact", "action_verb_strength", "measurable_achievements", "missing_skills", "improvement_recommendations", "role_fit_summary"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_resume" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI usage limit reached." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let report: Record<string, unknown>;

    if (toolCall?.function?.arguments) {
      try {
        report = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      } catch (_e) {
        console.warn("Failed to parse tool_call arguments directly, attempting cleanup");
        report = extractJsonFromResponse(toolCall.function.arguments) as Record<string, unknown>;
      }
    } else {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        report = extractJsonFromResponse(content) as Record<string, unknown>;
      } else {
        throw new Error("No output from AI");
      }
    }

    // Validate required fields
    const atsScore = typeof report.ats_score === "number" ? report.ats_score : 0;

    // Save to DB
    const { data: saved, error: insertError } = await supabase.from("ats_reports").insert({
      user_id: user.id,
      resume_hash: resumeHash,
      ats_score: atsScore,
      report,
    }).select().single();

    if (insertError) {
      console.error("Insert error:", insertError);
      // Return the report even if save fails
      return new Response(JSON.stringify({ report, ats_score: atsScore, resume_hash: resumeHash }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ats-score error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
