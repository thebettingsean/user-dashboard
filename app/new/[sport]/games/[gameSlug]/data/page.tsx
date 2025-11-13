'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FaLock } from 'react-icons/fa'
import { GiWhistle, GiHumanTarget } from 'react-icons/gi'
import { LuFileChartColumnIncreasing } from 'react-icons/lu'
import { TbVs } from 'react-icons/tb'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '../../../../../../lib/hooks/useSubscription'
import GameLayout from '../components/GameLayout'
import styles from './dataTab.module.css'

type RefereeStat = {
  label: string
  value: string
}

type PropPlayer = {
  id: string
  playerName: string
  team: string | null
  betTitle: string
  line: string
  hitRate: number | null
  record: string | null
  wins: number | null
  losses: number | null
}

type TeamBettingStat = {
  label: string
  record: string
  roi: string
}

type GameData = {
  gameId: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  referee: any
  teamStats: any
  props: any[]
}

export default function DataTabPage() {
  const params = useParams()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed } = useSubscription()
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  
  const hasAccess = isSubscribed
  const gameSlug = params.gameSlug as string
  const sport = params.sport as string

  const toggleSection = (sectionId: string) => {
    if (!hasAccess) return
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  useEffect(() => {
    async function fetchGameData() {
      try {
        // Fetch game ID from game-hub
        const gamesRes = await fetch(`/api/dashboard/game-hub?sport=${sport}`)
        const gamesData = await gamesRes.json()
        
        const game = gamesData.games?.find((g: any) => {
          const slugParts = gameSlug.split('-')
          return g.awayTeam.toLowerCase().includes(slugParts[0]) || 
                 g.homeTeam.toLowerCase().includes(slugParts[slugParts.length - 2])
        })
        
        if (!game) {
          console.error('Game not found')
          setLoading(false)
          return
        }
        
        setGameData({
          gameId: game.id,
          sport: game.sport,
          awayTeam: game.awayTeam,
          homeTeam: game.homeTeam,
          awayTeamLogo: game.awayTeamLogo,
          homeTeamLogo: game.homeTeamLogo,
          referee: game.referee,
          teamStats: game.teamStats,
          props: game.props || []
        })
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching game data:', error)
        setLoading(false)
      }
    }
    
    fetchGameData()
  }, [gameSlug, sport])

  const handleSignUpPrompt = () => {
    if (!isSignedIn) {
      openSignUp()
    } else {
      window.location.href = '/pricing'
    }
  }

  if (loading) {
    return (
      <GameLayout>
        <div className={styles.loading}>Loading data...</div>
      </GameLayout>
    )
  }

  if (!gameData) {
    return (
      <GameLayout>
        <div className={styles.error}>Game data not found</div>
      </GameLayout>
    )
  }

  // Extract referee stats
  const getRefereeStats = (): { ml: RefereeStat[], spread: RefereeStat[], ou: RefereeStat[], refereeName: string | null } => {
    const ref = gameData.referee
    if (!ref) return { ml: [], spread: [], ou: [], refereeName: null }
    
    const ml: RefereeStat[] = []
    const spread: RefereeStat[] = []
    const ou: RefereeStat[] = []
    
    // ML stats
    if (ref.moneyline?.ml) {
      const data = ref.moneyline.ml
      ml.push(
        { label: 'Away ML ROI', value: `${data.away_ml_roi?.toFixed(2)}%` },
        { label: 'Home ML ROI', value: `${data.home_ml_roi?.toFixed(2)}%` },
        { label: 'Away Favorite', value: `${data.away_favorite_wins}-${data.away_favorite_losses} (${data.away_favorite_net_roi?.toFixed(2)}%)` },
        { label: 'Home Underdog', value: `${data.home_underdog_wins}-${data.home_underdog_losses} (${data.home_underdog_net_roi?.toFixed(2)}%)` }
      )
    }
    
    // Spread stats
    if (ref.spread?.spread) {
      const data = ref.spread.spread
      spread.push(
        { label: 'ATS Overall', value: `${data.ats_wins}-${data.ats_losses} (${data.ats_roi?.toFixed(2)}%)` },
        { label: 'Home Favorite', value: `${data.home_favorite_wins}-${data.home_favorite_losses} (${data.home_favorite_net_roi?.toFixed(2)}%)` },
        { label: 'Away Underdog', value: `${data.away_underdog_wins}-${data.away_underdog_losses} (${data.away_underdog_net_roi?.toFixed(2)}%)` },
        { label: 'Away Favorite', value: `${data.away_favorite_wins}-${data.away_favorite_losses} (${data.away_favorite_net_roi?.toFixed(2)}%)` }
      )
    }
    
    // O/U stats
    if (ref.over_under?.over_under) {
      const data = ref.over_under.over_under
      ou.push(
        { label: 'Over', value: `${data.over_hits} games (${data.over_roi?.toFixed(2)}% ROI)` },
        { label: 'Under', value: `${data.under_hits} games (${data.under_roi?.toFixed(2)}% ROI)` },
        { label: 'Over %', value: `${data.over_percentage?.toFixed(1)}%` },
        { label: 'Under %', value: `${data.under_percentage?.toFixed(1)}%` }
      )
    }
    
    return { ml, spread, ou, refereeName: ref.referee_name || null }
  }

  // Get top 15 props sorted by hit rate
  const getTopProps = (): PropPlayer[] => {
    const allProps: PropPlayer[] = []
    
    gameData.props.forEach((category: any) => {
      if (!Array.isArray(category.players)) return
      
      category.players.forEach((player: any) => {
        const wins = player.record?.hit || 0
        const total = player.record?.total || 0
        const hitRate = total > 0 ? (wins / total) * 100 : null
        
        if (hitRate && hitRate > 0 && total >= 7) {
          allProps.push({
            id: `${player.player_id}-${category.prop_key}`,
            playerName: player.player_name || 'Player',
            team: player.team_id || null,
            betTitle: category.title || 'Prop',
            line: `${player.prop_type === 'over' ? 'O' : player.prop_type === 'under' ? 'U' : ''} ${player.opening_line || ''}`,
            hitRate,
            record: `${wins}-${player.record?.miss || 0}`,
            wins,
            losses: player.record?.miss || null
          })
        }
      })
    })
    
    return allProps
      .sort((a, b) => (b.hitRate || 0) - (a.hitRate || 0))
      .slice(0, 15)
  }

  // Get team betting stats
  const getTeamBettingStats = (): { away: { ml: TeamBettingStat[], spread: TeamBettingStat[], totals: TeamBettingStat[] }, home: { ml: TeamBettingStat[], spread: TeamBettingStat[], totals: TeamBettingStat[] } } => {
    const stats = gameData.teamStats?.h2h_3year?.competitors
    if (!stats) return { away: { ml: [], spread: [], totals: [] }, home: { ml: [], spread: [], totals: [] } }
    
    const formatStat = (label: string, wins: number, losses: number, roi: number): TeamBettingStat => ({
      label,
      record: `${wins}-${losses}`,
      roi: `${roi?.toFixed(2)}%`
    })
    
    // Away team
    const awayML: TeamBettingStat[] = []
    const awaySpread: TeamBettingStat[] = []
    const awayTotals: TeamBettingStat[] = []
    
    if (stats.away) {
      const a = stats.away
      if (a.team_stats?.moneyline) {
        awayML.push(
          formatStat('Overall', a.team_stats.moneyline.wins, a.team_stats.moneyline.losses, a.team_stats.moneyline.roi),
          formatStat('On the road', a.stats_as_away?.moneyline?.wins || 0, a.stats_as_away?.moneyline?.losses || 0, a.stats_as_away?.moneyline?.roi || 0),
          formatStat('As underdog', a.stats_as_underdog?.moneyline?.wins || 0, a.stats_as_underdog?.moneyline?.losses || 0, a.stats_as_underdog?.moneyline?.roi || 0)
        )
      }
      if (a.team_stats?.spread) {
        awaySpread.push(
          formatStat('Overall', a.team_stats.spread.wins, a.team_stats.spread.losses, a.team_stats.spread.roi),
          formatStat('On the road', a.stats_as_away?.spread?.wins || 0, a.stats_as_away?.spread?.losses || 0, a.stats_as_away?.spread?.roi || 0),
          formatStat('As underdog', a.stats_as_underdog?.spread?.wins || 0, a.stats_as_underdog?.spread?.losses || 0, a.stats_as_underdog?.spread?.roi || 0)
        )
      }
      if (a.team_stats?.over_under) {
        awayTotals.push(
          { label: 'Over', record: `${a.team_stats.over_under.over?.total || 0} games`, roi: `${a.team_stats.over_under.over?.roi?.toFixed(2)}%` },
          { label: 'Under', record: `${a.team_stats.over_under.under?.total || 0} games`, roi: `${a.team_stats.over_under.under?.roi?.toFixed(2)}%` }
        )
      }
    }
    
    // Home team
    const homeML: TeamBettingStat[] = []
    const homeSpread: TeamBettingStat[] = []
    const homeTotals: TeamBettingStat[] = []
    
    if (stats.home) {
      const h = stats.home
      if (h.team_stats?.moneyline) {
        homeML.push(
          formatStat('Overall', h.team_stats.moneyline.wins, h.team_stats.moneyline.losses, h.team_stats.moneyline.roi),
          formatStat('At home', h.stats_as_home?.moneyline?.wins || 0, h.stats_as_home?.moneyline?.losses || 0, h.stats_as_home?.moneyline?.roi || 0),
          formatStat('As favorite', h.stats_as_favorite?.moneyline?.wins || 0, h.stats_as_favorite?.moneyline?.losses || 0, h.stats_as_favorite?.moneyline?.roi || 0)
        )
      }
      if (h.team_stats?.spread) {
        homeSpread.push(
          formatStat('Overall', h.team_stats.spread.wins, h.team_stats.spread.losses, h.team_stats.spread.roi),
          formatStat('At home', h.stats_as_home?.spread?.wins || 0, h.stats_as_home?.spread?.losses || 0, h.stats_as_home?.spread?.roi || 0),
          formatStat('As favorite', h.stats_as_favorite?.spread?.wins || 0, h.stats_as_favorite?.spread?.losses || 0, h.stats_as_favorite?.spread?.roi || 0)
        )
      }
      if (h.team_stats?.over_under) {
        homeTotals.push(
          { label: 'Over', record: `${h.team_stats.over_under.over?.total || 0} games`, roi: `${h.team_stats.over_under.over?.roi?.toFixed(2)}%` },
          { label: 'Under', record: `${h.team_stats.over_under.under?.total || 0} games`, roi: `${h.team_stats.over_under.under?.roi?.toFixed(2)}%` }
        )
      }
    }
    
    return {
      away: { ml: awayML, spread: awaySpread, totals: awayTotals },
      home: { ml: homeML, spread: homeSpread, totals: homeTotals }
    }
  }

  const refereeStats = getRefereeStats()
  const topProps = getTopProps()
  const teamBettingStats = getTeamBettingStats()

  return (
    <GameLayout>
      <div className={styles.dataContainer}>
        {/* 1. REFEREE STATS */}
        <div className={styles.accordion}>
          <button
            className={`${styles.accordionHeader} ${styles.refereeHeader} ${expandedSection === 'referee' ? styles.accordionHeaderActive : ''}`}
            onClick={() => toggleSection('referee')}
            disabled={!hasAccess}
          >
            <div className={styles.accordionTitle}>
              <GiWhistle className={styles.accordionIcon} />
              <span>
                {refereeStats.refereeName ? `${refereeStats.refereeName} Impact` : 'No Referee Announced'}
              </span>
            </div>
            <div className={styles.accordionIndicator}>
              <div className={styles.dropdownLine}></div>
            </div>
          </button>
          
          {expandedSection === 'referee' && hasAccess && (
            <div className={`${styles.accordionContent} ${styles.refereeContent}`}>
              {/* Moneylines */}
              <div className={styles.statGroup}>
                <h4 className={styles.statGroupTitle}>MONEYLINES</h4>
                <div className={styles.statDivider}></div>
                {refereeStats.ml.map((stat, i) => (
                  <div key={i} className={styles.statRow}>
                    <span className={styles.statLabel}>{stat.label}</span>
                    <span className={styles.statValue}>{stat.value}</span>
                  </div>
                ))}
              </div>
              
              {/* Spreads */}
              <div className={styles.statGroup}>
                <h4 className={styles.statGroupTitle}>SPREADS</h4>
                <div className={styles.statDivider}></div>
                {refereeStats.spread.map((stat, i) => (
                  <div key={i} className={styles.statRow}>
                    <span className={styles.statLabel}>{stat.label}</span>
                    <span className={styles.statValue}>{stat.value}</span>
                  </div>
                ))}
              </div>
              
              {/* Over/Under */}
              <div className={styles.statGroup}>
                <h4 className={styles.statGroupTitle}>OVER/UNDER</h4>
                <div className={styles.statDivider}></div>
                {refereeStats.ou.map((stat, i) => (
                  <div key={i} className={styles.statRow}>
                    <span className={styles.statLabel}>{stat.label}</span>
                    <span className={styles.statValue}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!hasAccess && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                {!isSignedIn ? 'Sign up to view' : 'Get subscription to view'}
              </button>
            </div>
          )}
        </div>

        {/* 2. TOP PROPS */}
        <div className={styles.accordion}>
          <button
            className={`${styles.accordionHeader} ${expandedSection === 'props' ? styles.accordionHeaderActive : ''}`}
            onClick={() => toggleSection('props')}
            disabled={!hasAccess}
          >
            <div className={styles.accordionTitle}>
              <GiHumanTarget className={styles.accordionIcon} />
              <span>Top Player Props</span>
            </div>
            <div className={styles.accordionIndicator}>
              <div className={styles.dropdownLine}></div>
            </div>
          </button>
          
          {expandedSection === 'props' && hasAccess && (
            <div className={styles.accordionContent}>
              {topProps.length === 0 ? (
                <div className={styles.noData}>No prop data available</div>
              ) : (
                <div className={styles.propsGrid}>
                  {topProps.map((prop) => (
                    <div key={prop.id} className={styles.propCard}>
                      <div className={styles.propHeader}>
                        <span className={styles.propPlayer}>{prop.playerName}</span>
                        <span className={styles.propHitRate}>{prop.hitRate?.toFixed(1)}%</span>
                      </div>
                      <div className={styles.propDetails}>
                        <span className={styles.propBet}>{prop.betTitle} {prop.line}</span>
                        <span className={styles.propRecord}>{prop.record}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!hasAccess && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                {!isSignedIn ? 'Sign up to view' : 'Get subscription to view'}
              </button>
            </div>
          )}
        </div>

        {/* 3. TEAM BETTING STATS */}
        <div className={styles.accordion}>
          <button
            className={`${styles.accordionHeader} ${expandedSection === 'betting' ? styles.accordionHeaderActive : ''}`}
            onClick={() => toggleSection('betting')}
            disabled={!hasAccess}
          >
            <div className={styles.accordionTitle}>
              <LuFileChartColumnIncreasing className={styles.accordionIcon} />
              <span>Team Betting Data</span>
            </div>
            <div className={styles.accordionIndicator}>
              <div className={styles.dropdownLine}></div>
            </div>
          </button>
          
          {expandedSection === 'betting' && hasAccess && (
            <div className={styles.accordionContent}>
              {/* Team Logos */}
              <div className={styles.teamLogos}>
                {gameData.awayTeamLogo && (
                  <img src={gameData.awayTeamLogo} alt={gameData.awayTeam} className={styles.teamLogo} />
                )}
                {gameData.homeTeamLogo && (
                  <img src={gameData.homeTeamLogo} alt={gameData.homeTeam} className={styles.teamLogo} />
                )}
              </div>
              
              {/* Moneylines */}
              <div className={styles.comparisonGroup}>
                <h4 className={styles.comparisonTitle}>MONEYLINES</h4>
                <div className={styles.statDivider}></div>
                <div className={styles.comparisonRow}>
                  <div className={styles.comparisonLeft}>
                    {teamBettingStats.away.ml.map((stat, i) => (
                      <div key={i} className={styles.comparisonStat}>
                        <span className={styles.comparisonLabel}>{stat.label}</span>
                        <span className={styles.comparisonValue}>{stat.record} ({stat.roi})</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.comparisonRight}>
                    {teamBettingStats.home.ml.map((stat, i) => (
                      <div key={i} className={styles.comparisonStat}>
                        <span className={styles.comparisonLabel}>{stat.label}</span>
                        <span className={styles.comparisonValue}>{stat.record} ({stat.roi})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Spreads */}
              <div className={styles.comparisonGroup}>
                <h4 className={styles.comparisonTitle}>SPREADS</h4>
                <div className={styles.statDivider}></div>
                <div className={styles.comparisonRow}>
                  <div className={styles.comparisonLeft}>
                    {teamBettingStats.away.spread.map((stat, i) => (
                      <div key={i} className={styles.comparisonStat}>
                        <span className={styles.comparisonLabel}>{stat.label}</span>
                        <span className={styles.comparisonValue}>{stat.record} ({stat.roi})</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.comparisonRight}>
                    {teamBettingStats.home.spread.map((stat, i) => (
                      <div key={i} className={styles.comparisonStat}>
                        <span className={styles.comparisonLabel}>{stat.label}</span>
                        <span className={styles.comparisonValue}>{stat.record} ({stat.roi})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Totals */}
              <div className={styles.comparisonGroup}>
                <h4 className={styles.comparisonTitle}>TOTALS</h4>
                <div className={styles.statDivider}></div>
                <div className={styles.comparisonRow}>
                  <div className={styles.comparisonLeft}>
                    {teamBettingStats.away.totals.map((stat, i) => (
                      <div key={i} className={styles.comparisonStat}>
                        <span className={styles.comparisonLabel}>{stat.label}</span>
                        <span className={styles.comparisonValue}>{stat.record} ({stat.roi})</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.comparisonRight}>
                    {teamBettingStats.home.totals.map((stat, i) => (
                      <div key={i} className={styles.comparisonStat}>
                        <span className={styles.comparisonLabel}>{stat.label}</span>
                        <span className={styles.comparisonValue}>{stat.record} ({stat.roi})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!hasAccess && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                {!isSignedIn ? 'Sign up to view' : 'Get subscription to view'}
              </button>
            </div>
          )}
        </div>

        {/* 4. TEAM STATS (Placeholder) */}
        <div className={styles.accordion}>
          <button
            className={`${styles.accordionHeader} ${expandedSection === 'stats' ? styles.accordionHeaderActive : ''}`}
            onClick={() => toggleSection('stats')}
            disabled={!hasAccess}
          >
            <div className={styles.accordionTitle}>
              <TbVs className={styles.accordionIcon} />
              <span>Team Stats</span>
            </div>
            <div className={styles.accordionIndicator}>
              <div className={styles.dropdownLine}></div>
            </div>
          </button>
          
          {expandedSection === 'stats' && hasAccess && (
            <div className={styles.accordionContent}>
              <div className={styles.placeholder}>
                <p>TeamRankings data coming soon...</p>
              </div>
            </div>
          )}
          
          {!hasAccess && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                {!isSignedIn ? 'Sign up to view' : 'Get subscription to view'}
              </button>
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  )
}

