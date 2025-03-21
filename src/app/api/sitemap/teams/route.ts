import { NextResponse } from 'next/server';

// Enable edge runtime and set revalidation period
export const runtime = 'edge';
export const revalidate = 604800; // 7 days

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
  
  try {
    console.log('==== TEAMS SITEMAP GENERATION STARTED ====');
    
    // RapidAPI configuration
    const rapidApiKey = process.env.RAPID_API_KEY;
    const rapidApiHost = 'api-football-v1.p.rapidapi.com';
    
    if (!rapidApiKey) {
      throw new Error('RAPID_API_KEY is not defined');
    }
    
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
    
    // Get current and previous season
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentSeason = currentDate.getMonth() >= 6 ? currentYear : currentYear - 1;
    const previousSeason = currentSeason - 1;
    
    console.log(`Using seasons ${currentSeason} and ${previousSeason} for fetching teams`);
    console.log(`Will make ${topLeagueIds.length * 2} API calls, two for each league (current and previous season)`);
    
    const allTeams: Team[] = [];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    // Step 2: For each league, get its teams for both current and previous season
    for (const leagueId of topLeagueIds) {
      // First try current season
      console.log(`Fetching teams for league ${leagueId} and season ${currentSeason}...`);
      
      try {
        const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?league=${leagueId}&season=${currentSeason}`, {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': rapidApiHost
          },
          next: { revalidate: 604800 } // Cache for 1 week
        });
        
        console.log(`API response status for league ${leagueId} (season ${currentSeason}): ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.response && data.response.length > 0) {
            console.log(`Found ${data.response.length} teams for league ${leagueId} (season ${currentSeason})`);
            
            // Process teams from this league/season
            for (const teamData of data.response) {
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
          }
        }
      } catch (error) {
        console.error(`Error processing league ${leagueId} (season ${currentSeason}):`, error);
      }
      
      // Then try previous season
      console.log(`Fetching teams for league ${leagueId} and season ${previousSeason}...`);
      
      try {
        const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?league=${leagueId}&season=${previousSeason}`, {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': rapidApiHost
          },
          next: { revalidate: 604800 } // Cache for 1 week
        });
        
        console.log(`API response status for league ${leagueId} (season ${previousSeason}): ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.response && data.response.length > 0) {
            console.log(`Found ${data.response.length} teams for league ${leagueId} (season ${previousSeason})`);
            
            // Process teams from this league/season
            for (const teamData of data.response) {
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
          }
        }
      } catch (error) {
        console.error(`Error processing league ${leagueId} (season ${previousSeason}):`, error);
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
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(`Error generating teams sitemap:`, error);
    
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