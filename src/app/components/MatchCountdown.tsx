'use client';

import { useEffect, useState } from 'react';
import { formatMatchDateTime } from '@/utils/dateUtils';

interface MatchCountdownProps {
  matchDate: string;
}

export default function MatchCountdown({ matchDate }: MatchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const matchTime = new Date(matchDate).getTime();
      const difference = matchTime - now;

      if (difference <= 0) {
        setTimeLeft('Starter nå');
        setIsStarting(true);
        if (timer) clearInterval(timer);
        return;
      }

      setIsStarting(false);

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}t ${minutes}m`);
      } else {
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeLeft();
    timer = setInterval(calculateTimeLeft, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [matchDate]);

  return (
    <div className="flex flex-col items-center">
      <div className="text-xl md:text-2xl font-bold text-gray-700">
        {formatMatchDateTime(matchDate).time}
      </div>
      <div
        className={`
          text-sm mt-1 transition-colors duration-300
          ${isStarting
            ? 'text-red-600 font-semibold animate-pulse'
            : 'text-gray-500'
          }
        `}
      >
        {timeLeft}
      </div>
    </div>
  );
}