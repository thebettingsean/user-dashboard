import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  
  try {
    const sportFilter = sport === 'all' ? '' : `AND sport = '${sport}'`
    
    const query = `
      WITH latest_games AS (
        SELECT 
          game_id,
          argMax(sport, updated_at) as sport,
          argMax(game_time, updated_at) as game_time,
          argMax(home_team_id, updated_at) as home_team_id,
          argMax(away_team_id, updated_at) as away_team_id,
          argMax(spread_open, updated_at) as opening_spread,
          argMax(spread_close, updated_at) as current_spread,
          max(updated_at) as updated_at
        FROM games
        WHERE game_time > now()
          ${sportFilter}
        GROUP BY game_id
      )
      SELECT 
        lg.game_id,
        lg.sport,
        lg.game_time,
        lg.opening_spread,
        lg.current_spread
      FROM latest_games lg
      LIMIT 10
    `
    
    const result = await clickhouseQuery(query)
    
    return NextResponse.json({
      success: true,
      sport,
      sportFilter,
      query,
      rowCount: result.data?.length || 0,
      games: result.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

