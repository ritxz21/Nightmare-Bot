
-- Create resume_topics table for deterministic caching
CREATE TABLE public.resume_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  resume_hash text NOT NULL,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, resume_hash)
);

ALTER TABLE public.resume_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resume topics"
ON public.resume_topics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resume topics"
ON public.resume_topics FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for interview_sessions (for live monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_sessions;
