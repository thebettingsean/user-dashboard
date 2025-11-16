'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FaLock, FaChevronDown } from 'react-icons/fa'
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
  headshot?: string // Player headshot image URL
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
  spread: { awayLine: number | null, homeLine: number | null } | null
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
          spread: game.spread || null,
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

  // Extract referee stats (home team focused, based on favorite/underdog status)
  const getRefereeStats = (): { 
    ml: RefereeStat[], 
    spread: RefereeStat[], 
    ou: RefereeStat[], 
    refereeName: string | null,
    totalGames: number | null
  } => {
    const ref = gameData.referee
    if (!ref) return { ml: [], spread: [], ou: [], refereeName: null, totalGames: null }
    
    const ml: RefereeStat[] = []
    const spread: RefereeStat[] = []
    const ou: RefereeStat[] = []
    
    // Determine if home team is favorite or underdog based on current game spread
    const homeSpread = gameData.spread?.homeLine || 0
    const isHomeFavorite = homeSpread < -0.5
    const isHomeUnderdog = homeSpread > 0.5
    
    // ML stats
    if (ref.moneyline?.ml) {
      const data = ref.moneyline.ml
      
      // Home ML overall
      ml.push({
        label: 'Home ML',
        value: `${data.home_ml_wins}-${data.home_ml_losses} (${data.home_ml_roi?.toFixed(2)}%)`
      })
      
      // Home Fav or Dog
      if (isHomeFavorite) {
        ml.push({
          label: 'Home Fav ML',
          value: `${data.home_favorite_wins}-${data.home_favorite_losses} (${data.home_favorite_net_roi?.toFixed(2)}%)`
        })
      } else if (isHomeUnderdog) {
        ml.push({
          label: 'Home Dog ML',
          value: `${data.home_underdog_wins}-${data.home_underdog_losses} (${data.home_underdog_net_roi?.toFixed(2)}%)`
        })
      }
      
      // ML Range
      if (ref.moneyline?.ml_range) {
        const range = ref.moneyline.ml_range
        const rangeLabel = isHomeFavorite ? range.home_ml_range : range.home_ml_range
        const rangeRoi = isHomeFavorite ? range.home_ml_range_roi : range.home_ml_range_roi
        const rangeWins = isHomeFavorite ? range.home_ml_range_wins : range.home_ml_range_wins
        const rangeLosses = isHomeFavorite ? range.home_ml_range_losses : range.home_ml_range_losses
        
        if (rangeLabel) {
          ml.push({
            label: `Between ${rangeLabel}`,
            value: `${rangeWins}-${rangeLosses} (${rangeRoi?.toFixed(2)}%)`
          })
        }
      }
    }
    
    // Spread stats
    if (ref.spread?.spread) {
      const data = ref.spread.spread
      
      // Home ATS overall (using total from data)
      spread.push({
        label: 'Home ATS',
        value: `${data.ats_wins}-${data.ats_losses} (${data.ats_roi?.toFixed(2)}%)`
      })
      
      // Home Fav or Dog
      if (isHomeFavorite) {
        spread.push({
          label: 'Home Fav ATS',
          value: `${data.home_favorite_wins}-${data.home_favorite_losses} (${data.home_favorite_net_roi?.toFixed(2)}%)`
        })
      } else if (isHomeUnderdog) {
        spread.push({
          label: 'Home Dog ATS',
          value: `${data.home_underdog_wins}-${data.home_underdog_losses} (${data.home_underdog_net_roi?.toFixed(2)}%)`
        })
      }
      
      // Spread Range
      if (ref.spread?.spread_range) {
        const range = ref.spread.spread_range
        const rangeLabel = isHomeFavorite ? range.home_spread_range : range.home_spread_range
        const rangeRoi = isHomeFavorite ? range.home_spread_range_roi : range.home_spread_range_roi
        const rangeWins = isHomeFavorite ? range.home_spread_range_wins : range.home_spread_range_wins
        const rangeLosses = isHomeFavorite ? range.home_spread_range_losses : range.home_spread_range_losses
        
        if (rangeLabel) {
          spread.push({
            label: `Between ${rangeLabel}`,
            value: `${rangeWins}-${rangeLosses} (${rangeRoi?.toFixed(2)}%)`
          })
        }
      }
    }
    
    // O/U stats (Overs only)
    if (ref.over_under?.over_under) {
      const data = ref.over_under.over_under
      
      // Overall O-U record
      ou.push({
        label: 'O-U Record',
        value: `${data.over_hits}-${data.under_hits} (${data.over_roi?.toFixed(2)}%)`
      })
      
      // If home favorite
      if (isHomeFavorite && data.home_favorite) {
        ou.push({
          label: 'If Home Fav',
          value: `${data.home_favorite.wins}-${data.home_favorite.losses} (${data.home_favorite.roi?.toFixed(2)}%)`
        })
      } else if (isHomeUnderdog && data.home_underdog) {
        ou.push({
          label: 'If Home Dog',
          value: `${data.home_underdog.wins}-${data.home_underdog.losses} (${data.home_underdog.roi?.toFixed(2)}%)`
        })
      }
      
      // O/U Range
      if (ref.over_under?.over_under_range) {
        const range = ref.over_under.over_under_range
        ou.push({
          label: `Between ${range.ou_range}`,
          value: `${range.ou_range_wins}-${range.ou_range_losses} (${range.ou_range_roi?.toFixed(2)}%)`
        })
      }
    }
    
    return { 
      ml, 
      spread, 
      ou, 
      refereeName: ref.referee_name || null,
      totalGames: ref.total_games || null
    }
  }

  // Get top 15 props sorted by hit rate
  const getTopProps = (): PropPlayer[] => {
    const allProps: PropPlayer[] = []
    
    // Defensive prop keywords to filter out (for NFL)
    const defensiveProps = ['sacks', 'tackles', 'tackles + assists', 'solo tackles', 'combined tackles', 'interceptions']
    
    gameData.props.forEach((category: any) => {
      if (!Array.isArray(category.players)) return
      
      // Skip defensive categories for NFL
      if (sport === 'nfl') {
        const categoryTitle = (category.title || '').toLowerCase()
        if (defensiveProps.some(def => categoryTitle.includes(def))) {
          return
        }
      }
      
      category.players.forEach((player: any) => {
        const wins = player.record?.hit || 0
        const total = player.record?.total || 0
        const hitRate = total > 0 ? (wins / total) * 100 : null
        
        // Only include props with:
        // 1. Valid hit rate and minimum games
        // 2. Player has a headshot image
        if (hitRate && hitRate > 0 && total >= 7 && player.headshot) {
          allProps.push({
            id: `${player.player_id}-${category.prop_key}`,
            playerName: player.player_name || 'Player',
            team: player.team_id || null,
            betTitle: category.title || 'Prop',
            line: `${player.prop_type === 'over' ? 'O' : player.prop_type === 'under' ? 'U' : ''} ${player.opening_line || ''}`,
            hitRate,
            record: `${wins}-${player.record?.miss || 0}`,
            wins,
            losses: player.record?.miss || null,
            headshot: player.headshot // Add headshot URL
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
          >
            <GiWhistle className={styles.accordionIcon} />
            <span className={styles.accordionText}>
              {refereeStats.refereeName ? `${refereeStats.refereeName} Impact` : 'No Referee Announced'}
            </span>
            <FaChevronDown className={`${styles.chevronIcon} ${expandedSection === 'referee' ? styles.chevronIconRotated : ''}`} />
          </button>
          
          {expandedSection === 'referee' && hasAccess && (
            <div className={`${styles.accordionContent} ${styles.refereeContent}`}>
              {/* Metadata */}
              {refereeStats.totalGames && (
                <div className={styles.refereeMetadata}>
                  <div className={styles.refereeMetadataItem}>
                    Total games: <strong>{refereeStats.totalGames}</strong>
                  </div>
                  <div className={styles.refereeMetadataItem}>
                    Time: <strong>L6 years</strong>
                  </div>
                </div>
              )}
              
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
              
              {/* Over-Unders */}
              <div className={styles.statGroup}>
                <h4 className={styles.statGroupTitle}>OVER-UNDERS</h4>
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
          
          {!hasAccess && expandedSection === 'referee' && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <p className={styles.lockTagline}>Sign up to view referee data for this game</p>
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                Sign Up Free
              </button>
            </div>
          )}
        </div>

        {/* 2. TOP PROPS */}
        <div className={styles.accordion}>
          <button
            className={`${styles.accordionHeader} ${expandedSection === 'props' ? styles.accordionHeaderActive : ''}`}
            onClick={() => toggleSection('props')}
          >
            <GiHumanTarget className={styles.accordionIcon} />
            <span className={styles.accordionText}>Top Player Props</span>
            <FaChevronDown className={`${styles.chevronIcon} ${expandedSection === 'props' ? styles.chevronIconRotated : ''}`} />
          </button>
          
          {expandedSection === 'props' && hasAccess && (
            <div className={styles.accordionContent}>
              {topProps.length === 0 ? (
                <div className={styles.noData}>No prop data available</div>
              ) : (
                <div className={styles.propsGrid}>
                  {topProps.map((prop) => (
                    <div key={prop.id} className={styles.propCard}>
                      {/* Player Image */}
                      {prop.headshot && (
                        <img 
                          src={prop.headshot} 
                          alt={prop.playerName}
                          className={styles.propHeadshot}
                        />
                      )}
                      
                      {/* Player Info */}
                      <div className={styles.propInfo}>
                        <div className={styles.propHeader}>
                          <span className={styles.propPlayer}>{prop.playerName}</span>
                          <span className={styles.propHitRate}>{prop.hitRate?.toFixed(1)}%</span>
                        </div>
                        <div className={styles.propDetails}>
                          <span className={styles.propBet}>{prop.betTitle} {prop.line}</span>
                          <span className={styles.propRecord}>{prop.record}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!hasAccess && expandedSection === 'props' && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <p className={styles.lockTagline}>Sign up to view player props for this game</p>
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                Sign Up Free
              </button>
            </div>
          )}
        </div>

        {/* 3. TEAM BETTING STATS */}
        <div className={styles.accordion}>
          <button
            className={`${styles.accordionHeader} ${expandedSection === 'betting' ? styles.accordionHeaderActive : ''}`}
            onClick={() => toggleSection('betting')}
          >
            <LuFileChartColumnIncreasing className={styles.accordionIcon} />
            <span className={styles.accordionText}>Team Betting Data</span>
            <FaChevronDown className={`${styles.chevronIcon} ${expandedSection === 'betting' ? styles.chevronIconRotated : ''}`} />
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
          
          {!hasAccess && expandedSection === 'betting' && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <p className={styles.lockTagline}>Sign up to view betting trends for this game</p>
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                Sign Up Free
              </button>
            </div>
          )}
        </div>

        {/* 4. TEAM STATS (Placeholder) */}
        <div className={styles.accordion}>
          <button
            className={`${styles.accordionHeader} ${expandedSection === 'stats' ? styles.accordionHeaderActive : ''}`}
            onClick={() => toggleSection('stats')}
          >
            <TbVs className={styles.accordionIcon} />
            <span className={styles.accordionText}>Team Stats</span>
            <FaChevronDown className={`${styles.chevronIcon} ${expandedSection === 'stats' ? styles.chevronIconRotated : ''}`} />
          </button>
          
          {expandedSection === 'stats' && hasAccess && (
            <div className={styles.accordionContent}>
              <div className={styles.placeholder}>
                <p>TeamRankings data coming soon...</p>
              </div>
            </div>
          )}
          
          {!hasAccess && expandedSection === 'stats' && (
            <div className={styles.lockOverlay}>
              <FaLock className={styles.lockIcon} />
              <p className={styles.lockTagline}>Sign up to view team stats for this game</p>
              <button onClick={handleSignUpPrompt} className={styles.lockButton}>
                Sign Up Free
              </button>
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  )
}

