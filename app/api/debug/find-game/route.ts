import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const team = searchParams.get('team') || 'Falcons'
  
  try {
    // Search for games involving this team
    const query = `
      SELECT 
        g.game_id,
        g.season,
        g.week,
        toString(g.game_date) as game_date,
        toString(g.game_time) as game_time,
        g.home_score,
        g.away_score,
        g.spread_close,
        g.total_close,
        g.home_covered,
        ht.name as home_team,
        at.name as away_team
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
      WHERE (ht.name LIKE '%${team}%' OR at.name LIKE '%${team}%')
        AND g.season = 2025
      ORDER BY g.game_date DESC
      LIMIT 10
    `
    
    const result = await clickhouseQuery(query)
    
    // Also check what's the most recent game in the database
    const latestQuery = `
      SELECT 
        max(game_date) as latest_game_date,
        max(week) as latest_week
      FROM nfl_games
      WHERE season = 2025
    `
    const latestResult = await clickhouseQuery(latestQuery)
    
    return NextResponse.json({
      success: true,
      searchTerm: team,
      gamesFound: result.data?.length || 0,
      games: result.data,
      latestInDb: latestResult.data?.[0]
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

