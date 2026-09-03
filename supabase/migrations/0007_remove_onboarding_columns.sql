-- Migration: 0007_remove_onboarding_columns.sql
-- Removes onboarding state tracking columns from the profiles table
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS onboarding_step,
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS onboarding_started_at,
  DROP COLUMN IF EXISTS onboarding_completed_at;

