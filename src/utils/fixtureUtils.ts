import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface FixtureTeams {
  home: {
    id: number
    name: string
    logo: string
    winner: boolean | null
  }
  away: {
    id: number
    name: string
    logo: string
    winner: boolean | null
  }
}

interface Fixture {
  id: number
  date: string
  league_id: number
  home_team_id: number
  away_team_id: number
  teams: FixtureTeams
  status: any
  score: any
  venue: any
}

export async function findMatchingFixture(
  matchStartTime: string,
  homeTeamId: number,
  awayTeamId: number
): Promise<Fixture | null> {
  const supabase = createClientComponentClient()
  
  try {
    // Extract the date part from the match start time (YYYY-MM-DD)
    const matchDate = new Date(matchStartTime).toISOString().split('T')[0]
    
    // Query fixtures for the same date
    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select('*')
      .gte('date', `${matchDate}T00:00:00Z`)
      .lt('date', `${matchDate}T23:59:59Z`)
    
    if (error) {
      console.error('Error fetching fixtures:', error)
      return null
    }
    
    if (!fixtures || fixtures.length === 0) {
      console.log('No fixtures found for date:', matchDate)
      return null
    }
    
    // Find the fixture with matching team IDs
    const matchingFixture = fixtures.find((fixture: any) => {
      if (!fixture.teams) return false
      
      const teams = fixture.teams as FixtureTeams
      const homeMatch = teams.home?.id === homeTeamId
      const awayMatch = teams.away?.id === awayTeamId
      
      return homeMatch && awayMatch
    })
    
    if (matchingFixture) {
      console.log('Found matching fixture:', matchingFixture.id)
      return matchingFixture
    } else {
      console.log('No matching fixture found for teams:', { homeTeamId, awayTeamId, matchDate })
      return null
    }
    
  } catch (error) {
    console.error('Error in findMatchingFixture:', error)
    return null
  }
} 