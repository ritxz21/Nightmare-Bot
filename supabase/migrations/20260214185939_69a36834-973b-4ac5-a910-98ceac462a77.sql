
-- Allow interviewees to see invites sent to their email address
CREATE POLICY "Interviewees can view invites by email"
ON public.interview_invites
FOR SELECT
USING (
  invite_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow interviewees to update (claim) invites sent to their email
CREATE POLICY "Interviewees can claim invites by email"
ON public.interview_invites
FOR UPDATE
USING (
  invite_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
);
