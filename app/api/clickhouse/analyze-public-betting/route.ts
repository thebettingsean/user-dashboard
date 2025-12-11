import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // 1. Total games by season
    const totalBySeasonResult = await clickhouseQuery(`
      SELECT 
        season,
        count(*) as total_games
      FROM nfl_games
      GROUP BY season
      ORDER BY season
    `)
    
    // 2. Games WITH public betting data by season
    const withDataBySeasonResult = await clickhouseQuery(`
      SELECT 
        season,
        count(*) as games_with_data
      FROM nfl_games
      WHERE public_ml_home_bet_pct > 0 OR public_spread_home_bet_pct > 0
      GROUP BY season
      ORDER BY season
    `)
    
    // 3. Games WITHOUT public betting data - sample
    const missingDataResult = await clickhouseQuery(`
      SELECT 
        game_id,
        season,
        week,
        game_date,
        home_team_id,
        away_team_id,
        is_playoff,
        home_score,
        away_score
      FROM nfl_games
      WHERE (public_ml_home_bet_pct = 0 OR public_ml_home_bet_pct IS NULL)
        AND (public_spread_home_bet_pct = 0 OR public_spread_home_bet_pct IS NULL)
      ORDER BY season DESC, week DESC
      LIMIT 50
    `)
    
    // 4. Breakdown of missing data by season/playoff status
    const missingBreakdownResult = await clickhouseQuery(`
      SELECT 
        season,
        is_playoff,
        count(*) as missing_count
      FROM nfl_games
      WHERE (public_ml_home_bet_pct = 0 OR public_ml_home_bet_pct IS NULL)
        AND (public_spread_home_bet_pct = 0 OR public_spread_home_bet_pct IS NULL)
      GROUP BY season, is_playoff
      ORDER BY season DESC, is_playoff
    `)
    
    // 5. Sample of games WITH data (to verify it's working)
    const withDataSampleResult = await clickhouseQuery(`
      SELECT 
        game_id,
        season,
        week,
        game_date,
        sportsdata_io_score_id,
        public_ml_home_bet_pct,
        public_ml_home_money_pct,
        public_spread_home_bet_pct,
        public_spread_home_money_pct,
        public_total_over_bet_pct,
        public_total_over_money_pct
      FROM nfl_games
      WHERE public_ml_home_bet_pct > 0
      ORDER BY season DESC, week DESC
      LIMIT 20
    `)
    
    // 6. Check what weeks are missing vs present
    const weekBreakdownResult = await clickhouseQuery(`
      SELECT 
        season,
        week,
        count(*) as total,
        countIf(public_ml_home_bet_pct > 0) as with_data,
        countIf(public_ml_home_bet_pct = 0 OR public_ml_home_bet_pct IS NULL) as missing
      FROM nfl_games
      WHERE season >= 2022
      GROUP BY season, week
      ORDER BY season, week
    `)

    return NextResponse.json({
      success: true,
      analysis: {
        totalGamesBySeason: totalBySeasonResult.data,
        gamesWithDataBySeason: withDataBySeasonResult.data,
        missingBreakdown: missingBreakdownResult.data,
        weekBreakdown: weekBreakdownResult.data,
        sampleWithData: withDataSampleResult.data,
        sampleMissingData: missingDataResult.data
      }
    })
    
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

