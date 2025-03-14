"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { searchPlayers, createPlayerSlug } from '@/lib/api';

export default function PlayerSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search for players when debounced query changes
  useEffect(() => {
    async function performSearch() {
      if (debouncedQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const results = await searchPlayers(debouncedQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching players:', err);
        setError('Kunne ikke søke etter spillere. Prøv igjen senere.');
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Søk etter spillere</h2>
        
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk etter spillernavn (minst 3 tegn)"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            minLength={3}
          />
          {isLoading && (
            <div className="absolute right-3 top-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {searchQuery.length > 0 && searchQuery.length < 3 && (
          <div className="mt-4 text-sm text-gray-500">
            Skriv minst 3 tegn for å søke.
          </div>
        )}
      </div>
      
      {searchResults.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Søkeresultater</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((player) => (
              <Link 
                key={player.player.id}
                href={`/spillerprofil/${createPlayerSlug(player.player.name, player.player.id)}`}
                className="flex items-center p-4 border rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="flex-shrink-0 h-16 w-16 relative mr-4">
                  {player.player.photo ? (
                    <Image
                      src={player.player.photo}
                      alt={player.player.name}
                      fill
                      className="rounded-full object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">{player.player.name}</h3>
                  <div className="text-sm text-gray-500">
                    {player.statistics && player.statistics[0]?.team?.name ? (
                      <div className="flex items-center">
                        {player.statistics[0].team.logo && (
                          <Image
                            src={player.statistics[0].team.logo}
                            alt={player.statistics[0].team.name}
                            width={16}
                            height={16}
                            className="mr-1"
                          />
                        )}
                        <span>{player.statistics[0].team.name}</span>
                      </div>
                    ) : (
                      <span>Ukjent lag</span>
                    )}
                  </div>
                  {player.player.age && (
                    <div className="text-xs text-gray-500">
                      Alder: {player.player.age}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {debouncedQuery.length >= 3 && searchResults.length === 0 && !isLoading && (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">Ingen spillere funnet for &ldquo;{debouncedQuery}&rdquo;</p>
          <p className="text-sm text-gray-400 mt-2">Prøv et annet søk</p>
        </div>
      )}
    </div>
  );
} 