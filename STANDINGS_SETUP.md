# Football Standings Setup Guide

This guide will help you set up the football standings functionality for your Viasport app.

## 1. Create the Database Table

First, run the SQL script to create the `fotball_standings` table in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the content from `supabase/standings-table.sql`
4. Run the query

The table will include:
- League and season filtering capabilities
- Complete team statistics (overall, home, away)
- Team ranking and points
- Form data and status descriptions
- Full JSON data storage for future extensibility

## 1.1. Ensure Leagues Table Exists

Make sure you have a `leagues` table populated with league data. The function will fetch all leagues from this table:

```sql
-- Check if you have leagues data
SELECT COUNT(*) FROM leagues;

-- View sample leagues
SELECT id, name, type, country FROM leagues LIMIT 10;
```

If you don't have this table, you'll need to populate it with league data from your RapidAPI or other sources.

## 2. Set Up Environment Variables

Make sure you have the following secrets configured in your Supabase project:

1. Go to Project Settings → Secrets in your Supabase dashboard
2. Add your RapidAPI key with the name `RAPIDAPI_KEY`

The following environment variables are automatically available in Supabase Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. Deploy the Edge Function

Deploy the standings function to your Supabase project:

```bash
# Navigate to your project directory
cd viasport-app

# Deploy the function
supabase functions deploy fetch-football-standings
```

## 4. Test the Function

Test the function manually:

```bash
# Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual values
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-football-standings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 5. Set Up Automated Updates

### Option A: Using Supabase Cron Jobs

If you have access to Supabase's cron jobs (Pro plan and above), create a scheduled function:

```sql
-- Run standings update daily at 6 AM UTC
SELECT cron.schedule(
  'update-football-standings',
  '0 6 * * *',
  'SELECT net.http_post(
    url := ''https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-football-standings'',
    headers := jsonb_build_object(''Authorization'', ''Bearer YOUR_SERVICE_ROLE_KEY'')
  )'
);
```

### Option B: External Cron Job

Set up an external cron job (e.g., GitHub Actions, Vercel Cron, or your server):

```yaml
# .github/workflows/update-standings.yml
name: Update Football Standings
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
jobs:
  update-standings:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Supabase Function
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/fetch-football-standings \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

## 6. Query the Data

Once the table is populated, you can query standings data:

```typescript
// Get standings for a specific league and season
const { data: standings } = await supabase
  .from('fotball_standings')
  .select('*')
  .eq('league_id', 39) // Premier League
  .eq('season', 2024)
  .order('rank', { ascending: true });

// Get standings for multiple leagues
const { data: standings } = await supabase
  .from('fotball_standings')
  .select('*')
  .in('league_id', [39, 140, 135]) // Premier League, La Liga, Serie A
  .eq('season', 2024)
  .order('league_id, rank');

// Get team's position across all leagues
const { data: teamStandings } = await supabase
  .from('fotball_standings')
  .select('*')
  .eq('team_id', 50) // Manchester City
  .eq('season', 2024);
```

## 7. Frontend Integration

Create a standings component in your Next.js app:

```typescript
// src/components/StandingsTable.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Standing {
  rank: number;
  team_name: string;
  team_logo: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goals_diff: number;
  points: number;
  form: string;
}

export function StandingsTable({ leagueId, season }: { leagueId: number; season: number }) {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStandings() {
      const { data, error } = await supabase
        .from('fotball_standings')
        .select('*')
        .eq('league_id', leagueId)
        .eq('season', season)
        .order('rank', { ascending: true });

      if (data && !error) {
        setStandings(data);
      }
      setLoading(false);
    }

    fetchStandings();
  }, [leagueId, season]);

  if (loading) return <div>Loading standings...</div>;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Pos</th>
          <th className="p-2 text-left">Team</th>
          <th className="p-2 text-center">P</th>
          <th className="p-2 text-center">W</th>
          <th className="p-2 text-center">D</th>
          <th className="p-2 text-center">L</th>
          <th className="p-2 text-center">GF</th>
          <th className="p-2 text-center">GA</th>
          <th className="p-2 text-center">GD</th>
          <th className="p-2 text-center">Pts</th>
          <th className="p-2 text-center">Form</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((team) => (
          <tr key={team.team_id} className="border-b hover:bg-gray-50">
            <td className="p-2 font-semibold">{team.rank}</td>
            <td className="p-2 flex items-center gap-2">
              <img src={team.team_logo} alt={team.team_name} className="w-6 h-6" />
              {team.team_name}
            </td>
            <td className="p-2 text-center">{team.played}</td>
            <td className="p-2 text-center">{team.wins}</td>
            <td className="p-2 text-center">{team.draws}</td>
            <td className="p-2 text-center">{team.losses}</td>
            <td className="p-2 text-center">{team.goals_for}</td>
            <td className="p-2 text-center">{team.goals_against}</td>
            <td className="p-2 text-center">{team.goals_diff > 0 ? '+' : ''}{team.goals_diff}</td>
            <td className="p-2 text-center font-semibold">{team.points}</td>
            <td className="p-2 text-center text-sm">{team.form}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## 8. Monitoring and Maintenance

### Check Function Logs

Monitor your function execution in the Supabase dashboard:
1. Go to Edge Functions → fetch-football-standings
2. Check the "Invocations" tab for execution logs
3. Monitor for any errors or rate limiting issues

### Update Rate Limits

If you upgrade your RapidAPI plan, update the rate limiter in the function:

```typescript
const rateLimiter = {
  lastCall: 0,
  minDelay: 300, // Adjust based on your plan (e.g., 300ms for higher tier plans)
  // ...
};
```

### Customize League Processing

The function now dynamically fetches all leagues from your `leagues` table. You can customize which leagues to process by modifying the options in the function:

```typescript
// In the processLeaguesAndUpsertStandings function
const leagues = await fetchAllLeagues(supabase, {
  types: ['League'], // Only process regular leagues (not cups)
  countries: ['England', 'Spain', 'Germany'], // Only specific countries
  limit: 100 // Process only first 100 leagues for testing
});
```

### Add More Leagues

To add new leagues, simply insert them into your `leagues` table:

```sql
INSERT INTO leagues (id, name, type, country, logo, flag)
VALUES (999, 'New League', 'League', 'Country', 'logo_url', 'flag_url');
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**: If you see rate limiting errors, increase the `minDelay` in the rate limiter.

2. **Season Data**: If no standings are found, the function will try the previous season automatically.

3. **Missing Teams**: Make sure you've run the `fetch-football-teams` function first to populate team data.

4. **RLS Policies**: The table has public read access enabled. Modify policies if you need different access patterns.

### Database Queries for Debugging

```sql
-- Check data for a specific league
SELECT league_id, season, COUNT(*) as team_count, MAX(last_updated) as last_update
FROM fotball_standings 
WHERE league_id = 39 
GROUP BY league_id, season 
ORDER BY season DESC;

-- Check which leagues have data
SELECT league_id, COUNT(*) as team_count, MAX(last_updated) as last_update
FROM fotball_standings 
GROUP BY league_id 
ORDER BY league_id;

-- Find teams with recent updates
SELECT team_name, league_id, season, rank, points, last_updated
FROM fotball_standings 
WHERE last_updated > NOW() - INTERVAL '1 day'
ORDER BY last_updated DESC;
```

This setup provides a complete football standings system that automatically updates and can be easily queried for your frontend components. 