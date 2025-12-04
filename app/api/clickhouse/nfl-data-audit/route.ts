import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

/**
 * Full audit of NFL games data
 */
export async function GET() {
  try {
    // Check playoff status
    const playoffCheck = await clickhouseQuery(`
      SELECT 
        season,
        SUM(CASE WHEN is_playoff = 1 THEN 1 ELSE 0 END) as playoff_games,
        SUM(CASE WHEN is_playoff = 0 THEN 1 ELSE 0 END) as regular_games,
        COUNT(*) as total,
        MIN(week) as min_week,
        MAX(week) as max_week
      FROM nfl_games
      GROUP BY season
      ORDER BY season
    `)
    
    // Check week distribution (to spot pre-season)
    const weekDist = await clickhouseQuery(`
      SELECT season, week, COUNT(*) as games
      FROM nfl_games
      GROUP BY season, week
      ORDER BY season, week
    `)
    
    // Check all calculated fields completion
    const calcCheck = await clickhouseQuery(`
      SELECT
        COUNT(*) as total,
        -- Outcomes
        SUM(CASE WHEN went_over = 1 OR went_under = 1 OR total_push = 1 THEN 1 ELSE 0 END) as has_total_outcome,
        SUM(CASE WHEN home_covered = 1 OR spread_push = 1 OR (spread_close != 0 AND home_covered = 0 AND spread_push = 0) THEN 1 ELSE 0 END) as has_spread_outcome,
        SUM(CASE WHEN home_won = 1 OR home_won = 0 THEN 1 ELSE 0 END) as has_winner,
        -- Movement
        SUM(CASE WHEN spread_movement != 0 OR (spread_open = spread_close AND spread_open != 0) THEN 1 ELSE 0 END) as has_spread_data,
        -- Division/Conference
        SUM(CASE WHEN is_division_game = 1 THEN 1 ELSE 0 END) as division_games,
        SUM(CASE WHEN is_conference_game = 1 THEN 1 ELSE 0 END) as conference_games,
        -- Playoff
        SUM(CASE WHEN is_playoff = 1 THEN 1 ELSE 0 END) as playoff_games
      FROM nfl_games
    `)
    
    // Check empty columns
    const emptyCheck = await clickhouseQuery(`
      SELECT
        SUM(CASE WHEN home_win_prob_pregame != 0 THEN 1 ELSE 0 END) as has_win_prob,
        SUM(CASE WHEN home_spread_odds_close != 0 THEN 1 ELSE 0 END) as has_spread_odds,
        SUM(CASE WHEN over_odds_close != 0 THEN 1 ELSE 0 END) as has_over_odds,
        SUM(CASE WHEN odds_provider_id != 0 THEN 1 ELSE 0 END) as has_provider_id,
        SUM(CASE WHEN odds_provider_name != '' THEN 1 ELSE 0 END) as has_provider_name
      FROM nfl_games
    `)
    
    return NextResponse.json({
      by_season: playoffCheck.data,
      week_distribution: weekDist.data,
      calculated_fields: calcCheck.data?.[0],
      empty_columns: emptyCheck.data?.[0]
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

