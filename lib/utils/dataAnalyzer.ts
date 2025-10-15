// lib/utils/dataAnalyzer.ts

interface PublicMoneyData {
  public_money_ml_away_bets_pct: number
  public_money_ml_away_stake_pct: number
  public_money_ml_home_bets_pct: number
  public_money_ml_home_stake_pct: number
  public_money_spread_away_bets_pct: number
  public_money_spread_away_stake_pct: number
  public_money_spread_home_bets_pct: number
  public_money_spread_home_stake_pct: number
  public_money_over_bets_pct: number
  public_money_over_stake_pct: number
  public_money_under_bets_pct: number
  public_money_under_stake_pct: number
  away_team_ml: number
  home_team_ml: number
  away_team_point_spread: number
  home_team_point_spread: number
}

interface Game {
  game_id: string
  name: string
  away_team: string
  home_team: string
  odds: {
    spread: number
    away_team_odds: {
      moneyline: number
      spread_odds: number
    }
    home_team_odds: {
      moneyline: number
      spread_odds: number
    }
  }
}

interface RefereeStats {
  referee_name: string
  over_under: {
    over_under: {
      over_hits: number
      under_hits: number
      over_percentage: number
      under_percentage: number
    }
  }
  spread: {
    spread: {
      ats_wins: number
      ats_losses: number
    }
  }
  total_games: number
}

export interface MostPublicBet {
  label: string
  betsPct: number
  dollarsPct: number
}

export interface TopTrend {
  type: 'vegas-backed' | 'sharp-money'
  label: string
  value: string
}

export interface RefereeTrend {
  game: string
  referee: string
  trend: string
  percentage: number
}

// Analyze public money data to find the most public bets
export function findMostPublicBets(
  game: Game,
  publicMoney: PublicMoneyData
): MostPublicBet[] {
  const bets = []

  // Check moneyline
  if (publicMoney.public_money_ml_away_bets_pct > 65) {
    bets.push({
      label: `${game.away_team} ML`,
      betsPct: publicMoney.public_money_ml_away_bets_pct,
      dollarsPct: publicMoney.public_money_ml_away_stake_pct
    })
  }
  if (publicMoney.public_money_ml_home_bets_pct > 65) {
    bets.push({
      label: `${game.home_team} ML`,
      betsPct: publicMoney.public_money_ml_home_bets_pct,
      dollarsPct: publicMoney.public_money_ml_home_stake_pct
    })
  }

  // Check spreads
  if (publicMoney.public_money_spread_away_bets_pct > 65) {
    const spread = publicMoney.away_team_point_spread
    const spreadLabel = spread > 0 ? `+${spread}` : spread.toString()
    bets.push({
      label: `${game.away_team} ${spreadLabel}`,
      betsPct: publicMoney.public_money_spread_away_bets_pct,
      dollarsPct: publicMoney.public_money_spread_away_stake_pct
    })
  }
  if (publicMoney.public_money_spread_home_bets_pct > 65) {
    const spread = publicMoney.home_team_point_spread
    const spreadLabel = spread > 0 ? `+${spread}` : spread.toString()
    bets.push({
      label: `${game.home_team} ${spreadLabel}`,
      betsPct: publicMoney.public_money_spread_home_bets_pct,
      dollarsPct: publicMoney.public_money_spread_home_stake_pct
    })
  }

  // Sort by bet percentage (highest first) and return top 2
  return bets.sort((a, b) => b.betsPct - a.betsPct).slice(0, 2)
}

// Find interesting trends (sharp money vs public, etc)
export function findTopTrends(
  game: Game,
  publicMoney: PublicMoneyData
): TopTrend[] {
  const trends: TopTrend[] = []

  // Check for sharp money (big difference between bet % and dollar %)
  const mlAwayDiff = Math.abs(publicMoney.public_money_ml_away_stake_pct - publicMoney.public_money_ml_away_bets_pct)
  const mlHomeDiff = Math.abs(publicMoney.public_money_ml_home_stake_pct - publicMoney.public_money_ml_home_bets_pct)
  const spreadAwayDiff = Math.abs(publicMoney.public_money_spread_away_stake_pct - publicMoney.public_money_spread_away_bets_pct)
  const spreadHomeDiff = Math.abs(publicMoney.public_money_spread_home_stake_pct - publicMoney.public_money_spread_home_bets_pct)

  // Find the biggest sharp money indicator
  const sharpPlays = [
    { diff: mlAwayDiff, team: game.away_team, type: 'ML', stake: publicMoney.public_money_ml_away_stake_pct, bets: publicMoney.public_money_ml_away_bets_pct },
    { diff: mlHomeDiff, team: game.home_team, type: 'ML', stake: publicMoney.public_money_ml_home_stake_pct, bets: publicMoney.public_money_ml_home_bets_pct },
    { diff: spreadAwayDiff, team: game.away_team, type: 'spread', stake: publicMoney.public_money_spread_away_stake_pct, bets: publicMoney.public_money_spread_away_bets_pct },
    { diff: spreadHomeDiff, team: game.home_team, type: 'spread', stake: publicMoney.public_money_spread_home_stake_pct, bets: publicMoney.public_money_spread_home_bets_pct }
  ]

  const biggestSharp = sharpPlays.sort((a, b) => b.diff - a.diff)[0]
  
  if (biggestSharp.diff > 15) {
    const diffSign = biggestSharp.stake > biggestSharp.bets ? '+' : ''
    trends.push({
      type: 'sharp-money',
      label: `${biggestSharp.team} ${biggestSharp.type}`,
      value: `${diffSign}${Math.round(biggestSharp.diff)}% difference`
    })
  }

  // Check for Vegas-backed plays (low public %, could indicate value)
  // Only create spread trends if spread data is available (not 0, null, or undefined)
  if (publicMoney.public_money_spread_away_bets_pct < 35 && 
      publicMoney.away_team_point_spread !== null && 
      publicMoney.away_team_point_spread !== undefined &&
      publicMoney.away_team_point_spread !== 0) {
    const spread = publicMoney.away_team_point_spread
    const spreadLabel = spread > 0 ? `+${spread}` : spread.toString()
    trends.push({
      type: 'vegas-backed',
      label: `${game.away_team} ${spreadLabel}`,
      value: `${Math.round(100 - publicMoney.public_money_spread_away_bets_pct)}% value`
    })
  }
  if (publicMoney.public_money_spread_home_bets_pct < 35 && 
      publicMoney.home_team_point_spread !== null && 
      publicMoney.home_team_point_spread !== undefined &&
      publicMoney.home_team_point_spread !== 0) {
    const spread = publicMoney.home_team_point_spread
    const spreadLabel = spread > 0 ? `+${spread}` : spread.toString()
    trends.push({
      type: 'vegas-backed',
      label: `${game.home_team} ${spreadLabel}`,
      value: `${Math.round(100 - publicMoney.public_money_spread_home_bets_pct)}% value`
    })
  }

  // Return top 2 trends
  return trends.slice(0, 2)
}

// Analyze referee stats to find top O/U trends
export function findTopRefereeTrends(
  games: Array<{ game: Game; refereeStats: RefereeStats | null }>
): RefereeTrend[] {
  const trends: RefereeTrend[] = []

  for (const { game, refereeStats } of games) {
    // Skip if no referee stats or insufficient data
    if (!refereeStats || !refereeStats.over_under || !refereeStats.over_under.over_under) {
      continue
    }
    
    if (refereeStats.total_games < 10) continue

    const overHits = refereeStats.over_under.over_under.over_hits || 0
    const underHits = refereeStats.over_under.over_under.under_hits || 0
    const totalGames = refereeStats.total_games
    const overPct = refereeStats.over_under.over_under.over_percentage || 0
    const underPct = refereeStats.over_under.over_under.under_percentage || 0

    // Strong over trend
    if (overPct > 60) {
      trends.push({
        game: `${game.away_team.split(' ').pop()}/${game.home_team.split(' ').pop()}`,
        referee: refereeStats.referee_name?.split(' ').pop() || 'Unknown',
        trend: `Over ${overHits}-${underHits} L${totalGames}`,
        percentage: Math.round(overPct)
      })
    }

    // Strong under trend
    if (underPct > 60) {
      trends.push({
        game: `${game.away_team.split(' ').pop()}/${game.home_team.split(' ').pop()}`,
        referee: refereeStats.referee_name?.split(' ').pop() || 'Unknown',
        trend: `Under ${underHits}-${overHits} L${totalGames}`,
        percentage: Math.round(underPct)
      })
    }
  }

  // Sort by percentage and return top 2
  return trends.sort((a, b) => b.percentage - a.percentage).slice(0, 2)
}

// Find team statistical edges (placeholder for now - can expand later)
export interface TeamTrend {
  description: string
  matchup: string
}

export function findTeamTrends(games: Game[]): TeamTrend[] {
  // Placeholder implementation
  // In the future, you can add team stats API calls here
  return [
    {
      description: 'Top offense vs weak defense',
      matchup: 'Check matchup details'
    },
    {
      description: 'Home favorite trend',
      matchup: 'Strong ATS record'
    }
  ]
}
