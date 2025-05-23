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
    thumbnails: {
      high: {
        url: string;
      };
    };
    publishedAt: string;
  };
}

export default function EliteserienVideos() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Eliteserien team names with variations
  const eliteserienTeams = [
    ['Bodø/Glimt', 'Bodo/Glimt', 'Bodø Glimt', 'Bodo Glimt'],
    ['Brann'],
    ['Viking'],
    ['Rosenborg', 'RBK'],
    ['Molde'],
    ['Fredrikstad', 'FFK'],
    ['Strømsgodset', 'Stromsgodset'],
    ['KFUM Oslo', 'KFUM'],
    ['Sarpsborg 08', 'Sarpsborg'],
    ['Sandefjord'],
    ['Kristiansund', 'KBK'],
    ['Ham-Kam', 'HamKam', 'Ham Kam'],
    ['Tromsø', 'Tromso', 'TIL'],
    ['Haugesund', 'FKH'],
    ['Lillestrøm', 'Lillestrom', 'LSK'],
    ['Odd', 'Odd Ballklubb']
  ];

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        console.log('EliteserienVideos: Starting to fetch videos');
        setLoading(true);
        
        // Add detailed error logging
        const response = await fetch('/api/youtube/search?q=eliteserien høydepunkter&maxResults=25');
        const responseText = await response.text(); // Get raw response text
        
        console.log('EliteserienVideos: Full API Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        });

        // Try to parse the response as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError);
          throw new Error(`API returned invalid JSON: ${responseText.slice(0, 200)}...`);
        }

        if (!response.ok) {
          // Log more details about the error
          console.error('API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            data: data
          });
          throw new Error(`API error: ${response.status}. Details: ${JSON.stringify(data)}`);
        }
        
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
          // Filter videos to only include those with "Høydepunkter" in the title
          // and that contain Eliteserien team names
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          console.log('EliteserienVideos: Filtering videos from last 30 days:', thirtyDaysAgo.toISOString());
          
          const filteredVideos = data.items.filter((video: YouTubeVideo) => {
            const title = video.snippet.title;
            const hasHighlights = title.includes('Høydepunkter');
            const publishDate = new Date(video.snippet.publishedAt);
            const isRecent = publishDate > thirtyDaysAgo;
            
            // Check if the title contains any Eliteserien team names
            const hasEliteserienTeam = eliteserienTeams.some(teamVariations => 
              teamVariations.some(team => title.includes(team))
            );
            
            // Log each video's filtering status
            console.log(`Video "${title}": hasHighlights=${hasHighlights}, isRecent=${isRecent}, hasEliteserienTeam=${hasEliteserienTeam}, publishDate=${publishDate.toISOString()}`);
            
            return hasHighlights && isRecent && hasEliteserienTeam;
          });
          
          console.log(`EliteserienVideos: After filtering, found ${filteredVideos.length} Eliteserien highlight videos in the last 30 days`);
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            filtering: {
              totalVideos: data.items.length,
              filteredVideos: filteredVideos.length,
              thirtyDaysAgo: thirtyDaysAgo.toISOString()
            }
          }));
          
          // Take only the first 5 videos after filtering
          if (filteredVideos.length > 0) {
            setVideos(filteredVideos.slice(0, 5));
            console.log('EliteserienVideos: Setting filtered videos:', filteredVideos.slice(0, 5).map(v => v.snippet.title));
          } else {
            console.log('No Eliteserien highlight videos found, showing all results');
            setVideos(data.items.slice(0, 5));
            console.log('EliteserienVideos: Setting all videos:', data.items.slice(0, 5).map(v => v.snippet.title));
          }
        } else {
          console.error('EliteserienVideos: No videos found in API response');
          setError('No videos found');
        }
      } catch (err) {
        console.error('EliteserienVideos: Detailed error:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : null
        });
        
        setError(err instanceof Error ? 
          `${err.message} (Check console for details)` : 
          'Unknown error occurred'
        );
        
        setDebugInfo(prev => ({
          ...prev,
          error: {
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : null,
            timestamp: new Date().toISOString(),
            responseInfo: {
              status: err instanceof Error && 'status' in err ? err.status : null,
              // Add any other relevant error information
            }
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
    const teamsRegex = /(.+?)\s*\d+\s*-\s*\d+\s*(.+?)(\s*-\s*|$)/i;
    const match = title.match(teamsRegex);
    
    if (match) {
      return {
        home: match[1].trim(),
        away: match[2].trim()
      };
    }
    
    // If we can't extract teams with the regex, just return the title before "- Høydepunkter"
    const titleParts = title.split(' - ');
    return {
      full: titleParts[0]
    };
  };

  if (loading) return (
    <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <div className="bg-gray-200 dark:bg-[#222222] rounded-lg h-80"></div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="bg-gray-200 dark:bg-[#222222] rounded-lg h-24 w-40"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-[#222222] rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-[#222222] rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Return null (hide component completely) when there's an error
  if (error) return null;

  if (videos.length === 0) return null; // Also hide when no videos are available

  // Split videos into featured (first) and list (rest)
  const featuredVideo = videos[0];
  // Limit list videos to a maximum of 4
  const listVideos = videos.slice(1, 5);

  return (
    <div className="mt-4" id="eliteserien-videos-content">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Featured video (left column - 50% width) */}
        <div>
          {featuredVideo && (
            <Link 
              href={`https://www.youtube.com/watch?v=${featuredVideo.id.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative rounded-lg overflow-hidden group shadow-md dark:shadow-none"
            >
              <div className="relative aspect-video">
                <Image
                  src={featuredVideo.snippet.thumbnails.high.url}
                  alt={featuredVideo.snippet.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Top gradient - Adjusted 'from' color for light and dark modes */}
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-900/80 dark:from-[#232323]/80 to-transparent z-10">
                  <div className="flex items-center p-6">
                    <Image 
                      src="https://media.api-sports.io/football/leagues/103.png" 
                      alt="Eliteserien" 
                      width={40} 
                      height={40}
                      className="mr-3"
                    />
                    <span className="text-white font-bold text-2xl">Eliteserien</span>
                  </div>
                </div>
              </div>
              
              {/* Dark blue/custom dark title box */}
              <div className="bg-blue-900 dark:bg-[#232323] text-white dark:text-gray-100 p-4">
                <h3 className="font-bold text-xl dark:text-white">
                  {extractTeams(featuredVideo.snippet.title).full || 
                   `${extractTeams(featuredVideo.snippet.title).home} - ${extractTeams(featuredVideo.snippet.title).away}`} - Høydepunkter
                </h3>
                <p className="text-sm text-gray-300 dark:text-gray-400 mt-1 flex items-center">
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
                    YouTube
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
        
        {/* List videos (right column - 50% width) */}
        <div className="space-y-4">
          {listVideos.map((video) => {
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
                  
                  {/* Score overlay removed */}
                  
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                    {teams.full || `${teams.home} - ${teams.away}`} - Høydepunkter
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    YouTube • {new Date(video.snippet.publishedAt).toLocaleDateString('no-NO', {day: 'numeric', month: 'long'})}
                  </p>
                </div>
              </Link>
            );
          })}
          
          <div className="pt-2">
            <Link 
              href="/fotball/liga/eliteserien-103" 
              className="text-blue-600 dark:text-white hover:underline text-sm font-medium inline-flex items-center"
            >
              Se mer
              <svg className="w-4 h-4 ml-1 text-blue-600 dark:text-[#ff6b00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 