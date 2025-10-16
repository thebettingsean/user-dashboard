// lib/utils/dataAnalyzer.ts

// API structures
interface SharpMoneyIndicator {
  bet_type: string
  sharpness_level: string
  stake_pct: number
  difference?: number
  sharpness_level_value?: number
}

interface RLMIndicator {
  bet_type: string
  rlm_strength: number
  line_movement: number
  rlm_strength_normalized: number
  percentage: number
}

export interface PublicMoneyData {
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
  sharp_money_stats: SharpMoneyIndicator[]
  rlm_stats: RLMIndicator[]
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

// Helper to format bet type labels
function formatBetLabel(game: Game, betType: string, publicMoney: PublicMoneyData): string {
  const parts = betType.toLowerCase().split('_')
  
  if (betType.includes('moneyline')) {
    const team = betType.includes('home') ? game.home_team : game.away_team
    return `${team} ML`
  }
  
  if (betType.includes('spread')) {
    const team = betType.includes('home') ? game.home_team : game.away_team
    const spread = betType.includes('home') ? publicMoney.home_team_point_spread : publicMoney.away_team_point_spread
    const spreadLabel = spread > 0 ? `+${spread}` : spread.toString()
    return `${team} ${spreadLabel}`
  }
  
  if (betType === 'over') {
    return `${game.name} Over`
  }
  
  if (betType === 'under') {
    return `${game.name} Under`
  }
  
  return betType
}

// Get bet percentage from public money data
function getBetPercentage(betType: string, publicMoney: PublicMoneyData): { bets: number, dollars: number } {
  const typeMap: Record<string, { bets: number, dollars: number }> = {
    'moneyline_away': { bets: publicMoney.public_money_ml_away_bets_pct, dollars: publicMoney.public_money_ml_away_stake_pct },
    'moneyline_home': { bets: publicMoney.public_money_ml_home_bets_pct, dollars: publicMoney.public_money_ml_home_stake_pct },
    'spread_away': { bets: publicMoney.public_money_spread_away_bets_pct, dollars: publicMoney.public_money_spread_away_stake_pct },
    'spread_home': { bets: publicMoney.public_money_spread_home_bets_pct, dollars: publicMoney.public_money_spread_home_stake_pct },
    'over': { bets: publicMoney.public_money_over_bets_pct, dollars: publicMoney.public_money_over_stake_pct },
    'under': { bets: publicMoney.public_money_under_bets_pct, dollars: publicMoney.public_money_under_stake_pct }
  }
  
  return typeMap[betType] || { bets: 0, dollars: 0 }
}

// Find the most public bets (highest percentages)
export function findMostPublicBets(
  game: Game,
  publicMoney: PublicMoneyData
): MostPublicBet[] {
  const allBets = [
    { type: 'moneyline_away', ...getBetPercentage('moneyline_away', publicMoney) },
    { type: 'moneyline_home', ...getBetPercentage('moneyline_home', publicMoney) },
    { type: 'spread_away', ...getBetPercentage('spread_away', publicMoney) },
    { type: 'spread_home', ...getBetPercentage('spread_home', publicMoney) },
    { type: 'over', ...getBetPercentage('over', publicMoney) },
    { type: 'under', ...getBetPercentage('under', publicMoney) }
  ]
  
  // Filter for bets with >55% public backing and sort by bet percentage
  const publicBets = allBets
    .filter(bet => bet.bets > 55)
    .sort((a, b) => b.bets - a.bets)
    .slice(0, 2)
    .map(bet => ({
      label: formatBetLabel(game, bet.type, publicMoney),
      betsPct: Math.round(bet.bets),
      dollarsPct: Math.round(bet.dollars)
    }))
  
  return publicBets
}

// Find top trends using API indicators (Sharp Money and RLM/Vegas-backed)
export function findTopTrends(
  game: Game,
  publicMoney: PublicMoneyData
): TopTrend[] {
  const trends: TopTrend[] = []
  
  // 1. Find SHARP MONEY indicators from API
  if (publicMoney.sharp_money_stats && publicMoney.sharp_money_stats.length > 0) {
    const sharpBets = publicMoney.sharp_money_stats
      .filter(stat => 
        stat.sharpness_level && 
        stat.sharpness_level.toLowerCase().includes('sharp') ||
        stat.sharpness_level.toLowerCase().includes('big bettor')
      )
      .sort((a, b) => {
        const valueA = a.sharpness_level_value || a.difference || 0
        const valueB = b.sharpness_level_value || b.difference || 0
        return valueB - valueA
      })
    
    if (sharpBets.length > 0) {
      const topSharp = sharpBets[0]
      const label = formatBetLabel(game, topSharp.bet_type, publicMoney)
      const value = topSharp.sharpness_level_value 
        ? `${topSharp.sharpness_level_value.toFixed(1)}% value`
        : `${topSharp.sharpness_level}`
      
      trends.push({
        type: 'sharp-money',
        label,
        value
      })
    }
  }
  
  // 2. Find RLM (Reverse Line Movement / Vegas-backed) indicators from API
  if (publicMoney.rlm_stats && publicMoney.rlm_stats.length > 0) {
    const rlmBets = publicMoney.rlm_stats
      .filter(stat => stat.percentage > 30) // Only significant RLM (percentage already 0-100)
      .sort((a, b) => b.percentage - a.percentage)
    
    if (rlmBets.length > 0) {
      const topRLM = rlmBets[0]
      const label = formatBetLabel(game, topRLM.bet_type, publicMoney)
      const value = `RLM ${topRLM.percentage.toFixed(1)}%`
      
      trends.push({
        type: 'vegas-backed',
        label,
        value
      })
    }
  }
  
  return trends.slice(0, 2)
}

// Analyze referee stats to find top O/U trends
export function findTopRefereeTrends(
  games: Array<{ game: Game; refereeStats: RefereeStats | null }>
): RefereeTrend[] {
  const trends: RefereeTrend[] = []

  for (const { game, refereeStats } of games) {
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

  return trends.sort((a, b) => b.percentage - a.percentage).slice(0, 2)
}

// Find team statistical edges (placeholder for now)
export interface TeamTrend {
  description: string
  matchup: string
}

export function findTeamTrends(games: Game[]): TeamTrend[] {
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
