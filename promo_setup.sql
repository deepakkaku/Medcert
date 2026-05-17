-- 1. Add is_promo column to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT FALSE;

-- 2. Create a table for pre-approved promo emails (Whitelist)
CREATE TABLE IF NOT EXISTS public.whitelisted_promos (
  email TEXT PRIMARY KEY,
  promo_months INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update the handle_new_user() trigger function
-- This function is called automatically when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_whitelisted BOOLEAN;
  v_promo_months INT;
BEGIN
  -- A. Create Profile
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

  -- B. Create Clinic
  INSERT INTO public.clinics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- C. Check for Promo Whitelist
  SELECT EXISTS(SELECT 1 FROM public.whitelisted_promos WHERE email = NEW.email) INTO is_whitelisted;
  
  IF is_whitelisted THEN
    SELECT promo_months FROM public.whitelisted_promos WHERE email = NEW.email INTO v_promo_months;
    
    -- Auto-grant access in subscriptions table with is_promo = TRUE
    INSERT INTO public.subscriptions (user_id, status, current_period_end, is_promo)
    VALUES (NEW.id, 'active', NOW() + (v_promo_months || ' month')::interval, TRUE)
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'active',
      current_period_end = NOW() + (v_promo_months || ' month')::interval,
      is_promo = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Manual Grant for Existing Users (Optional reference)
-- To grant a promo manually to an existing user who is already signed up:
-- UPDATE public.subscriptions 
-- SET status = 'active', 
--     current_period_end = NOW() + INTERVAL '1 month',
--     is_promo = TRUE
-- WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'target-user@gmail.com');
