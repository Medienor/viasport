-- Create fotball_standings table
CREATE TABLE IF NOT EXISTS fotball_standings (
  id BIGSERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL,
  goals_diff INTEGER NOT NULL,
  group_name TEXT,
  form TEXT,
  status TEXT,
  description TEXT,
  
  -- Match statistics
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  
  -- Home record
  home_played INTEGER NOT NULL DEFAULT 0,
  home_wins INTEGER NOT NULL DEFAULT 0,
  home_draws INTEGER NOT NULL DEFAULT 0,
  home_losses INTEGER NOT NULL DEFAULT 0,
  home_goals_for INTEGER NOT NULL DEFAULT 0,
  home_goals_against INTEGER NOT NULL DEFAULT 0,
  
  -- Away record  
  away_played INTEGER NOT NULL DEFAULT 0,
  away_wins INTEGER NOT NULL DEFAULT 0,
  away_draws INTEGER NOT NULL DEFAULT 0,
  away_losses INTEGER NOT NULL DEFAULT 0,
  away_goals_for INTEGER NOT NULL DEFAULT 0,
  away_goals_against INTEGER NOT NULL DEFAULT 0,
  
  -- Team information (for convenience)
  team_name TEXT,
  team_logo TEXT,
  
  -- Raw data storage
  data JSONB,
  
  -- Timestamps
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(league_id, season, team_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fotball_standings_league_season ON fotball_standings(league_id, season);
CREATE INDEX IF NOT EXISTS idx_fotball_standings_team ON fotball_standings(team_id);
CREATE INDEX IF NOT EXISTS idx_fotball_standings_rank ON fotball_standings(league_id, season, rank);
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
COMMENT ON TABLE fotball_standings IS 'Stores football league standings data for all teams across different leagues and seasons';
COMMENT ON COLUMN fotball_standings.league_id IS 'RapidAPI league ID';
COMMENT ON COLUMN fotball_standings.season IS 'Season year (e.g., 2024 for 2024/25 season)';
COMMENT ON COLUMN fotball_standings.team_id IS 'RapidAPI team ID';
COMMENT ON COLUMN fotball_standings.rank IS 'Current position in the league table';
COMMENT ON COLUMN fotball_standings.goals_diff IS 'Goal difference (goals_for - goals_against)';
COMMENT ON COLUMN fotball_standings.form IS 'Recent form (e.g., "WWLDL")';
COMMENT ON COLUMN fotball_standings.data IS 'Full JSON response from RapidAPI for additional data'; 