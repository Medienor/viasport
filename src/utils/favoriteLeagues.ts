export interface FavoriteLeague {
  id: number;
  name: string;
  country?: string;
  type?: string;
}

export const favoriteLeaguesManager = {
  getFavorites: (): FavoriteLeague[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('viasport-favorite-leagues');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading favorite leagues:', error);
      return [];
    }
  },

  addFavorite: (league: FavoriteLeague): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      const favorites = favoriteLeaguesManager.getFavorites();
      const exists = favorites.some(fav => fav.id === league.id);
      
      if (!exists) {
        const updated = [league, ...favorites].slice(0, 20); // Limit to 20
        localStorage.setItem('viasport-favorite-leagues', JSON.stringify(updated));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding favorite league:', error);
      return false;
    }
  },

  removeFavorite: (leagueId: number): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      const favorites = favoriteLeaguesManager.getFavorites();
      const updated = favorites.filter(fav => fav.id !== leagueId);
      localStorage.setItem('viasport-favorite-leagues', JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error removing favorite league:', error);
      return false;
    }
  },

  isFavorite: (leagueId: number): boolean => {
    const favorites = favoriteLeaguesManager.getFavorites();
    return favorites.some(fav => fav.id === leagueId);
  }
}; 