/*
  # Fix Milestones Sub-Subtask Support

  1. Changes
    - Make `subtask_id` column nullable to support sub-subtask milestones
    - Previously the column was NOT NULL which prevented adding milestones to sub-subtasks
    - The check constraint already exists to ensure one of subtask_id or sub_subtask_id is set
*/

-- Make subtask_id nullable to allow milestones on sub-subtasks
DO $$
BEGIN
  ALTER TABLE milestones ALTER COLUMN subtask_id DROP NOT NULL;
END $$;