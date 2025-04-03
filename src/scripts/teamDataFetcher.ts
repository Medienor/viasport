import fs from 'fs/promises';
import path from 'path';

const API_CONFIG = {
  baseUrl: 'https://api-football-v1.p.rapidapi.com/v3',
  headers: {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPID_API_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90'
  }
};

interface TeamData {
  team: any;
  leagues: any[];
  seasons: any[];
  fixtures: {
    upcoming: any[];
    past: any[];
  };
  statistics: any;
  lastUpdated: string;
}

// Export the MAJOR_LEAGUES constant
export const MAJOR_LEAGUES = [
  // Norwegian Leagues
  { id: 103, name: 'Eliteserien' },
  { id: 104, name: 'OBOS-ligaen' },
  { id: 725, name: 'Toppserien' }, // Norwegian Women's League

  // Top 5 Leagues
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
  { id: 61, name: 'Ligue 1' },

  // Other Major European Leagues
  { id: 203, name: 'Süper Lig' }, // Turkey
  { id: 94, name: 'Primeira Liga' }, // Portugal
  { id: 106, name: 'Ekstraklasa' }, // Poland
  { id: 88, name: 'Eredivisie' }, // Netherlands
  { id: 113, name: 'Allsvenskan' }, // Sweden
  { id: 40, name: 'Championship' }, // English Second Tier
  { id: 179, name: 'Superliga' }, // Denmark
  { id: 128, name: 'Veikkausliiga' }, // Finland
  { id: 119, name: 'Tippeligaen' }, // Iceland

  // Major European Competitions
  { id: 2, name: 'Champions League' },
  { id: 3, name: 'Europa League' },
  { id: 848, name: 'Conference League' },

  // International Teams & Competitions
  { id: 1, name: 'World Cup' },
  { id: 4, name: 'Euro Championship' },
  { id: 5, name: 'Nations League' },
  { id: 10, name: 'Friendlies' }, // International Friendlies
  
  // Other Continental Competitions
  { id: 15, name: 'Copa America' },
  { id: 17, name: 'African Nations Cup' },
  { id: 18, name: 'AFC Asian Cup' },

  // Major Non-European Leagues
  { id: 71, name: 'Serie A' }, // Brazil
  { id: 128, name: 'Liga MX' }, // Mexico
  { id: 141, name: 'Primera División' }, // Argentina
  { id: 169, name: 'Super League' }, // China
  { id: 98, name: 'J1 League' }, // Japan
  { id: 253, name: 'MLS' }, // USA
  
  // Women's Football
  { id: 725, name: 'Toppserien' }, // Already added above (Norway)
  { id: 37, name: 'Women\'s World Cup' },
  { id: 38, name: 'Women\'s Champions League' }
];

// Add this constant at the top of the file, before any functions
const norwegianLeagues = [103, 104, 725]; // Eliteserien, OBOS-ligaen, Toppserien

// Export the rate limiter
export const rateLimiter = {
  lastCall: 0,
  minDelay: 500, // 500ms between calls
  
  async checkLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minDelay - timeSinceLastCall)
      );
    }
    
    this.lastCall = Date.now();
  }
};

// Add this type at the top of the file
type ProgressCallback = (data: {
  teamId: number;
  teamName: string;
  leagueName: string;
  totalTeams: number;
  leagueTotal: number;
  leagueProcessed: number;
}) => void;

// Helper function to determine the correct season
function getSeasonForLeague(leagueId: number): number {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Norwegian leagues run within a calendar year
  if (norwegianLeagues.includes(leagueId)) {
    return currentYear;
  }
  
  // For other leagues, if we're in second half of year, use next year
  return currentDate.getMonth() >= 6 ? currentYear + 1 : currentYear;
}

export async function fetchTeamsFromLeague(league: typeof MAJOR_LEAGUES[0]) {
  try {
    const season = getSeasonForLeague(league.id);
    console.log(`Fetching teams for ${league.name} (${season})...`);
    
    const response = await fetch(
      `${API_CONFIG.baseUrl}/teams?league=${league.id}&season=${season}`,
      { headers: API_CONFIG.headers }
    );

    if (!response.ok) {
      const responseData = await response.json().catch(() => ({}));
      throw new Error(`API responded with status: ${response.status}, message: ${JSON.stringify(responseData)}`);
    }

    const data = await response.json();
    console.log(`Found ${data.response?.length || 0} teams for ${league.name}`);
    return data.response || [];
  } catch (error) {
    console.error(`Error fetching teams for ${league.name}:`, error);
    return [];
  }
}

async function fetchLeagues() {
  console.log('Fetching all leagues...');
  
  try {
    const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/leagues', {
      headers: API_CONFIG.headers
    });
    
    const data = await response.json();
    
    if (!data.response || data.response.length === 0) {
      console.error('No leagues found or API error:', data);
      return [];
    }
    
    console.log(`Found ${data.response.length} leagues`);
    return data.response;
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }
}

async function getAllTeams() {
  const uniqueTeams = new Map();
  console.log('Starting team collection process...');

  // ONLY process the defined major leagues
  for (const league of MAJOR_LEAGUES) {
    console.log(`Processing ${league.name}...`);
    try {
      await rateLimiter.checkLimit();
      const response = await fetch(
        `${API_CONFIG.baseUrl}/teams?league=${league.id}&season=2024`,
        { headers: API_CONFIG.headers }
      );
      
      const data = await response.json();
      
      if (data.response) {
        data.response.forEach((teamData: any) => {
          if (!uniqueTeams.has(teamData.team.id)) {
            uniqueTeams.set(teamData.team.id, teamData.team);
          }
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing ${league.name}:`, error);
    }
  }

  const teamsArray = Array.from(uniqueTeams.values());
  console.log(`Found ${teamsArray.length} unique teams from major leagues`);
  return teamsArray;
}

async function fetchTeamFullData(teamId: number) {
  try {
    // First get the team's leagues to determine correct season
    const leaguesResponse = await fetch(
      `${API_CONFIG.baseUrl}/leagues?team=${teamId}&current=true`, 
      { headers: API_CONFIG.headers }
    );
    const leaguesData = await leaguesResponse.json();
    
    // Get all current leagues for the team
    const teamLeagues = leaguesData.response || [];
    
    // Find the primary league (prioritize main domestic league)
    const primaryLeague = teamLeagues.find((l: any) => 
      l.league.type === 'League' && !l.league.name.includes('Champions') && !l.league.name.includes('Europa')
    ) || teamLeagues[0];

    const primaryLeagueId = primaryLeague?.league?.id;
    const season = getSeasonForLeague(primaryLeagueId);

    console.log(`Fetching full data for team ${teamId} (season ${season}, league ${primaryLeagueId})...`);

    // Rest of the function remains same but uses dynamic season
    const [teamData, seasonsData] = await Promise.all([
      fetch(`${API_CONFIG.baseUrl}/teams?id=${teamId}`, 
        { headers: API_CONFIG.headers }),
      fetch(`${API_CONFIG.baseUrl}/teams/seasons?team=${teamId}`, 
        { headers: API_CONFIG.headers })
    ]);

    // For fixtures, get both league and cup matches
    const [upcomingFixtures, pastFixtures] = await Promise.all([
      fetch(
        `${API_CONFIG.baseUrl}/fixtures?team=${teamId}&next=20&status=NS`, 
        { headers: API_CONFIG.headers }
      ),
      fetch(
        `${API_CONFIG.baseUrl}/fixtures?team=${teamId}&last=10&status=FT`, 
        { headers: API_CONFIG.headers }
      )
    ]);

    const [team, seasons] = await Promise.all([
      teamData.json(),
      seasonsData.json()
    ]);

    // Fetch fixtures with more specific parameters
    console.log(`Fetching fixtures for team ${teamId}...`);
    const [upcoming, past] = await Promise.all([
      upcomingFixtures.json(),
      pastFixtures.json()
    ]);

    // Get statistics for the main league if available
    let statistics = null;
    if (primaryLeagueId) {
      console.log(`Fetching statistics for team ${teamId} in league ${primaryLeagueId}...`);
      const statsResponse = await fetch(
        `${API_CONFIG.baseUrl}/teams/statistics?team=${teamId}&league=${primaryLeagueId}&season=${season}`,
        { headers: API_CONFIG.headers }
      );
      statistics = await statsResponse.json();
    }

    // Process fixtures to include only necessary data and sort by date
    const processFixtures = (fixtures: any[]) => {
      return fixtures.map(f => ({
        fixture: {
          id: f.fixture.id,
          date: f.fixture.date,
          venue: f.fixture.venue,
          status: f.fixture.status,
          timestamp: f.fixture.timestamp
        },
        league: {
          id: f.league.id,
          name: f.league.name,
          logo: f.league.logo
        },
        teams: {
          home: {
            id: f.teams.home.id,
            name: f.teams.home.name,
            logo: f.teams.home.logo,
            winner: f.teams.home.winner
          },
          away: {
            id: f.teams.away.id,
            name: f.teams.away.name,
            logo: f.teams.away.logo,
            winner: f.teams.away.winner
          }
        },
        goals: f.goals,
        score: f.score
      }));
    };

    // Structure the complete response
    const structuredData = {
      team: team.response?.[0],
      leagues: leaguesData.response || [],
      seasons: seasons.response || [],
      fixtures: {
        upcoming: processFixtures(upcoming.response || []).sort((a: any, b: any) => 
          new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
        ),
        past: processFixtures(past.response || []).sort((a: any, b: any) => 
          new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
        )
      },
      statistics: statistics?.response || null,
      lastUpdated: new Date().toISOString()
    };

    console.log(`Successfully fetched all data for team ${teamId} including:`);
    console.log(`- ${structuredData.fixtures.upcoming.length} upcoming fixtures`);
    console.log(`- ${structuredData.fixtures.past.length} past fixtures`);
    console.log(`- ${structuredData.leagues.length} leagues`);

    return structuredData;
  } catch (error) {
    console.error(`Error fetching data for team ${teamId}:`, error);
    throw error;
  }
}

// Update the function signature to accept the callback
export async function updateAllTeamsData(progressCallback?: ProgressCallback) {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'teams');
    await fs.mkdir(dataDir, { recursive: true });

    const teams = await getAllTeams();
    console.log(`Starting update for ${teams.length} teams...`);

    for (let i = 0; i < teams.length; i += 5) {
      const batch = teams.slice(i, i + 5);
      
      await Promise.all(
        batch.map(async (team) => {
          try {
            console.log(`Updating data for ${team.name} (${team.id})...`);
            const fullTeamData = await fetchTeamFullData(team.id);
            
            await fs.writeFile(
              path.join(dataDir, `${team.id}.json`),
              JSON.stringify(fullTeamData, null, 2),
              'utf-8'
            );

            // Call the progress callback
            progressCallback?.({
              teamId: team.id,
              teamName: team.name,
              leagueName: fullTeamData.leagues[0].name,
              totalTeams: 1100, // Approximate total
              leagueTotal: fullTeamData.leagues.length,
              leagueProcessed: 1
            });
          } catch (error) {
            console.error(`Failed to update team ${team.name} (${team.id}):`, error);
          }
        })
      );

      // Add delay between batches
      if (i + 5 < teams.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('Team update completed successfully!');
  } catch (error) {
    console.error('Failed to update teams:', error);
    throw error;
  }
} 