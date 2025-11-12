'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { parseGameSlug } from '../../../../lib/utils/gameSlug'
import styles from './gamePage.module.css'

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

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const sport = params.sport as string
  const gameSlug = params.gameSlug as string
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchGameData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Parse the slug to get team names and date
        const parsed = parseGameSlug(gameSlug)
        if (!parsed) {
          setError('Invalid game URL')
          setIsLoading(false)
          return
        }
        
        // Fetch all games for the sport to find the matching one
        const response = await fetch(`/api/dashboard/game-hub?sport=${sport}`)
        if (!response.ok) {
          throw new Error('Failed to fetch game data')
        }
        
        const data = await response.json()
        
        // Find the game that matches the slug
        const game = data.games?.find((g: GameData) => {
          const gameDate = new Date(g.kickoff)
          const slugDate = new Date()
          slugDate.setMonth(
            ['january', 'february', 'march', 'april', 'may', 'june',
             'july', 'august', 'september', 'october', 'november', 'december']
            .indexOf(parsed.month)
          )
          slugDate.setDate(parsed.day)
          
          return (
            g.awayTeam.toLowerCase().replace(/\s+/g, '-') === parsed.awayTeam &&
            g.homeTeam.toLowerCase().replace(/\s+/g, '-') === parsed.homeTeam &&
            gameDate.getMonth() === slugDate.getMonth() &&
            gameDate.getDate() === slugDate.getDate()
          )
        })
        
        if (!game) {
          setError('Game not found')
          setIsLoading(false)
          return
        }
        
        setGameData(game)
      } catch (err) {
        console.error('Error fetching game:', err)
        setError('Failed to load game data')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGameData()
  }, [sport, gameSlug])
  
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading game...</div>
      </div>
    )
  }
  
  if (error || !gameData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {error || 'Game not found'}
          <button onClick={() => router.push(`/${sport}/games`)} className={styles.backButton}>
            ← Back to Games
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.push(`/${sport}/games`)} className={styles.backButton}>
          ← Back to Games
        </button>
      </div>
      
      <div className={styles.gameHeader}>
        <div className={styles.teams}>
          <div className={styles.team}>
            {gameData.awayTeamLogo && (
              <img src={gameData.awayTeamLogo} alt={gameData.awayTeam} className={styles.teamLogo} />
            )}
            <h2>{gameData.awayTeam}</h2>
          </div>
          
          <div className={styles.at}>@</div>
          
          <div className={styles.team}>
            {gameData.homeTeamLogo && (
              <img src={gameData.homeTeamLogo} alt={gameData.homeTeam} className={styles.teamLogo} />
            )}
            <h2>{gameData.homeTeam}</h2>
          </div>
        </div>
        
        <div className={styles.gameTime}>{gameData.kickoffLabel}</div>
      </div>
      
      <div className={styles.comingSoon}>
        <h3>Individual Game Pages Coming Soon</h3>
        <p>We're building detailed game pages with all the data you need:</p>
        <ul>
          <li>Game overview & key stats</li>
          <li>Analyst picks for this game</li>
          <li>AI-generated game script</li>
          <li>Public betting trends</li>
          <li>Top player props</li>
        </ul>
      </div>
    </div>
  )
}

