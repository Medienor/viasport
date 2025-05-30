export const API_CONFIG = {
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
  { id: 104, name: '1. Division' }, // Updated name from 'OBOS-ligaen'
  { id: 725, name: 'Toppserien' }, // Norwegian Women's League
  { id: 105, name: 'NM Cupen' }, // Norwegian Cup
  { id: 557, name: 'Super Cup' }, // Norwegian Super Cup
  { id: 915, name: '1. Division Women' },
  { id: 473, name: '2. Division - Group 1' },
  { id: 474, name: '2. Division - Group 2' },
  { id: 1054, name: '2. Division - Play-offs' },
  { id: 774, name: '3. Division - Girone 1' },
  { id: 775, name: '3. Division - Girone 2' },
  { id: 776, name: '3. Division - Girone 3' },
  { id: 777, name: '3. Division - Girone 4' },
  { id: 778, name: '3. Division - Girone 5' },
  { id: 779, name: '3. Division - Girone 6' },
  { id: 823, name: 'Nasjonal U19 Champions League' },

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
  { id: 107, name: 'I Liga' }, // Poland Second Division
  { id: 108, name: 'Polish Cup' }, // Poland Cup
  { id: 109, name: 'II Liga - East' }, // Poland Third Division East
  { id: 727, name: 'Polish Super Cup' }, // Poland Super Cup
  { id: 780, name: 'III Liga - Group 1' }, // Poland Fourth Division Group 1
  { id: 781, name: 'III Liga - Group 2' }, // Poland Fourth Division Group 2
  { id: 782, name: 'III Liga - Group 3' }, // Poland Fourth Division Group 3
  { id: 783, name: 'III Liga - Group 4' }, // Poland Fourth Division Group 4
  { id: 1033, name: 'Ekstraliga Women' }, // Poland Women's League
  { id: 676, name: 'Central Youth League' }, // Poland Youth League
  { id: 88, name: 'Eredivisie' }, // Netherlands
  { id: 113, name: 'Allsvenskan' }, // Sweden
  { id: 40, name: 'Championship' }, // English Second Tier
  { id: 179, name: 'Superliga' }, // Denmark
  { id: 120, name: '1. Division' }, // Denmark Second Tier
  { id: 122, name: '2. Division' }, // Denmark Third Tier
  { id: 862, name: '3. Division' }, // Denmark Fourth Tier
  { id: 357, name: 'Premier Division' }, // Ireland
  { id: 358, name: 'First Division' }, // Ireland Second Tier
  { id: 128, name: 'Veikkausliiga' }, // Finland
  { id: 119, name: 'Tippeligaen' }, // Iceland
  { id: 165, name: '1. Deild' }, // Iceland Second Tier
  { id: 166, name: '2. Deild' }, // Iceland Third Tier
  { id: 167, name: 'Cup' }, // Iceland Cup

  // Major European Competitions
  { id: 2, name: 'Champions League' },
  { id: 3, name: 'Europa League' },
  { id: 848, name: 'Conference League' },
  { id: 531, name: 'UEFA Super Cup' },
  { id: 525, name: 'Women\'s Champions League' },
  { id: 1083, name: 'Women\'s Championship Qualification' },

  // International Teams & Competitions
  { id: 1, name: 'World Cup' },
  { id: 4, name: 'Euro Championship' },
  { id: 960, name: 'Euro Championship Qualification' },
  { id: 5, name: 'Nations League' },
  { id: 1040, name: 'UEFA Nations League Women' },
  { id: 10, name: 'International Friendlies' },
  { id: 667, name: 'Club Friendlies' },
  { id: 480, name: 'Olympics Men' },
  
  // Other Continental Competitions
  { id: 15, name: 'Copa America' },
  { id: 17, name: 'African Nations Cup' },
  { id: 18, name: 'AFC Asian Cup' },
  { id: 15, name: 'FIFA Club World Cup' },
  { id: 937, name: 'Emirates Cup' },
  { id: 772, name: 'Leagues Cup' },

  // Major Non-European Leagues
  { id: 71, name: 'Serie A' }, // Brazil
  { id: 128, name: 'Liga MX' }, // Mexico
  { id: 141, name: 'Primera División' }, // Argentina
  { id: 169, name: 'Super League' }, // China
  { id: 98, name: 'J1 League' }, // Japan
  { id: 253, name: 'MLS' }, // USA
  { id: 389, name: 'Premier League' }, // Kazakhstan
  { id: 570, name: 'Premier League' }, // Ghana
  
  // Vietnamese Leagues
  { id: 340, name: 'V.League 1' }, // Vietnamese top division
  { id: 637, name: 'V.League 2' }, // Vietnamese second division
  { id: 341, name: 'Cup' }, // Vietnamese Cup
  { id: 831, name: 'Super Cup' }, // Vietnamese Super Cup
  
  // Women's Football
  { id: 725, name: 'Toppserien' }, // Already added above (Norway)
  { id: 37, name: 'Women\'s World Cup' },
  { id: 38, name: 'Women\'s Champions League' },

  // Additional Swedish Leagues
  { id: 115, name: 'Svenska Cupen' },
  { id: 563, name: 'Ettan Norra' },
  { id: 564, name: 'Ettan Södra' },
  { id: 736, name: 'Elitettan' },
  { id: 549, name: 'Damallsvenskan' },
  { id: 592, name: 'Division 2 Norra Götaland' },

  // Iranian Leagues
  { id: 290, name: 'Persian Gulf Pro League' },
  { id: 495, name: 'Hazfi Cup' },
  { id: 291, name: 'Azadegan League' },
  { id: 905, name: 'Super Cup' },

  // Saudi Arabian Leagues
  { id: 307, name: 'Pro League' }, // Saudi Pro League
  { id: 308, name: 'Division 1' }, // Saudi First Division
  { id: 309, name: 'Division 2' }, // Saudi Second Division
  { id: 504, name: 'King\'s Cup' }, // Saudi King's Cup
  { id: 826, name: 'Saudi Super Cup' }, // Saudi Super Cup
  { id: 827, name: 'Crown Prince Cup' }, // Saudi Crown Prince Cup
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
    const season = new Date().getFullYear();
    const response = await fetch(
      `${API_CONFIG.baseUrl}/teams?league=${league.id}&season=${season}`,
      { headers: API_CONFIG.headers }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
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

export async function fetchTeamData(teamId: number) {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/teams?id=${teamId}`,
      { headers: API_CONFIG.headers }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data.response?.[0] || null;
  } catch (error) {
    console.error(`Error fetching team data:`, error);
    return null;
  }
} 