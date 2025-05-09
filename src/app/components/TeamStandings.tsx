"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TeamStandingsProps {
  teamId: number;
  teamName: string;
  seasons: number[]; // All available season years, e.g., [2025, 2024]
  hideSeasonSelector?: boolean;
  highlightTeams?: number[];
  leagueId: number;
  embedded?: boolean; // Add this prop to control styling
  forcedLeagueDetails?: { // New optional prop
    id: number;
    name: string;
    logo: string;
  };
}

const norwegianLeagueIds = [103, 104]; // Eliteserien and OBOS-ligaen IDs

const getCorrectSeason = (leagueId: number | null, currentSeason: number): number => {
  if (leagueId && norwegianLeagueIds.includes(leagueId)) {
    // return currentSeason + 1; // Or whatever logic is needed
  }
  return currentSeason;
};

// Helper function to create URL-friendly slug
function createTeamSlug(teamName: string, teamId: number) {
  const namePart = typeof teamName === 'string'
    ? teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : 'team';
  return `${namePart}-${teamId}`;
}

// Helper function to format season display
const formatSeasonDisplay = (year: number) => {
  // Assuming leagues like 103, 104 are single year (e.g., 2023)
  // and others are split (e.g., 2023/2024)
  // Adjust this logic based on your actual league IDs if needed
  // For now, we'll assume any season >= current year is single format
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

export default function TeamStandings({
  teamId,
  teamName,
  seasons, // Use this for dropdown AND initial determination
  hideSeasonSelector = false,
  highlightTeams,
  leagueId,
  embedded = false, // Default to false
  forcedLeagueDetails // Destructure the new prop
}: TeamStandingsProps) {

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null); // Start as null
  const [isInitialSeasonDetermined, setIsInitialSeasonDetermined] = useState(false); // Flag

  const [standingsData, setStandingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Loading includes initial season check
  const [error, setError] = useState<string | null>(null);
  const [teamLeagues, setTeamLeagues] = useState<any[]>(() =>
    forcedLeagueDetails ? [{ league: forcedLeagueDetails }] : []
  );
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(() =>
    forcedLeagueDetails ? forcedLeagueDetails.id : null
  );
  const [showForm, setShowForm] = useState(false);
  const [validSortedSeasons, setValidSortedSeasons] = useState<number[]>([]);

  // --- Memoize validSortedSeasons ---
  const validSortedSeasonsMemo = useMemo(() => {
    console.log("[Memo] Recalculating validSortedSeasons"); // Log when this recalculates
    return Array.isArray(seasons) ? [...seasons].sort((a, b) => b - a) : [];
  }, [seasons]); // Only recalculate if the 'seasons' prop changes

  // --- Effect 1: Determine the correct initial season ---
  useEffect(() => {
    let isMounted = true;
    const determineInitialSeason = async () => {
      console.log("[Effect 1] Running: Determine Initial Season");
      setLoading(true);
      setError(null); // Clear previous errors
      const latestYear = validSortedSeasonsMemo[0];

      try {
        const response = await fetch(`/api/leagues?team=${teamId}&season=${latestYear}`);
        if (!isMounted) return; // Exit if component unmounted during fetch

        if (!response.ok) throw new Error(`API check failed for season ${latestYear} with status: ${response.status}`);
        const data = await response.json();

        let initialSeasonToSet = null;
        let foundActiveSeason = false;

        if (data.response && Array.isArray(data.response)) {
          const primaryLeagueData = data.response.find((item: any) => item.league?.type === 'League');
          if (primaryLeagueData?.seasons) {
            const seasonInfo = primaryLeagueData.seasons.find((s: any) => s.year === latestYear);
            if (seasonInfo?.current === true) {
              console.log(`[Effect 1] Latest year (${latestYear}) confirmed active.`);
              initialSeasonToSet = latestYear;
              foundActiveSeason = true;
            }
          }
        }

        if (!foundActiveSeason) {
          const previousYear = validSortedSeasonsMemo.find(year => year === latestYear - 1);
          if (previousYear) {
            console.log(`[Effect 1] Latest year not active, falling back to previous year: ${previousYear}`);
            initialSeasonToSet = previousYear;
          } else {
            console.log(`[Effect 1] Latest year not active, no previous year found. Defaulting to latest: ${latestYear}`);
            initialSeasonToSet = latestYear; // Fallback to latest if previous doesn't exist
          }
        }

        if (isMounted) {
            console.log(`[Effect 1] Setting initial season to: ${initialSeasonToSet}`);
            setSelectedSeason(initialSeasonToSet);
            setIsInitialSeasonDetermined(true); // Mark as determined *after* setting season
            // Keep loading true, Effect 2 will handle it
        }

      } catch (err: any) {
        console.error("[Effect 1] Error determining initial season:", err);
        if (isMounted) {
          setError(`Feil ved henting av sesongdata: ${err.message}`);
          // Fallback: Set to latest year on error? Or handle differently?
          setSelectedSeason(validSortedSeasonsMemo[0]); // Set to latest as a fallback
          setIsInitialSeasonDetermined(true); // Mark determined even on error to prevent loop
          setLoading(false); // Stop loading on error
        }
      }
    };

    determineInitialSeason();

    return () => {
      isMounted = false;
      console.log("[Effect 1] Cleanup");
    };
  }, [isInitialSeasonDetermined, validSortedSeasonsMemo, teamId]);


  // --- Effect 2: Fetch Leagues for the selected season ---
  useEffect(() => {
    let isMounted = true; // Flag to track mount status

    // Define the async function inside useEffect
    async function fetchTeamLeagues() {
        // If league details are forced, handle it and exit
        if (forcedLeagueDetails) {
            console.log(`[Effect 2] Skipping league fetch: League details forced to ID ${forcedLeagueDetails.id}`);
            if (isMounted) { // Check before setting state
                if (selectedLeagueId !== forcedLeagueDetails.id) {
                    setSelectedLeagueId(forcedLeagueDetails.id);
                }
                if (teamLeagues.length !== 1 || teamLeagues[0]?.league?.id !== forcedLeagueDetails.id) {
                    setTeamLeagues([{ league: forcedLeagueDetails }]);
                }
            }
            return; // Exit async function
        }

        // Only run if initial season is set and selectedSeason is not null
        if (!isInitialSeasonDetermined || selectedSeason === null) {
            console.log("[Effect 2] Skipping: Initial season not determined or selectedSeason is null.");
            return; // Exit async function
        }

        console.log(`[Effect 2] Running: Fetching leagues for season ${selectedSeason}`);
        // Set loading states immediately if mounted
        if (isMounted) {
            setLoading(true);
            setError(null);
            setStandingsData([]); // Clear old standings
            setTeamLeagues([]); // Clear old leagues
            setSelectedLeagueId(null); // Reset selected league
        }

        try {
            const response = await fetch(`/api/leagues?team=${teamId}&season=${selectedSeason}`);
            // Check mount status *after* await
            if (!isMounted) return;

            if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
            const data = await response.json();
            console.log(`[Effect 2] Leagues API response for season ${selectedSeason}:`, data);

            if (data.response && data.response.length > 0) {
                const leaguesWithStandings = data.response.filter((l: any) =>
                    l.league?.type === 'League' && l.seasons?.some((s: any) => s.year === selectedSeason && s.coverage?.standings === true)
                );

                if (isMounted) { // Check before setting state
                    console.log(`[Effect 2] Found ${leaguesWithStandings.length} leagues with standings for season ${selectedSeason}.`);
                    setTeamLeagues(leaguesWithStandings);
                    // Automatically select the first league found
                    setSelectedLeagueId(leaguesWithStandings[0].league.id);
                    console.log(`[Effect 2] Auto-selecting league ID: ${leaguesWithStandings[0].league.id}`);
                }
            } else {
                 if (isMounted) { // Check before setting state
                    console.warn(`[Effect 2] No leagues found at all for season ${selectedSeason}.`);
                    setTeamLeagues([]);
                    setSelectedLeagueId(null);
                    setLoading(false); // Stop loading if no leagues found
                 }
            }
        } catch (err: any) {
            console.error(`[Effect 2] Error fetching leagues for season ${selectedSeason}:`, err);
            if (isMounted) { // Check before setting state
                setError(`Feil ved henting av ligadata: ${err.message}`);
                setLoading(false); // Stop loading on error
            }
        }
        // Note: setLoading(false) is handled by Effect 3 or if no leagues are found here.
    }

    // Call the async function defined above
    fetchTeamLeagues();

    // Return the cleanup function for useEffect
    return () => {
        isMounted = false; // Set flag on cleanup
        console.log("[Effect 2] Cleanup: Component unmounted or dependencies changed");
    };

  // Dependencies: Run when selectedSeason changes *after* initial determination, or if forced details change
  }, [selectedSeason, teamId, isInitialSeasonDetermined, forcedLeagueDetails]); // Keep dependencies


  // --- Effect 3: Fetch Standings for the selected league and season ---
  useEffect(() => {
    let isMounted = true; // Flag to track mount status

    // Define the async function inside useEffect
    async function fetchLeagueStandings() {
        // Only run if a league and season are selected
        if (selectedLeagueId === null || selectedSeason === null) {
            console.log("[Effect 3] Skipping: No league or season selected.");
            // Ensure loading is false if we skipped fetching leagues previously
            // Check isMounted before setting state
            if (teamLeagues.length === 0 && isInitialSeasonDetermined && isMounted) {
                setLoading(false);
            }
            return; // Exit async function
        }

        console.log(`[Effect 3] Running: Fetching standings for league ${selectedLeagueId}, season ${selectedSeason}`);
        if (isMounted) { // Check before setting state
            setLoading(true); // Ensure loading is true while fetching standings
            setError(null); // Clear previous errors specifically for standings fetch
        }

        try {
            const response = await fetch(`/api/standings?league=${selectedLeagueId}&season=${selectedSeason}`);
            // Check mount status *after* await
            if (!isMounted) return;

            if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
            const data = await response.json();
            console.log(`[Effect 3] Standings API response for league ${selectedLeagueId}, season ${selectedSeason}:`, data);

            if (data.response && data.response.length > 0 && data.response[0].league?.standings) {
                if (isMounted) { // Check before setting state
                    // The standings seem to be nested: response[0].league.standings which is an array of arrays (groups)
                    const allStandings = data.response[0].league.standings; // This is likely Array<Array<Standing>>
                    console.log(`[Effect 3] Received standings data (potentially grouped):`, allStandings);
                    setStandingsData(allStandings); // Keep the grouped structure
                }
            } else {
                if (isMounted) { // Check before setting state
                    console.warn(`[Effect 3] No standings data found in response for league ${selectedLeagueId}, season ${selectedSeason}.`);
                    setStandingsData([]); // Clear standings if none found
                }
            }
        } catch (err: any) {
            console.error(`[Effect 3] Error fetching standings:`, err);
            if (isMounted) { // Check before setting state
                setError(`Feil ved henting av tabelldata: ${err.message}`);
                setStandingsData([]); // Clear standings on error
            }
        } finally {
            if (isMounted) { // Check before setting state
                setLoading(false); // Stop loading *after* standings fetch attempt (success or fail)
                console.log("[Effect 3] Fetch complete, setLoading(false)");
            }
        }
    }

    // Call the async function defined above
    fetchLeagueStandings();

    // Return the cleanup function for useEffect
    return () => {
        isMounted = false; // Set flag on cleanup
        console.log("[Effect 3] Cleanup: Component unmounted or dependencies changed");
    };

  // Dependencies: Run when selected league or season changes, include checks used in skip logic
  }, [selectedLeagueId, selectedSeason, isInitialSeasonDetermined, teamLeagues.length]); // Added dependencies


  // Handler for season change
  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeason = parseInt(event.target.value, 10);
    console.log(`Season changed to: ${newSeason}`);
    setSelectedSeason(newSeason);
    // Reset dependent states immediately for better UX
    // If league is forced, keep it selected, otherwise reset
    if (!forcedLeagueDetails) {
        setSelectedLeagueId(null);
        setTeamLeagues([]);
    }
    setStandingsData([]);
    setLoading(true);
    setError(null);
  };

  // Handler for league change (if selector is added)
  const handleLeagueChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newLeagueId = parseInt(event.target.value, 10);
      console.log(`League changed to: ${newLeagueId}`);
      setSelectedLeagueId(newLeagueId);
      // Reset standings immediately
      setStandingsData([]);
      setLoading(true); // Set loading true, Effect 3 will take over
      setError(null);
  };


  // Find the currently selected league object for display
  const currentLeague = teamLeagues.find(l => l.league.id === selectedLeagueId);
  // Get the actual standings array(s) from the fetched data
  const standingsGroups = standingsData; // Already holds the array of groups (or empty array)


  // --- RENDER LOGIC ---
  if (!isInitialSeasonDetermined && loading) {
    return <div className="text-center py-10 dark:text-gray-300">Laster inn sesongdata...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600 dark:text-red-400">Feil: {error}</div>;
  }

  if (!selectedSeason) {
     return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Ingen sesong valgt.</div>;
  }

  return (
    <div className={`
      ${embedded 
        ? '' // No background or shadow when embedded
        : 'bg-white dark:bg-[#222222] shadow rounded-lg p-4'
      }
    `}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        {/* Only show title when not embedded */}
        {!embedded && <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2 sm:mb-0">Tabell</h2>}
        
        {/* Season selector - hide when embedded or hideSeasonSelector is true OR if league is forced */}
        {!embedded && !hideSeasonSelector && !forcedLeagueDetails && validSortedSeasonsMemo.length > 0 && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <label htmlFor="season-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Sesong:</label>
            <select
              id="season-select"
              value={selectedSeason ?? ''}
              onChange={handleSeasonChange}
              className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-[#222222] dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
            >
              {validSortedSeasonsMemo.map(year => (
                <option key={year} value={year}>
                  {formatSeasonDisplay(year)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

       {/* League Selector (only if multiple leagues exist AND league is NOT forced) */}
       {!forcedLeagueDetails && teamLeagues.length > 1 && (
         <div className="mb-4">
           <label htmlFor="league-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Velg liga:</label>
           <select
             id="league-select"
             value={selectedLeagueId ?? ''}
             onChange={handleLeagueChange}
             className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-[#222222] dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
           >
             {teamLeagues.map((leagueItem) => (
               <option key={leagueItem.league.id} value={leagueItem.league.id}>
                 {leagueItem.league.name}
               </option>
             ))}
           </select>
         </div>
       )}


      {/* Loading Indicator */}
      {loading && <div className="text-center py-6 dark:text-gray-300">Laster tabell...</div>}

      {/* Standings Display Area */}
      {!loading && error && <div className="text-center py-6 text-red-500">Kunne ikke laste tabell: {error}</div>}

      {!loading && !error && !currentLeague && teamLeagues.length > 0 && (
         <div className="text-center py-6 text-gray-500 dark:text-gray-400">Velg en liga for å se tabellen.</div>
      )}

      {!loading && !error && teamLeagues.length === 0 && (
         <div className="text-center py-6 text-gray-500">Ingen ligaer funnet for sesongen {formatSeasonDisplay(selectedSeason)}.</div>
      )}

      {!loading && !error && currentLeague && standingsGroups.length === 0 && (
         <div className="text-center py-6 text-gray-500 dark:text-gray-400">Ingen tabelldata tilgjengelig for {teamName} i {currentLeague.league.name} for sesongen {formatSeasonDisplay(selectedSeason)}.</div>
      )}

      {/* Render Standings Table(s) */}
      {!loading && !error && currentLeague && standingsGroups.length > 0 && (
        <div>
          {/* Loop through each group in standingsGroups */}
          {standingsGroups.map((standingGroup: any[], groupIndex: number) => {
             // Validate that standingGroup is actually an array
             if (!Array.isArray(standingGroup)) {
               console.warn(`Standing group at index ${groupIndex} is not an array:`, standingGroup);
               return <div key={`invalid-group-${groupIndex}`} className="text-red-500 text-sm my-2">Ugyldig tabelldata mottatt (gruppe {groupIndex + 1}).</div>;
             }
             // Check if the group is empty
             if (standingGroup.length === 0) {
                return null; // Don't render anything for an empty group
             }

            // Find the index of the current team within this specific group
            const currentTeamIndex = standingGroup.findIndex(
              (standing: any) => standing?.team?.id === teamId
            );
            const currentTeamStanding = currentTeamIndex !== -1 ? standingGroup[currentTeamIndex] : null;

            return (
              <div key={groupIndex} className="mb-6 last:mb-0">
                {/* Display League Header only once if needed, or group title if available */}
                {groupIndex === 0 && ( // Example: Show header only for the first group
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center">
                       <div className="relative h-8 w-8 mr-3">
                         <Image
                           src={currentLeague.league.logo ? 
                             currentLeague.league.logo.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') : 
                             '/images/league-placeholder.png'
                           }
                           alt={currentLeague.league.name || 'Ukjent Liga'}
                           fill
                           className="object-contain"
                           onError={(e) => { console.warn(`Error loading image for league ${currentLeague.league.id}: ${currentLeague.league.logo}`); }}
                         />
                       </div>
                       <h3 className="text-lg font-medium dark:text-white">{currentLeague.league.name || 'Ukjent Liga'}</h3>
                     </div>
                     {/* Form Toggle */}
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
                )}

                {/* Group Title if available and not the first group */}
                {standingGroup[0]?.group && (
                  <h4 className="text-md font-medium mb-2 dark:text-gray-300">
                    {standingGroup[0].group}
                  </h4>
                )}

                {/* Table for the current group */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-[#2c2c2c]">
                    {/* Table Head */}
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
                    {/* Table Body */}
                    <tbody className="bg-white dark:bg-[#222222] divide-y divide-gray-200 dark:divide-[#2c2c2c]">
                      {standingGroup.map((standing: any) => {
                        // Safeguard against missing/incomplete standing data
                        if (!standing || !standing.team || !standing.team.id) {
                          console.warn("Skipping rendering row due to missing standing/team data:", standing);
                          return null; // Skip this row
                        }
                        
                        const isCurrentTeam = standing.team.id === teamId;
                        const isHighlightedTeam = highlightTeams?.includes(standing.team.id);
                        const formTranslated = translateForm(standing.form);

                        // Determine rank background based on description
                        let rankClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
                        if (standing.description) {
                            if (standing.description.includes('Champions League')) rankClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
                            else if (standing.description.includes('Europa League')) rankClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
                            else if (standing.description.includes('Conference League')) rankClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
                            else if (standing.description.includes('Relegation Play-off')) rankClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
                            else if (standing.description.includes('Relegation')) rankClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
                        }

                        return (
                          <tr key={standing.team.id} 
                              className={`hover:bg-gray-50 dark:hover:bg-[#222222] ${
                                isCurrentTeam ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold' : 
                                isHighlightedTeam ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''
                              }`}
                          >
                            {/* Rank */}
                            <td className="px-2 py-2 whitespace-nowrap text-center">
                               <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${rankClass}`}>
                                 {standing.rank ?? '-'}
                               </span>
                            </td>
                            {/* Team */}
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
                                    onError={(e) => { console.warn(`Error loading image for team ${standing.team.id}: ${standing.team.logo}`); }}
                                  />
                                </div>
                                <span className={`text-sm group-hover:underline ${isCurrentTeam ? 'font-bold' : ''} dark:text-[#AAAAAA]`}>
                                  {standing.team.name || 'Ukjent Lag'}
                                </span>
                              </Link>
                            </td>
                            {/* Stats Columns */}
                            {!showForm && (
                              <>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.played ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.win ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.draw ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{standing.all?.lose ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{`${standing.all?.goals?.for ?? '-'}:${standing.all?.goals?.against ?? '-'}`}</td>
                              </>
                            )}
                            {/* Points */}
                            <td className="px-2 py-2 whitespace-nowrap text-sm text-center font-semibold dark:text-white">{standing.points ?? '-'}</td>
                            {/* Form Columns */}
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
                                        title={result} // Tooltip for V/U/T
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

                {/* --- REFINED: Summary Paragraph --- */}
                {currentTeamStanding && currentLeague && (
                  <div className="mt-4 px-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {(() => {
                      // Safeguard against missing data
                      if (!currentTeamStanding || !currentTeamStanding.team || !currentTeamStanding.rank) {
                        return null;
                      }

                      // Extract team data
                      const teamName = currentTeamStanding.team.name || 'Laget';
                      const leagueName = currentLeague.league.name || 'ligaen';
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
                      
                      // Calculate position description
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

                      // Calculate form description
                      const form = currentTeamStanding.form || '';
                      const lastFiveResults = form.slice(-5).split('').map(char => {
                        if (char === 'W') return 'seier';
                        if (char === 'D') return 'uavgjort';
                        if (char === 'L') return 'tap';
                        return '';
                      }).filter(Boolean);
                      
                      const formDesc = lastFiveResults.length > 0 
                        ? `De siste ${lastFiveResults.length} kampene har resultert i ${lastFiveResults.join(', ')}.`
                        : '';

                      // Special descriptions based on position
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
                        }
                      }

                      // Construct the paragraph
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
                {/* --- END: Summary Paragraph --- */}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 