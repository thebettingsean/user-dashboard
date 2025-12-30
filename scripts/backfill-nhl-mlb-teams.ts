/**
 * Backfill NHL and MLB teams to ClickHouse teams table
 * Fetches team data from ESPN API and inserts into ClickHouse
 * 
 * Run: npx tsx scripts/backfill-nhl-mlb-teams.ts
 */

import { clickhouseQuery } from '../lib/clickhouse'

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
  console.log(`\n📡 Fetching ${league.toUpperCase()} teams from ESPN...`)
  console.log(`   URL: ${url}`)
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.sports || !data.sports[0] || !data.sports[0].leagues || !data.sports[0].leagues[0]) {
      throw new Error('Unexpected ESPN API response structure')
    }
    
    const teams: ESPNTeam[] = data.sports[0].leagues[0].teams.map((t: any) => t.team)
    console.log(`✅ Found ${teams.length} teams`)
    
    return teams
  } catch (error: any) {
    console.error(`❌ Error fetching ${league.toUpperCase()} teams:`, error.message)
    throw error
  }
}

async function fetchTeamDetails(sport: 'hockey' | 'baseball', league: 'nhl' | 'mlb', teamId: string): Promise<any> {
  const url = `${ESPN_BASE}/${sport}/${league}/teams/${teamId}`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`⚠️  Could not fetch details for team ${teamId}: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    return data.team
  } catch (error: any) {
    console.warn(`⚠️  Error fetching team details for ${teamId}:`, error.message)
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
    // groups usually contains: { id: "X", name: "Conference Name", ... }
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
    sport: sportKey, // 'nhl' or 'mlb'
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
    console.log('⚠️  No teams to insert')
    return
  }
  
  console.log(`\n💾 Inserting ${teams.length} teams into ClickHouse...`)
  
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
  
  if (result.success) {
    console.log(`✅ Successfully inserted ${teams.length} teams`)
  } else {
    console.error(`❌ Error inserting teams:`, result.error)
    throw new Error(result.error)
  }
}

async function backfillSport(sport: 'hockey' | 'baseball', league: 'nhl' | 'mlb', sportKey: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  BACKFILLING ${league.toUpperCase()} TEAMS`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    // Fetch all teams
    const espnTeams = await fetchESPNTeams(sport, league)
    
    // Fetch details for each team (to get division/conference)
    console.log(`\n🔍 Fetching detailed information for each team...`)
    const teamRecords: TeamRecord[] = []
    
    for (const espnTeam of espnTeams) {
      console.log(`  ${espnTeam.displayName}...`)
      const teamDetails = await fetchTeamDetails(sport, league, espnTeam.id)
      const teamRecord = transformTeamToRecord(espnTeam, teamDetails, sportKey)
      teamRecords.push(teamRecord)
      
      // Small delay to be respectful to ESPN API
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Log sample of what we're inserting
    console.log(`\n📊 Sample team record:`)
    console.log(JSON.stringify(teamRecords[0], null, 2))
    
    // Insert into ClickHouse
    await insertTeams(teamRecords)
    
    console.log(`\n✅ ${league.toUpperCase()} backfill complete!`)
    
  } catch (error: any) {
    console.error(`\n❌ ${league.toUpperCase()} backfill failed:`, error.message)
    console.error(error.stack)
    throw error
  }
}

async function main() {
  console.log('🏒🏀 NHL & MLB TEAMS BACKFILL SCRIPT')
  console.log(`Started at: ${new Date().toISOString()}\n`)
  
  try {
    // Backfill NHL teams
    await backfillSport('hockey', 'nhl', 'nhl')
    
    // Backfill MLB teams
    await backfillSport('baseball', 'mlb', 'mlb')
    
    console.log(`\n${'='.repeat(60)}`)
    console.log('  ✅ ALL TEAMS BACKFILLED SUCCESSFULLY')
    console.log(`${'='.repeat(60)}`)
    console.log(`\nCompleted at: ${new Date().toISOString()}`)
    
  } catch (error) {
    console.log(`\n${'='.repeat(60)}`)
    console.log('  ❌ BACKFILL FAILED')
    console.log(`${'='.repeat(60)}`)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

