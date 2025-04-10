import Image from 'next/image';
import { getStreamingProviders } from '@/utils/channelUtils';

interface LeagueChannelsProps {
  leagueId: number;
  matchStatus?: string;
}

export default function LeagueChannels({ leagueId, matchStatus }: LeagueChannelsProps) {
  const providers = getStreamingProviders(leagueId);
  
  // Return null if there are no providers or if match is finished
  if (providers.length === 0 || matchStatus === 'FT') return null;
  
  return (
    <div className="mt-6">
      {providers.map((provider, index) => (
        <div 
          key={index}
          className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-8 w-8">
              <Image
                src={provider.icon}
                alt={provider.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="text-base">
              Se kampen på {provider.name}
            </span>
          </div>
          <a 
            href={provider.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-green-600 hover:text-green-700 text-base font-medium transition-colors"
          >
            Se nå
          </a>
        </div>
      ))}
    </div>
  );
} 