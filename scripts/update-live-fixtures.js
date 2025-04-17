// Import necessary modules
import { createClient } from '@supabase/supabase-js';
// Use node-fetch for compatibility with older Node.js versions if needed
// If using Node.js v18+, you can remove this import and use global fetch
import fetch from 'node-fetch';

// --- Configuration ---
const LIVE_ENDPOINT_URL = 'https://viasport.no/api/football/live';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required.");
    // Exit the script with an error code
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    // Optional: Configure fetch if using node-fetch
    // global: { fetch: fetch }
});

// --- Main Function ---
async function updateLiveFixtures() {
    console.log("Starting live fixture update process...");

    let liveApiResponse;
    try {
        console.log(`Fetching live data from ${LIVE_ENDPOINT_URL}...`);
        // Fetch data from the live endpoint
        const response = await fetch(LIVE_ENDPOINT_URL);
        // Check if the fetch was successful
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        }
        // Parse the JSON response
        liveApiResponse = await response.json();
        console.log(`Successfully fetched live data. Found ${liveApiResponse?.live?.length ?? 0} live fixtures.`);
    } catch (error) {
        console.error("Error fetching live fixture data:", error.message);
        // Stop the script if fetching fails
        return;
    }

    // Check if the 'live' array exists and has fixtures
    if (!liveApiResponse || !liveApiResponse.live || liveApiResponse.live.length === 0) {
        console.log("No live fixtures found in the API response. Nothing to update.");
        return;
    }

    // Array to hold all the update promises
    const updatePromises = [];
    let updateAttemptCount = 0;
    let skippedCount = 0;

    // Iterate over each live match found in the API response
    for (const liveMatch of liveApiResponse.live) {
        const fixtureId = liveMatch.fixture?.id;
        const fixtureStatus = liveMatch.fixture?.status; // The status object from the API

        // Basic validation for necessary data
        if (!fixtureId || !fixtureStatus || typeof fixtureStatus !== 'object' || !fixtureStatus.short) {
            console.warn(`Skipping live match due to missing ID or status object/short code. Fixture data:`, liveMatch.fixture);
            skippedCount++;
            continue; // Skip to the next fixture
        }

        // Prepare the data payload for the Supabase update
        const updatePayload = {
            match_status: fixtureStatus.short, // e.g., "1H", "HT", "FT", "PEN"
            status: fixtureStatus,             // The full status object, e.g., {"long": "First Half", "short": "1H", ...}
            // Consider adding an 'updated_at' timestamp here if needed
            // updated_at: new Date().toISOString(),
        };

        console.log(`Preparing update for fixture ID ${fixtureId}: match_status='${fixtureStatus.short}', status=${JSON.stringify(fixtureStatus)}`);
        updateAttemptCount++;

        // Create and add the update promise to the array
        // This updates the row in the 'fixtures' table where the 'id' matches fixtureId
        const updatePromise = supabase
            .from('fixtures')
            .update(updatePayload)
            .eq('id', fixtureId)
            .then(({ error, count }) => { // Supabase v2 returns { data, error, count }
                if (error) {
                    // Log errors encountered during the update
                    console.error(`Error updating fixture ID ${fixtureId}:`, error.message);
                } else {
                    // Log success, count might be 0 if the fixture ID wasn't found in Supabase
                    console.log(`Update request for fixture ID ${fixtureId} completed. Rows matched/updated: ${count ?? 'N/A'}`);
                }
            });

        updatePromises.push(updatePromise);
    }

    // Wait for all the individual update operations to settle (either complete or fail)
    try {
        await Promise.allSettled(updatePromises);
        console.log(`Finished processing updates. Attempted updates for ${updateAttemptCount} fixtures. Skipped ${skippedCount} fixtures due to missing data.`);
    } catch (error) {
        // This catch is unlikely to be hit with Promise.allSettled unless there's a fundamental issue
        console.error("An unexpected error occurred while waiting for updates to settle:", error);
    }

    console.log("Live fixture update process finished.");
}

// --- Run the Script ---
// Execute the main function and catch any top-level unhandled errors
updateLiveFixtures().catch(error => {
    console.error("Unhandled error during script execution:", error);
    process.exit(1); // Exit with error code on unhandled failure
});