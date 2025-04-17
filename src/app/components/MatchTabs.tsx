'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import TeamStandings from '@/app/components/TeamStandings';
import MatchStats from '@/app/components/MatchStats';
import LineupComponent from '@/app/components/LineupComponent';
import HeadToHeadTab from '@/app/components/HeadToHeadTab';
import MatchCommentary from '@/app/components/MatchCommentary';

// Initialize Supabase client
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI'
);

interface MatchTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  match: any;
  children: React.ReactNode;
}

export default function MatchTabs({ activeTab = 'facts', onTabChange, match, children }: MatchTabsProps) {
  const [selectedTab, setSelectedTab] = useState(activeTab);
  const [teamColors, setTeamColors] = useState({ home: '#0d47a1', away: '#d32f2f' });

  useEffect(() => {
    const loadTeamColors = async () => {
      try {
        const { data, error } = await supabase
          .from('team_colors')
          .select('team_id, primary_color')
          .in('team_id', [match.teams.home.id, match.teams.away.id]);

        if (error) throw error;

        const colors = (data || []).reduce((acc: any, { team_id, primary_color }) => {
          acc[team_id] = primary_color;
          return acc;
        }, {});

        setTeamColors({
          home: colors[match.teams.home.id] || '#0d47a1',
          away: colors[match.teams.away.id] || '#d32f2f'
        });
      } catch (error) {
        console.error('Error fetching team colors:', error);
      }
    };

    loadTeamColors();
  }, [match.teams.home.id, match.teams.away.id]);

  const handleTabClick = (tabId: string) => {
    setSelectedTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  // Define all possible tabs
  const allTabs = [
    { id: 'facts', label: 'Fakta' },
    { id: 'table', label: 'Tabell' },
    { id: 'commentary', label: 'Kommentarer' },
    { id: 'lineup', label: 'Lagoppstilling' },
    { id: 'stats', label: 'Statistikk' },
    { id: 'head-to-head', label: 'Oppgjør' },
  ];

  // Filter tabs based on data availability
  const hasLineups = match?.lineups && Array.isArray(match.lineups) && match.lineups.length > 0;
  const hasEventData = match?.event_data && Array.isArray(match.event_data) && match.event_data.length > 0;
  // --- Add check for player_statistics ---
  // Check if player_statistics exists, is an array, and has at least one team's stats.
  // The structure is usually [{ team: {}, statistics: [] }, { team: {}, statistics: [] }]
  const hasPlayerStats = match?.player_statistics && Array.isArray(match.player_statistics) && match.player_statistics.length > 0;

  const tabsToShow = allTabs.filter(tab => {
    // --- Updated Logic ---
    // 1. Hide 'stats' ONLY if there's no player_statistics data
    if (tab.id === 'stats' && !hasPlayerStats) {
      return false;
    }
    // 2. Hide 'lineup' ONLY if there's no lineup data
    if (tab.id === 'lineup' && !hasLineups) {
      return false;
    }
    // 3. Hide 'commentary' ONLY if there's no event data
    if (tab.id === 'commentary' && !hasEventData) {
      return false;
    }
    // 4. Otherwise, show the tab
    return true;
    // --- End Updated Logic ---
  });

  // Adjust selectedTab if the current one is hidden
  useEffect(() => {
    if (!tabsToShow.some(tab => tab.id === selectedTab)) {
      // If the currently selected tab is no longer visible (e.g., status changed),
      // default to the first available tab ('facts' or whatever is first in tabsToShow)
      const defaultTab = tabsToShow[0]?.id || 'facts';
      setSelectedTab(defaultTab);
      if (onTabChange) {
        onTabChange(defaultTab);
      }
    }
  }, [selectedTab, tabsToShow, onTabChange]); // Re-run if selectedTab or tabsToShow changes

  const seasonYear = match.league?.season ||
                     (match.date ? new Date(match.date).getFullYear() : new Date().getFullYear());

  const forcedLeagueDetailsForTable = match.league ? {
    id: match.league.id,
    name: match.league.name || 'Ukjent Liga',
    logo: match.league.logo || '/images/league-placeholder.png'
  } : undefined;

  console.log('Match data:', {
    matchSeason: match.season,
    leagueSeason: match.league?.season,
    timestamp: match.timestamp,
    calculatedSeason: seasonYear
  });

  return (
    <>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {/* Map over the filtered tabs */}
          {tabsToShow.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                ${selectedTab === tab.id
                  ? 'border-gray-900 text-gray-900 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      {selectedTab === 'head-to-head' ? (
        <HeadToHeadTab match={match} teamColors={teamColors} />
      ) : selectedTab === 'table' ? (
        forcedLeagueDetailsForTable ? (
          <TeamStandings
            teamId={match.teams.home.id}
            teamName={match.teams.home.name}
            seasons={[seasonYear]}
            highlightTeams={[match.teams.home.id, match.teams.away.id]}
            embedded={true}
            forcedLeagueDetails={forcedLeagueDetailsForTable}
          />
        ) : (
          <div className="text-center py-6 text-gray-500">Kan ikke vise tabell (mangler ligainformasjon).</div>
        )
      ) : selectedTab === 'stats' ? (
        // --- Conditionally render MatchStats based on data ---
        hasPlayerStats ? (
          <MatchStats match={match} teamColors={teamColors} />
        ) : (
          <div className="text-center py-6 text-gray-500">Ingen statistikk tilgjengelig for denne kampen ennå.</div>
        )
      ) : selectedTab === 'lineup' ? (
        // --- Conditionally render LineupComponent based on data ---
        hasLineups ? (
          <LineupComponent
            lineups={match.lineups}
            playerStats={match.player_statistics} // Pass stats even if tab logic changes
            eventData={match.event_data}
          />
        ) : (
           <div className="text-center py-6 text-gray-500">Ingen lagoppstilling tilgjengelig for denne kampen ennå.</div>
        )
      ) : selectedTab === 'facts' ? (
        <>
          {children}
        </>
      ) : selectedTab === 'commentary' ? (
         // --- Conditionally render MatchCommentary based on data ---
         hasEventData ? (
           <MatchCommentary match={match} />
         ) : (
           <div className="text-center py-6 text-gray-500">Ingen kommentarer tilgjengelig for denne kampen ennå.</div>
         )
      ) : null}
    </>
  );
} 