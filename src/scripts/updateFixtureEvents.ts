// WARNING: Hardcoded credentials is not recommended for production or shared code.
// These should ideally be loaded from environment variables.

// --- BEGIN Hardcoded Credentials and Configuration ---
const SCRIPT_SUPABASE_URL = 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const SCRIPT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Nzg0MDEsImV4cCI6MjA1ODE1NDQwMX0.kfDN39vw2ulre8ndNcytD-ISo9YXjptsBIfuH1p1HCg';
const RAPIDAPI_KEY = '1a7dc8ba9cmshff75c6099ce0152p158153jsnac5252d21d90';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SCRIPT_SUPABASE_URL, SCRIPT_SUPABASE_ANON_KEY);
// --- END Hardcoded Credentials and Configuration ---

import colors from 'ansi-colors';

interface FixtureToUpdate {
  id: number;
}

const PAGE_SIZE = 1000;
const API_CALLS_PER_MINUTE = 600;
const DELAY_BETWEEN_CALLS = Math.ceil(60000 / API_CALLS_PER_MINUTE); // ~100ms delay

// Rate limiter
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFixtureEvents(fixtureId: number): Promise<any> {
  const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures/events?fixture=${fixtureId}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Debug logging
  console.log(colors.gray(`Fixture ${fixtureId}: results=${data.results}, response length=${data.response?.length || 0}`));
  if (data.response?.length === 0) {
    console.log(colors.yellow(`⚠️  Empty response for fixture ${fixtureId}`));
  }
  
  // Extract just the response array, not the entire wrapper
  return data.response || [];
}

async function updateFixtureEvents() {
  console.log(colors.cyan('🔄 Starting Fixture Events Update...'));
  console.log(colors.gray('Fetching events for finished matches missing data\n'));

  // First, get count of all finished fixtures missing events
  console.log(colors.yellow('📋 Counting fixtures that need events...'));
  
  const { count: totalCount, error: countError } = await supabase
    .from('fixtures')
    .select('*', { count: 'exact', head: true })
    .eq('match_status', 'FT')
    .is('event_data', null);

  if (countError) {
    console.error(colors.red('❌ Error counting fixtures:'), countError.message);
    return;
  }

  if (!totalCount || totalCount === 0) {
    console.log(colors.green('✅ No fixtures need event updates!'));
    return;
  }

  console.log(colors.cyan(`📊 Found ${totalCount.toLocaleString()} fixtures needing events`));
  console.log(colors.gray(`Rate limit: ${API_CALLS_PER_MINUTE} calls/minute (~${DELAY_BETWEEN_CALLS}ms delay between calls)\n`));

  let successCount = 0;
  let errorCount = 0;
  let emptyResponseCount = 0;
  let startTime = Date.now();
  let currentPage = 0;

  // Process in batches
  while (currentPage * PAGE_SIZE < totalCount) {
    const from = currentPage * PAGE_SIZE;
    const to = Math.min((currentPage + 1) * PAGE_SIZE - 1, totalCount - 1);

    console.log(colors.gray(`\nFetching batch ${currentPage + 1}: records ${from + 1}-${to + 1}...`));

    const { data: fixturesToUpdate, error: selectError } = await supabase
      .from('fixtures')
      .select('id')
      .eq('match_status', 'FT')
      .is('event_data', null)
      .range(from, to)
      .order('id', { ascending: true });

    if (selectError) {
      console.error(colors.red('❌ Error fetching fixtures batch:'), selectError.message);
      break;
    }

    if (!fixturesToUpdate || fixturesToUpdate.length === 0) {
      console.log(colors.yellow('⚠️  No more fixtures found in this batch'));
      break;
    }

    // Process this batch
    for (let i = 0; i < fixturesToUpdate.length; i++) {
      const fixture = fixturesToUpdate[i] as FixtureToUpdate;
      const overallIndex = currentPage * PAGE_SIZE + i;
      
      try {
        // Progress update
        if (overallIndex % 50 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = overallIndex > 0 ? (overallIndex / elapsed * 60).toFixed(1) : '0';
          console.log(colors.yellow(`Progress: ${overallIndex}/${totalCount} (${rate} calls/min)`));
        }

        // Fetch events from API using the id column
        const eventsResponse = await fetchFixtureEvents(fixture.id);
        
        // Track empty responses
        if (Array.isArray(eventsResponse) && eventsResponse.length === 0) {
          emptyResponseCount++;
        }
        
        // Update the database with raw response
        const { error: updateError } = await supabase
          .from('fixtures')
          .update({ event_data: eventsResponse })
          .eq('id', fixture.id);

        if (updateError) {
          console.error(colors.red(`❌ DB update error for fixture ${fixture.id}:`), updateError.message);
          errorCount++;
        } else {
          successCount++;
          if (overallIndex % 100 === 0 && overallIndex > 0) {
            console.log(colors.green(`✅ Updated fixture ${fixture.id} (${successCount} successful so far)`));
          }
        }

        // Rate limiting delay
        if (overallIndex < totalCount - 1) {
          await delay(DELAY_BETWEEN_CALLS);
        }

      } catch (error: any) {
        console.error(colors.red(`❌ API error for fixture ${fixture.id}:`), error.message);
        errorCount++;
        
        // Still apply delay even on error to maintain rate limit
        if (overallIndex < totalCount - 1) {
          await delay(DELAY_BETWEEN_CALLS);
        }
      }
    }

    currentPage++;
  }

  // Final results
  const totalTime = (Date.now() - startTime) / 1000;
  const avgRate = (successCount + errorCount) / totalTime * 60;

  console.log(colors.green('\n🎉 Update Process Complete!\n'));
  console.log(colors.cyan('📊 FINAL RESULTS:'));
  console.log(colors.white(`Total fixtures processed: ${colors.bold((successCount + errorCount).toLocaleString())}`));
  console.log(colors.white(`Successfully updated: ${colors.bold(successCount.toLocaleString())}`));
  console.log(colors.white(`Empty API responses: ${colors.bold(emptyResponseCount.toLocaleString())}`));
  console.log(colors.white(`Errors encountered: ${colors.bold(errorCount.toLocaleString())}`));
  console.log(colors.white(`Total time: ${colors.bold(totalTime.toFixed(1))} seconds`));
  console.log(colors.white(`Average rate: ${colors.bold(avgRate.toFixed(1))} calls/minute`));
  
  if (successCount > 0) {
    const successRate = ((successCount / (successCount + errorCount)) * 100).toFixed(1);
    console.log(colors.white(`Success rate: ${colors.bold(successRate + '%')}`));
  }

  console.log(colors.green('\n✅ Events update finished!'));
}

// Run the update
updateFixtureEvents().catch(error => {
  console.error(colors.red('💥 FATAL: Unhandled error in updateFixtureEvents:'), error.message);
  process.exit(1);
}); 