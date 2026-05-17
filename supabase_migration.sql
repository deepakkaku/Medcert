-- ============================================================================
-- MedCert Premium — Database Migration
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Project: rnlyhbniofrcwmtujftc
-- ============================================================================

-- 1. PROFILES TABLE (auto-created on Google sign-up)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. CLINICS TABLE
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT DEFAULT '',
  doctor TEXT DEFAULT '',
  degree TEXT DEFAULT '',
  registration_no TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  logo_path TEXT,
  signature TEXT DEFAULT '',
  signature_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clinic"
  ON public.clinics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own clinic"
  ON public.clinics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clinic"
  ON public.clinics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_number INT DEFAULT 1,
  name TEXT NOT NULL,
  age INT NOT NULL DEFAULT 0,
  gender TEXT NOT NULL DEFAULT 'Male',
  contact TEXT DEFAULT '',
  email TEXT,
  dob TEXT,
  blood_group TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON public.patients(clinic_id);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own patients"
  ON public.patients FOR ALL
  USING (
    clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
  )
  WITH CHECK (
    clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
  );

-- 4. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  razorpay_subscription_id TEXT,
  razorpay_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_cycle_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. CERTIFICATES TABLE (history)
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  certificate_data JSONB NOT NULL DEFAULT '{}',
  certificate_type TEXT DEFAULT 'medical',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own certificates"
  ON public.certificates FOR ALL
  USING (
    clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
  )
  WITH CHECK (
    clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
  );

-- 6. AUTO-CREATE PROFILE + CLINIC ON SIGN-UP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email = COALESCE(EXCLUDED.email, profiles.email);

  INSERT INTO public.clinics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. STORAGE BUCKET for logos & signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-assets', 'clinic-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload clinic assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'clinic-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own clinic assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'clinic-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own clinic assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'clinic-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Public can read clinic assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-assets');

-- ============================================================================
-- DONE! Your MedCert Premium database is ready.
-- Next steps:
--   1. Enable Google OAuth in Supabase Dashboard → Authentication → Providers
--   2. Add redirect URL: https://medcert.doctrust.in (and http://localhost:5174 for dev)
--   3. Set the Supabase anon key in premium/.env
-- ============================================================================
