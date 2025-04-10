import { NextResponse } from 'next/server';

// Cache to store our data
let liveMatchesCache: any = null;
let finishedMatchesCache: any = null;
let lastLiveUpdate = 0;
let lastFinishedUpdate = 0;
let lastDataCleanup = 0;

export async function GET() {
  const now = Date.now();
  
  // Check if we need to clean up old data (once per day)
  const shouldCleanupData = !lastDataCleanup || (now - lastDataCleanup) > 24 * 60 * 60 * 1000;
  
  if (shouldCleanupData) {
    console.log('Cleaning up old match data...');
    // Reset all data at the start of a new day
    const currentDate = new Date().toDateString();
    const lastUpdateDate = lastDataCleanup ? new Date(lastDataCleanup).toDateString() : null;
    
    if (lastUpdateDate !== currentDate) {
      liveMatchesCache = null;
      finishedMatchesCache = null;
      console.log('Match data cleared for new day');
    }
    
    lastDataCleanup = now;
  }
  
  // Check if we need to update live matches (every 2 minutes)
  const shouldUpdateLive = !lastLiveUpdate || (now - lastLiveUpdate) > 2 * 60 * 1000;
  
  // Check if we need to update finished matches (every hour)
  const shouldUpdateFinished = !lastFinishedUpdate || (now - lastFinishedUpdate) > 60 * 60 * 1000;
  
  try {
    // Fetch live matches if needed
    if (shouldUpdateLive) {
      console.log('Fetching live matches from API...');
      const liveResponse = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all', {
        method: 'GET',
        headers: {
          'x-rapidapi-key': process.env.FOOTBALL_API_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
      });
      
      if (liveResponse.ok) {
        liveMatchesCache = await liveResponse.json();
        lastLiveUpdate = now;
        console.log(`Updated live matches cache with ${liveMatchesCache?.response?.length || 0} matches`);
      } else {
        console.error('Failed to fetch live matches:', await liveResponse.text());
      }
    }
    
    // Fetch finished matches if needed
    if (shouldUpdateFinished) {
      console.log('Fetching finished matches from API...');
      const today = new Date().toISOString().split('T')[0];
      const finishedResponse = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${today}&status=FT`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': process.env.FOOTBALL_API_KEY || '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90',
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
      });
      
      if (finishedResponse.ok) {
        const data = await finishedResponse.json();
        console.log('Finished matches API Response:', {
          totalMatches: data?.response?.length,
          matches: data?.response?.map((m: any) => ({
            id: m.fixture.id,
            teams: `${m.teams.home.name} vs ${m.teams.away.name}`,
            status: m.fixture.status,
            league: m.league.id,
            score: `${m.goals.home}-${m.goals.away}`
          }))
        });
        
        finishedMatchesCache = data;
        lastFinishedUpdate = now;
        console.log(`Updated finished matches cache at ${new Date(lastFinishedUpdate).toISOString()}`);
        console.log(`Next update will be at ${new Date(lastFinishedUpdate + 60 * 60 * 1000).toISOString()}`);
      } else {
        console.error('Failed to fetch finished matches:', await finishedResponse.text());
      }
    }
    
    // Return combined data
    const responseData = {
      live: liveMatchesCache?.response || [],
      finished: finishedMatchesCache?.response || [],
      lastLiveUpdate,
      lastFinishedUpdate,
      lastDataCleanup
    };
    
    console.log(`Returning data with ${responseData.live.length} live matches and ${responseData.finished.length} finished matches`);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error fetching football data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch football data', details: error.message },
      { status: 500 }
    );
  }
} 