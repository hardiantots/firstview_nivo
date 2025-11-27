-- NIVO App Database Schema Documentation
-- Updated: 2025-11-27
-- Purpose: Clarify PRE-QUIT vs POST-QUIT data structure

/*
====================================================================================
JOURNEY PHASE MANAGEMENT
====================================================================================
The smoke_free_journey table is the single source of truth for user phase status.
*/

-- smoke_free_journey table structure:
-- - user_id: unique identifier for the user
-- - phase: 'PRE_QUIT' (preparation) or 'POST_QUIT' (smoke-free maintenance)
-- - start_date: 
--   * For PRE_QUIT: target quit date (future)
--   * For POST_QUIT: actual quit date (when they stopped smoking)
-- - target_days: number of preparation days (mainly for PRE_QUIT)
-- - status: legacy field, kept for backward compatibility

/*
====================================================================================
PRE-QUIT SCHEMA (Preparation Phase)
====================================================================================
During PRE-QUIT, users are preparing to quit smoking. They track:
*/

-- 1. Daily consumption tracking (reducing gradually)
-- Table: daily_consumption
-- Purpose: Track cigarettes smoked per day to see reduction progress
-- Key fields:
--   - date: the day of consumption
--   - cigarette_count: number of cigarettes smoked
--   - money_spent: optional spending tracking

-- 2. Craving logs (learning triggers)
-- Table: craving_logs
-- Purpose: Record and analyze craving patterns and triggers
-- Key fields:
--   - occurred_at: timestamp of craving
--   - intensity: 1-5 scale
--   - trigger, location, mood, situation: contextual data
--   - avoided_smoking: boolean - did they resist?
--   - coping_action: what helped them resist

-- 3. Progress tracking
-- Table: progress_tracking
-- Purpose: Daily progress snapshots vs baseline
-- Key fields:
--   - date: tracking date
--   - is_smoke_free: boolean - were they smoke-free that day?
--   - cigarettes_smoked: actual count
--   - progress_vs_target: numeric comparison to baseline

-- 4. Journey metadata
-- Table: smoke_free_journey
-- PRE-QUIT specific fields:
--   - phase: 'PRE_QUIT'
--   - start_date: target quit date (future)
--   - target_days: countdown days to quit date

/*
====================================================================================
POST-QUIT SCHEMA (Smoke-Free Maintenance Phase)
====================================================================================
During POST-QUIT, users maintain their smoke-free status. Focus shifts to:
*/

-- 1. Streak tracking (via smoke_free_journey)
-- Table: smoke_free_journey
-- POST-QUIT specific fields:
--   - phase: 'POST_QUIT'
--   - start_date: actual quit date (when streak began)
--   - Streak days = CURRENT_DATE - start_date

-- 2. Occasional slip tracking (if any)
-- Table: daily_consumption
-- Purpose: Track any relapses to maintain accountability
-- Note: Ideally should be 0 cigarettes for all days

-- 3. Craving resistance tracking
-- Table: craving_logs
-- Purpose: Continue tracking cravings to build resistance
-- Key focus:
--   - avoided_smoking: should be TRUE
--   - intensity: should decrease over time
--   - coping_action: successful strategies

-- 4. Achievement & milestone tracking
-- Table: user_stats
-- Purpose: Track XP, achievements, and milestones
-- Key fields:
--   - total_xp: cumulative experience points
--   - rejected_craving_count: total cravings resisted
--   - completed_achievements: JSON array of achievement IDs

/*
====================================================================================
SHARED TABLES (Used in Both Phases)
====================================================================================
*/

-- user_profile: Personal information and preferences
-- Fields:
--   - motivations: text[] - up to 2 motivations selected during onboarding
--   - smoking_pattern: legacy field, not actively used
--   - phase information should come from smoke_free_journey.phase

-- user_stats: Gamification data
-- Fields:
--   - total_xp: accumulated across both phases
--   - rejected_craving_count: total from PRE and POST
--   - completed_achievements: milestone IDs (both PRE and POST)

/*
====================================================================================
KEY QUERIES
====================================================================================
*/

-- Get current user phase
SELECT phase, start_date, target_days 
FROM smoke_free_journey 
WHERE user_id = 'USER_ID';

-- PRE-QUIT: Get recent consumption trend
SELECT date, cigarette_count 
FROM daily_consumption 
WHERE user_id = 'USER_ID' 
ORDER BY date DESC 
LIMIT 7;

-- PRE-QUIT: Calculate savings (baseline 20 cigs/day @ 1750 IDR)
SELECT 
  date,
  (20 - cigarette_count) * 1750 AS daily_savings
FROM daily_consumption 
WHERE user_id = 'USER_ID' AND cigarette_count < 20
ORDER BY date DESC;

-- POST-QUIT: Calculate streak
SELECT 
  phase,
  CURRENT_DATE - start_date AS streak_days
FROM smoke_free_journey 
WHERE user_id = 'USER_ID' AND phase = 'POST_QUIT';

-- POST-QUIT: Calculate total savings
SELECT 
  (CURRENT_DATE - start_date) * 20 * 1750 AS total_savings
FROM smoke_free_journey 
WHERE user_id = 'USER_ID' AND phase = 'POST_QUIT';

-- Get craving intensity trend (both phases)
SELECT 
  DATE_TRUNC('day', occurred_at) as day,
  AVG(intensity) as avg_intensity,
  COUNT(*) as craving_count
FROM craving_logs 
WHERE user_id = 'USER_ID' 
GROUP BY DATE_TRUNC('day', occurred_at)
ORDER BY day DESC 
LIMIT 30;
