import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/fotball</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Add other static pages -->
</urlset>`;
  
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}