"use client"

import { useEffect, useState } from 'react';
import { getTeamInjuries } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

interface Injury {
  player: {
    id: number;
    name: string;
    photo: string;
  };
  type: string;
  reason: string;
  start: string;
  end: string | null;
}

interface TeamInjuriesProps {
  teamId: number;
}

export default function TeamInjuries({ teamId }: TeamInjuriesProps) {
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInjuries() {
      try {
        setLoading(true);
        
        // Skip API call if disabled
        if (DISABLE_API_CALLS) {
          console.log(`[API DISABLED] Would have fetched injuries for teamId: ${teamId}`);
          
          // Mock injuries data
          const mockInjuries = [
            {
              player: {
                id: 101,
                name: "Marcus Rashford",
                photo: "https://media.api-sports.io/football/players/101.png"
              },
              type: "Muscle Injury",
              reason: "Hamstring",
              start: "2023-10-15",
              end: "2023-11-05"
            },
            {
              player: {
                id: 102,
                name: "Luke Shaw",
                photo: "https://media.api-sports.io/football/players/102.png"
              },
              type: "Knock",
              reason: "Ankle",
              start: "2023-10-22",
              end: null
            },
            {
              player: {
                id: 103,
                name: "Lisandro Martinez",
                photo: "https://media.api-sports.io/football/players/103.png"
              },
              type: "Surgery",
              reason: "Foot",
              start: "2023-09-30",
              end: "2023-12-15"
            }
          ];
          
          setInjuries(mockInjuries);
          setLoading(false);
          return;
        }
        
        const data = await getTeamInjuries(teamId);
        setInjuries(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching injuries:', err);
        setError('Failed to load injuries');
        setLoading(false);
      }
    }

    if (teamId) {
      fetchInjuries();
    }
  }, [teamId]);

  if (loading) return <div>Loading injuries...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!injuries.length) return <div>No injuries reported</div>;

  return (
    <div className="overflow-x-auto">
      {/* Your existing injuries table rendering code */}
    </div>
  );
} 