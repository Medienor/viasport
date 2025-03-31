// Basic types
interface Period {
    first?: number | null;
    second?: number | null;
  }
  
  interface Score {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  }
  
  interface Team {
    id: number;
    name: string;
    logo: string;
    winner: boolean | null;
  }
  
  interface League {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
    standings: boolean;
  }
  
  interface Status {
    long: string;
    short: string;
    elapsed: number | null;
  }
  
  interface Venue {
    id?: number;
    name?: string;
    city?: string;
  }
  
  // Main Fixture type
  export interface Fixture {
    fixture: {
      id: number;
      referee: string | null;
      timezone: string;
      date: string;
      timestamp: number;
      periods: Period;
      venue: Venue;
      status: Status;
    };
    league: League;
    teams: {
      home: Team;
      away: Team;
    };
    goals: {
      home: number | null;
      away: number | null;
    };
    score: Score;
  }
  
  // API Response type
  export interface ApiResponse {
    response: Fixture[];
    errors: string[];
    results: number;
  }