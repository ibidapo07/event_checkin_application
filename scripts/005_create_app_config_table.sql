-- Create app_config table for storing application settings
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create a policy that denies ALL public access
-- This table will only be accessed via Service Role in Server Actions
CREATE POLICY "Deny all public access" ON app_config
  FOR ALL
  USING (false);

-- Add a comment explaining the table's purpose
COMMENT ON TABLE app_config IS 'Stores application configuration like access codes. Only accessible via Service Role.';
