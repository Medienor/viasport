// Define ALL commentary templates
const commentaryPhrases = {
    goal: [
      "MÅÅÅÅÅÅÅL! {player} sender {venue} til himmels! En praktfull avslutning som gir {team} ledelsen {score}! Publikum er i ekstase!",
      "DER SITTER DEN! {player} gjør det igjen på {venue}! Ballen suser inn i nettmaskene, og {team} leder nå {score}!",
      "FANTASTISK MÅL! {player} viser klasse på {venue}! {team} tar ledelsen {score} med en perle av en scoring!",
      "SCORING! {player} banker ballen i mål på {venue}! {team} jubler for {score}-ledelsen!",
      "MÅL! {player} setter ballen i nettmaskene! {team} leder {score} på {venue}!",
      "BINGO! {player} scorer for {team}! Det står {score} på {venue}!",
      "NYDELIG! {player} finner nettmaskene! {team} tar ledelsen {score}!",
      "SCORING PÅ {venue}! {player} gir {team} {score}-ledelsen!",
      "MÅÅÅL! {player} sender publikum på {venue} til himmels! {team} leder {score}!",
      "UTROLIG! {player} dundrer ballen i mål! {team} fører {score} på {venue}!",
      "PERFEKT AVSLUTNING! {player} gir {team} {score}-ledelsen på {venue}!",
      "KLASSEMÅL! {player} viser hvorfor han er på banen! {team} leder {score}!",
      "BRAKSKUDD! {player} hamrer ballen i nettmaskene! {score} til {team}!",
      "DRØMMEMÅL! {player} setter sitt preg på kampen! {team} fører {score}!",
      "KANON! {player} fyrer av et skudd som sitter! {team} leder {score}!",
      "EKSPLOSJON AV FØLELSER på {venue}! {player} har nettopp skapt magi! {team} går opp til {score}!",
      "HELT VANVITTIG! {player} har nettopp skrevet seg inn i historiebøkene på {venue}! {team} leder {score}!",
      "HIMMELSKE MAKTER! {player} har nettopp tegnet et mesterverk på {venue}! {team} tar ledelsen {score}!",
      "GALSKAP! {player} har nettopp skapt kaos på {venue}! {team} leder {score}!",
      "MAGISK! {player} har nettopp trollbundet publikum på {venue}! {team} fører {score}!",
      "DER SMELLER DET! {player} har nettopp skapt magi på {venue}! {team} tar ledelsen {score}!"
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

// Pre-match commentary templates
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

// System event templates
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

// Match summary templates
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

// Helper function to get random item from array
export const getRandomPhrase = (phrases: string[]) => {
  return phrases[Math.floor(Math.random() * phrases.length)];
};

// Calculate score at the time of a specific event
export const calculateScoreAtEvent = (event: any, allEvents: any[], homeTeamId: string) => {
  const eventTime = event.time?.elapsed || event.time || 0;
  const goalsBeforeThisEvent = allEvents.filter(e => 
    e.type === 'Goal' && 
    (e.time?.elapsed || e.time || 0) <= eventTime
  );
  
  const homeGoals = goalsBeforeThisEvent.filter(goal => 
    goal.team?.id === homeTeamId
  ).length;
  
  const awayGoals = goalsBeforeThisEvent.filter(goal => 
    goal.team?.id !== homeTeamId
  ).length;
  
  return `${homeGoals}-${awayGoals}`;
};

// Generate commentary for a single event
export const generateCommentary = (event: any, match: any) => {
  if (!event || !match) return null;

  const venueName = match.venue?.name || match.fixture?.venue?.name || 'hjemmebane';
  const homeTeamId = match.teams?.home?.id;

  switch (event.type) {
    case 'Goal':
      // Remove randomization - only use the template from commentary_path
      const goalTemplateIndex = match.commentary_path?.goal_template || 0;
      const goalTemplate = commentaryPhrases.goal[goalTemplateIndex] || commentaryPhrases.goal[0];
      const score = calculateScoreAtEvent(event, match.event_data || [], homeTeamId);
      
      return {
        type: 'goal',
        time: event.time?.elapsed || event.time || 0,
        text: goalTemplate
          .replace(/{player}/g, event.player?.name || 'Ukjent spiller')
          .replace(/{team}/g, event.team?.name || 'Laget')
          .replace(/{venue}/g, venueName)
          .replace(/{score}/g, score),
        player: event.player,
        team: event.team
      };

    case 'Card':
      const isYellow = event.detail === 'Yellow Card';
      const cardTemplateIndex = match.commentary_path?.[isYellow ? 'yellow_card_template' : 'red_card_template'] || 0;
      // Remove randomization here too
      const cardPhrases = isYellow ? commentaryPhrases.yellowCard : commentaryPhrases.redCard;
      const cardTemplate = cardPhrases[cardTemplateIndex] || cardPhrases[0];
      
      return {
        type: isYellow ? 'yellowcard' : 'redcard',
        time: event.time?.elapsed || event.time || 0,
        text: cardTemplate
          .replace(/{player}/g, event.player?.name || 'Ukjent spiller')
          .replace(/{team}/g, event.team?.name || 'Laget'),
        player: event.player,
        team: event.team
      };

    case 'Substitution':
      const subTemplateIndex = match.commentary_path?.substitution_template || 0;
      // Add randomization for substitutions
      const randomSubIndex = Math.random() > 0.7 ? Math.floor(Math.random() * commentaryPhrases.substitution.length) : subTemplateIndex;
      const subTemplate = commentaryPhrases.substitution[randomSubIndex] || commentaryPhrases.substitution[0];
      
      return {
        type: 'substitution',
        time: event.time?.elapsed || event.time || 0,
        text: subTemplate
          .replace(/{playerIn}/g, event.assist?.name || 'Spiller')
          .replace(/{playerOut}/g, event.player?.name || 'Spiller')
          .replace(/{team}/g, event.team?.name || 'Laget'),
        player: event.player,
        team: event.team
      };

    default:
      return null;
  }
};

// Generate all match events with commentary
export const generateMatchEvents = (match: any) => {
  if (!match?.event_data) return [];

  return match.event_data
    .filter((event: any) => event.time?.elapsed !== undefined)
    .map((event: any) => generateCommentary(event, match))
    .filter(Boolean)
    .sort((a: any, b: any) => (b.time || 0) - (a.time || 0));
};

// Generate pre-match content
export const generatePreMatchContent = (match: any) => {
  if (!match) return [];

  const content = [];
  const venueName = match.venue?.name || match.fixture?.venue?.name || 'stadion';
  const venueCity = match.venue?.city || match.fixture?.venue?.city || 'byen';
  const homeTeam = match.teams?.home?.name || 'Hjemmelaget';
  const awayTeam = match.teams?.away?.name || 'Bortelaget';
  const referee = match.fixture?.referee || 'Ukjent dommer';

  // Welcome message
  const welcomeTemplate = preMatchCommentary.welcome[match.commentary_path?.welcome_template || 0];
  content.push({
    type: 'welcome',
    text: welcomeTemplate
      .replace(/{venue}/g, venueName)
      .replace(/{homeTeam}/g, homeTeam)
      .replace(/{awayTeam}/g, awayTeam)
      .replace(/{broadcastInfo}/g, '')
  });

  // Venue info
  const venueTemplate = preMatchCommentary.venue[match.commentary_path?.venue_template || 0];
  content.push({
    type: 'venue',
    text: venueTemplate
      .replace(/{venue}/g, venueName)
      .replace(/{city}/g, venueCity)
  });

  // Referee info
  const refereeTemplate = preMatchCommentary.referee[match.commentary_path?.referee_template || 0];
  content.push({
    type: 'referee',
    text: refereeTemplate.replace(/{referee}/g, referee)
  });

  return content;
};

// Generate system events (like halftime, breaks, etc.)
export const generateSystemEvents = (match: any) => {
  if (!match) return [];

  const systemEvents = [];
  
  // Add halftime event if match has started
  if (match.fixture?.status?.short === 'HT' || match.fixture?.status?.short === '2H') {
    systemEvents.push({
      type: 'system',
      systemType: 'break',
      time: 45,
      text: "HALVTID! Med 0 skudd så langt begynner målet å se ut som et puslespill med manglende brikker!"
    });
  }

  // Add full-time event if match is finished
  if (match.fixture?.status?.short === 'FT') {
    systemEvents.push({
      type: 'system',
      systemType: 'fulltime',
      time: 90,
      text: "FULLTID! Kampen er over!"
    });
  }

  return systemEvents;
};

// Generate broadcast message
export const generateBroadcastMessage = (providers: any[]) => {
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

  return getRandomPhrase(templates);
};