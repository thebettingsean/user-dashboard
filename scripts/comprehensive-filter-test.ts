/**
 * Comprehensive Filter Testing Script
 * Tests ALL filters across ALL views with data verification
 */

const API_BASE = 'https://thebettinginsider.com/api/query-engine'

interface TestResult {
  test_name: string
  status: 'PASS' | 'FAIL' | 'ERROR' | 'DATA_ISSUE'
  total_games: number
  hit_rate: number
  details: string
  sample_games?: any[]
  error?: string
}

const results: TestResult[] = []

async function runTest(testName: string, payload: any): Promise<TestResult> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return {
        test_name: testName,
        status: 'ERROR',
        total_games: 0,
        hit_rate: 0,
        details: `HTTP ${response.status}`,
        error: errorText.substring(0, 200)
      }
    }
    
    const data = await response.json()
    
    // Check for errors in response
    if (data.error) {
      return {
        test_name: testName,
        status: 'ERROR',
        total_games: 0,
        hit_rate: 0,
        details: 'API returned error',
        error: data.error
      }
    }
    
    return {
      test_name: testName,
      status: data.total_games > 0 ? 'PASS' : 'FAIL',
      total_games: data.total_games || 0,
      hit_rate: data.hit_rate || 0,
      details: `${data.total_games} games, ${data.hit_rate}% hit rate`,
      sample_games: (data.games || []).slice(0, 3)
    }
  } catch (error: any) {
    return {
      test_name: testName,
      status: 'ERROR',
      total_games: 0,
      hit_rate: 0,
      details: 'Request failed',
      error: error.message
    }
  }
}

async function verifyDataAccuracy(testName: string, payload: any, verification: (games: any[]) => { passed: boolean, reason: string }): Promise<TestResult> {
  const result = await runTest(testName, payload)
  
  if (result.status === 'ERROR' || result.total_games === 0) {
    return result
  }
  
  // Now verify the data
  const verificationResult = verification(result.sample_games || [])
  
  if (!verificationResult.passed) {
    result.status = 'DATA_ISSUE'
    result.details += ` | ${verificationResult.reason}`
  }
  
  return result
}

async function runAllTests() {
  console.log('='.repeat(80))
  console.log('COMPREHENSIVE FILTER TEST REPORT')
  console.log('='.repeat(80))
  console.log(`Started: ${new Date().toISOString()}`)
  console.log('')
  
  // ========================================
  // SECTION 1: BASIC FILTERS
  // ========================================
  console.log('\n--- SECTION 1: BASIC FILTERS ---\n')
  
  // 1.1 Time Period filters
  const timePeriods = ['L3', 'L5', 'L10', 'L20', 'season', 'last_season', 'since_2022']
  for (const period of timePeriods) {
    results.push(await runTest(`Time Period: ${period}`, {
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { time_period: period }
    }))
  }
  
  // 1.2 Bet Types
  const betTypes = ['spread', 'total', 'moneyline']
  const sides = {
    spread: ['home', 'away', 'favorite', 'underdog'],
    total: ['over', 'under'],
    moneyline: ['home', 'away', 'favorite', 'underdog']
  }
  
  for (const betType of betTypes) {
    for (const side of sides[betType as keyof typeof sides]) {
      results.push(await runTest(`${betType} - ${side}`, {
        type: 'trend',
        bet_type: betType,
        side: side,
        filters: { time_period: 'since_2022' }
      }))
    }
  }
  
  // ========================================
  // SECTION 2: MATCHUP FILTERS
  // ========================================
  console.log('\n--- SECTION 2: MATCHUP FILTERS ---\n')
  
  // 2.1 Division filter
  results.push(await verifyDataAccuracy('Division: Yes', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_division: 'division' }
  }, (games) => {
    // Can't verify without division info in result
    return { passed: true, reason: 'Manual verification needed' }
  }))
  
  results.push(await runTest('Division: No', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_division: 'non_division' }
  }))
  
  // 2.2 Conference filter
  results.push(await runTest('Conference: Yes', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_conference: 'conference' }
  }))
  
  results.push(await runTest('Conference: No', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_conference: 'non_conference' }
  }))
  
  // 2.3 Playoff filter
  results.push(await runTest('Playoff: Yes', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_playoff: 'playoff' }
  }))
  
  results.push(await runTest('Playoff: No', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_playoff: 'regular' }
  }))
  
  // ========================================
  // SECTION 3: BETTING FILTERS
  // ========================================
  console.log('\n--- SECTION 3: BETTING FILTERS ---\n')
  
  // 3.1 Favorite/Underdog
  results.push(await runTest('Favorite filter', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_favorite: 'favorite' }
  }))
  
  results.push(await runTest('Underdog filter', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_favorite: 'underdog' }
  }))
  
  // 3.2 Spread Range
  results.push(await verifyDataAccuracy('Spread Range: -7 to -3', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', spread_range: { min: -7, max: -3 } }
  }, (games) => {
    const invalid = games.filter(g => g.spread < -7 || g.spread > -3)
    return {
      passed: invalid.length === 0,
      reason: invalid.length > 0 ? `Found ${invalid.length} games outside spread range` : 'OK'
    }
  }))
  
  results.push(await verifyDataAccuracy('Spread Range: +3 to +7 (underdogs)', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', spread_range: { min: 3, max: 7 } }
  }, (games) => {
    const invalid = games.filter(g => g.spread < 3 || g.spread > 7)
    return {
      passed: invalid.length === 0,
      reason: invalid.length > 0 ? `Found ${invalid.length} games outside spread range` : 'OK'
    }
  }))
  
  // 3.3 Total Range
  results.push(await verifyDataAccuracy('Total Range: 45-50', {
    type: 'trend',
    bet_type: 'total',
    side: 'over',
    filters: { time_period: 'since_2022', total_range: { min: 45, max: 50 } }
  }, (games) => {
    const invalid = games.filter(g => g.total < 45 || g.total > 50)
    return {
      passed: invalid.length === 0,
      reason: invalid.length > 0 ? `Found ${invalid.length} games outside total range` : 'OK'
    }
  }))
  
  // 3.4 Line Movement
  results.push(await runTest('Spread Movement: Min -2', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', spread_movement_range: { min: -2 } }
  }))
  
  results.push(await runTest('Total Movement: Min 1', {
    type: 'trend',
    bet_type: 'total',
    side: 'over',
    filters: { time_period: 'since_2022', total_movement_range: { min: 1 } }
  }))
  
  // ========================================
  // SECTION 4: TEAM STATS FILTERS
  // ========================================
  console.log('\n--- SECTION 4: TEAM STATS FILTERS ---\n')
  
  // 4.1 vs Defense Rank
  const defenseRanks = ['top_5', 'top_10', 'top_16', 'bottom_5', 'bottom_10', 'bottom_16']
  for (const rank of defenseRanks) {
    results.push(await runTest(`vs Defense: ${rank}`, {
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { time_period: 'since_2022', vs_defense_rank: rank }
    }))
  }
  
  // 4.2 vs Offense Rank
  for (const rank of defenseRanks) {
    results.push(await runTest(`vs Offense: ${rank}`, {
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { time_period: 'since_2022', vs_offense_rank: rank }
    }))
  }
  
  // 4.3 Own Team Defense Rank
  for (const rank of ['top_5', 'bottom_5']) {
    results.push(await runTest(`Own Defense: ${rank}`, {
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { time_period: 'since_2022', own_defense_rank: rank }
    }))
  }
  
  // 4.4 Own Team Offense Rank
  for (const rank of ['top_5', 'bottom_5']) {
    results.push(await runTest(`Own Offense: ${rank}`, {
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { time_period: 'since_2022', own_offense_rank: rank }
    }))
  }
  
  // ========================================
  // SECTION 5: MOMENTUM FILTERS (CRITICAL)
  // ========================================
  console.log('\n--- SECTION 5: MOMENTUM FILTERS (CRITICAL) ---\n')
  
  // 5.1 Previous Game Margin - Won Previous Game
  results.push(await verifyDataAccuracy('Prev Margin: Won by 1+ (min: 1)', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', prev_game_margin: { min: 1 } }
  }, (games) => {
    // Manual verification note - need to check prev_margin column
    return { passed: true, reason: 'Needs database verification' }
  }))
  
  // 5.2 Previous Game Margin - Lost Previous Game
  results.push(await verifyDataAccuracy('Prev Margin: Lost by 1+ (max: -1)', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', prev_game_margin: { max: -1 } }
  }, (games) => {
    return { passed: true, reason: 'Needs database verification' }
  }))
  
  // 5.3 Previous Game Margin - Specific range
  results.push(await runTest('Prev Margin: Lost by 1-10 (min:-10, max:-1)', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', prev_game_margin: { min: -10, max: -1 } }
  }))
  
  // 5.4 Winning Streak
  results.push(await runTest('Winning Streak: 2+', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', winning_streak: 2 }
  }))
  
  results.push(await runTest('Winning Streak: 3+', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', winning_streak: 3 }
  }))
  
  // 5.5 Losing Streak
  results.push(await runTest('Losing Streak: 2+', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', losing_streak: 2 }
  }))
  
  // ========================================
  // SECTION 6: PUBLIC BETTING FILTERS
  // ========================================
  console.log('\n--- SECTION 6: PUBLIC BETTING FILTERS ---\n')
  
  results.push(await runTest('Public Bet %: 30-50%', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', public_bet_pct: { min: 30, max: 50 } }
  }))
  
  results.push(await runTest('Public Money %: 60%+', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', public_money_pct: { min: 60 } }
  }))
  
  results.push(await runTest('Public Diff % (Sharp): 5%+', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', public_diff_pct: { min: 5 } }
  }))
  
  results.push(await runTest('Public Diff % (Square): -5% or less', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', public_diff_pct: { max: -5 } }
  }))
  
  // ========================================
  // SECTION 7: COMBINED FILTERS
  // ========================================
  console.log('\n--- SECTION 7: COMBINED FILTERS (CRITICAL) ---\n')
  
  // 7.1 Division + Prev Margin (the user's reported issue)
  results.push(await runTest('Division + Lost Prev Game (min:-100, max:-1)', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { 
      time_period: 'since_2022', 
      is_division: 'division',
      prev_game_margin: { min: -100, max: -1 }
    }
  }))
  
  // 7.2 Multiple ranking filters
  results.push(await runTest('Top 10 Defense + vs Bottom 10 Offense', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { 
      time_period: 'since_2022',
      own_defense_rank: 'top_10',
      vs_offense_rank: 'bottom_10'
    }
  }))
  
  // 7.3 Favorite + Division
  results.push(await runTest('Favorite + Division Game', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { 
      time_period: 'since_2022',
      is_favorite: 'favorite',
      is_division: 'division'
    }
  }))
  
  // 7.4 Underdog + Coming off loss
  results.push(await runTest('Underdog + Lost Previous', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { 
      time_period: 'since_2022',
      is_favorite: 'underdog',
      prev_game_margin: { max: -1 }
    }
  }))
  
  // 7.5 Total + Both teams stats
  results.push(await runTest('Over + Home Top10 Off + Away Bottom10 Def', {
    type: 'trend',
    bet_type: 'total',
    side: 'over',
    filters: { 
      time_period: 'since_2022',
      home_team_offense_rank: 'top_10',
      away_team_defense_rank: 'bottom_10'
    }
  }))
  
  // ========================================
  // SECTION 8: TEAM-SPECIFIC QUERIES
  // ========================================
  console.log('\n--- SECTION 8: TEAM-SPECIFIC QUERIES ---\n')
  
  // Eagles (team_id = 21)
  results.push(await runTest('Team: Eagles - Spread', {
    type: 'team',
    team_id: 21,
    bet_type: 'spread',
    filters: { time_period: 'since_2022' }
  }))
  
  results.push(await runTest('Team: Eagles + Division', {
    type: 'team',
    team_id: 21,
    bet_type: 'spread',
    filters: { time_period: 'since_2022', is_division: 'division' }
  }))
  
  results.push(await runTest('Team: Eagles + Coming off Loss', {
    type: 'team',
    team_id: 21,
    bet_type: 'spread',
    filters: { time_period: 'since_2022', prev_game_margin: { max: -1 } }
  }))
  
  // ========================================
  // SECTION 9: PROPS QUERIES
  // ========================================
  console.log('\n--- SECTION 9: PROPS QUERIES ---\n')
  
  results.push(await runTest('Props: QB Pass Yards 250+', {
    type: 'prop',
    position: 'QB',
    stat: 'pass_yards',
    line: 250,
    filters: { time_period: 'since_2022' }
  }))
  
  results.push(await runTest('Props: WR Rec Yards 50+', {
    type: 'prop',
    position: 'WR',
    stat: 'receiving_yards',
    line: 50,
    filters: { time_period: 'since_2022' }
  }))
  
  results.push(await runTest('Props: RB Rush Yards 60+', {
    type: 'prop',
    position: 'RB',
    stat: 'rush_yards',
    line: 60,
    filters: { time_period: 'since_2022' }
  }))
  
  results.push(await runTest('Props: QB + vs Bottom16 Pass Def', {
    type: 'prop',
    position: 'QB',
    stat: 'pass_yards',
    line: 250,
    filters: { time_period: 'since_2022', vs_defense_rank: 'bottom_16' }
  }))
  
  // ========================================
  // SECTION 10: EDGE CASES
  // ========================================
  console.log('\n--- SECTION 10: EDGE CASES ---\n')
  
  // Empty results (should return 0 games, not error)
  results.push(await runTest('Edge: Impossible combo (Fav + Dog)', {
    type: 'trend',
    bet_type: 'spread',
    side: 'favorite', // this side conflicts with...
    filters: { time_period: 'since_2022', is_favorite: 'underdog' } // this filter
  }))
  
  // Very restrictive
  results.push(await runTest('Edge: Very restrictive (Top5 Def + Top5 Off)', {
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { 
      time_period: 'since_2022',
      own_defense_rank: 'top_5',
      own_offense_rank: 'top_5'
    }
  }))
  
  // ========================================
  // PRINT RESULTS
  // ========================================
  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY REPORT')
  console.log('='.repeat(80))
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const errors = results.filter(r => r.status === 'ERROR').length
  const dataIssues = results.filter(r => r.status === 'DATA_ISSUE').length
  
  console.log(`\nTotal Tests: ${results.length}`)
  console.log(`✅ PASS: ${passed}`)
  console.log(`❌ FAIL: ${failed}`)
  console.log(`⚠️  ERROR: ${errors}`)
  console.log(`🔍 DATA_ISSUE: ${dataIssues}`)
  
  console.log('\n--- FAILURES ---')
  for (const r of results.filter(r => r.status === 'FAIL')) {
    console.log(`❌ ${r.test_name}: ${r.details}`)
  }
  
  console.log('\n--- ERRORS ---')
  for (const r of results.filter(r => r.status === 'ERROR')) {
    console.log(`⚠️  ${r.test_name}: ${r.details} - ${r.error}`)
  }
  
  console.log('\n--- DATA ISSUES ---')
  for (const r of results.filter(r => r.status === 'DATA_ISSUE')) {
    console.log(`🔍 ${r.test_name}: ${r.details}`)
    if (r.sample_games && r.sample_games.length > 0) {
      console.log(`   Sample: ${JSON.stringify(r.sample_games[0]?.game_date)} spread=${r.sample_games[0]?.spread}`)
    }
  }
  
  console.log('\n--- ALL RESULTS (Detailed) ---')
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : r.status === 'ERROR' ? '⚠️' : '🔍'
    console.log(`${icon} ${r.test_name}: ${r.details}`)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log(`Finished: ${new Date().toISOString()}`)
}

// Run tests
runAllTests().catch(console.error)

