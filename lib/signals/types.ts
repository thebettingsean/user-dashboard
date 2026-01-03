/**
 * Betting Signal Types
 */

export type Sport = 'nfl' | 'nba' | 'nhl' | 'mlb' | 'cfb' | 'cbb' | 'ncaab' | 'ncaaf'
export type Market = 'spread' | 'total' | 'ml'
export type Side = 'home' | 'away' | 'over' | 'under'

// Input data for signal calculations
export interface SignalInput {
  sport: string
  market: Market
  
  // Line data
  openLine: number
  currentLine: number
  
  // Odds data (American format)
  openOddsHome: number  // For spread/ml: home odds. For total: over odds
  openOddsAway: number  // For spread/ml: away odds. For total: under odds
  currentOddsHome: number
  currentOddsAway: number
  
  // Betting splits (percentages, 0-100)
  homeBetPct: number    // For spread/ml. For total: overBetPct
  homeMoneyPct: number  // For spread/ml. For total: overMoneyPct
  // Away/under is always 100 - home/over
}

// Intermediate calculation results
export interface MovementScores {
  lineScore: number      // 0-100: How significant is the line movement?
  oddsScoreHome: number  // 0-100: How significant is the odds movement for home/over?
  oddsScoreAway: number  // 0-100: How significant is the odds movement for away/under?
  marketPressureHome: number  // 0-100: Combined score for home/over side
  marketPressureAway: number  // 0-100: Combined score for away/under side
}

// Direction of movement
export interface MovementDirection {
  favoredSide: 'home' | 'away' | 'over' | 'under' | 'none'
  lineMoved: boolean
  oddsMoved: boolean
}

// Individual indicator result
export interface IndicatorResult {
  score: number     // 0-100 (0 if doesn't qualify)
  qualifies: boolean
  reason?: string   // Debug info
}

// All signals for one side of a market
export interface SideSignals {
  publicRespect: IndicatorResult
  vegasBacked: IndicatorResult
  whaleRespect: IndicatorResult
  marketPressure: number  // The raw market pressure score
}

// Complete signals for a game's market
export interface MarketSignals {
  home: SideSignals  // For spread/ml
  away: SideSignals  // For spread/ml
  // OR
  over?: SideSignals   // For totals
  under?: SideSignals  // For totals
}

// All signals for a game
export interface GameSignals {
  spread: {
    home: SideSignals
    away: SideSignals
  }
  total: {
    over: SideSignals
    under: SideSignals
  }
  ml: {
    home: SideSignals
    away: SideSignals
  }
}

// Simplified signal data for API response
export interface SignalData {
  // Spread signals
  spread_home_public_respect: number
  spread_home_vegas_backed: number
  spread_home_whale_respect: number
  spread_away_public_respect: number
  spread_away_vegas_backed: number
  spread_away_whale_respect: number
  
  // Total signals
  total_over_public_respect: number
  total_over_vegas_backed: number
  total_over_whale_respect: number
  total_under_public_respect: number
  total_under_vegas_backed: number
  total_under_whale_respect: number
  
  // ML signals
  ml_home_public_respect: number
  ml_home_vegas_backed: number
  ml_home_whale_respect: number
  ml_away_public_respect: number
  ml_away_vegas_backed: number
  ml_away_whale_respect: number
}

// Empty/default signal data
export const EMPTY_SIGNAL_DATA: SignalData = {
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

