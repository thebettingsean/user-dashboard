/**
 * Backfill NHL and MLB teams to ClickHouse teams table
 * Fetches team data from ESPN API and inserts into ClickHouse
 * 
 * POST /api/backfill/nhl-mlb-teams
 */

import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

interface ESPNTeam {
  id: string
  uid: string
  slug: string
  abbreviation: string
  displayName: string
  shortDisplayName: string
  name: string
  nickname: string
  location: string
  color: string
  alternateColor: string
  isActive: boolean
  logos: Array<{
    href: string
    alt: string
    width: number
    height: number
  }>
}

interface TeamRecord {
  team_id: number
  espn_team_id: number
  sport: string
  name: string
  abbreviation: string
  city: string
  division: string
  conference: string
  logo_url: string
  primary_color: string
  secondary_color: string
}

async function fetchESPNTeams(sport: 'hockey' | 'baseball', league: 'nhl' | 'mlb'): Promise<ESPNTeam[]> {
  const url = `${ESPN_BASE}/${sport}/${league}/teams?limit=50`
  console.log(`[${league.toUpperCase()}] Fetching teams from ESPN...`)
  console.log(`[${league.toUpperCase()}] URL: ${url}`)
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (!data.sports || !data.sports[0] || !data.sports[0].leagues || !data.sports[0].leagues[0]) {
    throw new Error('Unexpected ESPN API response structure')
  }
  
  const teams: ESPNTeam[] = data.sports[0].leagues[0].teams.map((t: any) => t.team)
  console.log(`[${league.toUpperCase()}] Found ${teams.length} teams`)
  
  return teams
}

async function fetchTeamDetails(sport: 'hockey' | 'baseball', league: 'nhl' | 'mlb', teamId: string): Promise<any> {
  const url = `${ESPN_BASE}/${sport}/${league}/teams/${teamId}`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[${league.toUpperCase()}] Could not fetch details for team ${teamId}: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    return data.team
  } catch (error: any) {
    console.warn(`[${league.toUpperCase()}] Error fetching team details for ${teamId}:`, error.message)
    return null
  }
}

function transformTeamToRecord(espnTeam: ESPNTeam, teamDetails: any, sportKey: string): TeamRecord {
  // Get the best logo (prefer the largest one)
  const logo = espnTeam.logos && espnTeam.logos.length > 0
    ? espnTeam.logos.sort((a, b) => (b.width || 0) - (a.width || 0))[0]
    : null
  
  // Extract division and conference from team details
  let division = ''
  let conference = ''
  
  if (teamDetails && teamDetails.groups) {
    const conferenceGroup = teamDetails.groups.parent || teamDetails.groups
    const divisionGroup = teamDetails.groups
    
    if (conferenceGroup && conferenceGroup.name) {
      conference = conferenceGroup.name
    }
    if (divisionGroup && divisionGroup.name && divisionGroup.name !== conference) {
      division = divisionGroup.name
    }
  }
  
  return {
    team_id: parseInt(espnTeam.id),
    espn_team_id: parseInt(espnTeam.id),
    sport: sportKey,
    name: espnTeam.displayName,
    abbreviation: espnTeam.abbreviation || espnTeam.slug.substring(0, 3).toUpperCase(),
    city: espnTeam.location || '',
    division: division,
    conference: conference,
    logo_url: logo?.href || '',
    primary_color: espnTeam.color ? `#${espnTeam.color}` : '',
    secondary_color: espnTeam.alternateColor ? `#${espnTeam.alternateColor}` : '',
  }
}

async function insertTeams(teams: TeamRecord[]): Promise<void> {
  if (teams.length === 0) {
    throw new Error('No teams to insert')
  }
  
  console.log(`[CLICKHOUSE] Inserting ${teams.length} teams...`)
  
  // Build the INSERT query
  const values = teams.map(team => {
    const escapedName = team.name.replace(/'/g, "''")
    const escapedCity = team.city.replace(/'/g, "''")
    const escapedDivision = team.division.replace(/'/g, "''")
    const escapedConference = team.conference.replace(/'/g, "''")
    
    return `(${team.team_id}, ${team.espn_team_id}, '${team.sport}', '${escapedName}', '${team.abbreviation}', '${escapedCity}', '${escapedDivision}', '${escapedConference}', '${team.logo_url}', '${team.primary_color}', '${team.secondary_color}')`
  }).join(',\n    ')
  
  const query = `
    INSERT INTO teams (team_id, espn_team_id, sport, name, abbreviation, city, division, conference, logo_url, primary_color, secondary_color)
    VALUES
    ${values}
  `
  
  const result = await clickhouseQuery(query)
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to insert teams')
  }
  
  console.log(`[CLICKHOUSE] Successfully inserted ${teams.length} teams`)
}

async function backfillSport(sport: 'hockey' | 'baseball', league: 'nhl' | 'mlb', sportKey: string) {
  console.log(`\n[${league.toUpperCase()}] Starting backfill...`)
  
  // Fetch all teams
  const espnTeams = await fetchESPNTeams(sport, league)
  
  // Fetch details for each team
  console.log(`[${league.toUpperCase()}] Fetching detailed information...`)
  const teamRecords: TeamRecord[] = []
  
  for (const espnTeam of espnTeams) {
    const teamDetails = await fetchTeamDetails(sport, league, espnTeam.id)
    const teamRecord = transformTeamToRecord(espnTeam, teamDetails, sportKey)
    teamRecords.push(teamRecord)
    
    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`[${league.toUpperCase()}] Sample team:`, JSON.stringify(teamRecords[0], null, 2))
  
  // Insert into ClickHouse
  await insertTeams(teamRecords)
  
  console.log(`[${league.toUpperCase()}] Backfill complete!`)
  
  return teamRecords.length
}

export async function POST() {
  try {
    console.log('[BACKFILL] Starting NHL & MLB teams backfill...')
    
    const results = {
      nhl: 0,
      mlb: 0,
    }
    
    // Backfill NHL teams
    results.nhl = await backfillSport('hockey', 'nhl', 'nhl')
    
    // Backfill MLB teams
    results.mlb = await backfillSport('baseball', 'mlb', 'mlb')
    
    console.log('[BACKFILL] All teams backfilled successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Successfully backfilled NHL & MLB teams',
      teams_added: results,
      total: results.nhl + results.mlb
    })
    
  } catch (error: any) {
    console.error('[BACKFILL] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute timeout

