import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// --- Interfaces based on API Response ---

interface ApiPlayerInfo {
  id: number
  name: string
}

interface ApiTeamInfo {
  id: number
  name: string
  logo: string
}

interface ApiTransferTeams {
  in: ApiTeamInfo
  out: ApiTeamInfo
}

interface ApiTransfer {
  date: string // Format: "2006-08-10"
  type: string // e.g., "€ 250K", "Loan", "Free", "N/A"
  teams: ApiTransferTeams
}

interface ApiPlayerTransferItem {
  player: ApiPlayerInfo
  update: string // Last update timestamp
  transfers: ApiTransfer[]
}

type ApiResponse = ApiPlayerTransferItem[]

// --- Configuration ---

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const API_CALL_DELAY_MS = 120 // Delay between RapidAPI calls

// --- Utility Functions ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- Core Logic ---

async function getTargetTeams(supabase: any): Promise<{ teamId: number; teamName: string }[]> {
  console.log('Fetching target teams from target_leagues_teams...')
  
  const { data: teams, error } = await supabase
    .from('target_leagues_teams')
    .select('team_id, team_name')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching target teams:', error)
    throw new Error(`Failed to fetch target teams: ${error.message}`)
  }

  const teamList = teams?.map((team: any) => ({
    teamId: team.team_id,
    teamName: team.team_name
  })) || []

  console.log(`Found ${teamList.length} target teams`)
  return teamList
}

async function fetchPlayerTransfersForTeam(teamId: number, apiKey: string): Promise<ApiResponse> {
  console.log(`Fetching transfers for Team ${teamId}...`)
  
  const url = `https://api-football-v1.p.rapidapi.com/v3/transfers?team=${teamId}`
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
    },
  }

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      console.error(`API Error for team ${teamId}: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()
    
    if (data && data.response && Array.isArray(data.response)) {
      console.log(`Fetched ${data.response.length} player transfer records for team ${teamId}`)
      return data.response
    } else {
      console.warn(`Unexpected API response structure for team ${teamId}`)
      return []
    }
  } catch (error) {
    console.error(`Network error fetching transfers for team ${teamId}:`, error)
    return []
  }
}

async function storePlayerTransfers(supabase: any, transfersData: ApiResponse, teamId: number) {
  if (!transfersData || transfersData.length === 0) {
    console.log('No transfer data received to store.')
    return
  }

  const recordsToUpsert = []
  const seenTransfers = new Set() // Track duplicates within this batch

  for (const playerItem of transfersData) {
    const playerInfo = playerItem.player
    const transfers = playerItem.transfers

    if (!playerInfo || !playerInfo.id || !transfers || transfers.length === 0) {
      console.warn('Skipping player due to missing info or transfers:', playerInfo?.id)
      continue
    }

    // Process each transfer for this player
    for (const transfer of transfers) {
      if (!transfer.teams?.in || !transfer.teams?.out) {
        console.warn(`Skipping transfer for player ${playerInfo.id} due to missing team info`)
        continue
      }

      // Parse the transfer date
      let transferDate: string | null = null
      if (transfer.date) {
        try {
          // Validate date format (YYYY-MM-DD)
          const dateObj = new Date(transfer.date)
          if (!isNaN(dateObj.getTime())) {
            transferDate = transfer.date
          }
        } catch (e) {
          console.warn(`Invalid date format for player ${playerInfo.id}: ${transfer.date}`)
        }
      }

      // Create unique key to check for duplicates within this batch
      const uniqueKey = `${playerInfo.id}-${teamId}-${transferDate}-${transfer.teams.in.id}-${transfer.teams.out.id}`
      
      if (seenTransfers.has(uniqueKey)) {
        console.warn(`Skipping duplicate transfer in batch: ${uniqueKey}`)
        continue
      }
      seenTransfers.add(uniqueKey)

      const record = {
        player_id: playerInfo.id,
        player_name: playerInfo.name,
        team_id: teamId, // The team we're fetching transfers for
        transfer_date: transferDate,
        transfer_type: transfer.type || null,
        team_in_id: transfer.teams.in.id,
        team_in_name: transfer.teams.in.name,
        team_in_logo: transfer.teams.in.logo,
        team_out_id: transfer.teams.out.id,
        team_out_name: transfer.teams.out.name,
        team_out_logo: transfer.teams.out.logo,
        api_raw_data: transfer, // Store the raw transfer data
        last_updated: new Date().toISOString(),
      }

      recordsToUpsert.push(record)
    }
  }

  if (recordsToUpsert.length > 0) {
    console.log(`Upserting ${recordsToUpsert.length} transfer records for team ${teamId}...`)
    
    const { error } = await supabase
      .from('player_transfers')
      .upsert(recordsToUpsert, {
        onConflict: 'player_id, team_id, transfer_date, team_in_id, team_out_id',
      })

    if (error) {
      console.error('Error upserting transfer records:', error)
    } else {
      console.log(`Successfully upserted ${recordsToUpsert.length} transfer records for team ${teamId}`)
    }
  } else {
    console.log(`No valid transfer records to upsert for team ${teamId}`)
  }
}

// --- Main Function Handler ---
serve(async (req) => {
  try {
    // Validate environment variables
    if (!RAPIDAPI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables (RAPIDAPI_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all target teams
    const allTeams = await getTargetTeams(supabaseAdmin)
    const totalTeams = allTeams.length

    if (totalTeams === 0) {
      return new Response(JSON.stringify({ message: 'No teams found.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // For daily scheduled runs, process ALL teams
    console.log(`Starting daily sync for all ${totalTeams} teams...`)
    
    let totalProcessed = 0
    
    for (let i = 0; i < allTeams.length; i++) {
      const team = allTeams[i]
      const { teamId, teamName } = team
      
      console.log(`(${i + 1}/${totalTeams}) Processing ${teamName} (ID: ${teamId})`)
      
      const transfersData = await fetchPlayerTransfersForTeam(teamId, RAPIDAPI_KEY!)
      await storePlayerTransfers(supabaseAdmin, transfersData, teamId)
      
      totalProcessed++
      
      // Small delay between API calls to respect rate limits (900/min = 1.5 calls/sec)
      if (totalProcessed < totalTeams) {
        console.log(`Waiting ${API_CALL_DELAY_MS}ms before next team...`)
        await delay(API_CALL_DELAY_MS)
      }
    }

    console.log(`Daily sync completed! Processed ${totalProcessed} teams.`)
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Daily sync completed successfully!`,
      teamsProcessed: totalProcessed,
      totalTeams: totalTeams,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing transfers:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})