import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  console.log('==== PLAYERS SITEMAP GENERATION STARTED ====');
  console.log(`Generating sitemap for players page ${page}`);
  
  // RapidAPI configuration
  const rapidApiKey = process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
  const rapidApiHost = 'api-football-v1.p.rapidapi.com';
  
  try {
    console.log('Making API request to fetch players...');
    
    // Fetch players from RapidAPI endpoint with pagination
    const playersResponse = await fetch(`https://${rapidApiHost}/v3/players/profiles?page=${page}`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost
      },
      next: { revalidate: 604800 } // Cache for 1 week (7 days)
    });
    
    if (!playersResponse.ok) {
      console.error(`API response not OK: ${playersResponse.status}`);
      throw new Error(`API error: ${playersResponse.status}`);
    }
    
    console.log('API response received, parsing JSON...');
    const playersData = await playersResponse.json();
    
    const players = playersData.response || [];
    
    console.log(`Fetched ${players.length} players for sitemap page ${page}`);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    let playerCount = 0;
    
    // Add each player to the sitemap
    for (const playerData of players) {
      // Based on the logs, we need to access player.id directly
      const player = playerData.player || playerData;
      
      if (player) {
        // Log the player object to see its structure
        console.log(`Player ${playerCount + 1} structure:`, JSON.stringify(player).substring(0, 100) + '...');
        
        // Create player slug matching your page.tsx format
        let playerName = '';
        
        if (player.firstname && player.lastname) {
          playerName = `${player.firstname}-${player.lastname}`;
        } else if (player.name) {
          playerName = player.name;
        } else {
          playerName = `player`;
        }
        
        // Make sure we have a valid ID
        if (player.id) {
          const playerSlug = `${playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${player.id}`;
          playerCount++;
          
          xml += `
  <url>
    <loc>${baseUrl}/spillerprofil/${playerSlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
        }
      }
    }
    
    xml += `
</urlset>`;
    
    console.log(`Added ${playerCount} players to sitemap page ${page}`);
    console.log('==== PLAYERS SITEMAP GENERATION COMPLETED ====');
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1209600, s-maxage=1209600', // 2 weeks
      },
    });
  } catch (error) {
    console.error(`Error generating players sitemap (page ${page}):`, error);
    
    // Return an empty sitemap in case of error
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error fetching players: ${error instanceof Error ? error.message : 'Unknown error'} -->
</urlset>`;
    
    console.log('==== PLAYERS SITEMAP GENERATION FAILED ====');
    
    return new NextResponse(emptyXml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}