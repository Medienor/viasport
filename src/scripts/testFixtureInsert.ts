import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fetch from 'node-fetch';
import axios from 'axios';
import { MAJOR_LEAGUES, rateLimiter } from './teamDataFetcher';

// Types for the API response
interface Fixture {
  fixture: {
    id: number;
    date: string;
    referee: string | null;
    timezone: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

interface Event {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player: {
    id: number | null;
    name: string | null;
  };
  assist: {
    id: number | null;
    name: string | null;
  };
  type: string;
  detail: string;
  comments: string | null;
}

// Load environment variables from .env.local in the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

// Try to load from .env.local first, then fall back to .env
let envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(rootDir, '.env');
}
dotenv.config({ path: envPath });

// Fixed Supabase URL (EXACTLY like fetchAllTeams.js)
const supabaseUrl = 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI';
const RAPID_API_KEY = process.env.RAPID_API_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';

// Create Supabase client with fetch
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetch as any
  }
});

const FINISHED_MATCH_STATUSES = ['FT', 'AET', 'PEN'];
const MAX_REQUESTS_PER_MINUTE = 700; // Increased but still safe
const DELAY_BETWEEN_REQUESTS = Math.ceil(60000 / MAX_REQUESTS_PER_MINUTE);

// Cache for head-to-head data to avoid duplicate API calls
const h2hCache = new Map<string, any>();

function getTeamPairKey(team1Id: number, team2Id: number): string {
  // Always store with lower ID first to ensure consistent keys
  const [lower, higher] = [team1Id, team2Id].sort((a, b) => a - b);
  return `${lower}-${higher}`;
}

async function fetchHeadToHead(team1Id: number, team2Id: number): Promise<any> {
  const pairKey = getTeamPairKey(team1Id, team2Id);
  
  // Check cache first
  if (h2hCache.has(pairKey)) {
    return h2hCache.get(pairKey);
  }

  await rateLimiter.checkLimit();

  try {
    const response = await axios.get(
      'https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead',
      {
        params: { h2h: pairKey },
        headers: {
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
          'X-RapidAPI-Key': RAPID_API_KEY
        }
      }
    );

    const h2hData = {
      head_to_head: response.data.response,
      h2h_last_updated: new Date().toISOString()
    };

    // Store in cache
    h2hCache.set(pairKey, h2hData);
    
    return h2hData;
  } catch (error) {
    console.error(`Error fetching H2H for teams ${team1Id}-${team2Id}:`, error);
    return null;
  }
}

async function fetchFixtureEvents(fixtureIds: number[]): Promise<Map<number, any>> {
  const eventMap = new Map();
  let processedCount = 0;
  
  for (const fixtureId of fixtureIds) {
    await rateLimiter.checkLimit();
    
    try {
      const response = await axios.get(
        'https://api-football-v1.p.rapidapi.com/v3/fixtures/events',
        {
          params: { fixture: fixtureId.toString() },
          headers: {
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
            'X-RapidAPI-Key': RAPID_API_KEY
          }
        }
      );

      const events = response.data.response;
      
      const eventCounts = {
        goals: events.filter((e: Event) => e.type === 'Goal').length,
        yellowCards: events.filter((e: Event) => e.type === 'Card' && e.detail === 'Yellow Card').length,
        redCards: events.filter((e: Event) => e.type === 'Card' && e.detail === 'Red Card').length,
        substitutions: events.filter((e: Event) => e.type === 'subst').length,
      };

      eventMap.set(fixtureId, {
        event_data: events,
        event_goals: eventCounts.goals,
        event_cards_yellow: eventCounts.yellowCards,
        event_cards_red: eventCounts.redCards,
        event_substitutions: eventCounts.substitutions,
        event_count: events.length,
        event_last_updated: new Date().toISOString()
      });

      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`Fetched events for ${processedCount}/${fixtureIds.length} fixtures`);
      }

    } catch (error) {
      console.error(`Error fetching events for fixture ${fixtureId}:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
  }

  return eventMap;
}

async function fetchFixtureStatistics(fixtureIds: number[]): Promise<Map<number, any>> {
  const statisticsMap = new Map();
  let processedCount = 0;
  
  for (const fixtureId of fixtureIds) {
    await rateLimiter.checkLimit();
    
    try {
      const response = await axios.get(
        'https://api-football-v1.p.rapidapi.com/v3/fixtures/statistics',
        {
          params: { fixture: fixtureId.toString() },
          headers: {
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
            'X-RapidAPI-Key': RAPID_API_KEY
          }
        }
      );

      const statistics = response.data.response;
      
      if (statistics && statistics.length > 0) {
        statisticsMap.set(fixtureId, {
          fixture_statistics: statistics,
          statistics_last_updated: new Date().toISOString()
        });
      }

      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`Fetched statistics for ${processedCount}/${fixtureIds.length} fixtures`);
      }

    } catch (error) {
      console.error(`Error fetching statistics for fixture ${fixtureId}:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
  }

  return statisticsMap;
}

async function fetchAndInsertFixtures(leagueId: number, leagueName: string, season: number) {
  console.log(`Processing ${leagueName} (${leagueId}) season ${season}...`);
  
  try {
    // 1. First, get all fixtures for this league/season
    const response = await axios.get<{ response: Fixture[] }>(
      'https://api-football-v1.p.rapidapi.com/v3/fixtures',
      {
        params: {
          league: leagueId.toString(),
          season: season.toString()
        },
        headers: {
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
          'X-RapidAPI-Key': RAPID_API_KEY
        }
      }
    );

    const fixtures = response.data.response;
    console.log(`Found ${fixtures.length} fixtures for ${leagueName}`);

    // Modify to include both finished and upcoming matches
    const relevantFixtureIds = fixtures
      .filter(f => [...FINISHED_MATCH_STATUSES, 'NS'].includes(f.fixture.status.short))
      .map(f => f.fixture.id);

    const { data: existingFixtures } = await supabase
      .from('fixtures')
      .select('id, event_data, fixture_statistics, head_to_head')
      .in('id', relevantFixtureIds);

    const existingEventIds = new Set(
      existingFixtures
        ?.filter(f => f.event_data)
        .map(f => f.id)
    );

    const existingStatisticsIds = new Set(
      existingFixtures
        ?.filter(f => f.fixture_statistics)
        .map(f => f.id)
    );

    // For events and statistics, still use only finished matches
    const fixturesNeedingEvents = relevantFixtureIds
      .filter(id => !existingEventIds.has(id));
    
    const fixturesNeedingStatistics = relevantFixtureIds
      .filter(id => !existingStatisticsIds.has(id));

    // For H2H, use all relevant fixtures (finished + upcoming)
    const fixturesNeedingH2H = relevantFixtureIds.filter(id => {
      const fixture = existingFixtures?.find(f => f.id === id);
      return !fixture?.head_to_head;
    });

    console.log(`Found ${fixturesNeedingEvents.length} fixtures needing events`);
    console.log(`Found ${fixturesNeedingStatistics.length} fixtures needing statistics`);
    console.log(`Found ${fixturesNeedingH2H.length} fixtures needing H2H data`);

    // 5. Fetch events and statistics in bulk
    const eventMap = await fetchFixtureEvents(fixturesNeedingEvents);
    const statisticsMap = await fetchFixtureStatistics(fixturesNeedingStatistics);

    // 6. Process all fixtures
    for (const fixture of fixtures) {
      const matchYear = new Date(fixture.fixture.date).getFullYear();
      
      // Get events and statistics if available
      const eventData = eventMap.get(fixture.fixture.id);
      const statisticsData = statisticsMap.get(fixture.fixture.id);

      // Get H2H data if needed
      let h2hData = null;
      if (fixturesNeedingH2H.includes(fixture.fixture.id)) {
        h2hData = await fetchHeadToHead(
          fixture.teams.home.id,
          fixture.teams.away.id
        );
      }

      const formattedFixture = {
        id: fixture.fixture.id,
        date: fixture.fixture.date,
        league_id: fixture.league.id,
        home_team_id: fixture.teams.home.id,
        away_team_id: fixture.teams.away.id,
        status: fixture.fixture.status,
        score: fixture.score,
        venue: fixture.fixture.venue,
        referee: fixture.fixture.referee,
        timezone: fixture.fixture.timezone,
        timestamp: fixture.fixture.timestamp,
        periods: fixture.fixture.periods,
        round: fixture.league.round,
        goals: fixture.goals,
        fixture: fixture.fixture,
        league: fixture.league,
        teams: fixture.teams,
        season_year: matchYear,
        match_status: fixture.fixture.status.short,
        updated_at: new Date().toISOString(),
        ...(eventData || {}),
        ...(statisticsData || {}),
        ...(h2hData || {})
      };

      // Upsert the fixture
      const { error } = await supabase
        .from('fixtures')
        .upsert(formattedFixture, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error upserting fixture ${fixture.fixture.id}:`, error);
      }
    }

    console.log(`Completed processing ${leagueName} season ${season}`);
    
  } catch (error) {
    console.error(`Error processing ${leagueName}:`, error);
  }
}

async function testFixtureInsert() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1];
  
  console.log(`Starting fixture fetch for all major leagues...`);
  console.log(`Years to process: ${years.join(', ')}`);
  console.log(`Total leagues to process: ${MAJOR_LEAGUES.length}`);

  // Process each league
  for (const league of MAJOR_LEAGUES) {
    console.log(`\nProcessing league: ${league.name} (${league.id})`);
    
    // Process each year for this league
    for (const year of years) {
      await fetchAndInsertFixtures(league.id, league.name, year);
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\nCompleted processing all leagues!');
}

// Run the test
testFixtureInsert(); 