import { NextResponse } from 'next/server';
import { getPopularLeagues, getFixtures } from '@/app/services/sportApi';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  // Get popular leagues
  const leagues = await getPopularLeagues('SitemapGenerator');
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  
  // For each league, get upcoming fixtures
  for (const league of leagues) {
    // Get fixtures for next 30 days
    const fixtures = await getFixtures(league.id);
    
    // Add each fixture to the sitemap
    for (const fixture of fixtures) {
      xml += `
  <url>
    <loc>${baseUrl}/fotball/kamp/${fixture.fixture.id}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }
  }
  
  xml += `
</urlset>`;
  
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=259200, s-maxage=259200', // 3 days
    },
  });
}