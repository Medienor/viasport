"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TeamStandingsProps {
  teamId: number;
  teamName: string;
  seasons: number[];
  hideSeasonSelector?: boolean;
  highlightTeams?: number[];
  leagueId?: number;
  embedded?: boolean;
  forcedLeagueDetails?: {
    id: number;
    name: string;
    logo: string;
  };
}



// Helper function to create URL-friendly slug
function createTeamSlug(teamName: string, teamId: number) {
  const namePart = typeof teamName === 'string'
    ? teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : 'team';
  return `${namePart}-${teamId}`;
}

// Helper function to format season display
const formatSeasonDisplay = (year: number) => {
  const currentYear = new Date().getFullYear();
  if (year >= currentYear) {
    return `${year}`;
  } else {
    return `${year}/${year + 1}`;
  }
};

// Helper function to translate form string
const translateForm = (form: string | null | undefined): string => {
  if (!form) return '';
  return form.toUpperCase().replace(/W/g, 'V').replace(/D/g, 'U').replace(/L/g, 'T');
};

// Interface for league data from RapidAPI
interface LeagueData {
  league: {
    id: number;
    name: string;
    type: string;
    logo: string;
  };
  country: {
    name: string;
    code: string;
    flag: string;
  };
  seasons: Array<{
    year: number;
    start: string;
    end: string;
    current: boolean;
  }>;
}

// Interface for standings data from RapidAPI
interface StandingsData {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    standings: Array<Array<{
      rank: number;
      team: {
        id: number;
        name: string;
        logo: string;
      };
      points: number;
      goalsDiff: number;
      group: string;
      form: string;
      status: string;
      description: string;
      all: {
        played: number;
        win: number;
        draw: number;
        lose: number;
        goals: {
          for: number;
          against: number;
        };
      };
    }>>;
  };
}





export default function TeamStandings({
  teamId,
  teamName,
  seasons,
  hideSeasonSelector = false,
  highlightTeams,
  leagueId,
  embedded = false,
  forcedLeagueDetails
}: TeamStandingsProps) {

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [standingsData, setStandingsData] = useState<StandingsData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(
    forcedLeagueDetails?.id || leagueId || null
  );
  const [showForm, setShowForm] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);

  // Memoize valid seasons
  const validSeasons = useMemo(() => {
    return Array.isArray(seasons) ? [...seasons].sort((a, b) => b - a) : [];
  }, [seasons]);

  // Initialize with the most current/active season
  useEffect(() => {
    if (validSeasons.length > 0 && selectedSeason === null) {
      const currentYear = new Date().getFullYear();
      
      // Prefer current year if available, otherwise the latest season
      let preferredSeason;
      if (validSeasons.includes(currentYear)) {
        preferredSeason = currentYear;
      } else if (validSeasons.includes(currentYear + 1)) {
        // If next year is available (like 2025), prefer that
        preferredSeason = currentYear + 1;
      } else {
        // Fall back to the latest available season
        preferredSeason = validSeasons[0]; // Already sorted descending
      }
      
      console.log(`[TeamStandings] Auto-selecting season ${preferredSeason} from available: [${validSeasons.join(', ')}]`);
      setSelectedSeason(preferredSeason);
    }
  }, [validSeasons, selectedSeason]);

  // Fetch leagues data directly from API Football
  const fetchLeagues = async (): Promise<LeagueData[]> => {
    try {
      console.log(`[TeamStandings] 🏆 Fetching leagues for team ${teamId} from API Football...`);
      
      const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/leagues?team=${teamId}`, {
        headers: {
          'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        console.error(`[TeamStandings] ❌ API request failed: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch leagues: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[TeamStandings] 📥 Raw API Football response for team ${teamId}:`, {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        responseType: Array.isArray(data.response) ? 'array' : typeof data.response,
        fullData: data
      });

      if (!data.response || !Array.isArray(data.response) || data.response.length === 0) {
        console.log(`[TeamStandings] ❌ No leagues found for team ${teamId}`);
        return [];
      }

      console.log(`[TeamStandings] 📋 Processing ${data.response.length} league items from API Football...`);
      
      // Log all leagues and their seasons
      data.response.forEach((item: any, index: number) => {
        const seasons = item.seasons?.map((s: any) => s.year) || [];
        console.log(`[TeamStandings] 📋 League ${index + 1}: ${item.league?.name} (ID: ${item.league?.id}, Type: ${item.league?.type}) - Seasons: [${seasons.join(', ')}]`);
      });

      // Process the leagues and find the best ones for standings
      const currentYear = new Date().getFullYear();

      // Filter and prioritize leagues with standings coverage
      const eligibleLeagues = data.response
        .filter((item: any) => {
          // Check if league has current seasons with standings coverage
          const hasStandings = item.seasons?.some((season: any) => 
            season.current && season.coverage?.standings === true
          );
          if (!hasStandings) {
            console.log(`[TeamStandings] ❌ Excluding ${item.league?.name}: No current season with standings coverage`);
            return false;
          }
          return true;
        })
        .map((item: any) => {
          // Get the current season with standings or fall back to most recent
          let currentSeason = item.seasons?.find((season: any) => 
            season.current && season.coverage?.standings === true
          );
          
          // If no current season with standings, try to find the most recent one
          if (!currentSeason) {
            currentSeason = item.seasons
              ?.filter((season: any) => season.coverage?.standings === true)
              ?.sort((a: any, b: any) => b.year - a.year)?.[0];
          }
          
          return {
            id: item.league.id,
            season: currentSeason?.year || currentYear,
            league: {
              id: item.league.id,
              name: item.league.name,
              type: item.league.type,
              logo: item.league.logo,
              country: item.country
            },
            seasons: item.seasons?.map((s: any) => ({
              year: s.year,
              start: s.start,
              end: s.end,
              current: s.current
            })) || []
          };
        })
        .filter((item: any) => {
          // Prioritize League type and exclude problematic competitions
          const isLeague = item.league.type === 'League';
          const isMeaningfulCup = item.league.type === 'Cup' && 
            !item.league.name.toLowerCase().includes('friendlies') &&
            !item.league.name.toLowerCase().includes('friendly') &&
            !item.league.name.toLowerCase().includes('international champions cup') &&
            !item.league.name.toLowerCase().includes('community shield') &&
            !item.league.name.toLowerCase().includes('emirates cup') &&
            !item.league.name.toLowerCase().includes('mls all-star');
          
          if (!isLeague && !isMeaningfulCup) {
            console.log(`[TeamStandings] ❌ Excluding ${item.league.name}: Not a meaningful competition`);
            return false;
          }
          return true;
        })
        .sort((a: any, b: any) => {
          // Sort by: League type first, then by season (most recent)
          if (a.league.type === 'League' && b.league.type !== 'League') return -1;
          if (b.league.type === 'League' && a.league.type !== 'League') return 1;
          return b.season - a.season;
        });

      console.log(`[TeamStandings] 🎯 After filtering for meaningful leagues with standings: ${eligibleLeagues.length} leagues found`);
      eligibleLeagues.forEach((item: any, index: number) => {
        console.log(`[TeamStandings] 🎯 Eligible ${index + 1}: ${item.league.name} (${item.league.type}) - Season: ${item.season}`);
      });

      if (eligibleLeagues.length === 0) {
        console.log(`[TeamStandings] ❌ No meaningful leagues with standings found for team ${teamId}`);
        return [];
      }

      // Auto-select the best season based on the most relevant league
      const bestSeason = eligibleLeagues[0].season;
      if (selectedSeason !== bestSeason) {
        console.log(`[TeamStandings] 🔄 Updating selectedSeason from ${selectedSeason} to ${bestSeason}`);
        setSelectedSeason(bestSeason);
      }

      console.log(`[TeamStandings] ✅ Successfully processed ${eligibleLeagues.length} leagues for team ${teamId}`);
      return eligibleLeagues;

    } catch (err: any) {
      console.error(`[TeamStandings] 💥 ERROR in fetchLeagues:`, err);
      console.error(`[TeamStandings] 💥 fetchLeagues error details:`, {
        teamId,
        errorMessage: err.message,
        errorStack: err.stack
      });
      throw err;
    }
  };

  // Fetch standings data with fallback to previous season
  const fetchStandingsWithFallback = async (leagueId: number): Promise<StandingsData | null> => {
    try {
      const currentYear = new Date().getFullYear();
      console.log(`[TeamStandings] 🏆 fetchStandingsWithFallback for league ${leagueId}...`);
      
      // Try current year first
      console.log(`[TeamStandings] 📊 Trying standings for league ${leagueId}, season ${currentYear}...`);
      let response = await fetch(`/api/standings?league=${leagueId}&season=${currentYear}`);
      
      if (!response.ok) {
        console.error(`[TeamStandings] ❌ Standings API failed for ${leagueId}/${currentYear}: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch standings: ${response.status}`);
      }
      
      let data = await response.json();
      console.log(`[TeamStandings] 📊 Standings API response for ${leagueId}/${currentYear}:`, {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        responseType: Array.isArray(data.response) ? 'array' : typeof data.response
      });
      
      // Check if current year has meaningful data (not just placeholder with all 0s)
      if (data.response && Array.isArray(data.response) && data.response.length > 0) {
        const standings = data.response[0];
        const standingsGroups = standings.league?.standings || [];
        console.log(`[TeamStandings] 📊 Checking meaningful data for ${leagueId}/${currentYear}: ${standingsGroups.length} groups found`);
        
        // Check if any team has played games (meaningful data)
        let hasMeaningfulData = false;
        let totalTeamsChecked = 0;
        let teamsWithGames = 0;
        
        for (const group of standingsGroups) {
          if (Array.isArray(group)) {
            for (const team of group) {
              totalTeamsChecked++;
              const gamesPlayed = team?.all?.played || 0;
              if (gamesPlayed > 0) {
                teamsWithGames++;
                hasMeaningfulData = true;
                break;
              }
            }
          }
          if (hasMeaningfulData) break;
        }
        
        console.log(`[TeamStandings] 📊 Meaningful data check for ${leagueId}/${currentYear}:`, {
          totalTeamsChecked,
          teamsWithGames,
          hasMeaningfulData,
          firstTeamExample: standingsGroups[0]?.[0] ? {
            name: standingsGroups[0][0].team?.name,
            played: standingsGroups[0][0].all?.played,
            points: standingsGroups[0][0].points
          } : 'No teams found'
        });
        
        if (hasMeaningfulData) {
          console.log(`[TeamStandings] ✅ Using season ${currentYear} standings for league ${leagueId} (has meaningful data)`);
          return standings;
        } else {
          console.log(`[TeamStandings] ⚠️ Season ${currentYear} for league ${leagueId} has placeholder data (${totalTeamsChecked} teams, all with 0 games), trying previous year...`);
        }
      } else {
        console.log(`[TeamStandings] ⚠️ Season ${currentYear} for league ${leagueId} has no response data, trying previous year...`);
      }
      
      // If current year is empty or placeholder, try previous year
      const previousYear = currentYear - 1;
      console.log(`[TeamStandings] 📊 Trying fallback standings for league ${leagueId}, season ${previousYear}...`);
      
      response = await fetch(`/api/standings?league=${leagueId}&season=${previousYear}`);
      
      if (!response.ok) {
        console.error(`[TeamStandings] ❌ Fallback standings API failed for ${leagueId}/${previousYear}: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch standings: ${response.status}`);
      }
      
      data = await response.json();
      console.log(`[TeamStandings] 📊 Fallback standings API response for ${leagueId}/${previousYear}:`, {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        responseType: Array.isArray(data.response) ? 'array' : typeof data.response
      });
      
      if (data.response && Array.isArray(data.response) && data.response.length > 0) {
        const standings = data.response[0];
        const standingsGroups = standings.league?.standings || [];
        let totalTeamsInFallback = 0;
        standingsGroups.forEach((group: any) => {
          if (Array.isArray(group)) totalTeamsInFallback += group.length;
        });
        
        console.log(`[TeamStandings] ✅ Using fallback season ${previousYear} standings for league ${leagueId} (${totalTeamsInFallback} teams)`);
        return standings;
      }
      
      console.log(`[TeamStandings] ❌ No meaningful standings found for league ${leagueId} in either ${currentYear} or ${previousYear}`);
      return null;
    } catch (err: any) {
      console.error(`[TeamStandings] 💥 ERROR in fetchStandingsWithFallback for league ${leagueId}:`, err);
      console.error(`[TeamStandings] 💥 fetchStandingsWithFallback error details:`, {
        leagueId,
        errorMessage: err.message,
        errorStack: err.stack
      });
      return null;
    }
  };

  // Main effect to fetch data
  useEffect(() => {
    if (!selectedSeason || !teamId) {
      console.log(`[TeamStandings] ❌ Missing required data: selectedSeason=${selectedSeason}, teamId=${teamId}`);
      return;
    }

    let isMounted = true;

    async function fetchData() {
      console.log(`[TeamStandings] 🚀 STARTING fetchData for team ${teamId}, season ${selectedSeason}`);
      
      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        // Step 1: Fetch leagues
        console.log(`[TeamStandings] 📋 Step 1: Fetching leagues...`);
        const leagues = await fetchLeagues();
        console.log(`[TeamStandings] 📋 Step 1 RESULT: Found ${leagues.length} leagues:`, leagues.map(l => `${l.league.name} (ID: ${l.league.id})`));
        
        if (!isMounted) return;
        
        if (leagues.length === 0) {
          console.warn(`[TeamStandings] ⚠️ PROBLEM: No leagues found for team ${teamId} - this will show "no data available"`);
          setStandingsData([]);
          setLoading(false);
          return;
        }

        console.log(`[TeamStandings] ✅ Step 1 SUCCESS: Found ${leagues.length} leagues for team ${teamId}`);

        // Step 2: Fetch standings for each league with fallback
        console.log(`[TeamStandings] 📊 Step 2: Fetching standings for ${leagues.length} leagues...`);
        const standingsPromises = leagues.map((league, index) => {
          console.log(`[TeamStandings] 📊 Step 2.${index + 1}: Fetching standings for ${league.league.name} (ID: ${league.league.id})`);
          return fetchStandingsWithFallback(league.league.id);
        });

        const standingsResults = await Promise.all(standingsPromises);
        console.log(`[TeamStandings] 📊 Step 2 RESULTS: Got ${standingsResults.length} results:`, standingsResults.map((result, index) => ({
          league: leagues[index]?.league?.name,
          hasData: !!result,
          teamsCount: result?.league?.standings?.[0]?.length || 0
        })));
        
        if (!isMounted) return;

        const validStandings = standingsResults.filter(Boolean) as StandingsData[];
        console.log(`[TeamStandings] 📊 Step 2 FILTERED: ${validStandings.length} valid standings out of ${standingsResults.length} total`);
        
        setStandingsData(validStandings);

        // Auto-select league if only one available
        if (validStandings.length === 1 && !selectedLeagueId) {
          console.log(`[TeamStandings] 🎯 Auto-selecting league: ${validStandings[0].league.name} (ID: ${validStandings[0].league.id})`);
          setSelectedLeagueId(validStandings[0].league.id);
        }

        console.log(`[TeamStandings] ✅ FINAL SUCCESS: Set ${validStandings.length} standings for team ${teamId}`);

      } catch (err: any) {
        console.error(`[TeamStandings] 💥 ERROR in fetchData:`, err);
        console.error(`[TeamStandings] 💥 ERROR details:`, {
          teamId,
          selectedSeason,
          errorMessage: err.message,
          errorStack: err.stack
        });
        if (isMounted) {
          setError(`Kunne ikke laste tabelldata: ${err.message}`);
          setStandingsData([]);
        }
      } finally {
        if (isMounted) {
          console.log(`[TeamStandings] 🏁 FINISHED fetchData for team ${teamId} - loading set to false`);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [teamId, selectedSeason]);

  // Handler for season change
  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeason = parseInt(event.target.value, 10);
    setSelectedSeason(newSeason);
  };

  // Handler for league change
  const handleLeagueChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLeagueId = parseInt(event.target.value, 10);
    setSelectedLeagueId(newLeagueId);
  };

  // Get available leagues from standings data
  const availableLeagues = useMemo(() => {
    return standingsData
      .map(item => item.league)
      .filter((league, index, self) => 
        index === self.findIndex(l => l.id === league.id)
      ); // Remove duplicates
  }, [standingsData]);

  // Get current standings to display
  const currentStandings = useMemo(() => {
    if (selectedLeagueId && standingsData.length > 1) {
      const filtered = standingsData.filter(item => 
        item.league.id === selectedLeagueId
      );
      return filtered.length > 0 ? filtered : standingsData;
    }
    return standingsData;
  }, [standingsData, selectedLeagueId]);

  // Helper function to filter and reorder groups based on display preferences
  const getGroupsToDisplay = (standingsGroups: any[][], teamId: number) => {
    if (standingsGroups.length <= 1) return { groupsToShow: standingsGroups, hasMultipleGroups: false };
    
    // Check if any group actually has "group" in the name (case insensitive)
    const hasActualGroups = standingsGroups.some((group: any[]) => 
      group.length > 0 && group[0]?.group && 
      group[0].group.toLowerCase().includes('group')
    );
    
    // If no actual groups (just regular league standings), show all
    if (!hasActualGroups) {
      return { groupsToShow: standingsGroups, hasMultipleGroups: false };
    }
    
    const teamGroupIndex = standingsGroups.findIndex((group: any[]) => 
      group.some((standing: any) => standing?.team?.id === teamId)
    );
    
    // If showing all groups or team group not found, show all groups
    if (showAllGroups || teamGroupIndex === -1) {
      // Reorder so team's group appears first
      if (teamGroupIndex > 0) {
        const reorderedGroups = [...standingsGroups];
        const teamGroup = reorderedGroups.splice(teamGroupIndex, 1)[0];
        reorderedGroups.unshift(teamGroup);
        console.log(`[TeamStandings] Moved team ${teamId}'s group to top (was index ${teamGroupIndex})`);
        return { groupsToShow: reorderedGroups, hasMultipleGroups: true };
      }
      return { groupsToShow: standingsGroups, hasMultipleGroups: true };
    }
    
    // Show only team's group
    const teamGroup = standingsGroups[teamGroupIndex];
    console.log(`[TeamStandings] Showing only team ${teamId}'s group (index ${teamGroupIndex})`);
    return { groupsToShow: [teamGroup], hasMultipleGroups: true };
  };

  // Loading state
  if (loading) {
    return (
      <div className={`${embedded ? '' : 'bg-white dark:bg-[#222222] shadow rounded-lg p-4'}`}>
        <div className="text-center py-10 dark:text-gray-300">Laster tabelldata...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${embedded ? '' : 'bg-white dark:bg-[#222222] shadow rounded-lg p-4'}`}>
        <div className="text-center py-10 text-red-600 dark:text-red-400">Feil: {error}</div>
      </div>
    );
  }

  // No data state
  if (!selectedSeason || currentStandings.length === 0) {
    console.log(`[TeamStandings] 🚫 SHOWING "NO DATA" MESSAGE: selectedSeason=${selectedSeason}, currentStandings.length=${currentStandings.length}, teamName=${teamName}`);
    return (
      <div className={`${embedded ? '' : 'bg-white dark:bg-[#222222] shadow rounded-lg p-4'}`}>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          Ingen tabelldata tilgjengelig for {teamName} for sesongen {selectedSeason ? formatSeasonDisplay(selectedSeason) : ''}.
        </div>
      </div>
    );
  }

  console.log(`[TeamStandings] ✅ SHOWING STANDINGS TABLE: selectedSeason=${selectedSeason}, currentStandings.length=${currentStandings.length}, teamName=${teamName}`);

  return (
    <div className={`${embedded ? '' : 'bg-white dark:bg-[#222222] shadow rounded-lg p-4'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        {!embedded && (
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2 sm:mb-0">
            Tabell
            {selectedSeason && selectedSeason < new Date().getFullYear() && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                (viser {formatSeasonDisplay(selectedSeason)} data)
              </span>
            )}
          </h2>
        )}
        
        {!embedded && !hideSeasonSelector && !forcedLeagueDetails && validSeasons.length > 1 && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <label htmlFor="season-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Sesong:</label>
            <select
              id="season-select"
              value={selectedSeason ?? ''}
              onChange={handleSeasonChange}
              className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-[#222222] dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
            >
              {validSeasons.map(year => (
                <option key={year} value={year}>
                  {formatSeasonDisplay(year)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* League Selector for teams with multiple leagues */}
      {!forcedLeagueDetails && availableLeagues.length > 1 && (
        <div className="mb-6">
          <select
            id="league-select"
            value={selectedLeagueId ?? ''}
            onChange={handleLeagueChange}
            className="block w-full pl-4 pr-10 py-3 text-base bg-white dark:bg-[#181818] border border-gray-200 dark:border-[#232323] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-300 dark:hover:border-[#333333]"
          >
            <option value="">Alle turneringer</option>
            {availableLeagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Render Standings */}
      <div>
        {currentStandings.map((leagueData: StandingsData, leagueIndex: number) => {
          const league = leagueData.league;
          const standingsGroups = league.standings || [];

          if (!league || !standingsGroups.length) return null;

          return (
            <div key={`${league.id}-${leagueIndex}`} className="mb-6 last:mb-0">
              {/* League Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="relative h-8 w-8 mr-3">
                    <Image
                      src={league.logo ? 
                        league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') : 
                        '/images/league-placeholder.png'
                      }
                      alt={league.name || 'Ukjent Liga'}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-medium dark:text-white">{league.name || 'Ukjent Liga'}</h3>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      showForm 
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {showForm ? 'Vis statistikk' : 'Vis form'}
                  </button>
                </div>
              </div>

              {/* Render groups based on display preferences */}
              {(() => {
                const { groupsToShow, hasMultipleGroups } = getGroupsToDisplay(standingsGroups, teamId);
                
                return (
                  <div>
                    {groupsToShow.map((standingGroup: any[], groupIndex: number) => {
                      if (!Array.isArray(standingGroup) || standingGroup.length === 0) {
                        return null;
                      }

                      const currentTeamIndex = standingGroup.findIndex(
                        (standing: any) => standing?.team?.id === teamId
                      );
                      const currentTeamStanding = currentTeamIndex !== -1 ? standingGroup[currentTeamIndex] : null;
                      const isTeamGroup = currentTeamStanding !== null;
                      
                      // Check if this competition has actual groups (not just league name)
                      const hasActualGroups = standingsGroups.length > 1 || 
                        (standingGroup[0]?.group && standingGroup[0].group.toLowerCase().includes('group'));
                      const shouldShowGroupLabel = isTeamGroup && hasActualGroups;

                      return (
                        <div key={groupIndex} className={`mb-4 last:mb-0 ${shouldShowGroupLabel ? 'ring-2 ring-blue-200 dark:ring-blue-800 rounded-lg p-2' : ''}`}>
                    {standingGroup[0]?.group && (
                      <h4 className={`text-md font-medium mb-2 dark:text-gray-300 ${shouldShowGroupLabel ? 'text-blue-700 dark:text-blue-300 font-semibold' : ''}`}>
                        {standingGroup[0].group} {shouldShowGroupLabel && '(Din gruppe)'}
                      </h4>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-[#2c2c2c]">
                        <thead className="bg-gray-50 dark:bg-[#222222]">
                          <tr>
                            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lag</th>
                            {!showForm && (
                              <>
                                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">K</th>
                                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">V</th>
                                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">U</th>
                                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">T</th>
                                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mål</th>
                              </>
                            )}
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P</th>
                            {showForm && (
                              <>
                                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">+/-</th>
                                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Form</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#222222] divide-y divide-gray-200 dark:divide-[#2c2c2c]">
                          {standingGroup.map((standing: any) => {
                            if (!standing?.team?.id) {
                              return null;
                            }
                            
                            const isCurrentTeam = standing.team.id === teamId;
                            const isHighlightedTeam = highlightTeams?.includes(standing.team.id);
                            const formTranslated = translateForm(standing.form);

                            let rankClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
                            if (standing.description) {
                                if (standing.description.includes('Champions League')) rankClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
                                else if (standing.description.includes('Europa League')) rankClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
                                else if (standing.description.includes('Conference League')) rankClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
                                else if (standing.description.includes('Relegation')) rankClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
                                else if (standing.description.includes('Promotion')) rankClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
                            }

                            return (
                              <tr key={standing.team.id} 
                                  className={`hover:bg-gray-50 dark:hover:bg-[#222222] ${
                                    isCurrentTeam ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold' : 
                                    isHighlightedTeam ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''
                                  }`}
                              >
                                <td className="px-2 py-2 whitespace-nowrap text-center">
                                   <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${rankClass}`}>
                                     {standing.rank ?? '-'}
                                   </span>
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap">
                                  <Link href={`/lag/${createTeamSlug(standing.team.name || `team-${standing.team.id}`, standing.team.id)}`} className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 group">
                                    <div className="flex-shrink-0 h-5 w-5 relative mr-2">
                                      <Image
                                        src={standing.team.logo ? 
                                          standing.team.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') : 
                                          '/images/team-placeholder.png'
                                        }
                                        alt={standing.team.name || 'Ukjent Lag'}
                                        fill
                                        className="object-contain"
                                      />
                                    </div>
                                    <span className={`text-sm group-hover:underline ${isCurrentTeam ? 'font-bold' : ''} dark:text-[#AAAAAA]`}>
                                      {standing.team.name || 'Ukjent Lag'}
                                    </span>
                                  </Link>
                                </td>
                                {!showForm && (
                                  <>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.played ?? '-'}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.win ?? '-'}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.draw ?? '-'}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.lose ?? '-'}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{`${standing.all?.goals?.for ?? '-'}:${standing.all?.goals?.against ?? '-'}`}</td>
                                  </>
                                )}
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-center font-semibold dark:text-white">{standing.points ?? '-'}</td>
                                {showForm && (
                                  <>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.goalsDiff ?? '-'}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                      <div className="flex justify-center space-x-1">
                                        {formTranslated.split('').map((result, formIdx) => (
                                          <span
                                            key={formIdx}
                                            className={`inline-block h-3 w-3 rounded-full ${
                                              result === 'V' ? 'bg-green-500' : result === 'U' ? 'bg-gray-400' : 'bg-red-500'
                                            }`}
                                            title={result}
                                          ></span>
                                        ))}
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary for current team */}
                    {currentTeamStanding && (
                      <div className="mt-4 px-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {(() => {
                          const teamName = currentTeamStanding.team.name || 'Laget';
                          const leagueName = league.name || 'turneringen';
                          const rank = currentTeamStanding.rank;
                          const totalTeams = standingGroup.length;
                          const points = currentTeamStanding.points || 0;
                          const played = currentTeamStanding.all?.played || 0;
                          const wins = currentTeamStanding.all?.win || 0;
                          const draws = currentTeamStanding.all?.draw || 0;
                          const losses = currentTeamStanding.all?.lose || 0;
                          const goalsFor = currentTeamStanding.all?.goals?.for || 0;
                          const goalsAgainst = currentTeamStanding.all?.goals?.against || 0;
                          const goalDiff = goalsFor - goalsAgainst;
                          
                          let positionDesc = '';
                          if (rank === 1) {
                            positionDesc = 'på toppen av tabellen';
                          } else if (rank <= 3) {
                            positionDesc = 'i toppen av tabellen';
                          } else if (rank <= Math.ceil(totalTeams * 0.25)) {
                            positionDesc = 'i øvre del av tabellen';
                          } else if (rank >= Math.floor(totalTeams * 0.75)) {
                            positionDesc = 'i nedre del av tabellen';
                          } else if (rank > totalTeams - 3 && rank <= totalTeams) {
                            positionDesc = 'i bunnen av tabellen';
                          } else {
                            positionDesc = 'i midten av tabellen';
                          }

                          const form = currentTeamStanding.form || '';
                          const lastFiveResults = form.slice(-5).split('').map((char: string) => {
                            if (char === 'W') return 'seier';
                            if (char === 'D') return 'uavgjort';
                            if (char === 'L') return 'tap';
                            return '';
                          }).filter(Boolean);
                          
                          const formDesc = lastFiveResults.length > 0 
                            ? `De siste ${lastFiveResults.length} kampene har resultert i ${lastFiveResults.join(', ')}.`
                            : '';

                          let specialDesc = '';
                          if (currentTeamStanding.description) {
                            if (currentTeamStanding.description.includes('Champions League')) {
                              specialDesc = ' Denne plasseringen kvalifiserer til Champions League.';
                            } else if (currentTeamStanding.description.includes('Europa League')) {
                              specialDesc = ' Denne plasseringen kvalifiserer til Europa League.';
                            } else if (currentTeamStanding.description.includes('Conference League')) {
                              specialDesc = ' Denne plasseringen kvalifiserer til Conference League.';
                            } else if (currentTeamStanding.description.includes('Relegation')) {
                              specialDesc = ' Denne plasseringen kan føre til nedrykk.';
                            } else if (currentTeamStanding.description.includes('Promotion')) {
                              specialDesc = ' Denne plasseringen kan føre til opprykk.';
                            }
                          }

                          return (
                            <>
                              <p>
                                {teamName} ligger for øyeblikket på {rank}. plass {positionDesc} i {leagueName} med {points} poeng etter {played} kamper. 
                                Laget har {wins} seire, {draws} uavgjort og {losses} tap, med en målforskjell på {goalDiff > 0 ? '+' : ''}{goalDiff} ({goalsFor}-{goalsAgainst}).
                                {specialDesc}
                              </p>
                              {formDesc && <p className="mt-2">{formDesc}</p>}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
                    })}
                    
                    {/* Show expand button if there are multiple groups and not showing all */}
                    {hasMultipleGroups && !showAllGroups && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowAllGroups(true)}
                          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                        >
                          Se alle andre grupper
                        </button>
                      </div>
                    )}
                    
                    {/* Show collapse button if showing all groups and there are multiple */}
                    {hasMultipleGroups && showAllGroups && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowAllGroups(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          Skjul andre grupper
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
} 