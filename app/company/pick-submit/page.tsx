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
  
  // Book selection state (when user clicks a bet type)
  const [selectedBet, setSelectedBet] = useState<{
    game: Game
    betTitle: string
    line: string
    markets: Market[]
  } | null>(null)
  
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
                      {game.away_team_logo && <img src={game.away_team_logo} alt="" />}
                      <span>{getTeamName(game.away_team)} @ {getTeamName(game.home_team)}</span>
                      {game.home_team_logo && <img src={game.home_team_logo} alt="" />}
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
                              <div className={styles.betTypeGrid}>
                                {/* Group by team and line */}
                                {Array.from(new Set(
                                  [...gameMarkets[game.game_id].spreads.away, ...gameMarkets[game.game_id].spreads.home]
                                    .map((m: Market) => `${m.team}|${m.point}`)
                                )).map((key) => {
                                  const [team, point] = key.split('|')
                                  const allMarkets = [...gameMarkets[game.game_id].spreads.away, ...gameMarkets[game.game_id].spreads.home]
                                    .filter((m: Market) => m.team === team && String(m.point) === point)
                                  const betTitle = `${getTeamName(team)} ${parseFloat(point) > 0 ? '+' : ''}${point}`
                                  
                                  return (
                                    <button
                                      key={key}
                                      className={styles.betTypeBtn}
                                      onClick={() => setSelectedBet({
                                        game,
                                        betTitle,
                                        line: `${parseFloat(point) > 0 ? '+' : ''}${point}`,
                                        markets: allMarkets
                                      })}
                                    >
                                      <span className={styles.betTeam}>{getTeamName(team)}</span>
                                      <span className={styles.betLine}>{parseFloat(point) > 0 ? '+' : ''}{point}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Moneylines */}
                          {gameMarkets[game.game_id].moneylines && (
                            <div className={styles.marketSection}>
                              <h4>Moneylines</h4>
                              <div className={styles.betTypeGrid}>
                                {Array.from(new Set(
                                  [...gameMarkets[game.game_id].moneylines.away, ...gameMarkets[game.game_id].moneylines.home]
                                    .map((m: Market) => m.team)
                                )).map((team) => {
                                  const allMarkets = [...gameMarkets[game.game_id].moneylines.away, ...gameMarkets[game.game_id].moneylines.home]
                                    .filter((m: Market) => m.team === team)
                                  const betTitle = `${getTeamName(team)} ML`
                                  
                                  return (
                                    <button
                                      key={team}
                                      className={styles.betTypeBtn}
                                      onClick={() => setSelectedBet({
                                        game,
                                        betTitle,
                                        line: 'ML',
                                        markets: allMarkets
                                      })}
                                    >
                                      <span className={styles.betTeam}>{getTeamName(team)}</span>
                                      <span className={styles.betLine}>ML</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Totals */}
                          {gameMarkets[game.game_id].totals && (
                            <div className={styles.marketSection}>
                              <h4>Totals</h4>
                              <div className={styles.betTypeGrid}>
                                {Array.from(new Set(
                                  [...gameMarkets[game.game_id].totals.over, ...gameMarkets[game.game_id].totals.under]
                                    .map((m: Market) => `${m.type}|${m.point}`)
                                )).map((key) => {
                                  const [type, point] = key.split('|')
                                  const allMarkets = [...gameMarkets[game.game_id].totals.over, ...gameMarkets[game.game_id].totals.under]
                                    .filter((m: Market) => m.type === type && String(m.point) === point)
                                  const betTitle = `${getTeamName(game.away_team)} / ${getTeamName(game.home_team)} ${type === 'over' ? 'O' : 'U'}${point}`
                                  
                                  return (
                                    <button
                                      key={key}
                                      className={styles.betTypeBtn}
                                      onClick={() => setSelectedBet({
                                        game,
                                        betTitle,
                                        line: `${type === 'over' ? 'O' : 'U'}${point}`,
                                        markets: allMarkets
                                      })}
                                    >
                                      <span className={styles.betTeam}>{type?.toUpperCase()}</span>
                                      <span className={styles.betLine}>{point}</span>
                                    </button>
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

      {/* Sportsbook Selection Modal */}
      {selectedBet && (
        <div className={styles.modal} onClick={() => setSelectedBet(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Select Sportsbook</h3>
              <button className={styles.modalClose} onClick={() => setSelectedBet(null)}>
                <IoClose />
              </button>
            </div>
            <p className={styles.modalBetInfo}>{selectedBet.betTitle}</p>
            <div className={styles.booksList}>
              {selectedBet.markets.map((market, idx) => (
                <button
                  key={idx}
                  className={styles.bookBtn}
                  onClick={() => {
                    addPickToSlate(selectedBet.game, selectedBet.betTitle, selectedBet.line, market.odds, market.book)
                    setSelectedBet(null)
                  }}
                >
                  <span className={styles.bookName}>{market.book}</span>
                  <span className={styles.bookOdds}>{market.odds > 0 ? '+' : ''}{market.odds}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
