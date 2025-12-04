import { NextResponse } from 'next/server'
import { clickhouseInsert, clickhouseCommand } from '@/lib/clickhouse'

const ESPN_NFL_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

const NFL_TEAMS = {
  'Arizona Cardinals': { id: 22, abbr: 'ARI' },
  'Atlanta Falcons': { id: 1, abbr: 'ATL' },
  'Baltimore Ravens': { id: 33, abbr: 'BAL' },
  'Buffalo Bills': { id: 2, abbr: 'BUF' },
  'Carolina Panthers': { id: 29, abbr: 'CAR' },
  'Chicago Bears': { id: 3, abbr: 'CHI' },
  'Cincinnati Bengals': { id: 4, abbr: 'CIN' },
  'Cleveland Browns': { id: 5, abbr: 'CLE' },
  'Dallas Cowboys': { id: 6, abbr: 'DAL' },
  'Denver Broncos': { id: 7, abbr: 'DEN' },
  'Detroit Lions': { id: 8, abbr: 'DET' },
  'Green Bay Packers': { id: 9, abbr: 'GB' },
  'Houston Texans': { id: 34, abbr: 'HOU' },
  'Indianapolis Colts': { id: 11, abbr: 'IND' },
  'Jacksonville Jaguars': { id: 30, abbr: 'JAX' },
  'Kansas City Chiefs': { id: 12, abbr: 'KC' },
  'Las Vegas Raiders': { id: 13, abbr: 'LV' },
  'Los Angeles Chargers': { id: 24, abbr: 'LAC' },
  'Los Angeles Rams': { id: 14, abbr: 'LAR' },
  'Miami Dolphins': { id: 15, abbr: 'MIA' },
  'Minnesota Vikings': { id: 16, abbr: 'MIN' },
  'New England Patriots': { id: 17, abbr: 'NE' },
  'New Orleans Saints': { id: 18, abbr: 'NO' },
  'New York Giants': { id: 19, abbr: 'NYG' },
  'New York Jets': { id: 20, abbr: 'NYJ' },
  'Philadelphia Eagles': { id: 21, abbr: 'PHI' },
  'Pittsburgh Steelers': { id: 23, abbr: 'PIT' },
  'San Francisco 49ers': { id: 25, abbr: 'SF' },
  'Seattle Seahawks': { id: 26, abbr: 'SEA' },
  'Tampa Bay Buccaneers': { id: 27, abbr: 'TB' },
  'Tennessee Titans': { id: 10, abbr: 'TEN' },
  'Washington Commanders': { id: 28, abbr: 'WAS' }
}

const NFL_PROP_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K']

// ESPN Division ID Mapping (confirmed from ESPN API)
const NFL_DIVISIONS: Record<string, { name: string, conference: string }> = {
  '1': { name: 'NFC East', conference: 'NFC' },
  '3': { name: 'NFC West', conference: 'NFC' },
  '10': { name: 'NFC North', conference: 'NFC' },
  '11': { name: 'NFC South', conference: 'NFC' },
  '4': { name: 'AFC East', conference: 'AFC' },
  '6': { name: 'AFC West', conference: 'AFC' },
  '12': { name: 'AFC North', conference: 'AFC' },
  '13': { name: 'AFC South', conference: 'AFC' }
}

export async function GET(request: Request) {
  try {
    console.log('[NFL Sync] Starting NFL player and team sync...')

    const summary = {
      teams_synced: 0,
      players_synced: 0,
      injuries_updated: 0,
      errors: [] as string[]
    }

    // Step 1: Sync Teams
    console.log('[NFL Sync] Fetching team data from ESPN...')
    const teamsData = []

    for (const [teamName, teamData] of Object.entries(NFL_TEAMS)) {
      try {
        const response = await fetch(`${ESPN_NFL_URL}/teams/${teamData.id}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()

        // Get division info from mapping
        const divisionId = data.team?.groups?.id
        const divisionInfo = divisionId ? NFL_DIVISIONS[divisionId] : null

        // Get logo URL (prefer default 500px logo)
        const defaultLogo = data.team?.logos?.find((l: any) => 
          l.rel?.includes('default') && l.width === 500
        )

        teamsData.push({
          team_id: teamData.id,
          espn_team_id: teamData.id,
          sport: 'nfl',
          name: teamName,
          abbreviation: teamData.abbr,
          city: data.team?.location || teamName.split(' ')[0],
          division: divisionInfo?.name || '',
          conference: divisionInfo?.conference || '',
          logo_url: defaultLogo?.href || data.team?.logos?.[0]?.href || '',
          primary_color: data.team?.color ? `#${data.team.color}` : '',
          secondary_color: data.team?.alternateColor ? `#${data.team.alternateColor}` : '',
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000)
        })

        await new Promise(r => setTimeout(r, 50)) // Rate limit
      } catch (err: any) {
        console.error(`[NFL Sync] Error fetching team ${teamName}:`, err.message)
        summary.errors.push(`Team ${teamName}: ${err.message}`)
      }
    }

    // Insert teams into ClickHouse
    if (teamsData.length > 0) {
      console.log(`[NFL Sync] Inserting ${teamsData.length} teams into ClickHouse...`)
      await clickhouseInsert('teams', teamsData)
      summary.teams_synced = teamsData.length
    }

    // Step 2: Sync Players
    console.log('[NFL Sync] Fetching player rosters from ESPN...')
    const allPlayers = []

    for (const [teamName, teamData] of Object.entries(NFL_TEAMS)) {
      try {
        const response = await fetch(`${ESPN_NFL_URL}/teams/${teamData.id}/roster`)
        if (!response.ok) {
          console.warn(`[NFL Sync] Failed to fetch roster for ${teamName}: ${response.status}`)
          continue
        }

        const data = await response.json()

        data.athletes?.forEach((group: any) => {
          group.items?.forEach((player: any) => {
            const position = player.position?.abbreviation
            if (!position || !NFL_PROP_POSITIONS.includes(position)) return

            const injuryStatus = player.injuries?.[0]?.status || 'healthy'
            if (player.injuries?.length > 0) {
              summary.injuries_updated++
            }

            allPlayers.push({
              player_id: parseInt(player.id),
              espn_player_id: parseInt(player.id),
              sport: 'nfl',
              name: player.displayName || player.fullName,
              team_id: teamData.id,
              position: position,
              jersey_number: parseInt(player.jersey) || 0,
              height: player.height?.formatted || player.displayHeight || '',
              weight: parseInt(player.weight) || 0,
              is_active: 1,
              injury_status: injuryStatus,
              headshot_url: player.headshot?.href || '',
              created_at: Math.floor(Date.now() / 1000),
              updated_at: Math.floor(Date.now() / 1000)
            })
          })
        })

        await new Promise(r => setTimeout(r, 100)) // Rate limit
      } catch (err: any) {
        console.error(`[NFL Sync] Error loading ${teamName} roster:`, err.message)
        summary.errors.push(`Roster ${teamName}: ${err.message}`)
      }
    }

    // Batch insert players (100 at a time)
    console.log(`[NFL Sync] Inserting ${allPlayers.length} players into ClickHouse...`)
    for (let i = 0; i < allPlayers.length; i += 100) {
      const batch = allPlayers.slice(i, i + 100)
      try {
        await clickhouseInsert('players', batch)
        summary.players_synced += batch.length
      } catch (err: any) {
        console.error(`[NFL Sync] Error inserting batch ${i}:`, err.message)
        summary.errors.push(`Players batch ${i}: ${err.message}`)
      }
    }

    console.log('[NFL Sync] Complete:', summary)

    return NextResponse.json({
      success: true,
      sport: 'nfl',
      ...summary
    })

  } catch (error: any) {
    console.error('[NFL Sync] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        sport: 'nfl'
      },
      { status: 500 }
    )
  }
}

