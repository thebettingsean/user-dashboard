/**
 * Test script to debug signal calculations
 * Run with: npx ts-node scripts/test-signals.ts
 */

import { calculateGameSignals, lineMoveScore, oddsMoveScore, marketPressure, isMovementFavorable } from '../lib/signals'

// Test with Panthers @ Buccaneers data from the screenshot
const testGame = {
  sport: 'nfl',
  // Spread data (from HOME perspective - Buccaneers)
  spreadOpen: -3.5,      // Panthers were +3.5
  spreadCurrent: -2.5,   // Panthers now +2.5
  spreadJuiceHomeOpen: -110,
  spreadJuiceHomeCurrent: -110,
  spreadJuiceAwayOpen: -110,
  spreadJuiceAwayCurrent: -110,
  // Public betting (HOME perspective)
  spreadHomeBetPct: 37,    // Buccaneers 37%
  spreadHomeMoneyPct: 41,  // Buccaneers 41%
  // Total data
  totalOpen: 47.5,
  totalCurrent: 47.5,
  totalOverJuiceOpen: -110,
  totalOverJuiceCurrent: -110,
  totalUnderJuiceOpen: -110,
  totalUnderJuiceCurrent: -110,
  totalOverBetPct: 50,
  totalOverMoneyPct: 50,
  // ML data
  mlHomeOpen: -180,
  mlHomeCurrent: -160,
  mlAwayOpen: 150,
  mlAwayCurrent: 135,
  mlHomeBetPct: 40,
  mlHomeMoneyPct: 45,
}

console.log('=== Testing Signal Calculations ===\n')

// Test individual components
console.log('1. Line Movement Score (Spread):')
const spreadLineScore = lineMoveScore(testGame.spreadOpen, testGame.spreadCurrent, testGame.sport, 'spread')
console.log(`   Spread: ${testGame.spreadOpen} → ${testGame.spreadCurrent}`)
console.log(`   Line Score: ${spreadLineScore}`)

console.log('\n2. Odds Movement Score (Spread):')
const spreadOddsScore = oddsMoveScore(testGame.spreadJuiceHomeOpen, testGame.spreadJuiceHomeCurrent, testGame.sport, 'spread')
console.log(`   Juice: ${testGame.spreadJuiceHomeOpen} → ${testGame.spreadJuiceHomeCurrent}`)
console.log(`   Odds Score: ${spreadOddsScore}`)

console.log('\n3. Market Pressure:')
const pressure = marketPressure(spreadLineScore, spreadOddsScore, testGame.sport, 'spread')
console.log(`   Pressure: ${pressure}`)

console.log('\n4. Movement Favorable?')
const favorableHome = isMovementFavorable(
  testGame.spreadOpen, testGame.spreadCurrent,
  testGame.spreadJuiceHomeOpen, testGame.spreadJuiceHomeCurrent,
  'home', 'spread'
)
const favorableAway = isMovementFavorable(
  testGame.spreadOpen, testGame.spreadCurrent,
  testGame.spreadJuiceAwayOpen, testGame.spreadJuiceAwayCurrent,
  'away', 'spread'
)
console.log(`   Home (Buccaneers): ${favorableHome}`)
console.log(`   Away (Panthers): ${favorableAway}`)

console.log('\n5. Full Signal Calculation:')
const signals = calculateGameSignals(
  testGame.sport,
  testGame.spreadOpen,
  testGame.spreadCurrent,
  testGame.spreadJuiceHomeOpen,
  testGame.spreadJuiceHomeCurrent,
  testGame.spreadJuiceAwayOpen,
  testGame.spreadJuiceAwayCurrent,
  testGame.spreadHomeBetPct,
  testGame.spreadHomeMoneyPct,
  testGame.totalOpen,
  testGame.totalCurrent,
  testGame.totalOverJuiceOpen,
  testGame.totalOverJuiceCurrent,
  testGame.totalUnderJuiceOpen,
  testGame.totalUnderJuiceCurrent,
  testGame.totalOverBetPct,
  testGame.totalOverMoneyPct,
  testGame.mlHomeOpen,
  testGame.mlHomeCurrent,
  testGame.mlAwayOpen,
  testGame.mlAwayCurrent,
  testGame.mlHomeBetPct,
  testGame.mlHomeMoneyPct
)

console.log('\nSpread Signals:')
console.log(`   Home (Buccaneers): Public=${signals.spread_home_public_respect}, Vegas=${signals.spread_home_vegas_backed}, Whale=${signals.spread_home_whale_respect}`)
console.log(`   Away (Panthers):   Public=${signals.spread_away_public_respect}, Vegas=${signals.spread_away_vegas_backed}, Whale=${signals.spread_away_whale_respect}`)

console.log('\nML Signals:')
console.log(`   Home (Buccaneers): Public=${signals.ml_home_public_respect}, Vegas=${signals.ml_home_vegas_backed}, Whale=${signals.ml_home_whale_respect}`)
console.log(`   Away (Panthers):   Public=${signals.ml_away_public_respect}, Vegas=${signals.ml_away_vegas_backed}, Whale=${signals.ml_away_whale_respect}`)

console.log('\n=== Panthers Analysis ===')
console.log(`Panthers (Away):`)
console.log(`  - Bets: ${100 - testGame.spreadHomeBetPct}% (need 55%+) ✓`)
console.log(`  - Money: ${100 - testGame.spreadHomeMoneyPct}% (need 55%+) ✓`)
console.log(`  - Line moved toward them: ${favorableAway}`)
console.log(`  - PUBLIC RESPECT should fire: ${(100 - testGame.spreadHomeBetPct) >= 55 && (100 - testGame.spreadHomeMoneyPct) >= 55 && favorableAway}`)

