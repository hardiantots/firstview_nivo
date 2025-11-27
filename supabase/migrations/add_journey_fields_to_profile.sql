-- Migration: Add journey_start_date, selected_preparation_days, and actual_quit_date to user_profile
-- Purpose: Store PRE-QUIT and POST-QUIT data for cross-device sync
-- Date: 2025-11-27

-- Add columns to user_profile table
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS journey_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS selected_preparation_days INTEGER,
ADD COLUMN IF NOT EXISTS actual_quit_date TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profile.journey_start_date IS 'Date when user started their quit smoking journey (PRE-QUIT phase begins)';
COMMENT ON COLUMN public.user_profile.selected_preparation_days IS 'Number of days user selected for preparation period (30, 45, 60, or 90)';
COMMENT ON COLUMN public.user_profile.actual_quit_date IS 'Date when user actually quit smoking (transition to POST-QUIT)';

-- No RLS policies needed - these columns inherit existing user_profile RLS policies
