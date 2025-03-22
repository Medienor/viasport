"use client"

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getTeamTransfers } from '@/app/services/sportApi';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

// Define types for the props
interface TeamTransfersProps {
  teamId: number;
}

// Norwegian translations for transfer types
const transferTypeTranslations: Record<string, string> = {
  'Permanent': 'Permanent',
  'Loan': 'Lån',
  'Free': 'Gratis',
  'N/A': 'Ukjent',
  'Unknown': 'Ukjent'
};

// Sort options
type SortOption = 'recent' | 'fee' | 'loan' | 'free';

interface Transfer {
  player: {
    id: number;
    name: string;
  };
  update: string; // Date of transfer
  type: 'In' | 'Out';
  teams: {
    in: {
      id: number;
      name: string;
      logo: string;
    };
    out: {
      id: number;
      name: string;
      logo: string;
    };
  };
}

export default function TeamTransfers({ teamId }: TeamTransfersProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filteredTransfers, setFilteredTransfers] = useState<any[]>([]);
  
  // Get unique years from transfers for the filter dropdown
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    
    if (!transfers || transfers.length === 0) {
      return [currentYear];
    }
    
    const years = new Set<number>();
    // Always include current year
    years.add(currentYear);
    
    transfers.forEach(transfer => {
      // Check the update date
      if (transfer.update) {
        try {
          const updateDate = new Date(transfer.update);
          if (!isNaN(updateDate.getTime())) {
            const year = updateDate.getFullYear();
            if (year >= 2000 && year <= currentYear) { // Sanity check for valid years
              years.add(year);
            }
          }
        } catch (e) {
          console.error("Error parsing date:", transfer.update);
        }
      }
      
      // Check individual transfer dates
      if (transfer.transfers && Array.isArray(transfer.transfers)) {
        transfer.transfers.forEach((t: any) => {
          if (t.date) {
            try {
              const transferDate = new Date(t.date);
              if (!isNaN(transferDate.getTime())) {
                const year = transferDate.getFullYear();
                if (year >= 2000 && year <= currentYear) { // Sanity check for valid years
                  years.add(year);
                }
              }
            } catch (e) {
              console.error("Error parsing date:", t.date);
            }
          }
        });
      }
    });
    
    // If no valid years were found (besides current year), add a few recent years
    if (years.size <= 1) {
      for (let i = 1; i <= 5; i++) {
        years.add(currentYear - i);
      }
    }
    
    // Convert to array and sort descending (newest first)
    return Array.from(years).sort((a, b) => b - a);
  };
  
  const availableYears = getAvailableYears();
  
  // Filter transfers by year
  useEffect(() => {
    if (!transfers || transfers.length === 0) {
      setFilteredTransfers([]);
      return;
    }
    
    const filtered = transfers.filter(transfer => {
      // Check the update date
      if (transfer.update) {
        const updateYear = new Date(transfer.update).getFullYear();
        if (updateYear === selectedYear) return true;
      }
      
      // Check individual transfer dates
      if (transfer.transfers) {
        return transfer.transfers.some((t: any) => {
          if (t.date) {
            const transferYear = new Date(t.date).getFullYear();
            return transferYear === selectedYear;
          }
          return false;
        });
      }
      
      return false;
    });
    
    setFilteredTransfers(filtered);
  }, [transfers, selectedYear]);

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) {
      return `${diffDays} ${diffDays === 1 ? 'dag' : 'dager'} siden`;
    } else if (diffDays <= 60) {
      return '1 måned siden';
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} måneder siden`;
    }
  };

  // Function to translate transfer type
  const translateTransferType = (type: string) => {
    return transferTypeTranslations[type] || type;
  };

  // Function to sort transfers
  const sortTransfers = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    const sortedData = [...data];
    
    switch (sortBy) {
      case 'recent':
        return sortedData.sort((a, b) => {
          const dateA = a.update ? new Date(a.update).getTime() : 0;
          const dateB = b.update ? new Date(b.update).getTime() : 0;
          return dateB - dateA;
        });
      case 'fee':
        return sortedData.sort((a, b) => {
          // This is a simplified approach - in a real app you'd need to parse the fee values
          const feeA = a.transfers?.[0]?.fee || '';
          const feeB = b.transfers?.[0]?.fee || '';
          // Extract numeric values from fee strings (e.g. "€10M" -> 10)
          const valueA = parseInt(feeA.replace(/[^0-9]/g, '') || '0');
          const valueB = parseInt(feeB.replace(/[^0-9]/g, '') || '0');
          return valueB - valueA;
        });
      case 'loan':
        return sortedData.filter(item => 
          item.transfers?.some((t: any) => t.type === 'Loan')
        ).concat(
          sortedData.filter(item => 
            !item.transfers?.some((t: any) => t.type === 'Loan')
          )
        );
      case 'free':
        return sortedData.filter(item => 
          item.transfers?.some((t: any) => t.type === 'Free')
        ).concat(
          sortedData.filter(item => 
            !item.transfers?.some((t: any) => t.type === 'Free')
          )
        );
      default:
        return sortedData;
    }
  };

  const sortedTransfers = sortTransfers(filteredTransfers);

  useEffect(() => {
    async function fetchTransfers() {
      try {
        setLoading(true);
        
        // Skip API call if disabled
        if (DISABLE_API_CALLS) {
          console.log(`[API DISABLED] Would have fetched transfers for teamId: ${teamId}`);
          
          // Mock transfers data
          const mockTransfers = [
            {
              player: { id: 201, name: "Mason Mount" },
              update: "2023-07-15",
              type: "In",
              teams: {
                in: { id: teamId, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" },
                out: { id: 49, name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" }
              }
            },
            {
              player: { id: 202, name: "André Onana" },
              update: "2023-07-20",
              type: "In",
              teams: {
                in: { id: teamId, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" },
                out: { id: 505, name: "Inter", logo: "https://media.api-sports.io/football/teams/505.png" }
              }
            },
            {
              player: { id: 203, name: "David de Gea" },
              update: "2023-06-30",
              type: "Out",
              teams: {
                in: { id: 0, name: "Free Agent", logo: "https://media.api-sports.io/football/teams/0.png" },
                out: { id: teamId, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" }
              }
            }
          ];
          
          setTransfers(mockTransfers);
          setLoading(false);
          return;
        }
        
        const data = await getTeamTransfers(teamId);
        setTransfers(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching transfers:', err);
        setError('Failed to load transfers');
        setLoading(false);
      }
    }

    if (teamId) {
      fetchTransfers();
    }
  }, [teamId]);

  if (loading) return <div>Loading transfers...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!transfers.length) return <div>No transfers available</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Overganger</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Filter by year */}
          <select 
            className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          {/* Sort options */}
          <select 
            className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="recent">Nyeste først</option>
            <option value="fee">Høyeste overgangssum</option>
            <option value="loan">Lån</option>
            <option value="free">Gratis overganger</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-4">
        {sortedTransfers.map((transferItem, index) => (
          <div key={index} className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
            <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Overgang
              </h3>
              <p className="text-sm text-gray-500">
                {transferItem.update ? formatDate(transferItem.update) : 'Ukjent dato'}
              </p>
            </div>
            
            <div className="border-t border-gray-200">
              {transferItem.transfers && transferItem.transfers.map((transfer: any, tIndex: number) => (
                transfer.teams && transfer.teams.in && transfer.teams.out && (
                  <div key={`${index}-${tIndex}`} className="px-4 py-4 sm:p-6 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      {transferItem.player && (
                        <div className="flex-shrink-0 mr-4">
                          <Image
                            src={`https://media.api-sports.io/football/players/${transferItem.player.id}.png`}
                            alt={transferItem.player.name || 'Player'}
                            width={64}
                            height={64}
                            className="rounded-full object-cover"
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=?';
                            }}
                          />
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-lg font-semibold">
                          {transferItem.player?.name || 'Ukjent spiller'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {transferItem.player?.age ? `${transferItem.player.age} år` : ''}
                          {transferItem.player?.nationality ? ` • ${transferItem.player.nationality}` : ''}
                          {transfer.type ? ` • ${translateTransferType(transfer.type)}` : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-7 items-center">
                      {/* From team */}
                      <div className="col-span-3 flex items-center justify-end">
                        <div className="text-right mr-3">
                          <p className="text-sm font-medium text-gray-900">
                            {transfer.teams?.out?.name || 'Ukjent lag'}
                          </p>
                        </div>
                        {transfer.teams?.out?.logo && (
                          <div className="flex-shrink-0 h-12 w-12 relative">
                            <Image
                              src={transfer.teams.out.logo}
                              alt={transfer.teams.out.name || 'From team'}
                              width={48}
                              height={48}
                              className="object-contain"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Transfer arrow and details */}
                      <div className="col-span-1 flex flex-col items-center justify-center">
                        {/* Arrow */}
                        <div className="text-blue-500 mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                        
                        {/* Transfer type */}
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transfer.type === 'Loan' ? 'bg-blue-100 text-blue-800' : 
                          transfer.type === 'Free' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {translateTransferType(transfer.type) || 'Overgang'}
                        </div>
                        
                        {/* Date */}
                        {transfer.date && (
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(transfer.date).toLocaleDateString('no-NO')}
                          </span>
                        )}
                      </div>
                      
                      {/* To team */}
                      <div className="col-span-3 flex items-center">
                        {transfer.teams?.in?.logo && (
                          <div className="flex-shrink-0 h-12 w-12 relative">
                            <Image
                              src={transfer.teams.in.logo}
                              alt={transfer.teams.in.name || 'To team'}
                              width={48}
                              height={48}
                              className="object-contain"
                            />
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {transfer.teams?.in?.name || 'Ukjent lag'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 