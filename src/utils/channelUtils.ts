interface StreamingProvider {
  name: string;
  icon: string;
  package?: string;
  url: string;
}

export const STREAMING_PROVIDERS = {
  TV2_PLAY_PREMIUM: {
    name: 'TV 2 Play Premium',
    icon: '/images/channels/tv2play.png',
    package: 'TV 2 Play Premium',
    url: 'https://play.tv2.no/sport'
  },
  TV2_PLAY_BASIC: {
    name: 'TV 2 Play',
    icon: '/images/channels/tv2play.png',
    package: 'Basic',
    url: 'https://play.tv2.no/sport'
  },
  VIAPLAY_TOTAL: {
    name: 'Viaplay Total',
    icon: '/images/channels/viaplay.jpg',
    package: 'V Premium / Viaplay Total',
    url: 'https://viaplay.no/sport'
  },
  VIAPLAY_MEDIUM: {
    name: 'Viaplay Medium',
    icon: '/images/channels/viaplay.jpg',
    package: 'V Sport med Viaplay Medium',
    url: 'https://viaplay.no/sport'
  },
  NRK: {
    name: 'NRK',
    icon: '/images/channels/nrk.png',
    package: 'Basic',
    url: 'https://www.nrk.no/sport/'
  },
  VG: {
    name: 'VG',
    icon: '/images/channels/vg.png',
    url: 'https://tv.vg.no/kategori/3/sport'
  },
  MAX_SPORT: {
    name: 'Max Sport',
    icon: '/images/channels/max.png',
    package: 'Max Sport',
    url: 'https://www.maxsport.no'
  }
};

export function getStreamingProviders(leagueId: number): StreamingProvider[] {
  switch (leagueId) {
    // Norwegian Leagues
    case 103: // Eliteserien
      return [STREAMING_PROVIDERS.TV2_PLAY_PREMIUM]; // 2022-2028
    case 104: // OBOS-ligaen
      return [STREAMING_PROVIDERS.TV2_PLAY_PREMIUM]; // 2022-2028
    case 725: // Toppserien
      return [STREAMING_PROVIDERS.TV2_PLAY_PREMIUM, STREAMING_PROVIDERS.NRK]; // 2022-2028
    
    // English Football
    case 39: // Premier League
      return [STREAMING_PROVIDERS.VIAPLAY_TOTAL]; // 2022-2028
    case 45: // FA Cup
      return [STREAMING_PROVIDERS.VIAPLAY_TOTAL, STREAMING_PROVIDERS.TV2_PLAY_PREMIUM]; // til 2025
    case 48: // League Cup
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM]; // til 2024
    case 40: // Championship
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM]; // til 2024
    
    // European Competitions
    case 2: // Champions League
      return [STREAMING_PROVIDERS.TV2_PLAY_PREMIUM]; // 2021-2027
    case 3: // Europa League
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM]; // 2021-2024
    case 848: // Conference League
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM]; // 2021-2024
    
    // Other Major Leagues
    case 140: // La Liga
      return [STREAMING_PROVIDERS.TV2_PLAY_PREMIUM]; // 2021-2026
    case 135: // Serie A
      return [STREAMING_PROVIDERS.VG];
    case 78: // Bundesliga
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM]; // til 2025
    case 61: // Ligue 1
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM]; // til 2023
    
    // Scandinavian Leagues
    case 144: // Allsvenskan
      return [STREAMING_PROVIDERS.MAX_SPORT];
    case 179: // Superligaen
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM];
    
    // International Competitions
    case 1: // World Cup
    case 4: // Euro Championship 2024
      return [STREAMING_PROVIDERS.NRK, STREAMING_PROVIDERS.TV2_PLAY_BASIC];
    case 5: // Nations League
      return [STREAMING_PROVIDERS.TV2_PLAY_BASIC]; // til 2028
    case 15: // Copa America 2024
      return [STREAMING_PROVIDERS.VIAPLAY_MEDIUM];
    
    default:
      return [];
  }
} 