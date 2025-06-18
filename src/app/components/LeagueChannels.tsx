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
    <div className="bg-white dark:bg-[#181818] rounded-lg border border-gray-100 dark:border-none overflow-hidden mb-8">
      <div className="p-4 border-b border-gray-100 dark:border-none">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Se kampen</h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {providers.map((provider, index) => (
            <a
              key={index}
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-[#333333] rounded-lg transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 flex-shrink-0">
                  <Image
                    src={provider.icon}
                    alt={provider.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {provider.name}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
} 