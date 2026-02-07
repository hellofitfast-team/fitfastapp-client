-- Add is_coach boolean to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_coach BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick coach lookups (middleware will query this on every admin request)
CREATE INDEX idx_profiles_is_coach ON public.profiles (is_coach) WHERE is_coach = TRUE;

-- RLS policy: coaches can read all profiles
CREATE POLICY "Coaches can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_coach = TRUE
    )
  );

-- Drop the old "Users can view own profile" policy (now covered by coach policy above)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
