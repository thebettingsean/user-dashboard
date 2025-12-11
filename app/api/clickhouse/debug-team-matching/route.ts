import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: NextRequest) {
  try {
    // Get team abbreviations from teams table
    const teamsResult = await clickhouseQuery(`
      SELECT team_id, abbreviation, name
      FROM teams
      WHERE sport = 'nfl'
      ORDER BY team_id
    `)
    
    // Get sample of 2024 games missing public betting data WITH team names
    const missingGamesResult = await clickhouseQuery(`
      SELECT 
        g.game_id,
        g.season,
        g.week,
        g.game_date,
        g.home_team_id,
        g.away_team_id,
        ht.abbreviation as home_abbrev,
        ht.name as home_name,
        at.abbreviation as away_abbrev,
        at.name as away_name
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE g.season = 2024
        AND (g.public_ml_home_bet_pct = 0 OR g.public_ml_home_bet_pct IS NULL)
      ORDER BY g.week, g.game_date
      LIMIT 50
    `)
    
    // Get 2024 games WITH data for comparison
    const withDataResult = await clickhouseQuery(`
      SELECT 
        g.game_id,
        g.season,
        g.week,
        g.game_date,
        g.sportsdata_io_score_id,
        ht.abbreviation as home_abbrev,
        at.abbreviation as away_abbrev,
        g.public_ml_home_bet_pct
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE g.season = 2024
        AND g.public_ml_home_bet_pct > 0
      ORDER BY g.week, g.game_date
      LIMIT 30
    `)
    
    // Check for duplicate games on same date
    const duplicateCheckResult = await clickhouseQuery(`
      SELECT 
        game_date,
        count(*) as game_count
      FROM nfl_games
      WHERE season = 2024
      GROUP BY game_date
      HAVING game_count > 16
      ORDER BY game_date
    `)

    return NextResponse.json({
      success: true,
      teams: teamsResult.data,
      missing2024Games: missingGamesResult.data,
      gamesWithData: withDataResult.data,
      duplicateDates: duplicateCheckResult.data
    })
    
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

