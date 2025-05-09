import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { getStreamingProviders } from '@/utils/channelUtils';

interface MatchCommentaryProps {
  match: any;
}

// Define ALL templates outside the component
const matchSummaryTemplates = [
  `{dramaticIntro} 
   {firstHalfSummary} 
   {secondHalfSummary}
   {keyMoments}
   {statsInsight}
   {tableContext}
   Takk for at du fulgte kampen med oss i dag!`,

  `{matchOutcome} på {venue}! 
   {firstHalfFlow}
   {secondHalfDrama}
   {keyPlayerHighlights}
   {matchStats}
   {leagueImplications}
   Vi takker for følget!`,

  `En {matchType} på {venue} er over, der {homeTeam} {resultPhrase} {awayTeam} {score}. 
   {firstHalfNarrative}
   {secondHalfNarrative}
   {dramaticMoments}
   {statisticalContext}
   {tableSignificance}
   Takk for i dag!`
];

interface CommentaryPath {
  welcome_template: number;
  referee_template: number;
  venue_template: number;
  lineup_template: number;
  subs_template: number;
  formation_template: number;
  goal_template: number;
  yellow_card_template: number;
  red_card_template: number;
  substitution_template: number;
  break_template: number;
  summary_template: number;
}

// Helper function to get random item from array
const getRandomPhrase = (phrases: string[]) => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

// Add pre-match commentary templates
const preMatchCommentary = {
  welcome: [
    "Velkommen til {venue}, der {homeTeam} tar imot {awayTeam}! {broadcastInfo}",
    "Da smeller vi i gang fra {venue}! {homeTeam} mot {awayTeam}. {broadcastInfo}",
    "Vi er klare for avspark mellom {homeTeam} og {awayTeam} fra {venue}! {broadcastInfo}",
    "Dommeren blåser i gang kampen mellom {homeTeam} og {awayTeam}! {broadcastInfo}",
    "Ballen ruller på {venue}! {homeTeam} tar imot {awayTeam} i dag. {broadcastInfo}"
  ],
  referee: [
    "Dagens dommer er {referee}.",
    "{referee} er kampleder i dag.",
    "Kampen dømmes av {referee}.",
    "Det er {referee} som har ansvaret for å lede dagens oppgjør.",
    "{referee} har fått æren av å dømme denne kampen.",
    "Dagens hoveddommer er {referee}.",
    "Med fløyten i dag: {referee}.",
    "På dommersiden er det {referee} som har kommandoen i dag."
  ],
  venue: [
    "Kampen spilles på {venue} i {city}.",
    "Vi er på plass på {venue} i {city} for dagens kamp.",
    "{venue} i {city} er arena for denne kampen.",
    "Dagens match utspiller seg på historiske {venue} i {city}.",
    "Fra vakre {venue} i {city} er vi klare for avspark.",
    "Rammene er perfekte her på {venue} i {city}.",
    "Forholdene kunne ikke vært bedre her på {venue} i {city}.",
    "Det er en fantastisk atmosfære her på {venue} i {city}."
  ],
  lineups: [
    "{team} stiller med følgende ellever: {players}",
    "Slik starter {team} i dag: {players}",
    "{team}s startoppstilling: {players}",
    "Her er {team}s utvalgte til dagens kamp: {players}",
    "{team} går for denne elleveren i dag: {players}",
    "Disse spillerne starter for {team}: {players}",
    "Slik ser {team}s førsteellever ut: {players}",
    "Her er mannskapet som starter for {team}: {players}"
  ],
  subs: [
    "{team}s reserver: {players}",
    "På benken for {team}: {players}",
    "Innbyttere for {team}: {players}",
    "Disse kan komme inn for {team}: {players}",
    "{team}s innbyttere i dag: {players}",
    "Klar til å bidra fra benken for {team}: {players}",
    "Dette er reservene til {team}: {players}",
    "På innbytterbenken for {team} sitter: {players}"
  ],
  formation: [
    "{team} går for {formation}-system.",
    "{team} stiller i en {formation}-formasjon i dag.",
    "{team} velger å spille {formation} i dag.",
    "{team} har valgt en {formation}-oppstilling.",
    "Det blir {formation} for {team} i denne kampen.",
    "{team} holder fast ved sin {formation}-formasjon.",
    "{team}s taktiske valg faller på {formation}.",
    "En klassisk {formation}-formasjon fra {team} i dag."
  ]
};

// Commentary templates
const commentaryPhrases = {
  goal: [
    "MÅÅÅÅÅÅÅL! {player} sender {venue} til himmels! En praktfull avslutning som gir {team} ledelsen {score}! Publikum er i ekstase!",
    
    "DER SITTER DEN! {player} gjør det igjen på {venue}! Ballen suser inn i nettmaskene, og {team} leder nå {score}!",
    
    "UTROLIG! {player} har gjort det helt umulige på {venue}! {team} tar ledelsen {score}!",
    
    "SENSASJONELT fra {player}! Keeper er sjanseløs når ballen borer seg opp i krysset på {venue}! {team} leder {score}!",
    
    "MÅÅÅL! {player} sender {venue} til himmels! {team} tar ledelsen {score}!",
    
    "HELT VANVITTIG! {player} har nettopp skrevet seg inn i historiebøkene på {venue}! {team} leder {score}!",
    
    "DER SMELLER DET! {player} har nettopp skapt magi på {venue}! {team} tar ledelsen {score}!",
    
    "MESTERLIG! {player} viser hvorfor fotball er verdens vakreste spill! {team} tar ledelsen {score} på {venue}!",
    
    "UFATTELIG VAKKERT! {player} tegner et kunstverk på {venue}! {team} tar ledelsen {score}!",
    
    "DRØMMESCORING! {player} sender {team} til himmels med en avslutning som får hele {venue} til å måpe! {score} på tavla, og dette kommer vi til å snakke om lenge!",
    
    "MAGISK ØYEBLIKK på {venue}! {player} har nettopp skapt et minne for livet! {team} tar ledelsen {score} etter en scoring som får hårene til å reise seg!",
    
    "MÅÅÅÅÅL! Tid står stille på {venue} når {player} sender ballen i nettet! {team} tar ledelsen {score}, og jubelen vil ingen ende ta!",
    
    "FANTASTISK! {player} har nettopp gitt oss årets øyeblikk på {venue}! {team} leder {score} etter en scoring som får selv de mest rutinerte supporterne til å gråte av glede!",
    
    "UTROLIG DRAMA! {player} har snudd kampen på hodet! {team} tar ledelsen {score} etter en scoring som får kommentatorene til å miste stemmen!",
    
    "MESTERVERKET er signert {player}! En scoring som får hele {venue} til å synge i ekstase! {team} tar ledelsen {score}, og dette er fotballmagi på sitt aller beste!",
    
    "TIDENES ØYEBLIKK på {venue}! {player} har nettopp skapt et minne som vil leve evig! {team} tar ledelsen {score}!",
    
    "UUUUUTROLIG! {player} scorer et mål som får ekspertene til å miste munn og mæle! {score} til {team}!",
    
    "DETTE ER IKKE MULIG! {player} trosser alle naturlover på {venue}! {team} går opp til {score}!",
    
    "HIMMELSKE MAKTER! {player} har nettopp tegnet et mesterverk på {venue}! {team} tar ledelsen {score}!",
    
    "GALSKAP! REN GALSKAP! {player} har nettopp omskrevet fotballens fysikklover! {team} øker til {score}!",
    
    "MÅÅÅÅÅÅÅÅÅÅÅL på {venue}! {player} har nettopp skapt et øyeblikk for historiebøkene! {team} går opp til {score}!",
    
    "DETTE ER IKKE AV DENNE VERDEN! {player} scorer et mål som får {venue} til å eksplodere! {team} leder nå {score}!",
    
    "EKSPLOSJON AV FØLELSER på {venue}! {player} har nettopp skapt magi! {team} går opp til {score}!",
    
    "DETTE ER STØRRE ENN LIVET SELV! {player} med en scoring som får {venue} til å koke! {team} leder {score}!",
    
    "GUDOMMELIG SCORING! {player} med en utrolig prestasjon på {venue}! {team} øker til {score}!"
  ],
  assist: [
    "Nydelig assist fra {player}!",
    "Fantastisk målgivende pasning av {player}!",
    "For en pasning av {player}! Perfekt vektet.",
    "MESTERLIG overblikk av {player}! Den pasningen var verdt inngangspengene alene!",
    "Der viser {player} hvorfor fotball er et lagspill! Strålende assist!",
    "Genial pasning fra {player}! Det er sånn fotball skal spilles!",
    "For et øye {player} har! Den pasningen kunne ikke vært bedre!",
    "BRILJANT av {player}! Den målgivende pasningen var som hentet fra en lærebok!",
    "Kunstnerisk fra {player}! Den assist-pasningen burde rammes inn!",
    "MAGISK overblikk av {player}! Målgivende pasninger blir ikke vakrere!",
    "Der viser {player} verdensklasse! Den pasningen åpnet forsvaret som en hermetikkboks!",
    "SENSASJONELT av {player}! Den assist-pasningen var som servert på sølvfat!",
    "Fotballkunst signert {player}! Den målgivende pasningen var ren poesi!"
  ],
  yellowCard: [
    "GULT KORT! Nå har dommeren fått nok av {player}! {team}-spilleren må passe seg heretter.",
    "Der røyk tålmodigheten til dommeren! {player} får seg et velfortjent gult kort.",
    "Dommeren er FORBANNA! {player} går i boka etter den taklingen.",
    "Nå koker det for dommeren! {player} får gult kort, og der var det ikke mye å diskutere.",
    "PIIIP! Der fikk {player} kjenne dommerens vrede - gult kort!",
    "Dommeren har våknet på feil side i dag! {player} får seg en saftig advarsel.",
    "Der var det slutt på dommerens tålmodighet - {player} går rett i boka!",
    "GULT KORT! Dommeren har tydeligvis spist surdeisbrød til frokost - {player} må passe seg.",
    "Nå er det nok rampestreker fra {player}! Dommeren deler ut årets mest irriterte gule kort.",
    "Der fikk {player} kjenne dommerens autoritet! Gult kort og en streng pekefinger på kjøpet.",
    "GULT! {player} prøvde seg på litt skuespill, men dommeren lot seg ikke lure. I boka med deg!",
    "Dommeren har visst glemt morgenkaffen sin! {player} får smake på konsekvensene.",
    "Der var det slutt på kosen - {player} får seg en gul suvenir å ta med hjem.",
    "KORT! Dommeren har bestemt seg for å rydde opp, og {player} må ta sin del av oprydningen.",
    "Nå er det ikke mer tull å hente hos dommeren! {player} får en gul påminnelse om hvem som bestemmer."
  ],
  redCard: [
    "RØDT KORT! Dommeren er ILLSINT! {player} kan bare pakke sammen og gå - dette var dråpen som fikk begeret til å flyte over!",
    "EKSPLOSJON PÅ SIDELINJEN! Dommeren er rødere i ansiktet enn kortet han holder opp! {player} får marsjordre mens damp kommer ut av dommerens ører!",
    "DOMMEREN HAR FÅTT NOK! Med blodårene pulserende i pannen sender han {player} rett i dusjen! Dette var dråpen!",
    "DOMMEREN ER KOKENDE! {player} får se det rødeste av røde kort mens dommeren hopper opp og ned av raseri!",
    "UTVISNING! Dommeren er så sint at fløyta nesten smelter! {player} kan bare glemme resten av kampen!",
    "DER RØYK SIKRINGEN! Dommeren har ventet på dette øyeblikket - {player} får et rødt kort servert med en hel buffet av raseri!",
    "DOMMEREN EKSPLODERER! {player} får rødt kort mens dommeren gestikulerer så voldsomt at linjemennene må dukke!",
    "KATASTROFE! Dommeren er så rasende at han nesten svelger fløyta! {player} får det rødeste kortet som noensinne er vist på en fotballbane!",
    "DOMMEREN ER HELT KOKOS! Med ansiktet like rødt som kortet sender han {player} i garderoben! Dette var dråpen som fikk vulkanen til å eksplodere!"
  ],
  substitution: [
    "{playerIn} erstatter {playerOut} for {team}.",
    "Bytte for {team}: {playerIn} kommer inn for {playerOut}.",
    "{team} gjør et bytte: {playerOut} går ut, {playerIn} kommer inn.",
    "Friske bein for {team}: {playerIn} erstatter {playerOut}.",
    "{playerOut} er ferdig for dagen, {playerIn} overtar for {team}.",
    "Taktisk bytte fra {team}: {playerIn} inn for {playerOut}.",
    "{team} velger å sette inn {playerIn} for {playerOut}.",
    "Der kommer {playerIn} inn og {playerOut} får hvile for {team}."
  ],
  var: [
    "VAR sjekker situasjonen...",
    "Dommeren blir kalt til skjermen av VAR.",
    "Dette må sees på nytt av VAR-teamet."
  ]
};

// Add system event templates
const systemEventTemplates = {
  kickoff: [
    "Kampen er i gang på {venue}!",
    "Vi er i gang! {homeTeam} mot {awayTeam} på {venue}.",
    "Dommeren blåser i gang kampen mellom {homeTeam} og {awayTeam}!"
  ],
  fulltime: [
    "Kampen er over! {homeTeam} - {awayTeam} {score}",
    "Fullført! Sluttresultat: {homeTeam} - {awayTeam} {score}",
    "Det er over på {venue}! {homeTeam} - {awayTeam} {score}"
  ]
};

const breakCommentary = {
  break: [
    "PAUSE: {homeTeam} {score} {awayTeam}. {dominantTeam} har hatt mest ball med {possession}% ballbesittelse.",
    "Det er pause på {venue}! {homeTeam} {score} {awayTeam}. {shotStats}",
    "Lagene går til pause med stillingen {homeTeam} {score} {awayTeam}. {yellowCards} gule kort så langt.",
    "45 minutter er spilt, og det står {homeTeam} {score} {awayTeam}. {dominantTeam} har vært det beste laget så langt.",
    "HALVTID: {homeTeam} {score} {awayTeam}. Vi har sett {totalShots} skudd på mål i første omgang.",
    "PAUSE! Dommeren må ha spist en hel pakke fløytekarameller - han har blåst for alt som rører seg! {homeTeam} {score} {awayTeam}.",
    "HALVTID! Trenerne løper inn i garderoben raskere enn spillerne - noen må ha glemt å skru av kaffetrakteren! {homeTeam} {score} {awayTeam}.",
    "Det er pause, og ballguttene har mer energi enn hele {homeTeam} og {awayTeam} til sammen! Stillingen er {score}.",
    "HALVTID! Med {totalShots} skudd så langt begynner målet å se ut som et puslespill med manglende brikker!"
  ]
};

const generateBroadcastMessage = (providers: any[]) => {
  if (!providers || providers.length === 0) return '';

  const providerText = providers.length === 1 
    ? providers[0].name 
    : providers.map(p => p.name).slice(0, -1).join(', ') + ' og ' + providers[providers.length - 1].name;

  const templates = [
    `Du kan følge kampen direkte på ${providerText}!`,
    `Følg hele kampen på ${providerText}.`,
    `Se hele oppgjøret direkte på ${providerText}!`,
    `${providerText} sender kampen direkte.`,
    `Kampen ser du på ${providerText}!`,
    `Direktesendt på ${providerText}.`,
    `Følg med på ${providerText} for å få med deg alt som skjer.`,
    `${providerText} har rettighetene til denne kampen.`,
    `Ikke gå glipp av noe - følg kampen på ${providerText}!`,
    `Se hele oppgjøret på ${providerText}.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
};

const generateEventText = (event: any, match: any) => {
  const templates = commentaryPhrases[event.type];
  if (!templates) return '';

  const template = templates[match.commentary_path?.[`${event.type}_template`] || 0];
  
  // Calculate the current score based on the event timing
  const homeGoals = match.goals?.home || 0;
  const awayGoals = match.goals?.away || 0;
  const score = `${homeGoals}-${awayGoals}`;
  
  // Get venue name from match object, with fallback
  const venueName = match.venue?.name || match.fixture?.venue?.name || 'hjemmebane';

  // Log for debugging
  console.log('Event:', event);
  console.log('Match:', match);
  console.log('Venue:', venueName);
  console.log('Score:', score);

  let text = template
    .replace(/{player}/g, event.player?.name || 'Ukjent spiller')
    .replace(/{team}/g, event.team?.name || 'Laget')
    .replace(/{venue}/g, venueName)
    .replace(/{score}/g, score);

  // Additional debug log
  console.log('Generated text:', text);

  return text;
};

export default function MatchCommentary({ match }: MatchCommentaryProps) {
  const [commentaryPath, setCommentaryPath] = useState<CommentaryPath | null>(null);
  
  const supabase = createClient(
    'https://cdynfbwdwdfsiwkgixua.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI',
    {
      global: {
        fetch: fetch as any
      }
    }
  );

  useEffect(() => {
    const setupCommentaryPath = async () => {
      try {
        console.log('Current commentary path:', match.commentary_path);
        
        // If we already have a path, use it
        if (match.commentary_path) {
          setCommentaryPath(match.commentary_path);
          return;
        }

        // If no path exists, create one
        const newPath = generateRandomPath();
        console.log('Generated new path:', newPath);
        
        const { error } = await supabase
          .from('fixtures')
          .update({ commentary_path: newPath })
          .eq('id', match.id);

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }

        console.log('Successfully updated commentary path');
        setCommentaryPath(newPath);
      } catch (error) {
        console.error('Error in setupCommentaryPath:', error);
        // Fallback to random path if DB operation fails
        const fallbackPath = generateRandomPath();
        setCommentaryPath(fallbackPath);
      }
    };

    setupCommentaryPath();
  }, [match.id]); // Only run when match.id changes

  const generateRandomPath = (): CommentaryPath => {
    return {
      welcome_template: Math.floor(Math.random() * preMatchCommentary.welcome.length),
      referee_template: Math.floor(Math.random() * preMatchCommentary.referee.length),
      venue_template: Math.floor(Math.random() * preMatchCommentary.venue.length),
      lineup_template: Math.floor(Math.random() * preMatchCommentary.lineups.length),
      subs_template: Math.floor(Math.random() * preMatchCommentary.subs.length),
      formation_template: Math.floor(Math.random() * preMatchCommentary.formation.length),
      goal_template: Math.floor(Math.random() * commentaryPhrases.goal.length),
      yellow_card_template: Math.floor(Math.random() * commentaryPhrases.yellowCard.length),
      red_card_template: Math.floor(Math.random() * commentaryPhrases.redCard.length),
      substitution_template: Math.floor(Math.random() * commentaryPhrases.substitution.length),
      break_template: Math.floor(Math.random() * breakCommentary.break.length),
      summary_template: Math.floor(Math.random() * matchSummaryTemplates.length)
    };
  };

  // Use commentaryPath in your render logic
  const getTemplatePhrase = (templates: string[], pathIndex: number) => {
    return templates[pathIndex];
  };

  // Wait for commentary path to be initialized
  if (!commentaryPath) {
    return <div className="dark:text-gray-300">Loading commentary...</div>;
  }

  // Add debug logging
  console.log('Match data:', match);
  console.log('Fixture data:', match.fixture);
  console.log('Extra time:', match.fixture?.status?.extra);

  const generateCommentary = (event: any) => {
    switch (event.type) {
      case 'Goal':
        const goalPhrase = getRandomPhrase(commentaryPhrases.goal)
          .replace('{player}', event.player.name)
          .replace('{team}', event.team.name)
          .replace('{venue}', match.venue?.name || match.fixture?.venue?.name || 'hjemmebane')
          .replace('{score}', `${match.goals.home}-${match.goals.away}`);
        
        return {
          type: 'goal',
          text: goalPhrase,
          time: event.time.elapsed,
          player: event.player
        };

      case 'Card':
        const cardPhrases = event.detail === 'Yellow Card' ? 
          commentaryPhrases.yellowCard : commentaryPhrases.redCard;
        const cardPhrase = getRandomPhrase(cardPhrases)
          .replace('{player}', event.player.name)
          .replace('{team}', event.team.name);
        
        return {
          type: event.detail.toLowerCase().replace(' ', ''),
          text: cardPhrase,
          time: event.time.elapsed,
          player: event.player
        };

      case 'Substitution':
        const subPhrase = getRandomPhrase(commentaryPhrases.substitution)
          .replace('{playerIn}', event.assist?.name || 'Spiller')
          .replace('{playerOut}', event.player?.name || 'Spiller')
          .replace('{team}', event.team.name);
        
        return {
          type: 'substitution',
          text: subPhrase,
          time: event.time.elapsed,
          player: event.player
        };

      default:
        return null;
    }
  };

  const generatePreMatchContent = () => {
    const content = [];
    const fixtureData = typeof match.fixture === 'string' ? 
      JSON.parse(match.fixture) : match.fixture;

    // Make sure we have a commentary path
    if (!commentaryPath) return [];

    // Add lineups if available (first/newest)
    if (match.lineups?.length > 0) {
      match.lineups.forEach((lineup: any) => {
        const isHome = lineup.team.id === match.teams.home.id;
        const team = isHome ? match.teams.home.name : match.teams.away.name;
        
        // Formation (shows up first)
        if (lineup.formation) {
          content.push({
            type: 'formation',
            text: preMatchCommentary.formation[commentaryPath.formation_template]
              .replace('{team}', team)
              .replace('{formation}', lineup.formation),
            time: null
          });
        }

        // Substitutes
        const subs = lineup.substitutes.map((p: any) => p.player.name).join(', ');
        content.push({
          type: 'subs',
          text: preMatchCommentary.subs[commentaryPath.subs_template]
            .replace('{team}', team)
            .replace('{players}', subs),
          time: null
        });

        // Starting XI
        const startingXI = lineup.startXI.map((p: any) => p.player.name).join(', ');
        content.push({
          type: 'lineup',
          text: preMatchCommentary.lineups[commentaryPath.lineup_template]
            .replace('{team}', team)
            .replace('{players}', startingXI),
          time: null
        });
      });
    }

    // Referee information
    if (fixtureData?.referee) {
      content.push({
        type: 'referee',
        text: preMatchCommentary.referee[commentaryPath.referee_template]
          .replace('{referee}', fixtureData.referee)
      });
    }

    // Venue information
    if (fixtureData?.venue) {
      content.push({
        type: 'venue',
        text: preMatchCommentary.venue[commentaryPath.venue_template]
          .replace('{venue}', fixtureData.venue.name)
          .replace('{city}', fixtureData.venue.city)
      });
    }

    // Welcome message (last/oldest)
    content.push({
      type: 'welcome',
      text: preMatchCommentary.welcome[commentaryPath.welcome_template]
        .replace('{homeTeam}', match.teams.home.name)
        .replace('{awayTeam}', match.teams.away.name)
        .replace('{venue}', fixtureData?.venue?.name || match.venue?.name || 'hjemmebane')
        .replace('{broadcastInfo}', '')
    });

    return content;
  };

  const generateMatchSummary = (match: any, stats: any, path: CommentaryPath | null) => {
    const homeStats = stats[0]?.statistics || [];
    const awayStats = stats[1]?.statistics || [];
    const possession = homeStats.find(s => s.type === 'Ball Possession')?.value || '50';
    const homeShots = parseInt(homeStats.find(s => s.type === 'Total Shots')?.value || '0');
    const awayShots = parseInt(awayStats.find(s => s.type === 'Total Shots')?.value || '0');
    const homeShotsOnTarget = parseInt(homeStats.find(s => s.type === 'Shots on Goal')?.value || '0');
    const awayShotsOnTarget = parseInt(awayStats.find(s => s.type === 'Shots on Goal')?.value || '0');

    // Generate match outcome based on result
    const matchOutcome = match.goals.home === match.goals.away
      ? `Det ender uavgjort ${match.goals.home}-${match.goals.away}`
      : match.goals.home > match.goals.away
        ? `${match.teams.home.name} vinner ${match.goals.home}-${match.goals.away}`
        : `${match.teams.away.name} vinner ${match.goals.away}-${match.goals.home}`;

    // Generate first half narrative
    const firstHalfNarrative = `I første omgang ${
      homeShots > awayShots 
        ? `dominerte ${match.teams.home.name} med ${homeShots} skudd mot mål`
        : awayShots > homeShots
          ? `var det ${match.teams.away.name} som skapte mest med ${awayShots} avslutninger`
          : 'var lagene jevnspilte med like mange sjanser'
    }.`;

    // Generate second half narrative
    const secondHalfNarrative = match.goals.home === match.goals.away
      ? 'Andre omgang fortsatte å være jevnspilt helt til sluttsignalet.'
      : `I andre omgang sikret ${match.goals.home > match.goals.away ? match.teams.home.name : match.teams.away.name} seieren.`;

    // Generate match stats narrative
    const matchStatsNarrative = `${match.teams.home.name} endte med ${possession}% ballbesittelse og ${homeShots} skudd (${homeShotsOnTarget} på mål), mens ${match.teams.away.name} hadde ${awayShots} avslutninger (${awayShotsOnTarget} på mål).`;

    // Generate table implications
    const tableImplications = match.goals.home === match.goals.away
      ? 'Begge lag tar med seg ett poeng fra dagens oppgjør.'
      : `${match.goals.home > match.goals.away ? match.teams.home.name : match.teams.away.name} sikrer tre viktige poeng i kampen om tabellplasseringene.`;

    return `${matchOutcome} på ${match.venue?.name || 'hjemmebane'}! 
${firstHalfNarrative} 
${secondHalfNarrative} 
${matchStatsNarrative} 
${tableImplications} 
Takk for at du fulgte kampen!`;
  };

  const generateSystemEvents = () => {
    const events = [];

    if (match.match_status !== 'NS' && match.match_status !== 'TBD') {
      const providers = getStreamingProviders(match.league_id);
      const broadcastInfo = generateBroadcastMessage(providers);

      events.push({
        type: 'system',
        systemType: 'kickoff',
        time: -1,
        text: preMatchCommentary.welcome[match.commentary_path?.welcome_template || 0]
          .replace('{homeTeam}', match.teams.home.name)
          .replace('{awayTeam}', match.teams.away.name)
          .replace('{venue}', match.venue?.name || 'hjemmebane')
          .replace('{broadcastInfo}', broadcastInfo)
      });
    }

    // Add fulltime event if match is finished
    if (['FT', 'AET', 'PEN'].includes(match.match_status)) {
      const summary = generateMatchSummary(match, match.fixture_statistics, commentaryPath);
      events.push({
        type: 'system',
        systemType: 'summary',
        time: 90 + (match.fixture?.status?.extra || 0),
        text: summary
      });
    }

    // Find the last event before halftime and first event after
    const firstHalfEvents = match.event_data?.filter(event => event.time?.elapsed <= 45) || [];
    const secondHalfEvents = match.event_data?.filter(event => event.time?.elapsed > 45) || [];
    
    if (firstHalfEvents.length > 0 && match.fixture_statistics) {
      // Calculate halftime score by counting goals in first half
      const firstHalfGoals = firstHalfEvents.filter(event => event.type === 'Goal');
      const halftimeScore = {
        home: firstHalfGoals.filter(goal => goal.team.id === match.teams.home.id).length,
        away: firstHalfGoals.filter(goal => goal.team.id === match.teams.away.id).length
      };

      const stats = match.fixture_statistics;
      const homeStats = stats[0]?.statistics || [];
      const awayStats = stats[1]?.statistics || [];
      
      const homePossession = parseInt(homeStats.find(s => s.type === 'Ball Possession')?.value || '0');
      const homeShots = parseInt(homeStats.find(s => s.type === 'Total Shots')?.value || '0');
      const awayShots = parseInt(awayStats.find(s => s.type === 'Total Shots')?.value || '0');
      const yellowCards = match.event_cards_yellow || 0;
      
      // Determine dominant team
      const dominantTeam = homePossession > 50 ? match.teams.home.name : match.teams.away.name;
      
      const breakText = breakCommentary.break[commentaryPath?.break_template || 0]
        .replace('{homeTeam}', match.teams.home.name)
        .replace('{awayTeam}', match.teams.away.name)
        .replace('{score}', `${halftimeScore.home}-${halftimeScore.away}`)  // Using halftime score
        .replace('{venue}', match.venue?.name || '')
        .replace('{dominantTeam}', dominantTeam)
        .replace('{possession}', homePossession > 50 ? homePossession : (100 - homePossession))
        .replace('{shotStats}', `Totalt ${homeShots + awayShots} skudd i første omgang.`)
        .replace('{yellowCards}', `Vi har sett ${yellowCards}`)
        .replace('{totalShots}', `${homeShots + awayShots}`);

      events.push({
        type: 'system',
        systemType: 'break',
        time: 45,
        text: breakText
      });
    }

    return events;
  };

  if (!match) {
    return (
      <div className="text-gray-500 italic dark:text-gray-400">
        Ingen kampinformasjon tilgjengelig.
      </div>
    );
  }

  const preMatchContent = generatePreMatchContent();
  const systemEvents = generateSystemEvents();
  const allEvents = [...(match.event_data || []), ...systemEvents];
  // Sort events so that higher minutes are at the top
  const matchEvents = allEvents.sort((a, b) => {
    // Special handling for system events
    const timeA = a.time?.elapsed || a.time;
    const timeB = b.time?.elapsed || b.time;
    return timeB - timeA;
  });

  return (
    <div className="space-y-4">
      {/* Match events/commentary first, now sorted newest to oldest */}
      {matchEvents.map((event, index) => {
        if (event.type === 'system') {
          // Get the appropriate label based on system type
          const systemLabel = {
            'break': 'Pause',
            'kickoff': 'Kampstart',
            'fulltime': 'Kampen er slutt',
            'summary': 'Kampsammendrag',
            'default': 'Hendelse'
          }[event.systemType || 'default'];

          return (
            <div key={`system-${index}`} className="flex gap-4 items-start">
              <div className="rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-[#282828]">
                {event.systemType === 'break' ? (
                  <Image
                    src="/timer.svg"
                    alt="Halftime"
                    width={24}
                    height={24}
                    className="dark:invert"
                  />
                ) : (
                  <span className="font-bold dark:text-gray-200">{event.time}'</span>
                )}
              </div>
              <div className="flex-1 bg-white dark:bg-[#282828] rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium dark:text-gray-100">{systemLabel}</span>
                </div>
                <p className="dark:text-gray-300">{event.text}</p>
              </div>
            </div>
          );
        }

        // Regular event handling continues as before
        const commentary = generateCommentary(event);
        if (!commentary) return null;

        return (
          <div key={`event-${index}`} className="flex gap-4 items-start">
            <div className={`rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 
              ${commentary.type === 'goal' ? 'bg-[#01935c] text-white' : 'bg-gray-100 dark:bg-[#282828] text-gray-900 dark:text-gray-200'}`}>
              <span className="font-bold">{commentary.time}'</span>
            </div>
            <div className="flex-1 bg-white dark:bg-[#282828] rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                {commentary.type === 'goal' && (
                  <span className="text-xl">⚽</span>
                )}
                {commentary.type === 'yellowcard' && (
                  <span className="text-yellow-400">🟨</span>
                )}
                {commentary.type === 'redcard' && (
                  <span className="text-red-600">🟥</span>
                )}
                {commentary.type === 'substitution' && (
                  <span className="dark:text-gray-200">🔄</span>
                )}
                <span className="font-medium dark:text-gray-100">
                  {commentary.type === 'goal' ? 'Mål!' : 'Hendelse'}
                </span>
              </div>
              <p className="dark:text-gray-300">{commentary.text}</p>
            </div>
          </div>
        );
      })}

      {/* Show message if no events yet */}
      {matchEvents.length === 0 && (
        <div className="text-gray-500 italic dark:text-gray-400">
          Ingen hendelser å vise ennå.
        </div>
      )}

      {/* Pre-match content with bubble-chat icon */}
      {preMatchContent.map((content, index) => (
        <div key={`pre-${index}`} className="flex gap-4 items-start">
          <div className="bg-gray-100 dark:bg-[#282828] rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
            <Image
              src="/bubble-chat.svg"
              alt="Chat bubble"
              width={24}
              height={24}
              className="dark:invert"
            />
          </div>
          <div className="flex-1 bg-white dark:bg-[#282828] rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium dark:text-gray-100">
                {content.type === 'welcome' ? 'Velkommen' : 
                 content.type === 'lineup' ? 'Lagoppstilling' :
                 content.type === 'subs' ? 'Innbyttere' :
                 content.type === 'formation' ? 'Formasjon' :
                 content.type === 'referee' ? 'Dommer' :
                 content.type === 'venue' ? 'Arena' : 'Info'}
              </span>
            </div>
            <p className="dark:text-gray-300">{content.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 