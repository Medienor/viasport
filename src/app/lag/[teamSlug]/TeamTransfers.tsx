"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Define types for the props
interface TeamTransfersProps {
  teamId: number;
  transfers: any[]; // Accept transfers as a prop instead of fetching
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

export default function TeamTransfers({ teamId, transfers }: TeamTransfersProps) {
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Feil!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-10">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen overganger</h3>
        <p className="mt-1 text-sm text-gray-500">Det er ingen registrerte overganger for dette laget.</p>
      </div>
    );
  }

  if (filteredTransfers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Overganger</h2>
          
          {/* Filter by year */}
          <div className="flex space-x-2">
            <select 
              className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen overganger i {selectedYear}</h3>
          <p className="mt-1 text-sm text-gray-500">Det er ingen registrerte overganger for dette laget i {selectedYear}.</p>
        </div>
      </div>
    );
  }

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