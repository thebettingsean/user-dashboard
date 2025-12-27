'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { generateGameSlug } from '@/lib/utils/gameSlug'
import styles from './games.module.css'

type Game = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  picks: {
    total: number
  }
  publicMoney: any
  referee: any
  teamTrends: any
  propsCount: number
  awayTeamRank?: number
  homeTeamRank?: number
}

function formatKickoffDate(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York'
  }).format(date)
}

function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return `${Math.round(value)}%`
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : parseFloat(value)
  return Number.isNaN(num) ? null : num
}

export default function GamesPage() {
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

  // Calculate featured game: 1) Most picks, 2) Strongest data, 3) Earliest kickoff
  const featuredGame = useMemo(() => {
    if (filteredGames.length === 0) return undefined
    
    return [...filteredGames].sort((a, b) => {
      const picksB = b.picks.total ?? 0
      const picksA = a.picks.total ?? 0
      
      // First priority: Most active picks
      if (picksB !== picksA) {
        return picksB - picksA
      }
      
      // Second priority: Strongest data
      const dataCountA = (a.publicMoney ? 1 : 0) + (a.referee ? 1 : 0) + (a.teamTrends ? 1 : 0) + (a.propsCount > 0 ? 1 : 0)
      const dataCountB = (b.publicMoney ? 1 : 0) + (b.referee ? 1 : 0) + (b.teamTrends ? 1 : 0) + (b.propsCount > 0 ? 1 : 0)
      if (dataCountB !== dataCountA) {
        return dataCountB - dataCountA
      }
      
      // Third priority: Earliest kickoff
      return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
    })[0]
  }, [filteredGames])

  // Other games (excluding featured)
  const otherGames = useMemo(() => {
    if (!featuredGame) return filteredGames
    return filteredGames.filter(game => game.id !== featuredGame.id)
  }, [filteredGames, featuredGame])

  // Render public betting section
  const renderPublicBetting = (game: Game) => {
    const pm = game.publicMoney
    if (!pm) return null

    // Get the most public ML (by stake %)
    const mlOptions = [
      { label: `${game.homeTeam} ML`, bets: pm.public_money_ml_home_bets_pct, stake: pm.public_money_ml_home_stake_pct },
      { label: `${game.awayTeam} ML`, bets: pm.public_money_ml_away_bets_pct, stake: pm.public_money_ml_away_stake_pct }
    ].filter(m => m.stake !== null && m.stake !== undefined)
    const topML = mlOptions.sort((a, b) => (b.stake || 0) - (a.stake || 0))[0]

    // Get the most public Spread (by stake %)
    const spreadOptions = [
      { label: `${game.homeTeam} Spread`, bets: pm.public_money_spread_home_bets_pct, stake: pm.public_money_spread_home_stake_pct },
      { label: `${game.awayTeam} Spread`, bets: pm.public_money_spread_away_bets_pct, stake: pm.public_money_spread_away_stake_pct }
    ].filter(m => m.stake !== null && m.stake !== undefined)
    const topSpread = spreadOptions.sort((a, b) => (b.stake || 0) - (a.stake || 0))[0]

    // Get the most public O/U (by stake %)
    const ouOptions = [
      { label: 'Over', bets: pm.public_money_over_bets_pct, stake: pm.public_money_over_stake_pct },
      { label: 'Under', bets: pm.public_money_under_bets_pct, stake: pm.public_money_under_stake_pct }
    ].filter(m => m.stake !== null && m.stake !== undefined)
    const topOU = ouOptions.sort((a, b) => (b.stake || 0) - (a.stake || 0))[0]

    const topMarkets = [topML, topSpread, topOU].filter(Boolean)
    if (topMarkets.length === 0) return null

    return (
      <div className={styles.featuredPublicBetting}>
        <div className={styles.featuredPublicBettingTitle}>Most Public Bets</div>
        <div className={styles.featuredPublicBettingList}>
          {topMarkets.map((market, idx) => (
            <div key={idx} className={styles.featuredPublicBettingItem}>
              <div className={styles.featuredPublicBettingHeader}>
                <span>{market!.label}</span>
                <span className={styles.featuredPublicBettingPercent}>
                  {formatPercentage(market!.stake)} $ · {formatPercentage(market!.bets)} bets
                </span>
              </div>
              <div className={styles.featuredPublicBettingBar}>
                <div 
                  className={styles.featuredPublicBettingBarFill}
                  style={{ width: `${market!.stake}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const handleGameClick = (game: Game) => {
    // Map sport back to route format
    const sportRoute = game.sport?.toLowerCase() === 'cfb' ? 'college-football' : game.sport?.toLowerCase() || 'nfl'
    const slug = generateGameSlug(game.awayTeam, game.homeTeam, game.kickoff)
    router.push(`/sports/${sportRoute}/games/${slug}/data`)
  }

  const isCollegeSport = (sport: string) => {
    const sportLower = sport?.toLowerCase() || ''
    return sportLower === 'cfb' || sportLower === 'ncaaf' || sportLower === 'cbb' || sportLower === 'ncaab'
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
            <p className={styles.subtitle}>Live games, odds, and betting data across all sports.</p>
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
            <div className={styles.loadingText}>Loading games...</div>
          </div>
        ) : hasError ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Unable to load games</div>
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
          <div className={styles.gamesContainer}>
            {/* Featured Game Section */}
            {featuredGame && (
              <div 
                className={styles.featuredGame}
                onClick={() => handleGameClick(featuredGame)}
              >
                <div className={styles.featuredTitle}>Featured Game</div>
                <div className={styles.featuredSeparator} />
                
                {/* Teams & Date */}
                <div className={styles.featuredMatchup}>
                  {featuredGame.awayTeamLogo && (
                    <div className={styles.featuredLogoWrapper}>
                      <img src={featuredGame.awayTeamLogo} alt={featuredGame.awayTeam} className={styles.featuredLogo} />
                      {isCollegeSport(featuredGame.sport) && featuredGame.awayTeamRank && (
                        <div className={styles.featuredRank}>#{featuredGame.awayTeamRank}</div>
                      )}
                    </div>
                  )}
                  <span className={styles.featuredVs}>@</span>
                  {featuredGame.homeTeamLogo && (
                    <div className={styles.featuredLogoWrapper}>
                      <img src={featuredGame.homeTeamLogo} alt={featuredGame.homeTeam} className={styles.featuredLogo} />
                      {isCollegeSport(featuredGame.sport) && featuredGame.homeTeamRank && (
                        <div className={styles.featuredRank}>#{featuredGame.homeTeamRank}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.featuredDate}>
                  {formatKickoffDate(featuredGame.kickoff)} · {featuredGame.kickoffLabel}
                </div>
                
                {/* Referee/Coach (NFL/NBA only) */}
                {(featuredGame.sport === 'NFL' || featuredGame.sport === 'NBA') && featuredGame.referee && (
                  <div className={styles.featuredRef}>
                    Referee · {(featuredGame.referee as any)?.referee_name || 'TBD'}
                  </div>
                )}
                
                {/* Public Betting Splits */}
                {renderPublicBetting(featuredGame)}
                
                {/* Stats */}
                <div className={styles.featuredStats}>
                  <div className={styles.featuredStat}>
                    <span className={styles.featuredStatLabel}>Active Picks</span>
                    <span className={styles.featuredStatValue}>{featuredGame.picks.total}</span>
                  </div>
                  <div className={styles.featuredStat}>
                    <span className={styles.featuredStatLabel}>Game Data</span>
                    <span className={styles.featuredStatValue}>
                      {(featuredGame.publicMoney ? 1 : 0) + (featuredGame.referee ? 1 : 0) + (featuredGame.teamTrends ? 1 : 0) + (featuredGame.propsCount > 0 ? 1 : 0)}/4
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Other Games Grid */}
            {otherGames.length > 0 && (
              <div className={styles.gamesGrid}>
                {otherGames.map((game) => {
                  const dataCount = (game.publicMoney ? 1 : 0) + (game.referee ? 1 : 0) + (game.teamTrends ? 1 : 0) + (game.propsCount > 0 ? 1 : 0)
                  const collegeSport = isCollegeSport(game.sport)
                  
                  return (
                    <div
                      key={game.id}
                      className={styles.gameCard}
                      onClick={() => handleGameClick(game)}
                    >
                      <div className={styles.gameCardRow}>
                        <div className={styles.gameCardTeamRow}>
                          {game.awayTeamLogo && (
                            <img src={game.awayTeamLogo} alt={game.awayTeam} className={styles.gameCardLogo} />
                          )}
                          <div className={styles.gameCardTeamNameWrapper}>
                            <span className={styles.gameCardTeamName}>{game.awayTeam}</span>
                            {collegeSport && game.awayTeamRank && (
                              <span className={styles.gameCardRank}>#{game.awayTeamRank}</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.gameCardRight}>
                          <span 
                            className={styles.gameCardPill}
                            style={game.picks.total > 0 ? {
                              background: 'rgba(234, 88, 12, 0.25)',
                              borderColor: 'rgba(251, 146, 60, 0.5)',
                              color: 'rgba(251, 146, 60, 0.95)'
                            } : {}}
                          >
                            Picks {game.picks.total}
                          </span>
                          <span 
                            className={styles.gameCardPill}
                            style={dataCount === 4 ? {
                              background: 'rgba(30, 58, 138, 0.35)',
                              borderColor: 'rgba(96, 165, 250, 0.5)',
                              color: 'rgba(147, 197, 253, 0.95)'
                            } : {}}
                          >
                            Data {dataCount}/4
                          </span>
                        </div>
                      </div>
                      <div className={styles.gameCardRow}>
                        <div className={styles.gameCardTeamRow}>
                          {game.homeTeamLogo && (
                            <img src={game.homeTeamLogo} alt={game.homeTeam} className={styles.gameCardLogo} />
                          )}
                          <div className={styles.gameCardTeamNameWrapper}>
                            <span className={styles.gameCardTeamName}>{game.homeTeam}</span>
                            {collegeSport && game.homeTeamRank && (
                              <span className={styles.gameCardRank}>#{game.homeTeamRank}</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.gameCardRight}>
                          <span className={styles.gameCardTime}>
                            {formatKickoffDate(game.kickoff)} · {game.kickoffLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
