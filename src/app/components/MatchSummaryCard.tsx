'use client';

import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

interface MatchSummaryCardProps {
  match: any;
}

// Move the helper functions inside the component file
function formatMatchDateTime(dateString: string) {
  const date = parseISO(dateString);
  return {
    dayName: format(date, 'EEEE', { locale: nb }),
    fullDate: format(date, 'd. MMMM yyyy', { locale: nb }),
    time: format(date, 'HH:mm', { locale: nb })
  };
}

function generateMatchSummary(match: any): string {
  const homeTeam = match.teams?.home?.name || 'Hjemmelag';
  const awayTeam = match.teams?.away?.name || 'Bortelag';
  const homeGoals = match.goals?.home ?? 0;
  const awayGoals = match.goals?.away ?? 0;

  let summary = '';
  
  if (homeGoals > awayGoals) {
    summary = `${homeTeam} vant ${homeGoals}-${awayGoals} mot ${awayTeam}.`;
  } else if (awayGoals > homeGoals) {
    summary = `${awayTeam} vant ${awayGoals}-${homeGoals} mot ${homeTeam}.`;
  } else {
    summary = `${homeTeam} og ${awayTeam} spilte ${homeGoals}-${awayGoals}.`;
  }

  // Add goal scorers if available
  if (match.event_data && Array.isArray(match.event_data)) {
    const goals = match.event_data.filter(event => event?.type === 'Goal');
    if (goals.length > 0) {
      const scorers = goals.map(goal => goal.player?.name).filter(Boolean);
      const uniqueScorers = [...new Set(scorers)];
      if (uniqueScorers.length > 0) {
        summary += ` Målscorere var ${uniqueScorers.join(', ')}.`;
      }
    }

    // Add cards info
    const redCards = match.event_data.filter(event => 
      event?.type === 'Card' && event?.detail === 'Red Card'
    );
    if (redCards.length > 0) {
      summary += ` ${redCards.length} røde kort ble vist i kampen.`;
    }
  }

  return summary;
}

function getStreamingProviders(leagueId: number) {
  const providers = [
    { id: 39, name: 'TV 2 Play Premium', leagues: [39] }, // Premier League
    { id: 140, name: 'TV 2 Play Premium', leagues: [140] }, // La Liga
    { id: 78, name: 'TV 2 Play Premium', leagues: [78] }, // Bundesliga
    { id: 135, name: 'TV 2 Play Premium', leagues: [135] }, // Serie A
    { id: 61, name: 'TV 2 Play Premium', leagues: [61] }, // Ligue 1
    { id: 103, name: 'TV 2 Play Premium', leagues: [103] }, // Eliteserien
  ];
  
  return providers.filter(provider => provider.leagues.includes(leagueId));
}

function getTopScorer(eventData: any[]): [string, number] {
  if (!eventData || !Array.isArray(eventData)) return ['Ingen målscorer', 0];
  
  const goals = eventData.filter(event => event?.type === 'Goal');
  if (goals.length === 0) return ['Ingen målscorer', 0];
  
  const scorerCounts: { [key: string]: number } = {};
  
  goals.forEach(goal => {
    const scorer = goal.player?.name;
    if (scorer) {
      scorerCounts[scorer] = (scorerCounts[scorer] || 0) + 1;
    }
  });
  
  const entries = Object.entries(scorerCounts);
  if (entries.length === 0) return ['Ingen målscorer', 0];
  
  const topScorer = entries.reduce((a, b) => 
    a[1] > b[1] ? a : b
  );
  
  return [topScorer[0], topScorer[1]];
}

export default function MatchSummaryCard({ match }: MatchSummaryCardProps) {
  return (
    <div className="bg-white dark:bg-[#181818] rounded-lg py-4 px-3">
      <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100 pb-2 border-b border-[#f3f4f6] dark:border-[#232323]">
        Kampens hendelser
      </h3>
      
      {/* Match summary */}
      <p className="text-sm text-gray-800 dark:text-gray-200 mb-4">
        {generateMatchSummary(match)}
      </p>
      
      {/* About the match */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100 mt-8">Om kampen</h2>
        
        <div className="space-y-3 text-gray-700 dark:text-gray-300">
          {/* Match info paragraph */}
          <p className="text-sm">
            {match.teams.home.name} spiller hjemme mot {match.teams.away.name} på{' '}
            {match.venue?.name || 'ukjent arena'} {formatMatchDateTime(match.date).dayName}{' '}
            {formatMatchDateTime(match.date).fullDate} kl.{' '}
            {formatMatchDateTime(match.date).time}. 
            {match.league.round && (
              <> Dette er {match.league.round} av {match.league.name}.</>
            )}
          </p>

          {/* Lineups info */}
          <p className="text-sm">
            Forventet lagoppstilling blir tilgjengelig noen dager før kampstart, 
            mens den faktiske lagoppstillingen blir publisert cirka én time før avspark.
          </p>

          {/* Streaming info */}
          {getStreamingProviders(match.league.id).length > 0 && (
            <p className="text-sm">
              Se kampen på{' '}
              {getStreamingProviders(match.league.id)
                .map(provider => provider.name)
                .join(' / ')}.
            </p>
          )}
        </div>
      </div>

      {/* Q&A accordion */}
      {match.match_status === 'FT' && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100 mt-8">Spørsmål og svar</h2>
          
          <div className="divide-y divide-[#f3f4f6] dark:divide-[#232323]">
            {/* Winner Question */}
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer py-3 hover:bg-gray-50 dark:hover:bg-[#232323] text-gray-800 dark:text-gray-200">
                <span className="text-sm font-medium">
                  Hvem vant mellom {match.teams.home.name} og {match.teams.away.name} {formatMatchDateTime(match.date).fullDate}?
                </span>
                <svg className="w-5 h-5 transition-transform group-open:rotate-180 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="py-3 bg-gray-50 dark:bg-[#232323] text-gray-700 dark:text-gray-300">
                {match.goals.home > match.goals.away ? (
                  <p className="text-sm">{match.teams.home.name} vant {match.goals.home}-{match.goals.away} mot {match.teams.away.name}.</p>
                ) : match.goals.home < match.goals.away ? (
                  <p className="text-sm">{match.teams.away.name} vant {match.goals.away}-{match.goals.home} mot {match.teams.home.name}.</p>
                ) : (
                  <p className="text-sm">Kampen endte uavgjort {match.goals.home}-{match.goals.away}.</p>
                )}
              </div>
            </details>

            {/* Top Scorer Question */}
            {match.event_data && match.event_data.some((e: any) => e.type === 'Goal') && (
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer py-3 hover:bg-gray-50 dark:hover:bg-[#232323] text-gray-800 dark:text-gray-200">
                  <span className="text-sm font-medium">Hvilken spiller scoret flest mål i kampen?</span>
                  <svg className="w-5 h-5 transition-transform group-open:rotate-180 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="py-3 bg-gray-50 dark:bg-[#232323] text-gray-700 dark:text-gray-300">
                  {(() => {
                    const [topScorer, goals] = getTopScorer(match.event_data);
                    return (
                      <p className="text-sm">
                        {topScorer} scoret {goals} {goals === 1 ? 'mål' : 'mål'} i kampen.
                      </p>
                    );
                  })()}
                </div>
              </details>
            )}

            {/* All Scorers Question */}
            {match.event_data && match.event_data.some((e: any) => e.type === 'Goal') && (
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer py-3 hover:bg-gray-50 dark:hover:bg-[#232323] text-gray-800 dark:text-gray-200">
                  <span className="text-sm font-medium">Hvem scoret målene i denne kampen?</span>
                  <svg className="w-5 h-5 transition-transform group-open:rotate-180 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="py-3 bg-gray-50 dark:bg-[#232323] text-gray-700 dark:text-gray-300">
                  <div className="space-y-2">
                    {match.event_data
                      .filter((e: any) => e.type === 'Goal')
                      .sort((a: any, b: any) => a.time.elapsed - b.time.elapsed)
                      .map((goal: any, index: number) => (
                        <p key={index} className="text-sm">
                          {goal.time.elapsed}&apos; - {goal.player.name}
                          {goal.assist && ` (Assist: ${goal.assist.name})`}
                        </p>
                      ))}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 