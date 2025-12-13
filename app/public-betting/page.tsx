'use client'

import { useState, useEffect } from 'react'
import styles from './public-betting.module.css'
import { FiChevronDown, FiChevronUp, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

interface GameOdds {
  id: string
  sport: string
  home_team: string
  away_team: string
  home_abbrev: string
  away_abbrev: string
  game_time: string
  opening_spread: number
  current_spread: number
  spread_movement: number
  opening_total: number
  current_total: number
  total_movement: number
  public_spread_home_bet_pct: number
  public_spread_home_money_pct: number
  public_spread_away_bet_pct: number
  public_spread_away_money_pct: number
  public_total_over_bet_pct: number
  public_total_over_money_pct: number
  rlm: string
}

type SortField = 'bet_pct' | 'money_pct' | 'diff' | 'rlm' | 'movement' | null
type MarketType = 'spread' | 'total' | 'ml'

export default function PublicBettingPage() {
  const [games, setGames] = useState<GameOdds[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState<string>('nfl')
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('spread')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expandedGame, setExpandedGame] = useState<string | null>(null)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/public-betting/live-odds')
      const data = await response.json()
      
      if (data.success && data.games) {
        const processedGames = data.games.map((game: any) => ({
          ...game,
          home_abbrev: getAbbrev(game.home_team),
          away_abbrev: getAbbrev(game.away_team),
          public_spread_away_bet_pct: 100 - (game.public_spread_bet_pct || 50),
          public_spread_away_money_pct: 100 - (game.public_spread_money_pct || 50),
          public_spread_home_bet_pct: game.public_spread_bet_pct || 50,
          public_spread_home_money_pct: game.public_spread_money_pct || 50,
          public_total_over_bet_pct: game.public_total_bet_pct || 50,
          public_total_over_money_pct: game.public_total_money_pct || 50,
          rlm: calculateRLM(game)
        }))
        setGames(processedGames)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAbbrev = (teamName: string): string => {
    const abbrevMap: Record<string, string> = {
      'Buffalo Bills': 'BUF', 'New England Patriots': 'NE', 'Houston Texans': 'HOU',
      'Arizona Cardinals': 'ARI', 'Kansas City Chiefs': 'KC', 'Denver Broncos': 'DEN',
      'Boston Celtics': 'BOS', 'Milwaukee Bucks': 'MIL', 'Los Angeles Lakers': 'LAL',
      'Golden State Warriors': 'GSW', 'Toronto Maple Leafs': 'TOR', 'Montreal Canadiens': 'MTL',
      'Texas Longhorns': 'TEX', 'Ohio State Buckeyes': 'OSU'
    }
    return abbrevMap[teamName] || teamName.split(' ').pop()?.substring(0, 3).toUpperCase() || 'UNK'
  }

  const getTeamName = (fullName: string): string => {
    const parts = fullName.split(' ')
    return parts[parts.length - 1]
  }

  const calculateRLM = (game: any): string => {
    const publicBetPct = game.public_spread_bet_pct || 50
    const movement = game.spread_movement || 0
    const publicOnHome = publicBetPct > 55
    const publicOnAway = publicBetPct < 45
    
    if (publicOnHome && movement > 0.5) return 'RLM'
    if (publicOnAway && movement < -0.5) return 'RLM'
    if (Math.abs(movement) > 0.5) return 'Steam'
    return '-'
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortedGames = () => {
    let filtered = games.filter(g => g.sport === selectedSport)

    if (!sortField) return filtered

    return [...filtered].sort((a, b) => {
      let aVal = 0, bVal = 0
      
      switch (sortField) {
        case 'bet_pct':
          aVal = Math.abs((a.public_spread_home_bet_pct || 50) - 50)
          bVal = Math.abs((b.public_spread_home_bet_pct || 50) - 50)
          break
        case 'money_pct':
          aVal = Math.abs((a.public_spread_home_money_pct || 50) - 50)
          bVal = Math.abs((b.public_spread_home_money_pct || 50) - 50)
          break
        case 'diff':
          aVal = Math.abs((a.public_spread_home_bet_pct || 50) - (a.public_spread_home_money_pct || 50))
          bVal = Math.abs((b.public_spread_home_bet_pct || 50) - (b.public_spread_home_money_pct || 50))
          break
        case 'movement':
          aVal = Math.abs(a.spread_movement || 0)
          bVal = Math.abs(b.spread_movement || 0)
          break
        case 'rlm':
          aVal = a.rlm !== '-' ? 1 : 0
          bVal = b.rlm !== '-' ? 1 : 0
          break
      }
      
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
    })
  }

  const formatSpread = (spread: number, isHome: boolean) => {
    const val = isHome ? spread : -spread
    return val > 0 ? `+${val}` : val.toString()
  }

  const formatDiff = (betPct: number, moneyPct: number) => {
    const diff = moneyPct - betPct // Positive = more money than bets
    if (diff > 0) return `+${Math.abs(diff).toFixed(0)}%`
    if (diff < 0) return `-${Math.abs(diff).toFixed(0)}%`
    return '0%'
  }

  const getDiffClass = (betPct: number, moneyPct: number) => {
    const diff = moneyPct - betPct
    if (diff > 5) return styles.diffPositive
    if (diff < -5) return styles.diffNegative
    return ''
  }

  const formatMove = (movement: number) => {
    if (movement === 0) return '-'
    return movement > 0 ? `+${movement.toFixed(1)}` : movement.toFixed(1)
  }

  const sortedGames = getSortedGames()

  return (
    <div className={styles.container}>
      {/* Header with Filters */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Public Betting</h1>
            <p className={styles.subtitle}>Public betting splits, movements & indicators from 150 sportsbooks.</p>
          </div>
        </div>
        
        <div className={styles.filtersRow}>
          <div className={styles.sportFilters}>
            {['nfl', 'nba', 'nhl', 'cfb'].map(sport => (
              <button
                key={sport}
                className={`${styles.filterBtn} ${selectedSport === sport ? styles.active : ''}`}
                onClick={() => setSelectedSport(sport)}
              >
                {sport.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div className={styles.marketFilters}>
            {(['spread', 'total', 'ml'] as const).map(market => (
              <button
                key={market}
                className={`${styles.filterBtn} ${selectedMarket === market ? styles.active : ''}`}
                onClick={() => setSelectedMarket(market)}
              >
                {market === 'ml' ? 'ML' : market === 'total' ? 'O/U' : 'Spread'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Games Table */}
      <div className={styles.tableCard}>
        {/* Desktop Table */}
        <table className={styles.desktopTable}>
          <thead>
            <tr>
              <th>Team</th>
              <th>Open</th>
              <th>Current</th>
              <th 
                className={`${styles.sortable} ${sortField === 'movement' ? styles.sorted : ''}`}
                onClick={() => handleSort('movement')}
              >
                Move {sortField === 'movement' && (sortDirection === 'desc' ? <FiChevronDown /> : <FiChevronUp />)}
              </th>
              <th 
                className={`${styles.sortable} ${sortField === 'bet_pct' ? styles.sorted : ''}`}
                onClick={() => handleSort('bet_pct')}
              >
                Bets {sortField === 'bet_pct' && (sortDirection === 'desc' ? <FiChevronDown /> : <FiChevronUp />)}
              </th>
              <th 
                className={`${styles.sortable} ${sortField === 'money_pct' ? styles.sorted : ''}`}
                onClick={() => handleSort('money_pct')}
              >
                Money {sortField === 'money_pct' && (sortDirection === 'desc' ? <FiChevronDown /> : <FiChevronUp />)}
              </th>
              <th 
                className={`${styles.sortable} ${sortField === 'diff' ? styles.sorted : ''}`}
                onClick={() => handleSort('diff')}
              >
                Diff {sortField === 'diff' && (sortDirection === 'desc' ? <FiChevronDown /> : <FiChevronUp />)}
              </th>
              <th 
                className={`${styles.sortable} ${sortField === 'rlm' ? styles.sorted : ''}`}
                onClick={() => handleSort('rlm')}
              >
                RLM {sortField === 'rlm' && (sortDirection === 'desc' ? <FiChevronDown /> : <FiChevronUp />)}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.loadingCell}>Loading...</td></tr>
            ) : sortedGames.length === 0 ? (
              <tr><td colSpan={8} className={styles.emptyCell}>No games found</td></tr>
            ) : (
              sortedGames.map(game => {
                const homeBetPct = game.public_spread_home_bet_pct
                const awayBetPct = game.public_spread_away_bet_pct
                const homeMoneyPct = game.public_spread_home_money_pct
                const awayMoneyPct = game.public_spread_away_money_pct
                const isExpanded = expandedGame === game.id

                return (
                  <>
                    <tr 
                      key={`${game.id}-away`} 
                      className={`${styles.awayRow} ${isExpanded ? styles.expanded : ''}`}
                      onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                    >
                      <td className={styles.teamCell}>
                        <span className={styles.teamName}>{getTeamName(game.away_team)}</span>
                      </td>
                      <td>{formatSpread(game.opening_spread, false)}</td>
                      <td>{formatSpread(game.current_spread, false)}</td>
                      <td className={game.spread_movement !== 0 ? (game.spread_movement > 0 ? styles.moveUp : styles.moveDown) : ''}>
                        {formatMove(-game.spread_movement)}
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(awayBetPct)}%</span>
                          <div className={styles.miniMeterBlue}>
                            <div style={{ width: `${awayBetPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(awayMoneyPct)}%</span>
                          <div className={styles.miniMeterGreen}>
                            <div style={{ width: `${awayMoneyPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className={getDiffClass(awayBetPct, awayMoneyPct)}>
                        {formatDiff(awayBetPct, awayMoneyPct)}
                      </td>
                      <td>
                        <span className={`${styles.rlmBadge} ${game.rlm !== '-' ? styles.hasRlm : ''}`}>
                          {game.rlm}
                        </span>
                      </td>
                    </tr>
                    <tr 
                      key={`${game.id}-home`} 
                      className={`${styles.homeRow} ${isExpanded ? styles.expanded : ''}`}
                      onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                    >
                      <td className={styles.teamCell}>
                        <span className={styles.teamName}>{getTeamName(game.home_team)}</span>
                      </td>
                      <td>{formatSpread(game.opening_spread, true)}</td>
                      <td>{formatSpread(game.current_spread, true)}</td>
                      <td className={game.spread_movement !== 0 ? (game.spread_movement < 0 ? styles.moveUp : styles.moveDown) : ''}>
                        {formatMove(game.spread_movement)}
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(homeBetPct)}%</span>
                          <div className={styles.miniMeterBlue}>
                            <div style={{ width: `${homeBetPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(homeMoneyPct)}%</span>
                          <div className={styles.miniMeterGreen}>
                            <div style={{ width: `${homeMoneyPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className={getDiffClass(homeBetPct, homeMoneyPct)}>
                        {formatDiff(homeBetPct, homeMoneyPct)}
                      </td>
                      <td></td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${game.id}-details`} className={styles.detailsRow}>
                        <td colSpan={8}>
                          <div className={styles.gameDetails}>
                            <div className={styles.detailSection}>
                              <h4>Line Movement</h4>
                              <div className={styles.lineMovement}>
                                <div className={styles.linePoint}>
                                  <span className={styles.lineLabel}>Open</span>
                                  <span className={styles.lineValue}>{formatSpread(game.opening_spread, true)}</span>
                                </div>
                                <div className={styles.lineArrow}>→</div>
                                <div className={styles.linePoint}>
                                  <span className={styles.lineLabel}>Current</span>
                                  <span className={styles.lineValue}>{formatSpread(game.current_spread, true)}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.detailSection}>
                              <h4>Total (O/U)</h4>
                              <div className={styles.totalInfo}>
                                <span>{game.current_total}</span>
                                <span className={styles.totalMove}>
                                  ({game.total_movement > 0 ? '+' : ''}{game.total_movement.toFixed(1)} from open)
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>

        {/* Mobile Table */}
        <div className={styles.mobileTable}>
          {/* Mobile Header */}
          <div className={styles.mobileHeader}>
            <div className={styles.mobileHeaderCell}>Team</div>
            <div className={styles.mobileHeaderCell}>Odds</div>
            <div 
              className={`${styles.mobileHeaderCell} ${styles.sortableHeader} ${sortField === 'bet_pct' ? styles.sorted : ''}`}
              onClick={() => handleSort('bet_pct')}
            >
              Bets
            </div>
            <div 
              className={`${styles.mobileHeaderCell} ${styles.sortableHeader} ${sortField === 'money_pct' ? styles.sorted : ''}`}
              onClick={() => handleSort('money_pct')}
            >
              $$$
            </div>
            <div 
              className={`${styles.mobileHeaderCell} ${styles.sortableHeader} ${sortField === 'rlm' ? styles.sorted : ''}`}
              onClick={() => handleSort('rlm')}
            >
              RLM
            </div>
          </div>
          
          {loading ? (
            <div className={styles.loadingCell}>Loading...</div>
          ) : sortedGames.length === 0 ? (
            <div className={styles.emptyCell}>No games found</div>
          ) : (
            sortedGames.map(game => {
              const homeBetPct = game.public_spread_home_bet_pct
              const awayBetPct = game.public_spread_away_bet_pct
              const homeMoneyPct = game.public_spread_home_money_pct
              const awayMoneyPct = game.public_spread_away_money_pct
              const isExpanded = expandedGame === game.id

              return (
                <div 
                  key={game.id} 
                  className={`${styles.mobileGameCard} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                >
                  <div className={styles.mobileRow}>
                    <div className={styles.mobileTeam}>{game.away_abbrev}</div>
                    <div className={styles.mobileOdds}>{formatSpread(game.current_spread, false)}</div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(awayBetPct)}%</span>
                      <div className={styles.miniMeterBlue}><div style={{ width: `${awayBetPct}%` }} /></div>
                    </div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(awayMoneyPct)}%</span>
                      <div className={styles.miniMeterGreen}><div style={{ width: `${awayMoneyPct}%` }} /></div>
                    </div>
                    <div className={`${styles.mobileRlm} ${game.rlm !== '-' ? styles.hasRlmMobile : ''}`}>
                      {game.rlm}
                    </div>
                  </div>
                  <div className={styles.mobileRow}>
                    <div className={styles.mobileTeam}>{game.home_abbrev}</div>
                    <div className={styles.mobileOdds}>{formatSpread(game.current_spread, true)}</div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(homeBetPct)}%</span>
                      <div className={styles.miniMeterBlue}><div style={{ width: `${homeBetPct}%` }} /></div>
                    </div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(homeMoneyPct)}%</span>
                      <div className={styles.miniMeterGreen}><div style={{ width: `${homeMoneyPct}%` }} /></div>
                    </div>
                    <div className={styles.mobileRlm}></div>
                  </div>
                  
                  {isExpanded && (
                    <div className={styles.mobileDetails}>
                      <div className={styles.mobileDetailRow}>
                        <span>Open: {formatSpread(game.opening_spread, true)}</span>
                        <span>Move: {formatMove(game.spread_movement)}</span>
                      </div>
                      <div className={styles.mobileDetailRow}>
                        <span>O/U: {game.current_total}</span>
                        <span>{game.rlm !== '-' ? game.rlm : ''}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
