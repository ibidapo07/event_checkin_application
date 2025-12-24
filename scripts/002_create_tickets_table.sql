-- Create tickets table for guest ticketing system
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  ticket_code TEXT UNIQUE NOT NULL,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Allow public access for the party planner
CREATE POLICY "Allow public read access" ON tickets
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON tickets
  FOR UPDATE USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_host_id ON tickets(host_id);
