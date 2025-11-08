'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DotGrid from '../../../components/hero/DotGrid'
import { ChromaGrid } from '../../../components/hero/ChromaGrid'
import styles from '../../../components/hero/hero-new.module.css'

// Decrypted Text Animation Component
function DecryptedText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [chars, setChars] = useState<string[]>([])
  const [decrypted, setDecrypted] = useState<boolean[]>([])

  useEffect(() => {
    const letters = text.split('')
    setChars(letters)
    setDecrypted(new Array(letters.length).fill(false))

    const totalDuration = 2000
    const delayPerChar = totalDuration / letters.length

    letters.forEach((_, i) => {
      setTimeout(() => {
        setDecrypted((prev) => {
          const newState = [...prev]
          newState[i] = true
          return newState
        })
      }, delay + i * delayPerChar)
    })
  }, [text, delay])

  return (
    <span className={styles.decryptedText}>
      {chars.map((char, i) => {
        if (char === ' ') {
          return <span key={i} className={styles.space}> </span>
        }
        return (
          <span
            key={i}
            className={decrypted[i] ? styles.decrypted : ''}
            style={{
              color: decrypted[i] ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'
            }}
          >
            {decrypted[i] ? char : String.fromCharCode(33 + Math.floor(Math.random() * 94))}
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
    subtitle: 'AI-powered betting insights',
    borderColor: '#F59E0B',
    gradient: 'linear-gradient(145deg, rgba(245, 158, 11, 0.15), rgba(0, 0, 0, 0.3))',
    buttonText: 'View Expert Picks',
    buttonUrl: '/analyst-picks',
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
    buttonUrl: '/',
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
    buttonUrl: '/',
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
    buttonUrl: '/',
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
    buttonUrl: '/prop-parlay-tool',
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
    buttonUrl: '/fantasy',
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

export default function HeroNewPage() {
  const router = useRouter()
  const [ctaButtonVisible, setCtaButtonVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setCtaButtonVisible(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={styles.heroNewPage}>
      {/* Gradient Orbs */}
      <div className={styles.gradientOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
        <div className={styles.orb4} />
      </div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        {/* Gradient streaks */}
        <div className={styles.heroGradientLine} data-direction="left" data-position="high" />
        <div className={styles.heroGradientLine} data-direction="right" data-position="mid" />
        <div className={styles.heroGradientLine} data-direction="left" data-position="low" />

        <div className={styles.heroContainer}>
          <div className={styles.centralMessage}>
            <div className={styles.glassBackground} />
            <h1 className={styles.heroTitle}>
              <DecryptedText text="We ❤️ the Sportsbooks" delay={300} />
              <span className={styles.heroSubtitle}>
                <DecryptedText text="Because we have the picks that beat them" delay={1500} />
              </span>
            </h1>
          </div>

          <div className={styles.scrollIndicator}>
            <div className={styles.scrollArrow}>↓</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.dotGridWrapper}>
          <DotGrid
            dotSize={12}
            gap={28}
            baseColor="#5227FF"
            activeColor="#8b5cf6"
            proximity={140}
            speedTrigger={80}
            shockRadius={220}
            shockStrength={4}
          />
        </div>

        <div className={styles.ctaGradientLine} />

        <div className={styles.ctaContainer}>
          <div className={styles.ctaGlassCard}>
            <h2 className={styles.ctaText}>
              Ready to start winning?
            </h2>
            <div className={`${styles.ctaButtonWrapper} ${ctaButtonVisible ? styles.ctaButtonVisible : ''}`}>
              <button
                className={styles.ctaButton}
                onClick={() => router.push('/pricing')}
              >
                Get Started
              </button>
            </div>
          </div>

          <div className={styles.ctaLearnMore}>
            <span>Learn more about our tools</span>
            <span className={styles.ctaArrow}>↓</span>
          </div>
        </div>
      </section>

      {/* ChromaGrid Section */}
      <section className={styles.chromaGridSection}>
        <h2 className={styles.chromaGridHeader}>Everything You Need to Win</h2>
        <p className={styles.chromaGridSubheader}>
          Access expert picks, real-time data, and advanced analytics all in one place
        </p>
        <ChromaGrid items={chromaGridDemo} columns={3} />
      </section>
    </div>
  )
}
