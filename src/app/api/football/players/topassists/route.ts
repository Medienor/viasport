import { NextResponse } from 'next/server';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

export async function GET(request: Request) {
  try {
    // Get query parameters from the request URL
    const url = new URL(request.url);
    const league = url.searchParams.get('league') || '39'; // Default to Premier League
    const season = url.searchParams.get('season') || '2023'; // Default to current season
    
    console.log(`Fetching top assists for league ${league} and season ${season}`);
    
    // Skip API call if disabled
    if (DISABLE_API_CALLS) {
      console.log(`[API DISABLED] Top assists API call would have been made for league ${league}, season ${season}`);
      
      // Return mock data
      return NextResponse.json({
        get: "players/topassists",
        parameters: { league, season },
        errors: [],
        results: 2,
        paging: { current: 1, total: 1 },
        response: [
          {
            player: {
              id: 1100,
              name: "Mohamed Salah",
              firstname: "Mohamed",
              lastname: "Salah",
              age: 31,
              birth: { date: "1992-06-15", place: "Nagrig", country: "Egypt" },
              nationality: "Egypt",
              height: "175 cm",
              weight: "71 kg",
              injured: false,
              photo: "https://media.api-sports.io/football/players/1100.png"
            },
            statistics: [{
              team: {
                id: 40,
                name: "Liverpool",
                logo: "https://media.api-sports.io/football/teams/40.png"
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
                appearences: 32,
                lineups: 31,
                minutes: 2760,
                number: null,
                position: "Attacker",
                rating: "7.6",
                captain: false
              },
              goals: {
                total: 20,
                conceded: 0,
                assists: 10,
                saves: null
              },
              shots: {
                total: 85,
                on: 45
              }
            }]
          },
          {
            player: {
              id: 645,
              name: "Kevin De Bruyne",
              firstname: "Kevin",
              lastname: "De Bruyne",
              age: 32,
              birth: { date: "1991-06-28", place: "Drongen", country: "Belgium" },
              nationality: "Belgium",
              height: "181 cm",
              weight: "70 kg",
              injured: false,
              photo: "https://media.api-sports.io/football/players/645.png"
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
                appearences: 25,
                lineups: 22,
                minutes: 1980,
                number: null,
                position: "Midfielder",
                rating: "7.9",
                captain: false
              },
              goals: {
                total: 4,
                conceded: 0,
                assists: 9,
                saves: null
              },
              shots: {
                total: 40,
                on: 20
              }
            }]
          }
        ]
      });
    }
    
    // Fetch data from the RapidAPI football API
    const response = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players/topassists?league=${league}&season=${season}`,
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
    console.error('Error fetching top assists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top assists' },
      { status: 500 }
    );
  }
} 