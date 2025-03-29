import { updateFixtureData, FixtureProgress } from './fixtureDataFetcher';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import { MAJOR_LEAGUES } from './teamDataFetcher';

async function runManualFixtureUpdate() {
  console.log('\n🚀 Starting manual update of all fixtures...\n');
  
  const startTime = Date.now();
  let fixturesProcessed = 0;
  
  // Create a multi-bar container
  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{bar} {percentage}% | {value}/{total} | {title}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  }, cliProgress.Presets.shades_classic);

  // Create progress bars
  const totalProgress = multibar.create(MAJOR_LEAGUES.length, 0, { title: 'Total Leagues' });
  const fixtureProgress = multibar.create(100, 0, { title: 'Current League Fixtures' });
  
  try {
    for (const league of MAJOR_LEAGUES) {
      console.log(`\n📊 Processing ${colors.cyan(league.name)}...`);
      
      // Update league progress
      totalProgress.increment();
      fixtureProgress.update(0, { title: `League: ${league.name}` });
      
      await updateFixtureData(
        league.id,
        (progress: FixtureProgress) => {
          fixtureProgress.setTotal(progress.totalFixtures);
          fixtureProgress.update(progress.processedFixtures, {
            title: `${league.name}: ${progress.processedFixtures}/${progress.totalFixtures}`
          });
          
          fixturesProcessed += progress.processedFixtures;
          
          // Log API calls
          if (progress.apiCalls > 0) {
            console.log(
              colors.gray(`API Calls: ${progress.apiCalls} | Fixtures: ${progress.processedFixtures}`)
            );
          }
        }
      );
    }
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    multibar.stop();
    
    console.log('\n');
    console.log('✨', colors.green('Fixture update completed successfully!'));
    console.log('⏱️', colors.yellow(`Total time: ${totalTime} minutes`));
    console.log('📦', colors.blue(`Fixtures processed: ${fixturesProcessed}`));
    console.log('\n');
  } catch (error) {
    multibar.stop();
    console.error('\n❌', colors.red('Update failed:'), error);
  }
}

// Run the update
runManualFixtureUpdate(); 