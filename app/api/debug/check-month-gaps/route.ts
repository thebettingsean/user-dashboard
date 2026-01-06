import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get game count by month for 2023 season
    const byMonth = await clickhouseQuery(`
      SELECT 
        toYYYYMM(game_date) as year_month,
        formatDateTime(MIN(game_date), '%Y-%m-%d') as first_game,
        formatDateTime(MAX(game_date), '%Y-%m-%d') as last_game,
        COUNT(*) as game_count,
        SUM(CASE WHEN public_spread_home_bet_pct > 0 THEN 1 ELSE 0 END) as games_with_splits
      FROM nfl_games FINAL
      WHERE season = 2023
        AND is_playoff = 0
      GROUP BY year_month
      ORDER BY year_month
    `)
    
    // Expected: 2023-09 through 2024-01 (Sept to Jan)
    const expectedMonths = [202309, 202310, 202311, 202312, 202401]
    const actualMonths = new Set((byMonth.data || []).map((m: any) => m.year_month))
    const missingMonths = expectedMonths.filter(m => !actualMonths.has(m))
    
    return NextResponse.json({
      success: true,
      monthly_breakdown: byMonth.data || [],
      expected_months: expectedMonths,
      missing_months: missingMonths.length > 0 ? missingMonths : 'None - all months present'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

