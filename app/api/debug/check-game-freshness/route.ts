import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const sports = ['nfl', 'nba', 'nhl', 'cfb', 'cbb']
    const results: any = {}
    
    for (const sport of sports) {
      const gameStats = await clickhouseQuery(`
        SELECT 
          COUNT(*) as total_games,
          MAX(updated_at) as last_updated,
          MIN(game_time) as earliest_game,
          MAX(game_time) as latest_game,
          SUM(CASE WHEN public_spread_home_bet_pct != 50 THEN 1 ELSE 0 END) as games_with_real_splits
        FROM games FINAL
        WHERE sport = '${sport}'
          AND game_time >= now() - INTERVAL 2 HOUR
          AND game_time <= now() + INTERVAL 7 DAY
      `)
      
      results[sport] = gameStats.data?.[0] || null
    }
    
    return NextResponse.json({
      success: true,
      current_time: new Date().toISOString(),
      by_sport: results
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

