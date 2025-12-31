'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { generateGameSlug } from '@/lib/utils/gameSlug'
import { FaLock } from 'react-icons/fa'
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

// Mock data for featured game
const generateMockBestOdds = (game: Game) => ({
  spread: {
    away: { line: -3.5, odds: -110, book: 'DraftKings' },
    home: { line: 3.5, odds: -110, book: 'FanDuel' }
  },
  total: {
    over: { line: 48.5, odds: -105, book: 'BetMGM' },
    under: { line: 48.5, odds: -105, book: 'Caesars' }
  }
})

const generateMockActiveBets = (game: Game) => [
  {
    id: '1',
    type: 'Spread',
    selection: `${game.awayTeam} -3.5`,
    odds: -110,
    units: 2.5,
    status: 'active'
  },
  {
    id: '2',
    type: 'Total',
    selection: 'Over 48.5',
    odds: -105,
    units: 1.5,
    status: 'active'
  },
  {
    id: '3',
    type: 'ML',
    selection: `${game.homeTeam} ML`,
    odds: +145,
    units: 1.0,
    status: 'active'
  },
  {
    id: '4',
    type: 'Prop',
    selection: `${game.awayTeam} Team Total Over 24.5`,
    odds: -115,
    units: 2.0,
    status: 'active'
  }
]

const generateMockGameScripts = (game: Game) => [
  {
    id: '1',
    title: 'High Scoring Affair',
    description: 'Both teams rank in the top 10 for pace and offensive efficiency. Expect a back-and-forth game with plenty of scoring opportunities.',
    probability: 65
  },
  {
    id: '2',
    title: 'Defensive Battle',
    description: 'Strong defensive units on both sides could lead to a lower-scoring game. Key matchups favor the under.',
    probability: 35
  },
  {
    id: '3',
    title: 'Home Field Advantage',
    description: 'Home team has won 8 of last 10 at this venue. Crowd noise and familiarity could be the difference maker.',
    probability: 55
  }
]

export default function GamesPage() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { hasAccess } = useSubscription()
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

  // Render Best Odds section
  const renderBestOdds = (game: Game) => {
    const odds = generateMockBestOdds(game)
    
    return (
      <div className={styles.featuredBestOdds}>
        <div className={styles.featuredSectionTitle}>Best Odds</div>
        <div className={styles.bestOddsGrid}>
          <div className={styles.bestOddsMarket}>
            <div className={styles.bestOddsMarketLabel}>Spread</div>
            <div className={styles.bestOddsRow}>
              <div className={styles.bestOddsSide}>
                <span className={styles.bestOddsTeam}>{game.awayTeam}</span>
                <span className={styles.bestOddsLine}>{odds.spread.away.line > 0 ? '+' : ''}{odds.spread.away.line}</span>
                <span className={styles.bestOddsValue}>{odds.spread.away.odds > 0 ? '+' : ''}{odds.spread.away.odds}</span>
                <span className={styles.bestOddsBook}>{odds.spread.away.book}</span>
              </div>
              <div className={styles.bestOddsSide}>
                <span className={styles.bestOddsTeam}>{game.homeTeam}</span>
                <span className={styles.bestOddsLine}>{odds.spread.home.line > 0 ? '+' : ''}{odds.spread.home.line}</span>
                <span className={styles.bestOddsValue}>{odds.spread.home.odds > 0 ? '+' : ''}{odds.spread.home.odds}</span>
                <span className={styles.bestOddsBook}>{odds.spread.home.book}</span>
              </div>
            </div>
          </div>
          <div className={styles.bestOddsMarket}>
            <div className={styles.bestOddsMarketLabel}>Total</div>
            <div className={styles.bestOddsRow}>
              <div className={styles.bestOddsSide}>
                <span className={styles.bestOddsTeam}>Over</span>
                <span className={styles.bestOddsLine}>{odds.total.over.line}</span>
                <span className={styles.bestOddsValue}>{odds.total.over.odds > 0 ? '+' : ''}{odds.total.over.odds}</span>
                <span className={styles.bestOddsBook}>{odds.total.over.book}</span>
              </div>
              <div className={styles.bestOddsSide}>
                <span className={styles.bestOddsTeam}>Under</span>
                <span className={styles.bestOddsLine}>{odds.total.under.line}</span>
                <span className={styles.bestOddsValue}>{odds.total.under.odds > 0 ? '+' : ''}{odds.total.under.odds}</span>
                <span className={styles.bestOddsBook}>{odds.total.under.book}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render Active Bets section
  const renderActiveBets = (game: Game) => {
    const bets = generateMockActiveBets(game)
    const hasAccessToBets = isSignedIn && hasAccess()
    
    return (
      <div className={styles.featuredActiveBets}>
        <div className={styles.featuredSectionTitle}>
          Active Bets
          <span className={styles.activeBetsCount}>We have {bets.length} bets active — view now for free.</span>
        </div>
        <div className={styles.activeBetsGrid}>
          {bets.map((bet) => (
            <div key={bet.id} className={styles.activeBetCard}>
              <div 
                className={styles.activeBetContent}
                style={!hasAccessToBets ? { filter: 'blur(6px)', userSelect: 'none' } : {}}
              >
                <div className={styles.activeBetHeader}>
                  <span className={styles.activeBetType}>{bet.type}</span>
                  <span className={styles.activeBetUnits}>{bet.units}u</span>
                </div>
                <div className={styles.activeBetSelection}>{bet.selection}</div>
                <div className={styles.activeBetOdds}>{bet.odds > 0 ? '+' : ''}{bet.odds}</div>
              </div>
              {!hasAccessToBets && (
                <div className={styles.activeBetBlur}>
                  <FaLock className={styles.activeBetLockIcon} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render Public Betting section (enhanced)
  const renderPublicBetting = (game: Game) => {
    const pm = game.publicMoney
    if (!pm) return null

    // Spread data
    const spreadHomeBets = pm.public_money_spread_home_bets_pct ?? 50
    const spreadHomeMoney = pm.public_money_spread_home_stake_pct ?? 50
    const spreadAwayBets = pm.public_money_spread_away_bets_pct ?? 50
    const spreadAwayMoney = pm.public_money_spread_away_stake_pct ?? 50

    // Total data
    const totalOverBets = pm.public_money_over_bets_pct ?? 50
    const totalOverMoney = pm.public_money_over_stake_pct ?? 50
    const totalUnderBets = pm.public_money_under_bets_pct ?? 50
    const totalUnderMoney = pm.public_money_under_stake_pct ?? 50

    return (
      <div className={styles.featuredPublicBetting}>
        <div className={styles.featuredSectionTitle}>Public Betting</div>
        <div className={styles.publicBettingGrid}>
          <div className={styles.publicBettingMarket}>
            <div className={styles.publicBettingMarketLabel}>Spread</div>
            <div className={styles.publicBettingRow}>
              <div className={styles.publicBettingSide}>
                <div className={styles.publicBettingSideLabel}>{game.awayTeam}</div>
                <div className={styles.publicBettingBar}>
                  <div 
                    className={styles.publicBettingBarFill}
                    style={{ width: `${spreadAwayBets}%` }}
                  />
                </div>
                <div className={styles.publicBettingPercents}>
                  <span>{formatPercentage(spreadAwayBets)} tickets</span>
                  <span>{formatPercentage(spreadAwayMoney)} money</span>
                </div>
              </div>
              <div className={styles.publicBettingSide}>
                <div className={styles.publicBettingSideLabel}>{game.homeTeam}</div>
                <div className={styles.publicBettingBar}>
                  <div 
                    className={styles.publicBettingBarFill}
                    style={{ width: `${spreadHomeBets}%` }}
                  />
                </div>
                <div className={styles.publicBettingPercents}>
                  <span>{formatPercentage(spreadHomeBets)} tickets</span>
                  <span>{formatPercentage(spreadHomeMoney)} money</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.publicBettingMarket}>
            <div className={styles.publicBettingMarketLabel}>Total</div>
            <div className={styles.publicBettingRow}>
              <div className={styles.publicBettingSide}>
                <div className={styles.publicBettingSideLabel}>Over</div>
                <div className={styles.publicBettingBar}>
                  <div 
                    className={styles.publicBettingBarFill}
                    style={{ width: `${totalOverBets}%` }}
                  />
                </div>
                <div className={styles.publicBettingPercents}>
                  <span>{formatPercentage(totalOverBets)} tickets</span>
                  <span>{formatPercentage(totalOverMoney)} money</span>
                </div>
              </div>
              <div className={styles.publicBettingSide}>
                <div className={styles.publicBettingSideLabel}>Under</div>
                <div className={styles.publicBettingBar}>
                  <div 
                    className={styles.publicBettingBarFill}
                    style={{ width: `${totalUnderBets}%` }}
                  />
                </div>
                <div className={styles.publicBettingPercents}>
                  <span>{formatPercentage(totalUnderBets)} tickets</span>
                  <span>{formatPercentage(totalUnderMoney)} money</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render Game Scripts section
  const renderGameScripts = (game: Game) => {
    const scripts = generateMockGameScripts(game)
    
    return (
      <div className={styles.featuredGameScripts}>
        <div className={styles.featuredSectionTitle}>Game Scripts</div>
        <div className={styles.gameScriptsGrid}>
          {scripts.map((script) => (
            <div key={script.id} className={styles.gameScriptCard}>
              <div className={styles.gameScriptHeader}>
                <span className={styles.gameScriptTitle}>{script.title}</span>
                <span className={styles.gameScriptProbability}>{script.probability}%</span>
              </div>
              <div className={styles.gameScriptDescription}>{script.description}</div>
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
              <div className={styles.featuredGame}>
                {/* Header */}
                <div className={styles.featuredHeader}>
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
                </div>

                {/* Active Bets Section */}
                {renderActiveBets(featuredGame)}

                {/* Best Odds and Public Betting Side by Side */}
                <div className={styles.featuredOddsAndBetting}>
                  {/* Best Odds Section */}
                  {renderBestOdds(featuredGame)}

                  {/* Public Betting Section */}
                  {renderPublicBetting(featuredGame)}
                </div>

                {/* Game Scripts Section */}
                {renderGameScripts(featuredGame)}
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
                            style={dataCount === 4 ? {
                              background: 'rgba(30, 58, 138, 0.35)',
                              borderColor: 'rgba(96, 165, 250, 0.5)',
                              color: 'rgba(147, 197, 253, 0.95)'
                            } : {}}
                          >
                            Indicator active
                          </span>
                          <span 
                            className={styles.gameCardPill}
                            style={game.picks.total > 0 ? {
                              background: 'rgba(234, 88, 12, 0.25)',
                              borderColor: 'rgba(251, 146, 60, 0.5)',
                              color: 'rgba(251, 146, 60, 0.95)'
                            } : {}}
                          >
                            {game.picks.total} picks active
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
                      </div>
                      <span className={styles.gameCardTime}>
                        {formatKickoffDate(game.kickoff)} · {game.kickoffLabel}
                      </span>
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
