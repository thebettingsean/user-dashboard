-- Add bracket name column to existing brackets table
-- Run this if you've already created the tables without the name column

-- Add name column (nullable first, then we'll make it required)
ALTER TABLE nfl_playoff_brackets 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing brackets with a default name if they don't have one
UPDATE nfl_playoff_brackets 
SET name = 'Bracket ' || id::text 
WHERE name IS NULL OR name = '';

-- Make name required and add unique constraint per group
ALTER TABLE nfl_playoff_brackets 
ALTER COLUMN name SET NOT NULL;

-- Add unique constraint for bracket names per group
-- Note: This will fail if there are duplicate names in the same group
-- You may need to clean up duplicates first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'nfl_playoff_brackets_group_id_name_key'
  ) THEN
    ALTER TABLE nfl_playoff_brackets 
    ADD CONSTRAINT nfl_playoff_brackets_group_id_name_key 
    UNIQUE (group_id, name);
  END IF;
END $$;

