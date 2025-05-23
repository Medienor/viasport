// WARNING: Hardcoding credentials is not recommended for production or shared code.
// These should ideally be loaded from environment variables.

// --- BEGIN Hardcoded Credentials and Configuration ---
const SCRIPT_SUPABASE_URL = 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const SCRIPT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Nzg0MDEsImV4cCI6MjA1ODE1NDQwMX0.kfDN39vw2ulre8ndNcytD-ISo9YXjptsBIfuH1p1HCg';
const SCRIPT_RAPID_API_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90'; // Your RapidAPI Key
const SCRIPT_RAPID_API_HOST = 'api-football-v1.p.rapidapi.com';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SCRIPT_SUPABASE_URL, SCRIPT_SUPABASE_ANON_KEY);

const SCRIPT_API_CONFIG = {
  baseUrl: `https://${SCRIPT_RAPID_API_HOST}/v3`,
  headers: {
    'x-rapidapi-host': SCRIPT_RAPID_API_HOST,
    'x-rapidapi-key': SCRIPT_RAPID_API_KEY,
  },
};
// --- END Hardcoded Credentials and Configuration ---

// Other imports
import { MAJOR_LEAGUES, rateLimiter } from './teamDataFetcher'; // We still need these
import colors from 'ansi-colors';

// Define a more specific type for the API fixture response based on your example
interface ApiFixtureDetail {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: { first: number | null; second: number | null };
  venue: { id: number | null; name: string | null; city: string | null };
  status: { long: string; short: string; elapsed: number | null; extra: number | null; };
}

interface ApiLeagueDetail {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number; // Season year as returned by API
  round: string;
  standings?: boolean; // Optional based on your example
}

interface ApiTeamDetail {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

interface ApiScoreDetail {
  halftime: { home: number | null; away: number | null };
  fulltime: { home: number | null; away: number | null };
  extratime: { home: number | null; away: number | null };
  penalty: { home: number | null; away: number | null };
}

// Define the type for objects being inserted into Supabase
// This includes optional created_at and updated_at to match Supabase's expected insert type
interface SupabaseFixtureInsert {
  id: number;
  date: string;
  season_year: number;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  status?: ApiFixtureStatus | null; // Full status object for the top-level 'status' JSONB column
  score: ApiScoreDetail;
  venue: { id: number | null; name: string | null; city: string | null };
  referee?: string | null;
  timezone?: string;
  timestamp?: number; // Usually part of 'fixture' object
  periods?: { first: number | null; second: number | null }; // Usually part of 'fixture' object
  round?: string; // Usually part of 'league' object
  goals: { home: number | null; away: number | null };
  fixture: ApiFixtureDetailData; // Main fixture object from API
  league: ApiLeague; // Main league object from API
  teams: { home: ApiTeamDetail; away: ApiTeamDetail }; // Main teams object
  match_status: string; // Short status string e.g. "FT"

  event_data?: ApiEvent[] | null;
  event_goals?: ApiEvent[] | null; // Derived: array of goal events
  event_cards_yellow?: number | null; // Derived: count
  event_cards_red?: number | null; // Derived: count
  event_substitutions?: number | null; // Derived: count
  event_last_updated?: string | null; // Timestamp
  event_count?: number | null; // Derived: total event count

  fixture_statistics?: ApiTeamStatisticPackage[] | null;
  statistics_last_updated?: string | null; // Timestamp
  ball_possession?: { home: string | null; away: string | null } | null; // Derived from fixture_statistics

  lineups?: any[] | null; // Define more strictly if possible
  lineups_last_updated?: string | null; // Timestamp

  head_to_head?: any | null; // Response from /fixtures/headtohead
  h2h_last_updated?: string | null; // Timestamp

  player_statistics?: any | null; // Response from /fixtures/players
  player_statistics_last_updated?: string | null; // Timestamp
  
  details_last_updated_at?: string | null; // Timestamp for when /v3/fixtures?id= was last successfully called

  // Columns not directly populatable from API-Football:
  // commentary_path?: string | null;
  // youtube_highlight_id?: string | null;

  created_at?: string;
  updated_at?: string;
}

// --- BEGIN: New Interfaces for Detailed Fixture Data ---
interface ApiEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string; // e.g., "Goal", "Card", "subst"
  detail: string | null;
  comments: string | null;
}

interface ApiTeamStatisticPackage {
  team: { id: number; name: string; logo: string };
  statistics: Array<{ type: string; value: string | number | null }>;
}

interface ApiDetailedFixtureData {
  fixture: ApiFixtureDetail;
  league: ApiLeagueDetail;
  teams: { home: ApiTeamDetail; away: ApiTeamDetail };
  goals: { home: number | null; away: number | null }; // This is often redundant if score is present
  score: ApiScoreDetail;
  events: ApiEvent[];
  lineups: any[]; // Not currently storing lineups based on provided schema
  statistics: ApiTeamStatisticPackage[];
  players: any[]; // Not currently storing detailed player stats per fixture based on provided schema
}

interface ApiDetailedFixtureResponse {
  get: string;
  parameters: { id: string };
  errors: any[];
  results: number;
  paging: ApiPaging; // Assuming it's the same paging
  response: ApiDetailedFixtureData[];
}

interface SupabaseFixtureEventInsert {
  fixture_id: number;
  time: { elapsed: number; extra: number | null } | null;
  team_id: number;
  player_id: number | null;
  type: string;
  detail: string | null;
  // created_at is handled by DB
}

interface SupabaseFixtureStatisticsInsert {
  fixture_id: number;
  team_id: number;
  statistics: Array<{ type: string; value: string | number | null }>;
  // created_at is handled by DB
}
// --- END: New Interfaces for Detailed Fixture Data ---

interface ApiFixture {
  fixture: ApiFixtureDetail;
  league: ApiLeagueDetail;
  teams: {
    home: ApiTeamDetail;
    away: ApiTeamDetail;
  };
  goals: { home: number | null; away: number | null };
  score: ApiScoreDetail;
}

interface ApiPaging {
  current: number;
  total: number;
}

interface ApiResponse {
  get: string;
  parameters: any;
  errors: any[];
  results: number;
  paging: ApiPaging;
  response: ApiFixture[];
}

// List of league IDs known to run on a calendar year basis
// Add more as needed (e.g., MLS: 253, J1 League: 98, Allsvenskan: 113, Veikkausliiga: 128 (if it's the Finnish one))
// Note: Your MAJOR_LEAGUES has ID 128 for both Veikkausliiga (Finland) and Liga MX (Mexico).
// This list assumes 128 refers to a calendar year league if you add it.
const CALENDAR_YEAR_LEAGUE_IDS = [
  103, // Eliteserien (Norway)
  104, // OBOS-ligaen (Norway)
  725, // Toppserien (Norway Women)
  253, // MLS (USA)
  98,  // J1 League (Japan)
  113, // Allsvenskan (Sweden)
  // 128, // Veikkausliiga (Finland) - uncomment if this is the primary 128 you mean and it's calendar year
];

function getApiSeasonForFixtures(leagueId: number): number {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 (Jan) - 11 (Dec)

  if (CALENDAR_YEAR_LEAGUE_IDS.includes(leagueId)) {
    return currentYear;
  }

  // For leagues that span two calendar years (e.g., European leagues Aug-May)
  // If current month is July (index 6) or later, the current season started this year.
  // e.g., In Aug 2023, for 2023/24 season, API season is 2023.
  // If current month is Jan-June (index 0-5), the current season started last year.
  // e.g., In Feb 2024, for 2023/24 season, API season is 2023.
  if (currentMonth >= 6) { // July to December
    return currentYear;
  } else { // January to June
    return currentYear - 1;
  }
}

// --- BEGIN: Type Interfaces ---
interface ApiFixtureStatus { // For the 'status' JSONB column if separate
  long: string | null;
  short: string | null;
  elapsed: number | null;
  // Add 'extra' if it's part of the status object and you want to store it
}

// ... other existing interfaces (ApiFixtureDetail, ApiLeagueDetail, ApiTeamDetail, ApiScoreDetail etc.) ...

// --- BEGIN: Helper Classes/Functions ---

// class APIRateLimiter { // Entire class removed
//   private lastRequestTime: number;
//   private interval: number;

//   constructor(interval: number) {
//     this.lastRequestTime = 0;
//     this.interval = interval;
//   }

//   async checkLimit(): Promise<void> {
//     const now = Date.now();
//     const timeSinceLastRequest = now - this.lastRequestTime;

//     if (timeSinceLastRequest < this.interval) {
//       const waitTime = this.interval - timeSinceLastRequest;
//       // console.log(`Rate limiting: waiting ${waitTime}ms...`);
//       await new Promise(resolve => setTimeout(resolve, waitTime));
//     }
//     this.lastRequestTime = Date.now();
//   }
// }

interface ProcessedEventData {
  event_count: number;
  event_cards_yellow: number;
  event_cards_red: number;
  event_substitutions: number;
}

function processEventData(events: ApiEvent[] | null): ProcessedEventData {
  const result: ProcessedEventData = {
    event_count: 0,
    event_cards_yellow: 0,
    event_cards_red: 0,
    event_substitutions: 0,
  };

  if (!events || !Array.isArray(events)) {
    return result;
  }

  result.event_count = events.length;
  for (const event of events) {
    if (event.type === 'Card') {
      if (event.detail === 'Yellow Card') {
        result.event_cards_yellow++;
      } else if (event.detail === 'Red Card') {
        result.event_cards_red++;
      }
    } else if (event.type === 'subst') {
      result.event_substitutions++;
    }
  }
  return result;
}

function extractBallPossession(
  statistics: ApiTeamStatisticPackage[] | null,
  homeTeamId: number,
  awayTeamId: number
): { home: string | null; away: string | null } | null {
  if (!statistics || !Array.isArray(statistics)) {
    return null;
  }

  let homePossession: string | null = null;
  let awayPossession: string | null = null;

  for (const teamPackage of statistics) {
    const possessionStat = teamPackage.statistics.find(stat => stat.type === "Ball Possession");
    if (possessionStat && typeof possessionStat.value === 'string') {
      if (teamPackage.team.id === homeTeamId) {
        homePossession = possessionStat.value;
      } else if (teamPackage.team.id === awayTeamId) {
        awayPossession = possessionStat.value;
      }
    }
  }

  if (homePossession !== null || awayPossession !== null) {
    return { home: homePossession, away: awayPossession };
  }
  return null;
}

// --- END: Helper Classes/Functions ---

const supabasePageSize = 50; // Number of records to fetch from Supabase at a time

const TERMINAL_MATCH_STATUSES = [
  'FT',   // Match Finished
  'AET',  // Match Finished after extra time
  'PEN',  // Match Finished after penalties
  'PST',  // Match Postponed
  'CANC', // Match Cancelled
  'ABD',  // Match Abandoned
  'AWD',  // Technical Loss (Home win)
  'WO',   // Walkover (Away win)
];

const SCRIPT_MODE_ONLY_FILL_FT_DETAILS = false; // <--- CHANGE THIS TO FALSE

async function syncFixtures() {
  console.log('Starting Viasport Fixture Synchronization Script...');
  // const rateLimiter = new APIRateLimiter(SCRIPT_API_CONFIG.requestIntervalMs); // Removed rateLimiter instantiation

  let totalFixturesAdded = 0;
  let totalFixturesSkipped = 0;
  let totalApiErrors = 0;
  // --- BEGIN: New counters for detailed updates ---
  let totalFixturesDetailsFetched = 0;
  let totalFixtureDetailFetchErrors = 0;
  let totalEventsAdded = 0;
  let totalStatisticsAdded = 0;
  let totalH2HFetched = 0;
  let totalPlayerStatsFetched = 0;
  // --- END: New counters for detailed updates ---

  // --- BEGIN: Phase 1 - Fetch and Insert New Fixtures ---
  if (!SCRIPT_MODE_ONLY_FILL_FT_DETAILS) {
    console.log('\n🚀 Starting Phase 1: Fetching and inserting new fixtures...');
    for (const league of MAJOR_LEAGUES) {
      console.log(`\nProcessing league: ${league.name} (ID: ${league.id})`);
      
      const initialSeason = getApiSeasonForFixtures(league.id);
      let seasonToFetch = initialSeason;
      let attempt = 1;
      const maxAttempts = 2; // Try current season, then next season if first fails
      let foundAndProcessedFixturesForThisLeague = false;

      while (attempt <= maxAttempts && !foundAndProcessedFixturesForThisLeague) {
        console.log(`Attempting API season: ${seasonToFetch} for league ${league.name} (Attempt ${attempt}/${maxAttempts})`);

        let allFixturesForLeague: ApiFixture[] = []; // Reset for each attempt
        let currentPage = 1;
        let totalPages = 1;
        let apiErrorThisAttempt = false;

        try {
          do {
            // await rateLimiter.checkLimit(); // Removed rateLimiter call
            let apiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures?league=${league.id}&season=${seasonToFetch}`;
            if (currentPage > 1) {
              apiUrl += `&page=${currentPage}`;
            }
            console.log(`Fetching fixtures from: ${apiUrl}`);

            const response = await fetch(apiUrl, { headers: SCRIPT_API_CONFIG.headers });

            if (!response.ok) {
              const errorBody = await response.text().catch(() => "Could not read error body");
              console.error(
                `API error for league ${league.name} (Season ${seasonToFetch}, Page ${currentPage}): ${response.status} ${response.statusText}`
              );
              console.error(errorBody);
              totalApiErrors++;
              apiErrorThisAttempt = true;
              break; // Stop fetching pages for this attempt
            }

            const data: ApiResponse = await response.json();

            if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                console.error(`API returned errors for league ${league.name} (Season ${seasonToFetch}, Page ${currentPage}):`, data.errors);
                totalApiErrors++;
                apiErrorThisAttempt = true;
                break; // Stop fetching pages for this attempt
            }
            
            if (!data.response) {
                console.warn(`No 'response' field in API data for league ${league.name} (Season ${seasonToFetch}, Page ${currentPage}).`);
                // If no response field, assume no data for this page or an issue.
                // If it's page 1 and totalPages was 1, it will be handled as "no fixtures found".
                // If totalPages > 1, this might mean subsequent pages are also problematic.
                // For simplicity, we'll let it try to proceed if totalPages > 1, but it might end up with 0 fixtures.
                if (currentPage === 1 && (data.paging?.total || 1) === 1) {
                  totalPages = 1; // Ensure it's treated as no fixtures if response is missing on first page of one.
                } else {
                  // Potentially problematic, but let the loop condition handle it.
                }
                break; 
            }

            allFixturesForLeague.push(...data.response);
            totalPages = data.paging?.total || 1;
            
            if (currentPage === 1 && data.response.length > 0) {
                 console.log(`Found ${data.results} total fixtures across ${totalPages} page(s) for ${league.name}, season ${seasonToFetch}.`);
            }
            if (totalPages > 1 && currentPage < totalPages) {
                console.log(`Fetched page ${currentPage}/${totalPages}. More pages to fetch...`);
            }
            currentPage++;
          } while (currentPage <= totalPages && !apiErrorThisAttempt);

          if (apiErrorThisAttempt) {
            // An API error occurred during pagination, break from while (attempts) for this league.
            // The error is already logged, and totalApiErrors incremented.
            break;
          }

          if (allFixturesForLeague.length === 0 && totalPages === 1) {
            console.log(`No fixtures found for league ${league.name}, season ${seasonToFetch}.`);
            if (attempt < maxAttempts) {
              seasonToFetch++; // Prepare for next season attempt
            }
            // Continue to next attempt or finish attempts for this league
          } else if (allFixturesForLeague.length > 0) {
            console.log(`Total ${allFixturesForLeague.length} fixtures fetched for ${league.name}, season ${seasonToFetch}.`);

            const { data: existingDbFixtures, error: dbError } = await supabase
              .from('fixtures')
              .select('id')
              .eq('league_id', league.id); // Consider if season should be part of this query if you store it

            if (dbError) {
              console.error(
                `Error fetching existing fixtures from Supabase for league ${league.name}:`,
                dbError.message
              );
              totalApiErrors++; // Count this as an error preventing processing for this attempt
              break; // Break from while (attempts) for this league
            }

            const existingFixtureIds = new Set(existingDbFixtures?.map(f => f.id) || []);
            console.log(`Found ${existingFixtureIds.size} existing fixtures in DB for this league (related to league_id).`);

            const fixturesToInsert: SupabaseFixtureInsert[] = [];
            let currentLeagueSkipped = 0;
            // let currentLeagueNew = 0; // Not strictly needed if using fixturesToInsert.length

            for (const apiFixture of allFixturesForLeague) {
              if (existingFixtureIds.has(apiFixture.fixture.id)) {
                currentLeagueSkipped++;
              } else {
                const fixtureDate = new Date(apiFixture.fixture.date);
                fixturesToInsert.push({
                  id: apiFixture.fixture.id,
                  date: apiFixture.fixture.date,
                  season_year: fixtureDate.getFullYear(),
                  league_id: apiFixture.league.id,
                  home_team_id: apiFixture.teams.home.id,
                  away_team_id: apiFixture.teams.away.id,
                  status: apiFixture.fixture.status, // For separate top-level 'status' JSONB column
                  score: apiFixture.score,
                  venue: apiFixture.fixture.venue,
                  referee: apiFixture.fixture.referee,
                  timezone: apiFixture.fixture.timezone,
                  goals: apiFixture.goals,
                  fixture: apiFixture.fixture,
                  league: apiFixture.league,
                  teams: apiFixture.teams,
                  match_status: apiFixture.fixture.status.short,
                });
                // currentLeagueNew++;
              }
            }
            totalFixturesSkipped += currentLeagueSkipped;

            if (fixturesToInsert.length > 0) {
              console.log(`Attempting to insert ${fixturesToInsert.length} new fixtures for ${league.name} (Season ${seasonToFetch})...`);
              const { error: insertError } = await supabase.from('fixtures').insert(fixturesToInsert);

              if (insertError) {
                console.error(
                  `ERROR: Error inserting fixtures into Supabase for league ${league.name} (Season ${seasonToFetch}):`,
                  insertError.message
                );
                console.error(`ERROR: Failed to insert ${fixturesToInsert.length} fixtures. Details: ${insertError.message}`);
                totalApiErrors++; // Count this as an error
              } else {
                console.log(`Successfully inserted ${fixturesToInsert.length} new fixtures for ${league.name} (Season ${seasonToFetch}).`);
                totalFixturesAdded += fixturesToInsert.length;
              }
            } else {
              console.log(`No new fixtures to add for ${league.name} (Season ${seasonToFetch}). Skipped ${currentLeagueSkipped} existing ones.`);
            }
            foundAndProcessedFixturesForThisLeague = true; // Mark as success for this league
          } else if (allFixturesForLeague.length === 0 && totalPages > 1 && !apiErrorThisAttempt) {
              console.log(`WARNING: No fixtures ultimately processed for league ${league.name}, season ${seasonToFetch}, despite initial paging info suggesting more.`);
               if (attempt < maxAttempts) {
                  seasonToFetch++;
              }
          }
        } catch (error: any) {
          console.error(`ERROR: Critical error during attempt ${attempt} for league ${league.name}, season ${seasonToFetch}:`, error.message);
          totalApiErrors++;
          break; // Break from while (attempts) for this league on critical error
        }
        attempt++;
      } // End of while loop for attempts

      if (!foundAndProcessedFixturesForThisLeague && attempt > maxAttempts) {
          console.log(`INFO: No fixtures found or processed for league ${league.name} after trying seasons up to ${seasonToFetch}.`);
      }
    } // End of for loop for leagues
    console.log('\n🏁 Fixture synchronization complete!');
    console.log(`Total fixtures added: ${totalFixturesAdded}`);
    console.log(`Total fixtures skipped: ${totalFixturesSkipped}`);
    console.log(`Total API errors: ${totalApiErrors}`);
  } else {
    console.log('INFO: Phase 1 (New Fixture Sync) SKIPPED due to SCRIPT_MODE_ONLY_FILL_FT_DETAILS.');
  }
  // --- END: Phase 1 ---

  // --- BEGIN: Phase 2 - Fetch and Update Details for Non-Terminal/Missing Status Fixtures ---
  if (!SCRIPT_MODE_ONLY_FILL_FT_DETAILS) {
    console.log('\n🚀 Starting Phase 2: Updating details for fixtures with non-terminal or NULL status...');

    // Define as an array of strings
    const statusesToUpdateDetailsFor_Array = [
      'NS', // Not Started
      'TBD', // To Be Defined
      'PST', // Postponed
      'CANC', // Cancelled
      'ABD', // Abandoned
      'SUSP', // Suspended
      'AWD', // Awarded
      'WO', // Walkover
      '1H', // First Half
      'HT', // Half Time
      '2H', // Second Half
      'ET', // Extra Time
      'BT', // Break Time (between ET halves)
      'P',  // Penalty Shootout
      'INT', // Interrupted
    ];

    let fixturesProcessedForDetailUpdate = 0;
    let currentSupabasePage = 0;
    let moreFixturesToCheck = true;

    // Reset counters for this phase
    totalFixturesDetailsFetched = 0;
    totalEventsAdded = 0;
    totalStatisticsAdded = 0;
    totalFixtureDetailFetchErrors = 0;

    while (moreFixturesToCheck) {
      const from = currentSupabasePage * supabasePageSize;
      const to = (currentSupabasePage + 1) * supabasePageSize - 1;

      // Query for when match_status is a string column
      const { data: fixturesToUpdateDetails, error: selectError } = await supabase
        .from('fixtures')
        .select('id, match_status') // Select the 'match_status' (string) column
        .or(
          `match_status.is.null,` +
          `match_status.eq."",` + // Catch empty string status
          `match_status.in.(${statusesToUpdateDetailsFor_Array.map(s => `"${s}"`).join(',')})`
        )
        .range(from, to);

      if (selectError) {
        console.error(`ERROR: Error fetching fixtures from Supabase (page ${currentSupabasePage}) for detail update:`, selectError);
        totalFixtureDetailFetchErrors++;
        moreFixturesToCheck = false;
        break;
      }

      if (fixturesToUpdateDetails && fixturesToUpdateDetails.length > 0) {
        console.log(`Found ${fixturesToUpdateDetails.length} fixtures in DB page ${currentSupabasePage + 1} (range ${from}-${to}) potentially requiring detail updates.`);
        for (const fixture of fixturesToUpdateDetails) {
          fixturesProcessedForDetailUpdate++;
          const fixtureIdToUpdate = fixture.id;

          try {
            // await rateLimiter.checkLimit(); // Removed rateLimiter call
            console.log(`Processing fixture ID: ${fixtureIdToUpdate} (DB match_status: ${fixture.match_status || 'NULL'}). Fetching details...`);
            const detailApiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures?id=${fixtureIdToUpdate}`;
            const detailResponse = await fetch(detailApiUrl, { headers: SCRIPT_API_CONFIG.headers });

            if (!detailResponse.ok) {
              console.error(`ERROR: API error fetching details for fixture ${fixtureIdToUpdate}: ${detailResponse.status} ${detailResponse.statusText}`);
              const errorBody = await detailResponse.text().catch(() => "Could not read error body");
              console.error(`ERROR: API Error Body: ${errorBody}`);
              totalFixtureDetailFetchErrors++;
              continue; // Skip to next fixture in the loop
            }

            const detailedData: ApiSingleDetailedFixtureResponse = await detailResponse.json();

            if (detailedData.errors && (Array.isArray(detailedData.errors) ? detailedData.errors.length > 0 : Object.keys(detailedData.errors).length > 0) || detailedData.results === 0 || !detailedData.response || detailedData.response.length === 0) {
              console.error(`ERROR: API returned errors or no data for fixture ${fixtureIdToUpdate}:`, JSON.stringify(detailedData.errors || 'No response data'));
              totalFixtureDetailFetchErrors++;
              continue; // Skip to next fixture in the loop
            } else {
              const apiFixtureDetails = detailedData.response[0];
              const phase2Timestamp = new Date().toISOString(); 

              totalFixturesDetailsFetched++;
              console.log(`  Successfully fetched details for fixture ${fixtureIdToUpdate}. Preparing update...`);

              const updatePayload: Partial<SupabaseFixtureInsert> & { updated_at?: string } = {
                updated_at: phase2Timestamp,
                details_last_updated_at: phase2Timestamp,
              };

              updatePayload.date = apiFixtureDetails.fixture.date;
              updatePayload.season_year = new Date(apiFixtureDetails.fixture.date).getFullYear();

              const rawLeagueId = apiFixtureDetails.league?.id;
              if (typeof rawLeagueId === 'number' && isFinite(rawLeagueId)) {
                updatePayload.league_id = rawLeagueId;
              } else {
                console.warn(`WARNING: Fixture ${fixtureIdToUpdate}: API provided invalid league_id ('${JSON.stringify(rawLeagueId)}'). Retaining existing DB value.`);
              }
              updatePayload.league = apiFixtureDetails.league; 

              updatePayload.fixture = apiFixtureDetails.fixture; 
              updatePayload.teams = apiFixtureDetails.teams; 

              const rawHomeTeamId = apiFixtureDetails.teams?.home?.id;
              if (typeof rawHomeTeamId === 'number' && isFinite(rawHomeTeamId)) {
                updatePayload.home_team_id = rawHomeTeamId;
              } else {
                console.warn(`WARNING: Fixture ${fixtureIdToUpdate}: API provided invalid home_team_id ('${JSON.stringify(rawHomeTeamId)}'). Retaining existing DB value.`);
              }

              const rawAwayTeamId = apiFixtureDetails.teams?.away?.id;
              if (typeof rawAwayTeamId === 'number' && isFinite(rawAwayTeamId)) {
                updatePayload.away_team_id = rawAwayTeamId;
              } else {
                console.warn(`WARNING: Fixture ${fixtureIdToUpdate}: API provided invalid away_team_id ('${JSON.stringify(rawAwayTeamId)}'). Retaining existing DB value.`);
              }

              updatePayload.match_status = apiFixtureDetails.fixture.status.short;
              updatePayload.status = apiFixtureDetails.fixture.status; 
              updatePayload.score = apiFixtureDetails.score; 
              updatePayload.venue = apiFixtureDetails.fixture.venue; 
              updatePayload.goals = apiFixtureDetails.goals; 
              updatePayload.timezone = apiFixtureDetails.fixture.timezone;
              updatePayload.referee = apiFixtureDetails.fixture.referee;

              if (apiFixtureDetails.fixture.timestamp !== undefined && apiFixtureDetails.fixture.timestamp !== null) {
                const rawTimestamp = apiFixtureDetails.fixture.timestamp;
                if (typeof rawTimestamp === 'number' && isFinite(rawTimestamp)) {
                  updatePayload.timestamp = rawTimestamp;
                } else {
                  console.warn(`WARNING: Fixture ${fixtureIdToUpdate}: API provided invalid timestamp ('${JSON.stringify(rawTimestamp)}'). Retaining existing DB value.`);
                }
              }

              if (apiFixtureDetails.fixture.periods) {
                updatePayload.periods = apiFixtureDetails.fixture.periods; 
              }
              if (apiFixtureDetails.league.round) {
                updatePayload.round = apiFixtureDetails.league.round;
              }

              const { error: updateFixtureError } = await supabase
                .from('fixtures')
                .update(updatePayload)
                .eq('id', fixtureIdToUpdate);

              if (updateFixtureError) {
                console.error(`ERROR: Error updating fixture ${fixtureIdToUpdate} in Supabase:`, updateFixtureError.message);
                totalFixtureDetailFetchErrors++;
              } else {
                console.log(`Successfully updated details for fixture ${fixtureIdToUpdate}.`);
              }
            }
          } catch (error: any) {
            console.error(`ERROR: Critical error updating details for fixture ${fixtureIdToUpdate}:`, error.message);
            totalFixtureDetailFetchErrors++;
          }
        }

        if (fixturesToUpdateDetails.length < supabasePageSize) {
          moreFixturesToCheck = false; // Last page fetched
        } else {
          currentSupabasePage++; // Prepare for next page
        }
      } else {
        // No fixtures found in this page (or any subsequent pages if currentSupabasePage > 0)
        moreFixturesToCheck = false;
        if (currentSupabasePage === 0) { // Only log "No fixtures found" if it's the very first check
            console.log('INFO: No fixtures found in DB requiring detailed updates.');
        }
      }
    } // End of while(moreFixturesToCheck)

    console.log(`Total fixtures from DB checked for detail update eligibility: ${fixturesProcessedForDetailUpdate}`);
    console.log('\n🏁 Detailed fixture update phase complete!');
    console.log(`Total fixtures successfully fetched for details: ${totalFixturesDetailsFetched}`);
    if (totalFixtureDetailFetchErrors > 0) {
      console.log(`ERROR: Total errors during detailed fixture update: ${totalFixtureDetailFetchErrors}`);
    }
  } else {
    console.log('INFO: Phase 2 (Non-Terminal Updates) SKIPPED due to SCRIPT_MODE_ONLY_FILL_FT_DETAILS.');
  }
  // --- END: Phase 2 ---

  // --- BEGIN: Pre-check for Phase 3 ---
  console.log('\n🔍 Performing pre-check: Counting "FT" fixtures potentially needing updates for Phase 3...');
  try {
    const { count: ftFixturesToUpdateCount, error: countError } = await supabase
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .eq('match_status', 'FT')
      .or('event_data.is.null,fixture_statistics.is.null,lineups.is.null,head_to_head.is.null,player_statistics.is.null,status.is.null,status->>short.neq.match_status');

    if (countError) {
      console.error('  Error during Phase 3 pre-check count:', countError.message);
      console.log('  Proceeding with Phase 3, but the initial count might be inaccurate.');
    } else if (ftFixturesToUpdateCount !== null) {
      console.log(`  INFO: Phase 3 Pre-check: Found ${ftFixturesToUpdateCount} "FT" fixtures that match update criteria.`);
      if (ftFixturesToUpdateCount > 0) {
        // const averageApiCallsPerFixture = 2.5;
        // const intervalMs = SCRIPT_API_CONFIG.requestIntervalMs; // This is no longer defined

        // Robust check for time estimation - This estimation is no longer meaningful without requestIntervalMs
        // if (typeof intervalMs === 'number' && isFinite(intervalMs) && intervalMs > 0) {
        //   const estimatedTimePerFixtureMs = intervalMs * averageApiCallsPerFixture;
        //   const estimatedTotalTimeMinutes = (ftFixturesToUpdateCount * estimatedTimePerFixtureMs) / (1000 * 60);
        //   console.log(`WARNING: Estimated time for Phase 3 could be around ${estimatedTotalTimeMinutes.toFixed(1)} minutes (this is a very rough estimate).`);
        // } else {
        //   console.log(`WARNING: Could not calculate estimated time for Phase 3 due to invalid requestIntervalMs (${intervalMs}).`);
        // }
        console.log(`INFO: Phase 3 will process ${ftFixturesToUpdateCount} fixtures. Time estimation is disabled as rate limiting is removed.`);
      } else {
        console.log('  INFO: No "FT" fixtures to update based on pre-check, so estimated time is 0 minutes.');
      }
    } else {
      console.log('  INFO: Phase 3 Pre-check: No "FT" fixtures found matching update criteria based on the count (count was null).');
    }
  } catch (e: any) {
    console.error('  Critical error during Phase 3 pre-check:', e.message);
  }
  // --- END: Pre-check for Phase 3 ---

  // --- BEGIN: Phase 3 - Fetch Events, Statistics, and Lineups for "FT" fixtures ---
  console.log('\n🚀 Starting Phase 3: Fetching Events, Statistics, Lineups, H2H, Player Stats, and Correcting Stale "FT" fixture details...');

  // IMPORTANT: Target only specific fixture IDs instead of all FT fixtures
  const specificFixtureIds = [1371991, 1371993];
  console.log(`INFO: Phase 3: Targeting only specific fixture IDs: ${specificFixtureIds.join(', ')}`);

  let totalFtFixturesCheckedForPhase3 = 0;
  let totalCoreDetailsRefreshedInPhase3 = 0;
  let totalEventsFetched = 0;
  let totalStatsFetched = 0;
  let totalLineupsFetched = 0;
  let totalPhase3ApiErrors = 0;
  let totalPhase3DbErrors = 0;

  // Modified query to only fetch the specific fixtures
  const { data: ftFixtures, error: selectFtError } = await supabase
    .from('fixtures')
    .select('id, match_status, status, event_data, fixture_statistics, lineups, head_to_head, player_statistics, home_team_id, away_team_id, details_last_updated_at, league, teams, score, venue, goals, timezone, referee, fixture, season_year, date')
    .in('id', specificFixtureIds); // Use .in() to filter by the specific IDs

  if (selectFtError) {
    console.error(`ERROR: Phase 3: Error fetching specific fixtures:`, selectFtError.message);
    totalPhase3DbErrors++;
  } else if (!ftFixtures || ftFixtures.length === 0) {
    console.log(`INFO: Phase 3: No fixtures found with IDs: ${specificFixtureIds.join(', ')}`);
  } else {
    console.log(`INFO: Phase 3: Found ${ftFixtures.length} fixtures to process.`);
    totalFtFixturesCheckedForPhase3 = ftFixtures.length;

    for (const fixtureFromDb of ftFixtures) {
      const fixtureId = fixtureFromDb.id;
      console.log(`INFO: Phase 3: Processing fixture ${fixtureId}...`);
      
      let effectiveFixtureData: SupabaseFixtureInsert = { ...fixtureFromDb } as SupabaseFixtureInsert;
      let updatePayloadForCurrentFixture: Partial<SupabaseFixtureInsert> = {};
      let needsDbUpdateForCurrentFixture = false;
      const phase3Timestamp = new Date().toISOString();

      // 1. Core Detail Refresh if 'status' JSONB is inconsistent with 'match_status' for terminal states
      if (
        TERMINAL_MATCH_STATUSES.includes(effectiveFixtureData.match_status) &&
        (!effectiveFixtureData.status || (effectiveFixtureData.status as ApiFixtureStatus).short !== effectiveFixtureData.match_status)
      ) {
        console.log(`WARNING: Phase 3: Fixture ${fixtureId} (${effectiveFixtureData.match_status}) has inconsistent/missing 'status' JSONB. Refreshing core details.`);
        // Add a small delay between API calls to avoid ECONNRESET
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const detailApiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures?id=${fixtureId}`;
        try {
          const detailResponse = await fetch(detailApiUrl, { headers: SCRIPT_API_CONFIG.headers });
          if (!detailResponse.ok) {
            console.error(`ERROR: API error refreshing core details for fixture ${fixtureId}: ${detailResponse.status} ${detailResponse.statusText}`);
            totalPhase3ApiErrors++;
          } else {
            const detailedData: ApiSingleDetailedFixtureResponse = await detailResponse.json();
            if (detailedData.errors && (Array.isArray(detailedData.errors) ? detailedData.errors.length > 0 : Object.keys(detailedData.errors).length > 0) || detailedData.results === 0 || !detailedData.response || detailedData.response.length === 0) {
              console.error(`ERROR: API returned errors or no data for core detail refresh ${fixtureId}:`, JSON.stringify(detailedData.errors || 'No response data'));
              totalPhase3ApiErrors++;
            } else {
              const apiFixtureDetails = detailedData.response[0];
              const phase2Timestamp = new Date().toISOString(); // Defined here, before it's used

              totalFixturesDetailsFetched++;
              console.log(`INFO: Successfully fetched core details for fixture ${fixtureId} in Phase 3.`);

              // Populate updatePayload with all core fields from apiFixtureDetails
              updatePayloadForCurrentFixture.date = apiFixtureDetails.fixture.date;
              updatePayloadForCurrentFixture.season_year = new Date(apiFixtureDetails.fixture.date).getFullYear();
              updatePayloadForCurrentFixture.league_id = apiFixtureDetails.league.id;
              updatePayloadForCurrentFixture.league = apiFixtureDetails.league;
              updatePayloadForCurrentFixture.fixture = apiFixtureDetails.fixture;
              updatePayloadForCurrentFixture.teams = apiFixtureDetails.teams;
              updatePayloadForCurrentFixture.home_team_id = apiFixtureDetails.teams.home.id;
              updatePayloadForCurrentFixture.away_team_id = apiFixtureDetails.teams.away.id;
              updatePayloadForCurrentFixture.match_status = apiFixtureDetails.fixture.status.short;
              updatePayloadForCurrentFixture.status = apiFixtureDetails.fixture.status; // CRITICAL: Update status JSONB
              updatePayloadForCurrentFixture.score = apiFixtureDetails.score;
              updatePayloadForCurrentFixture.venue = apiFixtureDetails.fixture.venue;
              updatePayloadForCurrentFixture.goals = apiFixtureDetails.goals;
              updatePayloadForCurrentFixture.timezone = apiFixtureDetails.fixture.timezone;
              updatePayloadForCurrentFixture.referee = apiFixtureDetails.fixture.referee;
              updatePayloadForCurrentFixture.details_last_updated_at = phase3Timestamp;

              // Also populate events, stats, lineups if present in this detailed response
              if (apiFixtureDetails.events && Array.isArray(apiFixtureDetails.events)) {
                updatePayloadForCurrentFixture.event_data = apiFixtureDetails.events;
                const processedEvents = processEventData(apiFixtureDetails.events);
                updatePayloadForCurrentFixture.event_count = processedEvents.event_count;
                updatePayloadForCurrentFixture.event_cards_yellow = processedEvents.event_cards_yellow;
                updatePayloadForCurrentFixture.event_cards_red = processedEvents.event_cards_red;
                updatePayloadForCurrentFixture.event_substitutions = processedEvents.event_substitutions;
                updatePayloadForCurrentFixture.event_last_updated = phase3Timestamp;
                
                effectiveFixtureData.event_data = apiFixtureDetails.events; // Update effective data
                // Update other effective event-derived fields if necessary
                needsDbUpdateForCurrentFixture = true;
                totalEventsFetched++;
                console.log(`INFO: Successfully fetched and processed events for fixture ${fixtureId} in Phase 3.`);
              }
              if (apiFixtureDetails.statistics && Array.isArray(apiFixtureDetails.statistics)) {
                updatePayloadForCurrentFixture.fixture_statistics = apiFixtureDetails.statistics;
                updatePayloadForCurrentFixture.statistics_last_updated = phase3Timestamp;
                if (apiFixtureDetails.teams.home.id && apiFixtureDetails.teams.away.id) {
                    updatePayloadForCurrentFixture.ball_possession = extractBallPossession(apiFixtureDetails.statistics, apiFixtureDetails.teams.home.id, apiFixtureDetails.teams.away.id);
                }
              }
              if (apiFixtureDetails.lineups && Array.isArray(apiFixtureDetails.lineups)) {
                updatePayloadForCurrentFixture.lineups = apiFixtureDetails.lineups;
                updatePayloadForCurrentFixture.lineups_last_updated = phase3Timestamp;
              }
              
              needsDbUpdateForCurrentFixture = true;
              totalCoreDetailsRefreshedInPhase3++;
              // Update effectiveFixtureData with the newly fetched details for subsequent checks
              effectiveFixtureData = { ...effectiveFixtureData, ...updatePayloadForCurrentFixture, status: updatePayloadForCurrentFixture.status as ApiFixtureStatus };
            }
          }
        } catch (error: any) {
          console.error(`ERROR: Phase 3: Critical error during core detail refresh for fixture ${fixtureId}:`, error.message);
          totalPhase3ApiErrors++;
        }
      }

      // 2. Fetch Events if still needed
      if (effectiveFixtureData.event_data === null || (Array.isArray(effectiveFixtureData.event_data) && effectiveFixtureData.event_data.length === 0)) {
        // Add a small delay between API calls to avoid ECONNRESET
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`INFO: Phase 3: event_data is NULL. Fetching events for fixture ${fixtureId}...`);
        const eventsApiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures/events?fixture=${fixtureId}`;
        try {
          const eventsResponse = await fetch(eventsApiUrl, { headers: SCRIPT_API_CONFIG.headers });
          if (!eventsResponse.ok) {
            console.error(`ERROR: API error fetching events for fixture ${fixtureId}: ${eventsResponse.status} ${eventsResponse.statusText}`);
            totalPhase3ApiErrors++;
          } else {
            const eventData = await eventsResponse.json();
            if (eventData.errors && (Array.isArray(eventData.errors) ? eventData.errors.length > 0 : Object.keys(eventData.errors).length > 0) || eventData.results === 0) {
              console.warn(`WARNING: API returned errors or no events for fixture ${fixtureId}:`, JSON.stringify(eventData.errors || 'No event data'));
              updatePayloadForCurrentFixture.event_data = []; 
              updatePayloadForCurrentFixture.event_last_updated = phase3Timestamp; // Mark as checked
              needsDbUpdateForCurrentFixture = true;
            } else {
              updatePayloadForCurrentFixture.event_data = eventData.response;
              const processedEvents = processEventData(eventData.response);
              updatePayloadForCurrentFixture.event_count = processedEvents.event_count;
              updatePayloadForCurrentFixture.event_cards_yellow = processedEvents.event_cards_yellow;
              updatePayloadForCurrentFixture.event_cards_red = processedEvents.event_cards_red;
              updatePayloadForCurrentFixture.event_substitutions = processedEvents.event_substitutions;
              updatePayloadForCurrentFixture.event_last_updated = phase3Timestamp;
              
              effectiveFixtureData.event_data = eventData.response; // Update effective data
              // Update other effective event-derived fields if necessary
              needsDbUpdateForCurrentFixture = true;
              totalEventsFetched++;
              console.log(`INFO: Successfully fetched and processed events for fixture ${fixtureId} in Phase 3.`);
            }
          }
        } catch (error: any) {
          console.error(`ERROR: Phase 3: Critical error during event fetch for fixture ${fixtureId}:`, error.message);
          totalPhase3ApiErrors++;
        }
      }

      // 3. Fetch Statistics if still needed
      if (effectiveFixtureData.fixture_statistics === null || (Array.isArray(effectiveFixtureData.fixture_statistics) && effectiveFixtureData.fixture_statistics.length === 0)) {
        // Add a small delay between API calls to avoid ECONNRESET
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`INFO: Phase 3: fixture_statistics is NULL. Fetching statistics for fixture ${fixtureId}...`);
        const statsApiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures/statistics?fixture=${fixtureId}`;
        const statsResponse = await fetch(statsApiUrl, { headers: SCRIPT_API_CONFIG.headers });

        if (!statsResponse.ok) {
          console.error(`ERROR: API error fetching statistics for fixture ${fixtureId}: ${statsResponse.status} ${statsResponse.statusText}`);
          const errorBody = await statsResponse.text().catch(() => "Could not read error body");
          console.error(`ERROR: API Error Body: ${errorBody}`);
          totalPhase3ApiErrors++;
        } else {
          const statsData = await statsResponse.json();
           if (statsData.errors && (Array.isArray(statsData.errors) ? statsData.errors.length > 0 : Object.keys(statsData.errors).length > 0)) {
              console.error(colors.red(`ERROR: API returned errors for statistics on fixture ${fixtureId}:`), JSON.stringify(statsData.errors));
              totalPhase3ApiErrors++;
          } else {
              const fetchedStats = statsData.response || [];
              updatePayloadForCurrentFixture.fixture_statistics = fetchedStats;
              updatePayloadForCurrentFixture.statistics_last_updated = phase3Timestamp;
              if (effectiveFixtureData.home_team_id && effectiveFixtureData.away_team_id) { // Ensure IDs are available
                  updatePayloadForCurrentFixture.ball_possession = extractBallPossession(fetchedStats, effectiveFixtureData.home_team_id, effectiveFixtureData.away_team_id);
              }
              console.log(`INFO: Successfully fetched statistics for fixture ${fixtureId}.`);
              totalStatsFetched++;
              needsDbUpdateForCurrentFixture = true;
          }
        }
      }

      // 4. Fetch Lineups if still needed
      if (effectiveFixtureData.lineups === null || (Array.isArray(effectiveFixtureData.lineups) && effectiveFixtureData.lineups.length === 0)) {
        // Add a small delay between API calls to avoid ECONNRESET
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`INFO: Phase 3: lineups is NULL. Fetching lineups for fixture ${fixtureId}...`);
        const lineupsApiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures/lineups?fixture=${fixtureId}`;
        const lineupsResponse = await fetch(lineupsApiUrl, { headers: SCRIPT_API_CONFIG.headers });

        if (!lineupsResponse.ok) {
          console.error(`ERROR: API error fetching lineups for fixture ${fixtureId}: ${lineupsResponse.status} ${lineupsResponse.statusText}`);
          const errorBody = await lineupsResponse.text().catch(() => "Could not read error body");
          console.error(`ERROR: API Error Body: ${errorBody}`);
          totalPhase3ApiErrors++;
        } else {
          const lineupsData = await lineupsResponse.json();
          if (lineupsData.errors && (Array.isArray(lineupsData.errors) ? lineupsData.errors.length > 0 : Object.keys(lineupsData.errors).length > 0)) {
              console.error(colors.red(`ERROR: API returned errors for lineups on fixture ${fixtureId}:`), JSON.stringify(lineupsData.errors));
              totalPhase3ApiErrors++;
          } else {
              updatePayloadForCurrentFixture.lineups = lineupsData.response || [];
              updatePayloadForCurrentFixture.lineups_last_updated = phase3Timestamp;
              console.log(`INFO: Successfully fetched lineups for fixture ${fixtureId}.`);
              totalLineupsFetched++;
              needsDbUpdateForCurrentFixture = true;
          }
        }
      }

      // 5. Fetch Head-to-Head if still needed
      const homeTeamIdForH2H = effectiveFixtureData.home_team_id;
      const awayTeamIdForH2H = effectiveFixtureData.away_team_id;
      if (effectiveFixtureData.head_to_head === null && homeTeamIdForH2H && awayTeamIdForH2H) {
        // Add a small delay between API calls to avoid ECONNRESET
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`INFO: Phase 3: head_to_head is NULL. Fetching H2H for fixture ${fixtureId} (Teams: ${homeTeamIdForH2H} vs ${awayTeamIdForH2H})...`);
        const h2hApiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures/headtohead?h2h=${homeTeamIdForH2H}-${awayTeamIdForH2H}`;
        const h2hResponse = await fetch(h2hApiUrl, { headers: SCRIPT_API_CONFIG.headers });

        if (!h2hResponse.ok) {
          console.error(`ERROR: API error fetching H2H for fixture ${fixtureId}: ${h2hResponse.status} ${h2hResponse.statusText}`);
          totalPhase3ApiErrors++;
        } else {
          const h2hData = await h2hResponse.json();
          if (h2hData.errors && (Array.isArray(h2hData.errors) ? h2hData.errors.length > 0 : Object.keys(h2hData.errors).length > 0)) {
              console.error(colors.red(`ERROR: API returned errors for H2H on fixture ${fixtureId}:`), JSON.stringify(h2hData.errors));
              totalPhase3ApiErrors++;
          } else {
              updatePayloadForCurrentFixture.head_to_head = h2hData.response || [];
              updatePayloadForCurrentFixture.h2h_last_updated = phase3Timestamp;
              console.log(`INFO: Successfully fetched H2H data for fixture ${fixtureId}.`);
              totalH2HFetched++;
              needsDbUpdateForCurrentFixture = true;
          }
        }
      } else if (effectiveFixtureData.head_to_head === null && (!homeTeamIdForH2H || !awayTeamIdForH2H)) {
          console.warn(`WARNING: Phase 3: Cannot fetch H2H for fixture ${fixtureId} due to missing home/away team IDs.`);
      }

      // 6. Fetch Player Statistics if still needed
      if (effectiveFixtureData.player_statistics === null || (Array.isArray(effectiveFixtureData.player_statistics) && effectiveFixtureData.player_statistics.length === 0)) {
        // Add a small delay between API calls to avoid ECONNRESET
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`INFO: Phase 3: player_statistics is NULL. Fetching player statistics for fixture ${fixtureId}...`);
        const playerStatsApiUrl = `${SCRIPT_API_CONFIG.baseUrl}/fixtures/players?fixture=${fixtureId}`;
        const playerStatsResponse = await fetch(playerStatsApiUrl, { headers: SCRIPT_API_CONFIG.headers });

        if (!playerStatsResponse.ok) {
          console.error(`ERROR: API error fetching player statistics for fixture ${fixtureId}: ${playerStatsResponse.status} ${playerStatsResponse.statusText}`);
          totalPhase3ApiErrors++;
        } else {
          const playerStatsData = await playerStatsResponse.json();
          if (playerStatsData.errors && (Array.isArray(playerStatsData.errors) ? playerStatsData.errors.length > 0 : Object.keys(playerStatsData.errors).length > 0)) {
              console.error(colors.red(`ERROR: API returned errors for player statistics on fixture ${fixtureId}:`), JSON.stringify(playerStatsData.errors));
              totalPhase3ApiErrors++;
          } else {
              updatePayloadForCurrentFixture.player_statistics = playerStatsData.response || [];
              updatePayloadForCurrentFixture.player_statistics_last_updated = phase3Timestamp;
              console.log(`INFO: Successfully fetched player statistics for fixture ${fixtureId}.`);
              totalPlayerStatsFetched++;
              needsDbUpdateForCurrentFixture = true;
          }
        }
      }

      // Final DB Update for the current fixture in Phase 3 if changes were made
      if (needsDbUpdateForCurrentFixture && Object.keys(updatePayloadForCurrentFixture).length > 0) {
        console.log(`INFO: Phase 3: Attempting to update DB for fixture ${fixtureId} with ${Object.keys(updatePayloadForCurrentFixture).length} changes.`);
        updatePayloadForCurrentFixture.updated_at = phase3Timestamp; 
        const { error: updateError } = await supabase
          .from('fixtures')
          .update(updatePayloadForCurrentFixture)
          .eq('id', fixtureId);

        if (updateError) {
          console.error(`ERROR: Phase 3: Error updating fixture ${fixtureId} in Supabase:`, updateError.message);
          totalPhase3DbErrors++;
        } else {
          console.log(`INFO: Phase 3: Successfully updated fixture ${fixtureId} in Supabase.`);
        }
      } else if (needsDbUpdateForCurrentFixture) { 
          console.log(`INFO: Phase 3: Fixture ${fixtureId} marked for update, but no qualifying data changes found in payload. Skipping DB call.`);
      }
    } // End of for...of loop for ftFixtures
  }

  console.log(`INFO: Phase 3: Total fixtures from DB checked: ${totalFtFixturesCheckedForPhase3}`);
  console.log('\n🏁 Phase 3 (FT Detail Fetch) complete!');
  console.log(`Successfully refreshed core details for ${totalCoreDetailsRefreshedInPhase3} fixtures in Phase 3.`);
  console.log(`Successfully fetched event data for ${totalEventsFetched} fixtures in Phase 3.`);
  console.log(`Successfully fetched statistics for ${totalStatsFetched} fixtures in Phase 3.`);
  console.log(`Successfully fetched lineups for ${totalLineupsFetched} fixtures in Phase 3.`);
  console.log(`Successfully fetched H2H data for ${totalH2HFetched} fixtures in Phase 3.`);
  console.log(`Successfully fetched player statistics for ${totalPlayerStatsFetched} fixtures in Phase 3.`);

  if (totalPhase3ApiErrors > 0) {
    console.error(`ERROR: Total API errors during Phase 3: ${totalPhase3ApiErrors}`);
  }
  if (totalPhase3DbErrors > 0) {
    console.error(`ERROR: Total Supabase errors during Phase 3: ${totalPhase3DbErrors}`);
  }
  // --- END: Phase 3 ---

  console.log('\n🎉 Viasport Fixture Synchronization Script Finished All Operations.');
}

syncFixtures().catch(error => {
  console.error('FATAL: Unhandled error in syncFixtures:', error);
  process.exit(1);
});