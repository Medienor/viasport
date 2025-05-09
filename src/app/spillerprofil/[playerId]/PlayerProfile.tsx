"use client"

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createTeamSlug } from '@/lib/api';

// Define types for better clarity (optional but recommended)
type Tab = 'overview' | 'transfers' | 'teams' | 'career';
interface StatItem {
  league?: { name?: string; season?: string | number; logo?: string };
  team?: { name?: string; logo?: string };
  games?: { appearances?: number };
  goals?: { total?: number; assists?: number };
  cards?: { yellow?: number; red?: number };
  // Add other potential stat properties here
}

interface PlayerProfileProps {
  playerData: any; // Consider defining a more specific type
  playerTeamsData?: any; // Consider defining a more specific type
}

export default function PlayerProfile({ playerData, playerTeamsData }: PlayerProfileProps) {
  // State for the main (left column) tabs
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // State for the statistics (right column) tabs (e.g., by team name)
  const [activeStatsTeam, setActiveStatsTeam] = useState<string | null>(null);

  // Extract player data and statistics
  const player = playerData.player;
  const statistics: StatItem[] = playerData.statistics || [];
  const transfers = playerData.transfers?.[0]?.transfers || [];
  const teamsHistory = playerTeamsData?.response || [];

  // Group statistics by team name for the right column tabs
  const statsByTeam = useMemo(() => {
    return statistics.reduce((acc, stat) => {
      const teamName = stat.team?.name || 'Ukjent Lag';
      if (!acc[teamName]) {
        acc[teamName] = [];
      }
      acc[teamName].push(stat);
      // Sort stats within each team by season descending
      acc[teamName].sort((a, b) => {
        const seasonA = parseInt(String(a.league?.season || '0'), 10);
        const seasonB = parseInt(String(b.league?.season || '0'), 10);
        return seasonB - seasonA;
      });
      return acc;
    }, {} as Record<string, StatItem[]>);
  }, [statistics]);

  const statTeamNames = useMemo(() => Object.keys(statsByTeam), [statsByTeam]);

  // Set the initial active stats team tab
  useEffect(() => {
    if (statTeamNames.length > 0 && !activeStatsTeam) {
      setActiveStatsTeam(statTeamNames[0]);
    }
  }, [statTeamNames, activeStatsTeam]);

  // Calculate career totals (example)
  const careerTotals = useMemo(() => {
    return statistics.reduce(
      (totals, stat) => {
        totals.appearances += stat.games?.appearances || 0;
        totals.goals += stat.goals?.total || 0;
        totals.assists += stat.goals?.assists || 0;
        totals.yellowCards += stat.cards?.yellow || 0;
        totals.redCards += stat.cards?.red || 0;
        return totals;
      },
      { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
    );
  }, [statistics]);

  // Check if we're using mock data (API disabled)
  const isApiDisabled = playerData?.player?.firstname === 'API' && playerData?.player?.lastname === 'Disabled';
  
  // Force dark background in dark mode
  useEffect(() => {
    // Check if we're in dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    if (isDarkMode) {
      // Apply dark background to body and html
      document.body.style.backgroundColor = '#121212';
      document.documentElement.style.backgroundColor = '#121212';
      
      // Also apply to any parent containers that might be causing issues
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.classList.add('dark-bg-force');
      }
      
      // Add a style tag to force dark background and style active tabs
      const style = document.createElement('style');
      style.textContent = `
        .dark-bg-force, 
        .dark body, 
        .dark main, 
        .dark [data-theme="dark"] body {
          background-color: #121212 !important;
        }
        
        /* Style for active tab in dark mode */
        .dark .active-tab {
          color: white !important;
          border-color: #ff6b00 !important;
        }

        /* Style for active STATS tab in dark mode */
         .dark .active-stats-tab {
          background-color: #ff6b00 !important; /* Orange background */
          color: white !important; /* White text */
        }
        .dark .inactive-stats-tab {
           background-color: #222222 !important; /* Changed to #222 for inactive */
           color: #d1d5db !important; /* Lighter gray text */
        }
        /* Add hover effect for inactive stats tab */
        .dark .inactive-stats-tab:hover {
           background-color: #333333 !important; /* Slightly lighter gray on hover */
        }

        /* Style for the small stat boxes in dark mode */
        .dark .bg-gray-50 {
          background-color: #222222 !important; /* Change stat box background to #222 */
        }

        /* Ensure text inside stat boxes remains visible */
        .dark .bg-gray-50 .text-gray-500 {
           color: #9ca3af !important; /* Adjust label color if needed */
        }
         .dark .bg-gray-50 .text-gray-900 {
           color: #ffffff !important; /* Ensure value text is white */
        }

        /* Style for the stats details card background in dark mode */
        .dark .stats-detail-card {
           background-color: #222222 !important;
        }

        /* Style for the transfer card background in dark mode */
        .dark .transfer-card {
           background-color: #222222 !important;
           border-color: #374151 !important; /* Slightly darker border */
        }

        /* Style for the transfer date header in dark mode */
        .dark .transfer-date-header {
           background-color: #374151 !important; /* Darker gray background */
           color: #e5e7eb !important; /* Light gray text */
           border-bottom-color: #4b5563 !important;
        }

        /* Ensure transfer team names are white */
         .dark .transfer-team-name {
            color: #ffffff !important;
         }
         /* Ensure transfer type text is visible */
         .dark .transfer-type {
            color: #d1d5db !important;
         }
         /* Ensure arrow is visible */
         .dark .transfer-arrow {
             color: #9ca3af !important;
         }
      `;
      document.head.appendChild(style);
    }
    
    // Cleanup function
    return () => {
      if (isDarkMode) {
        document.body.style.backgroundColor = '';
        document.documentElement.style.backgroundColor = '';
        
        // Remove the style tag
        const styleTag = document.querySelector('style');
        if (styleTag && styleTag.textContent.includes('dark-bg-force')) {
          styleTag.remove();
        }
      }
    };
  }, []);
  
  // Debug: Log the full player data to console
  useEffect(() => {
    console.log('Full player data:', JSON.stringify(playerData, null, 2));
    if (playerTeamsData) {
      console.log('Player teams data:', JSON.stringify(playerTeamsData, null, 2));
    }
  }, [playerData, playerTeamsData]);
  
  // Get current year
  const currentYear = new Date().getFullYear();
  
  // Helper function to check if a team is a national team
  function isNationalTeam(teamData: any): boolean {
    // Check if the team has a 'national' property
    if (teamData.team && teamData.team.national === true) {
      return true;
    }
    
    // Common indicators of national teams in the name
    const nationalTeamKeywords = [
      'national', 'u17', 'u18', 'u19', 'u20', 'u21', 'u23', 'olympic'
    ];
    
    // List of countries that are likely to be national teams
    const countries = [
      'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia', 'australia', 
      'austria', 'azerbaijan', 'bahrain', 'bangladesh', 'belarus', 'belgium', 'benin', 
      'bolivia', 'bosnia', 'brazil', 'bulgaria', 'burkina faso', 'cameroon', 'canada', 
      'chile', 'china', 'colombia', 'costa rica', 'croatia', 'cyprus', 'czech', 
      'denmark', 'ecuador', 'egypt', 'england', 'estonia', 'ethiopia', 'finland', 
      'france', 'georgia', 'germany', 'ghana', 'greece', 'guatemala', 'guinea', 
      'honduras', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'iraq', 
      'ireland', 'israel', 'italy', 'ivory coast', 'jamaica', 'japan', 'jordan', 
      'kazakhstan', 'kenya', 'korea', 'kosovo', 'kuwait', 'latvia', 'lebanon', 
      'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'macedonia', 'malaysia', 
      'mali', 'malta', 'mauritania', 'mexico', 'moldova', 'montenegro', 'morocco', 
      'netherlands', 'new zealand', 'nicaragua', 'nigeria', 'norway', 'oman', 
      'pakistan', 'palestine', 'panama', 'paraguay', 'peru', 'philippines', 'poland', 
      'portugal', 'qatar', 'romania', 'russia', 'saudi arabia', 'scotland', 'senegal', 
      'serbia', 'singapore', 'slovakia', 'slovenia', 'south africa', 'spain', 
      'sudan', 'sweden', 'switzerland', 'syria', 'tanzania', 'thailand', 'togo', 
      'tunisia', 'turkey', 'uganda', 'ukraine', 'united arab emirates', 'united states', 
      'uruguay', 'uzbekistan', 'venezuela', 'vietnam', 'wales', 'yemen', 'zambia', 
      'zimbabwe'
    ];
    
    const teamName = teamData.team?.name || '';
    const lowerName = teamName.toLowerCase();
    
    // Check if the team name contains any national team keywords
    if (nationalTeamKeywords.some(keyword => lowerName.includes(keyword))) {
      return true;
    }
    
    // Check if the team name is a country name
    if (countries.some(country => lowerName === country)) {
      return true;
    }
    
    return false;
  }
  
  // Find current teams (teams with the current year in their seasons)
  const currentTeams = teamsHistory.filter((teamData: any) => 
    teamData.seasons?.includes(currentYear)
  );
  
  // Separate current teams into national and club teams
  const currentNationalTeams = currentTeams.filter(isNationalTeam);
  const currentClubTeams = currentTeams.filter(team => !isNationalTeam(team));
  
  // If we don't have any current club teams from the teams API, try to find one from transfers
  let currentClubTeamFromTransfer = null;
  if (currentClubTeams.length === 0 && transfers && transfers.length > 0) {
    // Sort transfers by date (newest first)
    const sortedTransfers = [...transfers].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Get the most recent transfer
    const latestTransfer = sortedTransfers[0];
    
    // Check if this is recent enough to be considered "current"
    const transferDate = new Date(latestTransfer.date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (transferDate > oneYearAgo) {
      currentClubTeamFromTransfer = latestTransfer.teams?.in;
    }
  }
  
  // If we still don't have a current club team, check statistics
  let currentClubTeamFromStats = null;
  if (currentClubTeams.length === 0 && !currentClubTeamFromTransfer && statistics.length > 0) {
    // Find the most recent season
    const seasons = statistics.map(stat => stat.league?.season).filter(Boolean);
    const currentSeason = Math.max(...seasons);
    
    // Get stats from current season
    const currentSeasonStats = statistics.filter(stat => 
      stat.league?.season === currentSeason && !stat.team?.national
    );
    
    if (currentSeasonStats.length > 0) {
      currentClubTeamFromStats = currentSeasonStats[0].team;
    }
  }
  
  // Combine all sources of current teams
  const allCurrentTeams = [
    ...currentNationalTeams,
    ...currentClubTeams
  ];
  
  if (currentClubTeamFromTransfer && !allCurrentTeams.some(t => t.team?.id === currentClubTeamFromTransfer.id)) {
    allCurrentTeams.push({
      team: currentClubTeamFromTransfer,
      seasons: [currentYear]
    });
  }
  
  if (currentClubTeamFromStats && !allCurrentTeams.some(t => t.team?.id === currentClubTeamFromStats.id)) {
    allCurrentTeams.push({
      team: currentClubTeamFromStats,
      seasons: [currentYear]
    });
  }
  
  // Get the primary team to display in the header
  const getPrimaryTeam = () => {
    // Prefer club teams over national teams for the primary display
    if (currentClubTeams.length > 0) {
      return currentClubTeams[0].team;
    }
    
    if (currentClubTeamFromTransfer) {
      return currentClubTeamFromTransfer;
    }
    
    if (currentClubTeamFromStats) {
      return currentClubTeamFromStats;
    }
    
    if (currentNationalTeams.length > 0) {
      return currentNationalTeams[0].team;
    }
    
    // Fallback to the first team in statistics
    return statistics[0]?.team;
  };
  
  const primaryTeam = getPrimaryTeam();
  
  // Get current season statistics (all leagues)
  const currentSeasonStats = useMemo(() => {
    if (!statistics.length) return null;
    
    // Find the most recent season
    const seasons = statistics.map(stat => stat.league?.season).filter(Boolean);
    const currentSeason = Math.max(...seasons);
    
    // Get all stats from current season
    const currentSeasonAllStats = statistics.filter(stat => stat.league?.season === currentSeason);
    
    // Calculate totals across all leagues for current season
    return {
      games: {
        appearances: currentSeasonAllStats.reduce((sum, stat) => sum + (stat.games?.appearances || 0), 0)
      },
      goals: {
        total: currentSeasonAllStats.reduce((sum, stat) => sum + (stat.goals?.total || 0), 0),
        assists: currentSeasonAllStats.reduce((sum, stat) => sum + (stat.goals?.assists || 0), 0)
      },
      cards: {
        yellow: currentSeasonAllStats.reduce((sum, stat) => sum + (stat.cards?.yellow || 0), 0),
        red: currentSeasonAllStats.reduce((sum, stat) => sum + (stat.cards?.red || 0), 0)
      }
    };
  }, [statistics]);
  
  // Get player position from statistics if available
  const getPlayerPosition = () => {
    if (player.position) return player.position;
    
    // Look for position in statistics
    for (const stat of statistics) {
      if (stat.games?.position) {
        return stat.games.position;
      }
    }
    
    return 'Ukjent posisjon';
  };
  
  // Format date of birth
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ukjent';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Helper function to format rating
  const formatRating = (rating: string | null) => {
    if (!rating) return 'N/A';
    return parseFloat(rating).toFixed(1);
  };
  
  // If API is disabled, show a notification banner
  if (isApiDisabled) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-dark-bg">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                API-kall er midlertidig deaktivert for feilsøking. Spillerdata er ikke tilgjengelig.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-nav dark:border-0 shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                <Image
                  src="/images/player-placeholder.png"
                  alt="API Disabled"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Disabled</h1>
                <p className="text-gray-500 dark:text-gray-400">Spillerdata er midlertidig utilgjengelig</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-dark-bg">
      {/* Player Header */}
      <div className="bg-white dark:bg-dark-nav dark:border-0 shadow rounded-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 px-6 py-4">
          <div className="flex flex-col md:flex-row items-center md:items-start">
            {/* Player Photo */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 mb-4 md:mb-0 md:mr-6">
              {player.photo ? (
                <Image
                  src={player.photo}
                  alt={player.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 128px, 160px"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Player Info */}
            <div className="text-center md:text-left text-gray-800 dark:text-gray-200">
              <h1 className="text-2xl md:text-3xl font-bold dark:text-white">{player.name}</h1>
              
              {/* Current Teams */}
              <div className="mt-2 flex flex-col items-center md:items-start space-y-2">
                {allCurrentTeams.length > 0 ? (
                  allCurrentTeams.map((teamData: any, index: number) => (
                    <Link 
                      key={index}
                      href={`/lag/${createTeamSlug(teamData.team.name, teamData.team.id)}`}
                      className="flex items-center hover:underline dark:text-gray-300 dark:hover:text-white"
                    >
                      {teamData.team.logo && (
                        <Image
                          src={teamData.team.logo}
                          alt={teamData.team.name}
                          width={24}
                          height={24}
                          className="mr-2"
                        />
                      )}
                      <span>{teamData.team.name}</span>
                      {isNationalTeam(teamData) && (
                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                          Landslag
                        </span>
                      )}
                    </Link>
                  ))
                ) : primaryTeam ? (
                  <Link 
                    href={`/lag/${createTeamSlug(primaryTeam.name, primaryTeam.id)}`}
                    className="flex items-center hover:underline dark:text-gray-300 dark:hover:text-white"
                  >
                    {primaryTeam.logo && (
                      <Image
                        src={primaryTeam.logo}
                        alt={primaryTeam.name}
                        width={24}
                        height={24}
                        className="mr-2"
                      />
                    )}
                    <span>{primaryTeam.name}</span>
                  </Link>
                ) : null}
              </div>
              
              {/* Position */}
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                {getPlayerPosition()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-center">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Alder</div>
            <div className="font-medium dark:text-white">{player.age || 'Ukjent'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Nasjonalitet</div>
            <div className="font-medium dark:text-white">{player.nationality || 'Ukjent'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Høyde</div>
            <div className="font-medium dark:text-white">{player.height || 'Ukjent'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Vekt</div>
            <div className="font-medium dark:text-white">{player.weight || 'Ukjent'}</div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area (Two Columns) */}
      <div className="md:flex md:gap-6 lg:gap-8">

        {/* Left Column (Overview, Transfers, Teams, Career) */}
        <div className="md:w-2/3">
          <div className="bg-white dark:bg-dark-nav dark:border-0 shadow rounded-lg overflow-hidden">
            {/* Main Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-dark-border">
              <nav className="flex -mb-px overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600 dark:text-white dark:border-[#ff6b00] active-main-tab'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  Oversikt
                </button>
                <button
                  onClick={() => setActiveTab('transfers')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'transfers'
                      ? 'border-blue-500 text-blue-600 dark:text-white dark:border-[#ff6b00] active-main-tab'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  Overganger
                </button>
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'teams'
                      ? 'border-blue-500 text-blue-600 dark:text-white dark:border-[#ff6b00] active-main-tab'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  Lag
                </button>
                <button
                  onClick={() => setActiveTab('career')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'career'
                      ? 'border-blue-500 text-blue-600 dark:text-white dark:border-[#ff6b00] active-main-tab'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  Karriere
                </button>
              </nav>
            </div>

            {/* Left Column Content */}
            <div className="p-6 min-h-[400px]"> {/* Added min-height for consistency */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Personlig informasjon</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fullt navn</h3>
                        <p className="dark:text-white">{player.name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fødselsdato</h3>
                        <p className="dark:text-white">{formatDate(player.birth?.date)}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fødested</h3>
                        <p className="dark:text-white">{player.birth?.place || 'Ukjent'}, {player.birth?.country || 'Ukjent'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nasjonalitet</h3>
                        <p className="dark:text-white">{player.nationality}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Høyde</h3>
                        <p className="dark:text-white">{player.height || 'Ukjent'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Vekt</h3>
                        <p className="dark:text-white">{player.weight || 'Ukjent'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Current Season Stats */}
                  {currentSeasonStats && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4 dark:text-white">Nåværende sesong (alle konkurranser)</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Kamper</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentSeasonStats.games.appearances}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Mål</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentSeasonStats.goals.total}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Assists</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentSeasonStats.goals.assists}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Gule kort</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentSeasonStats.cards.yellow}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'transfers' && (
                 <div>
                   <h2 className="text-xl font-semibold mb-4 dark:text-white">Overganger</h2>
                   
                   {playerData.transfers && playerData.transfers.length > 0 ? (
                     <div className="space-y-6">
                       {playerData.transfers.flatMap((transferGroup: any) => 
                         transferGroup.transfers.map((transfer: any, index: number) => (
                           <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transfer-card">
                             {/* Date Header */}
                             <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 transfer-date-header">
                               <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                 {transfer.date ? new Date(transfer.date).toLocaleDateString('nb-NO', { year: 'numeric', month: 'long' }) : 'Ukjent dato'}
                               </p>
                             </div>
                             {/* Transfer Details */}
                             <div className="p-4 flex items-center justify-between gap-4">
                               {/* From Team (Left) */}
                               <div className="flex-1 text-center md:text-left">
                                 {transfer.teams?.out?.logo && (
                                   <Image
                                     src={transfer.teams.out.logo}
                                     alt={transfer.teams.out.name || 'Ukjent lag'}
                                     width={40}
                                     height={40}
                                     className="mx-auto md:mx-0 mb-1"
                                   />
                                 )}
                                 <p className="font-semibold text-sm text-gray-900 dark:text-white transfer-team-name">
                                   {transfer.teams?.out?.name || 'Ukjent lag'}
                                 </p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">Fra</p>
                               </div>

                               {/* Arrow */}
                               <div className="text-2xl text-gray-400 dark:text-gray-500 transfer-arrow">
                                 →
                               </div>

                               {/* To Team (Right) - Updated Classes and Structure */}
                               <div className="flex-1 flex flex-col items-center md:items-end"> {/* Use flex column and align items end */}
                                 {transfer.teams?.in?.logo && (
                                   <Image
                                     src={transfer.teams.in.logo}
                                     alt={transfer.teams.in.name || 'Ukjent lag'}
                                     width={40}
                                     height={40}
                                     className="mb-1" // Removed alignment classes here
                                   />
                                 )}
                                 <p className="font-semibold text-sm text-gray-900 dark:text-white transfer-team-name text-center md:text-right"> {/* Ensure text aligns right */}
                                   {transfer.teams?.in?.name || 'Ukjent lag'}
                                 </p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 text-center md:text-right">Til</p> {/* Ensure text aligns right */}
                               </div>
                             </div>
                             {/* Transfer Type */}
                             {transfer.type && (
                                <div className="px-4 pb-3 pt-1 text-center md:text-left">
                                   <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-full transfer-type">
                                      Type: {transfer.type}
                                   </span>
                                </div>
                             )}
                           </div>
                         ))
                       )}
                     </div>
                   ) : (
                     <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                       <p className="text-gray-500 dark:text-gray-400">Ingen overgangshistorikk tilgjengelig for denne spilleren</p>
                     </div>
                   )}
                 </div>
              )}
              {activeTab === 'teams' && (
                 <div>
                   <h2 className="text-xl font-semibold mb-4 dark:text-white">Lag</h2>
                   
                   {teamsHistory.length > 0 || currentClubTeamFromTransfer || currentClubTeamFromStats ? (
                     <div className="space-y-6">
                       {/* Current Teams Section */}
                       {allCurrentTeams.length > 0 && (
                         <div>
                           <h3 className="text-lg font-medium mb-3 dark:text-white">Nåværende lag</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                             {allCurrentTeams.map((teamData: any, index: number) => (
                               <Link 
                                 key={index} 
                                 href={`/lag/${createTeamSlug(teamData.team.name, teamData.team.id)}`}
                                 className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                               >
                                 <div className="p-4 flex items-center">
                                   <div className="relative w-16 h-16 flex-shrink-0">
                                     <Image
                                       src={teamData.team.logo}
                                       alt={teamData.team.name}
                                       fill
                                       className="object-contain"
                                     />
                                   </div>
                                   <div className="ml-4">
                                     <h4 className="font-medium dark:text-white">{teamData.team.name}</h4>
                                     <p className="text-sm text-gray-600 dark:text-gray-300">
                                       {teamData.seasons?.includes(currentYear) ? 
                                         `${currentYear} (Nåværende)` : 
                                         `${Math.min(...(teamData.seasons || [currentYear]))} - ${Math.max(...(teamData.seasons || [currentYear]))}`
                                       }
                                     </p>
                                     {isNationalTeam(teamData) && (
                                       <span className="inline-block mt-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                                         Landslag
                                       </span>
                                     )}
                                   </div>
                                 </div>
                               </Link>
                             ))}
                           </div>
                         </div>
                       )}
                       
                       {/* Previous Teams Section */}
                       {teamsHistory.filter((teamData: any) => !teamData.seasons?.includes(currentYear)).length > 0 && (
                         <div>
                           <h3 className="text-lg font-medium mb-3 dark:text-white">Tidligere lag</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                             {teamsHistory
                               .filter((teamData: any) => !teamData.seasons?.includes(currentYear))
                               .sort((a: any, b: any) => Math.max(...(b.seasons || [0])) - Math.max(...(a.seasons || [0])))
                               .map((teamData: any, index: number) => (
                                 <Link 
                                   key={index} 
                                   href={`/lag/${createTeamSlug(teamData.team.name, teamData.team.id)}`}
                                   className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                                 >
                                   <div className="p-4 flex items-center">
                                     <div className="relative w-16 h-16 flex-shrink-0">
                                       <Image
                                         src={teamData.team.logo}
                                         alt={teamData.team.name}
                                         fill
                                         className="object-contain"
                                       />
                                     </div>
                                     <div className="ml-4">
                                       <h4 className="font-medium dark:text-white">{teamData.team.name}</h4>
                                       <p className="text-sm text-gray-600 dark:text-gray-300">
                                         {teamData.seasons?.length > 1 ? 
                                           `${Math.min(...teamData.seasons)} - ${Math.max(...teamData.seasons)}` : 
                                           `${teamData.seasons?.[0]}`
                                         }
                                       </p>
                                       {isNationalTeam(teamData) && (
                                         <span className="inline-block mt-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                                           Landslag
                                         </span>
                                       )}
                                     </div>
                                   </div>
                                 </Link>
                               ))}
                           </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                       <p className="text-gray-500 dark:text-gray-400">Ingen laghistorikk tilgjengelig for denne spilleren.</p>
                     </div>
                   )}
                 </div>
              )}
              {activeTab === 'career' && (
                 <div>
                   <h2 className="text-xl font-semibold mb-4">Karriere</h2>
                   
                   {statistics.length > 0 ? (
                     <div className="space-y-6">
                       <div>
                         <h3 className="text-lg font-medium mb-3">Klubbkarriere</h3>
                         <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                               <tr>
                                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                   Sesong
                                 </th>
                                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                   Lag
                                 </th>
                                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                   Liga
                                 </th>
                                 <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                   Kamper
                                 </th>
                                 <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                   Mål
                                 </th>
                               </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                               {statistics
                                 .filter((stat: any) => stat.league?.type === 'League')
                                 .map((stat: any, index: number) => (
                                   <tr key={index}>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                       {stat.league?.season || 'Ukjent'}
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center">
                                         {stat.team?.logo && (
                                           <Image
                                             src={stat.team.logo}
                                             alt={stat.team.name}
                                             width={24}
                                             height={24}
                                             className="mr-2"
                                           />
                                         )}
                                         <span className="text-sm text-gray-900">{stat.team?.name || 'Ukjent'}</span>
                                       </div>
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center">
                                         {stat.league?.logo && (
                                           <Image
                                             src={stat.league.logo}
                                             alt={stat.league.name}
                                             width={24}
                                             height={24}
                                             className="mr-2"
                                           />
                                         )}
                                         <span className="text-sm text-gray-900">{stat.league?.name || 'Ukjent'}</span>
                                       </div>
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                       {stat.games?.appearances || 0}
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                       {stat.goals?.total || 0}
                                     </td>
                                   </tr>
                                 ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                       
                       {/* National Team Career */}
                       {statistics.some((stat: any) => stat.league?.type === 'Cup' && stat.team?.national) && (
                         <div>
                           <h3 className="text-lg font-medium mb-3">Landslagskarriere</h3>
                           <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-gray-200">
                               <thead className="bg-gray-50">
                                 <tr>
                                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Lag
                                   </th>
                                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Turnering
                                   </th>
                                   <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Kamper
                                   </th>
                                   <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Mål
                                   </th>
                                 </tr>
                               </thead>
                               <tbody className="bg-white divide-y divide-gray-200">
                                 {statistics
                                   .filter((stat: any) => stat.team?.national)
                                   .map((stat: any, index: number) => (
                                     <tr key={index}>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                         <div className="flex items-center">
                                           {stat.team?.logo && (
                                             <Image
                                               src={stat.team.logo}
                                               alt={stat.team.name}
                                               width={24}
                                               height={24}
                                               className="mr-2"
                                             />
                                           )}
                                           <span className="text-sm text-gray-900">{stat.team?.name || 'Ukjent'}</span>
                                         </div>
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                         <div className="flex items-center">
                                           {stat.league?.logo && (
                                             <Image
                                               src={stat.league.logo}
                                               alt={stat.league.name}
                                               width={24}
                                               height={24}
                                               className="mr-2"
                                             />
                                           )}
                                           <span className="text-sm text-gray-900">{stat.league?.name || 'Ukjent'}</span>
                                         </div>
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                         {stat.games?.appearances || 0}
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                         {stat.goals?.total || 0}
                                       </td>
                                     </tr>
                                   ))}
                               </tbody>
                             </table>
                           </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                       <p className="text-gray-500 dark:text-gray-400">Ingen karrieredata tilgjengelig for denne spilleren</p>
                     </div>
                   )}
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Statistics) */}
        <div className="md:w-1/3 mt-6 md:mt-0">
          <div className="bg-white dark:bg-dark-nav dark:border-0 shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-lg font-semibold dark:text-white">Statistikk etter Lag</h2>
            </div>

            {/* Career Totals Summary */}
            <div className="p-4 border-b border-gray-200 dark:border-dark-border">
               <h3 className="text-md font-medium mb-3 dark:text-gray-300">Karrieretotaler</h3>
               <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                     <div className="text-xs text-gray-500 dark:text-gray-400">Kamper</div>
                     <div className="text-lg font-bold text-gray-900 dark:text-white">{careerTotals.appearances}</div>
                  </div>
                   <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                     <div className="text-xs text-gray-500 dark:text-gray-400">Mål</div>
                     <div className="text-lg font-bold text-gray-900 dark:text-white">{careerTotals.goals}</div>
                  </div>
                   <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                     <div className="text-xs text-gray-500 dark:text-gray-400">Assists</div>
                     <div className="text-lg font-bold text-gray-900 dark:text-white">{careerTotals.assists}</div>
                  </div>
               </div>
            </div>

            {statistics.length > 0 ? (
              <>
                {/* Internal Stats Tabs (By Team) */}
                {statTeamNames.length > 1 && ( // Only show tabs if more than one team
                   <div className="border-b border-gray-200 dark:border-dark-border">
                     <nav className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800">
                       {statTeamNames.map(teamName => (
                         <button
                           key={teamName}
                           onClick={() => setActiveStatsTeam(teamName)}
                           className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-150 ${
                             activeStatsTeam === teamName
                               ? 'bg-blue-500 text-white active-stats-tab' // Light mode class, overridden by CSS
                               : 'bg-gray-200 text-gray-700 hover:bg-gray-300 inactive-stats-tab' // Light mode class, overridden by CSS
                           }`}
                         >
                           {teamName}
                         </button>
                       ))}
                     </nav>
                   </div>
                )}

                {/* Stats Details for Selected Team */}
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto hide-scrollbar"> {/* Added max-height and scroll */}
                  {activeStatsTeam && statsByTeam[activeStatsTeam] ? (
                    statsByTeam[activeStatsTeam].map((stat, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md shadow-sm stats-detail-card">
                         <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                               {stat.league?.logo && <Image src={stat.league.logo} alt="" width={20} height={20} />}
                               <span className="font-semibold text-sm dark:text-gray-200">{stat.league?.name || 'Ukjent Liga'}</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-full">{stat.league?.season || ''}</span>
                         </div>
                         <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div title="Kamper">📊 {stat.games?.appearances ?? 0}</div>
                            <div title="Mål">⚽ {stat.goals?.total ?? 0}</div>
                            <div title="Assists">🅰️ {stat.goals?.assists ?? 0}</div>
                            {/* Add more stats like cards if needed */}
                         </div>
                         {/* Potential place for bar graphs in the future */}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">Velg et lag for å se statistikk.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">Ingen detaljert statistikk tilgjengelig.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
} 