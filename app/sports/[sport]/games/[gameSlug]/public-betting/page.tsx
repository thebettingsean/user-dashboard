'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '../../../../../../lib/hooks/useSubscription'
import { FaLock } from 'react-icons/fa'
import GameLayout from '../components/GameLayout'
import styles from './publicTab.module.css'

interface PublicMoneyData {
  public_money_ml_away_bets_pct: number | null
  public_money_ml_away_stake_pct: number | null
  public_money_ml_home_bets_pct: number | null
  public_money_ml_home_stake_pct: number | null
  public_money_spread_away_bets_pct: number | null
  public_money_spread_away_stake_pct: number | null
  public_money_spread_home_bets_pct: number | null
  public_money_spread_home_stake_pct: number | null
  public_money_over_bets_pct: number | null
  public_money_over_stake_pct: number | null
  public_money_under_bets_pct: number | null
  public_money_under_stake_pct: number | null
  rlm_stats?: Array<{
    bet_type?: string
    percentage?: number
    percentage2?: number
    rlm_strength?: number
    line_movement?: number
    rlm_strength_normalized?: number
  }>
}

interface GameData {
  awayTeam: string
  homeTeam: string
  publicMoney: PublicMoneyData | null
}

interface Market {
  id: string
  label: string
  bets: number | null
  stake: number | null
  diff: number | null
}

export default function PublicBettingTabPage() {
  const params = useParams()
  const sport = params.sport as string
  const gameSlug = params.gameSlug as string
  
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed } = useSubscription()
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const hasAccess = isSubscribed
  
  // Fetch game data with public money from game_snapshots
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/dashboard/game-hub?sport=${sport}`)
        const data = await res.json()
        
        const game = data.games?.find((g: any) => {
          const slug = `${g.awayTeam.toLowerCase().replace(/\s+/g, '-')}-at-${g.homeTeam.toLowerCase().replace(/\s+/g, '-')}`
          return gameSlug.startsWith(slug)
        })
        
        if (game) {
          setGameData({
            awayTeam: game.awayTeam,
            homeTeam: game.homeTeam,
            publicMoney: game.publicMoney || null
          })
        }
      } catch (error) {
        console.error('Failed to fetch game data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGameData()
  }, [sport, gameSlug])
  
  if (!hasAccess) {
    return (
      <GameLayout>
        <div className={styles.lockedContainer}>
          <FaLock className={styles.lockIcon} />
          <h3>Public Betting Data Locked</h3>
          <p>
            {!isSignedIn
              ? 'Sign up to view public betting data'
              : 'Get a subscription to view public betting data'}
          </p>
          <button
            className={styles.unlockButton}
            onClick={() => isSignedIn ? window.location.href = '/pricing' : openSignUp()}
          >
            {!isSignedIn ? 'Sign Up' : 'Get Subscription'}
          </button>
        </div>
      </GameLayout>
    )
  }
  
  if (isLoading) {
    return (
      <GameLayout>
        <div className={styles.loading}>Loading public betting data...</div>
      </GameLayout>
    )
  }
  
  if (!gameData || !gameData.publicMoney) {
    return (
      <GameLayout>
        <div className={styles.noData}>
          <p>No public betting data available for this game yet.</p>
        </div>
      </GameLayout>
    )
  }
  
  const pm = gameData.publicMoney
  
  // Helper to format percentages
  const formatPct = (val: number | null | undefined) => {
    if (val === null || val === undefined) return null
    return val
  }
  
  // Helper to safely convert to number
  const toNumber = (val: any): number | null => {
    if (val === null || val === undefined) return null
    const num = typeof val === 'number' ? val : parseFloat(val)
    return isNaN(num) ? null : num
  }
  
  // RLM stats for Vegas Backed - check these FIRST
  const rlmStats = Array.isArray(pm.rlm_stats) ? pm.rlm_stats.filter(Boolean) : []
  
  // Helper to check if a side has RLM
  const hasRlm = (betType: string) => {
    return rlmStats.some((s) => s?.bet_type?.toLowerCase().includes(betType.toLowerCase()))
  }
  
  // Build all markets (prioritize RLM sides, fallback to most public)
  const markets: Market[] = []
  
  // ML Markets
  const mlAwayBets = toNumber(pm.public_money_ml_away_bets_pct)
  const mlAwayStake = toNumber(pm.public_money_ml_away_stake_pct)
  const mlHomeBets = toNumber(pm.public_money_ml_home_bets_pct)
  const mlHomeStake = toNumber(pm.public_money_ml_home_stake_pct)
  
  if (mlAwayBets !== null && mlHomeBets !== null) {
    // Check if either side has RLM
    const awayHasRlm = hasRlm('moneyline_away')
    const homeHasRlm = hasRlm('moneyline_home')
    
    let chosenSide
    if (awayHasRlm) {
      chosenSide = { label: `${gameData.awayTeam} ML`, bets: mlAwayBets, stake: mlAwayStake, id: 'ml_away' }
    } else if (homeHasRlm) {
      chosenSide = { label: `${gameData.homeTeam} ML`, bets: mlHomeBets, stake: mlHomeStake, id: 'ml_home' }
    } else {
      // No RLM - show most public
      const isAwayMostPublic = mlAwayBets > mlHomeBets
      chosenSide = isAwayMostPublic
        ? { label: `${gameData.awayTeam} ML`, bets: mlAwayBets, stake: mlAwayStake, id: 'ml_away' }
        : { label: `${gameData.homeTeam} ML`, bets: mlHomeBets, stake: mlHomeStake, id: 'ml_home' }
    }
    
    const diff = chosenSide.stake !== null && chosenSide.bets !== null 
      ? chosenSide.stake - chosenSide.bets 
      : null
    
    markets.push({
      id: chosenSide.id,
      label: chosenSide.label,
      bets: chosenSide.bets,
      stake: chosenSide.stake,
      diff
    })
  }
  
  // Spread Markets
  const spreadAwayBets = toNumber(pm.public_money_spread_away_bets_pct)
  const spreadAwayStake = toNumber(pm.public_money_spread_away_stake_pct)
  const spreadHomeBets = toNumber(pm.public_money_spread_home_bets_pct)
  const spreadHomeStake = toNumber(pm.public_money_spread_home_stake_pct)
  
  if (spreadAwayBets !== null && spreadHomeBets !== null) {
    // Check if either side has RLM
    const awayHasRlm = hasRlm('spread_away')
    const homeHasRlm = hasRlm('spread_home')
    
    let chosenSide
    if (awayHasRlm) {
      chosenSide = { label: `${gameData.awayTeam} Spread`, bets: spreadAwayBets, stake: spreadAwayStake, id: 'spread_away' }
    } else if (homeHasRlm) {
      chosenSide = { label: `${gameData.homeTeam} Spread`, bets: spreadHomeBets, stake: spreadHomeStake, id: 'spread_home' }
    } else {
      // No RLM - show most public
      const isAwayMostPublic = spreadAwayBets > spreadHomeBets
      chosenSide = isAwayMostPublic
        ? { label: `${gameData.awayTeam} Spread`, bets: spreadAwayBets, stake: spreadAwayStake, id: 'spread_away' }
        : { label: `${gameData.homeTeam} Spread`, bets: spreadHomeBets, stake: spreadHomeStake, id: 'spread_home' }
    }
    
    const diff = chosenSide.stake !== null && chosenSide.bets !== null 
      ? chosenSide.stake - chosenSide.bets 
      : null
    
    markets.push({
      id: chosenSide.id,
      label: chosenSide.label,
      bets: chosenSide.bets,
      stake: chosenSide.stake,
      diff
    })
  }
  
  // Total Markets
  const overBets = toNumber(pm.public_money_over_bets_pct)
  const overStake = toNumber(pm.public_money_over_stake_pct)
  const underBets = toNumber(pm.public_money_under_bets_pct)
  const underStake = toNumber(pm.public_money_under_stake_pct)
  
  if (overBets !== null && underBets !== null) {
    // Check if either side has RLM
    const overHasRlm = hasRlm('over')
    const underHasRlm = hasRlm('under')
    
    let chosenSide
    if (overHasRlm) {
      chosenSide = { label: 'Over', bets: overBets, stake: overStake, id: 'total_over' }
    } else if (underHasRlm) {
      chosenSide = { label: 'Under', bets: underBets, stake: underStake, id: 'total_under' }
    } else {
      // No RLM - show most public
      const isOverMostPublic = overBets > underBets
      chosenSide = isOverMostPublic
        ? { label: 'Over', bets: overBets, stake: overStake, id: 'total_over' }
        : { label: 'Under', bets: underBets, stake: underStake, id: 'total_under' }
    }
    
    const diff = chosenSide.stake !== null && chosenSide.bets !== null 
      ? chosenSide.stake - chosenSide.bets 
      : null
    
    markets.push({
      id: chosenSide.id,
      label: chosenSide.label,
      bets: chosenSide.bets,
      stake: chosenSide.stake,
      diff
    })
  }
  
  // Format RLM labels with team names
  const formatRlmLabel = (betType: string | undefined) => {
    if (!betType) return 'Unknown'
    const lower = betType.toLowerCase()
    
    // Moneylines
    if (lower.includes('moneyline_home') || lower === 'ml_home') {
      return `${gameData.homeTeam} ML`
    }
    if (lower.includes('moneyline_away') || lower === 'ml_away') {
      return `${gameData.awayTeam} ML`
    }
    
    // Spreads
    if (lower.includes('spread_home')) {
      return `${gameData.homeTeam} Spread`
    }
    if (lower.includes('spread_away')) {
      return `${gameData.awayTeam} Spread`
    }
    
    // Totals (if they ever show up)
    if (lower.includes('over')) return 'Over'
    if (lower.includes('under')) return 'Under'
    
    return betType
  }
  
  // Get RLM strength label
  const getRlmStrength = (normalized: number | undefined) => {
    if (!normalized) return ''
    if (normalized >= 1.0) return 'Strong'
    if (normalized >= 0.5) return 'Moderate'
    return 'Weak'
  }
  
  const formatPercentage = (val: number | null) => {
    if (val === null) return '--'
    return `${Math.round(val)}%`
  }
  
  // Get RLM data for a specific market
  const getRlmForMarket = (marketId: string) => {
    let betTypeToMatch = ''
    if (marketId.includes('ml_away')) betTypeToMatch = 'moneyline_away'
    else if (marketId.includes('ml_home')) betTypeToMatch = 'moneyline_home'
    else if (marketId.includes('spread_away')) betTypeToMatch = 'spread_away'
    else if (marketId.includes('spread_home')) betTypeToMatch = 'spread_home'
    else if (marketId.includes('over')) betTypeToMatch = 'over'
    else if (marketId.includes('under')) betTypeToMatch = 'under'
    
    const stat = rlmStats.find((s) => s.bet_type?.toLowerCase().includes(betTypeToMatch.toLowerCase()))
    return {
      value: toNumber(stat?.percentage || (stat as any)?.percentage2),
      lineMovement: toNumber(stat?.line_movement)
    }
  }
  
  return (
    <GameLayout>
      <div className={styles.publicContainer}>
        {markets.map((market) => {
          const rlm = getRlmForMarket(market.id)
          
          return (
            <div key={market.id} className={styles.marketCard}>
              {/* Market Label + Line Movement Badge */}
              <div className={styles.marketHeader}>
                <span className={styles.marketLabel}>{market.label}</span>
                {rlm.lineMovement !== null && (
                  <span className={styles.lineMovementBadge}>
                    {rlm.lineMovement > 0 ? '-' : '+'}{Math.abs(rlm.lineMovement).toFixed(1)}
                  </span>
                )}
              </div>
              
              {/* Bets | Money | Diff */}
              <div className={styles.marketStats}>
                <span>{formatPercentage(market.bets)} bets</span>
                <span className={styles.moneyText}>{formatPercentage(market.stake)} money</span>
                {market.diff !== null && (
                  <span className={market.diff >= 0 ? styles.diffPositive : styles.diffNegative}>
                    {market.diff >= 0 ? '+' : ''}{Math.round(market.diff * 10) / 10}% diff
                  </span>
                )}
              </div>
              
              {/* Progress Bar for Public Bets */}
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${Math.min(100, Math.max(0, market.bets ?? 0))}%` }}
                />
              </div>
              
              {/* Vegas Backed Label */}
              <div className={styles.vegasBackedLabel}>Vegas Backed</div>
              
              {/* Vegas Backed Value */}
              <div className={styles.vegasBackedValue}>
                {rlm.value !== null && rlm.value > 0 ? `${Math.round(rlm.value)}% value` : 'No value'}
              </div>
              
              {/* Progress Bar for Vegas Backed */}
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBarFillVegas}
                  style={{ width: `${Math.min(100, Math.max(0, rlm.value ?? 0))}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </GameLayout>
  )
}
