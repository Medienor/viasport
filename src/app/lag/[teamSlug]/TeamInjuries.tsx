"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPlayerSlug } from '@/lib/api';

interface TeamInjuriesProps {
  teamId: number;
  injuries: any[]; // Accept injuries as a prop instead of fetching
}

// Norwegian translations for injury types
const injuryTypeTranslations: Record<string, string> = {
  'Missing Fixture': 'Ute av kamptroppen',
  'Questionable': 'Tvilsom',
  'Injured': 'Skadet',
  'Suspended': 'Suspendert',
  'Unknown': 'Ukjent'
};

export default function TeamInjuries({ teamId, injuries }: TeamInjuriesProps) {
  const [currentSeasonInjuries, setCurrentSeasonInjuries] = useState<any[]>([]);
  const [previousSeasonInjuries, setPreviousSeasonInjuries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  // For the API, we need to use the previous year for the current season
  const apiSeasonYear = currentYear - 1;

  // Debug: Log the injuries prop
  useEffect(() => {
    console.log("TeamInjuries component received injuries:", injuries);
    console.log("TeamInjuries component received teamId:", teamId);
    
    // Debug: Make a direct API call to check the endpoint
    const debugApiCall = async () => {
      try {
        console.log(`Making debug API call for team ${teamId} and season ${apiSeasonYear}`);
        const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/injuries?season=${apiSeasonYear}&team=${teamId}`, {
          headers: {
            'x-rapidapi-key': '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
          }
        });
        
        if (!response.ok) {
          console.error(`Debug API call failed with status: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        console.log("Debug API response:", data);
        console.log("Number of injuries from API:", data.response?.length || 0);
        
        // If we got injuries from the API but not from props, use them directly
        if ((!injuries || injuries.length === 0) && data.response && data.response.length > 0) {
          console.log("Using injuries from direct API call");
          processInjuriesData(data.response);
        }
      } catch (err) {
        console.error("Error in debug API call:", err);
      }
    };
    
    debugApiCall();
  }, [teamId, apiSeasonYear, injuries]);

  // New function to process injuries data
  const processInjuriesData = (injuriesData: any[]) => {
    try {
      console.log("Processing injuries data:", injuriesData?.length || 0, "injuries found");
      
      if (!injuriesData || injuriesData.length === 0) {
        console.log("No injuries data to process");
        setCurrentSeasonInjuries([]);
        setPreviousSeasonInjuries([]);
        return;
      }
      
      const now = new Date();
      
      // Split injuries by season
      const currentYearInjuries = injuriesData.filter(injury => {
        if (!injury.league?.season) return false;
        return injury.league.season === apiSeasonYear;
      });
      
      const previousYearInjuries = injuriesData.filter(injury => {
        if (!injury.league?.season) return false;
        return injury.league.season === apiSeasonYear - 1;
      });
      
      console.log(`Found ${currentYearInjuries.length} current season injuries and ${previousYearInjuries.length} previous season injuries`);
      
      // Process current season injuries
      const currentFiltered = processInjuries(currentYearInjuries, now);
      console.log(`After processing: ${currentFiltered.length} current season injuries`);
      setCurrentSeasonInjuries(currentFiltered);
      
      // Process previous season injuries
      const previousFiltered = processInjuries(previousYearInjuries, now);
      console.log(`After processing: ${previousFiltered.length} previous season injuries`);
      setPreviousSeasonInjuries(previousFiltered);
      
      setError(null);
    } catch (err) {
      console.error('Error processing injuries:', err);
      setError('Kunne ikke behandle skadede spillere. Prøv igjen senere.');
    }
  };

  useEffect(() => {
    // Process the injuries data that was passed as a prop
    processInjuriesData(injuries);
  }, [injuries]);

  // Helper function to process and filter injuries
  function processInjuries(data: any[], now: Date) {
    if (!data || data.length === 0) {
      console.log("No injuries data to process in processInjuries");
      return [];
    }
    
    console.log("Processing injuries data in processInjuries:", data);
    
    // Filter for future fixtures
    const futureInjuries = data.filter((injury: any) => {
      if (!injury.fixture || !injury.fixture.date) {
        console.log("Injury missing fixture or date:", injury);
        return false;
      }
      
      try {
        const fixtureDate = new Date(injury.fixture.date);
        const isFuture = fixtureDate > now;
        if (!isFuture) {
          console.log("Fixture date is in the past:", injury.fixture.date);
        }
        return isFuture;
      } catch (e) {
        console.error("Error parsing fixture date:", injury.fixture.date, e);
        return false;
      }
    });
    
    console.log(`After future filter: ${futureInjuries.length} injuries`);
    
    // Remove duplicates (keep most recent for each player)
    const playerMap = new Map();
    
    futureInjuries.forEach((injury: any) => {
      const playerId = injury.player?.id;
      if (!playerId) {
        console.log("Injury missing player ID:", injury);
        return;
      }
      
      // If player not in map or this fixture is more recent, update
      if (!playerMap.has(playerId) || 
          new Date(injury.fixture.date) < new Date(playerMap.get(playerId).fixture.date)) {
        playerMap.set(playerId, injury);
      }
    });
    
    const result = Array.from(playerMap.values());
    console.log(`After deduplication: ${result.length} injuries`);
    return result;
  }

  // Function to group injuries by reason type
  const groupInjuriesByType = (injuries: any[]) => {
    const groups: Record<string, any[]> = {
      'Suspended': [],
      'Injured': [],
      'Other': []
    };
    
    injuries.forEach(injury => {
      const reason = injury.player?.reason?.toLowerCase() || '';
      
      if (reason.includes('suspend') || injury.player?.type === 'Suspended') {
        groups['Suspended'].push(injury);
      } else if (reason.includes('injury') || reason.includes('injured') || injury.player?.type === 'Injured') {
        groups['Injured'].push(injury);
      } else {
        groups['Other'].push(injury);
      }
    });
    
    return groups;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Feil!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const hasCurrentInjuries = currentSeasonInjuries.length > 0;
  const hasPreviousInjuries = previousSeasonInjuries.length > 0;
  
  if (!hasCurrentInjuries && !hasPreviousInjuries) {
    return (
      <div className="text-center py-10">
        <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen utilgjengelige spillere</h3>
        <p className="mt-1 text-sm text-gray-500">Det er ingen registrerte skader eller suspensjoner for dette laget.</p>
      </div>
    );
  }

  // Group injuries by type
  const currentGroups = groupInjuriesByType(currentSeasonInjuries);
  const previousGroups = groupInjuriesByType(previousSeasonInjuries);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Utilgjengelige spillere</h2>
      
      {/* Current Season Injuries */}
      {hasCurrentInjuries && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">
            {apiSeasonYear}/{apiSeasonYear + 1} Sesong
          </h3>
          
          {/* Suspended Players */}
          {currentGroups['Suspended'].length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-purple-800">Suspendert</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentGroups['Suspended'].map((injury, index) => (
                  <InjuryCard key={`current-suspended-${index}`} injury={injury} />
                ))}
              </div>
            </div>
          )}
          
          {/* Injured Players */}
          {currentGroups['Injured'].length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-red-800">Skadet</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentGroups['Injured'].map((injury, index) => (
                  <InjuryCard key={`current-injured-${index}`} injury={injury} />
                ))}
              </div>
            </div>
          )}
          
          {/* Other Unavailable Players */}
          {currentGroups['Other'].length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-gray-800">Andre</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentGroups['Other'].map((injury, index) => (
                  <InjuryCard key={`current-other-${index}`} injury={injury} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Previous Season Injuries */}
      {hasPreviousInjuries && (
        <div className="space-y-6 mt-8">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">
            {apiSeasonYear - 1}/{apiSeasonYear} Sesong
          </h3>
          
          {/* Suspended Players */}
          {previousGroups['Suspended'].length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-purple-800">Suspendert</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {previousGroups['Suspended'].map((injury, index) => (
                  <InjuryCard key={`previous-suspended-${index}`} injury={injury} />
                ))}
              </div>
            </div>
          )}
          
          {/* Injured Players */}
          {previousGroups['Injured'].length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-red-800">Skadet</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {previousGroups['Injured'].map((injury, index) => (
                  <InjuryCard key={`previous-injured-${index}`} injury={injury} />
                ))}
              </div>
            </div>
          )}
          
          {/* Other Unavailable Players */}
          {previousGroups['Other'].length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-gray-800">Andre</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {previousGroups['Other'].map((injury, index) => (
                  <InjuryCard key={`previous-other-${index}`} injury={injury} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Injury Card Component
function InjuryCard({ injury }: { injury: any }) {
  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'short'
    });
  };
  
  // Create player slug for the link
  const getPlayerLink = () => {
    if (!injury.player?.id) return null;
    
    const playerId = injury.player.id;
    const playerName = injury.player.name || 'player';
    const playerSlug = createPlayerSlug(playerName, playerId);
    
    return `/spillerprofil/${playerSlug}`;
  };
  
  const playerLink = getPlayerLink();
  
  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 flex items-center">
        {playerLink ? (
          <Link href={playerLink} className="flex-shrink-0 mr-3">
            {injury.player?.photo ? (
              <Image
                src={injury.player.photo}
                alt={injury.player.name || 'Player'}
                width={48}
                height={48}
                className="rounded-full object-cover hover:opacity-90 transition-opacity"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=?';
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                <span>?</span>
              </div>
            )}
          </Link>
        ) : (
          <div className="flex-shrink-0 mr-3">
            {injury.player?.photo ? (
              <Image
                src={injury.player.photo}
                alt={injury.player.name || 'Player'}
                width={48}
                height={48}
                className="rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=?';
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                <span>?</span>
              </div>
            )}
          </div>
        )}
        
        <div className="min-w-0 flex-1">
          {playerLink ? (
            <Link href={playerLink} className="block">
              <h4 className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">
                {injury.player?.name || 'Ukjent spiller'}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {injury.player?.reason || 'Ukjent årsak'}
              </p>
            </Link>
          ) : (
            <>
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {injury.player?.name || 'Ukjent spiller'}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {injury.player?.reason || 'Ukjent årsak'}
              </p>
            </>
          )}
        </div>
        
        <div className="ml-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            injury.player?.type === 'Missing Fixture' ? 'bg-red-100 text-red-800' : 
            injury.player?.type === 'Questionable' ? 'bg-yellow-100 text-yellow-800' : 
            injury.player?.type === 'Suspended' ? 'bg-purple-100 text-purple-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {injuryTypeTranslations[injury.player?.type || 'Unknown']}
          </span>
        </div>
      </div>
      
      {injury.fixture && (
        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 text-xs flex justify-between items-center">
          <span className="text-gray-600">
            {injury.fixture.league?.name || 'Ukjent liga'}
          </span>
          {injury.fixture.date && (
            <span className="text-gray-500">
              {formatDate(injury.fixture.date)}
            </span>
          )}
        </div>
      )}
    </div>
  );
} 