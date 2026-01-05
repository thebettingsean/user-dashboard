import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const results: any = {}
    
    // 1. Check if ANY playoff games exist in nfl_games
    const playoffGamesQuery = await clickhouseQuery(`
      SELECT 
        game_id,
        sportsdata_io_score_id,
        season,
        week,
        game_date,
        game_time,
        is_playoff,
        ht.name as home_team,
        ht.abbreviation as home_abbr,
        at.name as away_team,
        at.abbreviation as away_abbr
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE g.is_playoff = 1 
        AND g.season = 2025
      ORDER BY g.game_time
      LIMIT 20
    `)
    results.playoff_games_in_db = playoffGamesQuery.data || []
    results.playoff_games_count = results.playoff_games_in_db.length
    
    // 2. Check upcoming NFL games (next 7 days) - what sync-live-odds would query
    const upcomingQuery = await clickhouseQuery(`
      SELECT 
        game_id,
        sportsdata_io_score_id as score_id,
        game_time,
        is_playoff,
        ht.abbreviation as home_abbr,
        at.abbreviation as away_abbr
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE g.game_time >= now() - INTERVAL 1 HOUR
        AND g.game_time <= now() + INTERVAL 7 DAY
        AND g.sportsdata_io_score_id > 0
      ORDER BY g.game_time
    `)
    results.upcoming_games_with_score_ids = upcomingQuery.data || []
    results.upcoming_games_count = results.upcoming_games_with_score_ids.length
    
    // 3. Check what the public betting page would see (from games table)
    const publicBettingQuery = await clickhouseQuery(`
      SELECT 
        g.game_id,
        g.sport,
        g.game_time,
        ht.name as home_team,
        at.name as away_team,
        g.public_spread_home_bet_pct,
        g.public_spread_home_money_pct,
        g.public_ml_home_bet_pct,
        g.public_ml_home_money_pct,
        g.public_total_over_bet_pct,
        g.public_total_over_money_pct
      FROM games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.sport = 'nfl'
        AND g.game_time >= now()
        AND g.game_time <= now() + INTERVAL 7 DAY
      ORDER BY g.game_time
      LIMIT 20
    `)
    results.games_table_nfl = publicBettingQuery.data || []
    results.games_with_splits = results.games_table_nfl.filter((g: any) => 
      (g.public_spread_home_bet_pct && g.public_spread_home_bet_pct > 0) ||
      (g.public_ml_home_bet_pct && g.public_ml_home_bet_pct > 0)
    ).length
    
    // 4. Current date/time info
    results.current_time = new Date().toISOString()
    results.current_month = new Date().getMonth() + 1
    results.is_playoff_season = (new Date().getMonth() + 1 >= 1 && new Date().getMonth() + 1 <= 2)
    
    // 5. Check if any NFL games exist in games table at all
    const anyNflQuery = await clickhouseQuery(`
      SELECT COUNT(*) as cnt FROM games WHERE sport = 'nfl'
    `)
    results.total_nfl_games_in_games_table = anyNflQuery.data?.[0]?.cnt || 0
    
    return NextResponse.json({
      success: true,
      diagnosis: results,
      summary: {
        playoff_games_in_nfl_games: results.playoff_games_count,
        upcoming_games_with_score_ids: results.upcoming_games_count,
        games_in_games_table: results.games_table_nfl.length,
        games_with_splits_data: results.games_with_splits,
        is_playoff_season_detected: results.is_playoff_season
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

