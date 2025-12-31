'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../odds.module.css'

type GameWithOdds = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  oddsApiId: string
  oddsData: {
    spreads: {
      away: any[]
      home: any[]
    }
    availableBooks: string[]
  } | null
  spread: {
    label: string | null
    homeLine: number | null
    homeOdds: number | null
    awayLine: number | null
    awayOdds: number | null
  } | null
}

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

function getMascot(teamName: string): string {
  if (!teamName) return ''
  const words = teamName.trim().split(' ')
  return words[words.length - 1] || teamName
}

// Same logic as getBestSpread from game-markets API
function getBestSpread(spreads: any[], type: 'favorite' | 'underdog') {
  if (!spreads || spreads.length === 0) return null

  return spreads.reduce((best, current) => {
    if (!best) return current

    const bestPoint = Math.abs(best.point)
    const currentPoint = Math.abs(current.point)

    if (type === 'favorite') {
      // For favorites, want smallest spread (e.g., -2.5 > -3)
      if (currentPoint < bestPoint) return current
      if (currentPoint === bestPoint && current.odds > best.odds) return current // Better juice
    } else {
      // For underdogs, want largest spread (e.g., +3.5 > +3)
      if (currentPoint > bestPoint) return current
      if (currentPoint === bestPoint && current.odds > best.odds) return current // Better juice
    }

    return best
  }, null)
}

// Calculate consensus odds for a team
// Logic: Find most common line (with stable tie-breaker), convert all odds to that line (20 points per half point), then average
// Example: +3 at -105 converts to +2.5 at -125 (20 point penalty for worse line)
function getConsensusOdds(spreads: any[], team: 'away' | 'home') {
  const teamSpreads = spreads.filter(s => s.side === team)
  if (teamSpreads.length === 0) return null

  // Step 1: Determine team type from ALL spreads (not filtered)
  const positiveCount = teamSpreads.filter(s => s.point > 0).length
  const negativeCount = teamSpreads.filter(s => s.point < 0).length
  const isUnderdog = positiveCount > negativeCount

  // Step 2: Filter spreads that match team type (for consensus line calculation)
  // Only filter by point sign here - we'll filter odds later
  const typeMatchingSpreads = teamSpreads.filter(spread => {
    if (isUnderdog && spread.point <= 0) return false
    if (!isUnderdog && spread.point >= 0) return false
    return true
  })

  if (typeMatchingSpreads.length === 0) return null

  // Step 3: Find the MOST COMMON line from type-matching spreads
  // This gives us the TRUE consensus line based on actual market data
  const lineFrequency = new Map<number, number>()
  typeMatchingSpreads.forEach(spread => {
    lineFrequency.set(spread.point, (lineFrequency.get(spread.point) || 0) + 1)
  })

  let consensusLine = typeMatchingSpreads[0].point
  let maxFrequency = 0
  
  lineFrequency.forEach((frequency, line) => {
    if (frequency > maxFrequency) {
      maxFrequency = frequency
      consensusLine = line
    }
  })

  // Step 4: NOW filter aggressively for odds quality (for consensus odds calculation)
  const validSpreads = typeMatchingSpreads.filter(spread => {
    // Strict odds validation
    if (!isUnderdog) {
      // FAVORITES: Must be at least -101
      if (spread.odds > -101) return false
      if (spread.odds < -300) return false
    } else {
      // UNDERDOGS: If negative, must be -110 or worse (more negative)
      if (spread.odds < 0 && spread.odds > -110) return false
      if (spread.odds < -150) return false
    }
    return true
  })

  if (validSpreads.length === 0) return null

  // Step 4: Convert all odds to the consensus line and apply strict bounds
  // Conversion rule: 20 points per half-point difference
  const convertedOdds: number[] = []
  
  validSpreads.forEach(spread => {
    let adjustedOdds = spread.odds
    
    // If already at consensus line, just apply bounds
    if (spread.point !== consensusLine) {
      const lineDiff = spread.point - consensusLine
      const halfPoints = Math.abs(lineDiff) * 2
      
      if (isUnderdog) {
        // Underdog: higher line is better (+3 > +2.5)
        if (spread.point > consensusLine) {
          // Better line to worse: odds get WORSE (more negative)
          adjustedOdds = spread.odds - (halfPoints * 20)
        } else {
          // Worse line to better: odds get BETTER (less negative/more positive)
          adjustedOdds = spread.odds + (halfPoints * 20)
        }
      } else {
        // Favorite: less negative is better (-2.5 > -3)
        if (spread.point > consensusLine) {
          // Better line to worse: odds get WORSE (more negative)
          adjustedOdds = spread.odds - (halfPoints * 20)
        } else {
          // Worse line to better: odds get BETTER (less negative)
          adjustedOdds = spread.odds + (halfPoints * 20)
        }
      }
    }
    
    // Apply STRICT bounds to each converted odd
    if (!isUnderdog) {
      // Favorites: cap at -101 minimum
      adjustedOdds = Math.min(-101, adjustedOdds)
      adjustedOdds = Math.max(-200, adjustedOdds)
    } else {
      // Underdogs: cap negative odds at -110 maximum
      if (adjustedOdds < 0) {
        adjustedOdds = Math.min(-110, adjustedOdds)
      }
      // Positive odds are fine (no cap)
    }
    
    convertedOdds.push(adjustedOdds)
  })

  // Step 5: Calculate average
  if (convertedOdds.length === 0) return null
  
  let averageOdds = convertedOdds.reduce((sum, odds) => sum + odds, 0) / convertedOdds.length
  
  // Step 6: Apply final bounds
  if (!isUnderdog) {
    averageOdds = Math.min(-101, averageOdds)
    averageOdds = Math.max(-200, averageOdds)
  } else {
    if (averageOdds < 0) {
      averageOdds = Math.min(-110, averageOdds)
    }
  }

  // Step 7: Round and final validation
  let finalOdds = Math.round(averageOdds)
  
  // Absolute final check
  if (!isUnderdog && finalOdds > -101) finalOdds = -101
  if (isUnderdog && finalOdds < 0 && finalOdds > -110) finalOdds = -110

  return {
    line: consensusLine,
    odds: finalOdds
  }
}

const SPORT_MAP: Record<string, string> = {
  nfl: 'nfl',
  nba: 'nba',
  nhl: 'nhl',
  cfb: 'cfb',
  cbb: 'cbb',
}

const SPORT_DISPLAY_NAMES: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  nhl: 'NHL',
  cfb: 'CFB',
  cbb: 'CBB',
}

export default function OddsPage() {
  const params = useParams()
  const router = useRouter()
  const sportParam = (params?.sport as string) || 'nfl'
  const [allGames, setAllGames] = useState<GameWithOdds[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Fetch games and odds from same place as submit page
  useEffect(() => {
    async function fetchGamesAndOdds() {
      setIsLoading(true)
      setHasError(false)
      
      try {
        // Fetch games for the selected sport only
        const sport = sportParam.toLowerCase()
        if (!SPORT_MAP[sport]) {
          router.push('/odds/nfl')
          return
        }

        const response = await fetch(`/api/analyst-picks/upcoming-games?sport=${sport}`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          setAllGames([])
          return
        }
        
        const data = await response.json()
        if (!data.success) {
          setAllGames([])
          return
        }
        
        const gamesData = (data.games || []).map((game: any) => ({
          id: game.game_id,
          sport: game.sport,
          awayTeam: game.away_team,
          homeTeam: game.home_team,
          awayTeamLogo: game.away_team_logo,
          homeTeamLogo: game.home_team_logo,
          kickoff: game.game_time,
          kickoffLabel: game.game_time_est,
          oddsApiId: game.odds_api_id,
          oddsData: null,
          spread: null
        }))
        
        // Fetch odds for each game using same API as submit page
        const gamesWithOdds = await Promise.all(
          gamesData.map(async (game: any) => {
            try {
              const sportMap: Record<string, string> = {
                'NFL': 'nfl',
                'NBA': 'nba',
                'NHL': 'nhl',
                'CFB': 'cfb',
                'CBB': 'cbb'
              }
              const sportParam = sportMap[game.sport] || game.sport.toLowerCase()
              
              const response = await fetch(`/api/analyst-picks/game-markets?oddsApiId=${game.oddsApiId}&sport=${sportParam}`, {
                cache: 'no-store'
              })
              
              if (!response.ok) {
                return { ...game, oddsData: null }
              }
              
              const data = await response.json()
              if (!data.success || !data.all_lines) {
                return { ...game, oddsData: null }
              }

              // Extract spreads from all_lines structure (same as submit page uses)
              const awaySpreads: any[] = []
              const homeSpreads: any[] = []
              
              if (data.all_lines.spreads?.away) {
                data.all_lines.spreads.away.forEach((lineGroup: any[]) => {
                  lineGroup.forEach((spread: any) => {
                    awaySpreads.push({
                      book: spread.book,
                      team: spread.team,
                      point: spread.point,
                      odds: spread.odds,
                      side: 'away'
                    })
                  })
                })
              }
              
              if (data.all_lines.spreads?.home) {
                data.all_lines.spreads.home.forEach((lineGroup: any[]) => {
                  lineGroup.forEach((spread: any) => {
                    homeSpreads.push({
                      book: spread.book,
                      team: spread.team,
                      point: spread.point,
                      odds: spread.odds,
                      side: 'home'
                    })
                  })
                })
              }

              // Get open odds from best_lines (first available)
              const openAway = data.best_lines?.spreads?.away
              const openHome = data.best_lines?.spreads?.home
              
              // Filter out LowVig.ag and MyBookie.ag from available books
              const availableBooks = (data.available_books || []).filter((book: string) => 
                book !== 'LowVig.ag' && book !== 'MyBookie.ag'
              )
              
              return {
                ...game,
                oddsData: {
                  spreads: {
                    away: awaySpreads.filter(s => s.book !== 'LowVig.ag' && s.book !== 'MyBookie.ag'),
                    home: homeSpreads.filter(s => s.book !== 'LowVig.ag' && s.book !== 'MyBookie.ag')
                  },
                  availableBooks
                },
                spread: openAway && openHome ? {
                  label: null,
                  awayLine: openAway.point,
                  awayOdds: openAway.odds,
                  homeLine: openHome.point,
                  homeOdds: openHome.odds
                } : null
              }
            } catch (error) {
              console.error(`Error fetching odds for game ${game.id}:`, error)
              return { ...game, oddsData: null }
            }
          })
        )

        gamesWithOdds.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
        setAllGames(gamesWithOdds)
      } catch (error) {
        console.error('Error fetching games:', error)
        setHasError(true)
        setAllGames([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchGamesAndOdds()
  }, [sportParam, router])

  // Get odds for a specific book and team
  const getBookOdds = (spreads: any[], book: string, team: 'away' | 'home') => {
    const teamSpreads = spreads.filter(s => s.side === team && s.book === book)
    return teamSpreads.length > 0 ? teamSpreads[0] : null
  }

  // Get best odds for a team using same logic as submit page
  const getBestOddsForTeam = (spreads: any[], team: 'away' | 'home') => {
    const teamSpreads = spreads.filter(s => s.side === team)
    if (teamSpreads.length === 0) return null
    
    // Determine if favorite or underdog
    const isFavorite = teamSpreads[0].point < 0
    return getBestSpread(teamSpreads, isFavorite ? 'favorite' : 'underdog')
  }

  // Get all unique books from all games, sorted in specific order
  const allBooks = useMemo(() => {
    const booksSet = new Set<string>()
    allGames.forEach(game => {
      if (game.oddsData?.availableBooks) {
        game.oddsData.availableBooks.forEach(book => booksSet.add(book))
      }
    })
    
    // Sort books in specified order
    const bookOrder = [
      'FanDuel',
      'DraftKings',
      'bet365',
      'Caesars',
      'BetMGM',
      'Fanatics',
      'Bovada',
      'BetOnline.ag',
      'BetRivers'
    ]
    
    const orderedBooks: string[] = []
    const unorderedBooks: string[] = []
    
    // Add books in specified order
    bookOrder.forEach(book => {
      if (booksSet.has(book)) {
        orderedBooks.push(book)
      }
    })
    
    // Add any remaining books not in the order list
    booksSet.forEach(book => {
      if (!bookOrder.includes(book)) {
        unorderedBooks.push(book)
      }
    })
    
    return [...orderedBooks, ...unorderedBooks.sort()]
  }, [allGames])

  const sportDisplayName = SPORT_DISPLAY_NAMES[sportParam.toLowerCase()] || sportParam.toUpperCase()

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{sportDisplayName} Odds</h1>
            </div>
            <p className={styles.subtitle}>Compare odds across all major sportsbooks.</p>
          </div>
        </div>
        <div className={styles.filtersRow}>
          <div className={styles.leftFilters}>
            <div className={styles.sportFilters}>
              {['nfl', 'nba', 'nhl', 'cfb', 'cbb'].map(sport => (
                <Link
                  key={sport}
                  href={`/odds/${sport}`}
                  className={`${styles.filterBtn} ${sportParam.toLowerCase() === sport ? styles.active : ''}`}
                >
                  {sport.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

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
        ) : allGames.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No games found</div>
            <div className={styles.emptySubtitle}>
              No {sportDisplayName} games available at this time
            </div>
          </div>
        ) : (
          <div className={styles.oddsTableContainer}>
            <table className={styles.oddsTable}>
              <thead>
                <tr>
                  <th className={styles.teamColumn}>SCHEDULED</th>
                  <th className={styles.oddsColumn}>OPEN</th>
                  <th className={styles.consensusColumn}>CONSENSUS</th>
                  {allBooks.map(book => (
                    <th key={book} className={styles.sportsbookColumn}>
                      {book}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allGames.map((game) => {
                  if (!game.oddsData) return null

                  const allSpreads = [...game.oddsData.spreads.away, ...game.oddsData.spreads.home]
                  
                  // Get best odds for each team using same logic as submit page
                  const bestAway = getBestOddsForTeam(allSpreads, 'away')
                  const bestHome = getBestOddsForTeam(allSpreads, 'home')
                  
                  // Get consensus odds for each team
                  const consensusAway = getConsensusOdds(allSpreads, 'away')
                  const consensusHome = getConsensusOdds(allSpreads, 'home')
                  
                  // Get open odds from game spread
                  const openAway = game.spread?.awayLine !== null && game.spread?.awayOdds !== null ? {
                    line: game.spread.awayLine,
                    odds: game.spread.awayOdds
                  } : null
                  const openHome = game.spread?.homeLine !== null && game.spread?.homeOdds !== null ? {
                    line: game.spread.homeLine,
                    odds: game.spread.homeOdds
                  } : null

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
                              <span className={styles.teamName}>{getMascot(game.awayTeam)}</span>
                            </div>
                          </div>
                        </td>
                        <td className={styles.oddsCell}>
                          {openAway ? (
                            <div className={styles.oddsBox}>
                              <span className={styles.oddsLine}>{formatLine(openAway.line)}</span>
                              <span className={styles.oddsValue}>{formatOdds(openAway.odds)}</span>
                            </div>
                          ) : (
                            <span className={styles.naText}>N/A</span>
                          )}
                        </td>
                        <td className={`${styles.oddsCell} ${styles.consensusCell}`}>
                          {consensusAway ? (
                            <div className={styles.oddsBox}>
                              <span className={styles.oddsLine}>{formatLine(consensusAway.line)}</span>
                              <span className={styles.oddsValue}>{formatOdds(consensusAway.odds)}</span>
                            </div>
                          ) : (
                            <span className={styles.naText}>N/A</span>
                          )}
                        </td>
                        {allBooks.map(book => {
                          const bookOdds = getBookOdds(allSpreads, book, 'away')
                          const isBest = bestAway && bookOdds && 
                            Math.abs(bookOdds.point - bestAway.point) < 0.01 &&
                            Math.abs(bookOdds.odds - bestAway.odds) < 0.01 &&
                            bookOdds.book === bestAway.book
                          
                          return (
                            <td key={book} className={styles.oddsCell}>
                              {bookOdds ? (
                                <div className={`${styles.oddsBox} ${isBest ? styles.bestOdds : ''}`}>
                                  <span className={styles.oddsLine}>{formatLine(bookOdds.point)}</span>
                                  <span className={styles.oddsValue}>{formatOdds(bookOdds.odds)}</span>
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
                              <span className={styles.teamName}>{getMascot(game.homeTeam)}</span>
                            </div>
                          </div>
                          <div className={styles.gameTime}>
                            {formatKickoffDate(game.kickoff)}
                          </div>
                        </td>
                        <td className={styles.oddsCell}>
                          {openHome ? (
                            <div className={styles.oddsBox}>
                              <span className={styles.oddsLine}>{formatLine(openHome.line)}</span>
                              <span className={styles.oddsValue}>{formatOdds(openHome.odds)}</span>
                            </div>
                          ) : (
                            <span className={styles.naText}>N/A</span>
                          )}
                        </td>
                        <td className={`${styles.oddsCell} ${styles.consensusCell}`}>
                          {consensusHome ? (
                            <div className={styles.oddsBox}>
                              <span className={styles.oddsLine}>{formatLine(consensusHome.line)}</span>
                              <span className={styles.oddsValue}>{formatOdds(consensusHome.odds)}</span>
                            </div>
                          ) : (
                            <span className={styles.naText}>N/A</span>
                          )}
                        </td>
                        {allBooks.map(book => {
                          const bookOdds = getBookOdds(allSpreads, book, 'home')
                          const isBest = bestHome && bookOdds && 
                            Math.abs(bookOdds.point - bestHome.point) < 0.01 &&
                            Math.abs(bookOdds.odds - bestHome.odds) < 0.01 &&
                            bookOdds.book === bestHome.book
                          
                          return (
                            <td key={book} className={styles.oddsCell}>
                              {bookOdds ? (
                                <div className={`${styles.oddsBox} ${isBest ? styles.bestOdds : ''}`}>
                                  <span className={styles.oddsLine}>{formatLine(bookOdds.point)}</span>
                                  <span className={styles.oddsValue}>{formatOdds(bookOdds.odds)}</span>
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

