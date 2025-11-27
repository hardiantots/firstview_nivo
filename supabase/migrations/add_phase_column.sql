-- Migration: Add phase column to smoke_free_journey
-- This makes it clearer which schema (PRE_QUIT or POST_QUIT) the journey is in
-- The 'status' column was being used for this purpose, so we'll keep both for compatibility

-- Add phase column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'smoke_free_journey' 
    AND column_name = 'phase'
  ) THEN
    ALTER TABLE public.smoke_free_journey 
    ADD COLUMN phase text DEFAULT 'PRE_QUIT'::text;
    
    -- Copy existing status values to phase
    UPDATE public.smoke_free_journey 
    SET phase = status 
    WHERE phase IS NULL OR phase = 'PRE_QUIT';
    
    -- Add check constraint
    ALTER TABLE public.smoke_free_journey 
    ADD CONSTRAINT smoke_free_journey_phase_check 
    CHECK (phase IN ('PRE_QUIT', 'POST_QUIT'));
  END IF;
END $$;

-- Update status column description for clarity
COMMENT ON COLUMN public.smoke_free_journey.status IS 'Legacy status field - use phase column for PRE_QUIT/POST_QUIT determination';
COMMENT ON COLUMN public.smoke_free_journey.phase IS 'Current journey phase: PRE_QUIT (preparation) or POST_QUIT (smoke-free)';

-- Create index for faster phase queries
CREATE INDEX IF NOT EXISTS idx_smoke_free_journey_phase 
ON public.smoke_free_journey(phase);

-- Create index for user_id + phase combination
CREATE INDEX IF NOT EXISTS idx_smoke_free_journey_user_phase 
ON public.smoke_free_journey(user_id, phase);
