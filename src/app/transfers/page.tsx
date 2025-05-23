"use client"

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import { ELITESERIEN_TEAMS, ALL_TEAMS, PREMIER_LEAGUE_TEAMS, LA_LIGA_TEAMS, BUNDESLIGA_TEAMS, SERIE_A_TEAMS, LIGUE_1_TEAMS } from '@/lib/constants';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

// Top leagues for the filter dropdown with CDN URLs
const TOP_LEAGUES = [
  { id: 103, name: 'Eliteserien', logo: 'https://viasport.b-cdn.net/football/leagues/103.png' },
  { id: 39, name: 'Premier League', logo: 'https://viasport.b-cdn.net/football/leagues/39.png' },
  { id: 140, name: 'La Liga', logo: 'https://viasport.b-cdn.net/football/leagues/140.png' },
  { id: 78, name: 'Bundesliga', logo: 'https://viasport.b-cdn.net/football/leagues/78.png' },
  { id: 135, name: 'Serie A', logo: 'https://viasport.b-cdn.net/football/leagues/135.png' },
  { id: 61, name: 'Ligue 1', logo: 'https://viasport.b-cdn.net/football/leagues/61.png' }
];

// Filter options
const FILTER_OPTIONS = [
  { id: 'all', label: 'Alle overganger' },
  { id: 'last-week', label: 'Siste uke' },
  { id: 'last-month', label: 'Siste måned' },
  { id: 'last-3-months', label: 'Siste 3 måneder' },
  { id: 'last-6-months', label: 'Siste 6 måneder' },
  { id: 'last-year', label: 'Siste år' }
];

// Transfer type options
const TRANSFER_TYPE_OPTIONS = [
  { id: 'all', label: 'Alle typer' },
  { id: 'in', label: 'Inn til lag' },
  { id: 'out', label: 'Ut fra lag' },
];

const TransfersPage = () => {
  const { theme } = useTheme();
  const [selectedTeam, setSelectedTeam] = useState<number>(ALL_TEAMS);
  const [allTransfers, setAllTransfers] = useState<Record<number, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [timeFilter, setTimeFilter] = useState<string>('last-6-months');
  const [selectedLeague, setSelectedLeague] = useState<string>('39'); // Premier League first
  
  // Dropdown states
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isLeagueDropdownOpen, setIsLeagueDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const supabase = createClientComponentClient();

  // Add state for available teams based on selected league
  const [availableTeams, setAvailableTeams] = useState<Array<{id: number, name: string, logo: string}>>([]);

  // Add state for team lookup
  const [teamLookup, setTeamLookup] = useState<Record<number, string>>({});

  // Add sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Add loading state for filter changes
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Add state for player stats lookup
  const [playerStatsLookup, setPlayerStatsLookup] = useState<Record<number, {height: string, weight: string}>>({});

  // Fetch available teams when league changes
  useEffect(() => {
    const fetchAvailableTeams = async () => {
      if (selectedLeague === 'all') {
        // Show all teams that have transfers
        const allTeams = [
          ...ELITESERIEN_TEAMS,
          ...PREMIER_LEAGUE_TEAMS,
          ...LA_LIGA_TEAMS,
          ...BUNDESLIGA_TEAMS,
          ...SERIE_A_TEAMS,
          ...LIGUE_1_TEAMS
        ];
        setAvailableTeams(allTeams);
        
        // Build team lookup from constants
        const lookup: Record<number, string> = {};
        allTeams.forEach(team => {
          if (team && team.id && team.name) {
            lookup[team.id] = team.name;
          }
        });
        setTeamLookup(lookup);
        return;
      }

      try {
        // Fetch teams for the selected league from target_leagues_teams
        const { data: leagueTeams, error } = await supabase
          .from('target_leagues_teams')
          .select('team_id, team_name')
          .eq('league_id', parseInt(selectedLeague));

        if (error) {
          console.error('❌ Error fetching league teams:', error);
          return;
        }

        console.log(`🏈 Teams for league ${selectedLeague}:`, leagueTeams);

        // Convert to the format expected by the dropdown
        const teams = leagueTeams?.map(team => ({
          id: team.team_id,
          name: team.team_name,
          logo: '/team-logos/default.png' // You might want to add logos later
        })) || [];

        setAvailableTeams(teams);

        // Build team lookup from database
        const lookup: Record<number, string> = {};
        leagueTeams?.forEach(team => {
          if (team && team.team_id && team.team_name) {
            lookup[team.team_id] = team.team_name;
          }
        });
        setTeamLookup(lookup);

      } catch (err) {
        console.error('❌ Error fetching teams:', err);
      }
    };

    fetchAvailableTeams();
  }, [selectedLeague, supabase]);

  // Add a comprehensive team lookup function that fetches ALL teams
  useEffect(() => {
    const fetchAllTeams = async () => {
      try {
        // Fetch ALL teams from target_leagues_teams to build comprehensive lookup
        const { data: allTeamsData, error } = await supabase
          .from('target_leagues_teams')
          .select('team_id, team_name');

        if (error) {
          console.error('❌ Error fetching all teams:', error);
          return;
        }

        console.log('🔥 ALL TEAMS FROM DB:', allTeamsData?.length);

        // Build comprehensive team lookup
        const lookup: Record<number, string> = {};
        allTeamsData?.forEach(team => {
          if (team && team.team_id && team.team_name) {
            lookup[team.team_id] = team.team_name;
          }
        });

        // Also add teams from constants as fallback
        const allConstantTeams = [
          ...ELITESERIEN_TEAMS,
          ...PREMIER_LEAGUE_TEAMS,
          ...LA_LIGA_TEAMS,
          ...BUNDESLIGA_TEAMS,
          ...SERIE_A_TEAMS,
          ...LIGUE_1_TEAMS
        ];
        
        allConstantTeams.forEach(team => {
          if (team && team.id && team.name) {
            lookup[team.id] = team.name;
          }
        });

        console.log('🔥 TEAM LOOKUP BUILT:', Object.keys(lookup).length, 'teams');
        setTeamLookup(lookup);

      } catch (err) {
        console.error('❌ Error fetching all teams:', err);
      }
    };

    fetchAllTeams();
  }, [supabase]);

  // Helper function to get team league - MOVED BEFORE useMemo
  const getTeamLeague = (teamId: number): string => {
    if (ELITESERIEN_TEAMS.find(team => team.id === teamId)) return 'eliteserien';
    if (PREMIER_LEAGUE_TEAMS.find(team => team.id === teamId)) return 'premier-league';
    if (LA_LIGA_TEAMS.find(team => team.id === teamId)) return 'la-liga';
    if (BUNDESLIGA_TEAMS.find(team => team.id === teamId)) return 'bundesliga';
    if (SERIE_A_TEAMS.find(team => team.id === teamId)) return 'serie-a';
    if (LIGUE_1_TEAMS.find(team => team.id === teamId)) return 'ligue-1';
    return 'unknown';
  };

  // Fetch transfers from Supabase with pagination and default to Premier League
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Fetching transfers from Supabase...');

        // Get target leagues teams for the selected league only
        const { data: leaguesData, error: leaguesError } = await supabase
          .from('target_leagues_teams')
          .select('team_id, league_id, league_name')
          .eq('league_id', parseInt(selectedLeague));

        if (leaguesError) {
          console.error('❌ Error fetching leagues:', leaguesError);
          setError('Kunne ikke hente ligadata');
          return;
        }

        console.log(`🔥 TEAMS FOR LEAGUE ${selectedLeague}:`, leaguesData?.length);

        if (!leaguesData || leaguesData.length === 0) {
          console.log(`🔥 NO TEAMS FOUND FOR LEAGUE ${selectedLeague}`);
          setAllTransfers({});
          return;
        }

        // Get team IDs for this league
        const teamIds = leaguesData.map(team => team.team_id);
        console.log(`🔥 TEAM IDS FOR LEAGUE ${selectedLeague}:`, teamIds);

        // Fetch transfers for these teams only, ordered by date desc, limit 1000
        const { data: transfersData, error: transfersError } = await supabase
          .from('player_transfers')
          .select('*')
          .in('team_id', teamIds)
          .order('transfer_date', { ascending: false })
          .limit(1000);

        if (transfersError) {
          console.error('❌ Error fetching transfers:', transfersError);
          setError('Kunne ikke hente overgangsdata');
          return;
        }

        console.log(`🔥 TRANSFERS FOUND FOR LEAGUE ${selectedLeague}:`, transfersData?.length);

        // Create a lookup map for team_id -> league info
        const teamLeagueMap: Record<number, { league_id: number; league_name: string }> = {};
        leaguesData.forEach(league => {
          teamLeagueMap[league.team_id] = {
            league_id: league.league_id,
            league_name: league.league_name
          };
        });

        // Group transfers by team_id and add league_id from the mapping
        const groupedTransfers: Record<number, any[]> = {};
        
        transfersData?.forEach(transfer => {
          const teamId = transfer.team_id;
          const leagueInfo = teamLeagueMap[teamId];
          
          // Add league_id from the mapping
          const enrichedTransfer = {
            ...transfer,
            league_id: leagueInfo.league_id,
            league_name: leagueInfo.league_name
          };

          if (!groupedTransfers[teamId]) {
            groupedTransfers[teamId] = [];
          }
          groupedTransfers[teamId].push(enrichedTransfer);
        });

        console.log(`🔥 FINAL GROUPED TRANSFERS:`, Object.keys(groupedTransfers).length, 'teams');
        setAllTransfers(groupedTransfers);

      } catch (err) {
        console.error('❌ Unexpected error:', err);
        setError('En uventet feil oppstod');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransfers();
  }, [supabase, selectedLeague]); // Re-fetch when league changes

  // Add a function to extract numeric value from transfer type
  const getTransferValue = (transferType: string): number => {
    if (!transferType) return 0;
    
    // Handle euro amounts like "€ 200K", "€ 15M", "€ 1.5M"
    if (transferType.includes('€')) {
      const match = transferType.match(/€\s*([\d.]+)\s*([KM]?)/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2]?.toUpperCase();
        
        if (unit === 'M') {
          return value * 1000000; // Convert millions to base value
        } else if (unit === 'K') {
          return value * 1000; // Convert thousands to base value
        } else {
          return value; // Assume it's already in base currency
        }
      }
    }
    
    // Loans get a medium priority
    if (transferType.toLowerCase() === 'loan') {
      return 1; // Small value to rank above free transfers
    }
    
    // Free transfers get lowest priority
    return 0;
  };

  // Function to format transfer type (fee or loan)
  const formatTransferType = (type: string) => {
    if (!type) return 'Ukjent';
    
    if (type.startsWith('€')) {
      return type; // Already formatted as a fee (e.g., "€ 200K")
    } else if (type.toLowerCase() === 'loan') {
      return 'Lån';
    } else if (type.toLowerCase() === 'free') {
      return 'Gratis';
    } else if (type.toLowerCase() === 'n/a') {
      return 'Ukjent';
    }
    return type;
  };

  // Add function to fix incorrect future dates from API
  const fixTransferDate = (dateString: string | null): string | null => {
    if (!dateString || dateString === 'NULL' || dateString === null) {
      return null;
    }

    try {
      const date = new Date(dateString);
      const currentYear = new Date().getFullYear();
      const transferYear = date.getFullYear();
      
      // If the transfer year is more than 10 years in the future, 
      // it's likely a century error (e.g., 2099 should be 1999)
      if (transferYear > currentYear + 10) {
        // Convert century: 20XX -> 19XX, 21XX -> 20XX, etc.
        const correctedYear = transferYear - 100;
        
        // Create new date with corrected year
        const correctedDate = new Date(date);
        correctedDate.setFullYear(correctedYear);
        
        // Return in YYYY-MM-DD format
        return correctedDate.toISOString().split('T')[0];
      }
      
      // If date seems reasonable, return as is
      return dateString;
    } catch (error) {
      console.error('Error fixing transfer date:', error);
      return dateString;
    }
  };

  // Update parseTransferDate to use the fixed date
  const parseTransferDate = (dateString: string | null): Date | null => {
    if (!dateString || dateString === 'NULL' || dateString === null) {
      return null;
    }

    try {
      // First fix the date if it's incorrect
      const fixedDateString = fixTransferDate(dateString);
      if (!fixedDateString) return null;
      
      // Parse the fixed date string (format: YYYY-MM-DD)
      const date = new Date(fixedDateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  };

  // Update formatTransferDate to use the fixed date
  const formatTransferDate = (dateString: string | null): string => {
    if (!dateString || dateString === 'NULL' || dateString === null) {
      return 'Ukjent dato';
    }

    try {
      // First fix the date if it's incorrect
      const fixedDateString = fixTransferDate(dateString);
      if (!fixedDateString) return 'Ukjent dato';
      
      // Parse the fixed date string (format: YYYY-MM-DD)
      const date = new Date(fixedDateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Ugyldig dato';
      }

      // Format as DD.MM.YYYY (Norwegian format)
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
      const year = date.getFullYear();
      
      return `${day}.${month}.${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Ugyldig dato';
    }
  };

  // Now the processedTransfers useMemo can use these functions
  const processedTransfers = useMemo(() => {
    console.log('🔥 === DEBUGGING TEAM FILTER ===');
    console.log('🔥 Selected League:', selectedLeague);
    console.log('🔥 Selected Team:', selectedTeam);
    console.log('🔥 Time Filter:', timeFilter);
    console.log('🔥 Transfer Type Filter:', filterType);
    
    if (!allTransfers || Object.keys(allTransfers).length === 0) {
      console.log('🔥 NO TRANSFERS DATA AVAILABLE');
      return [];
    }

    // Calculate time filter cutoff date
    let cutoffDate: Date | null = null;
    if (timeFilter !== 'all') {
      const now = new Date();
      switch (timeFilter) {
        case 'last-week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last-month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last-3-months':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last-6-months':
          cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case 'last-year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    let filteredTransfers: any[] = [];

    Object.entries(allTransfers).forEach(([teamId, transfers]) => {
      if (!transfers || !Array.isArray(transfers)) return;
      
      transfers.forEach((transfer, index) => {
        if (!transfer) return; // Skip null/undefined transfers
        
        // Parse and validate transfer date
        const transferDate = parseTransferDate(transfer.transfer_date);
        if (!transferDate) {
          console.log('🔥 SKIPPING TRANSFER - Invalid date:', transfer.transfer_date);
          return; // Skip transfers with invalid dates
        }
        
        // Time filter
        if (cutoffDate && transferDate < cutoffDate) {
          console.log('🔥 SKIPPING TRANSFER - Outside time range:', transfer.transfer_date, transferDate);
          return;
        }
        
        // League filter
        if (selectedLeague !== 'all') {
          const selectedLeagueId = parseInt(selectedLeague);
          const transferLeagueId = transfer.league_id;
          
          if (transferLeagueId !== selectedLeagueId) {
            return;
          }
        }

        // Team filter - check if the selected team is involved in the transfer
        if (selectedTeam !== ALL_TEAMS) {
          const isTeamInvolved = 
            transfer.team_id === selectedTeam || // The team we're tracking
            transfer.team_in_id === selectedTeam || // Team receiving the player
            transfer.team_out_id === selectedTeam; // Team losing the player
          
          if (!isTeamInvolved) {
            return;
          }
        }

        // Transfer direction filter (in/out)
        if (filterType !== 'all' && selectedTeam !== ALL_TEAMS) {
          const selectedTeamId = parseInt(selectedTeam);
          
          if (filterType === 'in') {
            // Show only transfers where the selected team is receiving the player
            if (transfer.team_in_id !== selectedTeamId) {
              console.log('🔥 SKIPPING TRANSFER - Not an incoming transfer for selected team');
              return;
            }
          } else if (filterType === 'out') {
            // Show only transfers where the selected team is losing the player
            if (transfer.team_out_id !== selectedTeamId) {
              console.log('🔥 SKIPPING TRANSFER - Not an outgoing transfer for selected team');
              return;
            }
          }
        }

        filteredTransfers.push(transfer);
      });
    });

    console.log(`🔥 FINAL RESULT: ${filteredTransfers.length} transfers for team ${selectedTeam}, type: ${filterType}`);
    
    return filteredTransfers;
  }, [allTransfers, selectedLeague, selectedTeam, filterType, timeFilter]);

  // Add sorting function
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Update sortedTransfers to include manual sorting
  const sortedTransfers = useMemo(() => {
    let sorted = [...processedTransfers].sort((a, b) => {
      const valueA = getTransferValue(a.transfer_type);
      const valueB = getTransferValue(b.transfer_type);
      
      // Sort by value descending (highest first)
      if (valueA !== valueB) {
        return valueB - valueA;
      }
      
      // If values are equal, sort by date (most recent first)
      const dateA = parseTransferDate(a.transfer_date);
      const dateB = parseTransferDate(b.transfer_date);
      
      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      }
      
      return 0;
    });

    // Apply manual sorting if sortConfig is set
    if (sortConfig) {
      sorted.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'player':
            aValue = a.player_name || '';
            bValue = b.player_name || '';
            break;
          case 'type':
            aValue = getTransferValue(a.transfer_type);
            bValue = getTransferValue(b.transfer_type);
            break;
          case 'from':
            aValue = teamLookup[a.team_out_id] || a.team_out_name || '';
            bValue = teamLookup[b.team_out_id] || b.team_out_name || '';
            break;
          case 'to':
            aValue = teamLookup[a.team_in_id] || a.team_in_name || '';
            bValue = teamLookup[b.team_in_id] || b.team_in_name || '';
            break;
          case 'date':
            const dateA = parseTransferDate(a.transfer_date);
            const dateB = parseTransferDate(b.transfer_date);
            aValue = dateA ? dateA.getTime() : 0;
            bValue = dateB ? dateB.getTime() : 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sorted;
  }, [processedTransfers, sortConfig, teamLookup]);

  // Add function to render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
  };

  // Update the handleClearFilters function to default to Premier League
  const handleClearFilters = () => {
    console.log('🔥 CLEARING ALL FILTERS - defaulting to Premier League');
    
    setIsFilterLoading(true);
    
    // Reset all filter states - default to Premier League instead of 'all'
    setSelectedLeague('39'); // Premier League ID
    setSelectedTeam(ALL_TEAMS);
    setTimeFilter('last-6-months'); // Keep the default time filter
    setFilterType('all');
    
    // Close all dropdowns
    setIsLeagueDropdownOpen(false);
    setIsTeamDropdownOpen(false);
    setIsFilterDropdownOpen(false);
    setIsTypeDropdownOpen(false);
    
    // Set Premier League teams as available teams
    setAvailableTeams(PREMIER_LEAGUE_TEAMS);
    
    // Build team lookup for Premier League
    const lookup: Record<number, string> = {};
    PREMIER_LEAGUE_TEAMS.forEach(team => {
      if (team && team.id && team.name) {
        lookup[team.id] = team.name;
      }
    });
    setTeamLookup(lookup);
    
    setTimeout(() => setIsFilterLoading(false), 300);
    console.log('🔥 FILTERS CLEARED - defaulted to Premier League');
  };

  // Update the team selection handler to fetch team-specific transfers if needed
  const handleTeamSelect = (teamId: number) => {
    setSelectedTeam(teamId);
    // If you need to fetch specific team transfers that aren't already loaded
    // you could add additional logic here
  };

  // Update the team dropdown to use the new renderTeamDropdown function
  const renderTeamDropdown = () => {
    const selectedTeamData = selectedTeam === ALL_TEAMS 
      ? null 
      : availableTeams.find(team => team && team.id === selectedTeam);

    return (
      <div className="relative">
        <button
          onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
          className="flex items-center justify-between min-w-[180px] h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-[#181818] border border-gray-300 dark:border-[#333333] rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-[#2C2C2E] focus:outline-none"
        >
          <div className="flex items-center min-w-0">
            {selectedTeamData && (
              <Image
                src={`https://viasport.b-cdn.net/football/teams/${selectedTeamData.id}.png`}
                alt={`${selectedTeamData.name} logo`}
                width={20}
                height={20}
                className="mr-2 flex-shrink-0"
                unoptimized
                onError={(e) => {
                  e.currentTarget.src = 'https://viasport.b-cdn.net/football/teams/placeholder.png';
                }}
              />
            )}
            <span className="dark:text-gray-200 truncate">
              {selectedTeam === ALL_TEAMS 
                ? 'Alle lag' 
                : selectedTeamData?.name || 'Velg lag'
              }
            </span>
          </div>
          <ChevronDownIcon className="w-5 h-5 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        </button>
        
        {isTeamDropdownOpen && (
          <div className="absolute z-10 min-w-[180px] mt-1 bg-white dark:bg-[#181818] shadow-lg rounded-md ring-1 ring-black ring-opacity-5 dark:ring-opacity-10 border border-gray-200 dark:border-[#333333] max-h-60 overflow-y-auto">
            <div className="py-1">
              <button
                onClick={() => {
                  setSelectedTeam(ALL_TEAMS);
                  setIsTeamDropdownOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  selectedTeam === ALL_TEAMS 
                    ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                }`}
              >
                Alle lag
              </button>
              {availableTeams && availableTeams.length > 0 && availableTeams
                .filter(team => team && team.id && team.name)
                .map(team => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeam(team.id);
                      setIsTeamDropdownOpen(false);
                    }}
                    className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                      selectedTeam === team.id 
                        ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <Image
                      src={`https://viasport.b-cdn.net/football/teams/${team.id}.png`}
                      alt={`${team.name} logo`}
                      width={20}
                      height={20}
                      className="mr-3 flex-shrink-0"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.src = 'https://viasport.b-cdn.net/football/teams/placeholder.png';
                      }}
                    />
                    {team.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add a function to determine transfer fee
  const getTransferFee = (transfer: any) => {
    // If type contains money amount (like "185K €"), that's the fee
    if (transfer.type && transfer.type.includes('€')) {
      return transfer.type;
    }
    
    // Otherwise it's free
    return 'Free';
  };

  // Add a function to determine transfer type
  const getTransferType = (transfer: any) => {
    // If type is "Loan", return that
    if (transfer.type === 'Loan') {
      return 'Lån';
    }
    
    // If type contains money amount, it's a permanent transfer
    if (transfer.type && transfer.type.includes('€')) {
      return 'Permanent';
    }
    
    // Default to permanent
    return 'Permanent';
  };

  // Update the handleLeagueChange function to be more robust
  const handleLeagueChange = async (leagueId: string) => {
    console.log('🔥 LEAGUE CHANGE:', leagueId);
    
    try {
      setIsFilterLoading(true);
      setSelectedLeague(leagueId);
      setSelectedTeam(ALL_TEAMS);
      setIsLeagueDropdownOpen(false);
      
      if (leagueId !== 'all') {
        await fetchAvailableTeams();
      } else {
        const allTeams = [
          ...ELITESERIEN_TEAMS,
          ...PREMIER_LEAGUE_TEAMS,
          ...LA_LIGA_TEAMS,
          ...BUNDESLIGA_TEAMS,
          ...SERIE_A_TEAMS,
          ...LIGUE_1_TEAMS
        ];
        setAvailableTeams(allTeams);
        
        const lookup: Record<number, string> = {};
        allTeams.forEach(team => {
          if (team && team.id && team.name) {
            lookup[team.id] = team.name;
          }
        });
        setTeamLookup(lookup);
      }
    } catch (error) {
      console.error('🔥 ERROR in handleLeagueChange:', error);
    } finally {
      setTimeout(() => setIsFilterLoading(false), 300);
    }
  };

  // Add a function to create player profile URL
  const createPlayerProfileUrl = (playerName: string, playerId: number) => {
    if (!playerName || !playerId) return '#';
    
    // Convert player name to URL-friendly format
    const nameSlug = playerName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
    
    return `/spillerprofil/${nameSlug}-${playerId}`;
  };

  // Add a function to create team profile URL
  const createTeamProfileUrl = (teamName: string, teamId: number) => {
    if (!teamName || !teamId) return '#';
    
    // Convert team name to URL-friendly format
    const nameSlug = teamName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
    
    return `/lag/${nameSlug}-${teamId}`;
  };

  // Update other filter handlers to show loading
  const handleTeamChange = (teamId: string) => {
    setIsFilterLoading(true);
    setSelectedTeam(teamId);
    setIsTeamDropdownOpen(false);
    setTimeout(() => setIsFilterLoading(false), 200);
  };

  const handleTimeFilterChange = (filter: string) => {
    setIsFilterLoading(true);
    setTimeFilter(filter);
    setIsFilterDropdownOpen(false);
    setTimeout(() => setIsFilterLoading(false), 200);
  };

  const handleTypeFilterChange = (type: string) => {
    setIsFilterLoading(true);
    setFilterType(type);
    setIsTypeDropdownOpen(false);
    setTimeout(() => setIsFilterLoading(false), 200);
  };

  // Add useEffect to fetch player stats for height/weight info
  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        // Get unique player IDs from current transfers
        const playerIds = [...new Set(sortedTransfers.map(transfer => transfer.player_id).filter(Boolean))];
        
        if (playerIds.length === 0) return;

        // Fetch player stats for height/weight info
        const { data: playerStats, error } = await supabase
          .from('player_season_stats')
          .select('player_id, player_height, player_weight')
          .in('player_id', playerIds)
          .eq('season', 2024); // Get latest season data

        if (error) {
          console.error('❌ Error fetching player stats:', error);
          return;
        }

        // Build lookup for player height/weight
        const statsLookup: Record<number, {height: string, weight: string}> = {};
        playerStats?.forEach(stat => {
          if (stat.player_id) {
            statsLookup[stat.player_id] = {
              height: stat.player_height || '',
              weight: stat.player_weight || ''
            };
          }
        });

        setPlayerStatsLookup(statsLookup);

      } catch (err) {
        console.error('❌ Error fetching player stats:', err);
      }
    };

    if (sortedTransfers.length > 0) {
      fetchPlayerStats();
    }
  }, [sortedTransfers, supabase]);

  // Helper function to format height and weight
  const formatPlayerPhysical = (playerId: number): string => {
    const stats = playerStatsLookup[playerId];
    if (!stats) return '';
    
    const parts = [];
    if (stats.height) parts.push(stats.height);
    if (stats.weight) parts.push(stats.weight);
    
    return parts.length > 0 ? parts.join(' • ') : '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-[#222] p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Fotballoverføringer</h1>

        {/* Filter bar - Mobile responsive */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-8">
          {/* Time filter dropdown */}
          <div className="relative w-full sm:w-auto sm:min-w-[180px]">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center justify-between w-full h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-[#181818] border border-gray-300 dark:border-[#333333] rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-[#2C2C2E] focus:outline-none"
            >
              <span className="dark:text-gray-200 truncate">{FILTER_OPTIONS.find(option => option.id === timeFilter)?.label}</span>
              <ChevronDownIcon className="w-5 h-5 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </button>
            
            {isFilterDropdownOpen && (
              <div className="absolute z-10 w-full sm:min-w-[180px] mt-1 bg-white dark:bg-[#181818] shadow-lg rounded-md ring-1 ring-black ring-opacity-5 dark:ring-opacity-10 border border-gray-200 dark:border-[#333333]">
                <div className="py-1">
                  {FILTER_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        handleTimeFilterChange(option.id as string);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        timeFilter === option.id 
                          ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* League filter dropdown */}
          <div className="relative w-full sm:w-auto sm:min-w-[180px]">
            <button
              onClick={() => setIsLeagueDropdownOpen(!isLeagueDropdownOpen)}
              className="flex items-center justify-between w-full h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-[#181818] border border-gray-300 dark:border-[#333333] rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-[#2C2C2E] focus:outline-none"
            >
              <div className="flex items-center min-w-0">
                {selectedLeague !== 'all' && (
                  <Image
                    src={TOP_LEAGUES.find(league => league.id.toString() === selectedLeague)?.logo || ''}
                    alt="League logo"
                    width={20}
                    height={20}
                    className="mr-2 flex-shrink-0"
                    unoptimized
                  />
                )}
                <span className="dark:text-gray-200 truncate">
                  {selectedLeague === 'all' ? 'Alle ligaer' : TOP_LEAGUES.find(league => league.id.toString() === selectedLeague)?.name}
                </span>
              </div>
              <ChevronDownIcon className="w-5 h-5 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </button>
            
            {isLeagueDropdownOpen && (
              <div className="absolute z-10 w-full sm:min-w-[180px] mt-1 bg-white dark:bg-[#181818] shadow-lg rounded-md ring-1 ring-black ring-opacity-5 dark:ring-opacity-10 border border-gray-200 dark:border-[#333333]">
                <div className="py-1">
                  <button
                    onClick={() => handleLeagueChange('all')}
                    className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                      selectedLeague === 'all' 
                        ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                    }`}
                  >
                    Alle ligaer
                  </button>
                  {TOP_LEAGUES.map(league => (
                    <button
                      key={league.id}
                      onClick={() => handleLeagueChange(league.id.toString())}
                      className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                        selectedLeague === league.id.toString() 
                          ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                      }`}
                    >
                      <Image
                        src={league.logo}
                        alt={`${league.name} logo`}
                        width={20}
                        height={20}
                        className="mr-3 flex-shrink-0"
                        unoptimized
                      />
                      <span className="truncate">{league.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Team filter dropdown */}
          <div className="w-full sm:w-auto sm:min-w-[180px]">
            {renderTeamDropdown()}
          </div>
          
          {/* Transfer type filter dropdown */}
          <div className="relative w-full sm:w-auto sm:min-w-[180px]">
            <button
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="flex items-center justify-between w-full h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-[#181818] border border-gray-300 dark:border-[#333333] rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-[#2C2C2E] focus:outline-none"
            >
              <span className="dark:text-gray-200 truncate">{TRANSFER_TYPE_OPTIONS.find(option => option.id === filterType)?.label}</span>
              <ChevronDownIcon className="w-5 h-5 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </button>
            
            {isTypeDropdownOpen && (
              <div className="absolute z-10 w-full sm:min-w-[180px] mt-1 bg-white dark:bg-[#181818] shadow-lg rounded-md ring-1 ring-black ring-opacity-5 dark:ring-opacity-10 border border-gray-200 dark:border-[#333333]">
                <div className="py-1">
                  {TRANSFER_TYPE_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        handleTypeFilterChange(option.id as string);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        filterType === option.id 
                          ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-white' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Clear filters button */}
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#181818] border border-gray-300 dark:border-[#333333] rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-[#2C2C2E] focus:outline-none"
          >
            <XMarkIcon className="w-4 h-4 mr-2" />
            Nullstill
          </button>
        </div>

        {/* Loading state */}
        {isLoading && !isFilterLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading transfers...</span>
          </div>
        ) : isFilterLoading ? (
          <>
            <MobileCardsSkeleton />
            <TableSkeleton />
          </>
        ) : sortedTransfers.length === 0 ? (
          <div className="bg-gray-50 dark:bg-[#181818]/30 border border-gray-200 dark:border-[#333333] rounded-md p-8 my-4 text-center">
            <p className="text-gray-500 dark:text-gray-400">Ingen overganger funnet for dette laget</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Mobile card view */}
            <div className="block sm:hidden">
              {sortedTransfers
                .filter(transfer => 
                  transfer && 
                  transfer.player_name && 
                  transfer.transfer_date && 
                  transfer.transfer_date !== 'NULL' &&
                  transfer.transfer_date !== null
                )
                .map((transfer, index) => {
                  const fromTeamName = teamLookup[transfer.team_out_id] || transfer.team_out_name || 'Unknown Team';
                  const toTeamName = teamLookup[transfer.team_in_id] || transfer.team_in_name || 'Unknown Team';
                  const physicalInfo = formatPlayerPhysical(transfer.player_id);
                  
                  return (
                    <div key={transfer.id || index} className="bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
                      {/* Player info */}
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 h-8 w-8">
                          <img
                            className="h-8 w-8 rounded-full object-cover"
                            src={`https://viasport.b-cdn.net/football/players/${transfer.player_id || 'placeholder'}.png`}
                            alt={transfer.player_name || 'Player'}
                            onError={(e) => {
                              e.currentTarget.src = 'https://viasport.b-cdn.net/football/players/placeholder.png';
                            }}
                          />
                        </div>
                        <div className="ml-2 flex-1 min-w-0">
                          <Link 
                            href={createPlayerProfileUrl(transfer.player_name, transfer.player_id)}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 truncate block"
                          >
                            {transfer.player_name || 'Unknown Player'}
                          </Link>
                          {physicalInfo && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {physicalInfo}
                            </div>
                          )}
                          <div className={`text-xs font-medium ${
                            transfer.transfer_type && transfer.transfer_type.startsWith('€') 
                              ? 'text-green-600 dark:text-green-400' 
                              : transfer.transfer_type && transfer.transfer_type.toLowerCase() === 'loan' 
                                ? 'text-blue-600 dark:text-blue-400'
                                : transfer.transfer_type && transfer.transfer_type.toLowerCase() === 'free'
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-900 dark:text-[#AAAAAA]'
                          }`}>
                            {formatTransferType(transfer.transfer_type)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatTransferDate(transfer.transfer_date)}
                        </div>
                      </div>
                      
                      {/* Transfer direction - more compact */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center flex-1 min-w-0">
                          <img
                            className="h-5 w-5 rounded object-cover flex-shrink-0"
                            src={`https://viasport.b-cdn.net/football/teams/${transfer.team_out_id || 'placeholder'}.png`}
                            alt={fromTeamName}
                            onError={(e) => {
                              e.currentTarget.src = 'https://viasport.b-cdn.net/football/teams/placeholder.png';
                            }}
                          />
                          <Link 
                            href={createTeamProfileUrl(fromTeamName, transfer.team_out_id)}
                            className="ml-1 font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 truncate"
                          >
                            {fromTeamName}
                          </Link>
                        </div>
                        
                        <div className="mx-2 text-gray-400 flex-shrink-0">
                          →
                        </div>
                        
                        <div className="flex items-center flex-1 min-w-0 justify-end">
                          <Link 
                            href={createTeamProfileUrl(toTeamName, transfer.team_in_id)}
                            className="mr-1 font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 truncate"
                          >
                            {toTeamName}
                          </Link>
                          <img
                            className="h-5 w-5 rounded object-cover flex-shrink-0"
                            src={`https://viasport.b-cdn.net/football/teams/${transfer.team_in_id || 'placeholder'}.png`}
                            alt={toTeamName}
                            onError={(e) => {
                              e.currentTarget.src = 'https://viasport.b-cdn.net/football/teams/placeholder.png';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Desktop table view with Norwegian headers and sorting */}
            <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-[#222]">
              <thead className="bg-gray-50 dark:bg-[#181818]">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222] select-none"
                    onClick={() => handleSort('player')}
                  >
                    <div className="flex items-center">
                      Spiller
                      {renderSortIcon('player')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222] select-none"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {renderSortIcon('type')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222] select-none"
                    onClick={() => handleSort('from')}
                  >
                    <div className="flex items-center">
                      Fra
                      {renderSortIcon('from')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222] select-none"
                    onClick={() => handleSort('to')}
                  >
                    <div className="flex items-center">
                      Til
                      {renderSortIcon('to')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222] select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Dato
                      {renderSortIcon('date')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#181818] divide-y divide-gray-200 dark:divide-[#222]">
                {sortedTransfers
                  .filter(transfer => 
                    transfer && 
                    transfer.player_name && 
                    transfer.transfer_date && 
                    transfer.transfer_date !== 'NULL' &&
                    transfer.transfer_date !== null
                  )
                  .map((transfer, index) => {
                    const fromTeamName = teamLookup[transfer.team_out_id] || transfer.team_out_name || 'Unknown Team';
                    const toTeamName = teamLookup[transfer.team_in_id] || transfer.team_in_name || 'Unknown Team';
                    const physicalInfo = formatPlayerPhysical(transfer.player_id);
                    
                    return (
                      <tr key={transfer.id || index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={`https://viasport.b-cdn.net/football/players/${transfer.player_id || 'placeholder'}.png`}
                                alt={transfer.player_name || 'Player'}
                                onError={(e) => {
                                  e.currentTarget.src = 'https://viasport.b-cdn.net/football/players/placeholder.png';
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <Link 
                                href={createPlayerProfileUrl(transfer.player_name, transfer.player_id)}
                                className="text-sm font-medium text-gray-900 dark:text-[#AAAAAA] hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                              >
                                {transfer.player_name || 'Unknown Player'}
                              </Link>
                              {physicalInfo && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {physicalInfo}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            transfer.transfer_type && transfer.transfer_type.startsWith('€') 
                              ? 'text-green-600 dark:text-green-400' 
                              : transfer.transfer_type && transfer.transfer_type.toLowerCase() === 'loan' 
                                ? 'text-blue-600 dark:text-blue-400'
                                : transfer.transfer_type && transfer.transfer_type.toLowerCase() === 'free'
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-900 dark:text-[#AAAAAA]'
                          }`}>
                            {formatTransferType(transfer.transfer_type)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <img
                                className="h-8 w-8 rounded object-cover"
                                src={`https://viasport.b-cdn.net/football/teams/${transfer.team_out_id || 'placeholder'}.png`}
                                alt={fromTeamName}
                                onError={(e) => {
                                  e.currentTarget.src = 'https://viasport.b-cdn.net/football/teams/placeholder.png';
                                }}
                              />
                            </div>
                            <div className="ml-3">
                              <Link 
                                href={createTeamProfileUrl(fromTeamName, transfer.team_out_id)}
                                className="text-sm font-medium text-gray-900 dark:text-[#AAAAAA] hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                              >
                                {fromTeamName}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <img
                                className="h-8 w-8 rounded object-cover"
                                src={`https://viasport.b-cdn.net/football/teams/${transfer.team_in_id || 'placeholder'}.png`}
                                alt={toTeamName}
                                onError={(e) => {
                                  e.currentTarget.src = 'https://viasport.b-cdn.net/football/teams/placeholder.png';
                                }}
                              />
                            </div>
                            <div className="ml-3">
                              <Link 
                                href={createTeamProfileUrl(toTeamName, transfer.team_in_id)}
                                className="text-sm font-medium text-gray-900 dark:text-[#AAAAAA] hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                              >
                                {toTeamName}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTransferDate(transfer.transfer_date)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Add skeleton components
const TableSkeleton = () => (
  <div className="hidden sm:block">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-[#222]">
      <thead className="bg-gray-50 dark:bg-[#181818]">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Spiller
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Type
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Fra
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Til
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Dato
          </th>
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-[#181818] divide-y divide-gray-200 dark:divide-[#222]">
        {[...Array(8)].map((_, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                <div className="ml-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="ml-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="ml-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MobileCardsSkeleton = () => (
  <div className="block sm:hidden">
    {[...Array(6)].map((_, index) => (
      <div key={index} className="bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
        {/* Player info skeleton */}
        <div className="flex items-center mb-2">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          </div>
          <div className="ml-2 flex-1 min-w-0">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
        </div>
        
        {/* Transfer direction skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="ml-1 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
          </div>
          
          <div className="mx-2 text-gray-400">→</div>
          
          <div className="flex items-center flex-1 min-w-0 justify-end">
            <div className="mr-1 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default TransfersPage; 