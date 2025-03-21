import { NextResponse } from 'next/server';

// Enable edge runtime and set revalidation period
export const runtime = 'edge';
export const revalidate = 604800; // 7 days

// Define popular leagues with their IDs
const POPULAR_LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 103, name: 'Eliteserien' },
  { id: 2, name: 'Champions League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
  { id: 61, name: 'Ligue 1' },
  { id: 88, name: 'Eredivisie' },
  { id: 94, name: 'Primeira Liga' },
  { id: 3, name: 'Europa League' },
  { id: 848, name: 'Conference League' },
  { id: 725, name: 'Toppserien' },
  { id: 104, name: '1. Division' },
  { id: 1, name: 'World Cup' },
  { id: 10, name: 'Friendlies' }
];

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  try {
    console.log('==== FIXTURES SITEMAP GENERATION STARTED ====');
    
    // RapidAPI configuration
    const rapidApiKey = process.env.RAPID_API_KEY;
    const rapidApiHost = 'api-football-v1.p.rapidapi.com';
    
    if (!rapidApiKey) {
      throw new Error('RAPID_API_KEY is not defined');
    }
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    let totalFixtureCount = 0;
    const currentSeason = new Date().getFullYear();
    
    // Fetch fixtures for each league
    for (const league of POPULAR_LEAGUES) {
      console.log(`Fetching fixtures for ${league.name} (ID: ${league.id})`);
      
      try {
        const response = await fetch(`https://${rapidApiHost}/v3/fixtures?league=${league.id}&season=${currentSeason}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': rapidApiKey!,
            'x-rapidapi-host': rapidApiHost
          },
          next: {
            revalidate: 604800 // Cache for 7 days
          }
        });
        
        if (!response.ok) {
          console.log(`Error fetching ${league.name}: ${response.status}`);
          continue; // Skip to next league if this one fails
        }
        
        const data = await response.json();
        
        if (!data.response || !Array.isArray(data.response)) {
          console.log(`Invalid response structure for ${league.name}`);
          continue;
        }
        
        const fixtureCount = data.response.length;
        console.log(`Found ${fixtureCount} fixtures for ${league.name}`);
        
        // Process each fixture
        for (const fixture of data.response) {
          if (fixture && fixture.fixture && fixture.fixture.id) {
            totalFixtureCount++;
            
            xml += `
  <url>
    <loc>${baseUrl}/fotball/kamp/${fixture.fixture.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`;
          }
        }
      } catch (error) {
        console.error(`Error processing league ${league.name}:`, error);
      }
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    xml += `
</urlset>`;
    
    console.log(`Successfully added ${totalFixtureCount} fixtures from ${POPULAR_LEAGUES.length} leagues to sitemap`);
    console.log('==== FIXTURES SITEMAP GENERATION COMPLETED ====');

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(`Error generating fixtures sitemap:`, error);
    
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error fetching fixtures: ${error instanceof Error ? error.message : 'Unknown error'} -->
</urlset>`;
    
    return new NextResponse(emptyXml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}