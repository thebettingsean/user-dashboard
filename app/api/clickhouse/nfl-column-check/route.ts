import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

/**
 * Check which nfl_games columns are populated vs empty
 */
export async function GET() {
  try {
    const result = await clickhouseQuery(`
      SELECT 
        COUNT(*) as total_games,
        
        -- Movement columns
        SUM(CASE WHEN spread_movement != 0 THEN 1 ELSE 0 END) as has_spread_movement,
        SUM(CASE WHEN home_ml_movement != 0 THEN 1 ELSE 0 END) as has_home_ml_movement,
        SUM(CASE WHEN total_movement != 0 THEN 1 ELSE 0 END) as has_total_movement,
        
        -- Outcome columns
        SUM(CASE WHEN went_over = 1 THEN 1 ELSE 0 END) as went_over_count,
        SUM(CASE WHEN went_under = 1 THEN 1 ELSE 0 END) as went_under_count,
        SUM(CASE WHEN home_covered = 1 THEN 1 ELSE 0 END) as home_covered_count,
        
        -- Division/Conference
        SUM(CASE WHEN is_division_game = 1 THEN 1 ELSE 0 END) as is_division_count,
        SUM(CASE WHEN is_conference_game = 1 THEN 1 ELSE 0 END) as is_conference_count,
        
        -- Win probability
        SUM(CASE WHEN home_win_prob_pregame > 0 THEN 1 ELSE 0 END) as has_win_prob,
        
        -- Odds specifics
        SUM(CASE WHEN home_spread_odds_close != 0 THEN 1 ELSE 0 END) as has_spread_odds,
        SUM(CASE WHEN over_odds_close != 0 THEN 1 ELSE 0 END) as has_over_odds,
        
        -- Core data we DO have
        SUM(CASE WHEN home_score > 0 OR away_score > 0 THEN 1 ELSE 0 END) as has_scores,
        SUM(CASE WHEN spread_open != 0 THEN 1 ELSE 0 END) as has_spread_open,
        SUM(CASE WHEN spread_close != 0 THEN 1 ELSE 0 END) as has_spread_close,
        SUM(CASE WHEN total_open != 0 THEN 1 ELSE 0 END) as has_total_open,
        SUM(CASE WHEN total_close != 0 THEN 1 ELSE 0 END) as has_total_close,
        SUM(CASE WHEN home_ml_open != 0 THEN 1 ELSE 0 END) as has_home_ml_open,
        SUM(CASE WHEN home_ml_close != 0 THEN 1 ELSE 0 END) as has_home_ml_close
        
      FROM nfl_games
    `)
    
    const stats = result.data?.[0]
    
    return NextResponse.json({
      total_games: stats?.total_games,
      populated: {
        scores: stats?.has_scores,
        spread_open: stats?.has_spread_open,
        spread_close: stats?.has_spread_close,
        total_open: stats?.has_total_open,
        total_close: stats?.has_total_close,
        home_ml_open: stats?.has_home_ml_open,
        home_ml_close: stats?.has_home_ml_close
      },
      empty_need_calculation: {
        spread_movement: stats?.has_spread_movement,
        home_ml_movement: stats?.has_home_ml_movement,
        total_movement: stats?.has_total_movement,
        went_over: stats?.went_over_count,
        went_under: stats?.went_under_count,
        home_covered: stats?.home_covered_count
      },
      empty_need_lookup: {
        is_division_game: stats?.is_division_count,
        is_conference_game: stats?.is_conference_count
      },
      empty_remove: {
        home_win_prob_pregame: stats?.has_win_prob,
        home_spread_odds_close: stats?.has_spread_odds,
        over_odds_close: stats?.has_over_odds
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

