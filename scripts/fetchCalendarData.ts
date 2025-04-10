import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { MAJOR_LEAGUES } from '../src/scripts/teamDataFetcher';

const API_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

const headers = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
};

// Define types for the API response
interface ApiFixture {
  league: {
    id: number;
    name: string;
  };
  // Add other fixture properties as needed
}

interface ApiResponse {
  response: ApiFixture[];
  errors?: Record<string, unknown>;
}

interface CalendarDataType {
  [key: string]: ApiFixture[];
}

async function fetchMatchesForDate(date: Date): Promise<ApiFixture[]> {
  const dateStr = date.toISOString().split('T')[0];
  console.log(`Fetching matches for date: ${dateStr}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/fixtures?date=${dateStr}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json() as ApiResponse;
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`API Error for date ${dateStr}:`, data.errors);
      return [];
    }
    
    // Filter for our major leagues
    const fixtures = data.response.filter((fixture: ApiFixture) => 
      MAJOR_LEAGUES.some(league => league.id === fixture.league.id)
    );
    
    console.log(`Found ${fixtures.length} matches for date ${dateStr}`);
    return fixtures;
  } catch (error) {
    console.error(`Error fetching matches for date ${dateStr}:`, error);
    return [];
  }
}

async function fetchCalendarData(): Promise<CalendarDataType> {
  const calendarData: CalendarDataType = {};
  const today = new Date();
  
  // Fetch data for 15 days (7 days before today, today, and 7 days after today)
  for (let i = -7; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    calendarData[dateStr] = await fetchMatchesForDate(date);
  }
  
  return calendarData;
}

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting to fetch calendar data...');
  
  const calendarData = await fetchCalendarData();
  
  // Create the data file
  const dataContent = `// Auto-generated file - do not edit manually
// Last updated: ${new Date().toISOString()}

export const calendarData = ${JSON.stringify(calendarData, null, 2)};
`;
  
  const filePath = path.join(__dirname, '../src/app/data/calendarData.ts');
  fs.writeFileSync(filePath, dataContent);
  
  console.log(`Calendar data written to ${filePath}`);
}

main().catch(error => {
  console.error('Error in fetch script:', error);
  process.exit(1);
}); 