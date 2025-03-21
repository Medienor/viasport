import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables from .env.local in the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

// Try to load from .env.local first, then fall back to .env
let envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(rootDir, '.env');
}
dotenv.config({ path: envPath });

// Supabase setup
const supabaseUrl = 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI';
const supabase = createClient(supabaseUrl, supabaseKey);

// API Football setup
const apiKey = process.env.RAPID_API_KEY;

if (!apiKey) {
  console.error('RAPID_API_KEY is not defined in environment variables');
  process.exit(1);
}

// Create tables manually using SQL
async function createTablesIfNotExist() {
  console.log('Checking if tables exist...');
  
  // Create leagues table
  const { error: leaguesError } = await supabase.from('leagues').select('id').limit(1);
  
  if (leaguesError && leaguesError.code === '42P01') { // Table doesn't exist
    console.log('Creating leagues table...');
    const { error } = await supabase.from('leagues').insert([
      { 
        id: -1, 
        name: 'temp', 
        type: 'temp',
        country: 'temp',
        logo: 'temp',
        flag: 'temp'
      }
    ]);
    
    if (error) {
      console.error('Error creating leagues table:', error);
    } else {
      // Delete the temporary row
      await supabase.from('leagues').delete().eq('id', -1);
    }
  }
  
  // Create teams table
  const { error: teamsError } = await supabase.from('teams').select('id').limit(1);
  
  if (teamsError && teamsError.code === '42P01') { // Table doesn't exist
    console.log('Creating teams table...');
    const { error } = await supabase.from('teams').insert([
      { 
        id: -1, 
        name: 'temp', 
        country: 'temp',
        logo: 'temp'
      }
    ]);
    
    if (error) {
      console.error('Error creating teams table:', error);
    } else {
      // Delete the temporary row
      await supabase.from('teams').delete().eq('id', -1);
    }
  }
}

async function fetchLeagues() {
  console.log('Fetching all leagues...');
  
  try {
    const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/leagues', {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });
    
    const data = await response.json();
    
    if (!data.response || data.response.length === 0) {
      console.error('No leagues found or API error:', data);
      return [];
    }
    
    console.log(`Found ${data.response.length} leagues`);
    return data.response;
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }
}

async function saveLeaguesToSupabase(leagues) {
  console.log('Saving leagues to Supabase...');
  
  // Extract unique leagues
  const uniqueLeagues = [];
  const leagueIds = new Set();
  
  for (const item of leagues) {
    const league = item.league;
    if (!leagueIds.has(league.id)) {
      leagueIds.add(league.id);
      uniqueLeagues.push({
        id: league.id,
        name: league.name,
        type: league.type,
        country: item.country.name,
        logo: league.logo,
        flag: item.country.flag,
        last_updated: new Date().toISOString()
      });
    }
  }
  
  // Insert leagues in batches to avoid hitting limits
  const batchSize = 100;
  for (let i = 0; i < uniqueLeagues.length; i += batchSize) {
    const batch = uniqueLeagues.slice(i, i + batchSize);
    const { error } = await supabase
      .from('leagues')
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error('Error saving leagues batch:', error);
    } else {
      console.log(`Saved leagues batch ${i/batchSize + 1}/${Math.ceil(uniqueLeagues.length/batchSize)}`);
    }
  }
  
  return uniqueLeagues;
}

async function fetchTeamsForLeague(leagueId) {
  console.log(`Fetching teams for league ID ${leagueId}...`);
  
  try {
    const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?league=${leagueId}&season=2024`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });
    
    const data = await response.json();
    
    if (!data.response || data.response.length === 0) {
      console.log(`No teams found for league ${leagueId}`);
      return [];
    }
    
    console.log(`Found ${data.response.length} teams for league ${leagueId}`);
    return data.response;
  } catch (error) {
    console.error(`Error fetching teams for league ${leagueId}:`, error);
    return [];
  }
}

async function saveTeamsToSupabase(teams) {
  console.log(`Saving ${teams.length} teams to Supabase...`);
  
  // Extract team data
  const teamData = teams.map(item => ({
    id: item.team.id,
    name: item.team.name,
    code: item.team.code || null,
    country: item.team.country,
    founded: item.team.founded || null,
    national: item.team.national || false,
    logo: item.team.logo,
    last_updated: new Date().toISOString()
  }));
  
  // Insert teams in batches
  const batchSize = 100;
  for (let i = 0; i < teamData.length; i += batchSize) {
    const batch = teamData.slice(i, i + batchSize);
    const { error } = await supabase
      .from('teams')
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error('Error saving teams batch:', error);
    } else {
      console.log(`Saved teams batch ${i/batchSize + 1}/${Math.ceil(teamData.length/batchSize)}`);
    }
  }
}

async function main() {
  try {
    console.log('Starting team sync process...');
    
    // Create tables if they don't exist
    await createTablesIfNotExist();
    
    // Fetch all leagues
    const leagues = await fetchLeagues();
    
    if (leagues.length === 0) {
      console.error('No leagues found. Exiting...');
      return;
    }
    
    // Save leagues to Supabase
    await saveLeaguesToSupabase(leagues);
    
    // Process top leagues first (to get the most important teams)
    const topLeagueIds = [
      39,  // Premier League
      140, // La Liga
      78,  // Bundesliga
      135, // Serie A
      61,  // Ligue 1
      88,  // Eredivisie
      94,  // Primeira Liga
      203, // Super Lig
      103, // Eliteserien (Norway)
      1,   // World Cup
      2,   // UEFA Champions League
      3,   // UEFA Europa League
      848  // UEFA Conference League
    ];
    
    // Process top leagues first
    for (const leagueId of topLeagueIds) {
      const teams = await fetchTeamsForLeague(leagueId);
      await saveTeamsToSupabase(teams);
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Process remaining leagues (limit to 50 for now to avoid hitting API limits)
    const remainingLeagues = leagues
      .filter(league => !topLeagueIds.includes(league.league.id))
      .slice(0, 50);
    
    for (const league of remainingLeagues) {
      const leagueId = league.league.id;
      const teams = await fetchTeamsForLeague(leagueId);
      await saveTeamsToSupabase(teams);
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Process completed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the script
main(); 