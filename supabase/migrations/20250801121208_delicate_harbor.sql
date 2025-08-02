/*
  # Add last_run_at column to workflows table

  1. Changes
    - Add `last_run_at` column to track when workflows were last executed
    - This enables proper scheduling functionality for recurring workflows

  2. Notes
    - Column is nullable since existing workflows haven't been run yet
    - Will be updated automatically by the backend when workflows execute
*/

-- Add last_run_at column to workflows table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workflows' AND column_name = 'last_run_at'
  ) THEN
    ALTER TABLE workflows ADD COLUMN last_run_at timestamptz;
  END IF;
END $$;

-- Create index for better performance when querying scheduled workflows
CREATE INDEX IF NOT EXISTS workflows_last_run_at_idx ON workflows(last_run_at);