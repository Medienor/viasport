'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AddLeagueButton from './AddLeagueButton';
import { favoriteLeaguesManager, FavoriteLeague } from '@/utils/favoriteLeagues';

export default function FavoriteLeagues() {
  const [favoriteLeagues, setFavoriteLeagues] = useState<FavoriteLeague[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredLeague, setHoveredLeague] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    show: boolean;
    text: string;
    x: number;
    y: number;
  }>({ show: false, text: '', x: 0, y: 0 });

  useEffect(() => {
    // Load favorites from localStorage on client side
    const favorites = favoriteLeaguesManager.getFavorites();
    setFavoriteLeagues(favorites);
    setIsLoaded(true);
  }, []);

  // Listen for storage changes (when favorites are added/removed)
  useEffect(() => {
    const handleStorageChange = () => {
      const favorites = favoriteLeaguesManager.getFavorites();
      setFavoriteLeagues(favorites);
    };

    // Listen for custom events when favorites change
    window.addEventListener('favoriteLeaguesChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('favoriteLeaguesChanged', handleStorageChange);
    };
  }, []);

  // Handle tooltip show
  const showTooltip = useCallback((event: React.MouseEvent, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      show: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  }, []);

  // Handle tooltip hide
  const hideTooltip = useCallback(() => {
    setTooltipData(prev => ({ ...prev, show: false }));
  }, []);

  const handleRemoveFavorite = (e: React.MouseEvent, leagueId: number) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    
    favoriteLeaguesManager.removeFavorite(leagueId);
    
    // Update local state immediately
    setFavoriteLeagues(prev => prev.filter(league => league.id !== leagueId));
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('favoriteLeaguesChanged'));
  };

  // Helper function to create league slug
  const createLeagueSlug = (name: string, id: number) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    return `${slug}-${id}`;
  };

  // Don't render anything until client-side hydration is complete
  if (!isLoaded) {
    return null;
  }

  // If no favorites, don't render the section at all
  if (favoriteLeagues.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wide">
          Mine Ligaer
        </h2>
        <div className="space-y-1.5">
          {favoriteLeagues.map((league) => (
            <div
              key={`favorite-${league.id}`}
              className="relative group"
              onMouseEnter={() => setHoveredLeague(league.id)}
              onMouseLeave={() => setHoveredLeague(null)}
            >
              <Link
                href={`/fotball/liga/${createLeagueSlug(league.name, league.id)}`}
                className="flex items-center p-3 bg-white dark:bg-[#222222] rounded-lg hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors duration-150 shadow-sm"
              >
                <div className="relative w-5 h-5 mr-3 flex-shrink-0">
                  <Image
                    src={`https://viasport.b-cdn.net/football/leagues/${league.id}.png`}
                    alt={league.name}
                    fill
                    className="object-contain dark:brightness-110"
                  />
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {league.name}
                </span>
              </Link>
              
              {/* Remove button - only show on hover */}
              {hoveredLeague === league.id && (
                <button
                  onClick={(e) => handleRemoveFavorite(e, league.id)}
                  onMouseEnter={(e) => showTooltip(e, 'Fjern fra favoritter')}
                  onMouseLeave={hideTooltip}
                  onMouseDown={hideTooltip}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#444444] transition-colors duration-150"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
          
          {/* Add League Button - inside the same container */}
          <div>
            <div style={{ marginTop: '5px' }}>
              <AddLeagueButton noMargin={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltipData.show && (
        <div
          className="fixed z-50 bg-[#222222] text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipData.x,
            top: tooltipData.y - 60,
            transform: 'translateX(-50%)',
            fontSize: '10px',
            padding: '8px 12px'
          }}
        >
          {tooltipData.text}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#222222]"
            style={{ top: '100%' }}
          ></div>
        </div>
      )}
    </>
  );
} 