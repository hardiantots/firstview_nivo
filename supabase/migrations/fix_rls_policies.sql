-- Migration: Fix RLS policies for craving_logs and user_stats
-- Date: 2025-11-27
-- Purpose: Enable proper INSERT permissions for authenticated users

/*
====================================================================================
FIX CRAVING_LOGS RLS POLICIES
====================================================================================
*/

-- Enable RLS if not already enabled
ALTER TABLE public.craving_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own craving logs" ON public.craving_logs;
DROP POLICY IF EXISTS "Users can insert their own craving logs" ON public.craving_logs;
DROP POLICY IF EXISTS "Users can update their own craving logs" ON public.craving_logs;
DROP POLICY IF EXISTS "Users can delete their own craving logs" ON public.craving_logs;

-- Create comprehensive RLS policies for craving_logs
CREATE POLICY "Users can view their own craving logs"
ON public.craving_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own craving logs"
ON public.craving_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own craving logs"
ON public.craving_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own craving logs"
ON public.craving_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own craving logs" ON public.craving_logs IS 
'Allow users to read their own craving logs';

COMMENT ON POLICY "Users can insert their own craving logs" ON public.craving_logs IS 
'Allow users to create new craving logs for themselves';

/*
====================================================================================
FIX USER_STATS RLS POLICIES
====================================================================================
*/

-- Enable RLS if not already enabled
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;

-- Create comprehensive RLS policies for user_stats
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
ON public.user_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own stats" ON public.user_stats IS 
'Allow users to read their own statistics';

COMMENT ON POLICY "Users can insert their own stats" ON public.user_stats IS 
'Allow users to create their own stats record';

COMMENT ON POLICY "Users can update their own stats" ON public.user_stats IS 
'Allow users to update their own statistics';

/*
====================================================================================
FIX DAILY_CONSUMPTION RLS POLICIES
====================================================================================
*/

-- Enable RLS if not already enabled
ALTER TABLE public.daily_consumption ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own consumption" ON public.daily_consumption;
DROP POLICY IF EXISTS "Users can insert their own consumption" ON public.daily_consumption;
DROP POLICY IF EXISTS "Users can update their own consumption" ON public.daily_consumption;
DROP POLICY IF EXISTS "Users can delete their own consumption" ON public.daily_consumption;

-- Create comprehensive RLS policies for daily_consumption
CREATE POLICY "Users can view their own consumption"
ON public.daily_consumption FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consumption"
ON public.daily_consumption FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consumption"
ON public.daily_consumption FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consumption"
ON public.daily_consumption FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

/*
====================================================================================
FIX SMOKE_FREE_JOURNEY RLS POLICIES
====================================================================================
*/

-- Enable RLS if not already enabled
ALTER TABLE public.smoke_free_journey ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own journey" ON public.smoke_free_journey;
DROP POLICY IF EXISTS "Users can insert their own journey" ON public.smoke_free_journey;
DROP POLICY IF EXISTS "Users can update their own journey" ON public.smoke_free_journey;

-- Create comprehensive RLS policies for smoke_free_journey
CREATE POLICY "Users can view their own journey"
ON public.smoke_free_journey FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journey"
ON public.smoke_free_journey FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journey"
ON public.smoke_free_journey FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

/*
====================================================================================
FIX USER_PROFILE RLS POLICIES
====================================================================================
*/

-- Enable RLS if not already enabled
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profile;

-- Create comprehensive RLS policies for user_profile
CREATE POLICY "Users can view their own profile"
ON public.user_profile FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profile FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profile FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

/*
====================================================================================
VERIFICATION QUERIES
====================================================================================
*/

-- Verify all policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'craving_logs', 
    'user_stats', 
    'daily_consumption', 
    'smoke_free_journey', 
    'user_profile',
    'ai_suggestions'
)
ORDER BY tablename, policyname;

-- Summary
SELECT 
    'RLS policies fixed successfully for all tables' AS status
UNION ALL 
SELECT '- craving_logs: SELECT, INSERT, UPDATE, DELETE policies added'
UNION ALL 
SELECT '- user_stats: SELECT, INSERT, UPDATE policies added'
UNION ALL 
SELECT '- daily_consumption: SELECT, INSERT, UPDATE, DELETE policies added'
UNION ALL 
SELECT '- smoke_free_journey: SELECT, INSERT, UPDATE policies added'
UNION ALL 
SELECT '- user_profile: SELECT, INSERT, UPDATE policies added'
UNION ALL 
SELECT '- ai_suggestions: policies already exist from previous migration';
