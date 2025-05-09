import Image from 'next/image';
import { getStreamingProviders } from '@/utils/channelUtils';

interface LeagueChannelsProps {
  leagueId: number;
  matchStatus?: string;
}

export default function LeagueChannels({ leagueId }: LeagueChannelsProps) {
  const providers = getStreamingProviders(leagueId);
  
  // Return null if there are no providers
  if (providers.length === 0) return null;
  
  return (
    <div className="bg-white dark:bg-[#222222] rounded-lg shadow p-4 md:p-6">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Se kampen</h3>
      <div className="space-y-3">
        {providers.map((provider, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-7 w-7 flex-shrink-0">
                <Image
                  src={provider.icon}
                  alt={provider.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {provider.name}
              </span>
            </div>
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-600 dark:text-orange-500 hover:text-blue-700 dark:hover:text-orange-400 transition-colors whitespace-nowrap ml-3"
            >
              Se nå &rarr;
            </a>
          </div>
        ))}
      </div>
    </div>
  );
} 