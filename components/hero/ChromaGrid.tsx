'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './ChromaGrid.css'

gsap.registerPlugin(ScrollTrigger)

interface ExpertPick {
  pickText: string
  logo?: string
  logoPlaceholder?: string
  odds: string
  bookmaker: string
  unit: string
}

interface BettingSplits {
  bets: {
    away: number
    home: number
  }
  money: {
    away: number
    home: number
  }
  awayTeamLogo?: string
  homeTeamLogo?: string
}

interface MatchupStat {
  label: string
  home: number
  away: number
  homeBarPercent?: number
  awayBarPercent?: number
}

interface MatchupData {
  homeTeam: string
  awayTeam: string
  homeTeamLogo?: string
  awayTeamLogo?: string
  stats: MatchupStat[]
  homeColor?: string
  awayColor?: string
}

interface RefereeTrend {
  label: string
  wins: number
  losses: number
  percentage: number
}

interface RefereeTrends {
  refereeName: string
  refereeImage?: string
  timePeriod?: string
  trends: RefereeTrend[]
}

interface PlayerProp {
  playerImage?: string
  playerName: string
  teamAbbreviation: string
  propBet: string
  odds: string
}

interface ParlayData {
  playerProps: PlayerProp[]
  overallOdds: string
  hitRate: number
}

interface FantasyPlayer {
  playerImage?: string
  playerName: string
  fantasyPoints: number
  borderColor?: string
}

interface FantasyData {
  players: FantasyPlayer[]
}

interface ChromaGridItem {
  image: string
  title: string
  subtitle: string
  handle?: string
  borderColor?: string
  gradient?: string
  url?: string
  location?: string
  buttonText?: string
  buttonUrl?: string
  buttonImage?: string
  expertPicks?: ExpertPick[]
  bettingSplits?: BettingSplits
  matchupData?: MatchupData
  refereeTrends?: RefereeTrends
  propTools?: ParlayData
  fantasyData?: FantasyData
}

interface ChromaGridProps {
  items?: ChromaGridItem[]
  className?: string
  radius?: number
  columns?: number
  rows?: number
  damping?: number
  fadeOut?: number
  ease?: string
}

export const ChromaGrid = ({
  items,
  className = '',
  radius = 300,
  columns = 3,
  rows = 2,
  damping = 0.45,
  fadeOut = 0.6,
  ease = 'power3.out'
}: ChromaGridProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)
  const setX = useRef<((value: number) => void) | null>(null)
  const setY = useRef<((value: number) => void) | null>(null)
  const pos = useRef({ x: 0, y: 0 })

  const demo: ChromaGridItem[] = [
    {
      image: '',
      title: 'Expert Picks',
      subtitle: 'AI-powered betting insights',
      borderColor: '#F59E0B',
      gradient: 'linear-gradient(145deg, rgba(245, 158, 11, 0.15), rgba(0, 0, 0, 0.3))',
      buttonText: 'View Expert Picks',
      buttonUrl: '/expert-picks',
      buttonImage: '',
      expertPicks: [
        {
          pickText: 'Chiefs ML',
          logo: 'https://a.espncdn.com/guid/f68f2343-8ceb-7a02-740d-af6338be21d2/logos/primary_logo_on_primary_color.png',
          odds: '-125',
          bookmaker: 'DraftKings',
          unit: '1u'
        },
        {
          pickText: 'Lakers +5',
          logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/lal.png',
          odds: '+105',
          bookmaker: 'FanDuel',
          unit: '2u'
        },
        {
          pickText: 'Anytime TD',
          logo: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4241389.png',
          odds: '-110',
          bookmaker: 'BetMGM',
          unit: '1u'
        }
      ]
    },
    {
      image: '',
      title: 'Public Betting',
      subtitle: 'Real-time line movements',
      borderColor: '#10B981',
      gradient: 'linear-gradient(210deg, rgba(16, 185, 129, 0.15), rgba(0, 0, 0, 0.3))',
      buttonText: 'Track Public Betting',
      buttonUrl: '/public-betting',
      buttonImage: '',
      bettingSplits: {
        bets: {
          away: 24,
          home: 76
        },
        money: {
          away: 48,
          home: 52
        },
        awayTeamLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png',
        homeTeamLogo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/bkn.png'
      }
    },
    {
      image: '',
      title: 'Matchup Data',
      subtitle: 'Deep team analytics',
      borderColor: '#06B6D4',
      gradient: 'linear-gradient(165deg, rgba(6, 182, 212, 0.15), rgba(0, 0, 0, 0.3))',
      buttonText: 'Explore Matchups',
      buttonUrl: '/matchup-data',
      buttonImage: '',
      matchupData: {
        homeTeam: 'Ravens',
        awayTeam: 'Chargers',
        homeTeamLogo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/bal.png',
        awayTeamLogo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/lac.png',
        stats: [
          { label: 'Total Points', home: 21.9, away: 22.7, homeBarPercent: 40, awayBarPercent: 60 },
          { label: 'Rushing Yds', home: 119.8, away: 102.8, homeBarPercent: 54, awayBarPercent: 46 }
        ],
        homeColor: '#8B5CF6',
        awayColor: '#06B6D4'
      }
    },
    {
      image: '',
      title: 'Referee Trends',
      subtitle: 'Statistical insights',
      borderColor: '#666666',
      gradient: 'linear-gradient(195deg, rgba(102, 102, 102, 0.15), rgba(0, 0, 0, 0.3))',
      buttonText: 'See Referee Stats',
      buttonUrl: '/referee-trends',
      buttonImage: '',
      refereeTrends: {
        refereeName: 'John Hussey',
        refereeImage: 'https://i.ibb.co/cKGdzSXf/Untitled-1.png',
        timePeriod: 'Last 5 Years',
        trends: [
          { label: 'Home Teams ATS', wins: 41, losses: 22, percentage: 65.1 },
          { label: 'Home Dogs ATS', wins: 12, losses: 4, percentage: 75.0 },
          { label: 'Div Home Teams ATS', wins: 15, losses: 8, percentage: 65.2 },
          { label: 'Conf Home Teams ATS', wins: 29, losses: 13, percentage: 69.0 }
        ]
      }
    },
    {
      image: '',
      title: 'Prop Tools',
      subtitle: 'Player & team analysis',
      borderColor: '#8B5CF6',
      gradient: 'linear-gradient(225deg, rgba(139, 92, 246, 0.15), rgba(0, 0, 0, 0.3))',
      buttonText: 'Use Prop Tools',
      buttonUrl: '/prop-tools',
      buttonImage: '',
      propTools: {
        playerProps: [
          {
            playerImage: 'https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png',
            playerName: 'Josh Allen',
            teamAbbreviation: 'BUF',
            propBet: 'Rush Yds o24.5',
            odds: '-188'
          },
          {
            playerImage: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4241416.png',
            playerName: 'Chuba Hubbard',
            teamAbbreviation: 'CAR',
            propBet: 'Rush Atts o9.5',
            odds: '-203'
          },
          {
            playerImage: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4569987.png',
            playerName: 'Jalen Warren',
            teamAbbreviation: 'PIT',
            propBet: 'Rec Yds o9.5',
            odds: '-280'
          }
        ],
        overallOdds: '+210',
        hitRate: 100
      }
    },
    {
      image: '',
      title: 'Fantasy Football',
      subtitle: 'Lineup optimization',
      borderColor: '#EF4444',
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(0, 0, 0, 0.3))',
      buttonText: 'Optimize Lineups',
      buttonUrl: '/fantasy-football',
      buttonImage: '',
      fantasyData: {
        players: [
          {
            playerImage: 'https://a.espncdn.com/i/headshots/nfl/players/full/4262921.png',
            playerName: 'J. Jefferson',
            fantasyPoints: 18.8,
            borderColor: '#666666'
          },
          {
            playerImage: 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4430878.png',
            playerName: 'J. Njigba',
            fantasyPoints: 19.8,
            borderColor: '#6EE7B7'
          }
        ]
      }
    }
  ]

  const data = items?.length ? items : demo

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    setX.current = gsap.quickSetter(el, '--x', 'px') as (value: number) => void
    setY.current = gsap.quickSetter(el, '--y', 'px') as (value: number) => void

    const { width, height } = el.getBoundingClientRect()
    pos.current = { x: width / 2, y: height / 2 }
    setX.current?.(pos.current.x)
    setY.current?.(pos.current.y)
  }, [])

  const moveTo = (x: number, y: number) => {
    gsap.to(pos.current, {
      x,
      y,
      duration: damping,
      ease,
      onUpdate: () => {
        setX.current?.(pos.current.x)
        setY.current?.(pos.current.y)
      },
      overwrite: true
    })
  }

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    moveTo(e.clientX - r.left, e.clientY - r.top)
    if (fadeRef.current) {
      gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true })
    }
  }

  const handleLeave = () => {
    if (fadeRef.current) {
      gsap.to(fadeRef.current, {
        opacity: 1,
        duration: fadeOut,
        overwrite: true
      })
    }
  }

  const handleCardClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCardMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    card.style.setProperty('--mouse-x', `${x}px`)
    card.style.setProperty('--mouse-y', `${y}px`)
  }

  const cardRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    cardRefs.current.forEach((card, index) => {
      if (!card) return

      // Stagger directions - alternate from left, right, bottom
      const directions = [
        { x: -100, y: 0 }, // left
        { x: 100, y: 0 },  // right
        { x: 0, y: 50 },   // bottom
        { x: -100, y: 0 }, // left
        { x: 100, y: 0 },  // right
        { x: 0, y: 50 }    // bottom
      ]
      const direction = directions[index % directions.length]

      gsap.fromTo(
        card,
        {
          opacity: 0,
          x: direction.x,
          y: direction.y,
          scale: 0.8
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'power3.out',
          delay: index * 0.1,
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            once: true,
            toggleActions: 'play none none none'
          }
        }
      )
    })

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (cardRefs.current.includes(st.trigger as HTMLElement)) {
          st.kill()
        }
      })
    }
  }, [data])

  return (
    <div
      ref={rootRef}
      className={`chroma-grid ${className}`}
      style={
        {
          '--r': `${radius}px`,
          '--cols': columns,
          '--rows': rows
        } as React.CSSProperties
      }
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {data.map((c, i) => (
        <article
          key={i}
          ref={(el) => {
            cardRefs.current[i] = el
          }}
          className="chroma-card"
          onMouseMove={handleCardMove}
          onClick={() => handleCardClick(c.url)}
          style={
            {
              '--card-border': c.borderColor || 'transparent',
              '--card-gradient': c.gradient,
              cursor: c.url ? 'pointer' : 'default'
            } as React.CSSProperties
          }
        >
          <footer className="chroma-info">
            <h3 className="name">{c.title}</h3>
            <p className="role">{c.subtitle}</p>
            {c.handle && <span className="handle">{c.handle}</span>}
            {c.location && <span className="location">{c.location}</span>}
          </footer>
          {c.expertPicks && c.expertPicks.length > 0 && (
            <div className="chroma-picks-container">
              {c.expertPicks.map((pick, index) => (
                <div key={index} className="chroma-pick-card">
                  <div className="chroma-pick-left">
                    {pick.logo ? (
                      <div className="chroma-pick-logo">
                        <img 
                          src={pick.logo} 
                          alt="" 
                          className={pick.pickText === 'Anytime TD' ? 'chroma-pick-logo-fullsize' : ''}
                        />
                      </div>
                    ) : (
                      <div className="chroma-pick-logo-placeholder">
                        <span>{pick.logoPlaceholder || 'P'}</span>
                      </div>
                    )}
                    <span className="chroma-pick-text">{pick.pickText}</span>
                  </div>
                  <div className="chroma-pick-right">
                    <div className="chroma-pick-odds-group">
                      <div className="chroma-pick-odds">{pick.odds}</div>
                      <div className="chroma-pick-bookmaker">{pick.bookmaker}</div>
                    </div>
                    <div className="chroma-pick-unit">{pick.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {c.bettingSplits && (
            <div className="chroma-betting-splits">
              <div className="chroma-donut-chart">
                <div className="chroma-donut-wrapper">
                  <div 
                    className="chroma-donut-ring"
                    style={{
                      background: `conic-gradient(
                        from 270deg,
                        #10B981 0deg ${(c.bettingSplits.bets.away / 100) * 360}deg,
                        rgba(255, 255, 255, 0.85) ${(c.bettingSplits.bets.away / 100) * 360}deg 360deg
                      )`
                    }}
                  >
                    <div className="chroma-donut-inner">
                      <span className="chroma-donut-title">BETS %</span>
                    </div>
                  </div>
                  <div className="chroma-donut-logo chroma-donut-logo-away">
                    {c.bettingSplits.awayTeamLogo ? (
                      <img src={c.bettingSplits.awayTeamLogo} alt="Away Team" />
                    ) : (
                      <div className="chroma-donut-logo-placeholder">AWAY</div>
                    )}
                  </div>
                  <div className="chroma-donut-logo chroma-donut-logo-home">
                    {c.bettingSplits.homeTeamLogo ? (
                      <img src={c.bettingSplits.homeTeamLogo} alt="Home Team" />
                    ) : (
                      <div className="chroma-donut-logo-placeholder">HOME</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="chroma-donut-chart">
                <div className="chroma-donut-wrapper">
                  <div 
                    className="chroma-donut-ring"
                    style={{
                      background: `conic-gradient(
                        from 270deg,
                        #10B981 0deg ${(c.bettingSplits.money.away / 100) * 360}deg,
                        rgba(255, 255, 255, 0.85) ${(c.bettingSplits.money.away / 100) * 360}deg 360deg
                      )`
                    }}
                  >
                    <div className="chroma-donut-inner">
                      <span className="chroma-donut-title">MONEY %</span>
                    </div>
                  </div>
                  <div className="chroma-donut-logo chroma-donut-logo-away">
                    {c.bettingSplits.awayTeamLogo ? (
                      <img src={c.bettingSplits.awayTeamLogo} alt="Away Team" />
                    ) : (
                      <div className="chroma-donut-logo-placeholder">AWAY</div>
                    )}
                  </div>
                  <div className="chroma-donut-logo chroma-donut-logo-home">
                    {c.bettingSplits.homeTeamLogo ? (
                      <img src={c.bettingSplits.homeTeamLogo} alt="Home Team" />
                    ) : (
                      <div className="chroma-donut-logo-placeholder">HOME</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {c.matchupData && (() => {
            const matchup = c.matchupData;
            return (
              <div className="chroma-matchup-data">
                <div className="chroma-matchup-header">
                  <div className="chroma-matchup-team">
                    {matchup.homeTeamLogo ? (
                      <div className="chroma-matchup-logo">
                        <img src={matchup.homeTeamLogo} alt={matchup.homeTeam} />
                      </div>
                    ) : (
                      <div className="chroma-matchup-logo-placeholder">{matchup.homeTeam.charAt(0)}</div>
                    )}
                  </div>
                  <div className="chroma-matchup-team">
                    {matchup.awayTeamLogo ? (
                      <div className="chroma-matchup-logo chroma-matchup-logo-away">
                        <img src={matchup.awayTeamLogo} alt={matchup.awayTeam} />
                      </div>
                    ) : (
                      <div className="chroma-matchup-logo-placeholder">{matchup.awayTeam.charAt(0)}</div>
                    )}
                  </div>
                </div>
                <div className="chroma-matchup-stats">
                  {matchup.stats.map((stat, index) => {
                    const homeBarPercent = stat.homeBarPercent || 50
                    const awayBarPercent = stat.awayBarPercent || 50
                    return (
                      <div key={index} className="chroma-matchup-stat">
                        <div className="chroma-matchup-stat-label">{stat.label}</div>
                        <div className="chroma-matchup-stat-row">
                          <div className="chroma-matchup-stat-value">{stat.home}</div>
                          <div className="chroma-matchup-stat-bar-container">
                            <div 
                              className="chroma-matchup-bar chroma-matchup-bar-home"
                              style={{
                                width: `${homeBarPercent}%`,
                                backgroundColor: matchup.homeColor || '#8B5CF6'
                              }}
                            />
                            <div 
                              className="chroma-matchup-bar chroma-matchup-bar-away"
                              style={{
                                width: `${awayBarPercent}%`,
                                backgroundColor: matchup.awayColor || '#06B6D4'
                              }}
                            />
                          </div>
                          <div className="chroma-matchup-stat-value">{stat.away}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })()}
          {c.refereeTrends && (() => {
            const trends = c.refereeTrends;
            return (
              <div className="chroma-img-wrapper">
                <div className="chroma-referee-trends">
                  <div className="chroma-referee-header">
                    {trends.refereeImage ? (
                      <div className="chroma-referee-image-wrapper">
                        <img src={trends.refereeImage} alt={trends.refereeName} className="chroma-referee-image" />
                      </div>
                    ) : (
                      <div className="chroma-referee-image-placeholder"></div>
                    )}
                    <div className="chroma-referee-info">
                      <div className="chroma-referee-name">{trends.refereeName}</div>
                      {trends.timePeriod && (
                        <div className="chroma-referee-period">{trends.timePeriod}</div>
                      )}
                    </div>
                  </div>
                  <div className="chroma-referee-trends-list">
                    {trends.trends.map((trend, index) => (
                      <div key={index} className="chroma-referee-trend-item">
                        <div className="chroma-referee-trend-label">{trend.label}</div>
                        <div className="chroma-referee-trend-stats">
                          <span className="chroma-referee-trend-percentage">{Math.round(trend.percentage)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          {c.propTools && (() => {
            const parlay = c.propTools;
            return (
              <div className="chroma-img-wrapper">
                <div className="chroma-prop-tools">
                  <div className="chroma-prop-tools-left">
                    {parlay.playerProps.map((prop, index) => (
                      <div key={index} className="chroma-player-prop">
                        <div className="chroma-player-prop-odds">({prop.odds})</div>
                        <div className="chroma-player-prop-content">
                          {prop.playerImage ? (
                            <div className="chroma-player-image-wrapper">
                              <img src={prop.playerImage} alt={prop.playerName} className="chroma-player-image" />
                            </div>
                          ) : (
                            <div className="chroma-player-image-placeholder"></div>
                          )}
                          <div className="chroma-player-info">
                            <div className="chroma-player-team-name">{prop.teamAbbreviation} • {prop.playerName}</div>
                            <div className="chroma-player-prop-bet">{prop.propBet}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="chroma-prop-tools-right">
                    <div className="chroma-parlay-odds">{parlay.overallOdds}</div>
                    <div className="chroma-hit-rate">
                      <div className="chroma-hit-rate-percentage">{parlay.hitRate}%</div>
                      <div className="chroma-hit-rate-label">HIT-RATE</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          {c.fantasyData && (() => {
            const fantasy = c.fantasyData;
            return (
              <div className="chroma-img-wrapper">
                <div className="chroma-fantasy">
                  <div className="chroma-fantasy-header">START VS SIT</div>
                  <div className="chroma-fantasy-players">
                    {fantasy.players.map((player, index) => (
                      <div key={index} className="chroma-fantasy-player">
                        {player.playerImage ? (
                          <div className="chroma-fantasy-image-wrapper">
                            <img src={player.playerImage} alt={player.playerName} className="chroma-fantasy-image" />
                          </div>
                        ) : (
                          <div className="chroma-fantasy-image-placeholder"></div>
                        )}
                        <div className="chroma-fantasy-name">{player.playerName}</div>
                        <div 
                          className="chroma-fantasy-points"
                          style={{ borderColor: player.borderColor || '#EF4444' }}
                        >
                          {player.fantasyPoints} PTS
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          {c.image && !c.expertPicks && !c.bettingSplits && !c.matchupData && !c.refereeTrends && !c.propTools && !c.fantasyData && (
            <div className="chroma-img-wrapper">
              <img src={c.image} alt={c.title} loading="lazy" />
            </div>
          )}
          {c.buttonText && c.buttonUrl && (
            <Link 
              href={c.buttonUrl} 
              className="chroma-button"
            >
              {c.buttonImage && (
                <span className="chroma-button-image">
                  <img src={c.buttonImage} alt="" />
                </span>
              )}
              <span className="chroma-button-text">{c.buttonText}</span>
            </Link>
          )}
        </article>
      ))}
      <div className="chroma-overlay" />
      <div ref={fadeRef} className="chroma-fade" />
    </div>
  )
}

export default ChromaGrid

