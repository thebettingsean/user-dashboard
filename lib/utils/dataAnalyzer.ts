// lib/utils/dataAnalyzer.ts

import { RefereeStats } from '../api/sportsData'

interface PublicMoneyBucket {
  losses: number
  roi: number
  total_bet: number
  total_profit: number
  win_pct: number
  wins: number
  total_games?: number
  quadrant_name?: string
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

export interface MostPublicBet {
  label: string
  betsPct: number
  dollarsPct: number
}

export interface TopTrend {
  type: 'vegas-backed' | 'sharp-money' | 'public-fade'
  label: string
  value: string
}

export interface RefereeTrend {
  game: string
  referee: string
  trend: string
  percentage: number
}

// Helper to determine the "most public" bucket (76-100% means highest public backing)
function getMostPublicBucket(
  buckets: {
    '0-25%': PublicMoneyBucket
    '26-50%': PublicMoneyBucket
    '51-75%': PublicMoneyBucket
    '76-100%': PublicMoneyBucket
  } | null
): { bucketName: string; bucket: PublicMoneyBucket } | null {
  if (!buckets) return null
  
  // The 76-100% bucket represents the most public side
  const mostPublic = buckets['76-100%']
  if (mostPublic && mostPublic.total_games && mostPublic.total_games > 0) {
    return { bucketName: '76-100%', bucket: mostPublic }
  }
  
  // Fallback to 51-75% if 76-100% has no games
  const secondMostPublic = buckets['51-75%']
  if (secondMostPublic && secondMostPublic.total_games && secondMostPublic.total_games > 0) {
    return { bucketName: '51-75%', bucket: secondMostPublic }
  }
  
  return null
}

// Helper to determine contrarian/fade bucket (0-25% means least public, could be sharp)
function getContrarianBucket(
  buckets: {
    '0-25%': PublicMoneyBucket
    '26-50%': PublicMoneyBucket
    '51-75%': PublicMoneyBucket
    '76-100%': PublicMoneyBucket
  } | null
): { bucketName: string; bucket: PublicMoneyBucket } | null {
  if (!buckets) return null
  
  // The 0-25% bucket represents the least public side (contrarian play)
  const contrarian = buckets['0-25%']
  if (contrarian && contrarian.total_games && contrarian.total_games > 0) {
    return { bucketName: '0-25%', bucket: contrarian }
  }
  
  return null
}

// Analyze referee stats to find the most public bets
export function findMostPublicBetsFromRefereeStats(
  game: Game,
  refereeStats: RefereeStats
): MostPublicBet[] {
  const bets: MostPublicBet[] = []
  
  // Check moneyline public money
  if (refereeStats.moneyline?.ml?.public_money) {
    const mlPublic = getMostPublicBucket(refereeStats.moneyline.ml.public_money)
    if (mlPublic && mlPublic.bucket.win_pct > 40) { // Only show if decent win rate
      // Determine which team based on bucket performance (simplified approach)
      // In reality, API should tell us which team this bucket represents
      // For now, we'll show both home and away if they have strong public backing
      const publicPct = parseInt(mlPublic.bucketName.split('-')[1]?.replace('%', '') || '75')
      
      bets.push({
        label: `${game.home_team} ML`,
        betsPct: publicPct,
        dollarsPct: publicPct // Approximation - could be refined
      })
    }
  }
  
  // Check spread public money
  if (refereeStats.spread?.spread?.public_money) {
    const spreadPublic = getMostPublicBucket(refereeStats.spread.spread.public_money)
    if (spreadPublic && spreadPublic.bucket.win_pct > 40) {
      const publicPct = parseInt(spreadPublic.bucketName.split('-')[1]?.replace('%', '') || '75')
      const spread = game.odds?.spread || 0
      const spreadLabel = spread > 0 ? `+${spread}` : spread.toString()
      
      bets.push({
        label: `${game.home_team} ${spreadLabel}`,
        betsPct: publicPct,
        dollarsPct: publicPct
      })
    }
  }
  
  // Check over/under public money
  if (refereeStats.over_under?.over_under?.public_money_over) {
    const overPublic = getMostPublicBucket(refereeStats.over_under.over_under.public_money_over)
    if (overPublic && overPublic.bucket.win_pct > 45) {
      const publicPct = parseInt(overPublic.bucketName.split('-')[1]?.replace('%', '') || '75')
      
      bets.push({
        label: `${game.name} Over`,
        betsPct: publicPct,
        dollarsPct: publicPct
      })
    }
  }
  
  if (refereeStats.over_under?.over_under?.public_money_under) {
    const underPublic = getMostPublicBucket(refereeStats.over_under.over_under.public_money_under)
    if (underPublic && underPublic.bucket.win_pct > 45) {
      const publicPct = parseInt(underPublic.bucketName.split('-')[1]?.replace('%', '') || '75')
      
      bets.push({
        label: `${game.name} Under`,
        betsPct: publicPct,
        dollarsPct: publicPct
      })
    }
  }
  
  // Sort by bet percentage and return top results
  return bets.sort((a, b) => b.betsPct - a.betsPct).slice(0, 3)
}

// Find interesting trends from referee stats public money buckets
export function findTopTrendsFromRefereeStats(
  game: Game,
  refereeStats: RefereeStats
): TopTrend[] {
  const trends: TopTrend[] = []
  
  // Look for contrarian/fade plays (0-25% public backing with good ROI)
  if (refereeStats.spread?.spread?.public_money) {
    const contrarian = getContrarianBucket(refereeStats.spread.spread.public_money)
    if (contrarian && contrarian.bucket.roi > 5 && contrarian.bucket.win_pct > 52) {
      const spread = game.odds?.spread || 0
      const spreadLabel = spread > 0 ? `+${spread}` : spread.toString()
      
      trends.push({
        type: 'public-fade',
        label: `${game.away_team} ${spreadLabel}`,
        value: `${contrarian.bucket.roi.toFixed(1)}% ROI (${contrarian.bucket.wins}-${contrarian.bucket.losses})`
      })
    }
  }
  
  // Look for O/U contrarian plays
  if (refereeStats.over_under?.over_under?.public_money_over) {
    const overContrarian = getContrarianBucket(refereeStats.over_under.over_under.public_money_over)
    if (overContrarian && overContrarian.bucket.roi > 5 && overContrarian.bucket.win_pct > 52) {
      trends.push({
        type: 'public-fade',
        label: `${game.name} Over`,
        value: `${overContrarian.bucket.roi.toFixed(1)}% ROI`
      })
    }
  }
  
  if (refereeStats.over_under?.over_under?.public_money_under) {
    const underContrarian = getContrarianBucket(refereeStats.over_under.over_under.public_money_under)
    if (underContrarian && underContrarian.bucket.roi > 5 && underContrarian.bucket.win_pct > 52) {
      trends.push({
        type: 'public-fade',
        label: `${game.name} Under`,
        value: `${underContrarian.bucket.roi.toFixed(1)}% ROI`
      })
    }
  }
  
  // Look for strong referee trends
  if (refereeStats.over_under?.over_under?.over_percentage > 65) {
    trends.push({
      type: 'sharp-money',
      label: `${game.name} Over`,
      value: `Ref ${refereeStats.referee_name?.split(' ').pop()} ${refereeStats.over_under.over_under.over_percentage.toFixed(0)}% O`
    })
  }
  
  if (refereeStats.over_under?.over_under?.under_percentage > 65) {
    trends.push({
      type: 'sharp-money',
      label: `${game.name} Under`,
      value: `Ref ${refereeStats.referee_name?.split(' ').pop()} ${refereeStats.over_under.over_under.under_percentage.toFixed(0)}% U`
    })
  }
  
  // Return top trends
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
