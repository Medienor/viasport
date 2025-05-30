'use client';

import { useState, useEffect } from 'react';
import AddTeamButton from './AddTeamButton';
import { favoriteTeamsManager } from '@/utils/favoriteTeams';

interface ConditionalAddTeamButtonProps {
  position: 'popular' | 'favorites';
}

export default function ConditionalAddTeamButton({ position }: ConditionalAddTeamButtonProps) {
  const [hasFavoriteTeams, setHasFavoriteTeams] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkFavoriteTeams = () => {
      const favorites = favoriteTeamsManager.getFavorites();
      setHasFavoriteTeams(favorites.length > 0);
      setIsLoaded(true);
    };

    checkFavoriteTeams();

    // Listen for changes in favorite teams
    const handleStorageChange = () => {
      checkFavoriteTeams();
    };

    window.addEventListener('favoriteTeamsChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('favoriteTeamsChanged', handleStorageChange);
    };
  }, []);

  // Don't render anything until client-side hydration is complete
  if (!isLoaded) {
    return null;
  }

  // Show in popular section only if user has NO favorite teams
  if (position === 'popular' && !hasFavoriteTeams) {
    return (
      <div style={{ marginTop: '5px' }}>
        <AddTeamButton noMargin={true} />
      </div>
    );
  }

  // Show in favorites section only if user HAS favorite teams
  if (position === 'favorites' && hasFavoriteTeams) {
    return (
      <div style={{ marginTop: '5px' }}>
        <AddTeamButton noMargin={true} />
      </div>
    );
  }

  return null;
} 