import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTeamData, extractTeamId } from '@/utils/api';
import TabNav from '@/app/components/TabNav';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import TeamHeaderNav from '@/app/components/TeamHeaderNav';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

export default async function TeamResultsPage({ params }: { params: { slug: string } }) {
  const teamId = extractTeamId(params.slug);
  
  if (!teamId) {
    return notFound();
  }

  const teamData = await getTeamData(teamId);
  if (!teamData?.team) {
    return notFound();
  }

  // Add debug logs to see the data structure
  console.log('Debug - Full Team Data:', JSON.stringify(teamData, null, 2));
  console.log('Debug - Leagues:', JSON.stringify(teamData.leagues, null, 2));

  const fixtures = teamData.fixtures.past;
  const teamName = teamData.team.team.name;
  const leagues = teamData.leagues || [];

  // Get the last 10 matches for analysis
  const recentMatches = fixtures.slice(0, 10).reverse();
  
  // Calculate recent form
  const getMatchResult = (match: any) => {
    const isHome = match.teams.home.id === teamId;
    if (isHome) {
      if (match.goals.home > match.goals.away) return 'seier';
      if (match.goals.home < match.goals.away) return 'tap';
      return 'uavgjort';
    } else {
      if (match.goals.away > match.goals.home) return 'seier';
      if (match.goals.away < match.goals.home) return 'tap';
      return 'uavgjort';
    }
  };

  const recentResults = recentMatches.map(match => ({
    result: getMatchResult(match),
    score: `${match.goals.home}-${match.goals.away}`,
    opponent: match.teams.home.id === teamId ? match.teams.away.name : match.teams.home.name,
    isHome: match.teams.home.id === teamId,
    competition: match.league.name,
    date: new Date(match.fixture.date)
  }));

  // Find the main league (Premier League in this case)
  const mainLeague = teamData.leagues?.find(league => 
    league.league.type === 'League'
  );

  console.log('Debug - Main League:', JSON.stringify(mainLeague, null, 2));

  const generateStandingsText = () => {
    if (!mainLeague) {
      console.log('Debug - No main league found');
      return null;
    }
    
    if (!mainLeague.standings) {
      console.log('Debug - No standings in main league');
      return null;
    }

    const standings = Array.isArray(mainLeague.standings) 
      ? mainLeague.standings[0] 
      : mainLeague.standings;

    console.log('Debug - Standings:', JSON.stringify(standings, null, 2));

    if (!standings || !Array.isArray(standings)) {
      console.log('Debug - Invalid standings format');
      return null;
    }

    const currentStanding = standings.find((s: any) => s.team.id === teamId);
    console.log('Debug - Current Standing:', JSON.stringify(currentStanding, null, 2));
    
    if (!currentStanding) {
      console.log('Debug - Team not found in standings');
      return null;
    }

    const position = currentStanding.rank;
    const totalTeams = standings.length;
    const currentDate = new Date().toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Find teams directly above and below
    const currentIndex = standings.findIndex((s: any) => s.team.id === teamId);
    const teamAbove = currentIndex > 0 ? standings[currentIndex - 1] : null;
    const teamBelow = currentIndex < standings.length - 1 ? standings[currentIndex + 1] : null;

    let text = `${teamData.team.team.name} ligger på ${position}. plass i ${mainLeague.league.name} per ${currentDate}. `;

    if (teamAbove) {
      const pointsDiff = teamAbove.points - currentStanding.points;
      text += `${teamAbove.team.name} ligger over med ${pointsDiff} ${pointsDiff === 1 ? 'poeng' : 'poeng'} `;
    }

    if (teamBelow) {
      const pointsDiff = currentStanding.points - teamBelow.points;
      text += `og ${teamBelow.team.name} ligger under med ${pointsDiff} ${pointsDiff === 1 ? 'poeng' : 'poeng'} `;
    }

    text += `(${currentStanding.points} poeng totalt).`;
    return text;
  };

  // Generate analysis text
  const generateAnalysisText = () => {
    const wins = recentResults.filter(r => r.result === 'seier').length;
    const losses = recentResults.filter(r => r.result === 'tap').length;
    const draws = recentResults.filter(r => r.result === 'uavgjort').length;
    
    let text = '';

    // League position analysis
    if (mainLeague && mainLeague.standings?.[0]) {
      const standings = mainLeague.standings[0];
      const currentStanding = standings.find((s: any) => s.team.id === teamId);
      if (currentStanding) {
        const position = currentStanding.rank;
        const totalTeams = standings.length;
        const pointsFromTop = standings[0].points - currentStanding.points;
        
        if (position === 1) {
          text += `${teamName} leder nå ${mainLeague.league.name} med ${currentStanding.points} poeng. `;
        } else if (position <= 3) {
          text += `${teamName} ligger på en sterk ${position}. plass i ${mainLeague.league.name}, ${pointsFromTop} poeng bak serieleder. `;
        } else if (position <= totalTeams / 2) {
          text += `${teamName} befinner seg på ${position}. plass i ${mainLeague.league.name}, ${pointsFromTop} poeng bak serieleder. `;
        } else {
          text += `${teamName} ligger på ${position}. plass i ${mainLeague.league.name} med ${currentStanding.points} poeng. `;
        }
      }
    }

    // Recent form analysis
    text += `I de siste ti kampene har laget `;

    // Overall form description
    if (wins >= 7) {
      text += `vist eksepsjonell form med ${wins} seire`;
    } else if (wins >= 5) {
      text += `vist solid form med ${wins} seire`;
    } else if (losses >= 7) {
      text += `hatt en meget vanskelig periode med ${losses} tap`;
    } else if (losses >= 5) {
      text += `slitt med ${losses} tap`;
    } else {
      text += `vist varierende form`;
    }

    text += `. Totalt har det blitt ${wins} ${wins === 1 ? 'seier' : 'seire'}`;
    if (draws > 0) text += `, ${draws} uavgjort`;
    if (losses > 0) text += ` og ${losses} tap`;
    text += ' i denne perioden. ';

    // Detailed match analysis
    text += 'De siste kampene har gitt følgende resultater: ';
    
    recentResults.slice(-5).forEach((match, index) => {
      if (index > 0) text += ', ';
      text += `${match.result} ${match.score} ${match.isHome ? 'hjemme mot' : 'borte mot'} ${match.opponent} i ${match.competition}`;
    });

    // Goal analysis
    const totalGoalsFor = recentMatches.reduce((sum, match) => {
      const goals = match.teams.home.id === teamId ? match.goals.home : match.goals.away;
      return sum + goals;
    }, 0);

    const totalGoalsAgainst = recentMatches.reduce((sum, match) => {
      const goals = match.teams.home.id === teamId ? match.goals.away : match.goals.home;
      return sum + goals;
    }, 0);

    text += `. I disse ti kampene har ${teamName} scoret ${totalGoalsFor} mål og sluppet inn ${totalGoalsAgainst} mål.`;

    return text;
  };

  // Add debug log for the entire team data
  console.log('Debug - Team Data:', teamData);

  const tabs = [
    { name: 'Oversikt', href: `/lag/${params.slug}` },
    { name: 'Tropp', href: `/lag/${params.slug}/tropp` },
    { name: 'Resultater', href: `/lag/${params.slug}/resultater` },
    { name: 'Kamper', href: `/lag/${params.slug}/kamper` },
    { name: 'Tabell', href: `/lag/${params.slug}/tabell` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Use TeamHeaderNav component */}
      <TeamHeaderNav
        teamLogo={teamData.team.team.logo}
        teamName={`${teamData.team.team.name} - Resultater og kamphistorikk`}
        tabs={tabs}
      />

      {/* Results List */}
      <div className="space-y-2">
        {fixtures.map((fixture: any) => {
          const matchDate = new Date(fixture.fixture.date);
          // Ensure score is displayed horizontally
          const score = `${fixture.goals.home} - ${fixture.goals.away}`;
          
          return (
            <Link
              key={fixture.fixture.id}
              href={`/fotball/kamp/${fixture.fixture.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              {/* Desktop View */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-4 p-4">
                {/* Left - Date and League */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {format(matchDate, 'd. MMMM yyyy', { locale: nb })}
                  </span>
                  <span className="text-xs text-gray-500">
                    {fixture.league.name}
                  </span>
                </div>

                {/* Center - Match Result */}
                <div className="flex items-center justify-center gap-8 w-[500px]">
                  {/* Home Team */}
                  <div className="w-[180px] flex items-center justify-end">
                    <span className={`font-medium text-sm truncate ${fixture.teams.home.winner ? 'text-green-600' : ''}`}>
                      {fixture.teams.home.name}
                    </span>
                    <div className="relative h-6 w-6 ml-2 flex-shrink-0">
                      <Image
                        src={fixture.teams.home.logo}
                        alt={fixture.teams.home.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* Score - Desktop */}
                  <div className="w-[60px] px-3 py-1 bg-gray-100 rounded font-medium text-center whitespace-nowrap">
                    {score}
                  </div>

                  {/* Away Team */}
                  <div className="w-[180px] flex items-center">
                    <div className="relative h-6 w-6 mr-2 flex-shrink-0">
                      <Image
                        src={fixture.teams.away.logo}
                        alt={fixture.teams.away.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className={`font-medium text-sm truncate ${fixture.teams.away.winner ? 'text-green-600' : ''}`}>
                      {fixture.teams.away.name}
                    </span>
                  </div>
                </div>

                {/* Right - Round Info */}
                <div className="text-right text-sm text-gray-500">
                  Kampdag
                </div>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden p-4 space-y-2">
                {/* Date and Score */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-900">
                    {format(matchDate, 'd. MMMM yyyy', { locale: nb })}
                  </div>
                  <div className="text-sm font-medium bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                    {score}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {fixture.league.name}
                </div>

                {/* Teams */}
                <div className="flex items-center gap-3">
                  <div className="relative h-6 w-6 flex-shrink-0">
                    <Image
                      src={fixture.teams.home.logo}
                      alt={fixture.teams.home.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`text-sm font-medium ${fixture.teams.home.winner ? 'text-green-600' : ''}`}>
                    {fixture.teams.home.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative h-6 w-6 flex-shrink-0">
                    <Image
                      src={fixture.teams.away.logo}
                      alt={fixture.teams.away.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`text-sm font-medium ${fixture.teams.away.winner ? 'text-green-600' : ''}`}>
                    {fixture.teams.away.name}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Results Analysis Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">
          Resultater og situasjon for {teamData.team.team.name}
        </h2>
        <div className="prose prose-lg max-w-none">
          <p>{generateAnalysisText()}</p>
        </div>
      </div>
    </div>
  );
} 