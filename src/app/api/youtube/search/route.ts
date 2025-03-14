import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache
interface CachedData {
  data: YouTubeSearchResponse;
  timestamp: number;
}

interface YouTubeSearchResponse {
  items?: YouTubeVideoItem[];
  [key: string]: unknown;
}

interface YouTubeVideoItem {
  snippet: {
    title: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const cache: Record<string, CachedData> = {};
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const maxResults = searchParams.get('maxResults') || '5';
  const matchStatus = searchParams.get('status') || 'NS'; // Default to not started
  
  // Create a cache key from the request parameters
  const cacheKey = `${query}-${matchStatus}-${maxResults}`;
  
  // Check if we have a valid cached response
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log(`Returning cached result for "${query}" (${matchStatus})`);
    return NextResponse.json(cache[cacheKey].data);
  }
  
  console.log(`YouTube API Request - Query: "${query}", Status: ${matchStatus}, MaxResults: ${maxResults}`);
  
  if (!query) {
    console.log('Error: Search query is missing');
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }
  
  try {
    // Use the provided API key
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('YouTube API key is missing in environment variables');
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }
    
    let enhancedQuery = query;
    let orderBy = 'relevance';
    let publishedAfter = '';
    
    // Customize search based on match status
    switch (matchStatus) {
      case 'LIVE':
      case '1H':
      case '2H':
      case 'HT':
        // For live matches, search for live streams
        enhancedQuery = `${query} live stream football`;
        orderBy = 'viewCount'; // Show most popular live streams
        break;
        
      case 'FT': // Finished match
      case 'AET': // After extra time
      case 'PEN': // After penalties
        // For finished matches, search for highlights
        enhancedQuery = `${query} highlights football`;
        orderBy = 'date'; // Show most recent highlights
        
        // Look for videos from the past 2 days for finished matches
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        publishedAfter = twoDaysAgo.toISOString();
        break;
        
      default: // Not started or other status
        // For upcoming matches, search for previous encounters or previews
        enhancedQuery = `${query} preview prediction football`;
        orderBy = 'relevance'; // Show most relevant previews
        break;
    }
    
    console.log(`Enhanced query: "${enhancedQuery}", Order by: ${orderBy}`);
    
    // Build the API URL
    let apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(enhancedQuery)}&type=video&maxResults=${maxResults}&order=${orderBy}&key=${apiKey}`;
    
    // Add publishedAfter if specified
    if (publishedAfter) {
      apiUrl += `&publishedAfter=${publishedAfter}`;
      console.log(`Added date filter: publishedAfter=${publishedAfter}`);
    }
    
    // Log the API URL with the key partially masked for security
    const maskedApiUrl = apiUrl.replace(apiKey, apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4));
    console.log(`Calling YouTube API: ${maskedApiUrl}`);
    
    const response = await fetch(apiUrl);
    
    console.log(`YouTube API response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 403 || response.status === 429 || response.status === 500) {
      const errorData = await response.json();
      if (errorData.error && (
          errorData.error.includes('quota') || 
          errorData.error.includes('limit') ||
          errorData.message?.includes('quota')
      )) {
        return NextResponse.json({ error: 'API-grensen er nådd. Prøv igjen senere.' }, { status: response.status });
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error details:', errorText);
      return NextResponse.json({ error: 'Failed to fetch videos', details: errorText }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Log the number of results
    console.log(`YouTube API returned ${data.items?.length || 0} videos`);
    
    // For live matches, prioritize videos with "LIVE" in the title
    if (matchStatus === 'LIVE' && data.items && data.items.length > 0) {
      data.items.sort((a: YouTubeVideoItem, b: YouTubeVideoItem) => {
        const aIsLive = a.snippet.title.toUpperCase().includes('LIVE');
        const bIsLive = b.snippet.title.toUpperCase().includes('LIVE');
        
        if (aIsLive && !bIsLive) return -1;
        if (!aIsLive && bIsLive) return 1;
        return 0;
      });
      console.log('Sorted results to prioritize LIVE videos');
    }
    
    // Before returning the response, cache it
    if (data && data.items) {
      cache[cacheKey] = {
        data: data,
        timestamp: now
      };
      console.log(`Cached result for "${query}" (${matchStatus})`);
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    // Include more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
} 