-- Create check-ins table to track when host QR codes are scanned
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  guest_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access (for demo purposes)
CREATE POLICY "Allow public read access" ON check_ins FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON check_ins FOR UPDATE USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_check_ins_host_id ON check_ins(host_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_at ON check_ins(checked_in_at);
