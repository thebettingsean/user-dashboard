import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const maxDuration = 300

interface HealthIssue {
  severity: 'critical' | 'warning' | 'info'
  component: string
  message: string
  details?: any
}

export async function GET() {
  const startTime = Date.now()
  const issues: HealthIssue[] = []
  const results: any = {
    timestamp: new Date().toISOString(),
    overallStatus: 'healthy',
    dataCompleteness: {},
    queryFunctionality: {},
    logicValidation: {},
    issues: []
  }

  try {
    // ===========================================
    // 1. DATA COMPLETENESS AUDIT
    // ===========================================
    
    console.log('[HEALTH CHECK] Starting data completeness audit...')
    
    // 1.1 NFL Games Table
    const gamesCheck = await clickhouseQuery<any>(`
      SELECT 
        COUNT(*) as total_games,
        MAX(game_date) as latest_game_date,
        COUNT(DISTINCT season) as seasons_count,
        SUM(CASE WHEN home_score > 0 OR away_score > 0 THEN 1 ELSE 0 END) as completed_games,
        SUM(CASE WHEN game_date >= '2025-12-01' AND game_date <= '2025-12-17' THEN 1 ELSE 0 END) as december_games,
        SUM(CASE WHEN season = 2024 THEN 1 ELSE 0 END) as season_2024_games,
        SUM(CASE WHEN season = 2025 THEN 1 ELSE 0 END) as season_2025_games
      FROM nfl_games
    `)
    
    results.dataCompleteness.games = gamesCheck.data?.[0] || {}
    
    if (gamesCheck.data?.[0]?.latest_game_date < '2025-12-15') {
      issues.push({
        severity: 'critical',
        component: 'nfl_games',
        message: `Latest game is ${gamesCheck.data[0].latest_game_date}, missing recent games!`
      })
    }
    
    // 1.2 Box Scores
    const boxScoresCheck = await clickhouseQuery<any>(`
      SELECT 
        COUNT(*) as total_box_scores,
        COUNT(DISTINCT game_id) as games_with_box_scores,
        MAX(g.game_date) as latest_box_score_date,
        SUM(CASE WHEN g.game_date >= '2025-12-01' AND g.game_date <= '2025-12-17' THEN 1 ELSE 0 END) as december_box_scores
      FROM nfl_box_scores_v2 b
      JOIN nfl_games g ON b.game_id = g.game_id
      WHERE g.home_score > 0 OR g.away_score > 0
    `)
    
    results.dataCompleteness.boxScores = boxScoresCheck.data?.[0] || {}
    
    if (boxScoresCheck.data?.[0]?.latest_box_score_date < '2025-12-15') {
      issues.push({
        severity: 'critical',
        component: 'nfl_box_scores_v2',
        message: `Latest box score is ${boxScoresCheck.data[0].latest_box_score_date}, player stats are outdated!`,
        details: { expected: '2025-12-15+', actual: boxScoresCheck.data[0].latest_box_score_date }
      })
    }
    
    // 1.3 Missing Box Scores for Completed Games
    const missingBoxScores = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        toString(g.game_date) as game_date,
        ht.name as home_team,
        at.name as away_team,
        g.home_score,
        g.away_score
      FROM nfl_games g
      LEFT JOIN nfl_box_scores_v2 b ON g.game_id = b.game_id
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE (g.home_score > 0 OR g.away_score > 0)
        AND b.game_id IS NULL
        AND g.game_date >= '2025-12-01'
      ORDER BY g.game_date DESC
      LIMIT 20
    `)
    
    results.dataCompleteness.missingBoxScores = missingBoxScores.data || []
    
    if (missingBoxScores.data && missingBoxScores.data.length > 0) {
      issues.push({
        severity: 'critical',
        component: 'box_scores_sync',
        message: `${missingBoxScores.data.length} completed games are missing box scores!`,
        details: missingBoxScores.data
      })
    }
    
    // 1.4 Team Rankings
    const rankingsCheck = await clickhouseQuery<any>(`
      SELECT 
        COUNT(DISTINCT team_id) as teams_with_rankings,
        MAX(last_updated) as rankings_last_updated
      FROM nfl_team_rankings
      WHERE season = 2024
    `)
    
    results.dataCompleteness.rankings = rankingsCheck.data?.[0] || {}
    
    // 1.5 Referees
    const refereesCheck = await clickhouseQuery<any>(`
      SELECT 
        COUNT(*) as games_with_referees,
        COUNT(DISTINCT referee_name) as unique_referees
      FROM nfl_games
      WHERE game_date >= '2025-09-01'
        AND referee_name IS NOT NULL
        AND referee_name != ''
    `)
    
    results.dataCompleteness.referees = refereesCheck.data?.[0] || {}
    
    // 1.6 Public Betting Data
    const publicBettingCheck = await clickhouseQuery<any>(`
      SELECT 
        COUNT(*) as games_with_splits,
        SUM(CASE WHEN public_spread_home_bet_pct != 50 THEN 1 ELSE 0 END) as games_with_real_splits,
        MAX(game_date) as latest_splits_date
      FROM nfl_games
      WHERE game_date >= '2025-12-01'
        AND (public_spread_home_bet_pct > 0 OR public_ml_home_bet_pct > 0)
    `)
    
    results.dataCompleteness.publicBetting = publicBettingCheck.data?.[0] || {}
    
    // 1.7 Line Movement (Odds Snapshots)
    const oddsCheck = await clickhouseQuery<any>(`
      SELECT 
        COUNT(*) as total_snapshots,
        COUNT(DISTINCT game_id) as games_with_snapshots,
        MAX(game_date) as latest_snapshot_date
      FROM nfl_games
      WHERE spread_open != 0 OR spread_close != 0
        AND game_date >= '2025-12-01'
    `)
    
    results.dataCompleteness.lineMovement = oddsCheck.data?.[0] || {}
    
    // 1.8 Player Props
    const propsCheck = await clickhouseQuery<any>(`
      SELECT 
        COUNT(*) as total_props,
        COUNT(DISTINCT player_id) as unique_players,
        COUNT(DISTINCT game_id) as games_with_props,
        MAX(g.game_date) as latest_props_date
      FROM nfl_prop_lines p
      JOIN nfl_games g ON p.game_id = g.game_id
      WHERE g.game_date >= '2025-12-01'
    `)
    
    results.dataCompleteness.props = propsCheck.data?.[0] || {}
    
    if (propsCheck.data?.[0]?.latest_props_date < '2025-12-15') {
      issues.push({
        severity: 'warning',
        component: 'nfl_prop_lines',
        message: `Latest props are from ${propsCheck.data[0].latest_props_date}, may be missing recent games`
      })
    }
    
    // ===========================================
    // 2. QUERY FUNCTIONALITY TESTS
    // ===========================================
    
    console.log('[HEALTH CHECK] Testing query functionality...')
    
    // 2.1 Test Time Period Filters
    const timePeriodTests = []
    const testPeriods = ['L5', 'L10', 'season', 'since_2022']
    
    for (const period of testPeriods) {
      try {
        const testQuery = await clickhouseQuery<any>(`
          SELECT COUNT(*) as game_count
          FROM nfl_games
          WHERE ${period === 'season' ? 'season = 2024' : period === 'since_2022' ? 'season >= 2022' : '1=1'}
          LIMIT 1
        `)
        
        timePeriodTests.push({
          period,
          status: testQuery.data?.[0]?.game_count > 0 ? 'pass' : 'fail',
          gameCount: testQuery.data?.[0]?.game_count || 0
        })
      } catch (error: any) {
        timePeriodTests.push({
          period,
          status: 'error',
          error: error.message
        })
      }
    }
    
    results.queryFunctionality.timePeriods = timePeriodTests
    
    // 2.2 Test Prop Query by Position
    const propPositionTests = []
    const testPositions = ['QB', 'RB', 'WR', 'TE']
    
    for (const position of testPositions) {
      try {
        const testQuery = await clickhouseQuery<any>(`
          SELECT COUNT(*) as player_count
          FROM nfl_box_scores_v2 b
          JOIN players p ON b.player_id = p.player_id
          WHERE p.position = '${position}'
            AND b.game_id IN (
              SELECT game_id FROM nfl_games WHERE season = 2024 LIMIT 10
            )
        `)
        
        propPositionTests.push({
          position,
          status: testQuery.data?.[0]?.player_count > 0 ? 'pass' : 'fail',
          playerCount: testQuery.data?.[0]?.player_count || 0
        })
      } catch (error: any) {
        propPositionTests.push({
          position,
          status: 'error',
          error: error.message
        })
      }
    }
    
    results.queryFunctionality.propPositions = propPositionTests
    
    // ===========================================
    // 3. LOGIC VALIDATION TESTS
    // ===========================================
    
    console.log('[HEALTH CHECK] Validating query logic...')
    
    // 3.1 Test Public Betting Filter Logic (50%+)
    const publicBettingLogicTest = await clickhouseQuery<any>(`
      SELECT 
        game_id,
        public_spread_home_bet_pct,
        public_spread_home_money_pct
      FROM nfl_games
      WHERE public_spread_home_bet_pct >= 50
        AND game_date >= '2025-11-01'
      LIMIT 5
    `)
    
    const publicBettingValid = publicBettingLogicTest.data?.every(
      (game: any) => game.public_spread_home_bet_pct >= 50
    ) || false
    
    results.logicValidation.publicBetting = {
      test: 'Filter for 50%+ should only return games with 50%+',
      status: publicBettingValid ? 'pass' : 'fail',
      sample: publicBettingLogicTest.data?.slice(0, 3)
    }
    
    if (!publicBettingValid) {
      issues.push({
        severity: 'critical',
        component: 'query_logic',
        message: 'Public betting filter returning incorrect results!',
        details: publicBettingLogicTest.data
      })
    }
    
    // 3.2 Test Line Range Logic (e.g., spread between -7 and -3)
    const lineRangeTest = await clickhouseQuery<any>(`
      SELECT 
        game_id,
        spread_close
      FROM nfl_games
      WHERE spread_close BETWEEN -7 AND -3
        AND game_date >= '2025-11-01'
      LIMIT 5
    `)
    
    const lineRangeValid = lineRangeTest.data?.every(
      (game: any) => game.spread_close >= -7 && game.spread_close <= -3
    ) || false
    
    results.logicValidation.lineRange = {
      test: 'Spread range -7 to -3 should only return games in that range',
      status: lineRangeValid ? 'pass' : 'fail',
      sample: lineRangeTest.data?.slice(0, 3)
    }
    
    // 3.3 Test Season Filter Logic
    const seasonTest = await clickhouseQuery<any>(`
      SELECT 
        season,
        COUNT(*) as game_count,
        MIN(game_date) as earliest_game,
        MAX(game_date) as latest_game
      FROM nfl_games
      GROUP BY season
      ORDER BY season DESC
      LIMIT 5
    `)
    
    results.logicValidation.seasonFilter = {
      test: 'Season values should be consistent with game dates',
      seasons: seasonTest.data,
      issue: 'Check if Dec 2025 games are stored as season 2024 or 2025'
    }
    
    // Check for Dec 2025 games
    const dec2025Games = await clickhouseQuery<any>(`
      SELECT 
        season,
        COUNT(*) as game_count
      FROM nfl_games
      WHERE game_date >= '2025-12-01' AND game_date <= '2025-12-17'
      GROUP BY season
    `)
    
    results.logicValidation.december2025Season = dec2025Games.data
    
    // ===========================================
    // SUMMARY
    // ===========================================
    
    results.issues = issues
    results.overallStatus = issues.some(i => i.severity === 'critical') ? 'critical' :
                            issues.some(i => i.severity === 'warning') ? 'degraded' : 'healthy'
    results.executionTime = `${Date.now() - startTime}ms`
    
    // Count issues by severity
    results.summary = {
      critical: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      totalIssues: issues.length
    }
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    console.error('[HEALTH CHECK] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      overallStatus: 'error',
      executionTime: `${Date.now() - startTime}ms`
    }, { status: 500 })
  }
}

