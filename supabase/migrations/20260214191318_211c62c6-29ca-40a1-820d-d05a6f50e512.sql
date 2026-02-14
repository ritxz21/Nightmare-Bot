
-- Drop the broken restrictive email-based policies
DROP POLICY IF EXISTS "Interviewees can view invites by email" ON public.interview_invites;
DROP POLICY IF EXISTS "Interviewees can claim invites by email" ON public.interview_invites;

-- Recreate as PERMISSIVE so they OR with the interviewee_id-based policies
CREATE POLICY "Interviewees can view invites by email"
ON public.interview_invites
FOR SELECT
TO authenticated
USING (invite_email = public.get_user_email());

-- UPDATE policy: USING matches pending invites by email, WITH CHECK allows the status change
CREATE POLICY "Interviewees can claim invites by email"
ON public.interview_invites
FOR UPDATE
TO authenticated
USING (
  invite_email = public.get_user_email()
  AND status = 'pending'
)
WITH CHECK (true);
