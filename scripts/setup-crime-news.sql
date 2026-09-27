-- Create the crime_news table
CREATE TABLE IF NOT EXISTS crime_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    extracted_location TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    crime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS crime_news_published_at_idx ON crime_news (published_at DESC);
CREATE INDEX IF NOT EXISTS crime_news_crime_type_idx ON crime_news (crime_type);

-- Enable Row Level Security (RLS)
ALTER TABLE crime_news ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can tighten in production)
CREATE POLICY "Allow all operations" ON crime_news
    FOR ALL USING (true) WITH CHECK (true);
