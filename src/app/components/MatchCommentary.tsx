'use client';

import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { getStreamingProviders } from '@/utils/channelUtils';
import { generateMatchEvents, generatePreMatchContent, generateSystemEvents, generateCommentary } from '@/app/utils/commentaryUtils';

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
  // Old format (backward compatibility)
  welcome_template?: number;
  referee_template?: number;
  venue_template?: number;
  lineup_template?: number;
  subs_template?: number;
  formation_template?: number;
  goal_template?: number;
  yellow_card_template?: number;
  red_card_template?: number;
  substitution_template?: number;
  break_template?: number;
  summary_template?: number;
  
  // New format
  event_templates?: { [key: string]: number };
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

  let templateIndex = 0;
  
  // Check if we have the new event_templates format
  if (match.commentary_path?.event_templates) {
    // New format: use event-specific mapping
    const eventKey = `${event.type}_${event.time?.elapsed || event.time}_${event.player?.id || 'unknown'}`;
    templateIndex = match.commentary_path.event_templates[eventKey] || 0;
  } else {
    // Old format: use the single template index (backward compatibility)
    templateIndex = match.commentary_path?.[`${event.type}_template`] || 0;
  }
  
  const template = templates[templateIndex] || templates[0];
  
  // Calculate the current score based on the event timing
  const homeGoals = match.goals?.home || 0;
  const awayGoals = match.goals?.away || 0;
  const score = `${homeGoals}-${awayGoals}`;
  
  // Get venue name from match object, with fallback
  const venueName = match.venue?.name || match.fixture?.venue?.name || 'hjemmebane';

  let text = template
    .replace(/{player}/g, event.player?.name || 'Ukjent spiller')
    .replace(/{team}/g, event.team?.name || 'Laget')
    .replace(/{venue}/g, venueName)
    .replace(/{score}/g, score);

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
    // Check if this match has events to create the new format
    if (match.event_data && match.event_data.length > 0) {
      // New format with event-specific mappings
      const eventTemplates: { [key: string]: number } = {};
      
      match.event_data.forEach((event: any, index: number) => {
        const eventKey = `${event.type}_${event.time?.elapsed || event.time}_${event.player?.id || index}`;
        
        let maxTemplates = 10; // default
        
        switch (event.type) {
          case 'Goal':
            maxTemplates = commentaryPhrases.goal.length;
            break;
          case 'Card':
            maxTemplates = event.detail === 'Yellow Card' 
              ? commentaryPhrases.yellowCard.length 
              : commentaryPhrases.redCard.length;
            break;
          case 'Substitution':
            maxTemplates = commentaryPhrases.substitution.length;
            break;
        }
        
        eventTemplates[eventKey] = Math.floor(Math.random() * maxTemplates);
      });

      return {
        // Keep old format for pre-match content
        welcome_template: Math.floor(Math.random() * preMatchCommentary.welcome.length),
        referee_template: Math.floor(Math.random() * preMatchCommentary.referee.length),
        venue_template: Math.floor(Math.random() * preMatchCommentary.venue.length),
        lineup_template: Math.floor(Math.random() * preMatchCommentary.lineups.length),
        subs_template: Math.floor(Math.random() * preMatchCommentary.subs.length),
        formation_template: Math.floor(Math.random() * preMatchCommentary.formation.length),
        break_template: Math.floor(Math.random() * breakCommentary.break.length),
        summary_template: Math.floor(Math.random() * matchSummaryTemplates.length),
        
        // New format for events
        event_templates: eventTemplates
      };
    } else {
      // Fallback to old format if no events
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
    }
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

  const matchEvents = generateMatchEvents(match);
  const preMatchContent = generatePreMatchContent(match);
  const systemEvents = generateSystemEvents();
  const allEvents = [...(match.event_data || []), ...systemEvents];
  // Sort events so that higher minutes are at the top
  const matchEventsSorted = allEvents.sort((a, b) => {
    // Special handling for system events
    const timeA = a.time?.elapsed || a.time;
    const timeB = b.time?.elapsed || b.time;
    return timeB - timeA;
  });

  return (
    <div className="space-y-4">
      {/* Match events/commentary first, now sorted newest to oldest */}
      {matchEventsSorted.map((event, index) => {
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
                ) : event.systemType === 'kickoff' ? (
                  <span className="font-bold dark:text-gray-200 text-[10px]">START</span>
                ) : (
                  <span className="font-bold dark:text-gray-200">{event.time}'</span>
                )}
              </div>
              <div className="flex-1 bg-white dark:bg-[#282828] rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium dark:text-gray-100">{systemLabel}</span>
                </div>
                <p className="text-sm leading-5 text-[#1f2937] dark:text-gray-300">{event.text}</p>
              </div>
            </div>
          );
        }

        // Regular event handling continues as before
        const commentary = generateCommentary(event, match);
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
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_8773_27874)">
                      <circle cx="10" cy="10" r="6" fill="white"></circle>
                      <path d="M12.1527 12.8534C11.9667 12.8534 11.7807 12.8407 11.5947 12.822C11.535 12.8105 11.4791 12.7847 11.4316 12.7469C11.3841 12.709 11.3465 12.6603 11.322 12.6047C11.13 11.8914 10.944 11.2154 10.764 10.558C10.7309 10.4722 10.7289 10.3774 10.7584 10.2902C10.7878 10.203 10.8469 10.1289 10.9253 10.0807L12.488 8.68071C12.5533 8.62378 12.637 8.59242 12.7237 8.59242C12.8103 8.59242 12.894 8.62378 12.9593 8.68071C13.4836 8.9669 13.9538 9.34256 14.3487 9.79071C14.4382 9.90152 14.4884 10.0389 14.4913 10.1814C14.4945 10.9616 14.2622 11.7247 13.8247 12.3707C13.8202 12.3888 13.8118 12.4056 13.8 12.42C13.7185 12.5308 13.6096 12.6183 13.484 12.674C13.0528 12.7989 12.6055 12.8596 12.1567 12.854L12.1527 12.8534Z" fill="black"></path>
                      <path d="M7.10465 11.34C7.02984 11.3408 6.95733 11.3142 6.90065 11.2654C6.41141 10.9692 5.98548 10.5793 5.64732 10.118C5.59205 10.04 5.56182 9.947 5.56065 9.85137C5.56036 9.12375 5.75289 8.40905 6.11865 7.78004C6.12338 7.75725 6.13677 7.73718 6.15598 7.72404C6.2112 7.67488 6.27685 7.63886 6.34798 7.61871C6.777 7.45131 7.23347 7.3654 7.69398 7.36537C7.83638 7.35297 7.97959 7.35297 8.12198 7.36537C8.20282 7.37405 8.27826 7.41012 8.33574 7.46761C8.39323 7.5251 8.42931 7.60054 8.43798 7.68137C8.54932 8.16537 8.67332 8.66137 8.79132 9.15737L8.88465 9.55737C8.90016 9.61795 8.89912 9.68158 8.88165 9.74162C8.86418 9.80166 8.83091 9.85591 8.78532 9.89871L7.34065 11.2534C7.31059 11.2834 7.27481 11.3072 7.23542 11.3232C7.19603 11.3393 7.15384 11.3472 7.11132 11.3467H7.10465V11.34Z" fill="black"></path>
                      <path d="M10.0007 3.33337C8.68211 3.33337 7.39318 3.72437 6.29685 4.45691C5.20052 5.18945 4.34604 6.23064 3.84146 7.44882C3.33687 8.66699 3.20485 10.0074 3.46209 11.3006C3.71932 12.5938 4.35426 13.7817 5.28661 14.7141C6.21896 15.6464 7.40685 16.2814 8.70005 16.5386C9.99326 16.7958 11.3337 16.6638 12.5519 16.1592C13.7701 15.6547 14.8112 14.8002 15.5438 13.7038C16.2763 12.6075 16.6673 11.3186 16.6673 10C16.6673 8.23193 15.9649 6.53624 14.7147 5.286C13.4645 4.03575 11.7688 3.33337 10.0007 3.33337ZM10.0813 14.9487L10.044 14.8154C10.0313 14.7242 9.986 14.6407 9.91652 14.5803C9.84704 14.5199 9.75806 14.4866 9.66599 14.4867C8.90137 14.4739 8.1582 14.2319 7.53265 13.792C7.46899 13.7605 7.39905 13.7436 7.32799 13.7427C7.28427 13.7388 7.24023 13.744 7.1986 13.7579C7.15697 13.7718 7.11864 13.7941 7.08599 13.8234L6.63332 14.2514C5.76947 13.5707 5.13338 12.6431 4.8097 11.592C4.48602 10.5409 4.49009 9.41611 4.82138 8.36738C5.15267 7.31864 5.79546 6.39566 6.66423 5.72124C7.53299 5.04683 8.58653 4.65296 9.68465 4.59204L9.75132 4.82737C9.79577 4.9576 9.83288 5.08782 9.86265 5.21804C9.88329 5.27852 9.91751 5.33347 9.9627 5.37866C10.0079 5.42385 10.0628 5.45808 10.1233 5.47871H10.1793C10.9222 5.59096 11.6436 5.81576 12.3187 6.14537C12.3661 6.17132 12.4202 6.18224 12.474 6.17671C12.548 6.17726 12.6207 6.15792 12.6847 6.12071L13.2927 5.69271C14.1813 6.36716 14.8399 7.2998 15.178 8.36295C15.5162 9.4261 15.5175 10.5678 15.1818 11.6317C14.846 12.6956 14.1897 13.6298 13.3025 14.3063C12.4154 14.9828 11.3408 15.3685 10.226 15.4107L10.0813 14.9487Z" fill="black"></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_8773_27874">
                        <rect width="16" height="16" fill="transparent" transform="translate(2 2)"></rect>
                      </clipPath>
                    </defs>
                  </svg>
                )}
                {commentary.type === 'yellowcard' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.9092 2.96924H7.091C5.88601 2.96924 4.90918 3.94607 4.90918 5.15106V14.8478C4.90918 16.0528 5.88601 17.0296 7.091 17.0296H12.9092C14.1142 17.0296 15.091 16.0528 15.091 14.8478V5.15106C15.091 3.94607 14.1142 2.96924 12.9092 2.96924Z" fill="#facc15"></path>
                  </svg>
                )}
                {commentary.type === 'redcard' && (
                  <svg width="20" height="20" viewBox="0 -2 11 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g id="yellow-red-card-icon">
                      <rect id="Rectangle_2316" fill="#facc15" fillRule="nonzero" x="0" y="1" width="8" height="11" rx="2"></rect>
                      <rect id="Rectangle_3201" fill="#dc2626" fillRule="nonzero" x="3" y="-2" width="8" height="11" rx="2"></rect>
                    </g>
                  </svg>
                )}
                {commentary.type === 'substitution' && (
                  <span className="dark:text-gray-200">🔄</span>
                )}
                <span className="font-medium dark:text-gray-100">
                  {commentary.type === 'goal' ? 'Mål!' : 
                   commentary.type === 'yellowcard' ? 'Gult kort!' :
                   commentary.type === 'redcard' ? 'Rødt kort!' :
                   commentary.type === 'substitution' ? 'Bytte!' :
                   'Hendelse'}
                </span>
              </div>
              <p className="text-sm leading-5 text-[#1f2937] dark:text-gray-300">{commentary.text}</p>
            </div>
          </div>
        );
      })}

      {/* Show message if no events yet */}
      {matchEventsSorted.length === 0 && (
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
            <p className="text-sm leading-5 text-[#1f2937] dark:text-gray-300">{content.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 