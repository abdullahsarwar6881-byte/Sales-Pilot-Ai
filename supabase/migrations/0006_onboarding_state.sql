-- Migration: 0006_onboarding_state.sql
-- Adds onboarding state tracking columns to the profiles table

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

