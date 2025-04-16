// scripts/fetch-lineups.js

import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
const PRE_MATCH_MINUTES_THRESHOLD = 65; // How many minutes ahead to check for matches
const CATCH_UP_HOURS_THRESHOLD = 3; // How many hours back to check for missed matches

// Define status codes for matches considered "in progress"
// Adjust this list based on your API's specific short codes!
const IN_PROGRESS_STATUS_CODES = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'INT'];

console.log(`DEBUG: Using SUPABASE_URL: ${SUPABASE_URL ? '***' : 'MISSING'}`); // Mask URL in logs

// Basic validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RAPIDAPI_KEY || !RAPIDAPI_HOST) {
  console.error('Error: Missing required environment variables (Secrets).');
  // Add more detailed debug logs if needed
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchLineups() {
  console.log('🚀 Starting lineup fetch process...');
  const allMatchesToUpdate = new Map(); // Use a Map to store unique matches by ID

  try {
    const now = new Date();
    const preMatchThresholdTime = new Date(now.getTime() + PRE_MATCH_MINUTES_THRESHOLD * 60 * 1000);
    const catchUpThresholdTime = new Date(now.getTime() - CATCH_UP_HOURS_THRESHOLD * 60 * 60 * 1000);

    // --- Query 1: Pre-Match Check ---
    console.log(`1. Checking for fixtures starting between ${now.toISOString()} and ${preMatchThresholdTime.toISOString()}`);
    const { data: preMatches, error: preMatchError } = await supabase
      .from('fixtures')
      .select('id, date')
      .eq('status->>short', 'NS') // Not Started
      .is('lineups_last_updated', null)
      .lt('date', preMatchThresholdTime.toISOString())
      .gte('date', now.toISOString());

    if (preMatchError) {
      console.error('🔴 Error fetching pre-matches from Supabase:', preMatchError.message);
      // Decide if you want to stop or continue if this part fails
    } else if (preMatches && preMatches.length > 0) {
      console.log(`ℹ️ Found ${preMatches.length} pre-matches needing updates.`);
      preMatches.forEach(match => allMatchesToUpdate.set(match.id, match));
    } else {
      console.log('✅ No pre-matches need lineup updates right now.');
    }

    // --- Query 2: Catch-Up Check ---
    console.log(`2. Checking for fixtures started between ${catchUpThresholdTime.toISOString()} and ${now.toISOString()} that were missed.`);
    const { data: catchUpMatches, error: catchUpError } = await supabase
      .from('fixtures')
      .select('id, date')
      .in('status->>short', IN_PROGRESS_STATUS_CODES) // Match is in progress
      .is('lineups_last_updated', null) // Still needs lineup update
      .gte('date', catchUpThresholdTime.toISOString()) // Started within last X hours
      .lt('date', now.toISOString()); // Started before now

    if (catchUpError) {
      console.error('🔴 Error fetching catch-up matches from Supabase:', catchUpError.message);
      // Decide if you want to stop or continue if this part fails
    } else if (catchUpMatches && catchUpMatches.length > 0) {
      console.log(`ℹ️ Found ${catchUpMatches.length} catch-up matches needing updates.`);
      catchUpMatches.forEach(match => {
        if (!allMatchesToUpdate.has(match.id)) { // Avoid adding duplicates if somehow caught by both queries
             allMatchesToUpdate.set(match.id, match);
        }
      });
    } else {
      console.log('✅ No catch-up matches need lineup updates right now.');
    }

    // --- Process Combined List ---
    const uniqueMatches = Array.from(allMatchesToUpdate.values());

    if (uniqueMatches.length === 0) {
      console.log('🏁 No matches require processing in this run.');
      return;
    }

    console.log(`⚙️ Processing a total of ${uniqueMatches.length} unique matches.`);

    let updatedCount = 0;
    const errors = [];

    for (const match of uniqueMatches) {
      const fixtureId = match.id;
      console.log(`--- Processing fixture ${fixtureId} ---`);

      try {
        // Call RapidAPI (same as before)
        const apiUrl = `https://${RAPIDAPI_HOST}/v3/fixtures/lineups?fixture=${fixtureId}`;
        console.log(`📞 Calling RapidAPI: ${apiUrl}`);
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST,
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`🔴 RapidAPI error for fixture ${fixtureId}: ${response.status} ${response.statusText}`, errorBody);
          errors.push(`Fixture ${fixtureId}: API Error ${response.status}`);
          continue;
        }
        const lineupData = await response.json();
        if (!lineupData || !lineupData.response || lineupData.response.length === 0) {
          console.warn(`⚠️ No lineup data returned from API for fixture ${fixtureId}. Skipping update.`);
          // Consider if you want to update lineups_last_updated here anyway
          // await supabase.from('fixtures').update({ lineups_last_updated: new Date().toISOString() }).eq('id', fixtureId);
          continue;
        }
        console.log(`✅ Received lineup data for fixture ${fixtureId}.`);

        // Update Supabase (same as before)
        const updatePayload = {
          lineups: lineupData.response,
          lineups_last_updated: new Date().toISOString(),
        };
        console.log(`🔄 Updating Supabase for fixture ${fixtureId}...`);
        const { error: updateError } = await supabase
          .from('fixtures')
          .update(updatePayload)
          .eq('id', fixtureId);

        if (updateError) {
          console.error(`🔴 Error updating Supabase for fixture ${fixtureId}:`, updateError.message);
          errors.push(`Fixture ${fixtureId}: Supabase Update Error`);
        } else {
          console.log(`✅ Successfully updated lineups for fixture ${fixtureId}`);
          updatedCount++;
        }
      } catch (fetchUpdateError) {
        console.error(`🔴 Unexpected error processing fixture ${fixtureId}:`, fetchUpdateError);
        errors.push(`Fixture ${fixtureId}: Unexpected Error - ${fetchUpdateError.message}`);
      }
      console.log(`--- Finished processing fixture ${fixtureId} ---`);
    } // End loop

    console.log(`🏁 Lineup fetch process finished. Total Processed: ${uniqueMatches.length}, Updated: ${updatedCount}, Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.warn('⚠️ Errors occurred:', errors);
    }

  } catch (error) {
    console.error('💥 Unhandled error in main fetchLineups function:', error);
    process.exit(1);
  }
}

// Run the main function
fetchLineups();
