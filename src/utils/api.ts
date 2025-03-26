import { readFile } from 'fs/promises';
import path from 'path';
import {
  getTeamInfo,
  getTeamSquad as fetchTeamSquadFromApi,
  getTeamMatches,
  getLeagueSeasons,
  BASE_URL,
  headers
} from '@/app/services/sportApi';

const DATA_DIR = path.join(process.cwd(), 'data', 'teams');

export function extractTeamId(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export async function getTeamData(teamId: number) {
  try {
    const filePath = path.join(DATA_DIR, `${teamId}.json`);
    const rawData = await readFile(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading team data:', error);
    return null;
  }
}

export async function fetchTeamSquad(teamId: number) {
  try {
    // Using the squads endpoint instead of players
    const response = await fetch(
      `${BASE_URL}/players/squads?team=${teamId}`,
      {
        headers,
        next: { revalidate: 86400 } // 24 hour cache
      }
    );

    if (!response.ok) {
      console.error(`API Error: ${response.status}. Team ID: ${teamId}`);
      throw new Error(`Failed to fetch squad data: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw squad data:', JSON.stringify(data, null, 2)); // Debug logging

    if (!data.response || !Array.isArray(data.response)) {
      console.error('Invalid squad data format:', data);
      return null;
    }

    // Map the response to match expected format
    // The squads endpoint has a different response structure
    return {
      response: [{
        players: data.response[0]?.players?.map(player => ({
          id: player.id,
          name: player.name,
          age: player.age,
          number: player.number,
          position: player.position,
          photo: player.photo,
          nationality: player.nationality
        })) || []
      }]
    };
  } catch (error) {
    console.error('Error in fetchTeamSquad:', error);
    return null;
  }
}

// Helper function to get current season
function getCurrentSeason() {
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  // If we're in the latter half of the year, use that year
  // Otherwise use the previous year as the season start
  return month >= 7 ? year : year - 1;
}

// Cache helpers (implement these based on your caching solution)
async function getCache(key: string) {
  // Implement based on your caching solution
}

async function setCache(key: string, value: string, ttl: number) {
  // Implement based on your caching solution
} 