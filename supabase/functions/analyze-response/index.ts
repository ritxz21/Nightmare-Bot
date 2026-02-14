import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { userResponse, topic, coreConcepts, previousAnalysis } = await req.json();

    const systemPrompt = `You are an expert knowledge assessor for the topic "${topic}". 
Your job is to analyze a student's explanation and detect:
1. Which core concepts they mentioned clearly with depth
2. Which concepts they mentioned but only shallowly  
3. Which core concepts are completely missing
4. How vague or precise their language is
5. Whether they use confident-sounding language to mask lack of understanding (bluffing)
6. A targeted follow-up question that exposes the weakest gap

The core concepts for "${topic}" are: ${JSON.stringify(coreConcepts)}

${previousAnalysis ? `Previous analysis context: The student previously had a bluff score of ${previousAnalysis.bluff_probability}. Previously missing concepts: ${JSON.stringify(previousAnalysis.missing_concepts)}. Use this to track improvement or deterioration.` : "This is the first response from the student."}

IMPORTANT: Return your analysis by calling the analyze_response function.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userResponse },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_response",
              description: "Return structured analysis of the student's response",
              parameters: {
                type: "object",
                properties: {
                  concepts_mentioned_clearly: {
                    type: "array",
                    items: { type: "string" },
                    description: "Concepts explained with genuine depth and accuracy",
                  },
                  concepts_mentioned_shallowly: {
                    type: "array",
                    items: { type: "string" },
                    description: "Concepts mentioned but without real understanding",
                  },
                  concepts_missing: {
                    type: "array",
                    items: { type: "string" },
                    description: "Core concepts not addressed at all",
                  },
                  vagueness_score: {
                    type: "number",
                    description: "0-10 scale. 0 = extremely precise, 10 = entirely vague",
                  },
                  confidence_language_detected: {
                    type: "boolean",
                    description: "True if student uses confident language like 'obviously', 'basically', 'simply' to mask gaps",
                  },
                  depth_score: {
                    type: "number",
                    description: "0-10 scale. 0 = surface level, 10 = expert depth",
                  },
                  follow_up_question: {
                    type: "string",
                    description: "A specific, targeted question that exposes the weakest knowledge gap. Should be adversarial but fair.",
                  },
                  assessment_note: {
                    type: "string",
                    description: "Brief internal note about the student's understanding level",
                  },
                },
                required: [
                  "concepts_mentioned_clearly",
                  "concepts_mentioned_shallowly",
                  "concepts_missing",
                  "vagueness_score",
                  "confidence_language_detected",
                  "depth_score",
                  "follow_up_question",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_response" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const analysis = JSON.parse(toolCall.function.arguments);

    // Calculate bluff probability using the formula
    const missingRatio = analysis.concepts_missing.length / coreConcepts.length;
    const bluffProbability =
      (analysis.vagueness_score / 10) * 0.4 +
      missingRatio * 0.4 +
      (analysis.confidence_language_detected ? 1 : 0) * 0.2;

    const result = {
      ...analysis,
      bluff_probability: Math.round(bluffProbability * 100),
      missing_concepts_ratio: missingRatio,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-response error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
