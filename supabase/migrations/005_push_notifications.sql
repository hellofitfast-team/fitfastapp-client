-- Add notification reminder time preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN notification_reminder_time TIME DEFAULT '08:00';

-- Push subscriptions table (one row per device)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_subscription_id TEXT NOT NULL,
  device_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
CREATE UNIQUE INDEX idx_push_subs_onesignal ON public.push_subscriptions(onesignal_subscription_id);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coach reads all subscriptions" ON public.push_subscriptions
  FOR SELECT USING (public.is_coach(auth.uid()));

-- Reuse existing updated_at trigger function from 001
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
