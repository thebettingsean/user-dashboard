'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronRight, FiClock } from 'react-icons/fi'
import styles from './games.module.css'

interface Game {
  id: string
  awayTeam: string
  homeTeam: string
  awayTeamAbbr: string
  homeTeamAbbr: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  awayTeamColor: string | null
  homeTeamColor: string | null
  kickoff: string
  kickoffLabel: string
  sport: string
  spread: { homeLine: number | null; awayLine: number | null } | null
  totals: { number: number | null } | null
  moneyline: { home: number | null; away: number | null } | null
  publicBetting: {
    spreadHomeBetPct: number | null
    spreadHomeMoneyPct: number | null
    mlHomeBetPct: number | null
    mlHomeMoneyPct: number | null
    totalOverBetPct: number | null
    totalOverMoneyPct: number | null
  } | null
  hasPublicBetting: boolean
}

const SPORTS = ['all', 'nfl', 'nba', 'nhl', 'cfb']

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

function formatSpread(spread: number | null | undefined): string {
  if (spread === null || spread === undefined) return ''
  return spread > 0 ? `+${spread}` : `${spread}`
}

// Helper to create team gradient
function getTeamGradient(awayColor: string | null, homeColor: string | null): string {
  // Default colors if team colors not available
  const away = awayColor || '#3b82f6'
  const home = homeColor || '#6366f1'
  
  // Create a subtle, lowkey gradient using team colors at low opacity
  return `linear-gradient(135deg, ${away}15 0%, ${away}08 25%, transparent 50%, ${home}08 75%, ${home}15 100%)`
}

// Featured Game Card - Large, prominent display
function FeaturedGameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const teamGradient = getTeamGradient(game.awayTeamColor, game.homeTeamColor)
  
  return (
    <div 
      className={styles.featuredCard} 
      onClick={onClick}
      style={{ background: teamGradient }}
    >
      <div className={styles.featuredBadge}>Featured Game</div>
      
      <div className={styles.featuredMatchup}>
        <div className={styles.featuredTeam}>
          {game.awayTeamLogo && (
            <img src={game.awayTeamLogo} alt={game.awayTeam} className={styles.featuredLogo} />
          )}
          <span className={styles.featuredTeamName}>{game.awayTeam}</span>
          {game.spread?.awayLine && (
            <span className={styles.teamSpread}>{formatSpread(game.spread.awayLine)}</span>
          )}
        </div>
        
        <div className={styles.featuredVs}>
          <span className={styles.atSymbol}>@</span>
        </div>
        
        <div className={styles.featuredTeam}>
          {game.homeTeamLogo && (
            <img src={game.homeTeamLogo} alt={game.homeTeam} className={styles.featuredLogo} />
          )}
          <span className={styles.featuredTeamName}>{game.homeTeam}</span>
          {game.spread?.homeLine && (
            <span className={styles.teamSpread}>{formatSpread(game.spread.homeLine)}</span>
          )}
        </div>
      </div>
      
      <div className={styles.featuredMeta}>
        <div className={styles.featuredTime}>
          <FiClock size={14} />
          <span>{formatGameTime(game.kickoff)}</span>
        </div>
        <span className={styles.sportBadge}>{game.sport}</span>
      </div>
      
      {/* Odds Summary Row */}
      {(game.totals?.number || game.moneyline) && (
        <div className={styles.oddsRow}>
          {game.totals?.number && (
            <div className={styles.oddsItem}>
              <span className={styles.oddsLabel}>Total</span>
              <span className={styles.oddsValue}>O/U {game.totals.number}</span>
            </div>
          )}
          {game.moneyline && (
            <div className={styles.oddsItem}>
              <span className={styles.oddsLabel}>ML</span>
              <span className={styles.oddsValue}>
                {game.moneyline.away && (game.moneyline.away > 0 ? `+${game.moneyline.away}` : game.moneyline.away)} / {game.moneyline.home && (game.moneyline.home > 0 ? `+${game.moneyline.home}` : game.moneyline.home)}
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className={styles.featuredCta}>
        View Game Details
        <FiChevronRight size={16} />
      </div>
    </div>
  )
}

// Regular Game Card - Compact grid item
function GameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  return (
    <div className={styles.gameCard} onClick={onClick}>
      <div className={styles.cardHeader}>
        <span className={styles.cardSport}>{game.sport}</span>
        <span className={styles.cardTime}>{formatGameTime(game.kickoff)}</span>
      </div>
      
      <div className={styles.cardMatchup}>
        <div className={styles.cardTeamRow}>
          {game.awayTeamLogo && (
            <img src={game.awayTeamLogo} alt={game.awayTeam} className={styles.cardLogo} />
          )}
          <span className={styles.cardTeamName}>{game.awayTeam}</span>
          {game.spread?.awayLine && (
            <span className={styles.cardSpread}>{formatSpread(game.spread.awayLine)}</span>
          )}
        </div>
        <div className={styles.cardTeamRow}>
          {game.homeTeamLogo && (
            <img src={game.homeTeamLogo} alt={game.homeTeam} className={styles.cardLogo} />
          )}
          <span className={styles.cardTeamName}>{game.homeTeam}</span>
          {game.spread?.homeLine && (
            <span className={styles.cardSpread}>{formatSpread(game.spread.homeLine)}</span>
          )}
        </div>
      </div>
      
      <div className={styles.cardFooter}>
        <span>View Details</span>
        <FiChevronRight size={14} />
      </div>
    </div>
  )
}

export default function GamesPage() {
  const router = useRouter()
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [allGames, setAllGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function fetchGames() {
      setIsLoading(true)
      const games: Game[] = []
      
      // Fetch games for each sport using new unified API
      const sportIds = ['nfl', 'nba', 'nhl', 'cfb']
      
      for (const sportId of sportIds) {
        try {
          const res = await fetch(`/api/games/upcoming?sport=${sportId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.games && data.games.length > 0) {
              games.push(...data.games)
            }
          }
        } catch (error) {
          console.error(`Error fetching ${sportId} games:`, error)
        }
      }
      
      // Sort by kickoff time
      games.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      
      setAllGames(games)
      setIsLoading(false)
    }
    
    fetchGames()
  }, [])
  
  // Filter games by selected sport
  const filteredGames = selectedSport === 'all' 
    ? allGames 
    : allGames.filter(g => g.sport.toLowerCase() === selectedSport)
  
  // Featured game is the first game (soonest)
  const featuredGame = filteredGames[0]
  const remainingGames = filteredGames.slice(1)
  
  const handleGameClick = (game: Game) => {
    router.push(`/games/${game.id}?sport=${game.sport.toLowerCase()}`)
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Games</h1>
            </div>
            <p className={styles.subtitle}>
              Browse upcoming games across all sports
            </p>
          </div>
        </div>
        
        {/* Filters Row - Matching /picks exactly */}
        <div className={styles.filtersRow}>
          <div className={styles.leftFilters}>
            <div className={styles.sportFilters}>
              {SPORTS.map(sport => (
                <button
                  key={sport}
                  className={`${styles.filterBtn} ${selectedSport === sport ? styles.active : ''}`}
                  onClick={() => setSelectedSport(sport)}
                >
                  {sport === 'all' ? 'All' : sport.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      
      {/* Games Content */}
      <div className={styles.gamesContent}>
        {isLoading ? (
          <div className={styles.loading}>Loading games...</div>
        ) : filteredGames.length === 0 ? (
          <div className={styles.empty}>
            <p>No upcoming games found</p>
          </div>
        ) : (
          <>
            {/* Featured Game */}
            {featuredGame && (
              <FeaturedGameCard 
                game={featuredGame}
                onClick={() => handleGameClick(featuredGame)}
              />
            )}
            
            {/* Games Grid */}
            {remainingGames.length > 0 && (
              <div className={styles.gamesGrid}>
                {remainingGames.map(game => (
                  <GameCard 
                    key={game.id} 
                    game={game}
                    onClick={() => handleGameClick(game)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
