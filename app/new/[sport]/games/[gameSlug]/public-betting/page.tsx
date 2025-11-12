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
  
  // Build all markets (showing MOST PUBLIC side for each)
  const markets: Market[] = []
  
  // ML Markets
  const mlAwayBets = toNumber(pm.public_money_ml_away_bets_pct)
  const mlAwayStake = toNumber(pm.public_money_ml_away_stake_pct)
  const mlHomeBets = toNumber(pm.public_money_ml_home_bets_pct)
  const mlHomeStake = toNumber(pm.public_money_ml_home_stake_pct)
  
  if (mlAwayBets !== null && mlHomeBets !== null) {
    const mostPublicML = mlAwayBets > mlHomeBets
      ? { label: `${gameData.awayTeam} ML`, bets: mlAwayBets, stake: mlAwayStake }
      : { label: `${gameData.homeTeam} ML`, bets: mlHomeBets, stake: mlHomeStake }
    
    const diff = mostPublicML.stake !== null && mostPublicML.bets !== null 
      ? mostPublicML.stake - mostPublicML.bets 
      : null
    
    markets.push({
      id: 'ml',
      label: mostPublicML.label,
      bets: mostPublicML.bets,
      stake: mostPublicML.stake,
      diff
    })
  }
  
  // Spread Markets
  const spreadAwayBets = toNumber(pm.public_money_spread_away_bets_pct)
  const spreadAwayStake = toNumber(pm.public_money_spread_away_stake_pct)
  const spreadHomeBets = toNumber(pm.public_money_spread_home_bets_pct)
  const spreadHomeStake = toNumber(pm.public_money_spread_home_stake_pct)
  
  if (spreadAwayBets !== null && spreadHomeBets !== null) {
    const mostPublicSpread = spreadAwayBets > spreadHomeBets
      ? { label: `${gameData.awayTeam} Spread`, bets: spreadAwayBets, stake: spreadAwayStake }
      : { label: `${gameData.homeTeam} Spread`, bets: spreadHomeBets, stake: spreadHomeStake }
    
    const diff = mostPublicSpread.stake !== null && mostPublicSpread.bets !== null 
      ? mostPublicSpread.stake - mostPublicSpread.bets 
      : null
    
    markets.push({
      id: 'spread',
      label: mostPublicSpread.label,
      bets: mostPublicSpread.bets,
      stake: mostPublicSpread.stake,
      diff
    })
  }
  
  // Total Markets
  const overBets = toNumber(pm.public_money_over_bets_pct)
  const overStake = toNumber(pm.public_money_over_stake_pct)
  const underBets = toNumber(pm.public_money_under_bets_pct)
  const underStake = toNumber(pm.public_money_under_stake_pct)
  
  if (overBets !== null && underBets !== null) {
    const mostPublicTotal = overBets > underBets
      ? { label: 'Over', bets: overBets, stake: overStake }
      : { label: 'Under', bets: underBets, stake: underStake }
    
    const diff = mostPublicTotal.stake !== null && mostPublicTotal.bets !== null 
      ? mostPublicTotal.stake - mostPublicTotal.bets 
      : null
    
    markets.push({
      id: 'total',
      label: mostPublicTotal.label,
      bets: mostPublicTotal.bets,
      stake: mostPublicTotal.stake,
      diff
    })
  }
  
  // RLM stats for Vegas Backed
  const rlmStats = Array.isArray(pm.rlm_stats) ? pm.rlm_stats.filter(Boolean) : []
  
  // Format bet type labels
  const formatBetType = (betType: string | undefined) => {
    if (!betType) return 'Unknown'
    if (betType.toLowerCase().includes('spread')) return 'Spread'
    if (betType.toLowerCase().includes('moneyline') || betType.toLowerCase().includes('ml')) return 'Moneyline'
    if (betType.toLowerCase().includes('total') || betType.toLowerCase().includes('over') || betType.toLowerCase().includes('under')) return 'Total'
    return betType
  }
  
  const formatPercentage = (val: number | null) => {
    if (val === null) return '--'
    return `${Math.round(val)}%`
  }
  
  return (
    <GameLayout>
      <div className={styles.publicContainer}>
        {/* Big Money Markets */}
        <div className={styles.publicMetrics}>
          {markets.map((market) => (
            <div key={market.id} className={styles.publicMetric}>
              <div className={styles.publicMetricLabel}>{market.label}</div>
              <div className={styles.publicMetricValues}>
                <span>{formatPercentage(market.bets)} bets</span>
                <span className={styles.publicStake}>{formatPercentage(market.stake)} money</span>
                {market.diff !== null && (
                  <span className={market.diff >= 0 ? styles.publicDiff : styles.publicDiffNegative}>
                    {market.diff >= 0 ? '+' : ''}{Math.round(market.diff * 10) / 10}% diff
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Vegas Backed Section */}
        {rlmStats.length > 0 && (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.vegasBackedSection}>
              <div className={styles.sectionTitle}>Vegas Backed</div>
              <div className={styles.publicMetrics}>
                {rlmStats.map((stat, index) => (
                  <div key={index} className={styles.publicMetric}>
                    <div className={styles.publicMetricLabel}>{formatBetType(stat.bet_type)}</div>
                    <div className={styles.publicMetricValues}>
                      <span>{formatPercentage(toNumber(stat.percentage))} movement</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {rlmStats.length === 0 && (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.vegasBackedSection}>
              <div className={styles.sectionTitle}>Vegas Backed</div>
              <div className={styles.noDataInline}>None found</div>
            </div>
          </>
        )}
      </div>
    </GameLayout>
  )
}
