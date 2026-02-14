
-- 1. ATS Reports table
CREATE TABLE public.ats_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_hash text NOT NULL,
  ats_score real NOT NULL DEFAULT 0,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ats_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ats reports"
  ON public.ats_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ats reports"
  ON public.ats_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Job Descriptions table (for interviewee JD uploads)
CREATE TABLE public.job_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  raw_text text NOT NULL,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  gap_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own JDs"
  ON public.job_descriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own JDs"
  ON public.job_descriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own JDs"
  ON public.job_descriptions FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Job Roles table (interviewer creates)
CREATE TABLE public.job_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id uuid NOT NULL,
  company_name text NOT NULL,
  job_title text NOT NULL,
  difficulty_level text NOT NULL DEFAULT 'medium-rare',
  custom_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  evaluation_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_ats_score real,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interviewers can view own job roles"
  ON public.job_roles FOR SELECT
  USING (auth.uid() = interviewer_id);

CREATE POLICY "Interviewers can insert own job roles"
  ON public.job_roles FOR INSERT
  WITH CHECK (auth.uid() = interviewer_id);

CREATE POLICY "Interviewers can update own job roles"
  ON public.job_roles FOR UPDATE
  USING (auth.uid() = interviewer_id);

CREATE POLICY "Interviewers can delete own job roles"
  ON public.job_roles FOR DELETE
  USING (auth.uid() = interviewer_id);

-- 4. Interview Invites table
CREATE TABLE public.interview_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id uuid NOT NULL REFERENCES public.job_roles(id) ON DELETE CASCADE,
  interviewee_id uuid,
  invite_email text,
  invite_token text UNIQUE DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deadline timestamptz
);

ALTER TABLE public.interview_invites ENABLE ROW LEVEL SECURITY;

-- Interviewers can see invites for their job roles
CREATE POLICY "Interviewers can view invites for own roles"
  ON public.interview_invites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.job_roles
    WHERE job_roles.id = interview_invites.job_role_id
    AND job_roles.interviewer_id = auth.uid()
  ));

CREATE POLICY "Interviewers can create invites for own roles"
  ON public.interview_invites FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.job_roles
    WHERE job_roles.id = interview_invites.job_role_id
    AND job_roles.interviewer_id = auth.uid()
  ));

CREATE POLICY "Interviewers can update invites for own roles"
  ON public.interview_invites FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.job_roles
    WHERE job_roles.id = interview_invites.job_role_id
    AND job_roles.interviewer_id = auth.uid()
  ));

-- Interviewees can see their own invites
CREATE POLICY "Interviewees can view own invites"
  ON public.interview_invites FOR SELECT
  USING (auth.uid() = interviewee_id);

-- Interviewees can update their own invites (accept/complete)
CREATE POLICY "Interviewees can update own invites"
  ON public.interview_invites FOR UPDATE
  USING (auth.uid() = interviewee_id);

-- 5. Update interview_sessions with new columns
ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS job_role_id uuid REFERENCES public.job_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS ats_snapshot jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url text;

-- 6. Create video recordings storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-videos', 'interview-videos', false)
ON CONFLICT DO NOTHING;

-- Video storage policies
CREATE POLICY "Users can upload own videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'interview-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'interview-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Interviewers can view videos for sessions tied to their job roles
CREATE POLICY "Interviewers can view candidate videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'interview-videos'
    AND EXISTS (
      SELECT 1 FROM public.interview_sessions s
      JOIN public.job_roles jr ON s.job_role_id = jr.id
      WHERE jr.interviewer_id = auth.uid()
      AND s.user_id::text = (storage.foldername(name))[1]
    )
  );

-- 7. Add interview_invites and ats_reports to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_invites;

-- 8. Security definer function for invite token lookup (public, no auth needed)
CREATE OR REPLACE FUNCTION public.lookup_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  job_role_id uuid,
  status text,
  company_name text,
  job_title text,
  difficulty_level text,
  deadline timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.job_role_id,
    i.status,
    jr.company_name,
    jr.job_title,
    jr.difficulty_level,
    i.deadline
  FROM public.interview_invites i
  JOIN public.job_roles jr ON jr.id = i.job_role_id
  WHERE i.invite_token = _token
  AND i.status = 'pending';
$$;

-- 9. Function to claim an invite (interviewee accepts)
CREATE OR REPLACE FUNCTION public.claim_invite(_token text, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_id uuid;
BEGIN
  UPDATE public.interview_invites
  SET interviewee_id = _user_id, status = 'accepted'
  WHERE invite_token = _token AND status = 'pending' AND interviewee_id IS NULL
  RETURNING id INTO _invite_id;
  
  RETURN _invite_id;
END;
$$;

-- 10. RLS policy for interviewers to view sessions tied to their job roles
CREATE POLICY "Interviewers can view sessions for own job roles"
  ON public.interview_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_roles
      WHERE job_roles.id = interview_sessions.job_role_id
      AND job_roles.interviewer_id = auth.uid()
    )
  );
