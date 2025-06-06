-- Create simple fotball_standings table
CREATE TABLE IF NOT EXISTS fotball_standings (
  id BIGSERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(league_id, season)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fotball_standings_league_season ON fotball_standings(league_id, season);
CREATE INDEX IF NOT EXISTS idx_fotball_standings_last_updated ON fotball_standings(last_updated);

-- Enable Row Level Security (RLS)
ALTER TABLE fotball_standings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON fotball_standings
  FOR SELECT USING (true);

-- Create policy to allow service role full access
CREATE POLICY "Allow service role full access" ON fotball_standings
  FOR ALL USING (auth.role() = 'service_role');

-- Add helpful comments
COMMENT ON TABLE fotball_standings IS 'Stores raw football league standings data from RapidAPI';
COMMENT ON COLUMN fotball_standings.league_id IS 'RapidAPI league ID';
COMMENT ON COLUMN fotball_standings.season IS 'Season year (e.g., 2024 for 2024/25 season)';
COMMENT ON COLUMN fotball_standings.raw_data IS 'Complete raw JSON response from RapidAPI standings endpoint'; 