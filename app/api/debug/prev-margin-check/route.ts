import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get Dec 7 division games with their prev_margin values
    const result = await clickhouseQuery(`
      SELECT 
        game_id,
        toString(game_date) as game_date,
        home_team_id,
        away_team_id,
        home_prev_margin,
        away_prev_margin,
        home_streak,
        away_streak,
        home_score,
        away_score,
        is_division_game,
        (SELECT abbreviation FROM teams WHERE espn_team_id = home_team_id AND sport = 'nfl') as home_abbr,
        (SELECT abbreviation FROM teams WHERE espn_team_id = away_team_id AND sport = 'nfl') as away_abbr
      FROM nfl_games
      WHERE season = 2025 
        AND is_division_game = 1
      ORDER BY game_date DESC
      LIMIT 20
    `)
    
    // Also get the CHI @ GB game specifically
    const chiGbResult = await clickhouseQuery(`
      SELECT 
        game_id,
        toString(game_date) as game_date,
        home_team_id,
        away_team_id,
        home_prev_margin,
        away_prev_margin,
        home_streak,
        away_streak,
        home_score,
        away_score,
        is_division_game,
        (SELECT abbreviation FROM teams WHERE espn_team_id = home_team_id AND sport = 'nfl') as home_abbr,
        (SELECT abbreviation FROM teams WHERE espn_team_id = away_team_id AND sport = 'nfl') as away_abbr
      FROM nfl_games
      WHERE game_date = '2025-12-07'
        AND (home_team_id = 9 OR away_team_id = 9)
    `)
    
    // Count games with prev_margin <= -1 (lost previous)
    const lostPrevCount = await clickhouseQuery(`
      SELECT count() as cnt FROM nfl_games
      WHERE season >= 2022
        AND is_division_game = 1
        AND home_prev_margin <= -1
    `)
    
    return NextResponse.json({
      success: true,
      recent_division_games: result.data,
      chi_gb_game: chiGbResult.data,
      games_with_lost_prev_in_division: lostPrevCount.data[0]?.cnt || 0
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

