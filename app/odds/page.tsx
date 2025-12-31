'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import styles from './odds.module.css'

type Game = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  spread: {
    label: string | null
    homeLine: number | null
    homeOdds: number | null
    awayLine: number | null
    awayOdds: number | null
  } | null
  totals: {
    label: string | null
    number: number | null
    overOdds: number | null
    underOdds: number | null
  } | null
  moneyline: {
    home: number | null
    away: number | null
  }
}

const SPORTSBOOKS = [
  { id: 'bet365', name: 'bet365' },
  { id: 'caesars', name: 'CAESARS SPORTSBOOK' },
  { id: 'espn', name: 'ESPN BET CO' },
  { id: 'fanduel', name: 'FANDUEL SPORTSBOOK' },
  { id: 'fanatics', name: 'Fanatics Sportsbook' },
  { id: 'draftkings', name: 'DRAFTKINGS SPORTSBOOK' },
  { id: 'betway', name: 'betway' },
  { id: 'betrivers', name: 'BETRIVERS' },
]

function formatKickoffDate(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York'
  }).format(date)
  
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  }).format(date)
  
  return `${day}, ${time}`
}

function formatOdds(odds: number | null | undefined): string {
  if (odds === null || odds === undefined) return 'N/A'
  return odds > 0 ? `+${odds}` : `${odds}`
}

function formatLine(line: number | null | undefined): string {
  if (line === null || line === undefined) return 'N/A'
  return line > 0 ? `+${line}` : `${line}`
}

export default function OddsPage() {
  const router = useRouter()
  const [allGames, setAllGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [selectedSport, setSelectedSport] = useState<string>('all')

  // Fetch games for all sports
  useEffect(() => {
    async function fetchGames() {
      setIsLoading(true)
      setHasError(false)
      
      try {
        const sports = ['nfl', 'nba', 'nhl', 'cfb']
        const gamePromises = sports.map(async (sport) => {
          try {
            const response = await fetch(`/api/dashboard/game-hub?sport=${sport}`, {
              cache: 'no-store'
            })
            if (!response.ok) {
              console.error(`Failed to fetch ${sport} games: ${response.status}`)
              return []
            }
            const data = await response.json()
            return (data.games || []).map((game: any) => ({
              ...game,
              sport: sport === 'cfb' ? 'CFB' : sport.toUpperCase()
            }))
          } catch (error) {
            console.error(`Error fetching ${sport} games:`, error)
            return []
          }
        })

        const results = await Promise.all(gamePromises)
        const allGamesData = results.flat()
        
        // Sort by kickoff time
        allGamesData.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
        
        setAllGames(allGamesData)
      } catch (error) {
        console.error('Error fetching games:', error)
        setHasError(true)
        setAllGames([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [])

  // Filter games by selected sport
  const filteredGames = useMemo(() => {
    if (selectedSport === 'all') return allGames
    return allGames.filter(game => {
      const gameSport = game.sport?.toLowerCase() || ''
      const selected = selectedSport.toLowerCase()
      
      // Handle sport name variations
      if (selected === 'cfb') {
        return gameSport === 'cfb' || gameSport === 'ncaaf'
      }
      if (selected === 'cbb') {
        return gameSport === 'cbb' || gameSport === 'ncaab'
      }
      
      return gameSport === selected
    })
  }, [allGames, selectedSport])

  const isCollegeSport = (sport: string) => {
    const sportLower = sport?.toLowerCase() || ''
    return sportLower === 'cfb' || sportLower === 'ncaaf' || sportLower === 'cbb' || sportLower === 'ncaab'
  }

  // Find the best odds for a specific team row
  // Each team row independently determines its best odds
  // For favorites (negative line): find lowest line, then lowest odds
  // For underdogs (positive line): find highest line, then lowest odds
  const getBestOddsForTeamRow = (game: Game, team: 'away' | 'home'): { line: number; odds: number; book: string } | null => {
    if (!game.spread) return null
    
    const allOdds: Array<{ line: number; odds: number; book: string }> = []
    
    // Collect all odds from all sportsbooks for THIS specific team
    SPORTSBOOKS.forEach(book => {
      const bookOdds = getSportsbookOdds(game, book.id)
      const teamOdds = team === 'away' ? bookOdds?.away : bookOdds?.home
      
      if (teamOdds && teamOdds.line !== null && teamOdds.odds !== null) {
        allOdds.push({
          line: teamOdds.line,
          odds: teamOdds.odds,
          book: book.id
        })
      }
    })
    
    if (allOdds.length === 0) return null
    
    // Determine if this team is favorite or underdog based on the line
    // Use the first line to determine (all should be same sign for same team)
    const firstLine = allOdds[0].line
    const isFavorite = firstLine < 0
    
    let best: { line: number; odds: number; book: string } | null = null
    
    allOdds.forEach(odds => {
      if (!best) {
        best = odds
        return
      }
      
      if (isFavorite) {
        // Favorite: lowest line first (most negative), then lowest odds (least negative, closest to zero)
        if (odds.line < best.line) {
          // Lower line is better for favorite (e.g., -3.5 is better than -3.0)
          best = odds
        } else if (Math.abs(odds.line - best.line) < 0.01) {
          // Same line (within tolerance), pick lowest odds (least negative, closest to zero)
          // For negative odds, higher number is better (e.g., -100 > -110)
          if (odds.odds !== null && best.odds !== null && odds.odds > best.odds) {
            best = odds
          }
        }
      } else {
        // Underdog: highest line first (most positive), then lowest odds (least negative, closest to zero)
        if (odds.line > best.line) {
          // Higher line is better for underdog (e.g., +3.5 is better than +3.0)
          best = odds
        } else if (Math.abs(odds.line - best.line) < 0.01) {
          // Same line (within tolerance), pick lowest odds (least negative, closest to zero)
          // For negative odds, higher number is better (e.g., -100 > -110)
          if (odds.odds !== null && best.odds !== null && odds.odds > best.odds) {
            best = odds
          }
        }
      }
    })
    
    return best
  }

  // Mock function to get sportsbook odds - in real implementation, this would fetch from API
  const getSportsbookOdds = (game: Game, sportsbookId: string) => {
    // For now, return varied odds for different sportsbooks (mock data)
    // In real implementation, this would fetch actual odds from each sportsbook
    if (!game.spread) return { away: null, home: null }
    
    // Create variation in odds based on sportsbook ID and game ID
    // This ensures different books have different odds, and best varies by game
    const bookIndex = SPORTSBOOKS.findIndex(b => b.id === sportsbookId)
    const gameHash = game.id ? parseInt(game.id.slice(-2)) || 0 : 0
    
    // Create varied odds that differ by sportsbook and game
    // This makes different books have the best odds for different games
    const baseVariation = (bookIndex * 2) % 7 // 0-6 variation
    const gameVariation = (gameHash % 3) - 1 // -1, 0, or 1
    const oddsVariation = baseVariation + gameVariation
    
    // Ensure we have a range of odds so best varies
    const awayOddsVariation = oddsVariation - 3 // Range from -3 to +4
    const homeOddsVariation = (oddsVariation + 2) % 5 - 2 // Different range for home
    
    return {
      away: {
        line: game.spread.awayLine,
        odds: game.spread.awayOdds ? game.spread.awayOdds + awayOddsVariation : null
      },
      home: {
        line: game.spread.homeLine,
        odds: game.spread.homeOdds ? game.spread.homeOdds + homeOddsVariation : null
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Odds</h1>
            </div>
            <p className={styles.subtitle}>Compare odds across all major sportsbooks.</p>
          </div>
        </div>
        <div className={styles.filtersRow}>
          <div className={styles.leftFilters}>
            <div className={styles.sportFilters}>
              {['all', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'].map(sport => (
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

      {/* Content Section */}
      <div className={styles.contentSection}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingText}>Loading odds...</div>
          </div>
        ) : hasError ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Unable to load odds</div>
            <div className={styles.emptySubtitle}>Please try again shortly</div>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No games found</div>
            <div className={styles.emptySubtitle}>
              {selectedSport === 'all' 
                ? 'No games available at this time' 
                : `No ${selectedSport.toUpperCase()} games available`}
            </div>
          </div>
        ) : (
          <div className={styles.oddsTableContainer}>
            <table className={styles.oddsTable}>
              <thead>
                <tr>
                  <th className={styles.teamColumn}>SCHEDULED</th>
                  <th className={styles.oddsColumn}>OPEN</th>
                  {SPORTSBOOKS.map(book => (
                    <th key={book.id} className={styles.sportsbookColumn}>
                      {book.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game) => {
                  const openOdds = game.spread
                  // Calculate best odds for EACH team row independently
                  const bestAwayOdds = getBestOddsForTeamRow(game, 'away')
                  const bestHomeOdds = getBestOddsForTeamRow(game, 'home')
                  
                  return (
                    <React.Fragment key={game.id}>
                      {/* Away Team Row */}
                      <tr className={`${styles.gameRow} ${styles.awayRow}`}>
                        <td className={styles.teamCell}>
                          <div className={styles.teamInfo}>
                            {game.awayTeamLogo && (
                              <img src={game.awayTeamLogo} alt={game.awayTeam} className={styles.teamLogo} />
                            )}
                            <div className={styles.teamNameWrapper}>
                              <span className={styles.teamName}>{game.awayTeam}</span>
                            </div>
                          </div>
                        </td>
                        <td className={styles.oddsCell}>
                          {openOdds && openOdds.awayLine !== null ? (
                            <div className={styles.oddsBox}>
                              <span className={styles.oddsLine}>{formatLine(openOdds.awayLine)}</span>
                              <span className={styles.oddsValue}>{formatOdds(openOdds.awayOdds)}</span>
                            </div>
                          ) : (
                            <span className={styles.naText}>N/A</span>
                          )}
                        </td>
                        {SPORTSBOOKS.map(book => {
                          const bookOdds = getSportsbookOdds(game, book.id)
                          const isBest = bestAwayOdds && bookOdds?.away && 
                            Math.abs((bookOdds.away.line || 0) - bestAwayOdds.line) < 0.01 && 
                            Math.abs((bookOdds.away.odds || 0) - bestAwayOdds.odds) < 0.01 &&
                            book.id === bestAwayOdds.book
                          return (
                            <td key={book.id} className={styles.oddsCell}>
                              {bookOdds?.away && bookOdds.away.line !== null ? (
                                <div className={`${styles.oddsBox} ${isBest ? styles.bestOdds : ''}`}>
                                  <span className={styles.oddsLine}>{formatLine(bookOdds.away.line)}</span>
                                  <span className={styles.oddsValue}>{formatOdds(bookOdds.away.odds)}</span>
                                  {isBest && <span className={styles.bestBadge}>BEST</span>}
                                </div>
                              ) : (
                                <span className={styles.naText}>N/A</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                      {/* Home Team Row */}
                      <tr className={styles.gameRow}>
                        <td className={styles.teamCell}>
                          <div className={styles.teamInfo}>
                            {game.homeTeamLogo && (
                              <img src={game.homeTeamLogo} alt={game.homeTeam} className={styles.teamLogo} />
                            )}
                            <div className={styles.teamNameWrapper}>
                              <span className={styles.teamName}>{game.homeTeam}</span>
                            </div>
                          </div>
                          <div className={styles.gameTime}>
                            {formatKickoffDate(game.kickoff)}
                          </div>
                        </td>
                        <td className={styles.oddsCell}>
                          {openOdds && openOdds.homeLine !== null ? (
                            <div className={styles.oddsBox}>
                              <span className={styles.oddsLine}>{formatLine(openOdds.homeLine)}</span>
                              <span className={styles.oddsValue}>{formatOdds(openOdds.homeOdds)}</span>
                            </div>
                          ) : (
                            <span className={styles.naText}>N/A</span>
                          )}
                        </td>
                        {SPORTSBOOKS.map(book => {
                          const bookOdds = getSportsbookOdds(game, book.id)
                          const isBest = bestHomeOdds && bookOdds?.home && 
                            Math.abs((bookOdds.home.line || 0) - bestHomeOdds.line) < 0.01 && 
                            Math.abs((bookOdds.home.odds || 0) - bestHomeOdds.odds) < 0.01 &&
                            book.id === bestHomeOdds.book
                          return (
                            <td key={book.id} className={styles.oddsCell}>
                              {bookOdds?.home && bookOdds.home.line !== null ? (
                                <div className={`${styles.oddsBox} ${isBest ? styles.bestOdds : ''}`}>
                                  <span className={styles.oddsLine}>{formatLine(bookOdds.home.line)}</span>
                                  <span className={styles.oddsValue}>{formatOdds(bookOdds.home.odds)}</span>
                                  {isBest && <span className={styles.bestBadge}>BEST</span>}
                                </div>
                              ) : (
                                <span className={styles.naText}>N/A</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

