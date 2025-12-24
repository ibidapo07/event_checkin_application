-- Add a unique code column to hosts table for QR code generation
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Generate unique codes for existing hosts
UPDATE hosts SET code = gen_random_uuid()::text WHERE code IS NULL;
