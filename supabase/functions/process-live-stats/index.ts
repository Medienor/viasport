// supabase/functions/process-live-stats/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Define interfaces for better type safety
interface Statistic {
  type: string;
  value: string | number | null;
}

interface TeamStats {
  team: {
    id: number;
    name?: string;
    logo?: string;
  };
  statistics: Statistic[];
}

// Updated Fixture interface to reflect the JSONB structure
interface FixtureData {
  id: number;
  date: string; // ISO 8601 timestamp string
  status: {
    long: string | null;
    short: string | null; // Short status like '1H', 'HT', '2H', 'ET', 'P', 'FT'
    elapsed: number | null;
  };
  // Add other fields from the fixture JSONB if needed
}

interface Fixture {
  id: number;
  fixture: FixtureData | null;
  match_status: string | null;
  fixture_statistics: TeamStats[] | null;
  ball_possession: PossessionDataPoint[] | null;
}

interface PossessionDataPoint {
  time: number; // Minute of the match
  home: number | null; // Home possession percentage
  away: number | null; // Away possession percentage
}

// Helper function to parse possession string (e.g., "55%")
function parsePossession(value: string | number | null): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.includes('%')) {
    const parsed = parseInt(value.replace('%', ''), 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// Helper function to calculate current elapsed minute (simplified)
// Now uses match_status passed directly if available, falls back to nested status
function calculateElapsedMinute(
    fixtureData: FixtureData | null,
    matchStatus: string | null, // Use the reliable match_status
    fixtureId: number,
    now: number
): number | null {
  // Check if fixture data and date exist
  if (!fixtureData || !fixtureData.date) {
      console.warn(`Skipping fixture ${fixtureId}: Missing fixture data or fixture date.`);
      return null;
  }

  const startDate = new Date(fixtureData.date).getTime();
  if (isNaN(startDate) || now < startDate) {
    return null; // Match hasn't started or invalid date
  }

  const elapsedMillis = now - startDate;
  let elapsedMinutes = Math.floor(elapsedMillis / (60 * 1000));

  // --- Adjustments based on status ---
  // Prioritize the top-level match_status if provided
  const statusShort = matchStatus ?? fixtureData.status?.short; // Fallback to nested if match_status is null

  if (!statusShort) {
      console.warn(`Skipping minute adjustment for fixture ${fixtureId}: Missing fixture status short code.`);
      return Math.max(0, elapsedMinutes);
  }

  if (statusShort === 'HT') return 45;
  if (statusShort === 'FT' || statusShort === 'AET' || statusShort === 'PEN') return 90; // Or 120 if ET finished

  const halfTimeBreakMillis = 15 * 60 * 1000;
  const endOfFirstHalfMillis = 45 * 60 * 1000;

  if (statusShort === '2H' || statusShort === 'ET' || statusShort === 'P') {
    if (elapsedMillis > endOfFirstHalfMillis + halfTimeBreakMillis) {
      const millisInSecondHalf = elapsedMillis - (endOfFirstHalfMillis + halfTimeBreakMillis);
      elapsedMinutes = 45 + Math.floor(millisInSecondHalf / (60 * 1000));
    } else if (elapsedMillis > endOfFirstHalfMillis) {
      return 45;
    }
  }

  if (statusShort === '1H' && elapsedMinutes > 45) return 45;
  if (statusShort === '2H' && elapsedMinutes > 90) return 90;
  if (statusShort === 'ET' && elapsedMinutes > 105) return 105;
  if (statusShort === 'BT' && elapsedMinutes > 105) return 105;
  if (statusShort === 'ET' && elapsedMinutes > 120) return 120;
  if (statusShort === 'P' && elapsedMinutes > 120) return 120;

  return Math.max(0, elapsedMinutes);
}

console.log('Process Live Stats Function Booting Up');

serve(async (req: Request) => {
  try {
    // 2. Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    );

    // 3. Define "In Play" statuses based on the provided list
    const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];

    // 4. Get current time (still needed for calculateElapsedMinute)
    const now = Date.now();

    // 5. Fetch potentially live fixtures - Filter ONLY by match_status
    console.log(`Fetching fixtures with status in [${liveStatuses.join(', ')}]`); // Updated log
    const { data: fixtures, error: fetchError } = await supabaseAdmin
      .from('fixtures')
      // Select necessary columns
      .select('id, fixture, match_status, fixture_statistics, ball_possession')
      // Filter ONLY by the 'match_status' TEXT column
      .in('match_status', liveStatuses);

    if (fetchError) {
      console.error('Error fetching fixtures:', fetchError);
      if (fetchError.details) console.error('Error details:', fetchError.details);
      if (fetchError.hint) console.error('Error hint:', fetchError.hint);
      throw fetchError;
    }

    if (!fixtures || fixtures.length === 0) {
      console.log('No fixtures found with an active live status.'); // Updated log
      return new Response(JSON.stringify({ message: 'No live fixtures found' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${fixtures.length} fixtures with an active live status.`); // Updated log
    let updatesMade = 0;

    // 6. Process each fixture
    for (const fixture of fixtures as Fixture[]) {
      // Pass necessary parts to the helper function
      const currentMinute = calculateElapsedMinute(
          fixture.fixture,
          fixture.match_status,
          fixture.id,
          now
      );

      // Skip if minute calculation failed or match is technically over but status not updated
      if (currentMinute === null || currentMinute > 130) {
          console.log(`Skipping fixture ${fixture.id}: Invalid/missing minute (${currentMinute}) or likely finished.`);
          continue;
      }

      // Check fixture_statistics
      if (!fixture.fixture_statistics || fixture.fixture_statistics.length < 2) {
        console.log(`Skipping fixture ${fixture.id}: Insufficient statistics data.`);
        continue;
      }

      // Parse possession
      const homeStats = fixture.fixture_statistics[0];
      const awayStats = fixture.fixture_statistics[1];
      const homePossessionStat = homeStats.statistics.find(s => s.type === 'Ball Possession');
      const awayPossessionStat = awayStats.statistics.find(s => s.type === 'Ball Possession');
      const homePossession = parsePossession(homePossessionStat?.value ?? null);
      const awayPossession = parsePossession(awayPossessionStat?.value ?? null);

      if (homePossession === null || awayPossession === null) {
          console.log(`Skipping fixture ${fixture.id} at minute ${currentMinute}: Missing possession values.`);
          continue;
      }

      // Prepare data point
      const newDataPoint: PossessionDataPoint = {
        time: currentMinute,
        home: homePossession,
        away: awayPossession,
      };

      // Update map
      const possessionMap = new Map<number, Omit<PossessionDataPoint, 'time'>>();
      if (fixture.ball_possession) {
          fixture.ball_possession.forEach(p => {
              possessionMap.set(p.time, { home: p.home, away: p.away });
          });
      }

      // Check existing data
      const existingData = possessionMap.get(currentMinute);
      if (existingData && existingData.home === newDataPoint.home && existingData.away === newDataPoint.away) {
          continue; // No update needed
      }

      // Add/update map
      possessionMap.set(currentMinute, { home: newDataPoint.home, away: newDataPoint.away });

      // Convert map back to sorted array
      const updatedPossessionArray = Array.from(possessionMap.entries())
          .sort(([timeA], [timeB]) => timeA - timeB)
          .map(([time, data]) => ({ time, ...data }));

      // 7. Update the fixture in the database
      const { error: updateError } = await supabaseAdmin
        .from('fixtures')
        .update({ ball_possession: updatedPossessionArray })
        .eq('id', fixture.id); // Use the top-level id for the update condition

      if (updateError) {
        console.error(`Error updating fixture ${fixture.id}:`, updateError);
      } else {
        updatesMade++;
        console.log(`Updated possession for fixture ${fixture.id} at minute ${currentMinute}.`);
      }
    } // End loop through fixtures

    // 8. Return success response
    return new Response(JSON.stringify({ message: `Processed ${fixtures.length} fixtures, made ${updatesMade} updates.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Critical error in process-live-stats function:', error);
    // Add more detail to the error response if possible
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as any).code ?? 'UNKNOWN_CODE'; // Try to get code if available
    return new Response(JSON.stringify({ error: errorMessage, code: errorCode }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/*
To Deploy:
1. Ensure you have added the `ball_possession` JSONB column to your `fixtures` table.
2. Run: `supabase functions deploy process-live-stats --no-verify-jwt` (use --no-verify-jwt if calling via Cron, otherwise configure JWT verification)

To Schedule (Cron Job):
1. Go to your Supabase Project Dashboard -> Database -> Cron Jobs
2. Click "New cron job"
3. Name: e.g., "Process Live Stats"
4. Schedule: `* * * * *` (Runs every minute)
5. Function: Select "process-live-stats"
6. Click "Create job"
*/