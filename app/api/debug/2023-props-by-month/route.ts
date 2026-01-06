import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get 2023 prop data broken down by month
    const propsByMonth = await clickhouseQuery(`
      SELECT 
        toYYYYMM(game_time) as month,
        formatDateTime(MIN(game_time), '%Y-%m-%d') as first_game,
        formatDateTime(MAX(game_time), '%Y-%m-%d') as last_game,
        COUNT(DISTINCT game_id) as games_with_props,
        COUNT(*) as total_lines,
        COUNT(DISTINCT player_name) as unique_players
      FROM nfl_prop_lines FINAL
      WHERE season = 2023
      GROUP BY month
      ORDER BY month
    `)
    
    // Get total 2023 games per month for comparison
    const gamesByMonth = await clickhouseQuery(`
      SELECT 
        toYYYYMM(game_date) as month,
        COUNT(*) as total_games
      FROM nfl_games FINAL
      WHERE season = 2023
        AND is_playoff = 0
      GROUP BY month
      ORDER BY month
    `)
    
    // Combine data
    const combined = (propsByMonth.data || []).map((propMonth: any) => {
      const gameMonth = (gamesByMonth.data || []).find((g: any) => g.month === propMonth.month)
      return {
        ...propMonth,
        total_games: gameMonth?.total_games || 0,
        missing_games: (gameMonth?.total_games || 0) - propMonth.games_with_props,
        coverage_pct: gameMonth ? Math.round((propMonth.games_with_props / gameMonth.total_games) * 100) : 0
      }
    })
    
    return NextResponse.json({
      success: true,
      by_month: combined,
      summary: {
        total_games_2023: (gamesByMonth.data || []).reduce((sum: number, m: any) => sum + m.total_games, 0),
        games_with_props: (propsByMonth.data || []).reduce((sum: number, m: any) => sum + m.games_with_props, 0),
        games_without_props: (gamesByMonth.data || []).reduce((sum: number, m: any) => sum + m.total_games, 0) - (propsByMonth.data || []).reduce((sum: number, m: any) => sum + m.games_with_props, 0)
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

