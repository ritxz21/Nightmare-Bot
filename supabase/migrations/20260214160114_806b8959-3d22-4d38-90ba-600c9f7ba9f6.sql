
-- Create interview_sessions table
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  bluff_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  concept_coverage JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_bluff_score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_session_owner(session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.interview_sessions
    WHERE id = session_id AND user_id = auth.uid()
  );
$$;

-- RLS policies
CREATE POLICY "Users can view own sessions"
  ON public.interview_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions"
  ON public.interview_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.interview_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON public.interview_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_interview_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON public.interview_sessions(status);
