-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  plan_tier TEXT CHECK (plan_tier IN ('3_months', '6_months', '12_months')),
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'inactive', 'expired')),
  plan_start_date DATE,
  plan_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial assessments (full lifestyle data)
CREATE TABLE public.initial_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goals TEXT,
  current_weight DECIMAL(5,2),
  height DECIMAL(5,2),
  measurements JSONB DEFAULT '{}',
  schedule_availability JSONB DEFAULT '{}',
  food_preferences TEXT[],
  allergies TEXT[],
  dietary_restrictions TEXT[],
  medical_conditions TEXT[],
  injuries TEXT[],
  exercise_history TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  lifestyle_habits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Periodic check-ins
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  weight DECIMAL(5,2),
  measurements JSONB DEFAULT '{}',
  workout_performance TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  dietary_adherence INTEGER CHECK (dietary_adherence BETWEEN 1 AND 10),
  new_injuries TEXT,
  progress_photo_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated meal plans
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  check_in_id UUID REFERENCES public.check_ins(id) ON DELETE SET NULL,
  plan_data JSONB NOT NULL,
  ai_generated_content TEXT,
  language TEXT DEFAULT 'en',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated workout plans
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  check_in_id UUID REFERENCES public.check_ins(id) ON DELETE SET NULL,
  plan_data JSONB NOT NULL,
  ai_generated_content TEXT,
  language TEXT DEFAULT 'en',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal completion tracking
CREATE TABLE public.meal_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  meal_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_plan_id, date, meal_index)
);

-- Workout completion tracking
CREATE TABLE public.workout_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  workout_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workout_plan_id, date, workout_index)
);

-- Daily reflections
CREATE TABLE public.daily_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Support tickets (including bug reports)
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  category TEXT CHECK (category IN ('meal_issue', 'workout_issue', 'technical', 'bug_report', 'other')),
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'coach_responded', 'closed')),
  coach_response TEXT,
  screenshot_url TEXT,
  device_info JSONB,
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQs
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending signups (before coach approval)
CREATE TABLE public.pending_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  plan_tier TEXT CHECK (plan_tier IN ('3_months', '6_months', '12_months')),
  payment_screenshot_url TEXT,
  ocr_extracted_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- System config
CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO public.system_config (key, value) VALUES
  ('check_in_frequency_days', '14'),
  ('coach_instapay_account', '{"name": "", "number": ""}');

-- Create indexes for performance
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_check_ins_user_id ON public.check_ins(user_id);
CREATE INDEX idx_check_ins_created_at ON public.check_ins(created_at DESC);
CREATE INDEX idx_meal_plans_user_id ON public.meal_plans(user_id);
CREATE INDEX idx_meal_plans_dates ON public.meal_plans(start_date, end_date);
CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX idx_workout_plans_dates ON public.workout_plans(start_date, end_date);
CREATE INDEX idx_meal_completions_date ON public.meal_completions(date);
CREATE INDEX idx_workout_completions_date ON public.workout_completions(date);
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_pending_signups_status ON public.pending_signups(status);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initial_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own assessment" ON public.initial_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessment" ON public.initial_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own check_ins" ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check_ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own meal_plans" ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal_plans" ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own workout_plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout_plans" ON public.workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal_completions" ON public.meal_completions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workout_completions" ON public.workout_completions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reflections" ON public.daily_reflections FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view FAQs" ON public.faqs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view system_config" ON public.system_config FOR SELECT TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
