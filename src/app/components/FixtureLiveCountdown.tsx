'use client';

import { useState, useEffect } from 'react';
import { formatDistanceStrict, differenceInSeconds, parseISO, format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface FixtureLiveCountdownProps {
  matchDate: string; // ISO date string
}

const FixtureLiveCountdown: React.FC<FixtureLiveCountdownProps> = ({ matchDate }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isPast, setIsPast] = useState<boolean>(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  useEffect(() => {
    try {
      setTargetDate(parseISO(matchDate));
    } catch (error) {
      console.error("Error parsing match date for countdown:", error);
      setTimeLeft("Ugyldig dato");
      setTargetDate(null);
    }
  }, [matchDate]);

  useEffect(() => {
    if (!targetDate) return; // Don't start interval if date is invalid

    let intervalId: NodeJS.Timeout | null = null;

    const calculateTimeLeft = () => {
      const now = new Date();
      const secondsDifference = differenceInSeconds(targetDate, now);

      if (secondsDifference <= 0) {
        setTimeLeft('Starter nå');
        setIsPast(true);
        if (intervalId) clearInterval(intervalId);
        return;
      }

      const formattedDistance = formatDistanceStrict(targetDate, now, {
        addSuffix: true,
        locale: nb,
        unit: secondsDifference < 60 * 60 ? 'minute' : secondsDifference < 60 * 60 * 24 ? 'hour' : 'day',
        roundingMethod: 'floor'
      });

      setTimeLeft(formattedDistance.replace(/^om /, 'Starter om ')); // More robust replacement
      setIsPast(false);
    };

    calculateTimeLeft();
    intervalId = setInterval(calculateTimeLeft, 1000); // Update every second

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [targetDate]); // Rerun effect if targetDate changes

  if (!targetDate) {
     return <div className="text-red-600 text-sm">Ugyldig kampdato</div>;
  }

  return (
    <div className="text-center">
      <div className={`text-xl md:text-2xl font-semibold mb-1 ${isPast ? 'text-green-600' : 'text-gray-700'}`}>
        {timeLeft}
      </div>
      <div className="text-xs text-gray-500">
        {format(targetDate, "EEEE d. MMMM 'kl.' HH:mm", { locale: nb })}
      </div>
    </div>
  );
};

export default FixtureLiveCountdown; 