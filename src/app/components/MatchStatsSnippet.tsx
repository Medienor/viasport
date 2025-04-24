'use client';

import React from 'react';
import MomentumChart from './MomentumChart';

// --- Helper Functions (Consider moving to a utils file if used elsewhere) ---

/**
 * Checks if a hex color is light or dark to determine text contrast.
 * @param color - Hex color string (e.g., "#RRGGBB").
 * @returns True if the color is considered light, false otherwise.
 */
const isLightColor = (color: string): boolean => {
  if (!color || color.length < 4) return false; // Basic validation

  // Convert hex to RGB
  const hex = color.replace('#', '');
  let r: number, g: number, b: number;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else {
    return false; // Invalid hex length
  }

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Threshold can be adjusted (0.5 - 0.6 is common)
  return luminance > 0.55;
};

// --- Interfaces (Align with your data structure) ---

interface Statistic {
  type: string;
  value: string | number | null;
}

interface TeamStats {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: Statistic[];
}

interface MatchEvent {
  time: { elapsed: number; extra?: number | null };
  team: { id: number };
  type: string;
  detail?: string;
}

interface MatchStatsSnippetProps {
  matchId: number;
  fixtureStatistics: TeamStats[] | null | undefined;
  teamColors: {
    home: string;
    away: string;
  };
  onShowAllStats?: () => void;
  initialEvents: MatchEvent[] | null | undefined;
  matchStatusShort: string | null | undefined;
  matchStartDate: string | null | undefined;
  lastUpdatedAt: string | null | undefined;
}

// --- Helper to find a specific stat value ---
const findStatValue = (stats: Statistic[] | undefined, type: string): string | number | null => {
  if (!stats) return null;
  // Handle potential variations in stat type naming (e.g., xG)
  const stat = stats.find(s => s.type === type || (type === 'Expected goals (xG)' && s.type === 'expected_goals'));
  return stat?.value ?? null;
};


// --- Component ---

export default function MatchStatsSnippet({
  matchId,
  fixtureStatistics,
  teamColors,
  onShowAllStats,
  initialEvents,
  matchStatusShort,
  matchStartDate,
  lastUpdatedAt,
}: MatchStatsSnippetProps) {

  // --- Data Validation & Extraction ---
  const hasData = fixtureStatistics && fixtureStatistics.length >= 2;
  const homeStats = hasData ? fixtureStatistics[0].statistics : undefined;
  const awayStats = hasData ? fixtureStatistics[1].statistics : undefined;

  // Extract specific stats (provide defaults)
  const ballPossessionHome = findStatValue(homeStats, 'Ball Possession') as string || '0%';
  const ballPossessionAway = findStatValue(awayStats, 'Ball Possession') as string || '0%';
  // Ensure xG is treated as a number, default to 0.0 if null/missing
  const xGHome = Number(findStatValue(homeStats, 'Expected goals (xG)') ?? 0).toFixed(2);
  const xGAway = Number(findStatValue(awayStats, 'Expected goals (xG)') ?? 0).toFixed(2);
  const totalShotsHome = findStatValue(homeStats, 'Total Shots') ?? 0;
  const totalShotsAway = findStatValue(awayStats, 'Total Shots') ?? 0;
  const bigChancesHome = findStatValue(homeStats, 'Big Chances') ?? 0;
  const bigChancesAway = findStatValue(awayStats, 'Big Chances') ?? 0;

  // Determine text colors based on background
  const homeTextColor = isLightColor(teamColors.home) ? '#000000' : '#FFFFFF';
  const awayTextColor = isLightColor(teamColors.away) ? '#000000' : '#FFFFFF';

  const hasEventData = initialEvents && initialEvents.length > 0;

  // --- Render Logic ---

  if (!hasData) {
    // Optional: Render a loading state or minimal placeholder if desired
    return (
        <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center text-gray-500">
            Statistikk ikke tilgjengelig ennå.
        </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Column 1: Momentum Chart */}
        <div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-[#f3f4f6]">
          <h3 className="text-[14px] font-[500] mb-3 text-gray-700">Momentum</h3>
          {/* Render MomentumChart if data is available */}
          {matchId && initialEvents !== undefined ? (
             <MomentumChart
               matchId={matchId}
               initialEvents={initialEvents || []}
               homeTeamId={fixtureStatistics?.[0]?.team?.id ?? 0} // Get IDs safely
               awayTeamId={fixtureStatistics?.[1]?.team?.id ?? 0}
               teamColors={teamColors}
               matchStatusShort={matchStatusShort}
               matchStartDate={matchStartDate}
               lastUpdatedAt={lastUpdatedAt}
             />
           ) : (
             <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">
               Momentum data unavailable.
             </div>
           )}
        </div>

        {/* Column 2: Top Stats */}
        <div className="p-4 md:p-6">
          <h3 className="text-[14px] font-[500] mb-4 text-gray-700">Nøkkelstatistikk</h3>
          <div className="space-y-4"> {/* Increased spacing slightly */}

            {/* Ball Possession */}
            <div>
              <div className="text-sm text-center mb-1.5 text-gray-600">Ballbesittelse</div>
              <div className="flex justify-between gap-2"> {/* Changed to flex with gap, removed h-7, rounded-full and overflow-hidden */}
                {/* Home Bar */}
                <div
                  className="flex items-center justify-start pl-2 text-xs font-bold rounded-full h-7" // Added h-7 here
                  style={{
                    width: ballPossessionHome,
                    backgroundColor: teamColors.home,
                    color: homeTextColor,
                    transition: 'width 0.5s ease-in-out',
                  }}
                  title={`Home Possession: ${ballPossessionHome}`}
                >
                  {ballPossessionHome}
                </div>
                {/* Away Bar */}
                <div
                  className="flex items-center justify-end pr-2 text-xs font-bold rounded-full h-7" // Added h-7 here
                  style={{
                    width: ballPossessionAway,
                    backgroundColor: teamColors.away,
                    color: awayTextColor,
                    transition: 'width 0.5s ease-in-out',
                  }}
                  title={`Away Possession: ${ballPossessionAway}`}
                >
                  {ballPossessionAway}
                </div>
              </div>
            </div>

            {/* Other Stats (xG, Shots, Big Chances) */}
            {[
              { label: 'Forventede mål (xG)', homeVal: xGHome, awayVal: xGAway },
              { label: 'Totalt antall skudd', homeVal: totalShotsHome, awayVal: totalShotsAway },
              { label: 'Store sjanser', homeVal: bigChancesHome, awayVal: bigChancesAway },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between text-sm">
                {/* Home Value Pill */}
                <span
                  className="font-semibold px-2.5 py-0.5 rounded-full text-xs min-w-[30px] text-center" // Pill styling
                  style={{
                    backgroundColor: teamColors.home,
                    color: homeTextColor,
                  }}
                >
                  {stat.homeVal}
                </span>
                {/* Label */}
                <span className="text-gray-600 text-center mx-2 text-xs flex-shrink-0">{stat.label}</span>
                {/* Away Value Pill */}
                <span
                  className="font-semibold px-2.5 py-0.5 rounded-full text-xs min-w-[30px] text-center" // Pill styling
                  style={{
                    backgroundColor: teamColors.away,
                    color: awayTextColor,
                  }}
                >
                  {stat.awayVal}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
       {/* "All stats" Button/Link Area */}
       <div className="text-center border-t border-[#f3f4f6]">
         <button
            onClick={onShowAllStats}
            className="w-full py-2.5 px-4 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!onShowAllStats} // Disable if no handler provided
            aria-label="Se all kampstatistikk"
          >
           All statistikk
         </button>
       </div>
    </div>
  );
} 