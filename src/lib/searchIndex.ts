

// Define the API configuration
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';
const headers = {
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
  'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
};

// Define API response types
interface TeamResponse {
  team: {
    id: number;
    name: string;
    logo: string;
    country: string;
  };
}

interface LeagueResponse {
  league: {
    id: number;
    name: string;
    logo: string;
  };
  country: {
    name: string;
  };
}

export interface IndexedTeam {
  id: number;
  name: string;
  type: 'team';
  logo: string;
  country: string;
}

export interface IndexedLeague {
  id: number;
  name: string;
  type: 'league';
  logo: string;
  country: string;
}

// Combined type for search index
export type SearchIndexItem = IndexedTeam | IndexedLeague;

// Popular leagues to fetch teams from
const POPULAR_LEAGUES = [
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1
  2,    // Champions League
  3,    // Europa League
  1,    // World Cup
  4,    // Euro Championship
  103,  // Eliteserien
  113,  // Allsvenskan
  119,  // Danish Superliga
  88,   // Eredivisie
  94,   // Primeira Liga
  203,  // OBOS-ligaen
  // Add more leagues as needed
];

// Create and export the search index
export async function createSearchIndex() {
  const teams: IndexedTeam[] = [];
  const leagues: IndexedLeague[] = [];
  
  try {
    // Fetch teams from all popular leagues
    const teamsResponse = await fetch(
      `${BASE_URL}/teams?league=${POPULAR_LEAGUES.join(',')}`, 
      { headers }
    );
    const teamsData = await teamsResponse.json();
    
    teams.push(...teamsData.response.map((item: TeamResponse) => ({
      id: item.team.id,
      name: item.team.name,
      type: 'team' as const,
      logo: item.team.logo,
      country: item.team.country
    })));

    // Fetch all leagues
    const leaguesResponse = await fetch(`${BASE_URL}/leagues`, { headers });
    const leaguesData = await leaguesResponse.json();
    
    leagues.push(...leaguesData.response.map((item: LeagueResponse) => ({
      id: item.league.id,
      name: item.league.name,
      type: 'league' as const,
      logo: item.league.logo,
      country: item.country.name
    })));

    // Return the combined data
    return [...teams, ...leagues];

  } catch (error) {
    console.error('Error creating search index:', error);
    return null;
  }
} 