export interface FavoriteTeam {
  id: number;
  name: string;
  country?: string;
  logo?: string;
}

class FavoriteTeamsManager {
  private storageKey = 'viasport-favorite-teams';

  getFavorites(): FavoriteTeam[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error parsing favorite teams:', error);
      return [];
    }
  }

  addFavorite(team: FavoriteTeam): void {
    const favorites = this.getFavorites();
    const existingIndex = favorites.findIndex(fav => fav.id === team.id);
    
    if (existingIndex === -1) {
      favorites.unshift(team);
      
      // Limit to 20 favorite teams
      if (favorites.length > 20) {
        favorites.splice(20);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(favorites));
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('favoriteTeamsChanged'));
    }
  }

  removeFavorite(teamId: number): void {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(fav => fav.id !== teamId);
    
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('favoriteTeamsChanged'));
  }

  isFavorite(teamId: number): boolean {
    return this.getFavorites().some(fav => fav.id === teamId);
  }
}

export const favoriteTeamsManager = new FavoriteTeamsManager(); 