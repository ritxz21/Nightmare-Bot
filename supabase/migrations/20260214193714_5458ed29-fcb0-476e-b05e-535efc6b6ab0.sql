
-- Create a security definer function to check if a user has an invite for a job role
-- This avoids infinite recursion between job_roles and interview_invites RLS policies
CREATE OR REPLACE FUNCTION public.user_has_invite_for_role(_user_id uuid, _job_role_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.interview_invites
    WHERE job_role_id = _job_role_id
    AND (interviewee_id = _user_id OR invite_email = (SELECT email FROM auth.users WHERE id = _user_id))
  );
$$;

-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Invitees can view invited job roles" ON public.job_roles;

-- Recreate the policy using the security definer function instead of a subquery
CREATE POLICY "Invitees can view invited job roles"
ON public.job_roles
FOR SELECT
USING (public.user_has_invite_for_role(auth.uid(), id));
