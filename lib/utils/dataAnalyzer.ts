// lib/utils/dataAnalyzer.ts
import { Game } from '../api/sportsData'

// Helper to format game time (EST) - matches AI script time conversion
function formatGameTime(gameDate: string): string {
  // Parse the UTC datetime string
  const utcDate = new Date(gameDate)
  
  // Format in EST timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })
  
  return formatter.format(utcDate)
}

// Helper to get odds for a specific bet type
function getOddsForBetType(betType: string, publicMoney: PublicMoneyData): string {
  if (betType.includes('moneyline_away')) {
    return publicMoney.away_team_ml > 0 ? `+${publicMoney.away_team_ml}` : `${publicMoney.away_team_ml}`
  } else if (betType.includes('moneyline_home')) {
    return publicMoney.home_team_ml > 0 ? `+${publicMoney.home_team_ml}` : `${publicMoney.home_team_ml}`
  } else if (betType.includes('spread_away')) {
    return `${publicMoney.away_team_point_spread > 0 ? '+' : ''}${publicMoney.away_team_point_spread}`
  } else if (betType.includes('spread_home')) {
    return `${publicMoney.home_team_point_spread > 0 ? '+' : ''}${publicMoney.home_team_point_spread}`
  } else if (betType.includes('over') || betType.includes('under')) {
    return `-110` // Default odds for totals
  }
  return '-110'
}

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

// Game interface now imported from '../api/sportsData' at top of file

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
  gameTime?: string
  odds?: string
}

export interface TopTrend {
  type: 'vegas-backed' | 'sharp-money'
  label: string
  value: string
  gameTime?: string
  odds?: string
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
      dollarsPct: Math.round(bet.dollars),
      gameTime: formatGameTime(game.game_date),
      odds: getOddsForBetType(bet.type, publicMoney)
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
        value,
        gameTime: formatGameTime(game.game_date),
        odds: getOddsForBetType(topSharp.bet_type, publicMoney)
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
        value,
        gameTime: formatGameTime(game.game_date),
        odds: getOddsForBetType(topRLM.bet_type, publicMoney)
      })
    }
  }
  
  return trends.slice(0, 2)
}

// Helper to calculate win percentage from wins-losses
function calculateWinPct(wins: number, losses: number): number {
  const total = wins + losses
  return total > 0 ? (wins / total) * 100 : 0
}

// Analyze referee stats to find top trends across ALL categories
export function findTopRefereeTrends(
  games: Array<{ game: Game; refereeStats: any }>
): RefereeTrend[] {
  if (games.length === 0) return []
  
  // Find the earliest game date to prioritize soonest games
  const earliestDate = games.reduce((earliest, { game }) => {
    const gameDate = new Date(game.game_date).getTime()
    return gameDate < earliest ? gameDate : earliest
  }, new Date(games[0].game.game_date).getTime())
  
  // Only analyze games on the earliest date (ignore later games)
  const soonestGames = games.filter(({ game }) => {
    const gameDate = new Date(game.game_date)
    const earlyDate = new Date(earliestDate)
    // Same day (ignoring time)
    return gameDate.toDateString() === earlyDate.toDateString()
  })
  
  console.log(`📅 Analyzing ${soonestGames.length} games from earliest date (${new Date(earliestDate).toDateString()})`)
  
  const allTrends: RefereeTrend[] = []

  for (const { game, refereeStats } of soonestGames) {
    if (!refereeStats || refereeStats.total_games < 10) continue

    const refName = refereeStats.referee_name?.split(' ').pop() || 'Unknown'
    const gameLabel = `${game.away_team.split(' ').pop()}/${game.home_team.split(' ').pop()}`

    // 1. Check O/U Overall
    const ou = refereeStats.over_under?.over_under
    if (ou) {
      const overWinPct = calculateWinPct(ou.over_hits || 0, ou.under_hits || 0)
      const underWinPct = calculateWinPct(ou.under_hits || 0, ou.over_hits || 0)
      
      if (overWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Over ${ou.over_hits}-${ou.under_hits}`,
          percentage: Math.round(overWinPct)
        })
      }
      if (underWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Under ${ou.under_hits}-${ou.over_hits}`,
          percentage: Math.round(underWinPct)
        })
      }

      // Check O/U Public Money buckets
      const checkPublicMoneyBuckets = (buckets: any, betType: string) => {
        if (!buckets) return
        Object.entries(buckets).forEach(([range, stats]: [string, any]) => {
          const wins = stats.wins || 0
          const losses = stats.losses || 0
          const total = wins + losses
          if (total >= 10) { // Need at least 10 games in this bucket
            const winPct = calculateWinPct(wins, losses)
            if (winPct >= 60) {
              allTrends.push({
                game: gameLabel,
                referee: refName,
                trend: `${betType} (Public ${range}) ${wins}-${losses}`,
                percentage: Math.round(winPct)
              })
            }
          }
        })
      }

      checkPublicMoneyBuckets(ou.public_money_over, 'Over')
      checkPublicMoneyBuckets(ou.public_money_under, 'Under')
    }

    // 2. Check Spread trends
    const spread = refereeStats.spread?.spread
    if (spread) {
      const atsWinPct = calculateWinPct(spread.ats_wins || 0, spread.ats_losses || 0)
      if (atsWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `ATS ${spread.ats_wins}-${spread.ats_losses}`,
          percentage: Math.round(atsWinPct)
        })
      }

      // Home/Away favorites
      const homeFavWinPct = calculateWinPct(spread.home_favorite_wins || 0, spread.home_favorite_losses || 0)
      if (homeFavWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Home Fav ${spread.home_favorite_wins}-${spread.home_favorite_losses}`,
          percentage: Math.round(homeFavWinPct)
        })
      }

      const awayFavWinPct = calculateWinPct(spread.away_favorite_wins || 0, spread.away_favorite_losses || 0)
      if (awayFavWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Away Fav ${spread.away_favorite_wins}-${spread.away_favorite_losses}`,
          percentage: Math.round(awayFavWinPct)
        })
      }
    }

    // 3. Check Moneyline trends
    const ml = refereeStats.moneyline?.ml
    if (ml) {
      const homeMlWinPct = calculateWinPct(ml.home_ml_wins || 0, ml.home_ml_losses || 0)
      if (homeMlWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Home ML ${ml.home_ml_wins}-${ml.home_ml_losses}`,
          percentage: Math.round(homeMlWinPct)
        })
      }

      const awayMlWinPct = calculateWinPct(ml.away_ml_wins || 0, ml.away_ml_losses || 0)
      if (awayMlWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Away ML ${ml.away_ml_wins}-${ml.away_ml_losses}`,
          percentage: Math.round(awayMlWinPct)
        })
      }

      // Check favorites/underdogs
      const homeFavMlWinPct = calculateWinPct(ml.home_favorite_wins || 0, ml.home_favorite_losses || 0)
      if (homeFavMlWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Home Fav ML ${ml.home_favorite_wins}-${ml.home_favorite_losses}`,
          percentage: Math.round(homeFavMlWinPct)
        })
      }

      const awayFavMlWinPct = calculateWinPct(ml.away_favorite_wins || 0, ml.away_favorite_losses || 0)
      if (awayFavMlWinPct >= 60) {
        allTrends.push({
          game: gameLabel,
          referee: refName,
          trend: `Away Fav ML ${ml.away_favorite_wins}-${ml.away_favorite_losses}`,
          percentage: Math.round(awayFavMlWinPct)
        })
      }
    }
  }

  // Sort by win percentage and return top 2
  return allTrends.sort((a, b) => b.percentage - a.percentage).slice(0, 2)
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
