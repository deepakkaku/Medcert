-- Add has_completed_walkthrough to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_walkthrough BOOLEAN DEFAULT FALSE;
