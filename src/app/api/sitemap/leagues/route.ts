import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  console.log('==== LEAGUES SITEMAP GENERATION STARTED ====');
  
  // RapidAPI configuration
  const rapidApiKey = process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
  const rapidApiHost = 'api-football-v1.p.rapidapi.com';
  
  try {
    console.log('Making API request to fetch leagues...');
    
    // Fetch leagues directly from the API
    const leaguesResponse = await fetch(`https://${rapidApiHost}/v3/leagues`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost
      },
      next: { revalidate: 604800 } // Cache for 1 week (7 days)
    });
    
    if (!leaguesResponse.ok) {
      console.error(`API response not OK: ${leaguesResponse.status}`);
      throw new Error(`API error: ${leaguesResponse.status}`);
    }
    
    console.log('API response received, parsing JSON...');
    const leaguesData = await leaguesResponse.json();
    
    const leagues = leaguesData.response || [];
    
    console.log(`Fetched ${leagues.length} leagues for sitemap`);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    let leagueCount = 0;
    
    // Add each league to the sitemap
    for (const leagueData of leagues) {
      // Extract league info from the correct structure
      const league = leagueData.league;
      
      if (league && league.id) {
        // Log the league object to see its structure
        console.log(`League ${leagueCount + 1} structure:`, JSON.stringify(league).substring(0, 100) + '...');
        
        // Create league slug matching your page.tsx format
        const leagueSlug = `${league.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${league.id}`;
        leagueCount++;
        
        xml += `
  <url>
    <loc>${baseUrl}/fotball/liga/${leagueSlug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }
    
    xml += `
</urlset>`;
    
    console.log(`Added ${leagueCount} leagues to sitemap`);
    console.log('==== LEAGUES SITEMAP GENERATION COMPLETED ====');
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1209600, s-maxage=1209600', // 2 weeks
      },
    });
  } catch (error) {
    console.error(`Error generating leagues sitemap:`, error);
    
    // Return an empty sitemap in case of error
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error fetching leagues: ${error instanceof Error ? error.message : 'Unknown error'} -->
</urlset>`;
    
    console.log('==== LEAGUES SITEMAP GENERATION FAILED ====');
    
    return new NextResponse(emptyXml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}