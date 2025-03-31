import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client exactly like in HeadToHeadFixtures.tsx
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI'
);

// Enable edge runtime and set revalidation period
export const runtime = 'edge';
export const revalidate = 604800; // 7 days

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://viasport.no';
  const PAGE_SIZE = 1000; // Supabase's maximum page size
  
  try {
    console.log('==== FIXTURES SITEMAP GENERATION STARTED ====');
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    let hasMore = true;
    let page = 0;
    let totalFixtures = 0;
    
    // Fetch fixtures page by page
    while (hasMore) {
      const { data: fixtures, error } = await supabase
        .from('fixtures')
        .select('id, date')
        .order('date', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (error) {
        throw new Error(`Error fetching fixtures page ${page}: ${error.message}`);
      }
      
      if (!fixtures || fixtures.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process fixtures from this page
      for (const fixture of fixtures) {
        xml += `
  <url>
    <loc>${baseUrl}/fotball/kamp/${fixture.id}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <lastmod>${new Date(fixture.date).toISOString()}</lastmod>
  </url>`;
      }
      
      totalFixtures += fixtures.length;
      console.log(`Processed page ${page + 1} with ${fixtures.length} fixtures`);
      
      // Check if we need to fetch more
      hasMore = fixtures.length === PAGE_SIZE;
      page++;
    }
    
    xml += `
</urlset>`;
    
    console.log(`Successfully added ${totalFixtures} fixtures to sitemap`);
    console.log('==== FIXTURES SITEMAP GENERATION COMPLETED ====');

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating fixtures sitemap:', error);
    
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