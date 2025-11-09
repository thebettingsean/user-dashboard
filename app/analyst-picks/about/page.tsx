'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DotGrid from '../../../components/hero/DotGrid'
import { ChromaGrid } from '../../../components/hero/ChromaGrid'
import styles from '../../../components/hero/hero-new.module.css'
import { PiMoneyWavyBold } from "react-icons/pi"
import { LuScrollText } from "react-icons/lu"
import { MdAutoGraph } from "react-icons/md"

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
            <h1 className={styles.heroTitleNew}>
              <DecryptedText text="We ❤️ the Sportsbooks" delay={300} />
              <span className={styles.heroSubtitleNew}>
                <DecryptedText text="Because we have the " delay={1500} />
                <span className={styles.underlinedWord}>
                  <DecryptedText text="picks" delay={1800} />
                </span>
                <DecryptedText text=" that beat them" delay={2000} />
              </span>
            </h1>
            
            {/* Live indicator */}
            <div className={styles.liveIndicator}>
              <span className={styles.blinkingDot} />
              <span className={styles.liveText}>Today's picks are live</span>
            </div>
          </div>

          <div className={styles.scrollIndicator}>
            <div className={styles.scrollArrow}>↓</div>
          </div>
        </div>
      </section>

      {/* Two Cards Section */}
      <section className={styles.twoCardsSection}>
        {/* Card 1 - Expert Picks & Scripts (slides from left) */}
        <div className={styles.cardSlideLeft}>
          <div className={styles.featureCard}>
            <div className={styles.cardHeaderRow}>
              <h3 className={styles.cardHeaderTitle}>Expert Picks & Scripts</h3>
              <img 
                src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/690f85eb2a1078147a2baa4e_ALL%20logos.svg" 
                alt="Sports badges" 
                className={styles.sportBadge}
              />
            </div>
            <div className={styles.cardContentLeft}>
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <PiMoneyWavyBold className={styles.featureIcon} />
                  <span>Daily 60%+ system picks</span>
                </div>
                <div className={styles.featureItem}>
                  <LuScrollText className={styles.featureIcon} />
                  <span>Full game scripts</span>
                </div>
                <div className={styles.featureItem}>
                  <MdAutoGraph className={styles.featureIcon} />
                  <span>Top Props, 80%+</span>
                </div>
              </div>
            </div>
            <div className={styles.cardFooterRight}>
              <p className={styles.miniTagline}>All records are tracked for transparency</p>
            </div>
          </div>
        </div>

        {/* Card 2 - Start Winning (slides from right) */}
        <div className={styles.cardSlideRight}>
          <div className={styles.featureCard}>
            <div className={styles.cardTopLeft}>
              <h3 className={styles.cardTitle}>Start Winning Today</h3>
              <p className={styles.cardDescription}>
                Our members actually profit.
              </p>
            </div>
            
            <div className={styles.testimonialNew}>
              <p className={styles.quote}>
                "With the Insiders by your side, the possibilities are endless."
              </p>
              <div className={styles.laWeeklyBadge}>
                <img 
                  src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/690fb40d2e63b8d4b1a2df83_LA%20WEEKLY.svg" 
                  alt="LA Weekly" 
                  className={styles.laWeeklyLogo}
                />
              </div>
            </div>

            <div className={styles.ctaHorizontal}>
              <span className={styles.ctaText}>Your path to profit</span>
              <button
                className={styles.ctaButton}
                onClick={() => window.location.href = 'https://dashboard.thebettinginsider.com/pricing'}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorksNew}>
        <h2 className={styles.howItWorksTitle}>How it works</h2>
        
        <div className={styles.howItWorksGrid}>
          {/* Box 1 - Expert Picks */}
          <div className={styles.howItWorksCard}>
            <h3 className={styles.howItWorksCardTitle}>Expert Picks</h3>
            <p className={styles.howItWorksCardTagline}>From winning bettors</p>
            <ul className={styles.howItWorksList}>
              <li>Daily picks + analysis</li>
              <li>All sports covered</li>
              <li>Turn on/off notifications</li>
            </ul>
          </div>

          {/* Box 2 - Game Scripts */}
          <div className={styles.howItWorksCard}>
            <h3 className={styles.howItWorksCardTitle}>Game Scripts</h3>
            <p className={styles.howItWorksCardTagline}>Everything about the game</p>
            <ul className={styles.howItWorksList}>
              <li>Claude AI engine → our data.</li>
              <li>30+ data points each script.</li>
              <li>Analyst picks mixed in!</li>
            </ul>
          </div>

          {/* Box 3 - The Results */}
          <div className={styles.howItWorksCard}>
            <h3 className={styles.howItWorksCardTitle}>The Results</h3>
            <p className={styles.howItWorksCardTagline}>Consistent growth</p>
            <ul className={styles.howItWorksList}>
              <li>Deep knowledge about all games.</li>
              <li>Daily wins, monthly growth.</li>
              <li>Constant profits, no questions.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
