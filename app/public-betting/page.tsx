'use client'

import { useState, useEffect } from 'react'
import styles from './public-betting.module.css'
import { FiFilter, FiTrendingUp, FiTrendingDown, FiChevronDown } from 'react-icons/fi'
import { MdSportsSoccer, MdSportsFootball, MdSportsBasketball, MdSportsHockey } from 'react-icons/md'

interface GameOdds {
  id: string
  sport: string
  home_team: string
  away_team: string
  game_time: string
  opening_spread: number
  current_spread: number
  spread_movement: number
  opening_total: number
  current_total: number
  total_movement: number
  public_spread_bet_pct: number
  public_spread_money_pct: number
  public_ml_bet_pct: number
  public_ml_money_pct: number
  public_total_bet_pct: number
  public_total_money_pct: number
  snapshot_count: number
  vegas_score?: number
  verdict?: string
}

interface SummaryStats {
  total_games: number
  vegas_backed_count: number
  avg_public_lean: number
  biggest_rlm: GameOdds | null
}

export default function PublicBettingPage() {
  const [games, setGames] = useState<GameOdds[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [selectedMarket, setSelectedMarket] = useState<'spread' | 'total' | 'ml'>('spread')
  const [stats, setStats] = useState<SummaryStats>({
    total_games: 0,
    vegas_backed_count: 0,
    avg_public_lean: 0,
    biggest_rlm: null
  })

  useEffect(() => {
    fetchGames()
  }, [selectedSport])

  const fetchGames = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/public-betting/live-odds')
      const data = await response.json()
      
      if (data.success) {
        const gamesWithScores = data.games.map((game: GameOdds) => ({
          ...game,
          ...calculateVegasScore(game)
        }))
        
        setGames(gamesWithScores)
        calculateStats(gamesWithScores)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateVegasScore = (game: GameOdds) => {
    let score = 0
    const publicBetPct = game.public_spread_bet_pct || 50
    const publicMoneyPct = game.public_spread_money_pct || 50
    const movement = game.spread_movement || 0
    
    // Public lean intensity (0-30 pts)
    const publicLean = Math.abs(publicBetPct - 50)
    if (publicLean > 25) score += 30
    else if (publicLean > 15) score += 20
    else if (publicLean > 5) score += 10
    
    // Line movement against public (0-40 pts)
    const publicOnHome = publicBetPct > 50
    const lineMovedTowardAway = movement > 0.5
    const lineMovedTowardHome = movement < -0.5
    
    if (publicOnHome && lineMovedTowardAway) score += 40
    else if (!publicOnHome && lineMovedTowardHome) score += 40
    else if (Math.abs(movement) <= 0.5 && publicLean > 15) score += 15
    
    // Money vs Bets split (0-20 pts)
    const betMoneyDiff = Math.abs(publicBetPct - publicMoneyPct)
    if (betMoneyDiff > 20) score += 20
    else if (betMoneyDiff > 10) score += 10
    
    let verdict = 'NEUTRAL'
    if (score >= 70) verdict = 'VEGAS BACKED'
    else if (score >= 50) verdict = 'SHARP LEAN'
    else if (score >= 30) verdict = 'SLIGHT EDGE'
    else if (publicLean > 20 && Math.abs(movement) > 0.5) verdict = 'PUBLIC MOVE'
    
    return { vegas_score: score, verdict }
  }

  const calculateStats = (gamesData: GameOdds[]) => {
    const vegasBacked = gamesData.filter(g => (g.vegas_score || 0) >= 70)
    const avgLean = gamesData.reduce((acc, g) => acc + Math.abs((g.public_spread_bet_pct || 50) - 50), 0) / gamesData.length
    const biggestRlm = gamesData.reduce((max, g) => 
      Math.abs(g.spread_movement || 0) > Math.abs(max?.spread_movement || 0) ? g : max
    , gamesData[0])
    
    setStats({
      total_games: gamesData.length,
      vegas_backed_count: vegasBacked.length,
      avg_public_lean: avgLean,
      biggest_rlm: biggestRlm
    })
  }

  const filteredGames = selectedSport === 'all' 
    ? games 
    : games.filter(g => g.sport === selectedSport)

  const vegasBackedGames = filteredGames
    .filter(g => (g.vegas_score || 0) >= 50)
    .sort((a, b) => (b.vegas_score || 0) - (a.vegas_score || 0))
    .slice(0, 5)

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'nfl': case 'cfb': return <MdSportsFootball />
      case 'nba': return <MdSportsBasketball />
      case 'nhl': return <MdSportsHockey />
      default: return <MdSportsSoccer />
    }
  }

  const formatSpread = (spread: number) => {
    if (spread > 0) return `+${spread}`
    return spread.toString()
  }

  const getMovementClass = (movement: number, publicOnHome: boolean) => {
    if (Math.abs(movement) < 0.5) return styles.neutral
    // Movement against public = sharp
    if (publicOnHome && movement > 0) return styles.sharp
    if (!publicOnHome && movement < 0) return styles.sharp
    return styles.public
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Public Betting</h1>
          <p className={styles.subtitle}>Real-time odds movement & sharp money indicators</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.sportFilters}>
            {['all', 'nfl', 'nba', 'nhl', 'cfb'].map(sport => (
              <button
                key={sport}
                className={`${styles.sportBtn} ${selectedSport === sport ? styles.active : ''}`}
                onClick={() => setSelectedSport(sport)}
              >
                {sport === 'all' ? 'All' : sport.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Games</span>
          <div className={styles.statValue}>
            <span className={styles.statNumber}>{stats.total_games}</span>
            <span className={styles.statChange}>Live tracking</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Vegas Backed</span>
          <div className={styles.statValue}>
            <span className={styles.statNumber}>{stats.vegas_backed_count}</span>
            <span className={styles.statChangePositive}>Sharp plays</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg Public Lean</span>
          <div className={styles.statValue}>
            <span className={styles.statNumber}>{stats.avg_public_lean.toFixed(1)}%</span>
            <span className={styles.statChange}>from 50/50</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Biggest RLM</span>
          <div className={styles.statValue}>
            <span className={styles.statNumber}>
              {stats.biggest_rlm ? `${Math.abs(stats.biggest_rlm.spread_movement).toFixed(1)} pts` : '-'}
            </span>
            <span className={styles.statChangePositive}>
              {stats.biggest_rlm?.away_team?.split(' ').pop() || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Vegas Backed Section */}
        <div className={styles.vegasBackedSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <FiTrendingUp className={styles.sectionIcon} />
              Vegas Backed Plays
            </h2>
            <span className={styles.sectionBadge}>{vegasBackedGames.length} plays</span>
          </div>
          
          <div className={styles.vegasBackedList}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : vegasBackedGames.length === 0 ? (
              <div className={styles.empty}>No strong Vegas backed plays right now</div>
            ) : (
              vegasBackedGames.map(game => (
                <div key={game.id} className={styles.vegasCard}>
                  <div className={styles.vegasCardHeader}>
                    <div className={styles.matchup}>
                      <span className={styles.sportBadge}>{game.sport.toUpperCase()}</span>
                      <span className={styles.teams}>
                        {game.away_team} @ {game.home_team}
                      </span>
                    </div>
                    <div className={styles.vegasScore}>
                      <span className={styles.scoreValue}>{game.vegas_score}</span>
                      <span className={styles.scoreLabel}>Score</span>
                    </div>
                  </div>
                  
                  <div className={styles.vegasCardBody}>
                    <div className={styles.lineInfo}>
                      <div className={styles.lineItem}>
                        <span className={styles.lineLabel}>Open</span>
                        <span className={styles.lineValue}>{formatSpread(game.opening_spread)}</span>
                      </div>
                      <div className={styles.lineArrow}>
                        {game.spread_movement > 0 ? <FiTrendingUp /> : game.spread_movement < 0 ? <FiTrendingDown /> : '→'}
                      </div>
                      <div className={styles.lineItem}>
                        <span className={styles.lineLabel}>Current</span>
                        <span className={styles.lineValue}>{formatSpread(game.current_spread)}</span>
                      </div>
                    </div>
                    
                    <div className={styles.publicInfo}>
                      <div className={styles.publicBar}>
                        <div 
                          className={styles.publicFill}
                          style={{ width: `${game.public_spread_bet_pct || 50}%` }}
                        />
                      </div>
                      <div className={styles.publicLabels}>
                        <span>{Math.round(game.public_spread_bet_pct || 50)}% bets</span>
                        <span>{Math.round(game.public_spread_money_pct || 50)}% money</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.vegasCardFooter}>
                    <span className={`${styles.verdict} ${styles[game.verdict?.replace(' ', '').toLowerCase() || 'neutral']}`}>
                      {game.verdict}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All Games Table */}
        <div className={styles.allGamesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>All Games</h2>
            <div className={styles.marketTabs}>
              {(['spread', 'total', 'ml'] as const).map(market => (
                <button
                  key={market}
                  className={`${styles.marketTab} ${selectedMarket === market ? styles.active : ''}`}
                  onClick={() => setSelectedMarket(market)}
                >
                  {market === 'ml' ? 'Moneyline' : market.charAt(0).toUpperCase() + market.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.gamesTable}>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Open</th>
                  <th>Current</th>
                  <th>Move</th>
                  <th>Bets %</th>
                  <th>Money %</th>
                  <th>Diff</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={styles.loadingCell}>Loading games...</td>
                  </tr>
                ) : filteredGames.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyCell}>No games found</td>
                  </tr>
                ) : (
                  filteredGames.map(game => {
                    const betPct = selectedMarket === 'spread' ? game.public_spread_bet_pct 
                      : selectedMarket === 'total' ? game.public_total_bet_pct 
                      : game.public_ml_bet_pct
                    const moneyPct = selectedMarket === 'spread' ? game.public_spread_money_pct
                      : selectedMarket === 'total' ? game.public_total_money_pct
                      : game.public_ml_money_pct
                    const diff = Math.abs((betPct || 50) - (moneyPct || 50))
                    
                    return (
                      <tr key={game.id}>
                        <td>
                          <div className={styles.gameCell}>
                            <span className={styles.sportIcon}>{getSportIcon(game.sport)}</span>
                            <div className={styles.gameInfo}>
                              <span className={styles.awayTeam}>{game.away_team}</span>
                              <span className={styles.atSymbol}>@</span>
                              <span className={styles.homeTeam}>{game.home_team}</span>
                            </div>
                          </div>
                        </td>
                        <td>{formatSpread(game.opening_spread)}</td>
                        <td>{formatSpread(game.current_spread)}</td>
                        <td className={getMovementClass(game.spread_movement, (game.public_spread_bet_pct || 50) > 50)}>
                          {game.spread_movement > 0 ? '+' : ''}{game.spread_movement.toFixed(1)}
                        </td>
                        <td>
                          <div className={styles.pctCell}>
                            <div className={styles.miniBar}>
                              <div style={{ width: `${betPct || 50}%` }} />
                            </div>
                            <span>{Math.round(betPct || 50)}%</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.pctCell}>
                            <div className={styles.miniBar}>
                              <div style={{ width: `${moneyPct || 50}%` }} />
                            </div>
                            <span>{Math.round(moneyPct || 50)}%</span>
                          </div>
                        </td>
                        <td className={diff > 15 ? styles.sharpDiff : ''}>
                          {diff.toFixed(0)}%
                        </td>
                        <td>
                          <span className={`${styles.signalBadge} ${styles[game.verdict?.replace(' ', '').toLowerCase() || 'neutral']}`}>
                            {game.verdict || 'NEUTRAL'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

