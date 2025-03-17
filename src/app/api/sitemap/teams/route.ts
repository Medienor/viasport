import { NextResponse } from 'next/server';

// Define a type for team objects
interface Team {
  id: number;
  name: string;
  code?: string;
  country?: string;
  founded?: number;
  national?: boolean;
  logo?: string;
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  console.log('==== TEAMS SITEMAP GENERATION STARTED ====');
  
  // RapidAPI configuration
  const rapidApiKey = process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
  const rapidApiHost = 'api-football-v1.p.rapidapi.com';
  
  try {
    // Strategy: Get teams from popular leagues with current season
    console.log('Fetching teams from popular leagues...');
    
    // Step 1: Define top leagues
    const topLeagueIds = [
      39,  // Premier League (England)
      140, // La Liga (Spain)
      78,  // Bundesliga (Germany)
      61,  // Ligue 1 (France)
      135, // Serie A (Italy)
      2,   // UEFA Champions League
      3,   // UEFA Europa League
      71,  // Eliteserien (Norway)
      88,  // Eredivisie (Netherlands)
      94,  // Primeira Liga (Portugal)
      253, // Major League Soccer (USA)
    ];
    
    // Get current season
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const seasonYear = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
    
    console.log(`Using season year ${seasonYear} for fetching teams`);
    console.log(`Will make ${topLeagueIds.length} API calls, one for each league`);
    
    const allTeams: Team[] = [];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    // Step 2: For each league, get its teams for the current season
    for (const leagueId of topLeagueIds) {
      console.log(`Fetching teams for league ${leagueId} and season ${seasonYear}...`);
      
      try {
        // Direct API call similar to your teams route
        const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?league=${leagueId}&season=${seasonYear}`, {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
          },
          next: { revalidate: 604800 } // Cache for 1 week
        });
        
        console.log(`API response status for league ${leagueId}: ${response.status}`);
        
        if (!response.ok) {
          console.error(`API error for league ${leagueId}: ${response.status}`);
          continue; // Skip this league but continue with others
        }
        
        const data = await response.json();
        console.log(`API response for league ${leagueId}:`, data.results ? `${data.results} results` : 'No results property');
        
        if (data.errors && Object.keys(data.errors).length > 0) {
          console.error(`API Error for league ${leagueId}:`, data.errors);
          continue;
        }
        
        const teams = data.response || [];
        console.log(`Found ${teams.length} teams for league ${leagueId}`);
        
        // Process teams from this league
        for (const teamData of teams) {
          const team = teamData.team;
          
          if (team && team.id && !allTeams.some(t => t.id === team.id)) {
            allTeams.push(team);
            
            // Create team slug matching your page.tsx format
            const teamSlug = `${team.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${team.id}`;
            
            xml += `
  <url>
    <loc>${baseUrl}/lag/${teamSlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
          }
        }
      } catch (leagueError) {
        console.error(`Error processing league ${leagueId}:`, leagueError);
        // Continue with next league
      }
      
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    xml += `
</urlset>`;
    
    console.log(`Added ${allTeams.length} unique teams to sitemap`);
    console.log('==== TEAMS SITEMAP GENERATION COMPLETED ====');
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1209600, s-maxage=1209600', // 2 weeks
      },
    });
  } catch (error) {
    console.error(`Error generating teams sitemap:`, error);
    
    // Return an empty sitemap in case of error
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error fetching teams: ${error instanceof Error ? error.message : 'Unknown error'} -->
</urlset>`;
    
    console.log('==== TEAMS SITEMAP GENERATION FAILED ====');
    
    return new NextResponse(emptyXml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}