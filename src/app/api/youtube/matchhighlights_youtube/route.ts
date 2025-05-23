import { NextRequest, NextResponse } from 'next/server';

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION = 86400000;

// In-memory cache
const cache: Record<string, { data: any, timestamp: number }> = {};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'eliteserien highlights';
  const maxResults = searchParams.get('maxResults') || '50';
  
  // Create a cache key based on the query parameters
  const cacheKey = `highlights-${query}-${maxResults}`;
  
  // Check cache
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log(`Using cached result for highlights "${query}" (${now - cache[cacheKey].timestamp}ms old)`);
    return NextResponse.json(cache[cacheKey].data);
  }
  
  try {
    console.log(`Fetching new match highlights for "${query}"`);
    
    // Use the dedicated match highlights API key
    const apiKey = process.env.YOUTUBE_API_3_VIASPORT;
    
    if (!apiKey) {
      throw new Error('YouTube API key (YOUTUBE_API_3_VIASPORT) is not configured');
    }
    
    // Optimized parameters for match highlights
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}&type=video&order=relevance&videoDuration=medium`;
    
    const response = await fetch(youtubeUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error:', errorData);
      throw new Error(`YouTube API error: ${errorData.error?.message || response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    cache[cacheKey] = {
      data: data,
      timestamp: now
    };
    
    console.log(`Successfully fetched ${data.items?.length || 0} match highlights`);
    return NextResponse.json(data);
  } catch (err) {
    console.error('YouTube Match Highlights API Error:', err);
    
    // Use expired cache as fallback
    if (cache[cacheKey]) {
      console.log(`Using expired cache as fallback for highlights "${query}"`);
      return NextResponse.json(cache[cacheKey].data);
    }
    
    return NextResponse.json({ error: 'Failed to fetch match highlights' }, { status: 500 });
  }
}