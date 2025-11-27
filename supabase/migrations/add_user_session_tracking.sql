-- Migration: Add user session and tracking columns
-- Date: 2025-11-27
-- Purpose: Move localStorage data to Supabase for better data persistence

/*
====================================================================================
ANALISIS DATA DI LOCALSTORAGE YANG PERLU DIPINDAH KE SUPABASE
====================================================================================

KATEGORI 1: SESSION & AUTH (Tetap di localStorage - OK)
- userToken: Access token dari Supabase Auth (security sensitive)
- userId: Sudah ada di Supabase Auth
- userEmail: Sudah ada di Supabase Auth
- lastLoginAt: Session management
- sessionMaxAgeDays: Session config
- loginMethod: Session info
- rememberMe: Browser preference
- savedEmail: Browser preference
- resetEmail: Temporary reset flow data

KATEGORI 2: USER PREFERENCES & SETTINGS (PERLU DIPINDAH)
✅ motivations → user_profile.motivations (SUDAH ADA)
✅ userPhase → smoke_free_journey.phase (SUDAH ADA)
✅ quitDate → smoke_free_journey.start_date (SUDAH ADA)
✅ selectedDays → smoke_free_journey.target_days (SUDAH ADA)
❌ countdownDays → PERLU DIHITUNG DARI quitDate
❌ streakDays → PERLU DIHITUNG DARI smoke_free_journey.start_date
❌ homeMoneySaved → PERLU KOLOM BARU: user_stats.total_money_saved
❌ userCondition → DUPLIKAT dari smoke_free_journey.phase

KATEGORI 3: CONSUMPTION & TRACKING (PERLU DIPINDAH)
✅ daily_consumption → daily_consumption table (SUDAH ADA)
❌ consumptionLogs → DUPLIKAT dari daily_consumption
✅ craving logs → craving_logs table (SUDAH ADA)
❌ cravingDetail → TEMPORARY UI state (OK di localStorage)

KATEGORI 4: AI & ACHIEVEMENTS (PERLU DIPINDAH)
❌ aiResultData → PERLU TABEL BARU: ai_suggestions
❌ hasRejectedOnce → PERLU KOLOM: user_stats.has_rejected_craving_once
❌ hasProductiveReplacement → PERLU KOLOM: user_stats.has_productive_replacement

====================================================================================
*/

-- 1. Add tracking columns to user_stats
DO $$ 
BEGIN
    -- Add total_money_saved column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_stats' 
        AND column_name = 'total_money_saved'
    ) THEN
        ALTER TABLE public.user_stats 
        ADD COLUMN total_money_saved BIGINT DEFAULT 0;
        
        COMMENT ON COLUMN public.user_stats.total_money_saved IS 
        'Total money saved from reducing/quitting smoking (in IDR)';
    END IF;

    -- Add has_rejected_craving_once column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_stats' 
        AND column_name = 'has_rejected_craving_once'
    ) THEN
        ALTER TABLE public.user_stats 
        ADD COLUMN has_rejected_craving_once BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN public.user_stats.has_rejected_craving_once IS 
        'Achievement flag: user has rejected a craving at least once';
    END IF;

    -- Add has_productive_replacement column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_stats' 
        AND column_name = 'has_productive_replacement'
    ) THEN
        ALTER TABLE public.user_stats 
        ADD COLUMN has_productive_replacement BOOLEAN DEFAULT FALSE;
        
        COMMENT ON COLUMN public.user_stats.has_productive_replacement IS 
        'Achievement flag: user has recorded a productive replacement activity';
    END IF;

    -- Add baseline_consumption column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_stats' 
        AND column_name = 'baseline_consumption'
    ) THEN
        ALTER TABLE public.user_stats 
        ADD COLUMN baseline_consumption INTEGER DEFAULT 20;
        
        COMMENT ON COLUMN public.user_stats.baseline_consumption IS 
        'Baseline cigarettes per day before attempting to quit (default: 20)';
    END IF;

    -- Add price_per_cigarette column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_stats' 
        AND column_name = 'price_per_cigarette'
    ) THEN
        ALTER TABLE public.user_stats 
        ADD COLUMN price_per_cigarette INTEGER DEFAULT 1750;
        
        COMMENT ON COLUMN public.user_stats.price_per_cigarette IS 
        'Price per cigarette in IDR (default: 1750)';
    END IF;
END $$;

-- 2. Create ai_suggestions table for storing AI-generated suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL, -- 'craving_support', 'motivation', 'health_tip', etc.
    content TEXT NOT NULL,
    intensity INTEGER, -- Related craving intensity if applicable
    triggers TEXT[], -- Array of triggers that prompted this suggestion
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiry for time-sensitive suggestions
    is_read BOOLEAN DEFAULT FALSE,
    is_helpful BOOLEAN, -- User feedback on suggestion
    
    CONSTRAINT ai_suggestions_intensity_check CHECK (intensity IS NULL OR (intensity >= 1 AND intensity <= 5))
);

COMMENT ON TABLE public.ai_suggestions IS 
'Stores AI-generated suggestions and tips for users during their smoke-free journey';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id 
ON public.ai_suggestions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at 
ON public.ai_suggestions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type_user 
ON public.ai_suggestions(suggestion_type, user_id);

-- Enable RLS
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_suggestions
DROP POLICY IF EXISTS "Users can view their own AI suggestions" ON public.ai_suggestions;
CREATE POLICY "Users can view their own AI suggestions"
ON public.ai_suggestions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI suggestions" ON public.ai_suggestions;
CREATE POLICY "Users can insert their own AI suggestions"
ON public.ai_suggestions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI suggestions" ON public.ai_suggestions;
CREATE POLICY "Users can update their own AI suggestions"
ON public.ai_suggestions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Create helper view for calculated streak and countdown
CREATE OR REPLACE VIEW public.user_journey_stats AS
SELECT 
    sj.user_id,
    sj.phase,
    sj.start_date,
    sj.target_days,
    
    -- Calculate countdown days for PRE_QUIT
    CASE 
        WHEN sj.phase = 'PRE_QUIT' THEN 
            GREATEST(0, (sj.start_date - CURRENT_DATE))
        ELSE 0 
    END AS countdown_days,
    
    -- Calculate streak days for POST_QUIT
    CASE 
        WHEN sj.phase = 'POST_QUIT' THEN 
            (CURRENT_DATE - sj.start_date)
        ELSE 0 
    END AS streak_days,
    
    -- Calculate total money saved based on phase
    CASE 
        WHEN sj.phase = 'POST_QUIT' THEN
            -- POST_QUIT: streak_days * baseline * price
            (CURRENT_DATE - sj.start_date) * 
            COALESCE(us.baseline_consumption, 20) * 
            COALESCE(us.price_per_cigarette, 1750)
        ELSE
            -- PRE_QUIT: sum of daily savings from consumption logs
            COALESCE((
                SELECT SUM(
                    (COALESCE(us.baseline_consumption, 20) - COALESCE(dc.cigarette_count, 0)) * 
                    COALESCE(us.price_per_cigarette, 1750)
                )
                FROM daily_consumption dc
                WHERE dc.user_id = sj.user_id 
                AND COALESCE(dc.cigarette_count, 0) < COALESCE(us.baseline_consumption, 20)
            ), 0)
    END AS calculated_money_saved,
    
    us.total_money_saved AS stored_money_saved,
    us.total_xp,
    us.rejected_craving_count,
    us.has_rejected_craving_once,
    us.has_productive_replacement
    
FROM smoke_free_journey sj
LEFT JOIN user_stats us ON sj.user_id = us.user_id;

COMMENT ON VIEW public.user_journey_stats IS 
'Calculated view combining journey status with real-time calculated metrics';

-- Grant permissions
GRANT SELECT ON public.user_journey_stats TO authenticated;

-- 4. Create function to sync money_saved to user_stats
CREATE OR REPLACE FUNCTION public.update_user_money_saved()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_money_saved in user_stats when daily_consumption changes
    UPDATE user_stats
    SET total_money_saved = (
        SELECT COALESCE(SUM(
            (COALESCE(user_stats.baseline_consumption, 20) - COALESCE(dc.cigarette_count, 0)) * 
            COALESCE(user_stats.price_per_cigarette, 1750)
        ), 0)
        FROM daily_consumption dc
        WHERE dc.user_id = NEW.user_id 
        AND COALESCE(dc.cigarette_count, 0) < COALESCE(user_stats.baseline_consumption, 20)
    )
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update money_saved
DROP TRIGGER IF EXISTS trigger_update_money_saved ON daily_consumption;
CREATE TRIGGER trigger_update_money_saved
AFTER INSERT OR UPDATE ON daily_consumption
FOR EACH ROW
EXECUTE FUNCTION public.update_user_money_saved();

COMMENT ON FUNCTION public.update_user_money_saved() IS 
'Automatically updates total_money_saved in user_stats when consumption is logged';

-- 5. Migration script to populate existing data
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Update total_money_saved for all existing users
    FOR user_record IN 
        SELECT DISTINCT user_id FROM smoke_free_journey
    LOOP
        -- Ensure user_stats record exists
        INSERT INTO user_stats (user_id)
        VALUES (user_record.user_id)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Calculate and update money saved
        UPDATE user_stats us
        SET total_money_saved = (
            SELECT COALESCE(SUM(
                (COALESCE(us.baseline_consumption, 20) - COALESCE(dc.cigarette_count, 0)) * 
                COALESCE(us.price_per_cigarette, 1750)
            ), 0)
            FROM daily_consumption dc
            WHERE dc.user_id = user_record.user_id 
            AND COALESCE(dc.cigarette_count, 0) < COALESCE(us.baseline_consumption, 20)
        )
        WHERE us.user_id = user_record.user_id;
    END LOOP;
END $$;

-- Summary of changes
SELECT 
    'Migration completed successfully. Added columns:' AS status
UNION ALL SELECT '- user_stats.total_money_saved'
UNION ALL SELECT '- user_stats.has_rejected_craving_once'
UNION ALL SELECT '- user_stats.has_productive_replacement'
UNION ALL SELECT '- user_stats.baseline_consumption'
UNION ALL SELECT '- user_stats.price_per_cigarette'
UNION ALL SELECT 'Created table: ai_suggestions'
UNION ALL SELECT 'Created view: user_journey_stats'
UNION ALL SELECT 'Created trigger: update_user_money_saved';
