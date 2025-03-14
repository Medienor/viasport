import Image from 'next/image';

export default function NorwegianPlayers() {
  // Sample data for Norwegian players abroad
  const norwegianPlayers = [
    {
      id: 1,
      name: 'Ødegaard',
      firstName: 'Martin',
      team: 'Arsenal',
      teamId: 'ARS',
      teamLogo: '/images/teams/arsenal.png',
      status: 'Starter',
      statusColor: 'bg-green-500',
      matchTime: '32\'',
      matchStatus: 'Live',
      opponent: 'Manchester United',
      isHome: true
    },
    {
      id: 2,
      name: 'Sørloth',
      firstName: 'Alexander',
      team: 'Atletico Madrid',
      teamId: 'ATM',
      teamLogo: '/images/teams/atletico.png',
      status: 'Spilte 32\'',
      statusColor: 'bg-yellow-500',
      matchTime: null,
      matchStatus: 'Slutt',
      opponent: 'Villarreal',
      isHome: false
    },
    {
      id: 3,
      name: 'Nyland',
      firstName: 'Ørjan',
      team: 'Sevilla',
      teamId: 'SEV',
      teamLogo: '/images/teams/sevilla.png',
      status: 'Live',
      statusColor: 'bg-red-500',
      matchTime: null,
      matchStatus: 'Live',
      opponent: 'Real Betis',
      isHome: true
    },
    {
      id: 4,
      name: 'Østigård',
      firstName: 'Leo',
      team: 'Napoli',
      teamId: 'NAP',
      teamLogo: '/images/teams/napoli.png',
      status: 'Starter',
      statusColor: 'bg-green-500',
      matchTime: null,
      matchStatus: 'I dag 20:45',
      opponent: 'Roma',
      isHome: false
    }
  ];

  return (
    <div className="space-y-3">
      {norwegianPlayers.map(player => (
        <div key={player.id} className="flex items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
          <div className="flex-shrink-0 w-12 h-12 relative bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {player.firstName.charAt(0)}{player.name.charAt(0)}
            </span>
            {player.matchStatus === 'Live' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          
          <div className="ml-3 flex-grow">
            <div className="flex items-center">
              <span className="font-medium">{player.name}</span>
              {player.matchStatus === 'Live' && (
                <span className="ml-2 text-xs bg-gradient-to-t from-red-700 to-red-500 text-white px-1.5 py-0.5 rounded-full flex items-center">
                  <span className="inline-block w-1 h-1 bg-white bg-opacity-70 rounded-full animate-pulse mr-1"></span>
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <Image src={player.teamLogo} alt={player.team} width={16} height={16} className="mr-1" />
              <span>{player.teamId}</span>
              <span className="mx-1">•</span>
              <span>{player.status}</span>
            </div>
          </div>
          
          <div className="flex-shrink-0 text-right text-xs">
            <div className="font-medium">{player.matchStatus}</div>
            <div className="text-gray-600">
              {player.isHome ? player.opponent : `@ ${player.opponent}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 