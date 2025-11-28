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
  awayTeamRank?: number | null
  homeTeamRank?: number | null
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
          // Debug spread data
          if (game.awayTeam?.toLowerCase().includes('bear') || game.awayTeam?.toLowerCase().includes('eagle') || 
              game.homeTeam?.toLowerCase().includes('bear') || game.homeTeam?.toLowerCase().includes('eagle')) {
            console.log('[GAME LAYOUT DEBUG] Game:', game.awayTeam, '@', game.homeTeam)
            console.log('[GAME LAYOUT DEBUG] Spread object:', game.spread)
            console.log('[GAME LAYOUT DEBUG] spread.awayLine:', game.spread?.awayLine)
            console.log('[GAME LAYOUT DEBUG] spread.homeLine:', game.spread?.homeLine)
          }
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
    router.push(`/sports/${sport}/games/${gameSlug}/${tab}`)
  }
  
  const handleBackClick = () => {
    router.push(`/sports/${sport}/games`)
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
  
  // Format date
  const formatDate = () => {
    const date = new Date(gameData.kickoff)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    return `${month} ${day}, ${gameData.kickoffLabel}`
  }

  return (
    <div className={styles.container}>
      {/* Back button */}
      <button onClick={handleBackClick} className={styles.backButton}>
        <FaArrowLeft /> Back
      </button>
      
      {/* Game Header */}
      <div className={styles.gameHeader}>
        <div className={styles.gameTitle}>
          {gameData.awayTeam.toUpperCase()} @ {gameData.homeTeam.toUpperCase()}
        </div>
        
        <div className={styles.teams}>
          {gameData.awayTeamLogo && (
            <div className={styles.teamLogoWrapper}>
              <img src={gameData.awayTeamLogo} alt={gameData.awayTeam} className={styles.teamLogo} />
              {/* Ranking badge for away team (CFB only) */}
              {(sport === 'college-football' || sport === 'cfb') && gameData.awayTeamRank && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)',
                  zIndex: 1
                }}>
                  #{gameData.awayTeamRank}
                </div>
              )}
            </div>
          )}
          {gameData.homeTeamLogo && (
            <div className={styles.teamLogoWrapper}>
              <img src={gameData.homeTeamLogo} alt={gameData.homeTeam} className={styles.teamLogo} />
              {/* Ranking badge for home team (CFB only) */}
              {(sport === 'college-football' || sport === 'cfb') && gameData.homeTeamRank && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)',
                  zIndex: 1
                }}>
                  #{gameData.homeTeamRank}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.bettingLines}>
          {sport === 'nhl' ? (
            // NHL: Show moneylines (Away ML | OU | Home ML)
            <>
              <span className={styles.lineValue}>
                {gameData.moneyline?.away != null 
                  ? `${gameData.moneyline.away > 0 ? '+' : ''}${gameData.moneyline.away}` 
                  : '-'}
              </span>
              
              <span className={styles.lineDivider}>|</span>
              
              <span className={styles.lineValue}>
                {gameData.totals?.number ? `o${gameData.totals.number}` : '-'}
              </span>
              
              <span className={styles.lineDivider}>|</span>
              
              <span className={styles.lineValue}>
                {gameData.moneyline?.home != null 
                  ? `${gameData.moneyline.home > 0 ? '+' : ''}${gameData.moneyline.home}` 
                  : '-'}
              </span>
            </>
          ) : (
            // NFL/NBA/CFB: Show spreads (Away Spread | OU | Home Spread)
            <>
              <span className={styles.lineValue}>
                {gameData.spread?.awayLine != null 
                  ? `${gameData.spread.awayLine > 0 ? '+' : ''}${gameData.spread.awayLine}` 
                  : '-'}
              </span>
              
              <span className={styles.lineDivider}>|</span>
              
              <span className={styles.lineValue}>
                {gameData.totals?.number || '-'}
              </span>
              
              <span className={styles.lineDivider}>|</span>
              
              <span className={styles.lineValue}>
                {gameData.spread?.homeLine != null 
                  ? `${gameData.spread.homeLine > 0 ? '+' : ''}${gameData.spread.homeLine}` 
                  : '-'}
              </span>
            </>
          )}
        </div>
        
        <div className={styles.gameTime}>{formatDate()}</div>
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

