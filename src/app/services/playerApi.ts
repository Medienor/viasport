
/**
 * Get Norwegian players data
 * @returns Object containing Norwegian players data
 */
export async function getNorwegianPlayers() {
  try {
    const response = await fetch('/api/football/norwegian-players');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Norwegian players:', error);
    return { success: false, players: [] };
  }
} 