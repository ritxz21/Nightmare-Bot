
-- Drop the broken policies that query auth.users directly
DROP POLICY IF EXISTS "Interviewees can view invites by email" ON public.interview_invites;
DROP POLICY IF EXISTS "Interviewees can claim invites by email" ON public.interview_invites;

-- Create a security definer function to get the current user's email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Interviewees can view invites by email"
ON public.interview_invites
FOR SELECT
USING (
  invite_email = public.get_user_email()
);

CREATE POLICY "Interviewees can claim invites by email"
ON public.interview_invites
FOR UPDATE
USING (
  invite_email = public.get_user_email()
  AND status = 'pending'
);
