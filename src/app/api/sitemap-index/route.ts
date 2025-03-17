import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  
  // Calculate how many player sitemap pages we need (assuming 30,000 players)
  // Each sitemap can have up to 50,000 URLs, but we'll use 10,000 per file for better performance
  const totalPlayerPages = 3; // This is an estimate - adjust based on actual player count
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/api/sitemap/static</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/api/sitemap/leagues</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/api/sitemap/teams</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/api/sitemap/fixtures</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
  
  // Add player sitemap pages
  for (let i = 1; i <= totalPlayerPages; i++) {
    xml += `
  <sitemap>
    <loc>${baseUrl}/api/sitemap/players?page=${i}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
  }
  
  xml += `
</sitemapindex>`;
  
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 1 day cache
    },
  });
}