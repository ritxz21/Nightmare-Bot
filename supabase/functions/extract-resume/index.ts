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
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();

    const { resumeText } = await req.json();
    if (!resumeText || !resumeText.trim()) {
      return new Response(JSON.stringify({ error: "Resume text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resumeHash = await sha256(resumeText.trim());

    // Check cache if user is authenticated
    if (user) {
      const { data: cached } = await supabase
        .from("resume_topics")
        .select("extracted_data")
        .eq("user_id", user.id)
        .eq("resume_hash", resumeHash)
        .maybeSingle();

      if (cached?.extracted_data) {
        return new Response(JSON.stringify(cached.extracted_data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
            content: `You are a strict technical resume parser. Your job is to extract ONLY information that is EXPLICITLY written in the resume text provided.

CRITICAL RULES:
- Extract ONLY skills, technologies, and tools that are EXPLICITLY mentioned by name in the resume text.
- Do NOT infer, guess, or hallucinate any skills that are not directly written in the resume.
- If a skill is not literally mentioned in the text, do NOT include it.
- For projects, only include projects that are clearly described in the resume.
- For interview topics, base them ONLY on the skills and projects that are explicitly mentioned.
- Be deterministic — always produce the same output for the same input.

Example: If the resume says "Built a REST API using Node.js and Express", you may extract "Node.js", "Express", "REST API". You must NOT add "JavaScript", "MongoDB", "Docker" or any other technology unless they are explicitly written in the resume.`,
          },
          {
            role: "user",
            content: `Here is the resume text to parse. Extract ONLY what is explicitly written:\n\n${resumeText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_resume_data",
              description: "Extract structured data from a resume. Only include information explicitly present in the resume text. Never infer or hallucinate skills.",
              parameters: {
                type: "object",
                properties: {
                  candidate_name: { type: "string", description: "Name of the candidate as written in the resume" },
                  skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of technical skills EXPLICITLY mentioned by name in the resume. Do NOT infer or add skills not written in the text.",
                  },
                  projects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        technologies: {
                          type: "array",
                          items: { type: "string" },
                          description: "Technologies EXPLICITLY mentioned for this project only",
                        },
                      },
                      required: ["name", "description", "technologies"],
                    },
                    description: "Projects explicitly described in the resume",
                  },
                  interview_topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Topic title derived from explicitly mentioned skills/projects" },
                        core_concepts: {
                          type: "array",
                          items: { type: "string" },
                          description: "5-8 core concepts to assess, based ONLY on what the resume explicitly mentions",
                        },
                      },
                      required: ["title", "core_concepts"],
                    },
                    description: "3-5 interview topics derived from explicitly mentioned resume content",
                  },
                },
                required: ["candidate_name", "skills", "projects", "interview_topics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_resume_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let extracted: unknown;

    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch (_e) {
        console.warn("Failed to parse tool_call arguments directly, attempting cleanup");
        extracted = extractJsonFromResponse(toolCall.function.arguments);
      }
    } else {
      // Fallback: try to extract from message content
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        extracted = extractJsonFromResponse(content);
      } else {
        throw new Error("No structured output from AI");
      }
    }

    // Cache the result if user is authenticated
    if (user) {
      const ext = extracted as { interview_topics?: unknown[] };
      await supabase.from("resume_topics").insert({
        user_id: user.id,
        resume_hash: resumeHash,
        extracted_data: extracted,
        generated_topics: ext.interview_topics || [],
      });
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-resume error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
