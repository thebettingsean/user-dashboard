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
    if (val === null || val === undefined) return '--'
    return `${Math.round(val)}%`
  }
  
  // Calculate big money stats (difference between money % and bets %)
  const getBigMoneyForMarket = (bets: number | null | undefined, money: number | null | undefined) => {
    if (bets === null || bets === undefined || money === null || money === undefined) return null
    return money - bets
  }
  
  // Most public ML
  const mlAwayBigMoney = getBigMoneyForMarket(pm.public_money_ml_away_bets_pct, pm.public_money_ml_away_stake_pct)
  const mlHomeBigMoney = getBigMoneyForMarket(pm.public_money_ml_home_bets_pct, pm.public_money_ml_home_stake_pct)
  const mostPublicML = 
    (pm.public_money_ml_away_bets_pct ?? 0) > (pm.public_money_ml_home_bets_pct ?? 0)
      ? { team: `${gameData.awayTeam} ML`, bets: pm.public_money_ml_away_bets_pct, money: pm.public_money_ml_away_stake_pct, diff: mlAwayBigMoney }
      : { team: `${gameData.homeTeam} ML`, bets: pm.public_money_ml_home_bets_pct, money: pm.public_money_ml_home_stake_pct, diff: mlHomeBigMoney }
  
  // Most public Spread
  const spreadAwayBigMoney = getBigMoneyForMarket(pm.public_money_spread_away_bets_pct, pm.public_money_spread_away_stake_pct)
  const spreadHomeBigMoney = getBigMoneyForMarket(pm.public_money_spread_home_bets_pct, pm.public_money_spread_home_stake_pct)
  const mostPublicSpread = 
    (pm.public_money_spread_away_bets_pct ?? 0) > (pm.public_money_spread_home_bets_pct ?? 0)
      ? { team: `${gameData.awayTeam} Spread`, bets: pm.public_money_spread_away_bets_pct, money: pm.public_money_spread_away_stake_pct, diff: spreadAwayBigMoney }
      : { team: `${gameData.homeTeam} Spread`, bets: pm.public_money_spread_home_bets_pct, money: pm.public_money_spread_home_stake_pct, diff: spreadHomeBigMoney }
  
  // Most public Total
  const mostPublicTotal = 
    (pm.public_money_over_bets_pct ?? 0) > (pm.public_money_under_bets_pct ?? 0)
      ? { label: 'Over', bets: pm.public_money_over_bets_pct, money: pm.public_money_over_stake_pct, diff: getBigMoneyForMarket(pm.public_money_over_bets_pct, pm.public_money_over_stake_pct) }
      : { label: 'Under', bets: pm.public_money_under_bets_pct, money: pm.public_money_under_stake_pct, diff: getBigMoneyForMarket(pm.public_money_under_bets_pct, pm.public_money_under_stake_pct) }
  
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
  
  return (
    <GameLayout>
      <div className={styles.publicContainer}>
        {/* Most Public ML */}
        <div className={styles.publicSection}>
          <div className={styles.sectionLabel}>Most Public ML</div>
          <div className={styles.publicMetric}>
            <div className={styles.metricLabel}>{mostPublicML.team}</div>
            <div className={styles.metricValues}>
              <span>{formatPct(mostPublicML.bets)} bets</span>
              <span className={styles.metricMoney}>{formatPct(mostPublicML.money)} money</span>
              {mostPublicML.diff !== null && mostPublicML.diff > 0 && (
                <span className={styles.metricDiff}>+{formatPct(mostPublicML.diff)} diff</span>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.divider} />
        
        {/* Most Public Spread */}
        <div className={styles.publicSection}>
          <div className={styles.sectionLabel}>Most Public Spread</div>
          <div className={styles.publicMetric}>
            <div className={styles.metricLabel}>{mostPublicSpread.team}</div>
            <div className={styles.metricValues}>
              <span>{formatPct(mostPublicSpread.bets)} bets</span>
              <span className={styles.metricMoney}>{formatPct(mostPublicSpread.money)} money</span>
              {mostPublicSpread.diff !== null && mostPublicSpread.diff > 0 && (
                <span className={styles.metricDiff}>+{formatPct(mostPublicSpread.diff)} diff</span>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.divider} />
        
        {/* Most Public Total */}
        <div className={styles.publicSection}>
          <div className={styles.sectionLabel}>Most Public Total</div>
          <div className={styles.publicMetric}>
            <div className={styles.metricLabel}>{mostPublicTotal.label}</div>
            <div className={styles.metricValues}>
              <span>{formatPct(mostPublicTotal.bets)} bets</span>
              <span className={styles.metricMoney}>{formatPct(mostPublicTotal.money)} money</span>
              {mostPublicTotal.diff !== null && mostPublicTotal.diff > 0 && (
                <span className={styles.metricDiff}>+{formatPct(mostPublicTotal.diff)} diff</span>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.divider} />
        
        {/* Vegas Backed Section */}
        <div className={styles.publicSection}>
          <div className={styles.sectionTitle}>Vegas Backed</div>
          {rlmStats.length === 0 ? (
            <div className={styles.noDataInline}>None found</div>
          ) : (
            <div className={styles.vegasBackedList}>
              {rlmStats.map((stat, index) => (
                <div key={index} className={styles.publicMetric}>
                  <div className={styles.metricLabel}>{formatBetType(stat.bet_type)}</div>
                  <div className={styles.metricValues}>
                    <span>{formatPct(stat.percentage)} movement</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  )
}
