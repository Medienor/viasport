// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

// Helper function to log disabled API calls
function logDisabledCall(functionName: string, ...args: any[]) {
  console.log(`[API DISABLED] ${functionName} would have been called with:`, ...args);
  return { success: false, players: [] };
}

/**
 * Get Norwegian players data
 * @returns Object containing Norwegian players data
 */
export async function getNorwegianPlayers() {
  // Skip API call if disabled
  if (DISABLE_API_CALLS) {
    return logDisabledCall('getNorwegianPlayers');
  }

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