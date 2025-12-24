-- Harden hosts table RLS policies
-- Drop all existing insecure policies
DROP POLICY IF EXISTS "Anyone can insert" ON hosts;
DROP POLICY IF EXISTS "Anyone can read" ON hosts;
DROP POLICY IF EXISTS "Anyone can update" ON hosts;
DROP POLICY IF EXISTS "Anyone can delete" ON hosts;
DROP POLICY IF EXISTS "Enable insert for all users" ON hosts;
DROP POLICY IF EXISTS "Enable read access for all users" ON hosts;
DROP POLICY IF EXISTS "Enable update for all users" ON hosts;
DROP POLICY IF EXISTS "Enable delete for all users" ON hosts;
DROP POLICY IF EXISTS "Public can insert hosts" ON hosts;
DROP POLICY IF EXISTS "Public can update hosts" ON hosts;
DROP POLICY IF EXISTS "Public can delete hosts" ON hosts;

-- Ensure RLS is enabled
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;

-- Create a new read-only policy for public access
CREATE POLICY "Public can view hosts" ON hosts
  FOR SELECT
  USING (true);

-- No insert, update, or delete policies for public
-- All writes must happen via Server Actions using Service Role

-- Add comment explaining the security model
COMMENT ON POLICY "Public can view hosts" ON hosts IS 'Public can only read hosts. All modifications require Service Role access.';
