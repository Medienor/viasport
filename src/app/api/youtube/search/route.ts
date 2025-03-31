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
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const maxResults = searchParams.get('maxResults') || '5';
  const status = searchParams.get('status');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }
  
  // Calculate date for filtering (3 months ago)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const publishedAfter = threeMonthsAgo.toISOString();
  
  // Create a cache key from the request parameters
  const cacheKey = `${query}-${status}-${maxResults}-${publishedAfter}`;
  
  // Check if we have a valid cached response
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_DURATION) {
    console.log(`Returning cached result for "${query}" (${status})`);
    return NextResponse.json(cache[cacheKey].data);
  }
  
  console.log(`YouTube API Request - Query: "${query}", Status: ${status}, MaxResults: ${maxResults}, PublishedAfter: ${publishedAfter}`);
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&maxResults=${maxResults}&type=video&order=viewCount&videoDuration=medium&relevanceLanguage=en&videoDefinition=high&videoEmbeddable=true&videoSyndicated=true&publishedAfter=${publishedAfter}&key=${process.env.YOUTUBE_API_KEY}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    const data = await response.json();
    
    // Double check the videos can be embedded by fetching video details
    if (data.items && data.items.length > 0) {
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const videoDetailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails,statistics&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`
      );
      const videoDetails = await videoDetailsResponse.json();

      // Filter out any videos that are not embeddable or are region restricted
      const embeddableVideos = data.items.filter((item: any) => {
        const videoDetail = videoDetails.items.find((v: any) => v.id === item.id.videoId);
        return videoDetail && 
               videoDetail.status.embeddable === true && 
               !videoDetail.contentDetails.regionRestriction;
      }).sort((a: any, b: any) => {
        const videoA = videoDetails.items.find((v: any) => v.id === a.id.videoId);
        const videoB = videoDetails.items.find((v: any) => v.id === b.id.videoId);
        return Number(videoB.statistics.viewCount) - Number(videoA.statistics.viewCount);
      });

      data.items = embeddableVideos;
    }
    
    // Log the number of results
    console.log(`YouTube API returned ${data.items?.length || 0} videos`);
    
    // For live matches, prioritize videos with "LIVE" in the title
    if (status === 'LIVE' && data.items && data.items.length > 0) {
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
      console.log(`Cached result for "${query}" (${status})`);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('YouTube API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
} 