'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import styles from './hero-new.module.css'
import ScrollStack, { ScrollStackItem } from '@/components/ScrollStack'
import SplitText from '@/components/SplitText'
import ChromaGrid from './ChromaGrid'
import './ChromaGrid.css'

gsap.registerPlugin(ScrollTrigger)
import { LuBrainCircuit } from "react-icons/lu"
import { IoPieChart } from "react-icons/io5"
import { RiNewspaperLine } from "react-icons/ri"
import { FaRegCalendarAlt } from "react-icons/fa"
import { MdOutlineSportsHandball } from "react-icons/md"
import { PiListChecksBold } from "react-icons/pi"
import { FaHeart } from "react-icons/fa"
import { FaArrowDown } from "react-icons/fa"
import { GiTwoCoins } from "react-icons/gi"
import { Infinity } from "lucide-react"
import { FaWandMagicSparkles } from "react-icons/fa6"

const bettingTerms = [
  'trends', 'systems', 'public betting', 'odds', 'line movement',
  'public money', 'matchup data', 'team data', 'player props', 'team analytics',
  'script writer', 'referee stats', 'parlay tool', 'futures', 'expert picks',
  'player props', 'teasers', 'sharp money', 'big money', 'vegas backed bets',
  'daily picks', 'start vs sit', 'trending players'
]

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`'

function DecryptedText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState<string[]>(text.split(''))
  const [isDecrypted, setIsDecrypted] = useState(false)

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    
    const timeout = setTimeout(() => {
      let iterations = 0
      intervalId = setInterval(() => {
        setDisplayText(prev => {
          return prev.map((char, index) => {
            // Preserve spaces and newlines
            if (char === ' ' || char === '\n') return char
            // If this character has already been decrypted, keep it
            if (index < iterations) {
              return text[index]
            }
            // Otherwise show random character
            return characters[Math.floor(Math.random() * characters.length)]
          })
        })

        iterations += 1 / 3

        if (iterations >= text.length) {
          setIsDecrypted(true)
          if (intervalId) clearInterval(intervalId)
        }
      }, 30)
    }, delay)

    return () => {
      clearTimeout(timeout)
      if (intervalId) clearInterval(intervalId)
    }
  }, [text, delay])

  return (
    <span className={styles.decryptedText}>
      {displayText.map((char, index) => {
        // Preserve spaces as non-breaking spaces or regular spaces
        if (char === ' ') {
          return <span key={index} className={styles.space}> </span>
        }
        if (char === '\n') {
          return <br key={index} />
        }
        return (
          <span key={index} className={isDecrypted && char === text[index] ? styles.decrypted : ''}>
            {char}
          </span>
        )
      })}
    </span>
  )
}

// ChromaGrid demo data
const chromaGridDemo = [
  {
    image: '',
    title: 'Expert Picks',
    subtitle: 'AI-powered betting insights. Get the best picks from our expert analysts. Make smarter bets with data-driven recommendations.',
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
        },
        {
          pickText: 'Padres -1.5',
          logo: 'https://a.espncdn.com/i/teamlogos/mlb/500-dark/sd.png',
          odds: '+180',
          bookmaker: 'Caesars',
          unit: '1u'
        },
        {
          pickText: 'Bills -3',
          logo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/buf.png',
          odds: '-110',
          bookmaker: 'BetRivers',
          unit: '1u'
        }
      ]
  },
  {
    image: '',
    title: 'Public Betting',
    subtitle: 'Real-time line movements. Track where the money is going. See public betting splits from 30+ sportsbooks.',
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
    subtitle: 'Deep team analytics. Compare teams head-to-head. Every important metric for both sides of the ball.',
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
    subtitle: 'Statistical insights. See how referees impact games. 5 years of historical performance and referee trends.',
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
    subtitle: 'Player & team analysis. Build perfect parlays. High hit-rate props and premium analyst picks.',
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
]

// Helper component to render ChromaGrid visualizations
function ChromaVisualization({ item }: { item: (typeof chromaGridDemo)[number] }) {
  const optional = item as Record<string, any>
  return (
    <div className="chroma-visualization-wrapper">
      {optional.expertPicks && optional.expertPicks.length > 0 && (
        <div className="chroma-picks-container">
          {optional.expertPicks.map((pick: any, index: number) => (
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
                    <span>P</span>
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
      {optional.bettingSplits && (
        <div className="chroma-betting-splits">
          <div className="chroma-donut-chart">
            <div className="chroma-donut-wrapper">
              <div 
                className="chroma-donut-ring"
                style={{
                  background: `conic-gradient(
                    from 270deg,
                    #10B981 0deg ${(optional.bettingSplits.bets.away / 100) * 360}deg,
                    rgba(255, 255, 255, 0.85) ${(optional.bettingSplits.bets.away / 100) * 360}deg 360deg
                  )`
                }}
              >
                <div className="chroma-donut-inner">
                  <span className="chroma-donut-title">BETS %</span>
                </div>
              </div>
              <div className="chroma-donut-logo chroma-donut-logo-away">
                {optional.bettingSplits.awayTeamLogo ? (
                  <img src={optional.bettingSplits.awayTeamLogo} alt="Away Team" />
                ) : (
                  <div className="chroma-donut-logo-placeholder">AWAY</div>
                )}
              </div>
              <div className="chroma-donut-logo chroma-donut-logo-home">
                {optional.bettingSplits.homeTeamLogo ? (
                  <img src={optional.bettingSplits.homeTeamLogo} alt="Home Team" />
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
                    #10B981 0deg ${(optional.bettingSplits.money.away / 100) * 360}deg,
                    rgba(255, 255, 255, 0.85) ${(optional.bettingSplits.money.away / 100) * 360}deg 360deg
                  )`
                }}
              >
                <div className="chroma-donut-inner">
                  <span className="chroma-donut-title">MONEY %</span>
                </div>
              </div>
              <div className="chroma-donut-logo chroma-donut-logo-away">
                {optional.bettingSplits.awayTeamLogo ? (
                  <img src={optional.bettingSplits.awayTeamLogo} alt="Away Team" />
                ) : (
                  <div className="chroma-donut-logo-placeholder">AWAY</div>
                )}
              </div>
              <div className="chroma-donut-logo chroma-donut-logo-home">
                {optional.bettingSplits.homeTeamLogo ? (
                  <img src={optional.bettingSplits.homeTeamLogo} alt="Home Team" />
                ) : (
                  <div className="chroma-donut-logo-placeholder">HOME</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {optional.matchupData && (() => {
        const matchup = optional.matchupData;
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
              {matchup.stats.map((stat: any, index: number) => {
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
      {optional.refereeTrends && (() => {
        const trends = optional.refereeTrends;
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
                {trends.trends.map((trend: any, index: number) => (
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
      {optional.propTools && (() => {
        const parlay = optional.propTools;
        return (
          <div className="chroma-img-wrapper">
            <div className="chroma-prop-tools">
              <div className="chroma-prop-tools-left">
                {parlay.playerProps.map((prop: any, index: number) => (
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
      {optional.fantasyData && (() => {
        const fantasy = optional.fantasyData;
        return (
          <div className="chroma-img-wrapper">
            <div className="chroma-fantasy">
              <div className="chroma-fantasy-header">START VS SIT</div>
              <div className="chroma-fantasy-players">
                {fantasy.players.map((player: any, index: number) => (
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
      {optional.dashboardPreview && (
        <div className="chroma-dashboard-preview">
            {/* Welcome Message */}
            <div className="chroma-dashboard-header">
              <div className="chroma-dashboard-welcome">Welcome back!</div>
              <div className="chroma-dashboard-subtitle">These are the tools you need to be a profitable bettor</div>
            </div>
            
            {/* Divider */}
            <div className="chroma-dashboard-divider"></div>
            
            {/* AI Game Intelligence Section */}
            <div className="chroma-dashboard-section">
              <div className="chroma-dashboard-section-header">
                <span className="chroma-dashboard-section-icon">✨</span>
                <span className="chroma-dashboard-section-title">AI Game Scripts</span>
                <span className="chroma-dashboard-beta">BETA</span>
              </div>
              <div className="chroma-dashboard-sport-tabs">
                <div className="chroma-dashboard-tab chroma-dashboard-tab-active">NFL</div>
                <div className="chroma-dashboard-tab">NBA</div>
                <div className="chroma-dashboard-tab chroma-dashboard-tab-inactive">CFB</div>
              </div>
              <div className="chroma-dashboard-game-cards">
                <div className="chroma-dashboard-game-card">
                  <div className="chroma-dashboard-game-teams">
                    <span className="chroma-dashboard-team">Chiefs</span>
                    <span className="chroma-dashboard-vs">vs</span>
                    <span className="chroma-dashboard-team">Bills</span>
                  </div>
                  <div className="chroma-dashboard-game-time">Today • 4:25 PM</div>
                  <div className="chroma-dashboard-game-strength">Strong</div>
                </div>
                <div className="chroma-dashboard-game-card">
                  <div className="chroma-dashboard-game-teams">
                    <span className="chroma-dashboard-team">Lakers</span>
                    <span className="chroma-dashboard-vs">vs</span>
                    <span className="chroma-dashboard-team">Celtics</span>
                  </div>
                  <div className="chroma-dashboard-game-time">Today • 8:00 PM</div>
                  <div className="chroma-dashboard-game-strength">Above Avg</div>
                </div>
              </div>
            </div>
            
            {/* Quick Data Widgets */}
            <div className="chroma-dashboard-section">
              <div className="chroma-dashboard-section-header">
                <span className="chroma-dashboard-section-title">Quick Data</span>
              </div>
              <div className="chroma-dashboard-widgets-row">
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Picks Dashboard</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Chiefs ML -125</div>
                    <div className="chroma-dashboard-widget-item">Lakers +5</div>
                    <div className="chroma-dashboard-widget-item">Anytime TD -110</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Public Betting</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">76% Bets</div>
                    <div className="chroma-dashboard-widget-item">52% Money</div>
                    <div className="chroma-dashboard-widget-item">Line: -3.5</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Matchup Data</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Ravens vs Chargers</div>
                    <div className="chroma-dashboard-widget-item">Total: 44.6</div>
                    <div className="chroma-dashboard-widget-item">O/U: 45.5</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">The Weekly Report</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Latest News</div>
                    <div className="chroma-dashboard-widget-item">Trending Picks</div>
                    <div className="chroma-dashboard-widget-item">Market Moves</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Prop Tools Section */}
            <div className="chroma-dashboard-section">
              <div className="chroma-dashboard-section-header">
                <span className="chroma-dashboard-section-title">Prop Tools</span>
              </div>
              <div className="chroma-dashboard-widgets-row">
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Top Props</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Josh Allen Rush o24.5</div>
                    <div className="chroma-dashboard-widget-item">Chuba Hubbard Atts o9.5</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Prop Parlay</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Parlay: +210</div>
                    <div className="chroma-dashboard-widget-item">Hit Rate: 100%</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Weekly Fantasy</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">J. Jefferson: 18.8</div>
                    <div className="chroma-dashboard-widget-item">J. Njigba: 19.8</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Top TD Scorers</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">C. McCaffrey</div>
                    <div className="chroma-dashboard-widget-item">T. Hill</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Tools Section */}
            <div className="chroma-dashboard-section">
              <div className="chroma-dashboard-section-header">
                <span className="chroma-dashboard-section-title">More Tools</span>
              </div>
              <div className="chroma-dashboard-widgets-row">
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Maximize Profit</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Line Shopping</div>
                    <div className="chroma-dashboard-widget-item">Best Odds</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Connect Discord</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Live Alerts</div>
                    <div className="chroma-dashboard-widget-item">Community</div>
                  </div>
                </div>
                <div className="chroma-dashboard-widget-mini">
                  <div className="chroma-dashboard-widget-mini-header">Affiliate Program</div>
                  <div className="chroma-dashboard-widget-mini-content">
                    <div className="chroma-dashboard-widget-item">Earn Rewards</div>
                    <div className="chroma-dashboard-widget-item">Refer Friends</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  )
}

export default function HeroNewPage() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const floatingContainerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Add class to body and html to override background
    document.body.classList.add('hero-new-page')
    document.documentElement.style.setProperty('background', '#0a0f1a', 'important')
    document.documentElement.style.setProperty('background-image', 'none', 'important')
    
    // Inject style tag to override navbar styles with !important
    const styleId = 'hero-new-navbar-override'
    let styleTag = document.getElementById(styleId) as HTMLStyleElement
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = styleId
      styleTag.textContent = `
        body.hero-new-page .desktop-nav,
        body.hero-new-page .mobile-nav {
          margin: 0 !important;
          padding: 20px 0 0 0 !important;
        }
        body.hero-new-page .desktop-nav > div:first-child,
        body.hero-new-page .mobile-nav > div:first-child {
          background: rgba(10, 15, 26, 0.98) !important;
          backdrop-filter: blur(30px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
        }
      `
      document.head.appendChild(styleTag)
    }
    
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      // Fade out over the first viewport height
      const maxScroll = windowHeight * 0.8
      const progress = Math.min(scrollY / maxScroll, 1)
      setScrollProgress(progress)

      // Fade out floating text based on scroll
      if (floatingContainerRef.current) {
        const opacity = Math.max(0, 1 - progress * 2)
        floatingContainerRef.current.style.opacity = opacity.toString()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkMobile)
      // Remove class and restore default background when component unmounts
      document.body.classList.remove('hero-new-page')
      document.documentElement.style.removeProperty('background')
      document.documentElement.style.removeProperty('background-image')
      // Remove style tag
      const style = document.getElementById(styleId)
      if (style) {
        style.remove()
      }
    }
  }, [])


  return (
    <div className={styles.heroNewPage}>
      <svg className={styles.hiddenSvg}>
        <filter id="glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="65" />
        </filter>
      </svg>

      <section className={styles.heroSection}>
        <div 
          className={styles.heroGradientLine} 
          data-direction="left" 
          data-position="high"
          style={{ 
            animationDelay: '0s, 0s, 0s',
            animationDuration: '3s, 25s, 25s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="right" 
          data-position="high"
          style={{ 
            animationDelay: '15s, 15s, 15s',
            animationDuration: '3s, 28s, 28s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="left" 
          data-position="mid"
          style={{ 
            animationDelay: '8s, 8s, 8s',
            animationDuration: '3s, 30s, 30s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="right" 
          data-position="mid"
          style={{ 
            animationDelay: '22s, 22s, 22s',
            animationDuration: '3s, 27s, 27s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="left" 
          data-position="low"
          style={{ 
            animationDelay: '12s, 12s, 12s',
            animationDuration: '3s, 26s, 26s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="right" 
          data-position="low"
          style={{ 
            animationDelay: '18s, 18s, 18s',
            animationDuration: '3s, 29s, 29s'
          } as React.CSSProperties}
        ></div>
        <div className={styles.heroContainer}>
          {/* Central message */}
          <div className={styles.centralMessage}>
            <h1 className={styles.heroTitle}>
              <DecryptedText text="we " delay={0} />
              <FaHeart className={styles.heartIcon} />
              <DecryptedText text=" the sportsbooks" delay={0} />
              <br />
              <span className={styles.heroSubtitle}>
                <DecryptedText text="because we've figured out how to beat them" delay={500} />
              </span>
            </h1>
          </div>

          {/* Scroll indicator arrow */}
          <div className={styles.scrollIndicator}>
            <div className={styles.scrollArrow}>↓</div>
          </div>

          {/* Floating betting terms */}
          <div 
            ref={floatingContainerRef}
            className={styles.floatingContainer}
            style={{
              '--scroll-opacity': `${1 - scrollProgress}`
            } as React.CSSProperties}
          >
            {bettingTerms.map((term, index) => {
              // Randomize initial positions - some start from left, some from right
              const direction = index % 2 === 0 ? 1 : -1; // 1 = left to right, -1 = right to left
              
              // Some text fades in on-screen (appears in place), others come from sides
              const fadeInPlace = index % 4 === 0; // Every 4th item fades in place
              
              // For fade-in-place items, start at random on-screen position
              // For others, start off-screen
              const startX = fadeInPlace
                ? 20 + (index * 17) % 60 // Random position between 20% and 80%
                : (direction === 1 ? -20 : 120); // Start off-screen
              
              const endX = fadeInPlace
                ? startX + (direction === 1 ? 60 : -60) // Move across screen from start position
                : (direction === 1 ? 120 : -20); // Move to opposite side
              
              const startY = (index * 23) % 100; // Spread vertically across full height
              const endY = fadeInPlace
                ? startY + ((index * 7) % 30 - 15) // Small vertical movement for fade-in items
                : ((index * 23) + 40) % 100;
              
              return (
                <div
                  key={index}
                  className={`${styles.floatingText} ${fadeInPlace ? styles.fadeInPlace : ''}`}
                  style={{
                    '--delay': `${index * 0.3}s`,
                    '--duration': `${50 + (index % 10) * 8}s`,
                    '--start-x': `${startX}%`,
                    '--start-y': `${startY}%`,
                    '--end-x': `${endX}%`,
                    '--end-y': `${endY}%`,
                    '--opacity': `${0.08 + (index % 5) * 0.05}`,
                    '--font-size': `${0.656 + (index % 6) * 0.188}rem`,
                    '--fade-delay': fadeInPlace ? `${index * 0.5}s` : '0s',
                    '--fade-duration': `${5 + (index % 4) * 2}s`,
                    '--direction': direction
                  } as React.CSSProperties}
                >
                  {term}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ChromaGrid Scroll Stack Cards - Alternating Layout */}
      <section className={styles.scrollStackSection}>
        {/* Light ball gradients */}
        <div className={styles.gradientOrbs}>
          <div className={styles.orb1}></div>
          <div className={styles.orb2}></div>
          <div className={styles.orb3}></div>
          <div className={styles.orb4}></div>
        </div>
        
        <div className={styles.chromaCardsGridWrapper}>
          <ScrollStack 
            useWindowScroll={true}
            stackPosition={isMobile ? "15%" : "20%"}
            itemDistance={150}
            itemStackDistance={5}
            baseScale={0.9}
            scaleEndPosition="10%"
          >
            {chromaGridDemo.map((item, index) => {
              if ((item as any).dashboardPreview) {
                return (
                  <ScrollStackItem 
                    key={index}
                    itemClassName={styles.chromaCardLeft}
                    style={{
                      '--card-border': item.borderColor || 'transparent',
                      '--card-gradient': item.gradient,
                      background: item.gradient
                    } as React.CSSProperties}
                  >
                    <div className={styles.chromaCardGrid}>
                      <ChromaVisualization item={item} />
                    </div>
                  </ScrollStackItem>
                )
              }
              return (
                <ScrollStackItem 
                  key={index}
                  itemClassName={styles.chromaCardLeft}
                  style={{
                    '--card-border': item.borderColor || 'transparent',
                    '--card-gradient': item.gradient,
                    background: item.gradient
                  } as React.CSSProperties}
                >
                  <div className={styles.chromaCardGrid}>
                    <div className={styles.chromaCardTextColumn}>
                      <h2 className={styles.chromaCardTitle}>{item.title}</h2>
                      <p className={styles.chromaCardSubtitle}>{item.subtitle}</p>
                    </div>
                    <div className={styles.chromaCardImageColumn}>
                      <div className={styles.chromaCardImage}>
                        <ChromaVisualization item={item} />
                      </div>
                    </div>
                  </div>
                </ScrollStackItem>
              )
            })}
          </ScrollStack>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorksSection}>
        <h2 className={styles.howItWorksTitle}>Here's How It Works</h2>
        <p className={styles.howItWorksSubtitle}>Choose your lane—load up on credits or go all-in with full access.</p>
        <div className={styles.howItWorksContent}>
          {/* Credits Card */}
          <div className={`${styles.howItWorksCard} ${styles.glassCard}`}>
            <div className={styles.glassFilter}></div>
            <div className={styles.glassOverlay}></div>
            <div className={styles.glassSpecular}></div>
            <div className={styles.howItWorksCardHeader}>
              <div className={`${styles.howItWorksCardIcon} ${styles.howItWorksCardIconWhite}`}>
                <GiTwoCoins />
              </div>
              <h3 className={styles.howItWorksCardTitle}>AI Credits</h3>
              <p className={styles.howItWorksCardSubtitle}>Don’t want a full subscription? Purchase credits to unlock one bet, blueprint, or script at a time.</p>
            </div>
            <div className={styles.howItWorksCardBody}>
              <div className={styles.howItWorksFeature}>
                <div className={styles.howItWorksFeatureIcon}>
                  <FaWandMagicSparkles />
                </div>
                <div className={styles.howItWorksFeatureText}>
                  <h4 className={styles.howItWorksFeatureTitle}>AI Scripts</h4>
                  <p className={styles.howItWorksFeatureDesc}>Generate elite analyst-level scripts for every sport using our proprietary data and insider picks. Credit spend scales with the strength of the script.</p>
                </div>
              </div>
              <div className={styles.howItWorksFeature}>
                <div className={`${styles.howItWorksFeatureIcon} ${styles.howItWorksFeatureIconBlue}`}>
                  <RiNewspaperLine />
                </div>
                <div className={styles.howItWorksFeatureText}>
                  <h4 className={styles.howItWorksFeatureTitle}>Game Blueprints</h4>
                  <p className={styles.howItWorksFeatureDesc}>Use credits to unlock quick blueprints that surface the top narratives and angles for each matchup.</p>
                </div>
              </div>
              <div className={styles.howItWorksFeature}>
                <div className={`${styles.howItWorksFeatureIcon} ${styles.howItWorksFeatureIconYellow}`}>
                  <PiListChecksBold />
                </div>
                <div className={styles.howItWorksFeatureText}>
                  <h4 className={styles.howItWorksFeatureTitle}>Analyst Picks</h4>
                  <p className={styles.howItWorksFeatureDesc}>Spend credits to unlock individual Insider picks for the big time matchups you care about most.</p>
                </div>
              </div>
            </div>
            <a className={`${styles.howItWorksButton} ${styles.glassButton}`} href="/signup">
              <div className={styles.glassFilter}></div>
              <div className={styles.glassOverlay}></div>
              <div className={styles.glassSpecular}></div>
              <div className={styles.glassContent}>Try For Free</div>
            </a>
          </div>
          {/* Or divider */}
          <div className={styles.howItWorksOr}>
            <span className={styles.howItWorksOrText}>or</span>
          </div>
          {/* Subscription Card - Placeholder for now */}
          <div className={`${styles.howItWorksCard} ${styles.glassCard}`}>
            <div className={styles.glassFilter}></div>
            <div className={styles.glassOverlay}></div>
            <div className={styles.glassSpecular}></div>
            <div className={styles.howItWorksCardHeader}>
              <div className={`${styles.howItWorksCardIcon} ${styles.howItWorksCardIconWhite}`}>
                <FaRegCalendarAlt />
              </div>
              <h3 className={styles.howItWorksCardTitle}>Monthly Subscription</h3>
              <p className={styles.howItWorksCardSubtitle}>Unlock everything, all the time—your full access package to every Insider tool and pick.</p>
            </div>
            <div className={styles.howItWorksCardBody}>
              <div className={styles.howItWorksFeature}>
                <div className={`${styles.howItWorksFeatureIcon} ${styles.howItWorksFeatureIconYellow}`}>
                  <PiListChecksBold />
                </div>
                <div className={styles.howItWorksFeatureText}>
                  <h4 className={styles.howItWorksFeatureTitle}>Analyst Picks</h4>
                  <p className={styles.howItWorksFeatureDesc}>Unlimited access to every single pick, no credits needed, with instant notifications pushed right to your phone.</p>
                </div>
              </div>
              <div className={styles.howItWorksFeature}>
                <div className={`${styles.howItWorksFeatureIcon} ${styles.howItWorksFeatureIconGreen}`}>
                  <IoPieChart />
                </div>
                <div className={styles.howItWorksFeatureText}>
                  <h4 className={styles.howItWorksFeatureTitle}>Advanced Data</h4>
                  <p className={styles.howItWorksFeatureDesc}>All matchup analytics, betting splits, and referee trends—fully accessible on our stats dashboard the moment you need them.</p>
                </div>
              </div>
              <div className={styles.howItWorksFeature}>
                <div className={`${styles.howItWorksFeatureIcon} ${styles.howItWorksFeatureIconRed}`}>
                  <LuBrainCircuit />
                </div>
                <div className={styles.howItWorksFeatureText}>
                  <h4 className={styles.howItWorksFeatureTitle}>Automated Tools</h4>
                  <p className={styles.howItWorksFeatureDesc}>Unlock the prop engine for top hit-rate props, the perfect parlay builder, our Vegas-backed fantasy optimizer, and the script writer—all with zero limits.</p>
                </div>
              </div>
            </div>
            <a
              className={`${styles.howItWorksButtonSecondary} ${styles.glassButton}`}
              href="https://dashboard.thebettinginsider.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className={styles.glassFilter}></div>
              <div className={styles.glassOverlay}></div>
              <div className={styles.glassSpecular}></div>
              <div className={styles.glassContent}>View Our Dashboard</div>
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Reviews Section */}
      <ReviewsReelSection />
    </div>
  )
}

// Pricing Section Component
function PricingSection() {
  const unlimitedPlans = [
    {
      label: 'week',
      price: '$29',
      cadence: '/ week',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoo07WIhZOuSIJB8OGgVU?trial=true'
    },
    {
      label: 'month',
      price: '$99',
      cadence: '/ month',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoN07WIhZOuSIm8hTDjy4?trial=true'
    },
    {
      label: 'season',
      price: '$299',
      cadence: '/ 6 months',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZp507WIhZOuSIFMzU7Kkm?trial=true'
    }
  ]

  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const activePlan = unlimitedPlans[selectedPlanIndex]

  return (
    <section className={styles.pricingSimpleSection}>
      <div className={styles.pricingSimpleWrapper}>
        <div className={styles.pricingSimpleHeader}>
          <h2 className={styles.pricingTitle}>Gain Instant Access</h2>
          <p className={styles.pricingTagline}>
            Pick a path and start betting smarter right now—single-match credits or full-time access.
          </p>
        </div>

        <div className={`${styles.pricingSimpleCard} ${styles.glassCard}`}>
          <div className={styles.glassFilter}></div>
          <div className={styles.glassOverlay}></div>
          <div className={styles.glassSpecular}></div>
          <div className={styles.pricingSimpleBody}>
            <div className={styles.pricingSimpleOption}>
              <h3 className={styles.pricingSimpleOptionTitle}>One Time Purchase</h3>
              <div className={styles.pricingSimplePrice}>$10 <span>/ 15 Credits</span></div>
              <p className={styles.pricingSimpleDescription}>Spend credits on AI scripts, analyst picks, blueprints, and more.</p>
              <a
                className={`${styles.pricingSimpleButton} ${styles.glassButton}`}
                href="https://dashboard.thebettinginsider.com/pricing?tab=credits"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.glassFilter}></div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.glassSpecular}></div>
                <div className={styles.glassContent}>Buy Credits</div>
              </a>
            </div>

            <div className={styles.pricingSimpleDivider}>
              <span>or</span>
            </div>

            <div className={styles.pricingSimpleOption}>
              <h3 className={styles.pricingSimpleOptionTitle}>Full Access</h3>
              <p className={styles.pricingSimpleDescription}>Unlock every tool, pick, and dashboard update with ongoing access.</p>

              <div className={styles.pricingSimpleTierList}>
                {unlimitedPlans.map((plan, index) => (
                  <button
                    key={plan.label}
                    type="button"
                    onClick={() => setSelectedPlanIndex(index)}
                    className={`${styles.pricingSimpleTier} ${index === selectedPlanIndex ? styles.pricingSimpleTierActive : ''}`}
                    aria-pressed={index === selectedPlanIndex}
                  >
                    <div className={styles.pricingSimpleTierContent}>
                      <span className={styles.pricingSimpleTierPrice}>{plan.price}</span>
                      <span className={styles.pricingSimpleTierLabel}>{` / ${plan.label}`}</span>
                    </div>
                  </button>
                ))}
              </div>

              <a
                className={`${styles.pricingSimpleButton} ${styles.pricingSimpleButtonSecondary} ${styles.glassButton}`}
                href={activePlan.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.glassFilter}></div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.glassSpecular}></div>
                <div className={styles.glassContent}>Buy Now</div>
              </a>
            </div>
          </div>

          <div className={styles.pricingSimpleFooter}>
            <span>Secure payment • Cancel anytime • Instant access</span>
            <a
              href="https://dashboard.thebettinginsider.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Already subscribed? Go to your dashboard
            </a>
          </div>
        </div>

        <p className={styles.pricingSimpleNote}>
          Prefer the full pricing breakdown? Visit our{' '}
          <a href="/pricing">pricing page</a> for more details.
        </p>
      </div>
    </section>
  )
}

// Reviews Reel Section Component
function ReviewsReelSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(0)

  const reviews = [
    {
      name: "Sean M.",
      text: "Honestly thought I was only gonna use it for daily picks but the rest of the dashboard blew me away. The matchup and referee stats are insane, like stuff you just don't see anywhere else. It's made my NFL Sundays way more profitable.",
      duration: "Member for 1 year",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f141a2286e558576d25c54_Untitled%20design%20(22).svg"
    },
    {
      name: "Harry R.",
      text: "Insider Mike is a legend. The dude's hit rate is unreal lately. I tail almost everything he posts and when he lines up with the ref or matchup data, it's basically auto 2 unit bet for me.",
      duration: "Member for 8 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a2d854d3970b1c5181_Untitled%20design%20(27).svg"
    },
    {
      name: "Connor M.",
      text: "Ref trends are crazy consistent. I never thought refs mattered that much until I started tracking the data here. The 80% and 74% numbers don't lie, and those patterns show up again and again.",
      duration: "Member for 6 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a16bd623f27c6d8f76_Untitled%20design%20(29).svg"
    },
    {
      name: "Ryan S.",
      text: "I used to scroll Twitter for bets, but not anymore. This has everything in one spot: public data, team trends, refs, hot bettors, all that. Feels like having a team of researchers behind me.",
      duration: "Member for 1 year",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a247971096173b3786_Untitled%20design%20(24).svg"
    },
    {
      name: "Chris K.",
      text: "The fact that I'm only paying this much for all of these bettors is unreal. Someone is always hot, and if you just ride the hot hand, there is no way you'll lose.",
      duration: "Member for 2 years",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a1e794076e09c7e5bd_Untitled%20design%20(30).svg"
    },
    {
      name: "Hayden G.",
      text: "Didn't think I'd use all the tools, but I ended up checking them every day. I started just following picks, then I got obsessed with the team and ref matchup data. Makes betting feel like studying for an exam I actually wanna pass.",
      duration: "Member for 5 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a1140874807f125662_Untitled%20design%20(28).svg"
    },
    {
      name: "Jason L.",
      text: "I'm not super technical with stats, but Advantage makes it easy. I just follow the public money data and system notes, they hit more often than my old gut picks ever did.",
      duration: "Member for 3 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a166a6b38ccfa1c4f7_Untitled%20design%20(25).svg"
    },
    {
      name: "Saurav B.",
      text: "Been subscribed for a year and still impressed with how smooth everything runs. Support's solid, updates keep rolling in, and the results speak for themselves. It's worth sticking with.",
      duration: "Member for 1 year",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a189fb8a9fb22ebb5b_Untitled%20design%20(23).svg"
    },
    {
      name: "Ian C.",
      text: "I started following Insider Don's picks just for fun and now I'm checking the dashboard before every game. Dude's been consistent, but what makes it hit is how it lines up with the matchup data.",
      duration: "Member for 4 months",
      profilePic: "https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f142a130693673d1c74370_Untitled%20design%20(26).svg"
    }
  ]

  useEffect(() => {
    const animate = () => {
      setPosition((prev: number) => {
        const cardWidth = 420 + 32 // card width + gap
        const setWidth = cardWidth * reviews.length
        
        if (Math.abs(prev) >= setWidth) {
          return 0
        }
        
        return prev - 0.5
      })
      requestAnimationFrame(animate)
    }
    
    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [reviews.length])

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${position}px)`
    }
  }, [position])

  return (
    <div className={styles.reviewsReel}>
      <div className={styles.reviewsHeader}>
        <h2 className={styles.reviewsTitle}>
          What Our Members Say
        </h2>
      </div>
      
      <div className={styles.reviewsContainer}>
        <div ref={trackRef} className={styles.reviewsTrack}>
          {/* Triple the content for seamless loop */}
          {[...Array(3)].map((_, setIndex) => (
            reviews.map((review, index) => {
              const initials = review.name.split(' ').map(n => n[0]).join('')
              return (
                <div key={`${setIndex}-${index}`} className={styles.reviewCard}>
                  <div className={styles.reviewContent}>
                    <h3 className={styles.reviewerName}>
                      <div className={styles.profilePic}>
                        {review.profilePic ? (
                          <img src={review.profilePic} alt={review.name} />
                        ) : (
                          initials
                        )}
                      </div>
                      <span>{review.name}</span>
                    </h3>
                    <p className={styles.reviewText}>{review.text}</p>
                    <div className={styles.reviewFooter}>
                      <div className={styles.memberDuration}>{review.duration}</div>
                    </div>
                  </div>
                </div>
              )
            })
          ))}
        </div>
      </div>
    </div>
  )
}

