"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TeamStandingsProps {
  teamId: number;
  teamName: string;
  seasons: number[]; // All available season years, e.g., [2025, 2024]
  hideSeasonSelector?: boolean;
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
const formatSeasonDisplay = (season: number) => {
  return `${season}/${season + 1}`;
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
  hideSeasonSelector = false
}: TeamStandingsProps) {

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null); // Start as null
  const [isInitialSeasonDetermined, setIsInitialSeasonDetermined] = useState(false); // Flag

  const [standingsData, setStandingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Loading includes initial season check
  const [error, setError] = useState<string | null>(null);
  const [teamLeagues, setTeamLeagues] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // --- Memoize validSortedSeasons ---
  const validSortedSeasons = useMemo(() => {
    console.log("[Memo] Recalculating validSortedSeasons"); // Log when this recalculates
    return Array.isArray(seasons) ? [...seasons].sort((a, b) => b - a) : [];
  }, [seasons]); // Only recalculate if the 'seasons' prop changes

  // --- Effect 1: Determine the correct initial season ---
  useEffect(() => {
    // Prevent running if already determined or no seasons available
    if (isInitialSeasonDetermined || validSortedSeasons.length === 0) {
       if (validSortedSeasons.length === 0 && !isInitialSeasonDetermined) {
           console.warn("[Effect 1] No seasons provided. Setting fallback.");
           setSelectedSeason(new Date().getFullYear());
           setIsInitialSeasonDetermined(true);
           setLoading(false); // Stop loading if no seasons
       }
       return;
    }

    let isMounted = true; // Flag to prevent state updates on unmounted component
    const determineInitialSeason = async () => {
      console.log("[Effect 1] Running: Determine Initial Season");
      setLoading(true);
      setError(null); // Clear previous errors
      const latestYear = validSortedSeasons[0];

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
          const previousYear = validSortedSeasons.find(year => year === latestYear - 1);
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
          setSelectedSeason(validSortedSeasons[0]); // Set to latest as a fallback
          setIsInitialSeasonDetermined(true); // Mark determined even on error to prevent loop
          setLoading(false); // Stop loading on error
        }
      }
    };

    determineInitialSeason();

    return () => {
      isMounted = false; // Cleanup function to set flag on unmount
      console.log("[Effect 1] Cleanup");
    };
  // Dependencies: Only run when these change. validSortedSeasons is now memoized.
  }, [isInitialSeasonDetermined, validSortedSeasons, teamId]);


  // --- Effect 2: Fetch Leagues for the selected season ---
  const fetchTeamLeaguesCallback = useCallback(async () => {
    // Only run if initial season is set and selectedSeason is not null
    if (!isInitialSeasonDetermined || selectedSeason === null) {
        console.log("[Effect 2] Skipping: Initial season not determined or selectedSeason is null.");
        return;
    }

    let isMounted = true;
    console.log(`[Effect 2] Running: Fetching leagues for season ${selectedSeason}`);
    setLoading(true); // Indicate loading leagues/standings
    setError(null);
    setStandingsData([]); // Clear old standings
    setTeamLeagues([]); // Clear old leagues
    setSelectedLeagueId(null); // Reset selected league

    try {
      const response = await fetch(`/api/leagues?team=${teamId}&season=${selectedSeason}`);
       if (!isMounted) return;

      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
      const data = await response.json();
      console.log(`[Effect 2] Leagues API response for season ${selectedSeason}:`, data);

      if (data.response && data.response.length > 0) {
        const leaguesWithStandings = data.response.filter((l: any) =>
            l.league?.type === 'League' && l.seasons?.some((s: any) => s.year === selectedSeason && s.coverage?.standings === true)
        );

        if (isMounted) {
            if (leaguesWithStandings.length > 0) {
                console.log(`[Effect 2] Found ${leaguesWithStandings.length} leagues with standings for season ${selectedSeason}.`);
                setTeamLeagues(leaguesWithStandings);
                // Automatically select the first league found
                setSelectedLeagueId(leaguesWithStandings[0].league.id);
                console.log(`[Effect 2] Auto-selecting league ID: ${leaguesWithStandings[0].league.id}`);
            } else {
                console.warn(`[Effect 2] No leagues of type 'League' with standings found for season ${selectedSeason}.`);
                setTeamLeagues([]);
                setSelectedLeagueId(null);
                setLoading(false); // Stop loading if no leagues found
            }
        }
      } else {
         if (isMounted) {
            console.warn(`[Effect 2] No leagues found at all for season ${selectedSeason}.`);
            setTeamLeagues([]);
            setSelectedLeagueId(null);
            setLoading(false); // Stop loading if no leagues found
         }
      }
    } catch (err: any) {
      console.error(`[Effect 2] Error fetching leagues for season ${selectedSeason}:`, err);
       if (isMounted) {
          setError(`Feil ved henting av ligadata: ${err.message}`);
          setLoading(false); // Stop loading on error
       }
    }
    // Note: setLoading(false) is handled by Effect 3 or if no leagues are found here.

    return () => {
        isMounted = false;
        console.log("[Effect 2] Cleanup");
    };
  // Dependencies: Run when selectedSeason changes *after* initial determination
  }, [selectedSeason, teamId, isInitialSeasonDetermined]);

  useEffect(() => {
      fetchTeamLeaguesCallback();
  }, [fetchTeamLeaguesCallback]); // Effect wrapper for the callback


  // --- Effect 3: Fetch Standings for the selected league and season ---
  const fetchLeagueStandingsCallback = useCallback(async () => {
    // Only run if a league and season are selected
    if (selectedLeagueId === null || selectedSeason === null) {
        console.log("[Effect 3] Skipping: No league or season selected.");
        // Ensure loading is false if we skipped fetching leagues previously
        if (teamLeagues.length === 0 && isInitialSeasonDetermined) {
            setLoading(false);
        }
        return;
    }

    let isMounted = true;
    console.log(`[Effect 3] Running: Fetching standings for league ${selectedLeagueId}, season ${selectedSeason}`);
    setLoading(true); // Ensure loading is true while fetching standings
    setError(null); // Clear previous errors specifically for standings fetch

    try {
      const response = await fetch(`/api/standings?league=${selectedLeagueId}&season=${selectedSeason}`);
      if (!isMounted) return;

      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
      const data = await response.json();
      console.log(`[Effect 3] Standings API response for league ${selectedLeagueId}, season ${selectedSeason}:`, data);

      if (data.response && data.response.length > 0 && data.response[0].league?.standings) {
         if (isMounted) {
            // The standings seem to be nested: response[0].league.standings which is an array of arrays (groups)
            const allStandings = data.response[0].league.standings; // This is likely Array<Array<Standing>>
            console.log(`[Effect 3] Received standings data (potentially grouped):`, allStandings);
            setStandingsData(allStandings); // Keep the grouped structure
         }
      } else {
         if (isMounted) {
            console.warn(`[Effect 3] No standings data found in response for league ${selectedLeagueId}, season ${selectedSeason}.`);
            setStandingsData([]); // Clear standings if none found
         }
      }
    } catch (err: any) {
      console.error(`[Effect 3] Error fetching standings:`, err);
       if (isMounted) {
          setError(`Feil ved henting av tabelldata: ${err.message}`);
          setStandingsData([]); // Clear standings on error
       }
    } finally {
       if (isMounted) {
          setLoading(false); // Stop loading *after* standings fetch attempt (success or fail)
          console.log("[Effect 3] Fetch complete, setLoading(false)");
       }
    }

     return () => {
        isMounted = false;
        console.log("[Effect 3] Cleanup");
    };
  // Dependencies: Run when selected league or season changes
  }, [selectedLeagueId, selectedSeason]);

  useEffect(() => {
      fetchLeagueStandingsCallback();
  }, [fetchLeagueStandingsCallback]); // Effect wrapper for the callback


  // Handler for season change
  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeason = parseInt(event.target.value, 10);
    console.log(`Season changed to: ${newSeason}`);
    setSelectedSeason(newSeason);
    // Reset dependent states immediately for better UX
    setSelectedLeagueId(null);
    setTeamLeagues([]);
    setStandingsData([]);
    setLoading(true); // Set loading true, Effect 2 will take over
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
    return <div className="text-center py-10">Laster inn sesongdata...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Feil: {error}</div>;
  }

  if (!selectedSeason) {
     return <div className="text-center py-10 text-gray-500">Ingen sesong valgt.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Tabell</h2>
        {/* Season Selector */}
        {!hideSeasonSelector && validSortedSeasons.length > 0 && (
          <div className="flex items-center gap-2">
             <label htmlFor="season-select" className="text-sm font-medium text-gray-700">Sesong:</label>
             <select
               id="season-select"
               value={selectedSeason}
               onChange={handleSeasonChange}
               className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
             >
               {validSortedSeasons.map(year => (
                 <option key={year} value={year}>
                   {formatSeasonDisplay(year)}
                 </option>
               ))}
             </select>
          </div>
        )}
      </div>

       {/* League Selector (only if multiple leagues exist for the selected season) */}
       {teamLeagues.length > 1 && (
         <div className="mb-4">
           <label htmlFor="league-select" className="block text-sm font-medium text-gray-700 mb-1">Velg liga:</label>
           <select
             id="league-select"
             value={selectedLeagueId ?? ''}
             onChange={handleLeagueChange}
             className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
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
      {loading && <div className="text-center py-6">Laster tabell...</div>}

      {/* Standings Display Area */}
      {!loading && error && <div className="text-center py-6 text-red-500">Kunne ikke laste tabell: {error}</div>}

      {!loading && !error && !currentLeague && teamLeagues.length > 0 && (
         <div className="text-center py-6 text-gray-500">Velg en liga for å se tabellen.</div>
      )}

      {!loading && !error && teamLeagues.length === 0 && (
         <div className="text-center py-6 text-gray-500">Ingen ligaer funnet for sesongen {formatSeasonDisplay(selectedSeason)}.</div>
      )}

      {!loading && !error && currentLeague && standingsGroups.length === 0 && (
         <div className="text-center py-6 text-gray-500">Ingen tabelldata tilgjengelig for {currentLeague.league.name} ({formatSeasonDisplay(selectedSeason)}).</div>
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
                           src={currentLeague.league.logo || '/images/league-placeholder.png'}
                           alt={currentLeague.league.name || 'Ukjent Liga'}
                           fill
                           className="object-contain"
                           onError={(e) => { console.warn(`Error loading image for league ${currentLeague.league.id}: ${currentLeague.league.logo}`); }}
                         />
                       </div>
                       <h3 className="text-lg font-medium">{currentLeague.league.name || 'Ukjent Liga'}</h3>
                     </div>
                     {/* Form Toggle */}
                     <div className="flex items-center">
                       <span className="mr-2 text-sm text-gray-600">Form</span>
                       <label className="relative inline-flex items-center cursor-pointer">
                         <input
                           type="checkbox"
                           className="sr-only peer"
                           checked={showForm}
                           onChange={(e) => setShowForm(e.target.checked)}
                         />
                         <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                       </label>
                     </div>
                   </div>
                )}

                {/* Table for the current group */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    {/* Table Head */}
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lag</th>
                        {!showForm && (
                          <>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">K</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">V</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">U</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">T</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mål</th>
                          </>
                        )}
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P</th>
                        {showForm && (
                          <>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">+/-</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Form</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    {/* Table Body */}
                    <tbody className="bg-white divide-y divide-gray-200">
                      {standingGroup.map((standing: any) => {
                        // Safeguard against missing/incomplete standing data
                        if (!standing || !standing.team || !standing.team.id) {
                          console.warn("Skipping rendering row due to missing standing/team data:", standing);
                          return null; // Skip this row
                        }
                        const isCurrentTeam = standing.team.id === teamId;
                        const formTranslated = translateForm(standing.form);

                        // Determine rank background based on description
                        let rankClass = '';
                        if (standing.description) {
                            if (standing.description.includes('Champions League')) rankClass = 'bg-green-100 text-green-800';
                            else if (standing.description.includes('Europa League')) rankClass = 'bg-blue-100 text-blue-800';
                            else if (standing.description.includes('Conference League')) rankClass = 'bg-orange-100 text-orange-800';
                            else if (standing.description.includes('Relegation Play-off')) rankClass = 'bg-yellow-100 text-yellow-800';
                            else if (standing.description.includes('Relegation')) rankClass = 'bg-red-100 text-red-800';
                        }


                        return (
                          <tr key={standing.team.id} className={`hover:bg-gray-50 ${isCurrentTeam ? 'bg-blue-50 font-semibold' : ''}`}>
                            {/* Rank */}
                            <td className="px-2 py-2 whitespace-nowrap text-center">
                               <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${rankClass}`}>
                                 {standing.rank ?? '-'}
                               </span>
                            </td>
                            {/* Team */}
                            <td className="px-2 py-2 whitespace-nowrap">
                              <Link href={`/lag/${createTeamSlug(standing.team.name || `team-${standing.team.id}`, standing.team.id)}`} className="flex items-center hover:text-blue-600 group">
                                <div className="flex-shrink-0 h-5 w-5 relative mr-2">
                                  <Image
                                    src={standing.team.logo || '/images/team-placeholder.png'}
                                    alt={standing.team.name || 'Ukjent Lag'}
                                    fill
                                    className="object-contain"
                                    onError={(e) => { console.warn(`Error loading image for team ${standing.team.id}: ${standing.team.logo}`); }}
                                  />
                                </div>
                                <span className={`text-sm group-hover:underline ${isCurrentTeam ? 'font-bold' : ''}`}>
                                  {standing.team.name || 'Ukjent Lag'}
                                </span>
                              </Link>
                            </td>
                            {/* Stats Columns */}
                            {!showForm && (
                              <>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{standing.all?.played ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{standing.all?.win ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{standing.all?.draw ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{standing.all?.lose ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{`${standing.all?.goals?.for ?? '-'}:${standing.all?.goals?.against ?? '-'}`}</td>
                              </>
                            )}
                            {/* Points */}
                            <td className="px-2 py-2 whitespace-nowrap text-sm text-center font-semibold">{standing.points ?? '-'}</td>
                            {/* Form Columns */}
                            {showForm && (
                              <>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{standing.goalsDiff ?? '-'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
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
                  <div className="mt-4 px-2 text-sm text-gray-700 leading-relaxed">
                    {(() => {
                      const teamAbove = currentTeamIndex > 0 ? standingGroup[currentTeamIndex - 1] : null;
                      const teamBelow = currentTeamIndex < standingGroup.length - 1 ? standingGroup[currentTeamIndex + 1] : null;

                      const currentRank = currentTeamStanding.rank ?? '?';
                      const currentPoints = currentTeamStanding.points ?? 0;
                      const currentTeamName = currentTeamStanding.team?.name || 'Dette laget';
                      const leagueName = currentLeague.league?.name || 'ligaen';

                      // Handle single-team table first
                      if (standingGroup.length === 1) {
                        return <p>{currentTeamName} er det eneste laget i denne tabellen.</p>;
                      }

                      // Determine base sentence about position
                      let baseSentence = '';
                      if (currentTeamIndex === 0) {
                        baseSentence = `${currentTeamName} leder ${leagueName}`;
                      } else if (currentTeamIndex === standingGroup.length - 1) {
                        baseSentence = `${currentTeamName} ligger sist på ${currentRank}. plass i ${leagueName}`;
                      } else {
                        baseSentence = `${currentTeamName} ligger på ${currentRank}. plass i ${leagueName}`;
                      }

                      let details: string[] = [];
                      let tiedWithAbove = false;
                      let tiedWithBelow = false;
                      let pointsDiffAbove = 0;
                      let pointsDiffBelow = 0;
                      let teamAboveName = '';
                      let teamBelowName = '';
                      let rankAbove = '';
                      let rankBelow = '';


                      // Analyze team above
                      if (teamAbove) {
                        pointsDiffAbove = (teamAbove.points ?? 0) - currentPoints;
                        teamAboveName = teamAbove.team?.name || 'laget over';
                        rankAbove = teamAbove.rank ?? '?';
                        if (pointsDiffAbove === 0) {
                          tiedWithAbove = true;
                        }
                      }

                      // Analyze team below
                      if (teamBelow) {
                        pointsDiffBelow = currentPoints - (teamBelow.points ?? 0);
                        teamBelowName = teamBelow.team?.name || 'laget under';
                        rankBelow = teamBelow.rank ?? '?';
                        if (pointsDiffBelow === 0) {
                          tiedWithBelow = true;
                        }
                      }

                      // Construct details based on analysis
                      if (tiedWithAbove && tiedWithBelow) {
                        // Tied with both above and below (e.g., 3 teams on same points)
                        details.push(`à poeng med ${teamAboveName} og ${teamBelowName}`);
                      } else {
                        // Handle above team info
                        if (teamAbove) {
                          if (tiedWithAbove) {
                            details.push(`à poeng med ${teamAboveName}`);
                          } else {
                             const pointText = pointsDiffAbove === 1 ? 'poeng' : 'poeng'; // Norwegian doesn't change much here, but good practice
                             details.push(`${pointsDiffAbove} ${pointText} bak ${teamAboveName} (${rankAbove}. plass)`);
                          }
                        }

                        // Handle below team info
                        if (teamBelow) {
                           if (tiedWithBelow) {
                             // Only add if not already covered by "tiedWithAbove" case
                             if (!tiedWithAbove) {
                               details.push(`à poeng med ${teamBelowName}`);
                             }
                           } else {
                             const pointText = pointsDiffBelow === 1 ? 'poeng' : 'poeng';
                             const leadText = pointsDiffBelow === 1 ? 'poengs forsprang' : 'poengs forsprang'; // Use "forsprang"
                             details.push(`${pointsDiffBelow} ${leadText} ned til ${teamBelowName} (${rankBelow}. plass)`);
                           }
                        }
                      }


                      // Combine base sentence and details
                      let finalText = baseSentence;
                      if (details.length > 0) {
                        finalText += `, ${details.join(', ')}`; // Join details with commas
                      }
                      finalText += '.'; // Add final period.

                      return <p>{finalText}</p>;

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