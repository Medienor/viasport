import Image from 'next/image';
import Link from 'next/link';

interface OtherLeagueMatchesProps {
  leagueId: number;
  title?: string;
  currentMatchId?: string;
}

export default function OtherLeagueMatches({ leagueId, title, currentMatchId }: OtherLeagueMatchesProps) {
  // Sample data for matches in the league
  const matches = [
    {
      id: '123456',
      homeTeam: {
        id: 47,
        name: 'Tottenham',
        logo: '/images/teams/tottenham.png'
      },
      awayTeam: {
        id: 35,
        name: 'Bournemouth',
        logo: '/images/teams/bournemouth.png'
      },
      score: {
        home: 2,
        away: 2
      },
      status: 'Slutt'
    },
    {
      id: '123457',
      homeTeam: {
        id: 49,
        name: 'Chelsea',
        logo: '/images/teams/chelsea.png'
      },
      awayTeam: {
        id: 46,
        name: 'Leicester City',
        logo: '/images/teams/leicester.png'
      },
      score: {
        home: 1,
        away: 0
      },
      status: 'Slutt'
    },
    {
      id: '123458',
      homeTeam: {
        id: 33,
        name: 'Manchester United',
        logo: '/images/teams/man-united.png'
      },
      awayTeam: {
        id: 42,
        name: 'Arsenal',
        logo: '/images/teams/arsenal.png'
      },
      score: {
        home: 1,
        away: 1
      },
      status: 'Live'
    }
  ];

  // Filter matches to show only 3 at most
  const displayMatches = matches.slice(0, 3);

  return (
    <div>
      {title && <h3 className="font-medium text-gray-700 mb-2">{title}</h3>}
      
      <div className="space-y-2">
        {displayMatches.map(match => (
          <Link 
            key={match.id} 
            href={`/fotball/kamp/${match.id}`}
            className={`block p-2 rounded-md ${currentMatchId === match.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Image src={match.homeTeam.logo} alt={match.homeTeam.name} width={20} height={20} className="mr-2" />
                <span className="text-sm">{match.homeTeam.name}</span>
              </div>
              <div className="text-center mx-2">
                <div className="text-sm font-bold">
                  {match.score.home} - {match.score.away}
                </div>
                <div className="text-xs bg-gray-200 px-1.5 rounded">
                  {match.status === 'Live' ? (
                    <span className="flex items-center">
                      <span className="inline-block w-1 h-1 bg-red-500 rounded-full animate-pulse mr-1"></span>
                      Live
                    </span>
                  ) : match.status}
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm">{match.awayTeam.name}</span>
                <Image src={match.awayTeam.logo} alt={match.awayTeam.name} width={20} height={20} className="ml-2" />
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {matches.length > 3 && (
        <Link 
          href={`/fotball/liga/${leagueId}`}
          className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-2"
        >
          Se alle kamper
        </Link>
      )}
    </div>
  );
} 