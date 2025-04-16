'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface MatchHighlightsProps {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: number; // Keep IDs if needed for channel mapping later
  awayTeamId: number;
  leagueId: number;
  matchDate: string; // ISO string date
  isFinished: boolean;
  winnerTeamId: number;
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
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  leagueId,
  matchDate,
  isFinished,
  winnerTeamId
}: MatchHighlightsProps) {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isFinished) {
      setLoading(false);
      setVideo(null);
      setErrorMessage(null);
      return;
    }

    const fetchHighlights = async () => {
      setLoading(true);
      setErrorMessage(null);
      setVideo(null);

      const potentialChannelIds = getPotentialChannelIds(leagueId, homeTeamId, awayTeamId);
      const searchTerms = generateSearchTerms(homeTeamName, awayTeamName, leagueId);
      const matchDateObj = new Date(matchDate);
      const searchCutoffDate = new Date(matchDateObj);
      searchCutoffDate.setDate(matchDateObj.getDate() + 3);

      const normalizedHome = normalizeName(homeTeamName);
      const normalizedAway = normalizeName(awayTeamName);

      // --- Get Mapped Channel IDs for Teams ---
      const homeTeamChannelId = getChannelIdForTeam(homeTeamId);
      const awayTeamChannelId = getChannelIdForTeam(awayTeamId);

      // --- Logging Setup ---
      console.log(`\n📺 MatchHighlights Debug (${homeTeamName} vs ${awayTeamName})`);
      console.log(`📅 Match Date: ${matchDateObj.toISOString()}`);
      // --- NEW LOG: Team IDs and Mapped Channel IDs ---
      console.log(`⭐ Current team fixture IDs and their Channel IDs: Home (${homeTeamId}): ${homeTeamChannelId || 'N/A'}, Away (${awayTeamId}): ${awayTeamChannelId || 'N/A'}`);
      // --- End NEW LOG ---
      console.log(`🎯 Target League/Broadcaster Channel IDs:`, potentialChannelIds); // Note: potentialChannelIds might include team channels too based on your function
      console.log(`🔍 Search Terms:`, searchTerms);
      console.log(`🏷 Normalized Names: home='${normalizedHome}', away='${normalizedAway}'`);
      // --- End Logging Setup ---

      let allPotentialVideos: any[] = [];
      // --- Flags to track if channels were found across ALL searches ---
      let foundHomeOverall = false;
      let foundAwayOverall = false;
      // --- End Flags ---

      try {
        // --- Performing General Keyword Searches ---
        console.log(`\n--- Performing General Keyword Searches (maxResults=50, order=relevance) ---`);
        for (const term of searchTerms) {
          console.log(`➡️ Searching General Term: "${term}"`);
          try {
              const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(term)}&maxResults=50&purpose=highlights`);

              if (!response.ok) {
                console.warn(`⚠️ General search failed for term: "${term}" (Status: ${response.status})`);
                continue;
              }
              const data = await response.json();
              console.log(`📦 General Term "${term}" Raw Items Found: ${data.items?.length || 0}`);

              // Log Channel IDs of First 10 Raw Results (Existing Log)
              if (data.items && data.items.length > 0) {
                  const topChannelIds = data.items.slice(0, 10).map((item: any) => item?.snippet?.channelId || 'N/A');
                  console.log(`📊 Top 10 Raw Channel IDs for "${term}":`, topChannelIds);

                  // --- Check if Home/Away Team Channel Found in Raw Results for THIS term ---
                  let foundHomeInRawThisTerm = false; // Renamed for clarity
                  let foundAwayInRawThisTerm = false; // Renamed for clarity

                  for (const item of data.items) {
                      const itemChannelId = item?.snippet?.channelId;
                      if (!itemChannelId) continue;

                      if (homeTeamChannelId && itemChannelId === homeTeamChannelId) {
                          foundHomeInRawThisTerm = true;
                          foundHomeOverall = true; // Update overall flag
                      }
                      if (awayTeamChannelId && itemChannelId === awayTeamChannelId) {
                          foundAwayInRawThisTerm = true;
                          foundAwayOverall = true; // Update overall flag
                      }
                      if (foundHomeInRawThisTerm && foundAwayInRawThisTerm) break; // Optimization for this term
                  }
                  // --- REMOVED the per-term log message ---

              } else {
                  console.log(`📊 No raw items found for "${term}" to log channel IDs.`);
              }


              if (data.items && data.items.length > 0) {
                 // Process these results (unchanged)
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
              console.error(`❌ Error searching general term "${term}":`, generalErr);
          }
          // Optimization: If both channels found overall, maybe stop searching? (Optional)
          // if (foundHomeOverall && foundAwayOverall) {
          //    console.log("⚡️ Both team channels found, stopping further searches.");
          //    break;
          // }
        } // --- End of search term loop ---
         console.log(`--- Finished General Searches ---`);

        // --- SINGLE CONSOLIDATED LOG (after loop) ---
        let finalFoundLogMessage = '';
        if (foundHomeOverall && foundAwayOverall) {
            finalFoundLogMessage = `⭐ Found Home Team (${homeTeamName}) [${homeTeamChannelId}] and Away Team (${awayTeamName}) [${awayTeamChannelId || 'N/A'}] in raw results across all searches.`;
        } else if (foundHomeOverall) {
            finalFoundLogMessage = `⭐ Found Home Team (${homeTeamName}) [${homeTeamChannelId}] in raw results across all searches.`;
        } else if (foundAwayOverall) {
            finalFoundLogMessage = `⭐ Found Away Team (${awayTeamName}) [${awayTeamChannelId || 'N/A'}] in raw results across all searches.`;
        } else {
            finalFoundLogMessage = `⭐ Did not find mapped Home (${homeTeamChannelId || 'N/A'}) or Away (${awayTeamChannelId || 'N/A'}) team channels in any raw search results.`;
        }
        console.log(finalFoundLogMessage);
        // --- End SINGLE CONSOLIDATED LOG ---


        // --- Combine, Filter, Deduplicate, Sort ---
        console.log(`\n--- Processing All Collected Videos (${allPotentialVideos.length} before filtering) ---`);

        // 1. Filter
        const filteredVideos = allPotentialVideos.filter((item: any) => {
            let passes = true;
            let reason = '';
            const videoTitle = item.title || 'N/A';
            const videoChannelId = item.channelId || 'N/A'; // Get channel ID for logging

            // Date check
            if (!item.publishDate || item.publishDate < matchDateObj || item.publishDate > searchCutoffDate) {
                passes = false;
                reason = `Date out of range (${item.publishDate?.toISOString()})`;
            }
            // Title check (normalized) - MUST contain both teams
            if (passes && (!item.titleNorm.includes(normalizedHome) || !item.titleNorm.includes(normalizedAway))) {
                passes = false;
                reason = `Missing team name (Home: ${item.titleNorm.includes(normalizedHome)}, Away: ${item.titleNorm.includes(normalizedAway)}) in title: "${item.titleNorm}"`; // Log normalized title too
            }
            // Keyword check
            const highlightKeyword = [103, 725].includes(leagueId) ? 'høydepunkter' : 'highlight';
            if (passes && !item.titleLower.includes(highlightKeyword)) {
                passes = false;
                reason = `Missing keyword '${highlightKeyword}'`;
            }

            // --- Add detailed logging for filtered out videos ---
            if (!passes) {
                 // Log details ONLY for videos from potentially official channels OR the one that got selected wrongly
                 const isPotentiallyOfficial = (homeTeamChannelId && videoChannelId === homeTeamChannelId) ||
                                              (awayTeamChannelId && videoChannelId === awayTeamChannelId) ||
                                              (getChannelIdForLeague(leagueId) && videoChannelId === getChannelIdForLeague(leagueId));

                 // Log if it's potentially official OR if it's the problematic Tunnel TV channel for debugging that case
                 if (isPotentiallyOfficial || videoChannelId === 'UCDUnsT44JgL0ItDZrfe7dgQ') {
                    console.log(`🚫 Filtering out: "${videoTitle}" (Channel: ${videoChannelId}) | Reason: ${reason}`);
                 }
            }
            // --- End detailed logging ---

            // Keep this minimal log for general debugging if needed
            // else { console.log(`✅ Keeping: "${videoTitle}" (Channel: ${videoChannelId})`); }

            return passes;
        });
        console.log(`Filtered down to ${filteredVideos.length} videos.`);

        // 2. Deduplicate
        const uniqueVideoMap = new Map<string, any>();
        filteredVideos.forEach(video => {
            if (!uniqueVideoMap.has(video.id)) {
                uniqueVideoMap.set(video.id, video);
            }
        });
        const uniqueVideos = Array.from(uniqueVideoMap.values());
        console.log(`Deduplicated down to ${uniqueVideos.length} videos.`);


        // 3. Sort by Priority and Date
        uniqueVideos.sort((a, b) => {
            const priorityA = getPriority(a.channelId, leagueId, homeTeamId, awayTeamId, winnerTeamId);
            const priorityB = getPriority(b.channelId, leagueId, homeTeamId, awayTeamId, winnerTeamId);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            const dateA = a.publishDate?.getTime() || 0;
            const dateB = b.publishDate?.getTime() || 0;
            return dateB - dateA;
        });

        // Log Sorted Results (Existing Log)
        console.log(`\n📑 Sorted Unique Videos (Top 5):`);
        uniqueVideos.slice(0, 5).forEach((v, index) => {
            console.log(`  [${index + 1}] (Prio: ${getPriority(v.channelId, leagueId, homeTeamId, awayTeamId, winnerTeamId)}) Title: "${v.title}" | Channel: ${v.channelTitle} (${v.channelId}) | Published: ${v.publishedAt}`);
        });


        const finalVideo = uniqueVideos.length > 0 ? uniqueVideos[0] : null;

        // Log Final Result (Existing Log)
        if (finalVideo) {
            console.log(`\n🎉 Final Selected Video (Top Priority): "${finalVideo.title}"`, finalVideo.fullItem);
        } else {
            console.log(`\n🤷 No suitable video found after checking all terms, filtering, and sorting.`);
        }

        setVideo(finalVideo ? finalVideo.fullItem : null);

      } catch (err) {
        console.error('❌ Error fetching match highlights:', err);
        setErrorMessage(err instanceof Error ? err.message : 'An error occurred fetching highlights');
        setVideo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeTeamName, awayTeamName, homeTeamId, awayTeamId, leagueId, matchDate, isFinished, winnerTeamId]);

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 animate-pulse border border-gray-200">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="aspect-video bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  // Show error message if one occurred during fetch
  if (errorMessage) {
      return (
          <div className="bg-white rounded-lg p-4 border border-red-200 text-red-700">
              <h2 className="text-lg font-semibold mb-2">Error Loading Highlights</h2>
              <p className="text-sm">{errorMessage}</p>
          </div>
      );
  }

  // Don't render if not finished or no video found
  if (!isFinished || !video) {
    if (isFinished && !loading && !errorMessage) {
        console.log("🤔 Component rendered null (Match finished, no error, but no video found/selected).");
    }
    return null;
  }

  // Render the video link and thumbnail
  // Access data from the 'video' state object (which is the processed object)
  const videoData = video; // Get the original full item data for rendering
  const videoId = videoData?.id?.videoId;
  const videoTitle = videoData?.title;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Offisielle høydepunkter</h2>
      <Link
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative rounded-lg overflow-hidden group transition-shadow duration-200"
        aria-label={`Se høydepunkter: ${videoTitle}`}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-100">
          {videoData?.snippet?.thumbnails?.high?.url ? (
             <Image
                src={videoData.snippet.thumbnails.high.url} // Use URL from fullItem
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
             />
          ) : (
             <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">No Thumbnail</div>
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-200">
            <svg className="w-12 h-12 text-white opacity-80 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
           {/* Source text overlay */}
           <div className="absolute bottom-1 left-2">
              <p className="text-white/90 text-[10px] font-medium drop-shadow">
                  www.youtube.com
              </p>
           </div>
        </div>
      </Link>
       {/* Optional: Display video title below thumbnail */}
       {/* <p className="text-xs text-gray-600 mt-2 line-clamp-2">{videoTitle}</p> */}
    </div>
  );
} 