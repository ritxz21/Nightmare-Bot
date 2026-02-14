
-- Allow interviewees to view job roles they've been invited to
CREATE POLICY "Invitees can view invited job roles"
ON public.job_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interview_invites
    WHERE interview_invites.job_role_id = job_roles.id
    AND (
      interview_invites.interviewee_id = auth.uid()
      OR interview_invites.invite_email = public.get_user_email()
    )
  )
);
