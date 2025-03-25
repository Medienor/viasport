import { updateAllTeamsData, MAJOR_LEAGUES } from './teamDataFetcher';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';

async function runManualUpdate() {
  console.log('\n🚀 Starting manual update of all teams...\n');
  
  const startTime = Date.now();
  let teamsProcessed = 0;
  let currentLeague = '';
  
  // Estimate total teams (about 30-40 teams per league)
  const ESTIMATED_TOTAL = MAJOR_LEAGUES.length * 35;
  
  // Create a multi-bar container
  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{bar} {percentage}% | {value}/{total} | {title}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  }, cliProgress.Presets.shades_classic);

  // Create progress bars with absolute values
  const totalProgress = multibar.create(ESTIMATED_TOTAL, 0, { title: 'Total Progress' });
  const leagueProgress = multibar.create(40, 0, { title: 'Current League' }); // Most leagues have <40 teams
  
  const updateProgress = (data: {
    teamId: number,
    teamName: string,
    leagueName: string,
    totalTeams: number,
    leagueTotal: number,
    leagueProcessed: number
  }) => {
    teamsProcessed++;
    
    // Update league info if changed
    if (currentLeague !== data.leagueName) {
      currentLeague = data.leagueName;
      console.log(`\n📊 Processing ${colors.cyan(data.leagueName)}...`);
      leagueProgress.setTotal(data.leagueTotal); // Update total for current league
      leagueProgress.update(0, { title: `League: ${data.leagueName}` });
    }
    
    // Calculate times
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const estimatedTotal = (elapsed / teamsProcessed) * ESTIMATED_TOTAL;
    const remaining = Math.max(0, (estimatedTotal - elapsed) / 60); // minutes
    
    // Update progress bars
    totalProgress.update(teamsProcessed, {
      title: `Total: ${remaining.toFixed(1)}m remaining`
    });
    leagueProgress.update(data.leagueProcessed);
    
    // Log team details
    console.log(
      colors.gray(`✓ ${data.teamName.padEnd(30)} ID: ${data.teamId}`)
    );
  };

  try {
    await updateAllTeamsData(updateProgress);
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    multibar.stop();
    
    console.log('\n');
    console.log('✨', colors.green('Update completed successfully!'));
    console.log('⏱️', colors.yellow(`Total time: ${totalTime} minutes`));
    console.log('📦', colors.blue(`Teams processed: ${teamsProcessed}`));
    console.log('\n');
  } catch (error) {
    multibar.stop();
    console.error('\n❌', colors.red('Update failed:'), error);
  }
}

// Run the update
runManualUpdate(); 