'use client'

import { useParams, useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'
import styles from '../gamePage.module.css'

interface GameLayoutProps {
  children: React.ReactNode
}

interface GameData {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  spread: any
  totals: any
  moneyline: any
}

type TabKey = 'data' | 'picks' | 'script' | 'public-betting'

const tabLabels: Record<TabKey, string> = {
  data: 'DATA',
  picks: 'PICKS',
  script: 'SCRIPT',
  'public-betting': 'PUBLIC'
}

export default function GameLayout({ children }: GameLayoutProps) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const sport = params.sport as string
  const gameSlug = params.gameSlug as string
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Determine active tab from pathname
  const activeTab = pathname?.split('/').pop() as TabKey || 'data'
  
  useEffect(() => {
    const fetchGame = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/dashboard/game-hub?sport=${sport}`)
        const data = await res.json()
        
        // Find matching game by slug
        const game = data.games?.find((g: any) => {
          const slug = `${g.awayTeam.toLowerCase().replace(/\s+/g, '-')}-at-${g.homeTeam.toLowerCase().replace(/\s+/g, '-')}`
          return gameSlug.startsWith(slug)
        })
        
        if (game) {
          setGameData(game)
        }
      } catch (error) {
        console.error('Failed to load game:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGame()
  }, [sport, gameSlug])
  
  const handleTabClick = (tab: TabKey) => {
    router.push(`/new/${sport}/games/${gameSlug}/${tab}`)
  }
  
  const handleBackClick = () => {
    router.push(`/new/${sport}/games`)
  }
  
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }
  
  if (!gameData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Game not found</div>
      </div>
    )
  }
  
  return (
    <div className={styles.container}>
      {/* Back button */}
      <button onClick={handleBackClick} className={styles.backButton}>
        <FaArrowLeft /> {gameData.awayTeam} @ {gameData.homeTeam}
      </button>
      
      {/* Game Header */}
      <div className={styles.gameHeader}>
        <div className={styles.teams}>
          {gameData.awayTeamLogo && (
            <img src={gameData.awayTeamLogo} alt={gameData.awayTeam} className={styles.teamLogo} />
          )}
          <span className={styles.at}>@</span>
          {gameData.homeTeamLogo && (
            <img src={gameData.homeTeamLogo} alt={gameData.homeTeam} className={styles.teamLogo} />
          )}
        </div>
        
        <div className={styles.bettingLines}>
          <div className={styles.line}>
            <span className={styles.lineLabel}>Away spread</span>
            <span className={styles.lineValue}>
              {gameData.spread?.away_line ? `${gameData.spread.away_line > 0 ? '+' : ''}${gameData.spread.away_line}` : '-'}
            </span>
          </div>
          
          <div className={styles.line}>
            <span className={styles.lineLabel}>O/U</span>
            <span className={styles.lineValue}>
              {gameData.totals?.number || '-'}
            </span>
          </div>
          
          <div className={styles.line}>
            <span className={styles.lineLabel}>Home spread</span>
            <span className={styles.lineValue}>
              {gameData.spread?.home_line ? `${gameData.spread.home_line > 0 ? '+' : ''}${gameData.spread.home_line}` : '-'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <nav className={styles.tabBar}>
        {Object.entries(tabLabels).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.tabButton} ${activeTab === key ? styles.tabButtonActive : ''}`}
            onClick={() => handleTabClick(key as TabKey)}
          >
            {label}
          </button>
        ))}
      </nav>
      
      {/* Tab Content */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}

