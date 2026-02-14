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

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    const { resumeText } = await req.json();
    if (!resumeText || !resumeText.trim()) {
      return new Response(JSON.stringify({ error: "Resume text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute hash for deterministic caching
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
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are a technical resume analyzer. Extract the key technical topics, skills, and projects from the resume. For each project, identify what technologies and concepts were used. Generate a structured interview plan with core concepts to assess. Be deterministic — always produce the same output for the same input.`,
          },
          { role: "user", content: resumeText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_resume_data",
              description: "Extract structured data from a resume for interview preparation",
              parameters: {
                type: "object",
                properties: {
                  candidate_name: { type: "string", description: "Name of the candidate" },
                  skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of technical skills mentioned",
                  },
                  projects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        technologies: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "description", "technologies"],
                    },
                    description: "Projects from the resume",
                  },
                  interview_topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Topic title for interview" },
                        core_concepts: {
                          type: "array",
                          items: { type: "string" },
                          description: "5-8 core concepts to assess under this topic",
                        },
                      },
                      required: ["title", "core_concepts"],
                    },
                    description: "3-5 interview topics derived from the resume, each with core concepts",
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
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Cache the result if user is authenticated
    if (user) {
      await supabase.from("resume_topics").insert({
        user_id: user.id,
        resume_hash: resumeHash,
        extracted_data: extracted,
        generated_topics: extracted.interview_topics,
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
