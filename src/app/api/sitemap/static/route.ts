import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/personvern</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/om-oss</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/vilkar</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/kontakt</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/liga</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/i-dag</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/i-morgen</loc>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/mandag</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/tirsdag</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/onsdag</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/torsdag</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/fredag</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/lordag</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball/sondag</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;
  
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 1 day cache
    },
  });
}