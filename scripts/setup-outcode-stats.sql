-- Create the outcode_stats table
CREATE TABLE IF NOT EXISTS outcode_stats (
    outcode TEXT PRIMARY KEY,
    avg_house_price INTEGER,
    crime_count INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE outcode_stats ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can tighten in production)
CREATE POLICY "Allow all operations" ON outcode_stats
    FOR ALL USING (true) WITH CHECK (true);
