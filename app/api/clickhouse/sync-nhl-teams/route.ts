import { NextResponse } from 'next/server'
import { clickhouseInsert } from '@/lib/clickhouse'

// ESPN API for NHL
// Docs: https://github.com/pseudo-r/Public-ESPN-API
const ESPN_NHL_URL = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl'

// 32 NHL Teams
const NHL_TEAMS = {
  'Anaheim Ducks': { id: 25, abbr: 'ANA' },
  'Arizona Coyotes': { id: 53, abbr: 'ARI' }, // Now Utah Hockey Club
  'Boston Bruins': { id: 1, abbr: 'BOS' },
  'Buffalo Sabres': { id: 2, abbr: 'BUF' },
  'Calgary Flames': { id: 3, abbr: 'CGY' },
  'Carolina Hurricanes': { id: 7, abbr: 'CAR' },
  'Chicago Blackhawks': { id: 4, abbr: 'CHI' },
  'Colorado Avalanche': { id: 17, abbr: 'COL' },
  'Columbus Blue Jackets': { id: 29, abbr: 'CBJ' },
  'Dallas Stars': { id: 9, abbr: 'DAL' },
  'Detroit Red Wings': { id: 5, abbr: 'DET' },
  'Edmonton Oilers': { id: 6, abbr: 'EDM' },
  'Florida Panthers': { id: 26, abbr: 'FLA' },
  'Los Angeles Kings': { id: 8, abbr: 'LAK' },
  'Minnesota Wild': { id: 30, abbr: 'MIN' },
  'Montreal Canadiens': { id: 10, abbr: 'MTL' },
  'Nashville Predators': { id: 18, abbr: 'NSH' },
  'New Jersey Devils': { id: 11, abbr: 'NJD' },
  'New York Islanders': { id: 12, abbr: 'NYI' },
  'New York Rangers': { id: 13, abbr: 'NYR' },
  'Ottawa Senators': { id: 14, abbr: 'OTT' },
  'Philadelphia Flyers': { id: 15, abbr: 'PHI' },
  'Pittsburgh Penguins': { id: 16, abbr: 'PIT' },
  'San Jose Sharks': { id: 19, abbr: 'SJS' },
  'Seattle Kraken': { id: 36, abbr: 'SEA' },
  'St. Louis Blues': { id: 20, abbr: 'STL' },
  'Tampa Bay Lightning': { id: 27, abbr: 'TBL' },
  'Toronto Maple Leafs': { id: 21, abbr: 'TOR' },
  'Utah Hockey Club': { id: 37, abbr: 'UTA' },
  'Vancouver Canucks': { id: 22, abbr: 'VAN' },
  'Vegas Golden Knights': { id: 37, abbr: 'VGK' },
  'Washington Capitals': { id: 23, abbr: 'WSH' },
  'Winnipeg Jets': { id: 52, abbr: 'WPG' }
}

// NHL Division mapping
const NHL_DIVISIONS: Record<string, { name: string, conference: string }> = {
  '1': { name: 'Atlantic', conference: 'Eastern' },
  '2': { name: 'Metropolitan', conference: 'Eastern' },
  '3': { name: 'Central', conference: 'Western' },
  '4': { name: 'Pacific', conference: 'Western' }
}

export async function GET(request: Request) {
  try {
    console.log('[NHL Sync] Starting NHL team sync...')

    const summary = {
      teams_synced: 0,
      errors: [] as string[]
    }

    const teamsData = []

    // First try to get all teams from list endpoint
    try {
      const listResponse = await fetch(`${ESPN_NHL_URL}/teams?limit=50`)
      if (listResponse.ok) {
        const listData = await listResponse.json()
        
        for (const team of listData.sports?.[0]?.leagues?.[0]?.teams || []) {
          const teamInfo = team.team
          
          // Get logo (prefer default 500px)
          const defaultLogo = teamInfo.logos?.find((l: any) => 
            l.rel?.includes('default') && l.width === 500
          )
          
          teamsData.push({
            team_id: parseInt(teamInfo.id),
            espn_team_id: parseInt(teamInfo.id),
            sport: 'nhl',
            name: teamInfo.displayName || teamInfo.name,
            abbreviation: teamInfo.abbreviation || '',
            city: teamInfo.location || '',
            division: '', // Will be fetched from individual team endpoint
            conference: '',
            logo_url: defaultLogo?.href || teamInfo.logos?.[0]?.href || '',
            primary_color: teamInfo.color ? `#${teamInfo.color}` : '',
            secondary_color: teamInfo.alternateColor ? `#${teamInfo.alternateColor}` : '',
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          })
        }
        console.log(`[NHL Sync] Found ${teamsData.length} teams from list endpoint`)
      }
    } catch (err: any) {
      console.log('[NHL Sync] List endpoint failed, falling back to individual teams')
    }

    // Fallback or supplement with individual team fetches
    if (teamsData.length < 30) {
      console.log('[NHL Sync] Fetching individual teams from ESPN...')
      
      for (const [teamName, teamData] of Object.entries(NHL_TEAMS)) {
        // Skip if already have this team
        if (teamsData.some(t => t.team_id === teamData.id)) continue
        
        try {
          const response = await fetch(`${ESPN_NHL_URL}/teams/${teamData.id}`)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          const data = await response.json()

          const divisionId = data.team?.groups?.id?.toString()
          const divisionInfo = divisionId ? NHL_DIVISIONS[divisionId] : null

          const defaultLogo = data.team?.logos?.find((l: any) => 
            l.rel?.includes('default') && l.width === 500
          )

          teamsData.push({
            team_id: teamData.id,
            espn_team_id: teamData.id,
            sport: 'nhl',
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

          await new Promise(r => setTimeout(r, 50))
        } catch (err: any) {
          console.error(`[NHL Sync] Error fetching team ${teamName}:`, err.message)
          summary.errors.push(`Team ${teamName}: ${err.message}`)
        }
      }
    }

    // Insert teams into ClickHouse
    if (teamsData.length > 0) {
      console.log(`[NHL Sync] Inserting ${teamsData.length} teams into ClickHouse...`)
      await clickhouseInsert('teams', teamsData)
      summary.teams_synced = teamsData.length
    }

    console.log('[NHL Sync] Complete:', summary)

    return NextResponse.json({
      success: true,
      sport: 'nhl',
      ...summary,
      teams: teamsData.map(t => ({ name: t.name, abbr: t.abbreviation, logo: t.logo_url ? '✓' : '✗' }))
    })

  } catch (error: any) {
    console.error('[NHL Sync] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: error.message, sport: 'nhl' },
      { status: 500 }
    )
  }
}

