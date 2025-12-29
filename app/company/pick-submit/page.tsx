'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FaFootballBall, FaBasketballBall, FaEdit, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import styles from './pick-submit.module.css'

type Game = {
  game_id: string
  odds_api_id: string
  sport: string
  sport_emoji: string
  home_team: string
  away_team: string
  home_team_abbr: string
  away_team_abbr: string
  home_team_logo: string | null
  away_team_logo: string | null
  game_time: string
  game_time_est: string
  has_odds: boolean
}

type Market = {
  book: string
  team?: string
  type?: string
  point?: number
  odds: number
  side?: string
}

type SlatePick = {
  id: string
  bet_title: string
  line: string
  odds: string
  sportsbook: string
  game_title: string
  away_team_name: string
  home_team_name: string
  game_time: string
  game_time_est: string
  units: string
  analysis: string
  sport: string
  sport_emoji: string
  game_id: string
  away_team_logo: string | null
  home_team_logo: string | null
  prop_image: string | null
  bet_type: 'spread' | 'moneyline' | 'total' | 'prop'
  bet_team_logo: string | null // The specific team logo for spread/ML bets
  bet_team_name: string | null // The specific team name for spread/ML bets
}

type Bettor = {
  id: string
  name: string
}

export default function SubmitPicksPage() {
  const router = useRouter()
  
  // Bettor state
  const [bettors, setBettors] = useState<Bettor[]>([])
  const [selectedBettorId, setSelectedBettorId] = useState<string>('')
  
  // Sport & Games state
  const [selectedSport, setSelectedSport] = useState<string>('')
  const [games, setGames] = useState<Game[]>([])
  const [expandedGame, setExpandedGame] = useState<string | null>(null)
  
  // Markets state
  const [gameMarkets, setGameMarkets] = useState<Record<string, any>>({})
  const [loadingMarkets, setLoadingMarkets] = useState<Record<string, boolean>>({})
  
  // Props state
  const [gameProps, setGameProps] = useState<Record<string, any>>({})
  const [loadingProps, setLoadingProps] = useState<Record<string, boolean>>({})
  const [expandedProp, setExpandedProp] = useState<string | null>(null)
  
  // Book selection state (when user clicks a bet type) - now inline, not modal
  const [expandedBet, setExpandedBet] = useState<string | null>(null)
  
  // Slate state (right side)
  const [slatePicks, setSlatePicks] = useState<SlatePick[]>([])
  const [editingPickId, setEditingPickId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  // Custom pick state
  const [showCustomPick, setShowCustomPick] = useState(false)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Load bettors on mount
  useEffect(() => {
    fetchBettors()
  }, [])

  const fetchBettors = async () => {
    try {
      const { data, error } = await supabase
        .from('bettors')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setBettors(data || [])
    } catch (err: any) {
      console.error('Failed to load bettors:', err)
    }
  }

  const fetchGames = async (sport: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analyst-picks/upcoming-games?sport=${sport}`)
      const data = await res.json()
      
      if (data.success) {
        console.log('📊 Games received:', data.games.length)
        console.log('🎯 First game logos:', {
          game: data.games[0]?.home_team + ' vs ' + data.games[0]?.away_team,
          home_logo: data.games[0]?.home_team_logo,
          away_logo: data.games[0]?.away_team_logo
        })
        setGames(data.games)
      } else {
        setError(data.error || 'Failed to load games')
      }
    } catch (err: any) {
      setError('Failed to load games')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMarkets = async (game: Game) => {
    if (gameMarkets[game.game_id]) return // Already loaded
    
    setLoadingMarkets(prev => ({ ...prev, [game.game_id]: true }))
    try {
      const res = await fetch(`/api/analyst-picks/game-markets?oddsApiId=${game.odds_api_id}&sport=${selectedSport}`)
      const data = await res.json()
      
      if (data.success) {
        // Store both best_lines and all_lines from new API structure
        setGameMarkets(prev => ({ 
          ...prev, 
          [game.game_id]: {
            best_lines: data.best_lines,
            all_lines: data.all_lines,
            available_books: data.available_books
          }
        }))
      }
    } catch (err: any) {
      console.error('Failed to load markets:', err)
    } finally {
      setLoadingMarkets(prev => ({ ...prev, [game.game_id]: false }))
    }
  }

  const fetchProps = async (game: Game) => {
    // Only fetch props for NFL and NBA
    if (selectedSport !== 'nfl' && selectedSport !== 'nba') return
    if (gameProps[game.game_id]) return // Already loaded
    
    setLoadingProps(prev => ({ ...prev, [game.game_id]: true }))
    try {
      const res = await fetch(`/api/analyst-picks/player-props?oddsApiId=${game.odds_api_id}&sport=${selectedSport}`)
      const data = await res.json()
      
      if (data.success) {
        // Group props by position
        const grouped = groupPropsByPosition(data.players, selectedSport)
        setGameProps(prev => ({ 
          ...prev, 
          [game.game_id]: grouped
        }))
      }
    } catch (err: any) {
      console.error('Failed to load props:', err)
    } finally {
      setLoadingProps(prev => ({ ...prev, [game.game_id]: false }))
    }
  }

  // Helper to group props by position
  const groupPropsByPosition = (players: any[], sport: string) => {
    const positionOrder = sport === 'nfl' 
      ? ['QB', 'RB', 'WR', 'TE', 'K']
      : ['Guard', 'Forward', 'Center']
    
    const grouped: Record<string, any[]> = {}
    
    players.forEach(player => {
      const position = sport === 'nfl' 
        ? player.position 
        : simplifyNBAPosition(player.position)
      
      if (!grouped[position]) {
        grouped[position] = []
      }
      grouped[position].push(player)
    })
    
    // Sort each position group by player name
    Object.keys(grouped).forEach(pos => {
      grouped[pos].sort((a, b) => a.player_name.localeCompare(b.player_name))
    })
    
    return grouped
  }

  // Helper to simplify NBA positions
  const simplifyNBAPosition = (position: string) => {
    const pos = position.toUpperCase()
    if (pos.includes('G') || pos === 'PG' || pos === 'SG') return 'Guard'
    if (pos.includes('F') || pos === 'SF' || pos === 'PF') return 'Forward'
    if (pos.includes('C')) return 'Center'
    return 'Guard' // Default
  }

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    setGames([])
    setExpandedGame(null)
    setGameMarkets({})
    fetchGames(sport)
  }

  const handleGameClick = (game: Game) => {
    if (expandedGame === game.game_id) {
      setExpandedGame(null)
    } else {
      setExpandedGame(game.game_id)
      fetchMarkets(game)
      fetchProps(game) // Also fetch props for NFL/NBA
    }
  }

  // Helper to extract team name without city
  const getTeamName = (fullName: string) => {
    const parts = fullName.split(' ')
    return parts[parts.length - 1] // Last word is usually the team name
  }

  // Filter games by search query
  const filteredGames = games.filter(game => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      game.home_team.toLowerCase().includes(query) ||
      game.away_team.toLowerCase().includes(query) ||
      getTeamName(game.home_team).toLowerCase().includes(query) ||
      getTeamName(game.away_team).toLowerCase().includes(query)
    )
  })

  const addPickToSlate = (
    game: Game, 
    betTitle: string, 
    line: string, 
    odds: number, 
    book: string,
    betType: 'spread' | 'moneyline' | 'total' | 'prop',
    teamName?: string // For spreads/MLs - which team is being bet
  ) => {
    // Determine which logo to show for the bet title
    let betTeamLogo: string | null = null
    let betTeamName: string | null = null
    
    if (betType === 'spread' || betType === 'moneyline') {
      // For spreads/MLs, determine which team is being bet
      const isHomeTeam = teamName && (
        teamName.toLowerCase().includes(getTeamName(game.home_team).toLowerCase()) ||
        getTeamName(game.home_team).toLowerCase().includes(teamName.toLowerCase())
      )
      
      if (isHomeTeam) {
        betTeamLogo = game.home_team_logo
        betTeamName = getTeamName(game.home_team)
      } else {
        betTeamLogo = game.away_team_logo
        betTeamName = getTeamName(game.away_team)
      }
    }
    // For totals, we'll show both logos (handled in rendering)
    // For props, we'll use prop_image (future)
    
    const newPick: SlatePick = {
      id: `pick_${Date.now()}_${Math.random()}`,
      bet_title: betTitle,
      line,
      odds: odds > 0 ? `+${odds}` : String(odds),
      sportsbook: book,
      game_title: `${getTeamName(game.away_team)} @ ${getTeamName(game.home_team)}`,
      away_team_name: getTeamName(game.away_team),
      home_team_name: getTeamName(game.home_team),
      game_time: game.game_time,
      game_time_est: game.game_time_est,
      units: '',
      analysis: '',
      sport: game.sport,
      sport_emoji: game.sport_emoji,
      game_id: game.game_id,
      away_team_logo: game.away_team_logo,
      home_team_logo: game.home_team_logo,
      prop_image: null,
      bet_type: betType,
      bet_team_logo: betTeamLogo,
      bet_team_name: betTeamName
    }
    
    setSlatePicks(prev => [...prev, newPick])
  }

  const updatePickInSlate = (pickId: string, field: 'units' | 'analysis', value: string) => {
    setSlatePicks(prev => prev.map(pick => 
      pick.id === pickId ? { ...pick, [field]: value } : pick
    ))
  }

  const removePickFromSlate = (pickId: string) => {
    setSlatePicks(prev => prev.filter(pick => pick.id !== pickId))
    setDeleteConfirmId(null)
  }

  const handleSubmitPicks = async () => {
    if (!selectedBettorId) {
      setError('Please select an analyst')
      return
    }

    if (slatePicks.length === 0) {
      setError('Please add at least one pick')
      return
    }

    // Validate all picks have units and analysis
    const incompletePicks = slatePicks.filter(p => !p.units || !p.analysis)
    if (incompletePicks.length > 0) {
      setError(`${incompletePicks.length} pick(s) missing units or analysis`)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const easternNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
      const easternTimestamp = new Date(easternNow)

      const picksToInsert = slatePicks.map(pick => ({
        bettor_id: selectedBettorId,
        sport: pick.sport,
        sport_emoji: pick.sport_emoji,
        bet_title: pick.bet_title,
        odds: pick.odds,
        sportsbook: pick.sportsbook,
        units: parseFloat(pick.units),
        analysis: pick.analysis,
        game_time: pick.game_time,
        posted_at: easternTimestamp.toISOString(),
        game_id: pick.game_id,
        bet_type: 'Singles',
        is_active: true,
        is_free: false,
        result: 'pending',
        recap_status: 'pending',
        away_team_image: pick.away_team_logo,
        home_team_image: pick.home_team_logo,
        prop_image: pick.prop_image,
        game_title: pick.game_title,
      }))

      const { error: insertError } = await supabase
        .from('picks')
        .insert(picksToInsert)

      if (insertError) throw insertError

      // Success! Redirect to picks page
      router.push('/picks')
    } catch (err: any) {
      setError(err.message || 'Failed to submit picks')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Submit Picks</h1>
        <p className={styles.subtitle}>Build your pick slate</p>

        {/* Bettor Selection */}
        <div className={styles.bettorSection}>
          <label className={styles.bettorLabel}>Select Analyst</label>
          <select
            className={styles.bettorSelect}
            value={selectedBettorId}
            onChange={(e) => setSelectedBettorId(e.target.value)}
          >
            <option value="">-- Select Analyst --</option>
            {bettors.map((bettor) => (
              <option key={bettor.id} value={bettor.id}>
                {bettor.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Split Screen Layout */}
      <div className={styles.splitLayout}>
        
        {/* LEFT SIDE - Picking Process */}
        <div className={styles.leftPanel}>
          <h2 className={styles.panelTitle}>Add Picks</h2>

          {/* Sport Selector */}
          <div className={styles.sportSelector}>
            <button
              className={`${styles.sportBtn} ${selectedSport === 'nfl' ? styles.active : ''}`}
              onClick={() => handleSportChange('nfl')}
            >
              <FaFootballBall /> NFL
            </button>
            <button
              className={`${styles.sportBtn} ${selectedSport === 'nba' ? styles.active : ''}`}
              onClick={() => handleSportChange('nba')}
            >
              <FaBasketballBall /> NBA
            </button>
            <button
              className={`${styles.sportBtn} ${selectedSport === 'cfb' ? styles.active : ''}`}
              onClick={() => handleSportChange('cfb')}
            >
              <FaFootballBall /> CFB
            </button>
            <button
              className={`${styles.sportBtn} ${selectedSport === 'cbb' ? styles.active : ''}`}
              onClick={() => handleSportChange('cbb')}
            >
              <FaBasketballBall /> CBB
            </button>
          </div>

          {/* Search Bar */}
          {selectedSport && games.length > 0 && (
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search teams or players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          )}

          {/* Games List */}
          {loading ? (
            <div className={styles.loading}>Loading games...</div>
          ) : games.length === 0 && selectedSport ? (
            <div className={styles.noData}>No games found</div>
          ) : filteredGames.length === 0 && searchQuery ? (
            <div className={styles.noData}>No games match "{searchQuery}"</div>
          ) : (
            <div className={styles.gamesList}>
              {filteredGames.map((game) => (
                <div key={game.game_id} className={styles.gameItem}>
                  <button
                    className={styles.gameHeader}
                    onClick={() => handleGameClick(game)}
                  >
                    <div className={styles.gameTeams}>
                      {game.away_team_logo ? (
                        <img src={game.away_team_logo} alt={game.away_team} />
                      ) : (
                        <div className={styles.logoPlaceholder}>?</div>
                      )}
                      <span className={styles.awayTeam}>{getTeamName(game.away_team)}</span>
                      <span className={styles.atSymbol}>@</span>
                      {game.home_team_logo ? (
                        <img src={game.home_team_logo} alt={game.home_team} />
                      ) : (
                        <div className={styles.logoPlaceholder}>?</div>
                      )}
                      <span className={styles.homeTeam}>{getTeamName(game.home_team)}</span>
                      <span className={styles.gameTime}>{game.game_time_est}</span>
                    </div>
                    <div className={styles.gameExpand}>
                      {expandedGame === game.game_id ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                  </button>

                  {/* Markets Dropdown */}
                  {expandedGame === game.game_id && (
                    <div className={styles.marketsDropdown}>
                      {loadingMarkets[game.game_id] ? (
                        <div className={styles.loadingMarkets}>Loading odds...</div>
                      ) : gameMarkets[game.game_id] && gameMarkets[game.game_id].best_lines ? (
                        <div className={styles.marketsContainer}>
                          {/* Spreads */}
                          {gameMarkets[game.game_id].best_lines.spreads && (
                            <div className={styles.marketSection}>
                              <h4 className={styles.marketTitle}>Spreads</h4>
                              <div className={styles.sideBySide}>
                                {/* Away Spread */}
                                {gameMarkets[game.game_id].best_lines.spreads.away && (() => {
                                  const bestAway = gameMarkets[game.game_id].best_lines.spreads.away
                                  const teamName = getTeamName(game.away_team)
                                  const betKey = `spread_away_${game.game_id}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div className={styles.betCard}>
                                      <button
                                        className={`${styles.betCardBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        {game.away_team_logo && (
                                          <img src={game.away_team_logo} alt="" className={styles.betCardLogo} />
                                        )}
                                        <div className={styles.betCardInfo}>
                                          <span className={styles.betCardTeam}>{teamName}</span>
                                          <span className={styles.betCardLine}>
                                            {bestAway.point > 0 ? '+' : ''}{bestAway.point} ({bestAway.odds > 0 ? '+' : ''}{bestAway.odds})
                                          </span>
                                        </div>
                                      </button>
                                      
                                      {isExpanded && gameMarkets[game.game_id].all_lines?.spreads?.away && (
                                        <div className={styles.allBooks}>
                                          {gameMarkets[game.game_id].all_lines.spreads.away.map((group: any[], idx: number) => 
                                            group.map((market: any, bookIdx: number) => (
                                              <button
                                                key={`${idx}-${bookIdx}`}
                                                className={styles.bookBtn}
                                                onClick={() => {
                                                  const betTitle = `${teamName} ${market.point > 0 ? '+' : ''}${market.point}`
                                                  addPickToSlate(game, betTitle, `${market.point > 0 ? '+' : ''}${market.point}`, market.odds, market.book, 'spread', teamName)
                                                  setExpandedBet(null)
                                                }}
                                              >
                                                <span className={styles.bookName}>{market.book}</span>
                                                <span className={styles.bookLine}>{market.point > 0 ? '+' : ''}{market.point}</span>
                                                <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                                
                                {/* Home Spread */}
                                {gameMarkets[game.game_id].best_lines.spreads.home && (() => {
                                  const bestHome = gameMarkets[game.game_id].best_lines.spreads.home
                                  const teamName = getTeamName(game.home_team)
                                  const betKey = `spread_home_${game.game_id}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div className={styles.betCard}>
                                      <button
                                        className={`${styles.betCardBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        {game.home_team_logo && (
                                          <img src={game.home_team_logo} alt="" className={styles.betCardLogo} />
                                        )}
                                        <div className={styles.betCardInfo}>
                                          <span className={styles.betCardTeam}>{teamName}</span>
                                          <span className={styles.betCardLine}>
                                            {bestHome.point > 0 ? '+' : ''}{bestHome.point} ({bestHome.odds > 0 ? '+' : ''}{bestHome.odds})
                                          </span>
                                        </div>
                                      </button>
                                      
                                      {isExpanded && gameMarkets[game.game_id].all_lines?.spreads?.home && (
                                        <div className={styles.allBooks}>
                                          {gameMarkets[game.game_id].all_lines.spreads.home.map((group: any[], idx: number) => 
                                            group.map((market: any, bookIdx: number) => (
                                              <button
                                                key={`${idx}-${bookIdx}`}
                                                className={styles.bookBtn}
                                                onClick={() => {
                                                  const betTitle = `${teamName} ${market.point > 0 ? '+' : ''}${market.point}`
                                                  addPickToSlate(game, betTitle, `${market.point > 0 ? '+' : ''}${market.point}`, market.odds, market.book, 'spread', teamName)
                                                  setExpandedBet(null)
                                                }}
                                              >
                                                <span className={styles.bookName}>{market.book}</span>
                                                <span className={styles.bookLine}>{market.point > 0 ? '+' : ''}{market.point}</span>
                                                <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Moneylines */}
                          {gameMarkets[game.game_id].best_lines.moneylines && (
                            <div className={styles.marketSection}>
                              <h4 className={styles.marketTitle}>Moneylines</h4>
                              <div className={styles.sideBySide}>
                                {/* Away ML */}
                                {gameMarkets[game.game_id].best_lines.moneylines.away && (() => {
                                  const bestAway = gameMarkets[game.game_id].best_lines.moneylines.away
                                  const teamName = getTeamName(game.away_team)
                                  const betKey = `ml_away_${game.game_id}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div className={styles.betCard}>
                                      <button
                                        className={`${styles.betCardBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        {game.away_team_logo && (
                                          <img src={game.away_team_logo} alt="" className={styles.betCardLogo} />
                                        )}
                                        <div className={styles.betCardInfo}>
                                          <span className={styles.betCardTeam}>{teamName}</span>
                                          <span className={styles.betCardLine}>
                                            {bestAway.odds > 0 ? '+' : ''}{bestAway.odds}
                                          </span>
                                        </div>
                                      </button>
                                      
                                      {isExpanded && gameMarkets[game.game_id].all_lines?.moneylines?.away && (
                                        <div className={styles.allBooks}>
                                          {gameMarkets[game.game_id].all_lines.moneylines.away.map((group: any[], idx: number) => 
                                            group.map((market: any, bookIdx: number) => (
                                              <button
                                                key={`${idx}-${bookIdx}`}
                                                className={styles.bookBtn}
                                                onClick={() => {
                                                  const betTitle = `${teamName} ML`
                                                  addPickToSlate(game, betTitle, 'ML', market.odds, market.book, 'moneyline', teamName)
                                                  setExpandedBet(null)
                                                }}
                                              >
                                                <span className={styles.bookName}>{market.book}</span>
                                                <span className={styles.bookLine}>ML</span>
                                                <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                                
                                {/* Home ML */}
                                {gameMarkets[game.game_id].best_lines.moneylines.home && (() => {
                                  const bestHome = gameMarkets[game.game_id].best_lines.moneylines.home
                                  const teamName = getTeamName(game.home_team)
                                  const betKey = `ml_home_${game.game_id}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div className={styles.betCard}>
                                      <button
                                        className={`${styles.betCardBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        {game.home_team_logo && (
                                          <img src={game.home_team_logo} alt="" className={styles.betCardLogo} />
                                        )}
                                        <div className={styles.betCardInfo}>
                                          <span className={styles.betCardTeam}>{teamName}</span>
                                          <span className={styles.betCardLine}>
                                            {bestHome.odds > 0 ? '+' : ''}{bestHome.odds}
                                          </span>
                                        </div>
                                      </button>
                                      
                                      {isExpanded && gameMarkets[game.game_id].all_lines?.moneylines?.home && (
                                        <div className={styles.allBooks}>
                                          {gameMarkets[game.game_id].all_lines.moneylines.home.map((group: any[], idx: number) => 
                                            group.map((market: any, bookIdx: number) => (
                                              <button
                                                key={`${idx}-${bookIdx}`}
                                                className={styles.bookBtn}
                                                onClick={() => {
                                                  const betTitle = `${teamName} ML`
                                                  addPickToSlate(game, betTitle, 'ML', market.odds, market.book, 'moneyline', teamName)
                                                  setExpandedBet(null)
                                                }}
                                              >
                                                <span className={styles.bookName}>{market.book}</span>
                                                <span className={styles.bookLine}>ML</span>
                                                <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Totals */}
                          {gameMarkets[game.game_id].best_lines.totals && (
                            <div className={styles.marketSection}>
                              <h4 className={styles.marketTitle}>Totals</h4>
                              <div className={styles.sideBySide}>
                                {/* Under */}
                                {gameMarkets[game.game_id].best_lines.totals.under && (() => {
                                  const bestUnder = gameMarkets[game.game_id].best_lines.totals.under
                                  const betKey = `total_under_${game.game_id}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div className={styles.betCard}>
                                      <button
                                        className={`${styles.betCardBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        <div className={styles.totalLogos}>
                                          {game.away_team_logo && <img src={game.away_team_logo} alt="" />}
                                          {game.home_team_logo && <img src={game.home_team_logo} alt="" />}
                                        </div>
                                        <div className={styles.betCardInfo}>
                                          <span className={styles.betCardTeam}>UNDER</span>
                                          <span className={styles.betCardLine}>
                                            {bestUnder.point} ({bestUnder.odds > 0 ? '+' : ''}{bestUnder.odds})
                                          </span>
                                        </div>
                                      </button>
                                      
                                      {isExpanded && gameMarkets[game.game_id].all_lines?.totals?.under && (
                                        <div className={styles.allBooks}>
                                          {gameMarkets[game.game_id].all_lines.totals.under.map((group: any[], idx: number) => 
                                            group.map((market: any, bookIdx: number) => (
                                              <button
                                                key={`${idx}-${bookIdx}`}
                                                className={styles.bookBtn}
                                                onClick={() => {
                                                  const betTitle = `${getTeamName(game.away_team)} / ${getTeamName(game.home_team)} U${market.point}`
                                                  addPickToSlate(game, betTitle, `U${market.point}`, market.odds, market.book, 'total')
                                                  setExpandedBet(null)
                                                }}
                                              >
                                                <span className={styles.bookName}>{market.book}</span>
                                                <span className={styles.bookLine}>U{market.point}</span>
                                                <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                                
                                {/* Over */}
                                {gameMarkets[game.game_id].best_lines.totals.over && (() => {
                                  const bestOver = gameMarkets[game.game_id].best_lines.totals.over
                                  const betKey = `total_over_${game.game_id}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div className={styles.betCard}>
                                      <button
                                        className={`${styles.betCardBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        <div className={styles.totalLogos}>
                                          {game.away_team_logo && <img src={game.away_team_logo} alt="" />}
                                          {game.home_team_logo && <img src={game.home_team_logo} alt="" />}
                                        </div>
                                        <div className={styles.betCardInfo}>
                                          <span className={styles.betCardTeam}>OVER</span>
                                          <span className={styles.betCardLine}>
                                            {bestOver.point} ({bestOver.odds > 0 ? '+' : ''}{bestOver.odds})
                                          </span>
                                        </div>
                                      </button>
                                      
                                      {isExpanded && gameMarkets[game.game_id].all_lines?.totals?.over && (
                                        <div className={styles.allBooks}>
                                          {gameMarkets[game.game_id].all_lines.totals.over.map((group: any[], idx: number) => 
                                            group.map((market: any, bookIdx: number) => (
                                              <button
                                                key={`${idx}-${bookIdx}`}
                                                className={styles.bookBtn}
                                                onClick={() => {
                                                  const betTitle = `${getTeamName(game.away_team)} / ${getTeamName(game.home_team)} O${market.point}`
                                                  addPickToSlate(game, betTitle, `O${market.point}`, market.odds, market.book, 'total')
                                                  setExpandedBet(null)
                                                }}
                                              >
                                                <span className={styles.bookName}>{market.book}</span>
                                                <span className={styles.bookLine}>O{market.point}</span>
                                                <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Props Section - Only for NFL and NBA */}
                          {(selectedSport === 'nfl' || selectedSport === 'nba') && (
                            <div className={styles.marketSection}>
                              <h4 className={styles.marketTitle}>Props</h4>
                              {loadingProps[game.game_id] ? (
                                <div className={styles.loadingMarkets}>Loading props...</div>
                              ) : gameProps[game.game_id] ? (
                                <div className={styles.propsContainer}>
                                  {Object.entries(gameProps[game.game_id]).map(([position, players]: [string, any]) => (
                                    <div key={position} className={styles.positionGroup}>
                                      <h5 className={styles.positionTitle}>{position}</h5>
                                      {players.map((player: any) => (
                                        <div key={player.player_name} className={styles.playerGroup}>
                                          <div className={styles.playerHeader}>
                                            {player.headshot_url && (
                                              <img src={player.headshot_url} alt={player.player_name} className={styles.playerHeadshot} />
                                            )}
                                            <div className={styles.playerInfo}>
                                              <span className={styles.playerName}>{player.player_name}</span>
                                              <span className={styles.playerTeam}>{player.team}</span>
                                            </div>
                                          </div>
                                          
                                          {/* Group props by market type */}
                                          {(() => {
                                            const propsByMarket: Record<string, any[]> = {}
                                            player.props.forEach((prop: any) => {
                                              if (!propsByMarket[prop.market]) {
                                                propsByMarket[prop.market] = []
                                              }
                                              propsByMarket[prop.market].push(prop)
                                            })
                                            
                                            return Object.entries(propsByMarket).map(([market, props]: [string, any]) => {
                                              // Group by point value (for O/U markets)
                                              const byPoint: Record<string, any[]> = {}
                                              props.forEach((prop: any) => {
                                                const key = prop.point ? `${prop.point}` : 'anytime'
                                                if (!byPoint[key]) {
                                                  byPoint[key] = []
                                                }
                                                byPoint[key].push(prop)
                                              })
                                              
                                              return Object.entries(byPoint).map(([point, propList]: [string, any]) => {
                                                const firstProp = propList[0]
                                                const marketDisplay = firstProp.market_display || market
                                                const propKey = `prop_${player.player_name}_${market}_${point}`
                                                const isExpanded = expandedProp === propKey
                                                
                                                // Separate overs and unders
                                                const overs = propList.filter((p: any) => p.name.toLowerCase().includes('over'))
                                                const unders = propList.filter((p: any) => p.name.toLowerCase().includes('under'))
                                                
                                                if (overs.length === 0 && unders.length === 0) return null // Skip if no O/U
                                                
                                                return (
                                                  <div key={propKey} className={styles.propCard}>
                                                    <button
                                                      className={`${styles.propCardBtn} ${isExpanded ? styles.expanded : ''}`}
                                                      onClick={() => setExpandedProp(isExpanded ? null : propKey)}
                                                    >
                                                      <span className={styles.propMarket}>{marketDisplay}</span>
                                                      {firstProp.point && (
                                                        <span className={styles.propLine}>O/U {firstProp.point}</span>
                                                      )}
                                                    </button>
                                                    
                                                    {isExpanded && (
                                                      <div className={styles.propBooks}>
                                                        {/* Overs */}
                                                        {overs.length > 0 && (
                                                          <div className={styles.propSide}>
                                                            <span className={styles.propSideLabel}>Over</span>
                                                            {overs.map((prop: any, idx: number) => (
                                                              <button
                                                                key={idx}
                                                                className={styles.propBookBtn}
                                                                onClick={() => {
                                                                  const betTitle = `${player.player_name} ${marketDisplay} O${prop.point || ''}`
                                                                  addPickToSlate(game, betTitle, `O${prop.point || ''}`, prop.odds, prop.book, 'prop')
                                                                  setExpandedProp(null)
                                                                }}
                                                              >
                                                                <span className={styles.bookName}>{prop.book}</span>
                                                                <span className={styles.bookOdds}>{prop.odds > 0 ? '+' : ''}{prop.odds}</span>
                                                              </button>
                                                            ))}
                                                          </div>
                                                        )}
                                                        
                                                        {/* Unders */}
                                                        {unders.length > 0 && (
                                                          <div className={styles.propSide}>
                                                            <span className={styles.propSideLabel}>Under</span>
                                                            {unders.map((prop: any, idx: number) => (
                                                              <button
                                                                key={idx}
                                                                className={styles.propBookBtn}
                                                                onClick={() => {
                                                                  const betTitle = `${player.player_name} ${marketDisplay} U${prop.point || ''}`
                                                                  addPickToSlate(game, betTitle, `U${prop.point || ''}`, prop.odds, prop.book, 'prop')
                                                                  setExpandedProp(null)
                                                                }}
                                                              >
                                                                <span className={styles.bookName}>{prop.book}</span>
                                                                <span className={styles.bookOdds}>{prop.odds > 0 ? '+' : ''}{prop.odds}</span>
                                                              </button>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                )
                                              })
                                            })
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className={styles.propsPlaceholder}>
                                  <p>No props available for this game</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.noData}>No odds available</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Slate */}
        <div className={styles.rightPanel}>
          <div className={styles.slateHeader}>
            <h2 className={styles.panelTitle}>Pick Slate</h2>
            <div className={styles.slateHeaderRight}>
              <span className={styles.pickCount}>{slatePicks.length} pick{slatePicks.length !== 1 ? 's' : ''}</span>
              <button
                className={styles.customPickBtn}
                onClick={() => setShowCustomPick(true)}
              >
                + Custom Pick
              </button>
            </div>
          </div>

          {slatePicks.length === 0 ? (
            <div className={styles.emptySlate}>
              <p>No picks added yet</p>
              <small>Select bets from the left to build your slate</small>
            </div>
          ) : (
            <div className={styles.slateList}>
              {slatePicks.map((pick) => (
                <div key={pick.id} className={styles.slatePickCard}>
                  <div className={styles.pickCardHeader}>
                    <div className={styles.pickBetInfo}>
                      <div className={styles.pickBetTitle}>
                        {/* Show logo based on bet type */}
                        {pick.bet_type === 'spread' || pick.bet_type === 'moneyline' ? (
                          // Spread/ML: Show single team logo
                          pick.bet_team_logo && <img src={pick.bet_team_logo} alt="" className={styles.pickTeamLogo} />
                        ) : pick.bet_type === 'total' ? (
                          // Total: Show both logos (overlapped)
                          <div className={styles.totalLogos}>
                            {pick.away_team_logo && <img src={pick.away_team_logo} alt="" className={styles.pickTeamLogoTotal} />}
                            {pick.home_team_logo && <img src={pick.home_team_logo} alt="" className={styles.pickTeamLogoTotal} />}
                          </div>
                        ) : pick.bet_type === 'prop' ? (
                          // Prop: Show player image (future)
                          pick.prop_image && <img src={pick.prop_image} alt="" className={styles.pickPlayerImage} />
                        ) : null}
                        <strong>{pick.bet_title}</strong>
                      </div>
                      <span className={styles.pickOddsInfo}>
                        {pick.odds}, {pick.sportsbook}
                      </span>
                    </div>
                    <div className={styles.pickActions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => setEditingPickId(editingPickId === pick.id ? null : pick.id)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDeleteConfirmId(pick.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <div className={styles.pickGameInfo}>
                    {/* Game info: (Logo) Away @ (Logo) Home */}
                    {pick.away_team_logo && <img src={pick.away_team_logo} alt="" className={styles.gameInfoLogo} />}
                    <span className={styles.teamName}>{pick.away_team_name}</span>
                    <span className={styles.atSymbol}>@</span>
                    {pick.home_team_logo && <img src={pick.home_team_logo} alt="" className={styles.gameInfoLogo} />}
                    <span className={styles.teamName}>{pick.home_team_name}</span>
                    <span className={styles.pickGameTime}>{pick.game_time_est}</span>
                  </div>

                  <div className={styles.pickInputs}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Units at risk"
                      value={pick.units}
                      onChange={(e) => updatePickInSlate(pick.id, 'units', e.target.value)}
                      className={styles.unitsInput}
                    />

                    <textarea
                      placeholder="Analysis..."
                      value={pick.analysis}
                      onChange={(e) => updatePickInSlate(pick.id, 'analysis', e.target.value)}
                      className={styles.analysisInput}
                      rows={4}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          {slatePicks.length > 0 && (
            <button
              className={styles.submitBtn}
              onClick={handleSubmitPicks}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : `Submit ${slatePicks.length} Pick${slatePicks.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {/* Custom Pick Modal */}
      {showCustomPick && (
        <div className={styles.modal} onClick={() => setShowCustomPick(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Custom Pick</h3>
              <button className={styles.modalClose} onClick={() => setShowCustomPick(false)}>
                <IoClose />
              </button>
            </div>
            <p className={styles.modalSubtext}>Coming soon - manually enter all pick details</p>
            <button className={styles.modalBtnCancel} onClick={() => setShowCustomPick(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className={styles.modal} onClick={() => setDeleteConfirmId(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Remove Pick?</h3>
            <p>Are you sure you want to remove this pick from your slate?</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtnCancel}
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className={styles.modalBtnConfirm}
                onClick={() => removePickFromSlate(deleteConfirmId)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
