"use client"

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createTeamSlug } from '@/lib/api';

interface PlayerProfileProps {
  playerData: any;
  playerTeamsData?: any;
}

export default function PlayerProfile({ playerData, playerTeamsData }: PlayerProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'statistics' | 'transfers' | 'career' | 'teams'>('overview');
  
  // Debug: Log the full player data to console
  useEffect(() => {
    console.log('Full player data:', JSON.stringify(playerData, null, 2));
    if (playerTeamsData) {
      console.log('Player teams data:', JSON.stringify(playerTeamsData, null, 2));
    }
  }, [playerData, playerTeamsData]);
  
  const player = playerData.player;
  const statistics = playerData.statistics || [];
  const transfers = playerData.transfers?.[0]?.transfers || [];
  const teamsHistory = playerTeamsData?.response || [];
  
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
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Player Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4">
          <div className="flex flex-col md:flex-row items-center md:items-start">
            {/* Player Photo */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white bg-white flex-shrink-0 mb-4 md:mb-0 md:mr-6">
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
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Player Info */}
            <div className="text-center md:text-left text-gray-800">
              <h1 className="text-2xl md:text-3xl font-bold">{player.name}</h1>
              
              {/* Current Teams */}
              <div className="mt-2 flex flex-col items-center md:items-start space-y-2">
                {allCurrentTeams.length > 0 ? (
                  allCurrentTeams.map((teamData: any, index: number) => (
                    <Link 
                      key={index}
                      href={`/lag/${createTeamSlug(teamData.team.name, teamData.team.id)}`}
                      className="flex items-center hover:underline"
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
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Landslag
                        </span>
                      )}
                    </Link>
                  ))
                ) : primaryTeam ? (
                  <Link 
                    href={`/lag/${createTeamSlug(primaryTeam.name, primaryTeam.id)}`}
                    className="flex items-center hover:underline"
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
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {getPlayerPosition()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Alder</div>
            <div className="font-medium">{player.age || 'Ukjent'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Nasjonalitet</div>
            <div className="font-medium">{player.nationality || 'Ukjent'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Høyde</div>
            <div className="font-medium">{player.height || 'Ukjent'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Vekt</div>
            <div className="font-medium">{player.weight || 'Ukjent'}</div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Oversikt
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'statistics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistikk
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'transfers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overganger
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'teams'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Lag
            </button>
            <button
              onClick={() => setActiveTab('career')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'career'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Karriere
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Personlig informasjon</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Fullt navn</h3>
                    <p>{player.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Fødselsdato</h3>
                    <p>{formatDate(player.birth?.date)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Fødested</h3>
                    <p>{player.birth?.place || 'Ukjent'}, {player.birth?.country || 'Ukjent'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Nasjonalitet</h3>
                    <p>{player.nationality}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Høyde</h3>
                    <p>{player.height || 'Ukjent'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Vekt</h3>
                    <p>{player.weight || 'Ukjent'}</p>
                  </div>
                </div>
              </div>
              
              {/* Current Season Stats */}
              {currentSeasonStats && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Nåværende sesong (alle konkurranser)</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-gray-500">Kamper</div>
                      <div className="text-2xl font-bold text-blue-600">{currentSeasonStats.games.appearances}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-gray-500">Mål</div>
                      <div className="text-2xl font-bold text-blue-600">{currentSeasonStats.goals.total}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-gray-500">Assists</div>
                      <div className="text-2xl font-bold text-blue-600">{currentSeasonStats.goals.assists}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-gray-500">Gule kort</div>
                      <div className="text-2xl font-bold text-yellow-500">{currentSeasonStats.cards.yellow}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Statistikk</h2>
              
              {statistics.length > 0 ? (
                <div className="space-y-8">
                  {statistics.map((stat: any, index: number) => (
                    <div key={index} className="bg-white shadow rounded-lg overflow-hidden">
                      {/* Header with team and league info */}
                      <div className="bg-gray-50 px-6 py-4 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                          <div className="flex items-center mb-2 sm:mb-0">
                            {stat.team?.logo && (
                              <Image
                                src={stat.team.logo}
                                alt={stat.team.name}
                                width={32}
                                height={32}
                                className="mr-2"
                              />
                            )}
                            <span className="font-medium">{stat.team?.name || 'Ukjent lag'}</span>
                          </div>
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
                            <span className="text-sm text-gray-600">{stat.league?.name || 'Ukjent liga'} {stat.league?.season || ''}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Basic stats */}
                      <div className="p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-sm text-gray-500">Kamper</div>
                            <div className="text-2xl font-bold text-gray-800">{stat.games?.appearences || 0}</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-sm text-gray-500">Minutter</div>
                            <div className="text-2xl font-bold text-gray-800">{stat.games?.minutes || 0}</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-sm text-gray-500">Mål</div>
                            <div className="text-2xl font-bold text-gray-800">{stat.goals?.total || 0}</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-sm text-gray-500">Assists</div>
                            <div className="text-2xl font-bold text-gray-800">{stat.goals?.assists || 0}</div>
                          </div>
                        </div>
                        
                        {/* Rating */}
                        {stat.games?.rating && (
                          <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Gjennomsnittlig vurdering</h3>
                            <div className="relative pt-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xl font-bold text-gray-800">{formatRating(stat.games.rating)}</span>
                                  <span className="text-sm text-gray-500 ml-1">/10</span>
                                </div>
                              </div>
                              <div className="overflow-hidden h-2 mt-2 text-xs flex rounded bg-gray-200">
                                <div 
                                  style={{ width: `${(parseFloat(stat.games.rating) / 10) * 100}%` }} 
                                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Detailed stats in tabs */}
                        <div className="border-t pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Shooting stats */}
                            {(stat.shots?.total !== null || stat.penalty?.scored !== null) && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-3">Skudd & Mål</h3>
                                <ul className="space-y-2">
                                  {stat.shots?.total !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Skudd totalt</span>
                                      <span className="font-medium">{stat.shots.total}</span>
                                    </li>
                                  )}
                                  {stat.shots?.on !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Skudd på mål</span>
                                      <span className="font-medium">{stat.shots.on}</span>
                                    </li>
                                  )}
                                  {stat.penalty?.scored !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Straffespark scoret</span>
                                      <span className="font-medium">{stat.penalty.scored}</span>
                                    </li>
                                  )}
                                  {stat.penalty?.missed !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Straffespark bommet</span>
                                      <span className="font-medium">{stat.penalty.missed}</span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            {/* Passing stats */}
                            {stat.passes?.total !== null && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-3">Pasninger</h3>
                                <ul className="space-y-2">
                                  <li className="flex justify-between">
                                    <span className="text-gray-600">Pasninger totalt</span>
                                    <span className="font-medium">{stat.passes.total}</span>
                                  </li>
                                  {stat.passes?.key !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Nøkkelpassninger</span>
                                      <span className="font-medium">{stat.passes.key}</span>
                                    </li>
                                  )}
                                  {stat.passes?.accuracy !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Presisjon</span>
                                      <span className="font-medium">{stat.passes.accuracy}%</span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            {/* Defensive stats */}
                            {(stat.tackles?.total !== null || stat.tackles?.interceptions !== null) && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-3">Defensivt</h3>
                                <ul className="space-y-2">
                                  {stat.tackles?.total !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Taklinger</span>
                                      <span className="font-medium">{stat.tackles.total}</span>
                                    </li>
                                  )}
                                  {stat.tackles?.blocks !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Blokkeringer</span>
                                      <span className="font-medium">{stat.tackles.blocks}</span>
                                    </li>
                                  )}
                                  {stat.tackles?.interceptions !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Avskjæringer</span>
                                      <span className="font-medium">{stat.tackles.interceptions}</span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            {/* Dribbling stats */}
                            {stat.dribbles?.attempts !== null && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-3">Driblinger</h3>
                                <ul className="space-y-2">
                                  <li className="flex justify-between">
                                    <span className="text-gray-600">Forsøk</span>
                                    <span className="font-medium">{stat.dribbles.attempts}</span>
                                  </li>
                                  {stat.dribbles?.success !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Vellykkede</span>
                                      <span className="font-medium">{stat.dribbles.success}</span>
                                    </li>
                                  )}
                                  {stat.dribbles?.attempts !== null && stat.dribbles?.success !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Suksessrate</span>
                                      <span className="font-medium">
                                        {Math.round((stat.dribbles.success / stat.dribbles.attempts) * 100)}%
                                      </span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            {/* Disciplinary stats */}
                            {(stat.cards?.yellow !== null || stat.cards?.red !== null) && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-3">Disiplin</h3>
                                <ul className="space-y-2">
                                  {stat.cards?.yellow !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Gule kort</span>
                                      <span className="font-medium">{stat.cards.yellow}</span>
                                    </li>
                                  )}
                                  {stat.cards?.red !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Røde kort</span>
                                      <span className="font-medium">{stat.cards.red}</span>
                                    </li>
                                  )}
                                  {stat.fouls?.committed !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Frispark begått</span>
                                      <span className="font-medium">{stat.fouls.committed}</span>
                                    </li>
                                  )}
                                  {stat.fouls?.drawn !== null && (
                                    <li className="flex justify-between">
                                      <span className="text-gray-600">Frispark mottatt</span>
                                      <span className="font-medium">{stat.fouls.drawn}</span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Ingen statistikk tilgjengelig for denne spilleren</p>
                </div>
              )}
            </div>
          )}
          
          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Overganger</h2>
              
              {playerData.transfers && playerData.transfers.length > 0 ? (
                <div className="space-y-4">
                  {playerData.transfers.flatMap((transferGroup: any) => 
                    transferGroup.transfers.map((transfer: any, index: number) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(transfer.date).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'long'
                            })}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <Link 
                              href={`/lag/${createTeamSlug(transfer.teams?.in?.name, transfer.teams?.in?.id)}`}
                              className="flex items-center hover:text-blue-600 transition-colors"
                            >
                              {transfer.teams?.in?.logo && (
                                <Image
                                  src={transfer.teams.in.logo}
                                  alt={transfer.teams.in.name}
                                  width={40}
                                  height={40}
                                  className="mr-2"
                                />
                              )}
                              <div>
                                <div className="font-medium">{transfer.teams?.in?.name || 'Ukjent'}</div>
                                <div className="text-sm text-gray-500">Til</div>
                              </div>
                            </Link>
                            
                            <div className="mx-4 text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </div>
                            
                            <Link 
                              href={`/lag/${createTeamSlug(transfer.teams?.out?.name, transfer.teams?.out?.id)}`}
                              className="flex items-center hover:text-blue-600 transition-colors"
                            >
                              {transfer.teams?.out?.logo && (
                                <Image
                                  src={transfer.teams.out.logo}
                                  alt={transfer.teams.out.name}
                                  width={40}
                                  height={40}
                                  className="mr-2"
                                />
                              )}
                              <div>
                                <div className="font-medium">{transfer.teams?.out?.name || 'Ukjent'}</div>
                                <div className="text-sm text-gray-500">Fra</div>
                              </div>
                            </Link>
                          </div>
                          
                          {transfer.type && (
                            <div className="mt-3 text-sm text-gray-500">
                              Type: <span className="font-medium">{transfer.type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Ingen overgangshistorikk tilgjengelig for denne spilleren</p>
                </div>
              )}
            </div>
          )}
          
          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Lag</h2>
              
              {teamsHistory.length > 0 || currentClubTeamFromTransfer || currentClubTeamFromStats ? (
                <div className="space-y-6">
                  {/* Current Teams Section */}
                  {allCurrentTeams.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Nåværende lag</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {allCurrentTeams.map((teamData: any, index: number) => (
                          <Link 
                            key={index} 
                            href={`/lag/${createTeamSlug(teamData.team.name, teamData.team.id)}`}
                            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
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
                                <h4 className="font-medium">{teamData.team.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {teamData.seasons?.includes(currentYear) ? 
                                    `${currentYear} (Nåværende)` : 
                                    `${Math.min(...(teamData.seasons || [currentYear]))} - ${Math.max(...(teamData.seasons || [currentYear]))}`
                                  }
                                </p>
                                {isNationalTeam(teamData) && (
                                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
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
                      <h3 className="text-lg font-medium mb-3">Tidligere lag</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {teamsHistory
                          .filter((teamData: any) => !teamData.seasons?.includes(currentYear))
                          .sort((a: any, b: any) => Math.max(...(b.seasons || [0])) - Math.max(...(a.seasons || [0])))
                          .map((teamData: any, index: number) => (
                            <Link 
                              key={index} 
                              href={`/lag/${createTeamSlug(teamData.team.name, teamData.team.id)}`}
                              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
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
                                  <h4 className="font-medium">{teamData.team.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {teamData.seasons?.length > 1 ? 
                                      `${Math.min(...teamData.seasons)} - ${Math.max(...teamData.seasons)}` : 
                                      `${teamData.seasons?.[0]}`
                                    }
                                  </p>
                                  {isNationalTeam(teamData) && (
                                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
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
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-500">Ingen laghistorikk tilgjengelig for denne spilleren.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Career Tab */}
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
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Ingen karrieredata tilgjengelig for denne spilleren</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
} 