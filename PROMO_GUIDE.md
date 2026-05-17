# 1-Month Free Promo Implementation Guide

This guide explains how to implement a 1-month free promotional period for specific users using their Gmail addresses. The system uses a **Whitelist** approach to automatically grant access upon sign-up.

## 1. Database Setup (Supabase SQL)

Run these commands in the Supabase SQL Editor to create the whitelist table and update the user creation logic.

### Create Whitelist Table
```sql
-- Create a table for pre-approved promo emails
CREATE TABLE IF NOT EXISTS public.whitelisted_promos (
  email TEXT PRIMARY KEY,
  promo_months INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example: Add a user to the whitelist
-- INSERT INTO public.whitelisted_promos (email) VALUES ('example@gmail.com');
```

### Update handle_new_user Trigger
This replaces your existing function to check the whitelist during sign-up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_whitelisted BOOLEAN;
  v_promo_months INT;
BEGIN
  -- 1. Create Profile
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

  -- 2. Create Clinic
  INSERT INTO public.clinics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Check for Promo Whitelist
  SELECT EXISTS(SELECT 1 FROM public.whitelisted_promos WHERE email = NEW.email) INTO is_whitelisted;
  
  IF is_whitelisted THEN
    SELECT promo_months FROM public.whitelisted_promos WHERE email = NEW.email INTO v_promo_months;
    
    -- Auto-grant access in subscriptions table
    INSERT INTO public.subscriptions (user_id, status, current_period_end)
    VALUES (NEW.id, 'active', NOW() + (v_promo_months || ' month')::interval)
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'active',
      current_period_end = NOW() + (v_promo_months || ' month')::interval;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 2. Frontend Logic Update

We need to update the SubscriptionPage.tsx or /subscribe page to show this is a promo and not a paid plan.
```

## 3. Operations

### For New Users
1. Add their email to `whitelisted_promos` table.
2. Ask them to sign up using Google.
3. They will immediately have Premium access.

### For Existing Users (Manual Grant)
If the user already has an account, run this SQL:
```sql
UPDATE public.subscriptions 
SET status = 'active', 
    current_period_end = NOW() + INTERVAL '1 month' 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'their-email@gmail.com');
```

## 4. How Expiry Works
Once the `current_period_end` date is in the past:
1. The `isActive` check in the frontend will become `false`.
2. The `SubscriptionGate` will automatically block access.
3. The user will be prompted to choose a paid plan to continue.
