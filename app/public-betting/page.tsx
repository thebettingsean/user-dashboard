'use client'

import { useState, useEffect } from 'react'
import styles from './public-betting.module.css'
import { FiChevronDown, FiChevronUp, FiSearch, FiTrendingUp } from 'react-icons/fi'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts'

interface GameOdds {
  id: string
  sport: string
  home_team: string
  away_team: string
  home_abbrev: string
  away_abbrev: string
  home_logo: string
  away_logo: string
  game_time: string
  opening_spread: number
  current_spread: number
  spread_movement: number
  opening_total: number
  current_total: number
  total_movement: number
  opening_ml_home: number
  opening_ml_away: number
  current_ml_home: number
  current_ml_away: number
  ml_home_movement: number
  ml_away_movement: number
  // Spread percentages
  public_spread_home_bet_pct: number
  public_spread_home_money_pct: number
  public_spread_away_bet_pct: number
  public_spread_away_money_pct: number
  // Total percentages (over = home perspective)
  public_total_over_bet_pct: number
  public_total_over_money_pct: number
  public_total_under_bet_pct: number
  public_total_under_money_pct: number
  // Moneyline percentages
  public_ml_home_bet_pct: number
  public_ml_home_money_pct: number
  public_ml_away_bet_pct: number
  public_ml_away_money_pct: number
  rlm: string
  rlm_side: string
  respected: string
  respected_side: string
  money_vs_bets_diff: number
  snapshot_count: number
}

type SortField = 'bet_pct' | 'money_pct' | 'diff' | 'rlm' | 'movement' | null
type MarketType = 'spread' | 'total' | 'ml'
type TimeFilter = 'all' | '24hr'

interface LineMovementPoint {
  time: string
  awayLine: number
  homeLine: number
  total: number
  mlHome: number
  mlAway: number
  awayBetPct: number
  homeBetPct: number
  awayMoneyPct: number
  homeMoneyPct: number
  mlHomeBetPct: number
  mlHomeMoneyPct: number
  totalOverBetPct: number
  totalOverMoneyPct: number
  hasRealBetting: boolean
}

// Sample line movement data generator
const generateSampleLineMovement = (openingSpread: number, timeFilter: TimeFilter = 'all'): LineMovementPoint[] => {
  const points: LineMovementPoint[] = []
  const allTimes = ['Open', '48hr', '36hr', '24hr', '12hr', '6hr', '3hr', '1hr', 'Current']
  const times24hr = ['24hr Ago', '12hr', '6hr', '3hr', '1hr', 'Current']
  const times = timeFilter === '24hr' ? times24hr : allTimes
  let currentSpread = openingSpread
  
  times.forEach((time, i) => {
    // Simulate realistic line movement
    if (i > 0) {
      const movement = (Math.random() - 0.5) * 1 // ±0.5 movement
      currentSpread = Math.round((currentSpread + movement) * 2) / 2 // Round to 0.5
    }
    
    const baseBetPct = 45 + Math.random() * 20
    const baseMoneyPct = 40 + Math.random() * 25
    
    points.push({
      time,
      homeLine: currentSpread,
      awayLine: -currentSpread,
      homeBetPct: Math.round(baseBetPct),
      awayBetPct: Math.round(100 - baseBetPct),
      homeMoneyPct: Math.round(baseMoneyPct),
      awayMoneyPct: Math.round(100 - baseMoneyPct),
    })
  })
  
  return points
}

// Mobile-optimized data (only 2 points for cleaner display)
const generateMobileLineMovement = (openingSpread: number, timeFilter: TimeFilter = 'all'): LineMovementPoint[] => {
  const startLabel = timeFilter === '24hr' ? '24hr Ago' : 'Open'
  const movement = (Math.random() - 0.3) * 1.5
  const currentSpread = Math.round((openingSpread + movement) * 2) / 2
  
  return [
    {
      time: startLabel,
      homeLine: openingSpread,
      awayLine: -openingSpread,
      homeBetPct: 48,
      awayBetPct: 52,
      homeMoneyPct: 45,
      awayMoneyPct: 55,
    },
    {
      time: 'Current',
      homeLine: currentSpread,
      awayLine: -currentSpread,
      homeBetPct: 55,
      awayBetPct: 45,
      homeMoneyPct: 52,
      awayMoneyPct: 48,
    }
  ]
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, marketType }: any) => {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload
  
  // Get value based on market type
  let value: number = 0
  let betPct: number = 50
  
  if (marketType === 'spread') {
    value = data.homeLine
    betPct = data.homeBetPct
  } else if (marketType === 'ml') {
    value = data.mlHome
    betPct = data.mlHomeBetPct || 50
  } else if (marketType === 'total') {
    value = data.total
    betPct = data.totalOverBetPct || 50
  }
  
  // Format value
  const formattedValue = marketType === 'total' 
    ? value.toString() 
    : (value > 0 ? `+${value}` : value.toString())
  
  return (
    <div className={styles.graphTooltip}>
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipValue}>{formattedValue}</div>
        <div className={styles.tooltipLabel}>{label}</div>
      </div>
      <div className={styles.tooltipBadge}>
        {betPct}%
      </div>
    </div>
  )
}

// Mobile Expanded View Component
const MobileExpandedView = ({ 
  game, 
  graphTimeFilter, 
  setGraphTimeFilter, 
  graphMarketType, 
  setGraphMarketType,
  formatSpread,
  getTeamName,
  timelineData,
  timelineLoading
}: {
  game: GameOdds
  graphTimeFilter: TimeFilter
  setGraphTimeFilter: (f: TimeFilter) => void
  graphMarketType: MarketType
  setGraphMarketType: (m: MarketType) => void
  formatSpread: (s: number, isHome: boolean) => string
  getTeamName: (name: string) => string
  timelineData: LineMovementPoint[]
  timelineLoading: boolean
}) => {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTeam, setHistoryTeam] = useState<'home' | 'away'>('home')
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false)
  
  // Use real timeline data, or fallback to simple 2-point view if not available
  const mobileData = timelineData.length >= 2 
    ? [timelineData[0], timelineData[timelineData.length - 1]]
    : [{ time: 'Open', homeLine: game.opening_spread, awayLine: -game.opening_spread, homeBetPct: 50, awayBetPct: 50, homeMoneyPct: 50, awayMoneyPct: 50 },
       { time: 'Current', homeLine: game.current_spread, awayLine: -game.current_spread, homeBetPct: game.public_spread_home_bet_pct, awayBetPct: game.public_spread_away_bet_pct, homeMoneyPct: game.public_spread_home_money_pct, awayMoneyPct: game.public_spread_away_money_pct }]
  
  return (
    <div className={styles.mobileExpandedPanel} onClick={(e) => e.stopPropagation()}>
      {/* Mobile Graph */}
      <div className={styles.mobileGraphContainer}>
        <div className={styles.mobileGraphHeader}>
          {/* Icon only on mobile */}
          <FiTrendingUp className={styles.mobileGraphIcon} />
          
          <div className={styles.mobileGraphControls}>
            {/* Bet Type Dropdown */}
            <div className={styles.mobileMarketDropdown}>
              <button 
                className={styles.mobileMarketBtn}
                onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
              >
                {graphMarketType === 'spread' ? 'Spread' : graphMarketType === 'total' ? 'O/U' : 'ML'}
                <FiChevronDown className={marketDropdownOpen ? styles.rotated : ''} />
              </button>
              {marketDropdownOpen && (
                <div className={styles.mobileMarketMenu}>
                  {(['spread', 'total', 'ml'] as const).map(market => (
                    <button
                      key={market}
                      className={`${styles.mobileMarketItem} ${graphMarketType === market ? styles.active : ''}`}
                      onClick={() => {
                        setGraphMarketType(market)
                        setMarketDropdownOpen(false)
                      }}
                    >
                      {market === 'spread' ? 'Spread' : market === 'total' ? 'O/U' : 'ML'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Time Filter */}
            <div className={styles.mobileGraphFilters}>
              <button
                className={`${styles.mobileGraphFilterBtn} ${graphTimeFilter === 'all' ? styles.active : ''}`}
                onClick={() => setGraphTimeFilter('all')}
              >
                All
              </button>
              <button
                className={`${styles.mobileGraphFilterBtn} ${graphTimeFilter === '24hr' ? styles.active : ''}`}
                onClick={() => setGraphTimeFilter('24hr')}
              >
                24hr
              </button>
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart 
            data={mobileData}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id={`mobileGradient-${game.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2A3442" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#0F1319" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#FFFFFF', fontSize: 11, fontWeight: 500 }}
              padding={{ left: 20, right: 20 }}
            />
            <YAxis hide />
            <Area 
              type="monotone" 
              dataKey="homeLine" 
              fill={`url(#mobileGradient-${game.id})`}
              stroke="none"
            />
            <Line 
              type="monotone" 
              dataKey="homeLine" 
              stroke="#98ADD1" 
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#98ADD1', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="awayLine" 
              stroke="#EF4444" 
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#EF4444', stroke: '#FFFFFF', strokeWidth: 2 }}
              strokeDasharray="4 4"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Collapsible History Section */}
      <div className={styles.mobileHistorySection}>
        <button 
          className={styles.mobileHistoryToggle}
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          <span>History</span>
          <FiChevronDown className={historyOpen ? styles.rotated : ''} />
        </button>
        
        {historyOpen && (
          <div className={styles.mobileHistoryContent}>
            {/* Home/Away Toggle */}
            <div className={styles.mobileHistoryTeamToggle}>
              <button
                className={`${styles.mobileHistoryTeamBtn} ${historyTeam === 'away' ? styles.active : ''}`}
                onClick={() => setHistoryTeam('away')}
              >
                {getTeamName(game.away_team)}
              </button>
              <button
                className={`${styles.mobileHistoryTeamBtn} ${historyTeam === 'home' ? styles.active : ''}`}
                onClick={() => setHistoryTeam('home')}
              >
                {getTeamName(game.home_team)}
              </button>
            </div>
            
            {/* History Table */}
            <table className={styles.mobileHistoryTable}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Odds</th>
                  <th>Bet%</th>
                  <th>$$$%</th>
                </tr>
              </thead>
              <tbody>
                {timelineData.length === 0 ? (
                  <tr><td colSpan={4}>No history</td></tr>
                ) : (
                  timelineData.map((point, idx) => (
                    <tr key={idx}>
                      <td>{point.time}</td>
                      <td>
                        {historyTeam === 'home' 
                          ? (point.homeLine > 0 ? `+${point.homeLine}` : point.homeLine)
                          : (point.awayLine > 0 ? `+${point.awayLine}` : point.awayLine)
                        }
                      </td>
                      <td>{historyTeam === 'home' ? point.homeBetPct : point.awayBetPct}%</td>
                      <td>{historyTeam === 'home' ? point.homeMoneyPct : point.awayMoneyPct}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PublicBettingPage() {
  const [games, setGames] = useState<GameOdds[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState<string>('nfl')
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('spread')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expandedGame, setExpandedGame] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false)
  const [graphTimeFilter, setGraphTimeFilter] = useState<TimeFilter>('all')
  const [graphMarketType, setGraphMarketType] = useState<MarketType>('spread')
  const [timelineData, setTimelineData] = useState<LineMovementPoint[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  useEffect(() => {
    fetchGames()
  }, [])

  // Fetch timeline data when a game is expanded
  useEffect(() => {
    if (expandedGame) {
      fetchTimelineData(expandedGame)
    } else {
      setTimelineData([])
    }
  }, [expandedGame, graphTimeFilter])

  const fetchTimelineData = async (gameId: string) => {
    setTimelineLoading(true)
    try {
      const response = await fetch(`/api/public-betting/game-timeline/${gameId}?timeFilter=${graphTimeFilter}`)
      const data = await response.json()
      
      if (data.success && data.timeline) {
        setTimelineData(data.timeline)
        console.log(`[Timeline] Loaded ${data.snapshotCount} snapshots for game ${gameId}`)
      } else {
        setTimelineData([])
        console.log('[Timeline] No data:', data.message)
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
      setTimelineData([])
    } finally {
      setTimelineLoading(false)
    }
  }

  const fetchGames = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/public-betting/live-odds')
      const data = await response.json()
      
      if (data.success && data.games) {
        const processedGames = data.games.map((game: any) => ({
          ...game,
          // Logos from API
          home_logo: game.home_logo || '',
          away_logo: game.away_logo || '',
          home_abbrev: game.home_abbrev || getAbbrev(game.home_team),
          away_abbrev: game.away_abbrev || getAbbrev(game.away_team),
          
          // Spread percentages - away is inverse of home
          public_spread_home_bet_pct: game.public_spread_bet_pct || 50,
          public_spread_home_money_pct: game.public_spread_money_pct || 50,
          public_spread_away_bet_pct: 100 - (game.public_spread_bet_pct || 50),
          public_spread_away_money_pct: 100 - (game.public_spread_money_pct || 50),
          
          // Totals percentages - over/under
          public_total_over_bet_pct: game.public_total_bet_pct || 50,
          public_total_over_money_pct: game.public_total_money_pct || 50,
          public_total_under_bet_pct: 100 - (game.public_total_bet_pct || 50),
          public_total_under_money_pct: 100 - (game.public_total_money_pct || 50),
          
          // Moneyline percentages - home/away
          public_ml_home_bet_pct: game.public_ml_bet_pct || 50,
          public_ml_home_money_pct: game.public_ml_money_pct || 50,
          public_ml_away_bet_pct: 100 - (game.public_ml_bet_pct || 50),
          public_ml_away_money_pct: 100 - (game.public_ml_money_pct || 50),
          
          // RLM comes from API now
          rlm: game.rlm || '-',
          rlm_side: game.rlm_side || '',
          respected: game.respected || '',
          respected_side: game.respected_side || '',
          money_vs_bets_diff: game.money_vs_bets_diff || 0,
          snapshot_count: game.snapshot_count || 1
        }))
        setGames(processedGames)
        console.log(`[Public Betting] Loaded ${processedGames.length} games from ${data.source}`)
      } else {
        console.log('[Public Betting] No games returned:', data.message)
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

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(g => 
        g.home_team.toLowerCase().includes(query) ||
        g.away_team.toLowerCase().includes(query) ||
        g.home_abbrev.toLowerCase().includes(query) ||
        g.away_abbrev.toLowerCase().includes(query)
      )
    }

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

  // Get percentages based on selected market type
  const getMarketPcts = (game: GameOdds, isHome: boolean) => {
    switch (selectedMarket) {
      case 'spread':
        return {
          betPct: isHome ? game.public_spread_home_bet_pct : game.public_spread_away_bet_pct,
          moneyPct: isHome ? game.public_spread_home_money_pct : game.public_spread_away_money_pct
        }
      case 'ml':
        return {
          betPct: isHome ? game.public_ml_home_bet_pct : game.public_ml_away_bet_pct,
          moneyPct: isHome ? game.public_ml_home_money_pct : game.public_ml_away_money_pct
        }
      case 'total':
        // For totals: "away row" (top) = Over, "home row" (bottom) = Under
        return {
          betPct: isHome ? game.public_total_under_bet_pct : game.public_total_over_bet_pct,
          moneyPct: isHome ? game.public_total_under_money_pct : game.public_total_over_money_pct
        }
    }
  }

  // Get odds based on selected market type
  const getMarketOdds = (game: GameOdds, isHome: boolean, isOpening: boolean) => {
    switch (selectedMarket) {
      case 'spread':
        const spread = isOpening ? game.opening_spread : game.current_spread
        return formatSpread(spread, isHome)
      case 'ml':
        if (isOpening) {
          return isHome 
            ? formatML(game.opening_ml_home) 
            : formatML(game.opening_ml_away)
        }
        return isHome 
          ? formatML(game.current_ml_home) 
          : formatML(game.current_ml_away)
      case 'total':
        // Away row (top) = Over, Home row (bottom) = Under
        const total = isOpening ? game.opening_total : game.current_total
        return isHome ? `U ${total}` : `O ${total}`
    }
  }

  const formatML = (ml: number) => {
    if (ml === 0) return '-'
    return ml > 0 ? `+${ml}` : ml.toString()
  }

  // Get movement based on market type
  const getMarketMove = (game: GameOdds, isHome: boolean) => {
    switch (selectedMarket) {
      case 'spread':
        const spreadMove = game.spread_movement
        return isHome ? spreadMove : -spreadMove
      case 'total':
        return game.total_movement
      case 'ml':
        // ML movement (e.g., +275 to +315 = +40)
        return isHome ? (game.ml_home_movement || 0) : (game.ml_away_movement || 0)
    }
  }

  // Format game date/time for display
  const formatGameTime = (gameTime: string) => {
    if (!gameTime) return { date: '', time: '' }
    
    try {
      // Handle format "2025-12-14 18:00:00" from ClickHouse
      const cleanTime = gameTime.replace(' ', 'T') + 'Z'
      const date = new Date(cleanTime)
      
      if (isNaN(date.getTime())) {
        return { date: '', time: '' }
      }
      
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }
    } catch {
      return { date: '', time: '' }
    }
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
          {/* Left side: Sports + Search */}
          <div className={styles.leftFilters}>
            {/* Desktop Sport Filters */}
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

            {/* Mobile Sport Dropdown */}
            <div className={styles.mobileSportDropdown}>
              <button 
                className={styles.sportDropdownBtn}
                onClick={() => setSportDropdownOpen(!sportDropdownOpen)}
              >
                {selectedSport.toUpperCase()}
                <FiChevronDown className={sportDropdownOpen ? styles.rotated : ''} />
              </button>
              {sportDropdownOpen && (
                <div className={styles.sportDropdownMenu}>
                  {['nfl', 'nba', 'nhl', 'cfb'].map(sport => (
                    <button
                      key={sport}
                      className={`${styles.sportDropdownItem} ${selectedSport === sport ? styles.active : ''}`}
                      onClick={() => {
                        setSelectedSport(sport)
                        setSportDropdownOpen(false)
                      }}
                    >
                      {sport.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className={styles.searchContainer}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Right side: Bet Types */}
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
                const awayPcts = getMarketPcts(game, false)
                const homePcts = getMarketPcts(game, true)
                const awayMove = getMarketMove(game, false)
                const homeMove = getMarketMove(game, true)
                const isExpanded = expandedGame === game.id

                return (
                  <>
                    <tr 
                      key={`${game.id}-away`} 
                      className={`${styles.awayRow} ${isExpanded ? styles.expanded : ''}`}
                      onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                    >
                      <td className={styles.teamCell}>
                        {game.away_logo && <img src={game.away_logo} alt="" className={styles.teamLogo} />}
                        <span className={styles.teamName}>{getTeamName(game.away_team)}</span>
                      </td>
                      <td>{getMarketOdds(game, false, true)}</td>
                      <td>{getMarketOdds(game, false, false)}</td>
                      <td className={awayMove !== 0 ? (awayMove > 0 ? styles.moveDown : styles.moveUp) : ''}>
                        {formatMove(awayMove)}
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(awayPcts.betPct)}%</span>
                          <div className={styles.miniMeterBlue}>
                            <div style={{ width: `${awayPcts.betPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(awayPcts.moneyPct)}%</span>
                          <div className={styles.miniMeterGreen}>
                            <div style={{ width: `${awayPcts.moneyPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className={getDiffClass(awayPcts.betPct, awayPcts.moneyPct)}>
                        {formatDiff(awayPcts.betPct, awayPcts.moneyPct)}
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
                        {game.home_logo && <img src={game.home_logo} alt="" className={styles.teamLogo} />}
                        <span className={styles.teamName}>{getTeamName(game.home_team)}</span>
                      </td>
                      <td>{getMarketOdds(game, true, true)}</td>
                      <td>{getMarketOdds(game, true, false)}</td>
                      <td className={homeMove !== 0 ? (homeMove > 0 ? styles.moveDown : styles.moveUp) : ''}>
                        {formatMove(homeMove)}
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(homePcts.betPct)}%</span>
                          <div className={styles.miniMeterBlue}>
                            <div style={{ width: `${homePcts.betPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.pctStack}>
                          <span className={styles.pctValue}>{Math.round(homePcts.moneyPct)}%</span>
                          <div className={styles.miniMeterGreen}>
                            <div style={{ width: `${homePcts.moneyPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className={getDiffClass(homePcts.betPct, homePcts.moneyPct)}>
                        {formatDiff(homePcts.betPct, homePcts.moneyPct)}
                      </td>
                      <td></td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${game.id}-details`} className={styles.detailsRow}>
                        <td colSpan={8}>
                          <div className={styles.expandedPanel}>
                            {/* Graph Container - Combined Header */}
                            <div className={styles.graphContainer}>
                              {/* Combined Header: Game Info + Line Movement Title + Filters */}
                              <div className={styles.graphHeader}>
                                <div className={styles.graphHeaderLeft}>
                                  {/* Game Matchup - smaller when expanded */}
                                  <div className={styles.expandedMatchupRow}>
                                    {game.away_logo && <img src={game.away_logo} alt="" className={styles.expandedLogoSmall} />}
                                    <span className={styles.expandedTeamText}>{getTeamName(game.away_team)} @ {getTeamName(game.home_team)}</span>
                                    {game.home_logo && <img src={game.home_logo} alt="" className={styles.expandedLogoSmall} />}
                                    <span className={styles.expandedGameTime}>{formatGameTime(game.game_time).date} • {formatGameTime(game.game_time).time}</span>
                                  </div>
                                  {/* Line Movement Title */}
                                  <div className={styles.graphTitleRow}>
                                    <FiTrendingUp className={styles.graphTitleIcon} />
                                    <span className={styles.graphTitle}>Line Movement</span>
                                  </div>
                                </div>
                                <div className={styles.graphHeaderRight}>
                                  {/* Market Type Filter */}
                                  <div className={styles.graphFilterGroup}>
                                    {(['spread', 'total', 'ml'] as const).map(market => (
                                      <button
                                        key={market}
                                        className={`${styles.graphFilterBtn} ${graphMarketType === market ? styles.active : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setGraphMarketType(market) }}
                                      >
                                        {market === 'ml' ? 'ML' : market === 'total' ? 'O/U' : 'Spread'}
                                      </button>
                                    ))}
                                  </div>
                                  {/* Time Filter */}
                                  <div className={styles.graphTimeFilter}>
                                    <button
                                      className={`${styles.graphTimeBtn} ${graphTimeFilter === 'all' ? styles.active : ''}`}
                                      onClick={(e) => { e.stopPropagation(); setGraphTimeFilter('all') }}
                                    >
                                      All
                                    </button>
                                    <button
                                      className={`${styles.graphTimeBtn} ${graphTimeFilter === '24hr' ? styles.active : ''}`}
                                      onClick={(e) => { e.stopPropagation(); setGraphTimeFilter('24hr') }}
                                    >
                                      24hr
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Graph Content */}
                              <div className={styles.graphContent}>
                                {timelineLoading ? (
                                  <div className={styles.graphLoading}>Loading timeline data...</div>
                                ) : timelineData.length === 0 ? (
                                  <div className={styles.graphLoading}>No historical data available</div>
                                ) : (
                                  <ResponsiveContainer width="100%" height={220}>
                                    <ComposedChart 
                                      data={timelineData}
                                      margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                                    >
                                      <defs>
                                        <linearGradient id={`areaGradient-${game.id}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#2A3442" stopOpacity={0.8} />
                                          <stop offset="100%" stopColor="#0F1319" stopOpacity={0.2} />
                                        </linearGradient>
                                      </defs>
                                      <XAxis 
                                        dataKey="time" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#FFFFFF', fontSize: 12 }}
                                        dy={10}
                                      />
                                      <YAxis 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#FFFFFF', fontSize: 12 }}
                                        domain={['auto', 'auto']}
                                        tickFormatter={(val) => graphMarketType === 'ml' ? (val > 0 ? `+${val}` : val) : (val > 0 ? `+${val}` : val)}
                                        dx={-5}
                                      />
                                      <Tooltip content={<CustomTooltip marketType={graphMarketType} />} />
                                      {graphMarketType !== 'total' && <ReferenceLine y={0} stroke="#36383C" strokeDasharray="3 3" />}
                                      <Area 
                                        type="monotone" 
                                        dataKey={graphMarketType === 'spread' ? 'homeLine' : graphMarketType === 'ml' ? 'mlHome' : 'total'} 
                                        fill={`url(#areaGradient-${game.id})`}
                                        stroke="none"
                                      />
                                      <Line 
                                        type="monotone" 
                                        dataKey={graphMarketType === 'spread' ? 'homeLine' : graphMarketType === 'ml' ? 'mlHome' : 'total'} 
                                        stroke="#98ADD1" 
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#98ADD1', stroke: '#151E2A', strokeWidth: 1 }}
                                        activeDot={{ r: 6, fill: '#98ADD1', stroke: '#FFFFFF', strokeWidth: 2 }}
                                        name={graphMarketType === 'total' ? 'Total' : getTeamName(game.home_team)}
                                      />
                                      {graphMarketType !== 'total' && (
                                        <Line 
                                          type="monotone" 
                                          dataKey={graphMarketType === 'spread' ? 'awayLine' : 'mlAway'} 
                                          stroke="#EF4444" 
                                          strokeWidth={2}
                                          dot={{ r: 3, fill: '#EF4444', stroke: '#151E2A', strokeWidth: 1 }}
                                          activeDot={{ r: 6, fill: '#EF4444', stroke: '#FFFFFF', strokeWidth: 2 }}
                                          name={getTeamName(game.away_team)}
                                          strokeDasharray="5 5"
                                        />
                                      )}
                                    </ComposedChart>
                                  </ResponsiveContainer>
                                )}
                                
                                {/* Legend */}
                                <div className={styles.graphLegend}>
                                  <div className={styles.legendItem}>
                                    <span className={styles.legendLine} style={{ background: '#98ADD1' }}></span>
                                    <span>{graphMarketType === 'total' ? 'Total' : getTeamName(game.home_team)}</span>
                                  </div>
                                  {graphMarketType !== 'total' && (
                                    <div className={styles.legendItem}>
                                      <span className={styles.legendLineDashed} style={{ background: '#EF4444' }}></span>
                                      <span>{getTeamName(game.away_team)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Odds History Table */}
                            <div className={styles.oddsHistorySection}>
                              <h4 className={styles.historyTitle}>
                                {graphMarketType === 'spread' ? 'Spread' : graphMarketType === 'ml' ? 'Moneyline' : 'Total'} History
                              </h4>
                              <div className={styles.historyTableWrapper}>
                                <table className={styles.historyTable}>
                                  <thead>
                                    <tr>
                                      <th>Time</th>
                                      <th>{graphMarketType === 'total' ? 'Over' : getTeamName(game.away_team)}</th>
                                      <th>{graphMarketType === 'total' ? 'Under' : getTeamName(game.home_team)}</th>
                                      <th>Bet %</th>
                                      <th>Money %</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {timelineData.length === 0 ? (
                                      <tr><td colSpan={5} className={styles.emptyCell}>No history available</td></tr>
                                    ) : (
                                      timelineData.map((point: any, idx) => {
                                        // Get values based on market type
                                        let awayVal: string, homeVal: string
                                        let awayBet: number, homeBet: number
                                        let awayMoney: number, homeMoney: number
                                        
                                        if (graphMarketType === 'spread') {
                                          awayVal = point.awayLine > 0 ? `+${point.awayLine}` : point.awayLine.toString()
                                          homeVal = point.homeLine > 0 ? `+${point.homeLine}` : point.homeLine.toString()
                                          awayBet = point.awayBetPct
                                          homeBet = point.homeBetPct
                                          awayMoney = point.awayMoneyPct
                                          homeMoney = point.homeMoneyPct
                                        } else if (graphMarketType === 'ml') {
                                          awayVal = point.mlAway > 0 ? `+${point.mlAway}` : point.mlAway.toString()
                                          homeVal = point.mlHome > 0 ? `+${point.mlHome}` : point.mlHome.toString()
                                          awayBet = 100 - (point.mlHomeBetPct || 50)
                                          homeBet = point.mlHomeBetPct || 50
                                          awayMoney = 100 - (point.mlHomeMoneyPct || 50)
                                          homeMoney = point.mlHomeMoneyPct || 50
                                        } else {
                                          // Total
                                          awayVal = `O ${point.total}`
                                          homeVal = `U ${point.total}`
                                          awayBet = point.totalOverBetPct || 50
                                          homeBet = 100 - (point.totalOverBetPct || 50)
                                          awayMoney = point.totalOverMoneyPct || 50
                                          homeMoney = 100 - (point.totalOverMoneyPct || 50)
                                        }
                                        
                                        const isCurrent = idx === timelineData.length - 1
                                        const hasRealData = point.hasRealBetting
                                        
                                        return (
                                          <tr key={idx} className={`${isCurrent ? styles.currentRow : ''} ${!hasRealData ? styles.noDataRow : ''}`}>
                                            <td>{point.time}</td>
                                            <td>{awayVal}</td>
                                            <td>{homeVal}</td>
                                            <td>
                                              {hasRealData ? (
                                                <>
                                                  <span className={styles.historyPctAway}>{Math.round(awayBet)}%</span>
                                                  <span className={styles.historyPctDivider}>/</span>
                                                  <span className={styles.historyPctHome}>{Math.round(homeBet)}%</span>
                                                </>
                                              ) : (
                                                <span className={styles.noDataLabel}>-</span>
                                              )}
                                            </td>
                                            <td>
                                              {hasRealData ? (
                                                <>
                                                  <span className={styles.historyPctAway}>{Math.round(awayMoney)}%</span>
                                                  <span className={styles.historyPctDivider}>/</span>
                                                  <span className={styles.historyPctHome}>{Math.round(homeMoney)}%</span>
                                                </>
                                              ) : (
                                                <span className={styles.noDataLabel}>-</span>
                                              )}
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
              const awayPcts = getMarketPcts(game, false)
              const homePcts = getMarketPcts(game, true)
              const isExpanded = expandedGame === game.id

              return (
                <div 
                  key={game.id} 
                  className={`${styles.mobileGameCard} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                >
                  <div className={styles.mobileRow}>
                    <div className={styles.mobileTeam}>
                      {game.away_logo ? (
                        <img src={game.away_logo} alt="" className={styles.mobileTeamLogo} />
                      ) : (
                        <span>{game.away_abbrev}</span>
                      )}
                    </div>
                    <div className={styles.mobileOdds}>{getMarketOdds(game, false, false)}</div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(awayPcts.betPct)}%</span>
                      <div className={styles.miniMeterBlue}><div style={{ width: `${awayPcts.betPct}%` }} /></div>
                    </div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(awayPcts.moneyPct)}%</span>
                      <div className={styles.miniMeterGreen}><div style={{ width: `${awayPcts.moneyPct}%` }} /></div>
                    </div>
                    <div className={`${styles.mobileRlm} ${game.rlm !== '-' ? styles.hasRlmMobile : ''}`}>
                      {game.rlm}
                    </div>
                  </div>
                  <div className={styles.mobileRow}>
                    <div className={styles.mobileTeam}>
                      {game.home_logo ? (
                        <img src={game.home_logo} alt="" className={styles.mobileTeamLogo} />
                      ) : (
                        <span>{game.home_abbrev}</span>
                      )}
                    </div>
                    <div className={styles.mobileOdds}>{getMarketOdds(game, true, false)}</div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(homePcts.betPct)}%</span>
                      <div className={styles.miniMeterBlue}><div style={{ width: `${homePcts.betPct}%` }} /></div>
                    </div>
                    <div className={styles.mobilePct}>
                      <span>{Math.round(homePcts.moneyPct)}%</span>
                      <div className={styles.miniMeterGreen}><div style={{ width: `${homePcts.moneyPct}%` }} /></div>
                    </div>
                    <div className={styles.mobileRlm}></div>
                  </div>
                  
                  {isExpanded && (
                    <MobileExpandedView 
                      game={game}
                      graphTimeFilter={graphTimeFilter}
                      setGraphTimeFilter={setGraphTimeFilter}
                      graphMarketType={graphMarketType}
                      setGraphMarketType={setGraphMarketType}
                      formatSpread={formatSpread}
                      getTeamName={getTeamName}
                      timelineData={timelineData}
                      timelineLoading={timelineLoading}
                    />
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
