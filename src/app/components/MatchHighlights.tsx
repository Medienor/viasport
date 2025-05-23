'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // Ensure Supabase client is imported

interface MatchHighlightsProps {
  matchId: number; // Keep matchId to update the correct fixture
  initialYoutubeHighlightId: string | null; // Receive the ID from the fixture table
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  matchDate: string; // ISO string date
  isFinished: boolean;
  winnerTeamId: number | null; // Can be null
}

// Helper to get potential YouTube channel IDs based on team/league
// TODO: Expand this mapping significantly, especially for PL teams
const getPotentialChannelIds = (leagueId: number, homeTeamId: number, awayTeamId: number): string[] => {
  const channelMap: { [key: number]: string[] } = {
    39: [ // Premier League
      'UCG5qGWdu8nIRZqJ_GgDwQ-w', // Official PL
      // --- Added Premier League Team Channels ---
      'UC9LQwHZoucFT94I2h6JOcjw', // Liverpool FC (ID: 40)
      'UCpryVRk_VDudG8SHXgWcG0w', // Arsenal (ID: 42)
      'UCyAxjuAr8f_BFDGCO3Htbxw', // Nottingham Forest (ID: 65)
      'UCywGl_BPp9QhD0uAcP2HsJw', // Newcastle (ID: 34)
      'UCkzCjdRMrW2vXLx8mvPVLdQ', // Manchester City (ID: 50) - Note: This seems to be the main Man City channel, replacing the previous example one.
      'UCU2PacFf99vhb3hNiYDmxww', // Chelsea (ID: 49)
      'UCxvXjfiIHQ2O6saVx_ZFqnw', // Southampton (ID: 41) - Note: Currently Championship, but good to keep if they get promoted or for historical matches.
      'UC2VLfz92cTT8jHIFOecC-LA', // Fulham (ID: 36)
      'UCf-cpC9WAdOsas19JHipukA', // Brighton (ID: 51)
      'UCeOCuVSSweaEj6oVtJZEKQw', // Bournemouth (ID: 35)
      'UCAalMUm3LIf504ItA3rqfug', // Brentford (ID: 55)
      'UCWB9N0012fG6bGyj486Qxmg', // Crystal Palace (ID: 52)
      'UCtK4QAczAN2mt2ow_jlGinQ', // Everton FC (ID: 45)
      'UC6yW44UGJJBvYTlfC7CRg2Q', // Manchester United (ID: 33) - Note: This seems to be the main Man Utd channel, replacing the previous example one.
      'UCEg25rdRZXg32iwai6N6l0w', // Tottenham Hotspur (ID: 47)
      'UCQ7Lqg5Czh5djGK6iOG53KQ', // Wolves (ID: 39)
      'UCCNOsmurvpEit9paBOzWtUg', // West Ham (ID: 48)
      // --- End of Added Channels ---
      // Consider adding broadcasters like Sky Sports Football, TNT Sports etc. if desired
    ],
    103: ['UC9QZZRUajPEoo1Q-V3MfvnQ'], // Eliteserien (TV2 Sport)
    140: [ // La Liga
        'UCWV3obpZVGgJ3j9FVhEjF2Q', // Real Madrid C.F.
        'UC14UlmYlSNiQCBe9Eookf_A', // FC Barcelona
        'UClSok2qQj_4j7c0Lz2vAW-w', // LALIGA EA SPORTS (Official)
    ],
    135: ['UCBJeMCIeLQos7wacox4hmLQ'], // Serie A (Official)
    725: ['UCrjEfwPwH3n1xuiNhWXv3iw'], // Toppserien (Official)
    // ... add more leagues and teams
  };
  // Return league-specific channels, potentially adding specific team channels if mapped
  return channelMap[leagueId] || [];
};

// Helper to generate search terms
const generateSearchTerms = (homeTeam: string, awayTeam: string, leagueId: number): string[] => {
    const baseTerms = [
        `${homeTeam} ${awayTeam}`,
        `${homeTeam} vs ${awayTeam}`,
        `${awayTeam} ${homeTeam}`,
        `${awayTeam} vs ${homeTeam}`,
    ];
    // Use Norwegian term for specific leagues
    const suffix = [103, 725].includes(leagueId) ? 'høydepunkter' : 'highlights';
    // Add variations
    const variations = baseTerms.flatMap(term => [
        `${term} ${suffix}`,
        `${term} extended ${suffix}` // Look for extended highlights too
    ]);
    return variations;
}

// Helper to normalize team names for matching (simple version)
const normalizeName = (name: string): string => {
    return name.toLowerCase()
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'o')
        .replace(/å/g, 'a')
        .replace(/fc$/, '') // Remove trailing "fc"
        .replace(/fk$/, '') // Remove trailing "fk"
        .replace(/cf$/, '') // Remove trailing "cf"
        .replace(/il$/, '') // Remove trailing "il"
        .replace(/bk$/, '') // Remove trailing "bk"
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
        .trim();
}

// --- Add Missing Helper Functions ---

// Helper to get a specific team's primary channel ID (if mapped)
// NOTE: This assumes the FIRST channel listed for a team in channelMap is the primary one. Adjust if needed.
const getChannelIdForTeam = (teamId: number): string | null => {
    // Simplified: Check common league maps. Expand if teams are in multiple maps.
    const teamChannelMap: { [key: number]: string } = {
        // Premier League Teams (using IDs from your getPotentialChannelIds)
        40: 'UC9LQwHZoucFT94I2h6JOcjw', // Liverpool FC
        42: 'UCpryVRk_VDudG8SHXgWcG0w', // Arsenal
        65: 'UCyAxjuAr8f_BFDGCO3Htbxw', // Nottingham Forest
        34: 'UCywGl_BPp9QhD0uAcP2HsJw', // Newcastle
        50: 'UCkzCjdRMrW2vXLx8mvPVLdQ', // Manchester City
        49: 'UCU2PacFf99vhb3hNiYDmxww', // Chelsea
        41: 'UCxvXjfiIHQ2O6saVx_ZFqnw', // Southampton
        36: 'UC2VLfz92cTT8jHIFOecC-LA', // Fulham
        51: 'UCf-cpC9WAdOsas19JHipukA', // Brighton
        35: 'UCeOCuVSSweaEj6oVtJZEKQw', // Bournemouth
        55: 'UCAalMUm3LIf504ItA3rqfug', // Brentford
        52: 'UCWB9N0012fG6bGyj486Qxmg', // Crystal Palace
        45: 'UCtK4QAczAN2mt2ow_jlGinQ', // Everton FC
        33: 'UC6yW44UGJJBvYTlfC7CRg2Q', // Manchester United
        47: 'UCEg25rdRZXg32iwai6N6l0w', // Tottenham Hotspur
        39: 'UCQ7Lqg5Czh5djGK6iOG53KQ', // Wolves
        48: 'UCCNOsmurvpEit9paBOzWtUg', // West Ham
        // La Liga Teams
        // Add Real Madrid, Barcelona etc. if you have their specific IDs and want team priority
        // Serie A Teams
        // ... add other teams ...
    };
    return teamChannelMap[teamId] || null;
};

// Helper to get a specific league's primary channel ID (if mapped)
const getChannelIdForLeague = (leagueId: number): string | null => {
    const leagueChannelMap: { [key: number]: string } = {
        39: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', // Premier League (Official)
        103: 'UC9QZZRUajPEoo1Q-V3MfvnQ', // Eliteserien (TV2 Sport)
        140: 'UClSok2qQj_4j7c0Lz2vAW-w', // LALIGA EA SPORTS (Official)
        135: 'UCBJeMCIeLQos7wacox4hmLQ', // Serie A (Official)
        725: 'UCrjEfwPwH3n1xuiNhWXv3iw', // Toppserien (Official)
    };
    return leagueChannelMap[leagueId] || null;
};


// Helper function to determine video priority
const getPriority = (
    videoChannelId: string | null,
    leagueId: number,
    homeTeamId: number,
    awayTeamId: number,
    winnerTeamId?: number | null
): number => {
    if (!videoChannelId) return 99; // Lowest priority if no channel ID

    const winningTeamChannel = winnerTeamId ? getChannelIdForTeam(winnerTeamId) : null;
    const homeTeamChannel = getChannelIdForTeam(homeTeamId);
    const awayTeamChannel = getChannelIdForTeam(awayTeamId);
    const leagueChannel = getChannelIdForLeague(leagueId);

    if (winningTeamChannel && videoChannelId === winningTeamChannel) return 1; // Highlight from winner's channel (if applicable)
    if (homeTeamChannel && videoChannelId === homeTeamChannel) return 2;     // Highlight from home team's channel
    if (awayTeamChannel && videoChannelId === awayTeamChannel) return 3;     // Highlight from away team's channel
    if (leagueChannel && videoChannelId === leagueChannel) return 4;         // Highlight from official league channel
    // Add broadcaster channels here if needed (e.g., Sky Sports = 5)

    return 99; // Default priority for unknown channels
};

// --- End of Added Helper Functions ---

export default function MatchHighlights({
  matchId,
  initialYoutubeHighlightId,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  leagueId,
  matchDate,
  isFinished,
  winnerTeamId
}: MatchHighlightsProps) {
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptedSearch, setAttemptedSearch] = useState(false);

  useEffect(() => {
    const fetchHighlights = async () => {
      // If we have an initial ID from Supabase, use it directly
      if (initialYoutubeHighlightId) {
        setVideo({
          id: initialYoutubeHighlightId,
          snippet: {
            title: `${homeTeamName} vs ${awayTeamName} Highlights`,
            thumbnails: {
              high: {
                url: `https://img.youtube.com/vi/${initialYoutubeHighlightId}/hqdefault.jpg`
              },
              medium: {
                url: `https://img.youtube.com/vi/${initialYoutubeHighlightId}/mqdefault.jpg`
              },
              default: {
                url: `https://img.youtube.com/vi/${initialYoutubeHighlightId}/default.jpg`
              }
            }
          }
        });
        return; // Exit early - no need to search
      }

      // Only search for a video if we don't have one saved
      if (!initialYoutubeHighlightId && isFinished) {
        setAttemptedSearch(true); // Mark that we are attempting a search
        console.log(`📺 MatchHighlights [${matchId}]: Proceeding to YouTube search...`);
        const potentialChannelIds = getPotentialChannelIds(leagueId, homeTeamId, awayTeamId);
        const searchTerms = generateSearchTerms(homeTeamName, awayTeamName, leagueId);
        const matchDateObj = new Date(matchDate);
        const searchCutoffDate = new Date(matchDateObj);
        searchCutoffDate.setDate(matchDateObj.getDate() + 3); // Allow 3 days after match

        const normalizedHome = normalizeName(homeTeamName);
        const normalizedAway = normalizeName(awayTeamName);

        let allPotentialVideos: any[] = [];

        try {
          console.log(`📺 MatchHighlights [${matchId}]: --- Performing General Keyword Searches ---`);
          for (const term of searchTerms) {
            try {
                const response = await fetch(`/api/youtube/matchhighlights_youtube?q=${encodeURIComponent(term)}&maxResults=50`);
                if (!response.ok) {
                  console.warn(`📺 MatchHighlights [${matchId}]: ⚠️ General search failed for term: "${term}" (Status: ${response.status})`);
                  continue;
                }
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                   const processed = data.items.map((item: any) => ({
                      fullItem: item,
                      id: item.id?.videoId,
                      title: item.snippet?.title,
                      titleLower: item.snippet?.title?.toLowerCase() || '',
                      titleNorm: normalizeName(item.snippet?.title || ''),
                      channelId: item.snippet?.channelId,
                      channelTitle: item.snippet?.channelTitle,
                      publishedAt: item.snippet?.publishedAt,
                      publishDate: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null,
                   })).filter((item: any) => item.id && item.publishDate);
                   allPotentialVideos.push(...processed);
                }
            } catch (generalErr) {
                console.error(`📺 MatchHighlights [${matchId}]: ❌ Error searching general term "${term}":`, generalErr);
            }
          }
          console.log(`📺 MatchHighlights [${matchId}]: --- Finished General Searches ---`);

          // ... (Filtering, Deduplicating, Sorting logic - same as before) ...
          console.log(`📺 MatchHighlights [${matchId}]: --- Processing All Collected Videos (${allPotentialVideos.length} before filtering) ---`);
          // 1. Filter
          const filteredVideos = allPotentialVideos.filter((item: any) => {
              let passes = true;
              if (!item.publishDate || item.publishDate < matchDateObj || item.publishDate > searchCutoffDate) passes = false;
              if (passes && (!item.titleNorm.includes(normalizedHome) || !item.titleNorm.includes(normalizedAway))) passes = false;
              const highlightKeyword = [103, 725].includes(leagueId) ? 'høydepunkter' : 'highlight';
              if (passes && !item.titleLower.includes(highlightKeyword)) passes = false;
              return passes;
          });
          console.log(`📺 MatchHighlights [${matchId}]: Filtered down to ${filteredVideos.length} videos.`);
          // 2. Deduplicate
          const uniqueVideoMap = new Map<string, any>();
          filteredVideos.forEach(video => { if (!uniqueVideoMap.has(video.id)) uniqueVideoMap.set(video.id, video); });
          const uniqueVideos = Array.from(uniqueVideoMap.values());
          console.log(`📺 MatchHighlights [${matchId}]: Deduplicated down to ${uniqueVideos.length} videos.`);
          // 3. Sort
          uniqueVideos.sort((a, b) => {
              const priorityA = getPriority(a.channelId, leagueId, homeTeamId, awayTeamId, winnerTeamId);
              const priorityB = getPriority(b.channelId, leagueId, homeTeamId, awayTeamId, winnerTeamId);
              if (priorityA !== priorityB) return priorityA - priorityB;
              const dateA = a.publishDate?.getTime() || 0;
              const dateB = b.publishDate?.getTime() || 0;
              return dateB - dateA;
          });

          const finalVideo = uniqueVideos.length > 0 ? uniqueVideos[0] : null;

          // --- 3. Update Fixture Table if Found ---
          if (finalVideo?.id) {
            console.log(`📺 MatchHighlights [${matchId}]: ✅ Search Found: "${finalVideo.title}" (ID: ${finalVideo.id}). Updating fixture...`);
            setVideo(finalVideo.fullItem); // Set the video state

            try {
              // Update the specific fixture row in Supabase
              const { error: updateError } = await supabase
                .from('fixtures')
                .update({ youtube_highlight_id: finalVideo.id }) // Set the new column
                .eq('id', matchId); // Match the fixture ID

              if (updateError) {
                console.warn(`📺 MatchHighlights [${matchId}]: ⚠️ Failed to update fixture table with video ID ${finalVideo.id}:`, updateError.message);
              } else {
                console.log(`📺 MatchHighlights [${matchId}]: ✅ Successfully updated fixture table with video ID ${finalVideo.id}.`);
              }
            } catch (updateErr) {
              console.error(`📺 MatchHighlights [${matchId}]: ❌ Error updating fixture table:`, updateErr);
            }
          } else {
            console.log(`📺 MatchHighlights [${matchId}]: 🤷 Search: No suitable video found.`);
            setVideo(null); // Ensure video is null if search fails
          }
          // --- End Update Fixture Table ---

        } catch (err) {
          console.error(`📺 MatchHighlights [${matchId}]: Error during search/processing:`, err);
          setErrorMessage(err instanceof Error ? err.message : 'An error occurred fetching highlights');
          setVideo(null);
        } finally {
          setLoading(false); // Ensure loading is set to false in all paths
        }
      }
    };

    fetchHighlights();
  }, [matchId, initialYoutubeHighlightId, isFinished]);

  // Show loading state only if we haven't successfully loaded video via initial ID or finished searching
   if (loading) {
     return (
       <div className="bg-white dark:bg-[#222222] rounded-lg p-4 animate-pulse shadow">
         <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
         <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
       </div>
     );
   }

   // Show error message if one occurred during fetch (and we don't have a video)
   if (!video && errorMessage) {
       return (
           <div className="bg-white dark:bg-[#222222] rounded-lg p-4 shadow border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
               <h2 className="text-lg font-semibold mb-2">Error Loading Highlights</h2>
               <p className="text-sm">{errorMessage}</p>
           </div>
       );
   }

   // Don't render if not finished, or if no video was found (either initially or after search)
   if (!isFinished || !video) {
     // Optionally, show a "No highlights found" message if search was attempted
     if (isFinished && attemptedSearch && !loading) {
        // console.log(`🤔 MatchHighlights [${matchId}]: No highlights found after search.`);
        // return <div className="bg-white rounded-lg p-4 shadow text-sm text-gray-500">Ingen høydepunkter funnet.</div>;
     }
     return null; // Render nothing otherwise
   }

   // Render the video link and thumbnail (using the video state)
   const videoData = video;
   const videoId = videoData?.id?.videoId || videoData?.id;
   const videoTitle = videoData?.snippet?.title;
   const thumbnailUrl = videoData?.snippet?.thumbnails?.high?.url || videoData?.snippet?.thumbnails?.medium?.url || videoData?.snippet?.thumbnails?.default?.url;

   return (
     <div className="bg-white dark:bg-[#222222] rounded-lg p-4 shadow">
       <h2 className="text-lg font-semibold mb-4 dark:text-white">Offisielle høydepunkter</h2>
       <Link
         href={`https://www.youtube.com/watch?v=${videoId}`}
         target="_blank"
         rel="noopener noreferrer"
         className="block relative rounded-lg overflow-hidden group transition-shadow duration-200"
         aria-label={`Se høydepunkter: ${videoTitle}`}
       >
         <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
           {thumbnailUrl ? (
              <Image
                 src={thumbnailUrl}
                 alt=""
                 fill
                 sizes="(max-width: 768px) 100vw, 33vw"
                 className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
           ) : (
              <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">No Thumbnail</div>
           )}
           <div className="absolute inset-0 flex items-center justify-center group-hover:bg-black/40 transition-colors duration-200">
             <svg className="w-12 h-12 text-white opacity-80 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
             </svg>
           </div>
            <div className="absolute bottom-1 left-2">
               <p className="text-white/90 text-[10px] font-medium drop-shadow">
                   www.youtube.com
               </p>
            </div>
         </div>
       </Link>
     </div>
   );
} 