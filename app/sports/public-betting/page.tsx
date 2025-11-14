'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '@/lib/hooks/useSubscription'
import styles from '../sportSelector.module.css'
import { PiMoneyWavy } from 'react-icons/pi'
import { FaDice, FaLock } from 'react-icons/fa'
import { LuArrowBigUpDash } from 'react-icons/lu'

type SharpStat = {
  bet_type?: string
  sharpness_level?: string
  stake_pct?: number
}

type RlmStat = {
  bet_type?: string
  percentage?: number
  percentage2?: number
  rlm_strength?: number
  line_movement?: number
  rlm_strength_normalized?: number
}

type PublicMoneySummary = {
  public_money_ml_away_bets_pct?: number | null
  public_money_ml_away_stake_pct?: number | null
  public_money_ml_home_bets_pct?: number | null
  public_money_ml_home_stake_pct?: number | null
  public_money_spread_away_bets_pct?: number | null
  public_money_spread_away_stake_pct?: number | null
  public_money_spread_home_bets_pct?: number | null
  public_money_spread_home_stake_pct?: number | null
  public_money_over_bets_pct?: number | null
  public_money_over_stake_pct?: number | null
  public_money_under_bets_pct?: number | null
  public_money_under_stake_pct?: number | null
  sharp_money_stats?: SharpStat[]
  rlm_stats?: RlmStat[]
  away_team_ml?: number | null
  home_team_ml?: number | null
  away_team_point_spread?: number | null
  home_team_point_spread?: number | null
}

type PublicGame = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  publicMoney: PublicMoneySummary | null
}

type SportPublic = {
  sport: string
  sportLabel: string
  sportLogo: string
  games: PublicGame[]
}

const sportOptions = [
  { id: 'nfl', label: 'NFL', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg' },
  { id: 'nba', label: 'NBA', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg' },
  { id: 'nhl', label: 'NHL', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg' }
]

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function formatPercentage(value: number | null | undefined) {
  const numeric = toNumber(value)
  if (numeric === null) return '--'
  return `${Math.round(numeric)}%`
}

function formatBetTypeLabel(betType: string | undefined, awayTeam: string, homeTeam: string) {
  if (!betType) return 'Market'
  switch (betType) {
    case 'moneyline_home':
      return `${homeTeam} ML`
    case 'moneyline_away':
      return `${awayTeam} ML`
    case 'spread_home':
      return `${homeTeam} Spread`
    case 'spread_away':
      return `${awayTeam} Spread`
    case 'over':
      return 'Over'
    case 'under':
      return 'Under'
    default:
      return betType.replace(/_/g, ' ')
  }
}

function formatPublicCardDate(isoString: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  }).format(date)
}

export default function AllSportsPublicPage() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { hasAccess } = useSubscription()
  
  const [sportsPublic, setSportsPublic] = useState<SportPublic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'most' | 'vegas' | 'sharp'>('most')

  useEffect(() => {
    async function fetchAllPublic() {
      setIsLoading(true)
      try {
        const promises = sportOptions.map(async (sport) => {
          try {
            const response = await fetch(`/api/dashboard/game-hub?sport=${sport.id}`, {
              cache: 'no-store'
            })
            
            if (!response.ok) throw new Error(`Failed to fetch ${sport.id}`)
            
            const data = await response.json()
            const games = data.games || []
            
            // Get games with public money data
            const gamesWithPublic = games
              .filter((g: any) => g.publicMoney)
              .map((g: any) => ({
                id: g.id,
                sport: sport.id,
                awayTeam: g.awayTeam,
                homeTeam: g.homeTeam,
                awayTeamLogo: g.awayTeamLogo,
                homeTeamLogo: g.homeTeamLogo,
                kickoff: g.kickoff,
                kickoffLabel: g.kickoffLabel,
                publicMoney: g.publicMoney
              }))
            
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              games: gamesWithPublic.slice(0, 3) // Top 3 per sport
            }
          } catch (error) {
            console.error(`Error fetching ${sport.id}:`, error)
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              games: []
            }
          }
        })
        
        const results = await Promise.all(promises)
        // Only show sports that have public data
        setSportsPublic(results.filter(s => s.games.length > 0))
      } catch (error) {
        console.error('Error fetching all public data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAllPublic()
  }, [])

  const getPublicMarkets = (game: PublicGame) => {
    const pm = game.publicMoney
    if (!pm) return []

    const rlmStats = Array.isArray(pm.rlm_stats) ? pm.rlm_stats.filter(Boolean) : []
    const getRlmForBetType = (betType: string) => {
      const stat = rlmStats.find((s) => s?.bet_type?.toLowerCase().includes(betType.toLowerCase()))
      return stat?.line_movement !== undefined && stat?.line_movement !== null ? toNumber(stat.line_movement) : null
    }

    const markets = [
      {
        id: 'ml_away',
        label: `${game.awayTeam} ML`,
        bets: toNumber(pm.public_money_ml_away_bets_pct),
        stake: toNumber(pm.public_money_ml_away_stake_pct),
        lineMovement: getRlmForBetType('moneyline_away')
      },
      {
        id: 'ml_home',
        label: `${game.homeTeam} ML`,
        bets: toNumber(pm.public_money_ml_home_bets_pct),
        stake: toNumber(pm.public_money_ml_home_stake_pct),
        lineMovement: getRlmForBetType('moneyline_home')
      },
      {
        id: 'spread_away',
        label: `${game.awayTeam} Spread`,
        bets: toNumber(pm.public_money_spread_away_bets_pct),
        stake: toNumber(pm.public_money_spread_away_stake_pct),
        lineMovement: getRlmForBetType('spread_away')
      },
      {
        id: 'spread_home',
        label: `${game.homeTeam} Spread`,
        bets: toNumber(pm.public_money_spread_home_bets_pct),
        stake: toNumber(pm.public_money_spread_home_stake_pct),
        lineMovement: getRlmForBetType('spread_home')
      },
      {
        id: 'total_over',
        label: 'Over',
        bets: toNumber(pm.public_money_over_bets_pct),
        stake: toNumber(pm.public_money_over_stake_pct),
        lineMovement: getRlmForBetType('over')
      },
      {
        id: 'total_under',
        label: 'Under',
        bets: toNumber(pm.public_money_under_bets_pct),
        stake: toNumber(pm.public_money_under_stake_pct),
        lineMovement: getRlmForBetType('under')
      }
    ]

    return markets.filter((entry) => entry.bets !== null)
  }

  const getTopPublicMarkets = (game: PublicGame, limit = 3) => {
    return getPublicMarkets(game)
      .sort((a, b) => (b.bets ?? -Infinity) - (a.bets ?? -Infinity))
      .slice(0, limit)
  }

  const getRlmStats = (pm: PublicMoneySummary | null | undefined) => {
    if (!pm || !Array.isArray(pm.rlm_stats)) return []
    return pm.rlm_stats.filter(Boolean)
  }

  const getBigMoneyStats = (game: PublicGame) => {
    return getPublicMarkets(game)
      .map((market) => {
        const bets = toNumber(market.bets)
        const stake = toNumber(market.stake)
        const diff = stake !== null && bets !== null ? stake - bets : null
        return {
          id: market.id,
          label: market.label,
          bets,
          stake,
          diff
        }
      })
      .filter((entry) => entry.diff !== null && entry.diff > 0)
      .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
  }

  const renderGameCard = (game: PublicGame) => {
    const pm = game.publicMoney
    const rlmStats = getRlmStats(pm)
    const mostMarkets = getTopPublicMarkets(game, 3)
    const bigMoney = getBigMoneyStats(game)

    return (
      <div 
        key={game.id}
        style={{
          position: 'relative',
          background: 'rgba(15, 23, 42, 0.88)',
          borderRadius: '18px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Game header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div>
            {/* Logos in a row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {game.awayTeamLogo && (
                <img src={game.awayTeamLogo} alt={game.awayTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              )}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>@</span>
              {game.homeTeamLogo && (
                <img src={game.homeTeamLogo} alt={game.homeTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              )}
            </div>
            {/* Timestamp */}
            <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.65)' }}>
              {formatPublicCardDate(game.kickoff)}
            </div>
          </div>
          {/* Filter icon */}
          <div style={{ 
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: activeView === 'sharp' ? '1.5rem' : '1.25rem',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            {activeView === 'most' && <PiMoneyWavy />}
            {activeView === 'vegas' && <FaDice />}
            {activeView === 'sharp' && <LuArrowBigUpDash />}
          </div>
        </div>

        {/* Betting data */}
        <div style={{ position: 'relative' }}>
          <div style={!hasAccess ? { filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' } : {}}>
            {activeView === 'most' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {mostMarkets.map((market) => (
                  <div key={market.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'rgba(226, 232, 240, 0.85)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {market.label}
                      {market.lineMovement !== null && (
                        <span style={{
                          fontSize: '10px',
                          background: 'rgba(251, 146, 60, 0.15)',
                          border: '1px solid rgba(251, 146, 60, 0.3)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          color: '#fb923c'
                        }}>
                          {market.lineMovement > 0 ? '-' : '+'}{Math.abs(market.lineMovement).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      fontSize: '11px',
                      color: 'rgba(226, 232, 240, 0.7)'
                    }}>
                      <span>{formatPercentage(market.bets)} bets</span>
                      {market.stake !== null && (
                        <span style={{ color: 'rgba(129, 231, 255, 0.95)' }}>
                          {formatPercentage(market.stake)} money
                        </span>
                      )}
                    </div>
                    <div style={{
                      height: '6px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.25)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #22d3ee, #6366f1)',
                        width: `${Math.min(100, Math.max(0, market.bets ?? 0))}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeView === 'vegas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rlmStats.slice(0, 3).map((stat, index) => {
                  const rlmValue = toNumber(stat.percentage || (stat as any).percentage2)
                  const lineMove = toNumber(stat.line_movement)
                  
                  return (
                    <div key={`${game.id}-rlm-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'rgba(226, 232, 240, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {formatBetTypeLabel(stat.bet_type as string | undefined, game.awayTeam, game.homeTeam)}
                        {lineMove !== null && (
                          <span style={{
                            fontSize: '10px',
                            background: 'rgba(251, 146, 60, 0.15)',
                            border: '1px solid rgba(251, 146, 60, 0.3)',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            color: '#fb923c'
                          }}>
                            {lineMove > 0 ? '-' : '+'}{Math.abs(lineMove).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '11px',
                        color: 'rgba(226, 232, 240, 0.7)'
                      }}>
                        <span>{Math.round(rlmValue ?? 0)}% value</span>
                      </div>
                      <div style={{
                        height: '6px',
                        borderRadius: '999px',
                        background: 'rgba(148, 163, 184, 0.25)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #22d3ee, #6366f1)',
                          width: `${Math.min(100, Math.max(0, rlmValue ?? 0))}%`
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeView === 'sharp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bigMoney.slice(0, 3).map((stat) => (
                  <div key={`${game.id}-big-${stat.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'rgba(226, 232, 240, 0.85)'
                    }}>
                      {stat.label}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      fontSize: '11px',
                      color: 'rgba(226, 232, 240, 0.7)'
                    }}>
                      <span>{formatPercentage(stat.bets)} bets</span>
                      <span style={{ color: 'rgba(129, 231, 255, 0.95)' }}>
                        {formatPercentage(stat.stake)} money
                      </span>
                      <span style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase' }}>
                        +{Math.round((stat.diff ?? 0) * 10) / 10}% diff
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Lock overlay */}
          {!hasAccess && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'rgba(10, 15, 26, 0.5)',
              backdropFilter: 'blur(2px)',
              cursor: !isSignedIn ? 'pointer' : 'default',
              zIndex: 1
            }}
            onClick={() => !isSignedIn && openSignUp()}
            >
              <FaLock style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.7)' }} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                {!isSignedIn ? 'Sign up to view' : 'Get sub to view'}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.page} allSportsPublicPage`}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => router.push('/sports')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Back to Sports
          </button>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: 0
          }}>
            Public Betting
          </h1>
          <div style={{ width: '100px' }} />
        </div>

        {/* View Filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'most' as const, label: 'Most Public' },
            { id: 'vegas' as const, label: 'Vegas Backed' },
            { id: 'sharp' as const, label: 'Big Money' }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeView === view.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${activeView === view.id ? 'rgba(129, 140, 248, 0.5)' : 'rgba(148, 163, 184, 0.2)'}`,
                color: activeView === view.id ? '#e0e7ff' : 'rgba(226, 232, 240, 0.75)'
              }}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 40px' }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem'
          }}>
            Loading public betting data...
          </div>
        ) : sportsPublic.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '0.5rem' }}>
              No public betting data available
            </div>
            <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Check back soon for upcoming games
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {sportsPublic.map((sportData) => (
              <div key={sportData.sport}>
                {/* Sport Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
                }}>
                  <img 
                    src={sportData.sportLogo} 
                    alt={sportData.sportLabel}
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                  />
                  <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    margin: 0
                  }}>
                    {sportData.sportLabel}
                  </h2>
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginLeft: 'auto'
                  }}>
                    Top {sportData.games.length} Games
                  </span>
                </div>

                {/* Games Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {sportData.games.map((game) => renderGameCard(game))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

