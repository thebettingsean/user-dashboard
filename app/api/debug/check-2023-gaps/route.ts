import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // 1. Get ALL 2023 games grouped by week
    const gamesByWeek = await clickhouseQuery(`
      SELECT 
        week,
        COUNT(*) as game_count,
        MIN(game_date) as earliest_date,
        MAX(game_date) as latest_date,
        groupArray(DISTINCT toString(game_id)) as game_ids
      FROM nfl_games
      WHERE season = 2023
        AND is_playoff = 0
      GROUP BY week
      ORDER BY week
    `)
    
    // 2. Check for games with missing box scores or key data
    const missingData = await clickhouseQuery(`
      SELECT 
        week,
        game_date,
        game_id,
        home_score,
        away_score,
        spread_open,
        spread_close,
        CASE 
          WHEN home_score = 0 AND away_score = 0 THEN 'No Score'
          WHEN spread_open = 0 AND spread_close = 0 THEN 'No Odds'
          WHEN public_spread_home_bet_pct = 0 OR public_spread_home_bet_pct IS NULL THEN 'No Splits'
          ELSE 'Has Data'
        END as data_status
      FROM nfl_games
      WHERE season = 2023
        AND is_playoff = 0
      ORDER BY week, game_date
    `)
    
    // 3. Find week gaps (should be weeks 1-18)
    const weeksWithGames = new Set((gamesByWeek.data || []).map((w: any) => w.week))
    const missingWeeks: number[] = []
    for (let week = 1; week <= 18; week++) {
      if (!weeksWithGames.has(week)) {
        missingWeeks.push(week)
      }
    }
    
    // 4. Check prop data coverage for 2023
    const propCoverage = await clickhouseQuery(`
      SELECT 
        COUNT(DISTINCT game_id) as games_with_props
      FROM nfl_prop_results
      WHERE season = 2023
    `)
    
    // 5. Get date range of actual games
    const dateRange = await clickhouseQuery(`
      SELECT 
        MIN(game_date) as first_game,
        MAX(game_date) as last_game,
        COUNT(*) as total_games
      FROM nfl_games
      WHERE season = 2023
        AND is_playoff = 0
    `)
    
    return NextResponse.json({
      success: true,
      season: 2023,
      summary: {
        total_games: dateRange.data?.[0]?.total_games || 0,
        first_game_date: dateRange.data?.[0]?.first_game,
        last_game_date: dateRange.data?.[0]?.last_game,
        weeks_with_games: weeksWithGames.size,
        missing_weeks: missingWeeks,
        games_with_props: propCoverage.data?.[0]?.games_with_props || 0
      },
      weeks_breakdown: gamesByWeek.data || [],
      data_quality: missingData.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

