import { NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(request: Request) {
  try {
    // Get query parameters from the request URL
    const url = new URL(request.url);
    const league = url.searchParams.get('league') || '39'; // Default to Premier League
    const season = url.searchParams.get('season') || '2023'; // Default to current season
    
    console.log(`Fetching top red cards for league ${league} and season ${season}`);
    
    // Skip API call if disabled
    if (DISABLE_API_CALLS) {
      console.log(`[API DISABLED] Top red cards API call would have been made for league ${league}, season ${season}`);
      
      // Return mock data
      return NextResponse.json({
        get: "players/topredcards",
        parameters: { league, season },
        errors: [],
        results: 2,
        paging: { current: 1, total: 1 },
        response: [
          {
            player: {
              id: 2778,
              name: "Jean-Philippe Gbamin",
              firstname: "Jean-Philippe",
              lastname: "Gbamin",
              age: 28,
              birth: { date: "1995-09-25", place: "San-Pédro", country: "Côte d'Ivoire" },
              nationality: "Côte d'Ivoire",
              height: "186 cm",
              weight: "83 kg",
              injured: false,
              photo: "https://media.api-sports.io/football/players/2778.png"
            },
            statistics: [{
              team: {
                id: 45,
                name: "Everton",
                logo: "https://media.api-sports.io/football/teams/45.png"
              },
              league: {
                id: parseInt(league),
                name: "Premier League",
                country: "England",
                logo: "https://media.api-sports.io/football/leagues/39.png",
                flag: "https://media.api-sports.io/flags/gb.svg",
                season: parseInt(season)
              },
              games: {
                appearences: 15,
                lineups: 12,
                minutes: 1080,
                number: null,
                position: "Midfielder",
                rating: "6.5",
                captain: false
              },
              cards: {
                yellow: 5,
                yellowred: 1,
                red: 2
              }
            }]
          },
          {
            player: {
              id: 2938,
              name: "Joao Cancelo",
              firstname: "Joao",
              lastname: "Cancelo",
              age: 29,
              birth: { date: "1994-05-27", place: "Barreiro", country: "Portugal" },
              nationality: "Portugal",
              height: "182 cm",
              weight: "74 kg",
              injured: false,
              photo: "https://media.api-sports.io/football/players/2938.png"
            },
            statistics: [{
              team: {
                id: 50,
                name: "Manchester City",
                logo: "https://media.api-sports.io/football/teams/50.png"
              },
              league: {
                id: parseInt(league),
                name: "Premier League",
                country: "England",
                logo: "https://media.api-sports.io/football/leagues/39.png",
                flag: "https://media.api-sports.io/flags/gb.svg",
                season: parseInt(season)
              },
              games: {
                appearences: 20,
                lineups: 18,
                minutes: 1620,
                number: null,
                position: "Defender",
                rating: "7.2",
                captain: false
              },
              cards: {
                yellow: 4,
                yellowred: 0,
                red: 1
              }
            }]
          }
        ]
      });
    }
    
    // Fetch data from the RapidAPI football API
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players/topredcards?league=${league}&season=${season}`,
      {
        headers: {
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching top red cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top red cards' },
      { status: 500 }
    );
  }
} 