import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ teams: [], leagues: [] });
  }

  try {
    const dataDir = path.join(process.cwd(), 'data', 'teams');
    const files = await fs.readdir(dataDir);
    
    const matchingTeams = [];
    const uniqueLeagues = new Map();

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
        const data = JSON.parse(content);
        
        // Check for matching team name
        if (data.team?.team?.name?.toLowerCase().includes(query)) {
          matchingTeams.push({
            team: {
              team: data.team.team
            }
          });
        }

        // Check for matching leagues in this team's data
        data.leagues?.forEach((leagueData: any) => {
          if (leagueData.league?.name?.toLowerCase().includes(query)) {
            uniqueLeagues.set(leagueData.league.id, {
              league: leagueData.league,
              country: leagueData.country
            });
          }
        });
      }
    }

    // Convert Map to array for leagues
    const matchingLeagues = Array.from(uniqueLeagues.values());

    return NextResponse.json({
      teams: matchingTeams.slice(0, 10),
      leagues: matchingLeagues.slice(0, 10)
    });

  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ teams: [], leagues: [] });
  }
} 