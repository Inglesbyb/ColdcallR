ALTER TABLE outcode_stats ADD COLUMN IF NOT EXISTS crime_breakdown JSONB DEFAULT '{}'::jsonb;
