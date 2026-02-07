-- Grant coach (is_coach=true) read access to all client tables
-- and write access to coach-managed tables (tickets, faqs, pending_signups, system_config).
-- Uses the SECURITY DEFINER function public.is_coach() from migration 003.

-- ═══════════════════════════════════════════════
-- 1. Client data tables — coach can READ all rows
-- ═══════════════════════════════════════════════

CREATE POLICY "Coaches can read all assessments"
  ON public.initial_assessments FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can read all check_ins"
  ON public.check_ins FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can read all meal_plans"
  ON public.meal_plans FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can read all workout_plans"
  ON public.workout_plans FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can read all meal_completions"
  ON public.meal_completions FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can read all workout_completions"
  ON public.workout_completions FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can read all reflections"
  ON public.daily_reflections FOR SELECT
  USING (public.is_coach(auth.uid()));

-- ═══════════════════════════════════════════════
-- 2. Tickets — coach can READ all + UPDATE (respond)
-- ═══════════════════════════════════════════════

CREATE POLICY "Coaches can read all tickets"
  ON public.tickets FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can update tickets"
  ON public.tickets FOR UPDATE
  USING (public.is_coach(auth.uid()));

-- ═══════════════════════════════════════════════
-- 3. Pending signups — coach has full CRUD
-- ═══════════════════════════════════════════════

CREATE POLICY "Coaches can read pending_signups"
  ON public.pending_signups FOR SELECT
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can update pending_signups"
  ON public.pending_signups FOR UPDATE
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can insert pending_signups"
  ON public.pending_signups FOR INSERT
  WITH CHECK (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can delete pending_signups"
  ON public.pending_signups FOR DELETE
  USING (public.is_coach(auth.uid()));

-- ═══════════════════════════════════════════════
-- 4. FAQs — coach can INSERT, UPDATE, DELETE
--    (SELECT already open to all authenticated users)
-- ═══════════════════════════════════════════════

CREATE POLICY "Coaches can insert faqs"
  ON public.faqs FOR INSERT
  WITH CHECK (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can update faqs"
  ON public.faqs FOR UPDATE
  USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can delete faqs"
  ON public.faqs FOR DELETE
  USING (public.is_coach(auth.uid()));

-- ═══════════════════════════════════════════════
-- 5. System config — coach can UPDATE
--    (SELECT already open to all authenticated users)
-- ═══════════════════════════════════════════════

CREATE POLICY "Coaches can update system_config"
  ON public.system_config FOR UPDATE
  USING (public.is_coach(auth.uid()));

-- ═══════════════════════════════════════════════
-- 6. Coach can insert meal/workout plans (AI generates for clients)
-- ═══════════════════════════════════════════════

CREATE POLICY "Coaches can insert meal_plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can insert workout_plans"
  ON public.workout_plans FOR INSERT
  WITH CHECK (public.is_coach(auth.uid()));
