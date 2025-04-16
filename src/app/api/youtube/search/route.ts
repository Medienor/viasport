import { NextRequest, NextResponse } from 'next/server';

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION = 86400000;

// In-memory cache
const cache: Record<string, { data: any, timestamp: number }> = {};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'eliteserien';
  const maxResults = searchParams.get('maxResults') || '5';
  const purpose = searchParams.get('purpose');
  
  // Create a cache key based on the query parameters, including purpose
  const cacheKey = `${query}-${maxResults}-${purpose || 'default'}`;
  
  // Check if we have a valid cached response
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log(`Using cached result for "${query}" (purpose: ${purpose || 'default'}, ${now - cache[cacheKey].timestamp}ms old)`);
    return NextResponse.json(cache[cacheKey].data);
  }
  
  // If no valid cache, make a request to YouTube API
  try {
    console.log(`Fetching new results for "${query}" (purpose: ${purpose || 'default'})`);
    
    // Choose the appropriate API key based on the query
    let apiKey;
    if (query.toLowerCase().includes('eliteserien') || 
        query.toLowerCase().includes('premier league') ||
        query.toLowerCase().includes('channel:')) {
      apiKey = process.env.YOUTUBE_ELITESERIEN_API_KEY;
      console.log('Using dedicated football videos API key');
    } else {
      apiKey = process.env.YOUTUBE_API_KEY;
    }
    
    if (!apiKey) {
      throw new Error('YouTube API key is not configured');
    }
    
    // --- Conditionally set YouTube API parameters ---
    let orderParam = 'date'; // Default order
    let durationParam = ''; // Default: no duration filter

    if (purpose === 'highlights') {
      console.log('Applying highlights-specific parameters: order=relevance, videoDuration=medium');
      orderParam = 'relevance';
      durationParam = '&videoDuration=medium'; // Add duration filter for highlights
    }
    // --- End Conditional Parameters ---
    
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}&type=video&order=${orderParam}${durationParam}`;
    
    console.log(`Constructed YouTube URL: ${youtubeUrl}`); // Log the final URL
    
    const response = await fetch(youtubeUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error:', errorData);
      throw new Error(`YouTube API error: ${errorData.error?.message || response.status}`);
    }
    
    const data = await response.json();
    console.log(`YouTube API returned ${data.items?.length || 0} videos for purpose "${purpose || 'default'}"`);
    
    // Cache the response
    cache[cacheKey] = {
      data: data,
      timestamp: now
    };
    
    console.log(`Cached new result for "${query}" (purpose: ${purpose || 'default'})`);
    return NextResponse.json(data);
  } catch (err) {
    console.error('YouTube API Error:', err);
    
    // If we have an expired cache, use it as fallback
    if (cache[cacheKey]) {
      console.log(`Using expired cache as fallback for "${query}" (purpose: ${purpose || 'default'})`);
      return NextResponse.json(cache[cacheKey].data);
    }
    
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
} 