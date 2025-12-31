/**
 * Betting Signal Calculations
 * 
 * Core functions for calculating Public Respect, Vegas Backed, and Whale Respect indicators
 */

import {
  ELS,
  EOS,
  MARKET_PRESSURE_WEIGHTS,
  INDICATOR_THRESHOLDS,
  SCORE_WEIGHTS,
  ODDS_ONLY_PRESSURE_CAP,
} from './constants'
import type { Market, IndicatorResult, SideSignals, SignalData, EMPTY_SIGNAL_DATA } from './types'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert American odds to implied probability (0-1)
 */
export function impliedProbability(odds: number): number {
  if (odds === 0) return 0.5 // No odds = even
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100)
  return 100 / (odds + 100)
}

/**
 * Get ELS value for a sport/market, with fallback
 */
function getELS(sport: string, market: Market): number | null {
  const sportLower = sport.toLowerCase()
  if (market === 'ml') return null // ML has no line
  return ELS[sportLower]?.[market] ?? ELS['nfl']?.[market] ?? 1.5
}

/**
 * Get EOS value for a sport/market, with fallback
 */
function getEOS(sport: string, market: Market): number {
  const sportLower = sport.toLowerCase()
  return EOS[sportLower]?.[market] ?? EOS['nfl']?.[market] ?? 0.04
}

/**
 * Get market pressure weights for a sport
 */
function getWeights(sport: string): { line: number; odds: number } {
  const sportLower = sport.toLowerCase()
  return MARKET_PRESSURE_WEIGHTS[sportLower] ?? { line: 0.55, odds: 0.45 }
}

// ============================================================================
// SCORE CALCULATIONS
// ============================================================================

/**
 * Calculate line movement score (0-100)
 * Higher = more significant movement
 */
export function lineMoveScore(
  openLine: number,
  currentLine: number,
  sport: string,
  market: Market
): number {
  const els = getELS(sport, market)
  if (els === null) return 0 // ML has no line
  
  const move = Math.abs(currentLine - openLine)
  if (move === 0) return 0
  
  const normalized = Math.min(move / els, 1)
  return Math.round(normalized * 100)
}

/**
 * Calculate odds movement score (0-100)
 * Higher = more significant odds change
 */
export function oddsMoveScore(
  openOdds: number,
  currentOdds: number,
  sport: string,
  market: Market
): number {
  const eos = getEOS(sport, market)
  
  const openProb = impliedProbability(openOdds)
  const currentProb = impliedProbability(currentOdds)
  const delta = Math.abs(currentProb - openProb)
  
  if (delta === 0) return 0
  
  const normalized = Math.min(delta / eos, 1)
  return Math.round(normalized * 100)
}

/**
 * Calculate combined market pressure score (0-100)
 * Combines line and odds movement with sport-specific weighting
 */
export function marketPressure(
  lineScore: number,
  oddsScore: number,
  sport: string,
  market: Market
): number {
  // ML markets: only odds (no line to move)
  if (market === 'ml') {
    return oddsScore
  }
  
  const weights = getWeights(sport)
  let pressure = lineScore * weights.line + oddsScore * weights.odds
  
  // Cap when no line movement to prevent fake steam
  if (lineScore === 0) {
    pressure = Math.min(pressure, ODDS_ONLY_PRESSURE_CAP)
  }
  
  return Math.round(pressure)
}

// ============================================================================
// DIRECTION DETECTION
// ============================================================================

/**
 * Determine if movement was favorable toward a specific side
 * 
 * For spreads (home perspective):
 * - -8.5 → -9.5 = favorable for HOME (giving more points)
 * - -8.5 → -7.5 = favorable for AWAY
 * 
 * For totals:
 * - 5.5 → 6.0 = favorable for OVER
 * - 5.5 → 5.0 = favorable for UNDER
 * 
 * For ML:
 * - -150 → -180 = favorable for that side (more confident)
 * - +150 → +130 = favorable for that side (less underdog)
 */
export function isMovementFavorable(
  openLine: number,
  currentLine: number,
  openOdds: number,
  currentOdds: number,
  side: 'home' | 'away' | 'over' | 'under',
  market: Market
): boolean {
  const lineMoved = Math.abs(currentLine - openLine) >= 0.5
  const oddsMoved = Math.abs(impliedProbability(currentOdds) - impliedProbability(openOdds)) >= 0.01
  
  if (!lineMoved && !oddsMoved) return false
  
  if (market === 'spread') {
    // For spreads: More negative = more favored
    // -8.5 → -9.5 means HOME is more favored
    const lineTowardHome = currentLine < openLine
    const lineTowardAway = currentLine > openLine
    
    // Odds: Higher implied prob = more favored
    const oddsImprovedHome = impliedProbability(currentOdds) > impliedProbability(openOdds)
    
    if (side === 'home') {
      return lineMoved ? lineTowardHome : oddsImprovedHome
    } else {
      return lineMoved ? lineTowardAway : !oddsImprovedHome
    }
  }
  
  if (market === 'total') {
    // For totals: Higher number = favors OVER
    const lineTowardOver = currentLine > openLine
    const lineTowardUnder = currentLine < openLine
    
    // Odds: Higher implied prob for over = over favored
    const oddsImprovedOver = impliedProbability(currentOdds) > impliedProbability(openOdds)
    
    if (side === 'over') {
      return lineMoved ? lineTowardOver : oddsImprovedOver
    } else {
      return lineMoved ? lineTowardUnder : !oddsImprovedOver
    }
  }
  
  if (market === 'ml') {
    // ML: Just odds movement
    // Higher implied prob = more favored
    const oddsImproved = impliedProbability(currentOdds) > impliedProbability(openOdds)
    
    if (side === 'home' || side === 'over') {
      return oddsImproved
    } else {
      return !oddsImproved
    }
  }
  
  return false
}

// ============================================================================
// INDICATOR CALCULATIONS
// ============================================================================

/**
 * Calculate Public Respect score
 * 
 * Qualifies when:
 * - Bets ≥ 55% on this side
 * - Money ≥ 55% on this side
 * - Movement is favorable toward this side
 */
export function publicRespectScore(
  betPct: number,
  moneyPct: number,
  pressure: number
): IndicatorResult {
  const { minBetPct, minMoneyPct } = INDICATOR_THRESHOLDS.publicRespect
  
  // Check qualification
  if (betPct < minBetPct) {
    return { score: 0, qualifies: false, reason: `Bets ${betPct}% < ${minBetPct}%` }
  }
  if (moneyPct < minMoneyPct) {
    return { score: 0, qualifies: false, reason: `Money ${moneyPct}% < ${minMoneyPct}%` }
  }
  if (pressure <= 0) {
    return { score: 0, qualifies: false, reason: 'No favorable movement' }
  }
  
  // Calculate strength
  const { splitWeight, pressureWeight, normalizationDivisor } = SCORE_WEIGHTS.publicRespect
  const publicStrength = (betPct - 50) + (moneyPct - 50)
  const publicFactor = Math.min(publicStrength / normalizationDivisor, 1)
  
  const rawScore = publicFactor * (splitWeight * 100) + (pressure / 100) * (pressureWeight * 100)
  const score = Math.min(Math.round(rawScore), 100)
  
  return { 
    score, 
    qualifies: true, 
    reason: `Bets ${betPct}%, Money ${moneyPct}%, Pressure ${pressure}` 
  }
}

/**
 * Calculate Vegas Backed score
 * 
 * Qualifies when:
 * - Average of bets + money < 50% (minority side)
 * - Movement is favorable toward this side (RLM)
 */
export function vegasBackedScore(
  betPct: number,
  moneyPct: number,
  pressure: number
): IndicatorResult {
  const { maxAvgPct } = INDICATOR_THRESHOLDS.vegasBacked
  
  // Use combined average to catch edge cases like 48/52
  const avgPct = (betPct + moneyPct) / 2
  
  // Check qualification
  if (avgPct >= maxAvgPct) {
    return { score: 0, qualifies: false, reason: `Avg ${avgPct.toFixed(1)}% >= ${maxAvgPct}%` }
  }
  if (pressure <= 0) {
    return { score: 0, qualifies: false, reason: 'No favorable movement' }
  }
  
  // Calculate strength - stronger when public is heavily OTHER way
  const { splitWeight, pressureWeight, normalizationDivisor } = SCORE_WEIGHTS.vegasBacked
  const contrarianStrength = (50 - betPct) + (50 - moneyPct)
  const contrarianFactor = Math.min(contrarianStrength / normalizationDivisor, 1)
  
  const rawScore = contrarianFactor * (splitWeight * 100) + (pressure / 100) * (pressureWeight * 100)
  const score = Math.min(Math.round(rawScore), 100)
  
  return { 
    score, 
    qualifies: true, 
    reason: `Bets ${betPct}%, Money ${moneyPct}%, Pressure ${pressure}` 
  }
}

/**
 * Calculate Whale Respect score
 * 
 * Qualifies when:
 * - Scenario 1: Bets ≤ 50%, Money ≥ 50%, Gap ≥ 20%
 * - Scenario 2: Bets 50-65%, Money ≥ 50%, Gap ≥ 30%
 * - Movement is favorable toward this side
 */
export function whaleRespectScore(
  betPct: number,
  moneyPct: number,
  pressure: number
): IndicatorResult {
  const { scenario1, scenario2 } = INDICATOR_THRESHOLDS.whaleRespect
  const gap = moneyPct - betPct
  
  // Check Scenario 1: Smart Money (minority bets, majority money)
  const qualifiesS1 = 
    betPct <= scenario1.maxBetPct && 
    moneyPct >= scenario1.minMoneyPct && 
    gap >= scenario1.minGap
  
  // Check Scenario 2: Whale Confirmation (public lean, but whales dominating)
  const qualifiesS2 = 
    betPct >= scenario2.minBetPct && 
    betPct <= scenario2.maxBetPct && 
    moneyPct >= scenario2.minMoneyPct && 
    gap >= scenario2.minGap
  
  if (!qualifiesS1 && !qualifiesS2) {
    return { 
      score: 0, 
      qualifies: false, 
      reason: `Gap ${gap}% doesn't meet threshold (S1: ${scenario1.minGap}%, S2: ${scenario2.minGap}%)` 
    }
  }
  
  if (pressure <= 0) {
    return { score: 0, qualifies: false, reason: 'No favorable movement' }
  }
  
  // Calculate strength based on which scenario
  const { gapWeight, pressureWeight, maxGap } = SCORE_WEIGHTS.whaleRespect
  const minGap = qualifiesS1 ? scenario1.minGap : scenario2.minGap
  const gapFactor = Math.min((gap - minGap) / (maxGap - minGap), 1)
  
  const rawScore = gapFactor * (gapWeight * 100) + (pressure / 100) * (pressureWeight * 100)
  const score = Math.min(Math.round(rawScore), 100)
  
  const scenario = qualifiesS1 ? 'S1' : 'S2'
  return { 
    score, 
    qualifies: true, 
    reason: `${scenario}: Bets ${betPct}%, Money ${moneyPct}%, Gap ${gap}%, Pressure ${pressure}` 
  }
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate all signals for one side of a market
 */
export function calculateSideSignals(
  betPct: number,
  moneyPct: number,
  pressure: number,
  hasFavorableMovement: boolean
): SideSignals {
  // If no favorable movement, no signals can fire
  const effectivePressure = hasFavorableMovement ? pressure : 0
  
  return {
    publicRespect: publicRespectScore(betPct, moneyPct, effectivePressure),
    vegasBacked: vegasBackedScore(betPct, moneyPct, effectivePressure),
    whaleRespect: whaleRespectScore(betPct, moneyPct, effectivePressure),
    marketPressure: pressure,
  }
}

/**
 * Calculate all signals for a game
 * 
 * This is the main entry point - takes game data and returns all signals
 */
export function calculateGameSignals(
  sport: string,
  // Spread data
  spreadOpen: number,
  spreadCurrent: number,
  spreadOddsHomeOpen: number,
  spreadOddsHomeCurrent: number,
  spreadOddsAwayOpen: number,
  spreadOddsAwayCurrent: number,
  spreadHomeBetPct: number,
  spreadHomeMoneyPct: number,
  // Total data
  totalOpen: number,
  totalCurrent: number,
  totalOverOddsOpen: number,
  totalOverOddsCurrent: number,
  totalUnderOddsOpen: number,
  totalUnderOddsCurrent: number,
  totalOverBetPct: number,
  totalOverMoneyPct: number,
  // ML data
  mlHomeOpen: number,
  mlHomeCurrent: number,
  mlAwayOpen: number,
  mlAwayCurrent: number,
  mlHomeBetPct: number,
  mlHomeMoneyPct: number
): SignalData {
  const result: SignalData = {
    spread_home_public_respect: 0,
    spread_home_vegas_backed: 0,
    spread_home_whale_respect: 0,
    spread_away_public_respect: 0,
    spread_away_vegas_backed: 0,
    spread_away_whale_respect: 0,
    total_over_public_respect: 0,
    total_over_vegas_backed: 0,
    total_over_whale_respect: 0,
    total_under_public_respect: 0,
    total_under_vegas_backed: 0,
    total_under_whale_respect: 0,
    ml_home_public_respect: 0,
    ml_home_vegas_backed: 0,
    ml_home_whale_respect: 0,
    ml_away_public_respect: 0,
    ml_away_vegas_backed: 0,
    ml_away_whale_respect: 0,
  }
  
  // ========== SPREAD SIGNALS ==========
  const spreadLineScore = lineMoveScore(spreadOpen, spreadCurrent, sport, 'spread')
  const spreadOddsScoreHome = oddsMoveScore(spreadOddsHomeOpen, spreadOddsHomeCurrent, sport, 'spread')
  const spreadOddsScoreAway = oddsMoveScore(spreadOddsAwayOpen, spreadOddsAwayCurrent, sport, 'spread')
  
  const spreadPressureHome = marketPressure(spreadLineScore, spreadOddsScoreHome, sport, 'spread')
  const spreadPressureAway = marketPressure(spreadLineScore, spreadOddsScoreAway, sport, 'spread')
  
  const spreadFavorableHome = isMovementFavorable(spreadOpen, spreadCurrent, spreadOddsHomeOpen, spreadOddsHomeCurrent, 'home', 'spread')
  const spreadFavorableAway = isMovementFavorable(spreadOpen, spreadCurrent, spreadOddsAwayOpen, spreadOddsAwayCurrent, 'away', 'spread')
  
  const spreadAwayBetPct = 100 - spreadHomeBetPct
  const spreadAwayMoneyPct = 100 - spreadHomeMoneyPct
  
  const spreadHomeSignals = calculateSideSignals(spreadHomeBetPct, spreadHomeMoneyPct, spreadPressureHome, spreadFavorableHome)
  const spreadAwaySignals = calculateSideSignals(spreadAwayBetPct, spreadAwayMoneyPct, spreadPressureAway, spreadFavorableAway)
  
  result.spread_home_public_respect = spreadHomeSignals.publicRespect.score
  result.spread_home_vegas_backed = spreadHomeSignals.vegasBacked.score
  result.spread_home_whale_respect = spreadHomeSignals.whaleRespect.score
  result.spread_away_public_respect = spreadAwaySignals.publicRespect.score
  result.spread_away_vegas_backed = spreadAwaySignals.vegasBacked.score
  result.spread_away_whale_respect = spreadAwaySignals.whaleRespect.score
  
  // ========== TOTAL SIGNALS ==========
  const totalLineScore = lineMoveScore(totalOpen, totalCurrent, sport, 'total')
  const totalOddsScoreOver = oddsMoveScore(totalOverOddsOpen, totalOverOddsCurrent, sport, 'total')
  const totalOddsScoreUnder = oddsMoveScore(totalUnderOddsOpen, totalUnderOddsCurrent, sport, 'total')
  
  const totalPressureOver = marketPressure(totalLineScore, totalOddsScoreOver, sport, 'total')
  const totalPressureUnder = marketPressure(totalLineScore, totalOddsScoreUnder, sport, 'total')
  
  const totalFavorableOver = isMovementFavorable(totalOpen, totalCurrent, totalOverOddsOpen, totalOverOddsCurrent, 'over', 'total')
  const totalFavorableUnder = isMovementFavorable(totalOpen, totalCurrent, totalUnderOddsOpen, totalUnderOddsCurrent, 'under', 'total')
  
  const totalUnderBetPct = 100 - totalOverBetPct
  const totalUnderMoneyPct = 100 - totalOverMoneyPct
  
  const totalOverSignals = calculateSideSignals(totalOverBetPct, totalOverMoneyPct, totalPressureOver, totalFavorableOver)
  const totalUnderSignals = calculateSideSignals(totalUnderBetPct, totalUnderMoneyPct, totalPressureUnder, totalFavorableUnder)
  
  result.total_over_public_respect = totalOverSignals.publicRespect.score
  result.total_over_vegas_backed = totalOverSignals.vegasBacked.score
  result.total_over_whale_respect = totalOverSignals.whaleRespect.score
  result.total_under_public_respect = totalUnderSignals.publicRespect.score
  result.total_under_vegas_backed = totalUnderSignals.vegasBacked.score
  result.total_under_whale_respect = totalUnderSignals.whaleRespect.score
  
  // ========== ML SIGNALS ==========
  const mlOddsScoreHome = oddsMoveScore(mlHomeOpen, mlHomeCurrent, sport, 'ml')
  const mlOddsScoreAway = oddsMoveScore(mlAwayOpen, mlAwayCurrent, sport, 'ml')
  
  const mlPressureHome = marketPressure(0, mlOddsScoreHome, sport, 'ml') // Line score is always 0 for ML
  const mlPressureAway = marketPressure(0, mlOddsScoreAway, sport, 'ml')
  
  const mlFavorableHome = isMovementFavorable(0, 0, mlHomeOpen, mlHomeCurrent, 'home', 'ml')
  const mlFavorableAway = isMovementFavorable(0, 0, mlAwayOpen, mlAwayCurrent, 'away', 'ml')
  
  const mlAwayBetPct = 100 - mlHomeBetPct
  const mlAwayMoneyPct = 100 - mlHomeMoneyPct
  
  const mlHomeSignals = calculateSideSignals(mlHomeBetPct, mlHomeMoneyPct, mlPressureHome, mlFavorableHome)
  const mlAwaySignals = calculateSideSignals(mlAwayBetPct, mlAwayMoneyPct, mlPressureAway, mlFavorableAway)
  
  result.ml_home_public_respect = mlHomeSignals.publicRespect.score
  result.ml_home_vegas_backed = mlHomeSignals.vegasBacked.score
  result.ml_home_whale_respect = mlHomeSignals.whaleRespect.score
  result.ml_away_public_respect = mlAwaySignals.publicRespect.score
  result.ml_away_vegas_backed = mlAwaySignals.vegasBacked.score
  result.ml_away_whale_respect = mlAwaySignals.whaleRespect.score
  
  return result
}

/**
 * Get the primary signal for a side (for display in SIGNAL column)
 * Returns the strongest signal that qualifies, or null if none
 */
export function getPrimarySignal(
  publicRespect: number,
  vegasBacked: number,
  whaleRespect: number
): { type: 'public' | 'vegas' | 'whale' | null; score: number } {
  const signals = [
    { type: 'public' as const, score: publicRespect },
    { type: 'vegas' as const, score: vegasBacked },
    { type: 'whale' as const, score: whaleRespect },
  ].filter(s => s.score > 0)
  
  if (signals.length === 0) return { type: null, score: 0 }
  
  // Return the highest scoring signal
  return signals.reduce((best, curr) => curr.score > best.score ? curr : best)
}

