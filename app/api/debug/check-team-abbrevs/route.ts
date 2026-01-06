import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nhl'
  
  try {
    const teams = await clickhouseQuery(`
      SELECT DISTINCT name, abbreviation
      FROM teams
      WHERE sport = '${sport}'
      ORDER BY name
    `)
    
    // Compare to hardcoded map
    const hardcodedMap: Record<string, Record<string, string>> = {
      nhl: {
        'Anaheim Ducks': 'ANA', 'Boston Bruins': 'BOS', 'Buffalo Sabres': 'BUF',
        'Calgary Flames': 'CGY', 'Carolina Hurricanes': 'CAR', 'Chicago Blackhawks': 'CHI',
        'Colorado Avalanche': 'COL', 'Columbus Blue Jackets': 'CBJ', 'Dallas Stars': 'DAL',
        'Detroit Red Wings': 'DET', 'Edmonton Oilers': 'EDM', 'Florida Panthers': 'FLA',
        'Los Angeles Kings': 'LA', 'Minnesota Wild': 'MIN', 'Montréal Canadiens': 'MON',
        'Montreal Canadiens': 'MON', 'Nashville Predators': 'NAS', 'New Jersey Devils': 'NJ',
        'New York Islanders': 'NYI', 'New York Rangers': 'NYR', 'Ottawa Senators': 'OTT',
        'Philadelphia Flyers': 'PHI', 'Pittsburgh Penguins': 'PIT', 'San Jose Sharks': 'SJ',
        'Seattle Kraken': 'SEA', 'St Louis Blues': 'STL', 'St. Louis Blues': 'STL',
        'Tampa Bay Lightning': 'TB', 'Toronto Maple Leafs': 'TOR', 'Utah Hockey Club': 'UTA',
        'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VEG', 'Washington Capitals': 'WAS',
        'Winnipeg Jets': 'WPG',
      }
    }
    
    const mismatches: any[] = []
    for (const team of teams.data || []) {
      const hardcodedAbbrev = hardcodedMap[sport]?.[team.name]
      if (hardcodedAbbrev && hardcodedAbbrev !== team.abbreviation) {
        mismatches.push({
          team_name: team.name,
          db_abbrev: team.abbreviation,
          hardcoded_abbrev: hardcodedAbbrev
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      sport,
      total_teams: teams.data?.length || 0,
      mismatches,
      all_teams: teams.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

