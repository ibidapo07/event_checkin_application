-- Harden check_ins table RLS policies
-- Drop all existing insecure policies
DROP POLICY IF EXISTS "Anyone can insert" ON check_ins;
DROP POLICY IF EXISTS "Anyone can read" ON check_ins;
DROP POLICY IF EXISTS "Anyone can update" ON check_ins;
DROP POLICY IF EXISTS "Anyone can delete" ON check_ins;
DROP POLICY IF EXISTS "Enable insert for all users" ON check_ins;
DROP POLICY IF EXISTS "Enable read access for all users" ON check_ins;
DROP POLICY IF EXISTS "Enable update for all users" ON check_ins;
DROP POLICY IF EXISTS "Enable delete for all users" ON check_ins;
DROP POLICY IF EXISTS "Public can insert check_ins" ON check_ins;
DROP POLICY IF EXISTS "Public can update check_ins" ON check_ins;
DROP POLICY IF EXISTS "Public can delete check_ins" ON check_ins;

-- Ensure RLS is enabled
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Create a new read-only policy for public access
CREATE POLICY "Public can view check_ins" ON check_ins
  FOR SELECT
  USING (true);

-- No insert, update, or delete policies for public
-- All writes must happen via Server Actions using Service Role

-- Add comment explaining the security model
COMMENT ON POLICY "Public can view check_ins" ON check_ins IS 'Public can only read check_ins. All modifications require Service Role access.';
