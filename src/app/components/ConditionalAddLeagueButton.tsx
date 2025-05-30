'use client';

import { useState, useEffect } from 'react';
import AddLeagueButton from './AddLeagueButton';
import { favoriteLeaguesManager } from '@/utils/favoriteLeagues';

interface ConditionalAddLeagueButtonProps {
  position: 'favorites' | 'popular';
}

export default function ConditionalAddLeagueButton({ position }: ConditionalAddLeagueButtonProps) {
  const [hasFavorites, setHasFavorites] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if user has favorite leagues
    const favorites = favoriteLeaguesManager.getFavorites();
    setHasFavorites(favorites.length > 0);
    setIsLoaded(true);
  }, []);

  // Listen for changes in favorite leagues
  useEffect(() => {
    const handleStorageChange = () => {
      const favorites = favoriteLeaguesManager.getFavorites();
      setHasFavorites(favorites.length > 0);
    };

    window.addEventListener('favoriteLeaguesChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('favoriteLeaguesChanged', handleStorageChange);
    };
  }, []);

  // Don't render until loaded to prevent hydration issues
  if (!isLoaded) {
    return null;
  }

  // Show button in favorites section if user has favorites AND this is the favorites position
  // Show button in popular section if user has NO favorites AND this is the popular position
  const shouldShow = (hasFavorites && position === 'favorites') || (!hasFavorites && position === 'popular');

  return shouldShow ? <AddLeagueButton /> : null;
} 