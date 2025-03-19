import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  
  // Create a log file for debugging
  const logPath = path.join(process.cwd(), 'fixtures-sitemap-debug.log');
  const logMessage = (msg: string) => {
    fs.appendFileSync(logPath, `${new Date().toISOString()}: ${msg}\n`);
  };
  
  logMessage('==== FIXTURES SITEMAP GENERATION STARTED ====');
  
  // RapidAPI configuration
  const rapidApiKey = process.env.RAPIDAPI_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
  const rapidApiHost = 'api-football-v1.p.rapidapi.com';
  
  try {
    // Get current season
    const currentYear = new Date().getFullYear();
    const currentSeason = currentYear;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    let totalFixtureCount = 0;
    
    // Fetch fixtures for each league
    for (const league of POPULAR_LEAGUES) {
      logMessage(`Fetching fixtures for ${league.name} (ID: ${league.id})`);
      
      const response = await fetch(`https://${rapidApiHost}/v3/fixtures?league=${league.id}&season=${currentSeason}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': rapidApiHost
        },
        next: {
          revalidate: 604800 // Cache for 7 days (7 * 24 * 60 * 60 seconds)
        }
      });
      
      if (!response.ok) {
        logMessage(`Error fetching ${league.name}: ${response.status}`);
        continue; // Skip to next league if this one fails
      }
      
      const data = await response.json();
      
      if (!data.response || !Array.isArray(data.response)) {
        logMessage(`Invalid response structure for ${league.name}`);
        continue;
      }
      
      const fixtureCount = data.response.length;
      logMessage(`Found ${fixtureCount} fixtures for ${league.name}`);
      
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
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    xml += `
</urlset>`;
    
    logMessage(`Successfully added ${totalFixtureCount} fixtures from ${POPULAR_LEAGUES.length} leagues to sitemap`);
    logMessage('==== FIXTURES SITEMAP GENERATION COMPLETED ====');
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400', // 7 days cache with 1 day stale-while-revalidate
      },
    });
    
  } catch (error) {
    logMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Return an empty sitemap with error comment
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