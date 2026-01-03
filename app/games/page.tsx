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
  estDate?: string
  estTime?: string
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
  signals?: {
    spread: {
      home: { publicRespect: number; vegasBacked: number; whaleRespect: number }
      away: { publicRespect: number; vegasBacked: number; whaleRespect: number }
    }
    total: {
      over: { publicRespect: number; vegasBacked: number; whaleRespect: number }
      under: { publicRespect: number; vegasBacked: number; whaleRespect: number }
    }
    ml: {
      home: { publicRespect: number; vegasBacked: number; whaleRespect: number }
      away: { publicRespect: number; vegasBacked: number; whaleRespect: number }
    }
  }
  hasPublicBetting: boolean
  pickCount?: number
  signalCount?: number
}

const SPORTS = ['nfl', 'nba', 'nhl', 'cfb', 'cbb']

function formatGameTime(dateString: string): string {
  // dateString is now "YYYY-MM-DD HH:MM" in EST from ClickHouse
  // Parse it and compare dates in EST, not browser timezone
  
  // Get current date in EST
  const nowEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  const todayEST = new Date(nowEST).toISOString().split('T')[0]
  
  const tomorrowDate = new Date(nowEST)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowEST = tomorrowDate.toISOString().split('T')[0]
  
  // Extract date from dateString (YYYY-MM-DD HH:MM)
  const gameDate = dateString.split(' ')[0]
  const gameTime = dateString.split(' ')[1]
  
  if (!gameTime) {
    // Fallback to old behavior if format is different
    return dateString
  }
  
  // Parse time (HH:MM in 24hr) to 12hr format
  const [hours, minutes] = gameTime.split(':').map(Number)
  const hour12 = hours % 12 || 12
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const timeStr = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  
  if (gameDate === todayEST) return `Today ${timeStr}`
  if (gameDate === tomorrowEST) return `Tomorrow ${timeStr}`
  
  // For other dates, show full date
  const date = new Date(dateString + ' EST')
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  }) + ` ${timeStr}`
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
          <span>{formatGameTime(game.kickoffLabel)}</span>
        </div>
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

// Count signals for a game - uses actual signal data from API
function countSignals(game: Game): number {
  if (!game.signals) return 0
  
  let signalCount = 0
  const s = game.signals
  
  // Count all non-zero signals across all bet types
  // Spread signals
  if (s.spread.home.publicRespect > 0) signalCount++
  if (s.spread.home.vegasBacked > 0) signalCount++
  if (s.spread.home.whaleRespect > 0) signalCount++
  if (s.spread.away.publicRespect > 0) signalCount++
  if (s.spread.away.vegasBacked > 0) signalCount++
  if (s.spread.away.whaleRespect > 0) signalCount++
  
  // ML signals
  if (s.ml.home.publicRespect > 0) signalCount++
  if (s.ml.home.vegasBacked > 0) signalCount++
  if (s.ml.home.whaleRespect > 0) signalCount++
  if (s.ml.away.publicRespect > 0) signalCount++
  if (s.ml.away.vegasBacked > 0) signalCount++
  if (s.ml.away.whaleRespect > 0) signalCount++
  
  // Total signals
  if (s.total.over.publicRespect > 0) signalCount++
  if (s.total.over.vegasBacked > 0) signalCount++
  if (s.total.over.whaleRespect > 0) signalCount++
  if (s.total.under.publicRespect > 0) signalCount++
  if (s.total.under.vegasBacked > 0) signalCount++
  if (s.total.under.whaleRespect > 0) signalCount++
  
  return signalCount
}

// Regular Game Card - Compact grid item
function GameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const teamGradient = getTeamGradient(game.awayTeamColor, game.homeTeamColor)
  const signals = countSignals(game)
  
  return (
    <div 
      className={styles.gameCard} 
      onClick={onClick}
      style={{ background: teamGradient }}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardSport}>{game.sport}</span>
        <span className={styles.cardTime}>{formatGameTime(game.kickoffLabel)}</span>
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
      
      {/* Picks, Signals, Script info */}
      <div className={styles.cardInfo}>
        <span className={styles.cardInfoItem}>Picks: {game.pickCount || 0}</span>
        <span className={styles.cardInfoDot}>•</span>
        <span className={styles.cardInfoItem}>Signals: {signals}</span>
        <span className={styles.cardInfoDot}>•</span>
        <span className={styles.cardInfoItem}>Script: <span className={styles.cardInfoBadge}>(Basic)</span></span>
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
  const [selectedSport, setSelectedSport] = useState<string>('nfl')
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Cache to avoid refetching already loaded sports
  const [gamesCache, setGamesCache] = useState<Record<string, Game[]>>({})
  
  useEffect(() => {
    async function fetchGamesForSport() {
      // Check if we already have this sport cached
      if (gamesCache[selectedSport]) {
        setGames(gamesCache[selectedSport])
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      
      try {
        const res = await fetch(`/api/games/upcoming?sport=${selectedSport}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.games) {
            // Sort by kickoff time
            const sortedGames = data.games.sort(
              (a: Game, b: Game) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
            )
            
            // Fetch pick counts for all games in parallel
            const gamesWithCounts = await Promise.all(
              sortedGames.map(async (game: Game) => {
                try {
                  // Pass team names to API for matching
                  const params = new URLSearchParams({
                    gameId: game.id,
                    sport: game.sport,
                    awayTeam: game.awayTeam,
                    homeTeam: game.homeTeam
                  })
                  const pickRes = await fetch(`/api/picks/active-counts?${params.toString()}`)
                  if (pickRes.ok) {
                    const pickData = await pickRes.json()
                    console.log(`[Games] Pick count for ${game.id} (${game.awayTeam} @ ${game.homeTeam}):`, pickData.gamePickCount)
                    return {
                      ...game,
                      pickCount: pickData.success ? (pickData.gamePickCount || 0) : 0
                    }
                  }
                  return { ...game, pickCount: 0 }
                } catch (err) {
                  console.error(`[Games] Error fetching picks for ${game.id}:`, err)
                  return { ...game, pickCount: 0 }
                }
              })
            )
            
            // Log sample game data for debugging
            if (gamesWithCounts.length > 0) {
              const sample = gamesWithCounts[0]
              console.log('[Games] Sample game data:', {
                id: sample.id,
                teams: `${sample.awayTeam} @ ${sample.homeTeam}`,
                pickCount: sample.pickCount,
                hasSignals: !!sample.signals,
                signalCount: countSignals(sample),
                signalsData: sample.signals
              })
            }
            
            setGames(gamesWithCounts)
            // Cache the results
            setGamesCache(prev => ({ ...prev, [selectedSport]: gamesWithCounts }))
          } else {
            setGames([])
          }
        } else {
          setGames([])
        }
      } catch (error) {
        console.error(`Error fetching ${selectedSport} games:`, error)
        setGames([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGamesForSport()
  }, [selectedSport]) // Re-fetch when sport changes
  
  // Games are already filtered by sport from the API
  const filteredGames = games
  
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
              <h1 className={styles.title}>{selectedSport.toUpperCase()} Games</h1>
            </div>
            <p className={styles.subtitle}>
              Browse upcoming {selectedSport.toUpperCase()} games
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
                  {sport.toUpperCase()}
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
