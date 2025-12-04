import { NextResponse } from 'next/server'
import { clickhouseInsert } from '@/lib/clickhouse'

const ESPN_NBA_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

const NBA_TEAMS = {
  'Atlanta Hawks': { id: 1, abbr: 'ATL' },
  'Boston Celtics': { id: 2, abbr: 'BOS' },
  'Brooklyn Nets': { id: 17, abbr: 'BKN' },
  'Charlotte Hornets': { id: 30, abbr: 'CHA' },
  'Chicago Bulls': { id: 4, abbr: 'CHI' },
  'Cleveland Cavaliers': { id: 5, abbr: 'CLE' },
  'Dallas Mavericks': { id: 6, abbr: 'DAL' },
  'Denver Nuggets': { id: 7, abbr: 'DEN' },
  'Detroit Pistons': { id: 8, abbr: 'DET' },
  'Golden State Warriors': { id: 9, abbr: 'GSW' },
  'Houston Rockets': { id: 10, abbr: 'HOU' },
  'Indiana Pacers': { id: 11, abbr: 'IND' },
  'LA Clippers': { id: 12, abbr: 'LAC' },
  'Los Angeles Lakers': { id: 13, abbr: 'LAL' },
  'Memphis Grizzlies': { id: 29, abbr: 'MEM' },
  'Miami Heat': { id: 14, abbr: 'MIA' },
  'Milwaukee Bucks': { id: 15, abbr: 'MIL' },
  'Minnesota Timberwolves': { id: 16, abbr: 'MIN' },
  'New Orleans Pelicans': { id: 3, abbr: 'NOP' },
  'New York Knicks': { id: 18, abbr: 'NYK' },
  'Oklahoma City Thunder': { id: 25, abbr: 'OKC' },
  'Orlando Magic': { id: 19, abbr: 'ORL' },
  'Philadelphia 76ers': { id: 20, abbr: 'PHI' },
  'Phoenix Suns': { id: 21, abbr: 'PHX' },
  'Portland Trail Blazers': { id: 22, abbr: 'POR' },
  'Sacramento Kings': { id: 23, abbr: 'SAC' },
  'San Antonio Spurs': { id: 24, abbr: 'SAS' },
  'Toronto Raptors': { id: 28, abbr: 'TOR' },
  'Utah Jazz': { id: 26, abbr: 'UTA' },
  'Washington Wizards': { id: 27, abbr: 'WAS' }
}

// ESPN Division ID Mapping
const NBA_DIVISIONS: Record<string, { name: string, conference: string }> = {
  '1': { name: 'Atlantic', conference: 'Eastern' },
  '2': { name: 'Central', conference: 'Eastern' },
  '9': { name: 'Southeast', conference: 'Eastern' },
  '4': { name: 'Pacific', conference: 'Western' },
  '10': { name: 'Southwest', conference: 'Western' },
  '11': { name: 'Northwest', conference: 'Western' }
}

export async function GET(request: Request) {
  try {
    console.log('[NBA Sync] Starting NBA player and team sync...')

    const summary = {
      teams_synced: 0,
      players_synced: 0,
      injuries_updated: 0,
      errors: [] as string[]
    }

    // Step 1: Sync Teams
    console.log('[NBA Sync] Fetching team data from ESPN...')
    const teamsData = []

    for (const [teamName, teamData] of Object.entries(NBA_TEAMS)) {
      try {
        const response = await fetch(`${ESPN_NBA_URL}/teams/${teamData.id}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()

        // Get division info from mapping
        const divisionId = data.team?.groups?.id
        const divisionInfo = divisionId ? NBA_DIVISIONS[divisionId] : null

        // NBA uses logos array, prefer default 500px logo
        const defaultLogo = data.team?.logos?.find((l: any) => 
          l.rel?.includes('default') && l.width === 500
        )

        teamsData.push({
          team_id: teamData.id,
          espn_team_id: teamData.id,
          sport: 'nba',
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
        console.error(`[NBA Sync] Error fetching team ${teamName}:`, err.message)
        summary.errors.push(`Team ${teamName}: ${err.message}`)
      }
    }

    // Insert teams into ClickHouse
    if (teamsData.length > 0) {
      console.log(`[NBA Sync] Inserting ${teamsData.length} teams into ClickHouse...`)
      await clickhouseInsert('teams', teamsData)
      summary.teams_synced = teamsData.length
    }

    // Step 2: Sync Players
    console.log('[NBA Sync] Fetching player rosters from ESPN...')
    const allPlayers = []

    for (const [teamName, teamData] of Object.entries(NBA_TEAMS)) {
      try {
        const response = await fetch(`${ESPN_NBA_URL}/teams/${teamData.id}/roster`)
        if (!response.ok) {
          console.warn(`[NBA Sync] Failed to fetch roster for ${teamName}: ${response.status}`)
          continue
        }

        const data = await response.json()

        // NBA has flat athletes array
        if (data.athletes && Array.isArray(data.athletes)) {
          data.athletes.forEach((player: any) => {
            const position = player.position?.abbreviation
            if (!position) return

            const hasInjury = player.injuries && player.injuries.length > 0
            const injuryStatus = hasInjury ? (player.injuries[0].status || 'injured') : 'healthy'
            
            if (hasInjury) {
              summary.injuries_updated++
            }

            allPlayers.push({
              player_id: parseInt(player.id),
              espn_player_id: parseInt(player.id),
              sport: 'nba',
              name: player.displayName || player.fullName,
              team_id: teamData.id,
              position: position,
              jersey_number: parseInt(player.jersey) || 0,
              height: player.displayHeight || '',
              weight: parseInt(player.weight) || 0,
              is_active: player.status?.type === 'active' ? 1 : 0,
              injury_status: injuryStatus,
              headshot_url: player.headshot?.href || '',
              created_at: Math.floor(Date.now() / 1000),
              updated_at: Math.floor(Date.now() / 1000)
            })
          })
        }

        await new Promise(r => setTimeout(r, 100)) // Rate limit
      } catch (err: any) {
        console.error(`[NBA Sync] Error loading ${teamName} roster:`, err.message)
        summary.errors.push(`Roster ${teamName}: ${err.message}`)
      }
    }

    // Batch insert players (100 at a time)
    console.log(`[NBA Sync] Inserting ${allPlayers.length} players into ClickHouse...`)
    for (let i = 0; i < allPlayers.length; i += 100) {
      const batch = allPlayers.slice(i, i + 100)
      try {
        await clickhouseInsert('players', batch)
        summary.players_synced += batch.length
      } catch (err: any) {
        console.error(`[NBA Sync] Error inserting batch ${i}:`, err.message)
        summary.errors.push(`Players batch ${i}: ${err.message}`)
      }
    }

    console.log('[NBA Sync] Complete:', summary)

    return NextResponse.json({
      success: true,
      sport: 'nba',
      ...summary
    })

  } catch (error: any) {
    console.error('[NBA Sync] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        sport: 'nba'
      },
      { status: 500 }
    )
  }
}

