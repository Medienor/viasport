'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ConditionalAddTeamButton from './ConditionalAddTeamButton';
import { favoriteTeamsManager, FavoriteTeam } from '@/utils/favoriteTeams';

export default function FavoriteTeams() {
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredTeam, setHoveredTeam] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    show: boolean;
    text: string;
    x: number;
    y: number;
  }>({ show: false, text: '', x: 0, y: 0 });

  // Load favorite teams on component mount
  useEffect(() => {
    const loadFavorites = () => {
      const favorites = favoriteTeamsManager.getFavorites();
      setFavoriteTeams(favorites);
      setIsLoaded(true);
    };

    loadFavorites();

    // Listen for changes in favorite teams
    const handleStorageChange = () => {
      const favorites = favoriteTeamsManager.getFavorites();
      setFavoriteTeams(favorites);
    };

    window.addEventListener('favoriteTeamsChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('favoriteTeamsChanged', handleStorageChange);
    };
  }, []);

  // Handle tooltip show
  const showTooltip = useCallback((event: React.MouseEvent, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      show: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 40
    });
  }, []);

  // Handle tooltip hide
  const hideTooltip = useCallback(() => {
    setTooltipData(prev => ({ ...prev, show: false }));
  }, []);

  // Handle remove team
  const handleRemoveTeam = useCallback((teamId: number) => {
    favoriteTeamsManager.removeFavorite(teamId);
  }, []);

  // Helper function to create team slug
  const createTeamSlug = (name: string, id: number) => {
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
  if (favoriteTeams.length === 0) {
    return null;
  }

  return (
    <>
      {isLoaded && favoriteTeams.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wide">
            Mine Lag
          </h2>
          <div className="space-y-1.5">
            {favoriteTeams.map((team) => (
              <div
                key={`favorite-${team.id}`}
                className="relative group"
                onMouseEnter={() => setHoveredTeam(team.id)}
                onMouseLeave={() => setHoveredTeam(null)}
              >
                <Link
                  href={`/lag/${createTeamSlug(team.name, team.id)}`}
                  className="flex items-center p-3 bg-white dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-[#333333] rounded-lg transition-colors duration-150 shadow-sm"
                >
                  <div className="relative w-5 h-5 mr-3 flex-shrink-0">
                    <Image
                      src={team.logo || `https://viasport.b-cdn.net/football/teams/${team.id}.png`}
                      alt={team.name}
                      fill
                      className="object-contain dark:brightness-110"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {team.name}
                    </span>
                    {team.country && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {team.country}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Remove button */}
                {hoveredTeam === team.id && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveTeam(team.id);
                    }}
                    onMouseEnter={(e) => showTooltip(e, 'Fjern fra favoritter')}
                    onMouseLeave={hideTooltip}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 transition-colors duration-150 z-10"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
            
            {/* Add Team Button - inside the same container */}
            <ConditionalAddTeamButton position="favorites" />
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltipData.show && (
        <div
          className="fixed z-50 bg-[#222222] text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
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