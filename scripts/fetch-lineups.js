// scripts/fetch-lineups.js

import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
const MINUTES_THRESHOLD = 65; // How many minutes ahead to check for matches

// Basic validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RAPIDAPI_KEY || !RAPIDAPI_HOST) {
  console.error('Error: Missing required environment variables (Secrets).');
  process.exit(1); // Exit with error code
}

// Initialize Supabase client (use service role key for server-side operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchLineups() {
  console.log('🚀 Starting lineup fetch process...');

  try {
    // 1. Find matches starting soon that need lineups
    const now = new Date();
    const thresholdTime = new Date(now.getTime() + MINUTES_THRESHOLD * 60 * 1000);

    console.log(`Checking for fixtures between ${now.toISOString()} and ${thresholdTime.toISOString()}`);

    const { data: matchesToUpdate, error: fetchError } = await supabase
      .from('fixtures')
      .select('id, date') // Select only needed columns
      .eq('status', 'NS')
      .is('lineups_last_updated', null)
      .lt('date', thresholdTime.toISOString())
      .gte('date', now.toISOString());

    if (fetchError) {
      console.error('🔴 Error fetching matches from Supabase:', fetchError.message);
      throw fetchError; // Stop execution if we can't get matches
    }

    if (!matchesToUpdate || matchesToUpdate.length === 0) {
      console.log('✅ No matches need lineup updates right now.');
      return; // Nothing to do
    }

    console.log(`ℹ️ Found ${matchesToUpdate.length} matches needing lineup updates.`);

    let updatedCount = 0;
    const errors = [];

    // 2. Loop through matches and fetch/update lineups
    for (const match of matchesToUpdate) {
      const fixtureId = match.id;
      console.log(`--- Processing fixture ${fixtureId} ---`);

      try {
        // 3. Call RapidAPI
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
          continue; // Skip to next match
        }

        const lineupData = await response.json();

        if (!lineupData || !lineupData.response || lineupData.response.length === 0) {
          console.warn(`⚠️ No lineup data returned from API for fixture ${fixtureId}. Skipping update.`);
          // Optional: Update lineups_last_updated anyway to prevent retries?
          // await supabase.from('fixtures').update({ lineups_last_updated: new Date().toISOString() }).eq('id', fixtureId);
          continue; // Skip to next match
        }

        console.log(`✅ Received lineup data for fixture ${fixtureId}.`);

        // 4. Update Supabase
        const updatePayload = {
          lineups: lineupData.response, // Store the actual lineup data
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

    console.log(`🏁 Lineup fetch process finished. Updated: ${updatedCount}, Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.warn('⚠️ Errors occurred:', errors);
    }

  } catch (error) {
    console.error('💥 Unhandled error in main fetchLineups function:', error);
    process.exit(1); // Exit with error code
  }
}

// Run the main function
fetchLineups();
