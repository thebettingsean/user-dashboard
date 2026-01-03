/**
 * Betting Signal Constants
 * 
 * ELS (Expected Line Sensitivity) - How much line movement is meaningful per sport
 * EOS (Expected Odds Sensitivity) - How much odds/juice movement is meaningful per sport
 */

// Expected Line Sensitivity - Lower value = smaller moves are more meaningful
export const ELS: Record<string, Record<string, number>> = {
  nfl: { spread: 1.5, total: 2.0 },
  nba: { spread: 2.0, total: 4.0 },
  nhl: { spread: 0.5, total: 0.5 },
  mlb: { spread: 0.5, total: 0.75 },
  cfb: { spread: 2.0, total: 3.0 },
  cbb: { spread: 2.5, total: 4.0 },
  ncaab: { spread: 2.5, total: 4.0 }, // Alias for CBB
  ncaaf: { spread: 2.0, total: 3.0 }, // Alias for CFB
}

// Expected Odds Sensitivity - Implied probability change threshold
export const EOS: Record<string, Record<string, number>> = {
  nfl: { spread: 0.04, total: 0.04, ml: 0.05 },
  nba: { spread: 0.03, total: 0.03, ml: 0.04 },
  nhl: { spread: 0.03, total: 0.025, ml: 0.04 },
  mlb: { spread: 0.03, total: 0.025, ml: 0.04 },
  cfb: { spread: 0.04, total: 0.04, ml: 0.05 },
  cbb: { spread: 0.035, total: 0.035, ml: 0.045 },
  ncaab: { spread: 0.035, total: 0.035, ml: 0.045 },
  ncaaf: { spread: 0.04, total: 0.04, ml: 0.05 },
}

// Market pressure weights by sport
export const MARKET_PRESSURE_WEIGHTS: Record<string, { line: number; odds: number }> = {
  // NHL: Odds-heavy but line still matters
  nhl: { line: 0.35, odds: 0.65 },
  // MLB: Hybrid - line movement matters, odds still lead
  mlb: { line: 0.45, odds: 0.55 },
  // NFL/NBA/College: Line-dominant
  nfl: { line: 0.55, odds: 0.45 },
  nba: { line: 0.55, odds: 0.45 },
  cfb: { line: 0.55, odds: 0.45 },
  cbb: { line: 0.55, odds: 0.45 },
  ncaab: { line: 0.55, odds: 0.45 },
  ncaaf: { line: 0.55, odds: 0.45 },
}

// Indicator thresholds
export const INDICATOR_THRESHOLDS = {
  publicRespect: {
    minBetPct: 55,
    minMoneyPct: 55,
  },
  vegasBacked: {
    maxAvgPct: 50, // (betPct + moneyPct) / 2 must be < this
  },
  whaleRespect: {
    scenario1: {
      maxBetPct: 50,
      minMoneyPct: 50,
      minGap: 20,
    },
    scenario2: {
      minBetPct: 50,
      maxBetPct: 65,
      minMoneyPct: 50,
      minGap: 30,
    },
  },
}

// Caps and weights for final score calculations
export const SCORE_WEIGHTS = {
  publicRespect: {
    splitWeight: 0.40,
    pressureWeight: 0.60,
    normalizationDivisor: 60, // Practical max for split strength
  },
  vegasBacked: {
    splitWeight: 0.35,
    pressureWeight: 0.65,
    normalizationDivisor: 60,
  },
  whaleRespect: {
    gapWeight: 0.30,
    pressureWeight: 0.70,
    maxGap: 50, // Practical cap for gap normalization
  },
}

// Cap for odds-only pressure (when no line movement)
export const ODDS_ONLY_PRESSURE_CAP = 70

