'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
    publishedAt: string;
  };
}

export default function PremierLeagueVideos() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Keywords that indicate highlights - will be matched case-insensitively
  const highlightKeywords = ['highlights', 'highlight', 'goals', 'extended', 'recap'];

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        console.log('PremierLeagueVideos: Starting to fetch videos');
        setLoading(true);
        
        // Use a query that specifically targets Manchester City's channel
        const query = 'Manchester City highlights';
        
        console.log(`PremierLeagueVideos: Using query: ${query}`);
        
        // Request more videos to ensure we have enough after filtering
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=25`);
        console.log('PremierLeagueVideos: API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('PremierLeagueVideos: API returned data:', {
          itemsCount: data.items?.length || 0,
          hasItems: Boolean(data.items),
          error: data.error
        });
        
        // Store debug info
        setDebugInfo({
          apiResponse: {
            status: response.status,
            itemsCount: data.items?.length || 0,
            hasItems: Boolean(data.items),
            error: data.error
          }
        });
        
        if (data.items && data.items.length > 0) {
          // Log all videos for debugging
          console.log('All videos from search:');
          data.items.forEach((video: YouTubeVideo, index: number) => {
            console.log(`${index + 1}. "${video.snippet.title}" from "${video.snippet.channelTitle}" (${video.snippet.channelId})`);
          });
          
          // Filter videos to only include those from Manchester City's channel
          const manCityVideos = data.items.filter((video: YouTubeVideo) => {
            // Manchester City's channel ID is UCkzCjdRMrW2vXLx8mvPVLdQ
            // Their channel title is "Manchester City"
            return video.snippet.channelId === 'UCkzCjdRMrW2vXLx8mvPVLdQ' || 
                   video.snippet.channelTitle === 'Manchester City';
          });
          
          console.log(`PremierLeagueVideos: Found ${manCityVideos.length} videos from Manchester City's channel`);
          
          // Take only the first 5 videos from Manchester City
          setVideos(manCityVideos.slice(0, 5));
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            videos: manCityVideos.slice(0, 5).map((v: YouTubeVideo) => ({
              title: v.snippet.title,
              channelTitle: v.snippet.channelTitle,
              channelId: v.snippet.channelId,
              publishedAt: v.snippet.publishedAt
            }))
          }));
        } else {
          console.error('PremierLeagueVideos: No videos found in API response');
          setError('No videos found');
        }
      } catch (err) {
        console.error('PremierLeagueVideos: Failed to fetch videos:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          error: {
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : null
          }
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Function to extract score from title
  const extractScore = (title: string) => {
    // Look for patterns like "2 - 1" or "3-1" in the title
    const scoreRegex = /(\d+)\s*-\s*(\d+)/;
    const match = title.match(scoreRegex);
    
    if (match) {
      return {
        home: match[1],
        away: match[2]
      };
    }
    
    return null;
  };

  // Function to extract team names from title
  const extractTeams = (title: string) => {
    // This is a simplified approach - might need refinement based on actual titles
    const teamsRegex = /(.+?)\s*\d+\s*-\s*\d+\s*(.+?)(\s*\||\s*-\s*|\s*$)/i;
    const match = title.match(teamsRegex);
    
    if (match) {
      return {
        home: match[1].trim(),
        away: match[2].trim()
      };
    }
    
    // If we can't extract teams with the regex, just return the title
    return {
      full: title
    };
  };

  if (loading) return (
    <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <div className="bg-gray-200 rounded-lg h-80"></div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="bg-gray-200 rounded-lg h-24 w-40"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div>
      <div className="text-red-500 text-sm mt-4">Kunne ikke laste videoer: {error}</div>
      {debugInfo && (
        <details className="mt-2 text-xs border p-2 rounded">
          <summary className="cursor-pointer font-medium">Debug Information</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );

  if (videos.length === 0) return (
    <div>
      <div className="text-sm text-gray-500 mt-4">Ingen videoer tilgjengelig</div>
      {debugInfo && (
        <details className="mt-2 text-xs border p-2 rounded">
          <summary className="cursor-pointer font-medium">Debug Information</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );

  // Split videos into featured (first) and list (rest)
  const featuredVideo = videos[0];
  const listVideos = videos.slice(1, 5);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Featured video (left column - 50% width) */}
        <div>
          {featuredVideo && (
            <Link 
              href={`https://www.youtube.com/watch?v=${featuredVideo.id.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden shadow-lg group"
            >
              <div className="relative h-80">
                <Image
                  src={featuredVideo.snippet.thumbnails.high.url}
                  alt={featuredVideo.snippet.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Top gradient with Premier League logo */}
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10">
                  <div className="flex items-center p-6">
                    <Image 
                      src="https://media.api-sports.io/football/leagues/39.png" 
                      alt="Premier League" 
                      width={40} 
                      height={40}
                      className="mr-3"
                    />
                    <span className="text-white font-bold text-2xl">Premier League</span>
                  </div>
                </div>
              </div>
              
              {/* Dark blue title box */}
              <div className="bg-blue-900 text-white p-4">
                <h3 className="font-bold text-xl">
                  {extractTeams(featuredVideo.snippet.title).full || 
                   `${extractTeams(featuredVideo.snippet.title).home} - ${extractTeams(featuredVideo.snippet.title).away}`}
                </h3>
                <p className="text-sm text-gray-300 mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path>
                    <path d="M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586z"></path>
                  </svg>
                  {new Date(featuredVideo.snippet.publishedAt).toLocaleDateString('no-NO', {day: 'numeric', month: 'long'})} • {new Date(featuredVideo.snippet.publishedAt).toLocaleTimeString('no-NO', {hour: '2-digit', minute: '2-digit'})}
                </p>
                
                {/* YouTube badge moved under the date */}
                <div className="mt-2">
                  <div className="bg-red-600 text-white px-2 py-1 text-xs font-bold rounded inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                    </svg>
                    {featuredVideo.snippet.channelTitle}
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
        
        {/* List videos (right column - 50% width) */}
        <div className="space-y-4">
          {listVideos.map((video) => {
            const score = extractScore(video.snippet.title);
            const teams = extractTeams(video.snippet.title);
            
            return (
              <Link 
                href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                key={video.id.videoId}
                className="flex space-x-4 group"
              >
                <div className="relative h-24 w-40 flex-shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={video.snippet.thumbnails.high.url}
                    alt={video.snippet.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {score && (
                    <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                      <div className="bg-blue-600 text-white px-2 py-1 text-xs font-bold rounded">
                        {score.home}
                      </div>
                      <div className="text-white text-xs">-</div>
                      <div className="bg-blue-600 text-white px-2 py-1 text-xs font-bold rounded">
                        {score.away}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-sm group-hover:text-blue-600 line-clamp-2">
                    {teams.full || `${teams.home} - ${teams.away}`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {video.snippet.channelTitle} • {new Date(video.snippet.publishedAt).toLocaleDateString('no-NO', {day: 'numeric', month: 'long'})}
                  </p>
                </div>
              </Link>
            );
          })}
          
          <div className="pt-2">
            <Link 
              href="/fotball/liga/premier-league-39" 
              className="text-blue-600 hover:underline text-sm font-medium inline-flex items-center"
            >
              Se mer
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 