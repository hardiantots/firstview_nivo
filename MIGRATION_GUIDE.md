# Database Migration Guide

## Issue: Duplicate Daily Consumption Entries

### Problem

The `daily_consumption` table was missing a UNIQUE constraint on `(user_id, date)`, causing duplicate entries when users logged their consumption multiple times on the same day. This resulted in:

- Incorrect chart data in TrackerPage
- Inflated statistics
- Data inconsistency

### Solution Applied

#### 1. Code Fix (Immediate)

Updated `HomePage.tsx` to check for existing entries before insert:

```typescript
// Check if entry exists for today first
const { data: existing } = await supabase
  .from("daily_consumption")
  .select("id")
  .eq("user_id", userId)
  .eq("date", today)
  .maybeSingle();

if (existing) {
  // Update existing record
  await supabase
    .from("daily_consumption")
    .update({...})
    .eq("id", existing.id);
} else {
  // Insert new record
  await supabase
    .from("daily_consumption")
    .insert({...});
}
```

#### 2. Database Migration (Required)

Run the migration file in Supabase SQL Editor:

**File:** `supabase/migrations/add_daily_consumption_unique_constraint.sql`

This migration will:

1. Remove duplicate entries (keeping the most recent)
2. Add UNIQUE constraint on `(user_id, date)`
3. Create index for better query performance

### How to Apply Migration

1. **Go to Supabase Dashboard**

   - Navigate to your project
   - Go to SQL Editor

2. **Run Migration**

   - Copy content from `supabase/migrations/add_daily_consumption_unique_constraint.sql`
   - Paste into SQL Editor
   - Execute the query

3. **Verify**
   ```sql
   -- Check constraint was added
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'daily_consumption'
   AND constraint_type = 'UNIQUE';
   ```

### Testing After Migration

1. **Test Insert Behavior**

   - Go to HomePage
   - Log consumption for today
   - Log different amount for same day
   - Verify: Only one entry exists in database

2. **Test Chart Display**

   - Go to TrackerPage
   - Verify: Chart shows correct data
   - Verify: No duplicate data points

3. **Check Database**
   ```sql
   -- Should show max 1 row per user per day
   SELECT user_id, date, COUNT(*)
   FROM daily_consumption
   GROUP BY user_id, date
   HAVING COUNT(*) > 1;
   -- Should return 0 rows
   ```

## Files Modified

- `src/components/HomePage/HomePage.tsx` - Fixed upsert logic
- `supabase/migrations/add_daily_consumption_unique_constraint.sql` - New migration file
- `MIGRATION_GUIDE.md` - This documentation

## Related Issues

- Grafik TrackerPage tidak update setelah input di HomePage
- Data consumption tercatat duplikat
- Statistical calculation incorrect

## Date Applied

2025-11-27
