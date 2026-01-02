'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronRight, FiClock, FiCalendar } from 'react-icons/fi'
import { GiAmericanFootballBall, GiBasketballBall, GiHockey } from 'react-icons/gi'
import styles from './games.module.css'

interface Game {
  id: string
  game_id: string
  away_team: string
  home_team: string
  away_team_logo?: string
  home_team_logo?: string
  game_date: string
  sport: string
  spread?: { homeLine: number | null; awayLine: number | null }
  totals?: { number: number | null }
}

interface SportGames {
  sport: string
  sportLabel: string
  games: Game[]
}

const SPORTS = [
  { id: 'nfl', label: 'NFL', icon: GiAmericanFootballBall },
  { id: 'nba', label: 'NBA', icon: GiBasketballBall },
  { id: 'nhl', label: 'NHL', icon: GiHockey },
  { id: 'cfb', label: 'NCAAF', icon: GiAmericanFootballBall },
]

function formatGameTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  
  if (isToday) return `Today ${timeStr}`
  if (isTomorrow) return `Tomorrow ${timeStr}`
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function GameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  return (
    <div className={styles.gameCard} onClick={onClick}>
      <div className={styles.gameTeams}>
        <div className={styles.team}>
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt={game.away_team} className={styles.teamLogo} />
          )}
          <span className={styles.teamName}>{game.away_team}</span>
        </div>
        <span className={styles.atSymbol}>@</span>
        <div className={styles.team}>
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt={game.home_team} className={styles.teamLogo} />
          )}
          <span className={styles.teamName}>{game.home_team}</span>
        </div>
      </div>
      
      <div className={styles.gameInfo}>
        <div className={styles.gameTime}>
          <FiClock size={12} />
          <span>{formatGameTime(game.game_date)}</span>
        </div>
        {game.spread?.homeLine && (
          <div className={styles.gameSpread}>
            <span>Spread: {game.spread.homeLine > 0 ? '+' : ''}{game.spread.homeLine}</span>
          </div>
        )}
      </div>
      
      <div className={styles.gameArrow}>
        <FiChevronRight size={18} />
      </div>
    </div>
  )
}

export default function GamesPage() {
  const router = useRouter()
  const [activeSport, setActiveSport] = useState<string>('all')
  const [sportGames, setSportGames] = useState<SportGames[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function fetchGames() {
      setIsLoading(true)
      const allSportGames: SportGames[] = []
      
      for (const sport of SPORTS) {
        try {
          const res = await fetch(`/api/dashboard/game-hub?sport=${sport.id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.games && data.games.length > 0) {
              allSportGames.push({
                sport: sport.id,
                sportLabel: sport.label,
                games: data.games.map((g: any) => ({
                  id: g.id,
                  game_id: g.id,
                  away_team: g.awayTeam,
                  home_team: g.homeTeam,
                  away_team_logo: g.awayTeamLogo,
                  home_team_logo: g.homeTeamLogo,
                  game_date: g.kickoff,
                  sport: sport.label,
                  spread: g.spread,
                  totals: g.totals,
                }))
              })
            }
          }
        } catch (error) {
          console.error(`Error fetching ${sport.label} games:`, error)
        }
      }
      
      setSportGames(allSportGames)
      setIsLoading(false)
    }
    
    fetchGames()
  }, [])
  
  const filteredGames = activeSport === 'all' 
    ? sportGames 
    : sportGames.filter(sg => sg.sport === activeSport)
  
  const totalGames = filteredGames.reduce((sum, sg) => sum + sg.games.length, 0)
  
  const handleGameClick = (game: Game, sport: string) => {
    router.push(`/games/${game.id}?sport=${sport}`)
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Games</h1>
        <p className={styles.subtitle}>
          Browse upcoming games across all sports
        </p>
      </header>
      
      {/* Sport Filter Tabs */}
      <div className={styles.sportTabs}>
        <button 
          className={`${styles.sportTab} ${activeSport === 'all' ? styles.sportTabActive : ''}`}
          onClick={() => setActiveSport('all')}
        >
          All Sports
        </button>
        {SPORTS.map(sport => {
          const SportIcon = sport.icon
          const hasGames = sportGames.some(sg => sg.sport === sport.id && sg.games.length > 0)
          return (
            <button 
              key={sport.id}
              className={`${styles.sportTab} ${activeSport === sport.id ? styles.sportTabActive : ''} ${!hasGames ? styles.sportTabDisabled : ''}`}
              onClick={() => hasGames && setActiveSport(sport.id)}
              disabled={!hasGames}
            >
              <SportIcon size={14} />
              {sport.label}
            </button>
          )
        })}
      </div>
      
      {/* Games List */}
      <div className={styles.gamesSection}>
        {isLoading ? (
          <div className={styles.loading}>Loading games...</div>
        ) : totalGames === 0 ? (
          <div className={styles.empty}>
            <FiCalendar size={32} />
            <p>No upcoming games found</p>
          </div>
        ) : (
          filteredGames.map(sportGroup => (
            <div key={sportGroup.sport} className={styles.sportGroup}>
              <div className={styles.sportHeader}>
                <h2 className={styles.sportTitle}>{sportGroup.sportLabel}</h2>
                <span className={styles.gameCount}>{sportGroup.games.length} games</span>
              </div>
              <div className={styles.gamesList}>
                {sportGroup.games.map(game => (
                  <GameCard 
                    key={game.id} 
                    game={game}
                    onClick={() => handleGameClick(game, sportGroup.sport)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
