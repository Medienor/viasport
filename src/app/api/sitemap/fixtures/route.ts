import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  console.log('==== FIXTURES SITEMAP GENERATION STARTED ====');
  
  // RapidAPI configuration
  const rapidApiKey = process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
  const rapidApiHost = 'api-football-v1.p.rapidapi.com';
  
  try {
    console.log('Making API request to fetch fixtures...');
    
    // Get today's date and date 30 days from now
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    
    // Format dates as YYYY-MM-DD
    const fromDate = today.toISOString().split('T')[0];
    const toDate = thirtyDaysLater.toISOString().split('T')[0];
    
    console.log(`Fetching fixtures from ${fromDate} to ${toDate}`);
    
    // Fetch fixtures directly from the API for the next 30 days
    const fixturesResponse = await fetch(`https://${rapidApiHost}/v3/fixtures?from=${fromDate}&to=${toDate}`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost
      },
      next: { revalidate: 86400 } // Cache for 1 day
    });
    
    if (!fixturesResponse.ok) {
      console.error(`API response not OK: ${fixturesResponse.status}`);
      throw new Error(`API error: ${fixturesResponse.status}`);
    }
    
    console.log('API response received, parsing JSON...');
    const fixturesData = await fixturesResponse.json();
    
    const fixtures = fixturesData.response || [];
    
    console.log(`Fetched ${fixtures.length} fixtures for sitemap`);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    let fixtureCount = 0;
    
    // Add each fixture to the sitemap
    for (const fixture of fixtures) {
      if (fixture && fixture.fixture && fixture.fixture.id) {
        fixtureCount++;
        
        xml += `
  <url>
    <loc>${baseUrl}/fotball/kamp/${fixture.fixture.id}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>`;
        
        // Log every 100 fixtures to avoid flooding the console
        if (fixtureCount % 100 === 0) {
          console.log(`Processed ${fixtureCount} fixtures so far...`);
        }
      }
    }
    
    xml += `
</urlset>`;
    
    console.log(`Added ${fixtureCount} fixtures to sitemap`);
    console.log('==== FIXTURES SITEMAP GENERATION COMPLETED ====');
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 1 day
      },
    });
  } catch (error) {
    console.error(`Error generating fixtures sitemap:`, error);
    
    // Return an empty sitemap in case of error
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error fetching fixtures: ${error instanceof Error ? error.message : 'Unknown error'} -->
</urlset>`;
    
    console.log('==== FIXTURES SITEMAP GENERATION FAILED ====');
    
    return new NextResponse(emptyXml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}