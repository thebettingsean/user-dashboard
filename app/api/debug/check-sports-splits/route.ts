import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const sports = ['nfl', 'nba', 'nhl', 'cfb', 'cbb']
    const results: any = {}
    
    for (const sport of sports) {
      // Check upcoming games for this sport
      const upcomingGames = await clickhouseQuery(`
        SELECT 
          COUNT(*) as total_games,
          SUM(CASE WHEN public_spread_home_bet_pct != 50 AND public_spread_home_bet_pct IS NOT NULL THEN 1 ELSE 0 END) as games_with_splits,
          MIN(game_time) as earliest_game,
          MAX(game_time) as latest_game
        FROM games FINAL
        WHERE sport = '${sport}'
          AND game_time >= now() - INTERVAL 1 HOUR
          AND game_time <= now() + INTERVAL 7 DAY
      `)
      
      // Get sample games
      const sampleGames = await clickhouseQuery(`
        SELECT 
          game_id,
          game_time,
          public_spread_home_bet_pct,
          public_ml_home_bet_pct,
          public_total_over_bet_pct
        FROM games FINAL
        WHERE sport = '${sport}'
          AND game_time >= now() - INTERVAL 1 HOUR
          AND game_time <= now() + INTERVAL 7 DAY
        ORDER BY game_time
        LIMIT 5
      `)
      
      results[sport] = {
        summary: upcomingGames.data?.[0] || null,
        sample_games: sampleGames.data || []
      }
    }
    
    return NextResponse.json({
      success: true,
      by_sport: results,
      note: "public_spread_home_bet_pct of 50 means no real splits data (default)"
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

