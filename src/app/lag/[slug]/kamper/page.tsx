import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { extractTeamId } from '@/utils/helpers';
import TabNav from '@/app/components/TabNav';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import TeamHeaderNav from '@/app/components/TeamHeaderNav';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SupabaseFixture {
  id: number;
  date: string;
  status: {
    short?: string;
    long?: string;
    elapsed?: number | null;
    [key: string]: any;
  };
  league_id: number;
  home_team_id: number;
  home_team: { team_id: number; name: string | null; logo: string | null } | null;
  away_team_id: number;
  away_team: { team_id: number; name: string | null; logo: string | null } | null;
  score?: {
    halftime?: { home: number | null; away: number | null };
    fulltime?: { home: number | null; away: number | null };
    extratime?: { home: number | null; away: number | null };
    penalty?: { home: number | null; away: number | null };
  } | null;
  round: string | null;
  venue: { id: number | null; name: string | null; city: string | null } | null;
  league: { id: number | null; name: string | null; logo: string | null; country: string | null; flag: string | null } | null;
}

const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
const terminalStatuses = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'];

interface TeamDetails {
  team_id: number;
  name: string | null;
  logo: string | null;
}

export default async function TeamFixturesPage({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    console.error('[TeamFixturesPage] No team ID found in slug:', params.slug);
    return notFound();
  }

  console.log(`[TeamFixturesPage] Fetching data for team ID: ${teamId}`);

  const { data: currentTeamData, error: currentTeamError } = await supabase
    .from('fotball_teams')
    .select('team_id, name, logo')
    .eq('team_id', teamId)
    .maybeSingle();

  if (currentTeamError) {
    console.error(`[TeamFixturesPage] 🚨 Error fetching current team details for ID ${teamId}:`, currentTeamError);
  }
  if (!currentTeamData) {
    console.warn(`[TeamFixturesPage] ⚠️ Current team details not found for ID ${teamId}.`);
  }

  console.log(`[TeamFixturesPage] Querying Supabase for upcoming/live fixtures for team ${teamId}`);
  const { data: rawFixtureData, error: fixtureError } = await supabase
    .from('fixtures')
    .select('id, date, status, league_id, home_team_id, away_team_id, score, round, venue, league')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .not('status->>short', 'in', `(${terminalStatuses.join(',')})`)
    .order('date', { ascending: true })
    .limit(50);

  if (fixtureError) {
    console.error('[TeamFixturesPage] 🚨 Error fetching upcoming fixture data from Supabase:', fixtureError);
  }

  const fixturesData = rawFixtureData || [];
  let teamDetailsMap = new Map<number, TeamDetails>();

  if (fixturesData.length > 0) {
    const opponentTeamIds = new Set<number>();
    fixturesData.forEach(f => {
      if (f.home_team_id && f.home_team_id !== teamId) opponentTeamIds.add(f.home_team_id);
      if (f.away_team_id && f.away_team_id !== teamId) opponentTeamIds.add(f.away_team_id);
    });

    opponentTeamIds.add(teamId);

    if (opponentTeamIds.size > 0) {
      console.log(`[TeamFixturesPage] Fetching details for ${opponentTeamIds.size} teams from fotball_teams`);
      const { data: teamsData, error: teamsError } = await supabase
        .from('fotball_teams')
        .select('team_id, name, logo')
        .in('team_id', Array.from(opponentTeamIds));

      if (teamsError) {
        console.error('[TeamFixturesPage] 🚨 Error fetching opponent team details:', teamsError);
      } else if (teamsData) {
        teamsData.forEach((team: TeamDetails) => {
          teamDetailsMap.set(team.team_id, team);
        });
        console.log(`[TeamFixturesPage] ✅ Successfully fetched and mapped details for ${teamDetailsMap.size} teams.`);
      }
    }
  } else {
     console.log(`[TeamFixturesPage] 🤔 No upcoming fixtures found for team ${teamId}.`);
  }

  const fixtures: SupabaseFixture[] = fixturesData.map((f): SupabaseFixture => {
    const homeTeamDetails = teamDetailsMap.get(f.home_team_id) || null;
    const awayTeamDetails = teamDetailsMap.get(f.away_team_id) || null;
    const venueInfo = f.venue ? { id: f.venue.id || null, name: f.venue.name || null, city: f.venue.city || null } : null;
    const leagueInfo = f.league ? { id: f.league.id || null, name: f.league.name || null, logo: f.league.logo || null, country: f.league.country || null, flag: f.league.flag || null } : null;
    const scoreInfo = f.score ? {
        halftime: f.score.halftime || null,
        fulltime: f.score.fulltime || null,
        extratime: f.score.extratime || null,
        penalty: f.score.penalty || null,
    } : null;
    const statusInfo = f.status && typeof f.status === 'object' ? f.status : {};

    return {
      id: f.id,
      date: f.date,
      status: statusInfo,
      league_id: f.league_id,
      home_team_id: f.home_team_id,
      home_team: homeTeamDetails ? { team_id: homeTeamDetails.team_id, name: homeTeamDetails.name, logo: homeTeamDetails.logo } : null,
      away_team_id: f.away_team_id,
      away_team: awayTeamDetails ? { team_id: awayTeamDetails.team_id, name: awayTeamDetails.name, logo: awayTeamDetails.logo } : null,
      score: scoreInfo,
      round: f.round || null,
      venue: venueInfo,
      league: leagueInfo,
    };
  });

  console.log(`[TeamFixturesPage] Mapped ${fixtures.length} upcoming/live fixtures.`);

  const tabs = [
    { name: 'Oversikt', href: `/lag/${params.slug}` },
    { name: 'Tropp', href: `/lag/${params.slug}/tropp` },
    { name: 'Resultater', href: `/lag/${params.slug}/resultater` },
    { name: 'Kamper', href: `/lag/${params.slug}/kamper` },
    { name: 'Tabell', href: `/lag/${params.slug}/tabell` },
  ];

  const teamLogo = currentTeamData?.logo ?? '/images/team-placeholder.png';
  const teamName = currentTeamData?.name ?? `Team ${teamId}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TeamHeaderNav
        teamLogo={teamLogo}
        teamName={`${teamName} - Kommende kamper`}
        tabs={tabs}
      />

      <div className="mt-8 space-y-3">
        {fixtures.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Ingen kommende kamper funnet</p>
          </div>
        ) : (
          fixtures.map((fixture: SupabaseFixture) => {
            const matchDate = parseISO(fixture.date);
            const statusShort = fixture.status?.short;
            const elapsed = fixture.status?.elapsed;
            const isLive = statusShort && liveStatuses.includes(statusShort);

            console.log(`[TeamFixturesPage] ⏱️ Rendering Fixture ID: ${fixture.id}, Status: ${statusShort}, Elapsed: ${elapsed}, IsLive: ${isLive}`);

            const homeTeamName = fixture.home_team?.name ?? `Team ${fixture.home_team_id}`;
            const homeTeamLogo = fixture.home_team?.logo?.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') ?? '/images/team-placeholder.png';
            const awayTeamName = fixture.away_team?.name ?? `Team ${fixture.away_team_id}`;
            const awayTeamLogo = fixture.away_team?.logo?.replace('https://media.api-sports.io', 'https://viasport.b-cdn.net') ?? '/images/team-placeholder.png';

            return (
              <Link
                key={fixture.id}
                href={`/fotball/kamp/${fixture.id}`}
                className="block bg-white dark:bg-[#181818] rounded-lg border border-gray-200 dark:border-none shadow-sm hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
              >
                <div className="hidden sm:flex items-center justify-between p-4 gap-4">
                  <div className="flex-shrink-0 w-40 text-xs">
                    <span className="block font-medium text-gray-900 dark:text-gray-200">
                      {format(matchDate, 'EEEE d. MMM', { locale: nb })}
                    </span>
                    <span className="block text-gray-500 dark:text-gray-400 truncate" title={fixture.league?.name ?? ''}>
                      {fixture.league?.name ?? 'Ukjent liga'}
                    </span>
                    <span className="block text-gray-400 dark:text-gray-500 truncate" title={fixture.venue?.name ?? ''}>
                      {fixture.venue?.name ?? 'Ukjent stadion'}
                    </span>
                  </div>

                  <div className="flex-grow flex items-center justify-center gap-3 min-w-0">
                    <div className="flex items-center justify-end gap-2 text-right flex-1 min-w-0">
                      <span className="font-medium text-sm truncate dark:text-gray-200" title={homeTeamName}>
                        {homeTeamName}
                      </span>
                      <div className="relative h-6 w-6 flex-shrink-0">
                        <Image
                          src={homeTeamLogo}
                          alt={homeTeamName}
                          fill
                          className="object-contain"
                          sizes="24px"
                        />
                      </div>
                    </div>

                    <div className={`w-auto px-3 py-1 rounded text-sm font-semibold flex-shrink-0 
                                     ${isLive 
                                        ? 'bg-[#00985f]/10 text-[#00985f] dark:bg-[#00985f]/20 dark:text-[#20c997]'
                                        : 'bg-gray-100 text-gray-800 dark:bg-[#222222] dark:text-gray-200'
                                     }`}>
                      {(() => {
                          if (isLive) {
                              if (statusShort === 'HT') return 'HT';
                              if (typeof elapsed === 'number') return `${elapsed}'`;
                              return 'Live';
                          }
                          try {
                              return format(matchDate, "HH:mm", { locale: nb });
                          } catch {
                              return '--:--';
                          }
                      })()}
                    </div>

                    <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                      <div className="relative h-6 w-6 flex-shrink-0">
                        <Image
                          src={awayTeamLogo}
                          alt={awayTeamName}
                          fill
                          className="object-contain"
                          sizes="24px"
                        />
                      </div>
                      <span className="font-medium text-sm truncate dark:text-gray-200" title={awayTeamName}>
                        {awayTeamName}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 w-10 text-right text-gray-400 dark:text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>

                <div className="sm:hidden p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      {format(matchDate, 'E d. MMM', { locale: nb })}
                    </span>
                    <span className={`font-semibold 
                                     ${isLive 
                                        ? 'text-[#00985f] dark:text-[#20c997]'
                                        : 'text-gray-900 dark:text-gray-200'
                                     }`}>
                      {(() => {
                          if (isLive) {
                              if (statusShort === 'HT') return 'HT';
                              if (typeof elapsed === 'number') return `${elapsed}'`;
                              return 'Live';
                          }
                          try {
                              return format(matchDate, "HH:mm", { locale: nb });
                          } catch {
                              return '--:--';
                          }
                      })()}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 truncate" title={fixture.league?.name ?? ''}>
                      {fixture.league?.name ?? 'Ukjent liga'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative h-5 w-5 flex-shrink-0">
                      <Image
                        src={homeTeamLogo}
                        alt={homeTeamName}
                        fill
                        className="object-contain"
                        sizes="20px"
                      />
                    </div>
                    <span className="text-sm font-medium truncate dark:text-gray-200">
                      {homeTeamName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative h-5 w-5 flex-shrink-0">
                      <Image
                        src={awayTeamLogo}
                        alt={awayTeamName}
                        fill
                        className="object-contain"
                        sizes="20px"
                      />
                    </div>
                    <span className="text-sm font-medium truncate dark:text-gray-200">
                      {awayTeamName}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 pt-1 text-center truncate" title={fixture.venue?.name ?? ''}>
                    {fixture.venue?.name ?? 'Ukjent stadion'}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
} 