'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FaFootballBall, FaBasketballBall } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { BsCheckCircleFill } from 'react-icons/bs'
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

type PlayerProp = {
  player_name: string
  position: string
  team: string
  headshot_url: string | null
  injury_status: string | null
  props: Array<{
    market: string
    market_display: string
    point: number
    odds: number
    book: string
    name: string
  }>
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
  
  // Step state
  const [step, setStep] = useState<'sport' | 'game' | 'market' | 'odds' | 'input'>('sport')
  
  // Selection state
  const [selectedSport, setSelectedSport] = useState<string>('')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedMarketType, setSelectedMarketType] = useState<string>('') // 'spread_home', 'ml_away', 'over', 'props_home', etc
  const [selectedOdds, setSelectedOdds] = useState<Market | null>(null)
  const [selectedProp, setSelectedProp] = useState<PlayerProp | null>(null)
  const [selectedPropMarket, setSelectedPropMarket] = useState<any | null>(null)
  
  // Data state
  const [games, setGames] = useState<Game[]>([])
  const [markets, setMarkets] = useState<any>(null)
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([])
  const [propPosition, setPropPosition] = useState<string>('')
  
  // Form state
  const [units, setUnits] = useState<string>('')
  const [analysis, setAnalysis] = useState<string>('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  // Load bettors on mount
  useEffect(() => {
    fetchBettors()
  }, [])

  // Fetch games when sport is selected
  useEffect(() => {
    if (selectedSport && step === 'game') {
      fetchGames()
    }
  }, [selectedSport, step])

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

  const fetchGames = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analyst-picks/upcoming-games?sport=${selectedSport}`)
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

  const fetchGameMarkets = async (game: Game) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analyst-picks/game-markets?oddsApiId=${game.odds_api_id}&sport=${selectedSport}`)
      const data = await res.json()
      
      if (data.success) {
        setMarkets(data.markets)
      } else {
        setError(data.error || 'Failed to load markets')
      }
    } catch (err: any) {
      setError('Failed to load markets')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayerProps = async (game: Game, position?: string) => {
    setLoading(true)
    setError('')
    try {
      const posParam = position ? `&position=${position}` : ''
      const res = await fetch(`/api/analyst-picks/player-props?oddsApiId=${game.odds_api_id}&sport=${selectedSport}${posParam}`)
      const data = await res.json()
      
      if (data.success) {
        setPlayerProps(data.players)
      } else {
        setError(data.error || 'Failed to load props')
      }
    } catch (err: any) {
      setError('Failed to load props')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSportSelect = (sport: string) => {
    setSelectedSport(sport)
    setStep('game')
  }

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game)
    fetchGameMarkets(game)
    setStep('market')
  }

  const handleMarketSelect = (marketType: string) => {
    setSelectedMarketType(marketType)
    
    // If props, show position selector
    if (marketType.startsWith('props_')) {
      // For now, go to props position selection
      setStep('odds')
      return
    }
    
    setStep('odds')
  }

  const handleOddsSelect = (market: Market) => {
    setSelectedOdds(market)
    setStep('input')
  }

  const handlePropSelect = (player: PlayerProp, prop: any) => {
    setSelectedProp(player)
    setSelectedPropMarket(prop)
    setStep('input')
  }

  const handleSubmit = async () => {
    if (!selectedBettorId) {
      setError('Please select a bettor')
      return
    }

    if (!selectedGame || !units || !analysis) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Build bet title
      let betTitle = ''
      let betType = 'Singles'
      let propImage = null
      
      if (selectedProp && selectedPropMarket) {
        // Prop bet
        betTitle = `${selectedProp.player_name} ${selectedPropMarket.name === 'Over' ? 'o' : 'u'}${selectedPropMarket.point} ${selectedPropMarket.market_display}`
        betType = 'Props'
        propImage = selectedProp.headshot_url
      } else if (selectedOdds) {
        // Game bet
        const team = selectedOdds.team || ''
        const point = selectedOdds.point || ''
        const type = selectedOdds.type || ''
        
        if (selectedMarketType.startsWith('spread')) {
          betTitle = `${team} ${point > 0 ? '+' : ''}${point}`
        } else if (selectedMarketType.startsWith('ml')) {
          betTitle = `${team} ML`
        } else if (selectedMarketType === 'over' || selectedMarketType === 'under') {
          betTitle = `${selectedGame.away_team} / ${selectedGame.home_team} ${type === 'over' ? 'O' : 'U'}${point}`
        }
      }

      // Get current Eastern time
      const easternNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
      const easternTimestamp = new Date(easternNow)

      // Insert pick
      const { error: insertError } = await supabase
        .from('picks')
        .insert({
          bettor_id: selectedBettorId,
          sport: selectedGame.sport,
          sport_emoji: selectedGame.sport_emoji,
          bet_title: betTitle,
          odds: String(selectedOdds?.odds || selectedPropMarket?.odds || 0),
          sportsbook: selectedOdds?.book || selectedPropMarket?.book || '',
          units: parseFloat(units),
          analysis,
          game_time: selectedGame.game_time,
          posted_at: easternTimestamp.toISOString(),
          game_id: selectedGame.game_id,
          bet_type: betType,
          is_active: true,
          is_free: false,
          result: 'pending',
          recap_status: 'pending',
          away_team_image: selectedGame.away_team_logo,
          home_team_image: selectedGame.home_team_logo,
          prop_image: propImage,
          game_title: `${selectedGame.away_team} @ ${selectedGame.home_team}`,
        })

      if (insertError) throw insertError

      // Success! Redirect to picks page
      router.push('/picks')
    } catch (err: any) {
      setError(err.message || 'Failed to submit pick')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetSelection = () => {
    setStep('sport')
    setSelectedSport('')
    setSelectedGame(null)
    setSelectedMarketType('')
    setSelectedOdds(null)
    setSelectedProp(null)
    setSelectedPropMarket(null)
    setUnits('')
    setAnalysis('')
    setError('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Submit Pick</h1>
            </div>
            <p className={styles.subtitle}>Submit your analyst picks with auto-filled data</p>
          </div>
        </div>

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

        {/* Progress Steps */}
        <div className={styles.progressSteps}>
          <div className={`${styles.step} ${step === 'sport' ? styles.active : ''} ${selectedSport ? styles.completed : ''}`}>
            <div className={styles.stepNumber}>{selectedSport ? '✓' : '1'}</div>
            <span>Sport</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step === 'game' ? styles.active : ''} ${selectedGame ? styles.completed : ''}`}>
            <div className={styles.stepNumber}>{selectedGame ? '✓' : '2'}</div>
            <span>Game</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step === 'market' ? styles.active : ''} ${selectedMarketType ? styles.completed : ''}`}>
            <div className={styles.stepNumber}>{selectedMarketType ? '✓' : '3'}</div>
            <span>Market</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step === 'odds' ? styles.active : ''} ${selectedOdds || selectedPropMarket ? styles.completed : ''}`}>
            <div className={styles.stepNumber}>{selectedOdds || selectedPropMarket ? '✓' : '4'}</div>
            <span>Odds</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step === 'input' ? styles.active : ''}`}>
            <div className={styles.stepNumber}>5</div>
            <span>Submit</span>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Step 1: Sport Selection */}
      {step === 'sport' && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Select Sport</h2>
          <div className={styles.sportGrid}>
            <button className={styles.sportCard} onClick={() => handleSportSelect('nfl')}>
              <FaFootballBall size={32} />
              <span>NFL</span>
              <small>Spreads, ML, Totals, Props</small>
            </button>
            <button className={styles.sportCard} onClick={() => handleSportSelect('nba')}>
              <FaBasketballBall size={32} />
              <span>NBA</span>
              <small>Spreads, ML, Totals, Props</small>
            </button>
            <button className={styles.sportCard} onClick={() => handleSportSelect('cfb')}>
              <FaFootballBall size={32} />
              <span>CFB</span>
              <small>Spreads, ML, Totals</small>
            </button>
            <button className={styles.sportCard} onClick={() => handleSportSelect('cbb')}>
              <FaBasketballBall size={32} />
              <span>CBB</span>
              <small>Spreads, ML, Totals</small>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Game Selection */}
      {step === 'game' && (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <button className={styles.backBtn} onClick={() => setStep('sport')}>
              <IoArrowBack /> Back
            </button>
            <h2 className={styles.stepTitle}>Select Game</h2>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading games...</div>
          ) : games.length === 0 ? (
            <div className={styles.noData}>No upcoming games found for {selectedSport.toUpperCase()}</div>
          ) : (
            <div className={styles.gamesList}>
              {games.map((game) => (
                <button
                  key={game.game_id}
                  className={styles.gameCard}
                  onClick={() => handleGameSelect(game)}
                >
                  <div className={styles.gameTeams}>
                    {game.away_team_logo && (
                      <img src={game.away_team_logo} alt={game.away_team} className={styles.teamLogo} />
                    )}
                    <div className={styles.gameMatchup}>
                      <span className={styles.awayTeam}>{game.away_team}</span>
                      <span className={styles.vs}>@</span>
                      <span className={styles.homeTeam}>{game.home_team}</span>
                    </div>
                    {game.home_team_logo && (
                      <img src={game.home_team_logo} alt={game.home_team} className={styles.teamLogo} />
                    )}
                  </div>
                  <div className={styles.gameTime}>{game.game_time_est}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Market Selection */}
      {step === 'market' && selectedGame && (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <button className={styles.backBtn} onClick={() => setStep('game')}>
              <IoArrowBack /> Back
            </button>
            <h2 className={styles.stepTitle}>Select Market</h2>
          </div>

          <div className={styles.selectedGameBanner}>
            <div className={styles.selectedGameTeams}>
              {selectedGame.away_team_logo && (
                <img src={selectedGame.away_team_logo} alt="" />
              )}
              <span>{selectedGame.away_team} @ {selectedGame.home_team}</span>
              {selectedGame.home_team_logo && (
                <img src={selectedGame.home_team_logo} alt="" />
              )}
            </div>
            <span className={styles.selectedGameTime}>{selectedGame.game_time_est}</span>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading markets...</div>
          ) : (
            <div className={styles.marketsGrid}>
              {/* Spreads */}
              <button className={styles.marketCard} onClick={() => handleMarketSelect('spread_away')}>
                <span className={styles.marketTeam}>{selectedGame.away_team_abbr}</span>
                <span className={styles.marketLine}>Spread</span>
              </button>
              <button className={styles.marketCard} onClick={() => handleMarketSelect('spread_home')}>
                <span className={styles.marketTeam}>{selectedGame.home_team_abbr}</span>
                <span className={styles.marketLine}>Spread</span>
              </button>

              {/* Moneylines */}
              <button className={styles.marketCard} onClick={() => handleMarketSelect('ml_away')}>
                <span className={styles.marketTeam}>{selectedGame.away_team_abbr}</span>
                <span className={styles.marketLine}>ML</span>
              </button>
              <button className={styles.marketCard} onClick={() => handleMarketSelect('ml_home')}>
                <span className={styles.marketTeam}>{selectedGame.home_team_abbr}</span>
                <span className={styles.marketLine}>ML</span>
              </button>

              {/* Totals */}
              <button className={styles.marketCard} onClick={() => handleMarketSelect('over')}>
                <span className={styles.marketLine}>Over</span>
              </button>
              <button className={styles.marketCard} onClick={() => handleMarketSelect('under')}>
                <span className={styles.marketLine}>Under</span>
              </button>

              {/* Props (NFL/NBA only) */}
              {(selectedSport === 'nfl' || selectedSport === 'nba') && (
                <>
                  <button className={styles.marketCard} onClick={() => handleMarketSelect('props_away')}>
                    <span className={styles.marketTeam}>{selectedGame.away_team_abbr}</span>
                    <span className={styles.marketLine}>Props</span>
                  </button>
                  <button className={styles.marketCard} onClick={() => handleMarketSelect('props_home')}>
                    <span className={styles.marketTeam}>{selectedGame.home_team_abbr}</span>
                    <span className={styles.marketLine}>Props</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Odds Selection (or Props) */}
      {step === 'odds' && selectedGame && (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <button className={styles.backBtn} onClick={() => setStep('market')}>
              <IoArrowBack /> Back
            </button>
            <h2 className={styles.stepTitle}>
              {selectedMarketType.startsWith('props_') ? 'Select Player & Prop' : 'Select Book & Odds'}
            </h2>
          </div>

          {selectedMarketType.startsWith('props_') ? (
            // Props selection UI (simplified for now)
            <div className={styles.propsPlaceholder}>
              <p>Props interface coming next - will show player list with positions and prop types</p>
              <button className={styles.backBtn} onClick={() => setStep('market')}>
                ← Go back and select a game market
              </button>
            </div>
          ) : (
            // Odds selection
            loading ? (
              <div className={styles.loading}>Loading odds...</div>
            ) : (
              <div className={styles.oddsList}>
                {(() => {
                  let oddsToShow: Market[] = []
                  
                  if (selectedMarketType === 'spread_home') oddsToShow = markets?.spreads?.home || []
                  else if (selectedMarketType === 'spread_away') oddsToShow = markets?.spreads?.away || []
                  else if (selectedMarketType === 'ml_home') oddsToShow = markets?.moneylines?.home || []
                  else if (selectedMarketType === 'ml_away') oddsToShow = markets?.moneylines?.away || []
                  else if (selectedMarketType === 'over') oddsToShow = markets?.totals?.over || []
                  else if (selectedMarketType === 'under') oddsToShow = markets?.totals?.under || []
                  
                  return oddsToShow.length > 0 ? (
                    oddsToShow.map((market, idx) => (
                      <button
                        key={idx}
                        className={styles.oddsCard}
                        onClick={() => handleOddsSelect(market)}
                      >
                        <span className={styles.oddsBook}>{market.book}</span>
                        <span className={styles.oddsLine}>
                          {market.point !== undefined ? 
                            (market.point > 0 ? `+${market.point}` : market.point) : 
                            ''
                          }
                        </span>
                        <span className={styles.oddsValue}>
                          {market.odds > 0 ? `+${market.odds}` : market.odds}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className={styles.noData}>No odds available for this market</div>
                  )
                })()}
              </div>
            )
          )}
        </div>
      )}

      {/* Step 5: Units & Analysis Input */}
      {step === 'input' && (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <button className={styles.backBtn} onClick={() => setStep('odds')}>
              <IoArrowBack /> Back
            </button>
            <h2 className={styles.stepTitle}>Finalize Pick</h2>
          </div>

          {/* Preview */}
          <div className={styles.pickPreview}>
            <h3>Pick Preview</h3>
            <div className={styles.previewRow}>
              <span>Game:</span>
              <strong>{selectedGame?.away_team} @ {selectedGame?.home_team}</strong>
            </div>
            <div className={styles.previewRow}>
              <span>Time:</span>
              <strong>{selectedGame?.game_time_est}</strong>
            </div>
            {selectedOdds && (
              <>
                <div className={styles.previewRow}>
                  <span>Book:</span>
                  <strong>{selectedOdds.book}</strong>
                </div>
                <div className={styles.previewRow}>
                  <span>Odds:</span>
                  <strong>{selectedOdds.odds > 0 ? `+${selectedOdds.odds}` : selectedOdds.odds}</strong>
                </div>
              </>
            )}
          </div>

          {/* Form Inputs */}
          <div className={styles.formGroup}>
            <label>Units at Risk</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="1.00"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Analysis</label>
            <textarea
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              placeholder="Explain your reasoning for this pick..."
              className={styles.textarea}
              rows={10}
            />
          </div>

          {/* Submit Button */}
          <div className={styles.submitSection}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting || !units || !analysis}
            >
              {submitting ? 'Submitting...' : 'Submit Pick'}
            </button>
            <button className={styles.cancelBtn} onClick={resetSelection}>
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

