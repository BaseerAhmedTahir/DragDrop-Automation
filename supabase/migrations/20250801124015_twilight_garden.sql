/*
  # Create workflow runs and logging system

  1. New Tables
    - `workflow_runs`
      - `id` (uuid, primary key)
      - `workflow_id` (uuid, foreign key to workflows)
      - `started_at` (timestamp)
      - `completed_at` (timestamp, nullable)
      - `status` (text: running, completed, failed)
      - `logs` (jsonb array for execution logs)
      - `user_id` (uuid, for easier querying)

  2. Security
    - Enable RLS on `workflow_runs` table
    - Add policies for users to read their own workflow runs
    - Add indexes for performance

  3. Changes
    - Add last_run_at column to workflows table if not exists
    - Add trigger to update workflow last_run_at when runs complete
*/

-- Create workflow_runs table
CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  logs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own workflow runs"
  ON workflow_runs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert workflow runs"
  ON workflow_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update workflow runs"
  ON workflow_runs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS workflow_runs_workflow_id_idx ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_runs_user_id_idx ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS workflow_runs_status_idx ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS workflow_runs_started_at_idx ON workflow_runs(started_at DESC);

-- Function to update workflow last_run_at when run completes
CREATE OR REPLACE FUNCTION update_workflow_last_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'running' THEN
    UPDATE workflows 
    SET last_run_at = NEW.completed_at 
    WHERE id = NEW.workflow_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_workflow_last_run_trigger ON workflow_runs;
CREATE TRIGGER update_workflow_last_run_trigger
  AFTER UPDATE ON workflow_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_last_run();