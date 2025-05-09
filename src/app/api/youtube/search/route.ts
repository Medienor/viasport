import { NextRequest, NextResponse } from 'next/server';

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION = 86400000;

// In-memory cache
const cache: Record<string, { data: any, timestamp: number }> = {};

// Helper function to determine which API key to use
const getApiKey = (query: string, purpose?: string | null): string => {
  // Always use Eliteserien key for:
  // 1. Explicit football-related searches
  // 2. Searches from MatchHighlights component
  // 3. Searches containing team names
  const footballTerms = [
    'eliteserien',
    'premier league',
    'høydepunkter',
    'highlights',
    'vs',
    'channel:',
    // Add Norwegian team names
    'bodø/glimt', 'bodo/glimt', 'bodø glimt', 'bodo glimt',
    'brann', 'viking', 'rosenborg', 'rbk', 'molde',
    'fredrikstad', 'ffk', 'strømsgodset', 'stromsgodset',
    'kfum oslo', 'kfum', 'sarpsborg', 'sandefjord',
    'kristiansund', 'kbk', 'ham-kam', 'hamkam', 'ham kam',
    'tromsø', 'tromso', 'til', 'haugesund', 'fkh',
    'lillestrøm', 'lillestrom', 'lsk', 'odd'
  ];

  const normalizedQuery = query.toLowerCase();
  const isFootballRelated = footballTerms.some(term => normalizedQuery.includes(term.toLowerCase()));
  
  // Use Eliteserien key if:
  // 1. The search is football-related OR
  // 2. The purpose is 'highlights' (from MatchHighlights component)
  if (isFootballRelated || purpose === 'highlights') {
    console.log('Using dedicated football videos API key for:', { query, purpose });
    return process.env.YOUTUBE_ELITESERIEN_API_KEY || '';
  }

  console.log('Using general API key for:', { query, purpose });
  return process.env.YOUTUBE_API_KEY || '';
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'eliteserien';
  const maxResults = searchParams.get('maxResults') || '5';
  const purpose = searchParams.get('purpose');
  
  // Create a cache key based on the query parameters
  const cacheKey = `${query}-${maxResults}-${purpose || 'default'}`;
  
  // Check cache
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log(`Using cached result for "${query}" (purpose: ${purpose || 'default'}, ${now - cache[cacheKey].timestamp}ms old)`);
    return NextResponse.json(cache[cacheKey].data);
  }
  
  try {
    console.log(`Fetching new results for "${query}" (purpose: ${purpose || 'default'})`);
    
    // Get the appropriate API key
    const apiKey = getApiKey(query, purpose);
    
    if (!apiKey) {
      throw new Error('YouTube API key is not configured');
    }
    
    // Set search parameters
    let orderParam = purpose === 'highlights' ? 'relevance' : 'date';
    let durationParam = purpose === 'highlights' ? '&videoDuration=medium' : '';
    
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}&type=video&order=${orderParam}${durationParam}`;
    
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
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('YouTube API Error:', err);
    
    // Use expired cache as fallback
    if (cache[cacheKey]) {
      console.log(`Using expired cache as fallback for "${query}"`);
      return NextResponse.json(cache[cacheKey].data);
    }
    
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
} 