'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import styles from './about.module.css'
import ScrollStack, { ScrollStackItem } from '@/components/ScrollStack'
import SplitText from '@/components/SplitText'
import ChromaGrid from '../../hero-new/ChromaGrid'
import '../../hero-new/ChromaGrid.css'

gsap.registerPlugin(ScrollTrigger)
import { LuBrainCircuit } from "react-icons/lu"
import { IoPieChart } from "react-icons/io5"
import { RiNewspaperLine } from "react-icons/ri"
import { FaRegCalendarAlt } from "react-icons/fa"
import { MdOutlineSportsHandball } from "react-icons/md"
import { PiListChecksBold } from "react-icons/pi"
import { FaHeart, FaInstagram, FaStar, FaCheck, FaLock, FaEye, FaChartLine, FaTrophy } from "react-icons/fa"
import { FaArrowDown } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
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

const reviewEntries = [
  { name: 'Clayton W', platform: 'twitter', review: 'The picks have been ridiculously great' },
  { name: 'Chris K', platform: 'twitter', review: 'Game scripts help a ton' },
  { name: 'Ryan S', platform: 'instagram', review: 'I have genuinely grown so much as a bettor' },
  { name: 'Connor M', platform: 'instagram', review: 'My entire perspective on betting changed when I joined' },
  { name: 'Caden G', platform: 'twitter', review: "The Scripts go into so much detail, it's nuts" },
  { name: 'Harrison R', platform: 'twitter', review: 'These guys are seriously sharp' },
  { name: 'John B', platform: 'twitter', review: 'I will be subbed for life' },
  { name: 'Hal W', platform: 'instagram', review: "I'm genuinely impressed with the service these guys provide" },
  { name: 'Austin Q', platform: 'twitter', review: 'Used the credits, loved it, got the unlimited' },
  { name: 'Trevan M', platform: 'instagram', review: 'The data is great, picks are better, and the scripts put it all together' },
  { name: 'Saurav B', platform: 'instagram', review: "NFL Sunday's have been an absolute blessing" }
] as const

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

// Flip Digit Component for Hologram Board
function FlipDigit({ digit, delay = 0 }: { digit: string; delay?: number }) {
  const [isFlipping, setIsFlipping] = useState(false)
  const [currentDigit, setCurrentDigit] = useState(digit)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger visibility and initial flip animation
    const visibilityTimeout = setTimeout(() => {
      setIsVisible(true)
      setIsFlipping(true)
      setTimeout(() => {
        setIsFlipping(false)
      }, 600)
    }, delay)

    return () => clearTimeout(visibilityTimeout)
  }, [delay])

  useEffect(() => {
    // Update digit with flip animation
    if (currentDigit !== digit && isVisible) {
      setIsFlipping(true)
      const flipTimeout = setTimeout(() => {
        setCurrentDigit(digit)
        setTimeout(() => setIsFlipping(false), 300)
      }, 300)
      return () => clearTimeout(flipTimeout)
    }
  }, [digit, currentDigit, isVisible])

  return (
    <div 
      className={styles.flipDigitContainer}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`
      } as React.CSSProperties}
    >
      <div 
        className={styles.flipDigit}
        style={{
          transform: isFlipping ? 'rotateX(180deg)' : 'rotateX(0deg)'
        } as React.CSSProperties}
      >
        <div className={styles.flipDigitFront}>
          <div className={styles.flipDigitInner}>
            <span className={styles.flipDigitText}>{currentDigit}</span>
          </div>
        </div>
        <div className={styles.flipDigitBack}>
          <div className={styles.flipDigitInner}>
            <span className={styles.flipDigitText}>{digit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Function to generate daily unit value between 15.0 and 20.0
function getDailyUnitValue(): string {
  // Get today's date as a seed (YYYY-MM-DD format)
  const today = new Date()
  const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  // Create a simple hash from the date string for consistent daily values
  let hash = 0
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Generate a pseudo-random number between 0 and 1 based on the hash
  const random = Math.abs((Math.sin(hash) * 10000) % 1)
  
  // Map to range 15.0 to 20.0
  const value = 15.0 + (random * 5.0)
  
  // Format to one decimal place
  return value.toFixed(1)
}

export default function BetsPage() {
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const router = useRouter()
  const [scrollProgress, setScrollProgress] = useState(0)
  const floatingContainerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [hologramVisible, setHologramVisible] = useState(false)
  const hologramRef = useRef<HTMLDivElement>(null)

  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isSignedIn) {
      openSignUp({
        redirectUrl: '/pricing'
      })
    } else {
      router.push('/pricing')
    }
  }
  const [unitValue, setUnitValue] = useState(() => getDailyUnitValue())
  const [quoteVisible, setQuoteVisible] = useState(false)
  const quoteRef = useRef<HTMLDivElement>(null)
  const [insiderViewVisible, setInsiderViewVisible] = useState(false)
  const insiderViewRef = useRef<HTMLDivElement>(null)
  const [isInsiderHovered, setIsInsiderHovered] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const dashboardPanelRef = useRef<HTMLDivElement>(null)
  const [whyBelieveVisible, setWhyBelieveVisible] = useState(false)
  const whyBelieveRef = useRef<HTMLDivElement>(null)
  const [isInsiderTapped, setIsInsiderTapped] = useState(false)

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

    // Intersection Observer for hologram board reveal
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    }

    const hologramObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setHologramVisible(true)
          hologramObserver.unobserve(entry.target)
        }
      })
    }, observerOptions)

    // Observe hologram after a small delay to ensure ref is set
    setTimeout(() => {
      if (hologramRef.current) {
        hologramObserver.observe(hologramRef.current)
      }
    }, 100)

    // Intersection Observer for quote bar reveal
    const quoteObserverOptions = {
      threshold: 0.3,
      rootMargin: '0px 0px -50px 0px'
    }

    const quoteObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setQuoteVisible(true)
          quoteObserver.unobserve(entry.target)
        }
      })
    }, quoteObserverOptions)

    setTimeout(() => {
      if (quoteRef.current) {
        quoteObserver.observe(quoteRef.current)
      }
    }, 100)

    // Intersection Observer for insider view reveal
    const insiderViewObserverOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    }

    const insiderViewObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInsiderViewVisible(true)
          insiderViewObserver.unobserve(entry.target)
        }
      })
    }, insiderViewObserverOptions)

    setTimeout(() => {
      if (insiderViewRef.current) {
        insiderViewObserver.observe(insiderViewRef.current)
      }
    }, 100)

    // Intersection Observer for why believe section reveal
    const whyBelieveObserverOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    }

    const whyBelieveObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setWhyBelieveVisible(true)
          whyBelieveObserver.unobserve(entry.target)
        }
      })
    }, whyBelieveObserverOptions)

    setTimeout(() => {
      if (whyBelieveRef.current) {
        whyBelieveObserver.observe(whyBelieveRef.current)
      }
    }, 100)


    // Update unit value daily
    const updateUnitValue = () => {
      const newValue = getDailyUnitValue()
      setUnitValue(newValue)
    }
    
    // Check daily at midnight
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const msUntilMidnight = tomorrow.getTime() - now.getTime()
    
    let intervalId: NodeJS.Timeout | null = null
    const timeoutId = setTimeout(() => {
      updateUnitValue()
      // Then update every 24 hours
      intervalId = setInterval(updateUnitValue, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)

    return () => {
      hologramObserver.disconnect()
      quoteObserver.disconnect()
      insiderViewObserver.disconnect()
      whyBelieveObserver.disconnect()
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkMobile)
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
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
              <span 
                style={{
                  opacity: 0,
                  animation: 'heroFadeIn 0.6s ease forwards',
                  animationDelay: '0s'
                } as React.CSSProperties}
              >
                Start.{' '}
              </span>
              <span 
                style={{
                  opacity: 0,
                  animation: 'heroFadeIn 0.6s ease forwards',
                  animationDelay: '0.5s'
                } as React.CSSProperties}
              >
                F*cking.{' '}
              </span>
              <span 
                style={{
                  opacity: 0,
                  animation: 'heroFadeIn 0.6s ease forwards',
                  animationDelay: '1s'
                } as React.CSSProperties}
              >
                Winning.
              </span>
              <br />
              <span 
                className={styles.heroSubtitle} 
                style={{ 
                  fontSize: '0.5em',
                  opacity: 0,
                  animation: 'heroFadeIn 0.8s ease forwards',
                  animationDelay: '0.6s',
                  display: 'inline-block',
                  marginTop: '1rem'
                } as React.CSSProperties}
              >
                It's about time you started dominating the books
              </span>
            </h1>
          </div>

          {/* Scroll indicator arrow */}
          <div className={styles.scrollIndicator}>
            <div className={styles.scrollArrow}>↓</div>
          </div>
        </div>
      </section>

      {/* Insider Live Unit Hologram Board Section */}
      <section 
        ref={hologramRef}
        className={styles.hologramBoardSection}
        style={{
          opacity: hologramVisible ? 1 : 0,
          transform: hologramVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 1.2s ease, transform 1.2s ease'
        } as React.CSSProperties}
      >
        <div className={styles.hologramBoardContainer}>
          <div 
            className={styles.hologramBoard}
            data-visible={hologramVisible}
          >
            {/* Live Feed Indicator */}
            <div 
              className={styles.liveFeedIndicator}
              style={{
                opacity: hologramVisible ? 1 : 0,
                transition: `opacity 0.8s ease ${hologramVisible ? '600ms' : '0ms'}`
              } as React.CSSProperties}
            >
              <span className={styles.liveFeedDot}></span>
              <span className={styles.liveFeedText}>LIVE FEED</span>
            </div>
            
            {/* Data Grid Background */}
            <div 
              className={styles.dataGridBackground}
              style={{
                opacity: hologramVisible ? 1 : 0,
                transition: `opacity 1.5s ease ${hologramVisible ? '800ms' : '0ms'}`
              } as React.CSSProperties}
            ></div>
            
            {/* Main Unit Display */}
            <div 
              className={styles.unitDisplay}
              style={{
                opacity: hologramVisible ? 1 : 0,
                transform: hologramVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 1s ease ${hologramVisible ? '1000ms' : '0ms'}, transform 1s ease ${hologramVisible ? '1000ms' : '0ms'}`
              } as React.CSSProperties}
            >
              <div className={styles.unitPrefix}>+</div>
              <div className={styles.unitDigits}>
                <FlipDigit digit={unitValue[0]} delay={hologramVisible ? 1200 : 0} />
                <FlipDigit digit={unitValue[1]} delay={hologramVisible ? 1400 : 0} />
                <div className={styles.unitDecimal}>.</div>
                <FlipDigit digit={unitValue[3]} delay={hologramVisible ? 1600 : 0} />
              </div>
              <div className={styles.unitLabel}>u</div>
            </div>
            
            {/* Subtitle */}
            <div 
              className={styles.unitSubtitle}
              style={{
                opacity: hologramVisible ? 1 : 0,
                transition: `opacity 0.8s ease ${hologramVisible ? '1800ms' : '0ms'}`
              } as React.CSSProperties}
            >
              in the last 30 days
            </div>
            
            {/* Dollar Context */}
            <div 
              className={styles.dollarContext}
              style={{
                opacity: hologramVisible ? 1 : 0,
                transform: hologramVisible ? 'translateX(0)' : 'translateX(-30px)',
                transition: `opacity 0.8s ease ${hologramVisible ? '2000ms' : '0ms'}, transform 0.8s ease ${hologramVisible ? '2000ms' : '0ms'}`
              } as React.CSSProperties}
            >
              a $100 Insider bettor would be up $${Math.round(parseFloat(unitValue) * 100).toLocaleString('en-US')} in the last month
            </div>
          </div>
        </div>
        
        {/* CTA Button */}
        <div 
          className={styles.hologramCtaWrapper}
          style={{
            opacity: hologramVisible ? 1 : 0,
            transform: hologramVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: `opacity 0.8s ease ${hologramVisible ? '2400ms' : '0ms'}, transform 0.8s ease ${hologramVisible ? '2400ms' : '0ms'}`
          } as React.CSSProperties}
        >
          <button onClick={handlePricingClick} className={styles.ctaButton} style={{ cursor: 'pointer', border: 'none' }}>
            Start FREE Trial
          </button>
        </div>
      </section>

      {/* Reviews Section */}
      <section className={styles.reviewsSection}>
        <div className={styles.reviewsReel}>
          <div className={styles.reviewsTrack}>
            {[...reviewEntries, ...reviewEntries].map((item, index) => {
              const Icon = item.platform === 'instagram' ? FaInstagram : FaXTwitter
              return (
                <div key={`${item.name}-${index}`} className={styles.reviewItem}>
                  <div className={styles.reviewHeading}>
                    <span className={styles.reviewName}>{item.name}</span>
                    <Icon className={styles.reviewIcon} />
                    <div className={styles.reviewStars}>
                      {[...Array(5)].map((_, starIndex) => (
                        <FaStar key={starIndex} className={styles.reviewStar} />
                      ))}
                    </div>
                  </div>
                  <p className={styles.reviewText}>"{item.review}"</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Insider's View Section */}
      <section 
        ref={insiderViewRef}
        className={styles.insiderViewSection}
        style={{
          opacity: insiderViewVisible ? 1 : 0,
          transform: insiderViewVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 1s ease, transform 1s ease'
        } as React.CSSProperties}
      >
        <div className={styles.insiderViewContainer}>
          <h2 className={styles.insiderViewTitle}>See What an Insider Sees</h2>
          <p className={styles.insiderViewSubtitle}>
            Click to reveal members-only picks
          </p>

          <div 
            ref={dashboardPanelRef}
            className={styles.insiderDashboardPanel}
            onClick={() => {
              setIsInsiderTapped(!isInsiderTapped)
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Lock Overlay */}
            <div 
              className={styles.insiderLockOverlay}
              style={{
                opacity: isInsiderTapped ? 0 : 1,
                transition: 'opacity 0.8s ease'
              } as React.CSSProperties}
            >
              <FaLock className={styles.insiderLockIcon} />
              <div className={styles.insiderHologramOverlay}></div>
            </div>


            {/* Blurred Dashboard Preview */}
            <div 
              className={styles.insiderDashboardPreview}
              style={{
                filter: isInsiderTapped
                  ? `blur(0px) brightness(1)` 
                  : `blur(15px) brightness(1)`,
                WebkitFilter: isInsiderTapped
                  ? `blur(0px) brightness(1)` 
                  : `blur(15px) brightness(1)`,
                opacity: 1,
                transition: 'filter 0.6s ease, -webkit-filter 0.6s ease'
              } as React.CSSProperties}
            >
              {/* Dashboard Header */}
              <div className={styles.insiderDashboardHeader}>
                <h3 className={styles.insiderDashboardTitle}>Today's Best Bets</h3>
                <span className={styles.insiderDashboardDate}>Dec 22, 2024</span>
              </div>

              {/* Dashboard Filters */}
              <div className={styles.insiderDashboardFilters}>
                <div className={styles.insiderDashboardFilter}>
                  <span>Cappers</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '0.5rem' }}>
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
                <div className={styles.insiderDashboardFilter}>
                  <span>Sports</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '0.5rem' }}>
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
              </div>

              {/* Dashboard Picks */}
              <div className={styles.insiderDashboardPicks}>
                {/* Pick 1 */}
                <div className={styles.insiderDashboardPick}>
                  <div className={styles.insiderPickHeader}>
                    <div className={styles.insiderPickBettor}>
                      <span className={styles.insiderPickBettorName}>Invisible Insider</span>
                      <span className={styles.insiderPickRecord}>Last 30 Days 15-6 (+7.2u)</span>
                    </div>
                    <div className={styles.insiderPickRightSide}>
                      <div className={styles.insiderPickMeta}>
                        <span>-125</span>
                        <span>-</span>
                        <span>DraftKings</span>
                      </div>
                      <span className={styles.insiderPickUnits}>1u</span>
                    </div>
                  </div>
                  <div className={styles.insiderPickTitle}>
                    Chiefs ML <span className={styles.insiderPickVs}>(vs Eagles)</span>
                  </div>
                </div>

                {/* Pick 2 */}
                <div className={styles.insiderDashboardPick}>
                  <div className={styles.insiderPickHeader}>
                    <div className={styles.insiderPickBettor}>
                      <span className={styles.insiderPickBettorName}>Insider Mike</span>
                      <span className={styles.insiderPickRecord}>Last 30 Days 21-18 (+5.7u)</span>
                    </div>
                    <div className={styles.insiderPickRightSide}>
                      <div className={styles.insiderPickMeta}>
                        <span>+105</span>
                        <span>-</span>
                        <span>FanDuel</span>
                      </div>
                      <span className={styles.insiderPickUnits}>1u</span>
                    </div>
                  </div>
                  <div className={styles.insiderPickTitle}>
                    Lakers +5.5 <span className={styles.insiderPickVs}>(vs Celtics)</span>
                  </div>
                </div>

                {/* Pick 3 */}
                <div className={styles.insiderDashboardPick}>
                  <div className={styles.insiderPickHeader}>
                    <div className={styles.insiderPickBettor}>
                      <span className={styles.insiderPickBettorName}>The Commissioner</span>
                      <span className={styles.insiderPickRecord}>Last 30 Days 24-15 (+8.6u)</span>
                    </div>
                    <div className={styles.insiderPickRightSide}>
                      <div className={styles.insiderPickMeta}>
                        <span>-110</span>
                        <span>-</span>
                        <span>BetMGM</span>
                      </div>
                      <span className={styles.insiderPickUnits}>2u</span>
                    </div>
                  </div>
                  <div className={styles.insiderPickTitle}>
                    Bills -3 <span className={styles.insiderPickVs}>(vs Ravens)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Three Step Flow */}
          <div className={styles.insiderSteps}>
            <div className={styles.insiderStep}>
              <div className={styles.insiderStepNumber}>1</div>
              <div className={styles.insiderStepText}>Sign up</div>
            </div>
            <div className={styles.insiderStepArrow}>→</div>
            <div className={styles.insiderStep}>
              <div className={styles.insiderStepNumber}>2</div>
              <div className={styles.insiderStepText}>Get Picks Instantly</div>
            </div>
            <div className={styles.insiderStepArrow}>→</div>
            <div className={styles.insiderStep}>
              <div className={styles.insiderStepNumber}>3</div>
              <div className={styles.insiderStepText}>Start Winning</div>
            </div>
          </div>

          {/* CTA Button */}
          <button onClick={handlePricingClick} className={styles.insiderCtaButton} style={{ cursor: 'pointer', border: 'none' }}>
            Start FREE Trial
          </button>
        </div>
      </section>

      {/* Quote Bar Section */}
      <section 
        ref={quoteRef}
        className={styles.quoteBarSection}
        style={{
          opacity: quoteVisible ? 1 : 0,
          transform: quoteVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 1s ease, transform 1s ease'
        } as React.CSSProperties}
      >
        <div className={styles.quoteBar}>
          <p className={styles.quoteText}>
            "If you're ready to take your sports betting game to the next level, look no further than the Insider."
          </p>
          <a 
            href="https://www.chicagotribune.com/2024/06/10/the-daily-ref-a-sports-bettors-dream/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.quoteAttribution}
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Chicago_Tribune_Logo.svg/2560px-Chicago_Tribune_Logo.svg.png" 
              alt="Chicago Tribune" 
              className={styles.chicagoTribuneLogo}
            />
          </a>
        </div>
      </section>

      {/* Why Believe Us Section */}
      <section 
        ref={whyBelieveRef}
        className={styles.whyBelieveSection}
        style={{
          opacity: whyBelieveVisible ? 1 : 0,
          transform: whyBelieveVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 1s ease, transform 1s ease'
        } as React.CSSProperties}
      >
        <div className={styles.whyBelieveContainer}>
          <h2 className={styles.whyBelieveTitle}>Why Believe Us? Three Simple Reasons</h2>

          <div className={styles.whyBelieveCards}>
            {/* Card 1 - Transparency */}
            <div className={styles.whyBelieveCard}>
              <div className={styles.whyBelieveIconWrapper}>
                <FaEye className={styles.whyBelieveIcon} />
              </div>
              <h3 className={styles.whyBelieveCardTitle}>Transparency</h3>
              <p className={styles.whyBelieveCardText}>
                Every pick is tracked publicly in real time with no hiding or filters. What you see is what we bet.
              </p>
            </div>

            {/* Card 2 - Experience */}
            <div className={styles.whyBelieveCard}>
              <div className={styles.whyBelieveIconWrapper}>
                <FaChartLine className={styles.whyBelieveIcon} />
              </div>
              <h3 className={styles.whyBelieveCardTitle}>Experience</h3>
              <p className={styles.whyBelieveCardText}>
                We've bet full-time for years and built our systems on real data, not guesswork. This is our profession.
              </p>
            </div>

            {/* Card 3 - Results */}
            <div className={styles.whyBelieveCard}>
              <div className={styles.whyBelieveIconWrapper}>
                <FaTrophy className={styles.whyBelieveIcon} />
              </div>
              <h3 className={styles.whyBelieveCardTitle}>Results</h3>
              <p className={styles.whyBelieveCardText}>
                Our members have generated thousands of units collectively over the past year, all verifiable on the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />
    </div>
  )
}

// Pricing Section Component
function PricingSection() {
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const router = useRouter()

  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isSignedIn) {
      openSignUp({
        redirectUrl: '/pricing'
      })
    } else {
      router.push('/pricing')
    }
  }

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
      <div className={styles.pricingSimpleWrapper} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div className={styles.pricingSimpleHeader} style={{ textAlign: 'center', width: '100%' }}>
          <h2 className={styles.pricingTitle}>Start Your FREE 3-Day Trial</h2>
          <p className={styles.pricingTagline}>
            Try everything for free, then choose your plan—cancel anytime.
          </p>
        </div>

        <div className={`${styles.pricingSimpleCard} ${styles.glassCard}`} style={{ width: '100%', maxWidth: '500px' }}>
          <div className={styles.glassFilter}></div>
          <div className={styles.glassOverlay}></div>
          <div className={styles.glassSpecular}></div>
          <div className={styles.pricingSimpleBody} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={styles.pricingSimpleOption} style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#fff',
                textAlign: 'center',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                3-Day FREE Trial Included
              </div>
              <h3 className={styles.pricingSimpleOptionTitle} style={{ textAlign: 'center', width: '100%' }}>Full Access</h3>
              <p className={styles.pricingSimpleDescription} style={{ textAlign: 'center', width: '100%' }}>Try everything FREE for 3 days. Unlimited picks, AI tools, props & stats.</p>

              <div className={styles.pricingSimpleTierList} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.75rem' }}>
                {unlimitedPlans.map((plan, index) => (
                  <button
                    key={plan.label}
                    type="button"
                    onClick={() => setSelectedPlanIndex(index)}
                    className={`${styles.pricingSimpleTier} ${index === selectedPlanIndex ? styles.pricingSimpleTierActive : ''}`}
                    aria-pressed={index === selectedPlanIndex}
                    style={{ width: '100%', maxWidth: '400px' }}
                  >
                    <div className={styles.pricingSimpleTierContent}>
                      <span className={styles.pricingSimpleTierPrice}>{plan.price}</span>
                      <span className={styles.pricingSimpleTierLabel}>{` / ${plan.label}`}</span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                className={`${styles.pricingSimpleButton} ${styles.pricingSimpleButtonSecondary} ${styles.glassButton}`}
                onClick={handlePricingClick}
                style={{ cursor: 'pointer', width: '100%', maxWidth: '400px' }}
              >
                <div className={styles.glassFilter}></div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.glassSpecular}></div>
                <div className={styles.glassContent}>Start FREE Trial</div>
              </button>
            </div>
          </div>

          <div className={styles.pricingSimpleFooter}>
            <span>3-Day FREE Trial • Cancel anytime • Instant access</span>
            <a
              href="https://dashboard.thebettinginsider.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Already subscribed? Go to your dashboard
            </a>
          </div>
        </div>
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
