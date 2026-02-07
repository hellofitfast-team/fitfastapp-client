-- Fix infinite recursion in coach RLS policy
-- The old policy queried profiles within its own policy check, causing recursion.

-- Drop the recursive policy
DROP POLICY "Coaches can read all profiles" ON public.profiles;

-- Create a security definer function to check coach status without RLS
CREATE OR REPLACE FUNCTION public.is_coach(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_coach FROM public.profiles WHERE id = user_id),
    false
  );
$$;

-- Restore the original self-access policy
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Recreate coach policy using the function (no recursion)
CREATE POLICY "Coaches can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_coach(auth.uid()));
