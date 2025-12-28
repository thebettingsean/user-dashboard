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
        setGameMarkets(prev => ({ ...prev, [game.game_id]: data.markets }))
      }
    } catch (err: any) {
      console.error('Failed to load markets:', err)
    } finally {
      setLoadingMarkets(prev => ({ ...prev, [game.game_id]: false }))
    }
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
    }
  }

  // Helper to extract team name without city
  const getTeamName = (fullName: string) => {
    const parts = fullName.split(' ')
    return parts[parts.length - 1] // Last word is usually the team name
  }

  const addPickToSlate = (game: Game, betTitle: string, line: string, odds: number, book: string) => {
    const newPick: SlatePick = {
      id: `pick_${Date.now()}_${Math.random()}`,
      bet_title: betTitle,
      line,
      odds: odds > 0 ? `+${odds}` : String(odds),
      sportsbook: book,
      game_title: `${getTeamName(game.away_team)} @ ${getTeamName(game.home_team)}`,
      game_time: game.game_time,
      game_time_est: game.game_time_est,
      units: '',
      analysis: '',
      sport: game.sport,
      sport_emoji: game.sport_emoji,
      game_id: game.game_id,
      away_team_logo: game.away_team_logo,
      home_team_logo: game.home_team_logo,
      prop_image: null
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

          {/* Games List */}
          {loading ? (
            <div className={styles.loading}>Loading games...</div>
          ) : games.length === 0 && selectedSport ? (
            <div className={styles.noData}>No games found</div>
          ) : (
            <div className={styles.gamesList}>
              {games.map((game) => (
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
                      ) : gameMarkets[game.game_id] ? (
                        <div className={styles.marketsContainer}>
                          {/* Spreads */}
                          {gameMarkets[game.game_id].spreads && (
                            <div className={styles.marketSection}>
                              <h4>Spreads</h4>
                              <div className={styles.betTypeList}>
                                {[...gameMarkets[game.game_id].spreads.away, ...gameMarkets[game.game_id].spreads.home].map((marketGroup: Market[], idx: number) => {
                                  const firstMarket = marketGroup[0]
                                  const betTitle = `${getTeamName(firstMarket.team)} ${firstMarket.point > 0 ? '+' : ''}${firstMarket.point}`
                                  const betKey = `spread_${game.game_id}_${idx}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div key={idx} className={styles.betTypeItem}>
                                      <button
                                        className={`${styles.betTypeBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        <span className={styles.betTeam}>{getTeamName(firstMarket.team)}</span>
                                        <span className={styles.betLine}>{firstMarket.point > 0 ? '+' : ''}{firstMarket.point}</span>
                                      </button>
                                      
                                      {isExpanded && (
                                        <div className={styles.bookOptions}>
                                          {marketGroup.map((market, bookIdx) => (
                                            <button
                                              key={bookIdx}
                                              className={styles.bookOption}
                                              onClick={() => {
                                                addPickToSlate(game, betTitle, `${firstMarket.point > 0 ? '+' : ''}${firstMarket.point}`, market.odds, market.book)
                                                setExpandedBet(null)
                                              }}
                                            >
                                              <span className={styles.bookName}>{market.book}</span>
                                              <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Moneylines */}
                          {gameMarkets[game.game_id].moneylines && (
                            <div className={styles.marketSection}>
                              <h4>Moneylines</h4>
                              <div className={styles.betTypeList}>
                                {[...gameMarkets[game.game_id].moneylines.away, ...gameMarkets[game.game_id].moneylines.home].map((marketGroup: Market[], idx: number) => {
                                  const firstMarket = marketGroup[0]
                                  const betTitle = `${getTeamName(firstMarket.team)} ML`
                                  const betKey = `ml_${game.game_id}_${idx}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div key={idx} className={styles.betTypeItem}>
                                      <button
                                        className={`${styles.betTypeBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        <span className={styles.betTeam}>{getTeamName(firstMarket.team)}</span>
                                        <span className={styles.betLine}>ML</span>
                                      </button>
                                      
                                      {isExpanded && (
                                        <div className={styles.bookOptions}>
                                          {marketGroup.map((market, bookIdx) => (
                                            <button
                                              key={bookIdx}
                                              className={styles.bookOption}
                                              onClick={() => {
                                                addPickToSlate(game, betTitle, 'ML', market.odds, market.book)
                                                setExpandedBet(null)
                                              }}
                                            >
                                              <span className={styles.bookName}>{market.book}</span>
                                              <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Totals */}
                          {gameMarkets[game.game_id].totals && (
                            <div className={styles.marketSection}>
                              <h4>Totals</h4>
                              <div className={styles.betTypeList}>
                                {[...gameMarkets[game.game_id].totals.over, ...gameMarkets[game.game_id].totals.under].map((marketGroup: Market[], idx: number) => {
                                  const firstMarket = marketGroup[0]
                                  const betTitle = `${getTeamName(game.away_team)} / ${getTeamName(game.home_team)} ${firstMarket.type === 'over' ? 'O' : 'U'}${firstMarket.point}`
                                  const betKey = `total_${game.game_id}_${idx}`
                                  const isExpanded = expandedBet === betKey
                                  
                                  return (
                                    <div key={idx} className={styles.betTypeItem}>
                                      <button
                                        className={`${styles.betTypeBtn} ${isExpanded ? styles.expanded : ''}`}
                                        onClick={() => setExpandedBet(isExpanded ? null : betKey)}
                                      >
                                        <span className={styles.betTeam}>{firstMarket.type?.toUpperCase()}</span>
                                        <span className={styles.betLine}>{firstMarket.point}</span>
                                      </button>
                                      
                                      {isExpanded && (
                                        <div className={styles.bookOptions}>
                                          {marketGroup.map((market, bookIdx) => (
                                            <button
                                              key={bookIdx}
                                              className={styles.bookOption}
                                              onClick={() => {
                                                addPickToSlate(game, betTitle, `${firstMarket.type === 'over' ? 'O' : 'U'}${firstMarket.point}`, market.odds, market.book)
                                                setExpandedBet(null)
                                              }}
                                            >
                                              <span className={styles.bookName}>{market.book}</span>
                                              <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
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
                        {pick.away_team_logo && <img src={pick.away_team_logo} alt="" className={styles.pickTeamLogo} />}
                        {pick.home_team_logo && <img src={pick.home_team_logo} alt="" className={styles.pickTeamLogo} />}
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
                    <span>{pick.game_title}</span>
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
