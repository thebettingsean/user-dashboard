'use client'

import React, { useState, useEffect } from 'react'
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
  home_primary_color?: string
  away_primary_color?: string
  home_secondary_color?: string
  away_secondary_color?: string
  game_time: string
  est_date: string
  est_time: string
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
  // Spread percentages (can be null if no splits)
  public_spread_home_bet_pct: number | null
  public_spread_home_money_pct: number | null
  public_spread_away_bet_pct: number | null
  public_spread_away_money_pct: number | null
  // Total percentages (over = home perspective) (can be null if no splits)
  public_total_over_bet_pct: number | null
  public_total_over_money_pct: number | null
  public_total_under_bet_pct: number | null
  public_total_under_money_pct: number | null
  // Moneyline percentages (can be null if no splits)
  public_ml_home_bet_pct: number | null
  public_ml_home_money_pct: number | null
  public_ml_away_bet_pct: number | null
  public_ml_away_money_pct: number | null
  rlm: string
  rlm_side: string
  respected: string
  respected_side: string
  money_vs_bets_diff: number
  snapshot_count: number
  has_splits?: boolean
}

type SortField = 'bet_pct' | 'money_pct' | 'diff' | 'signal' | 'movement'
type MarketType = 'spread' | 'total' | 'ml'
type TimeFilter = 'all' | '24hr'

interface ActiveSorts {
  movement: boolean
  bet_pct: boolean
  money_pct: boolean
  diff: boolean
  signal: boolean
}

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
  
  // Get values for both sides
  let formattedValue: string = ''
  let betPct: number = 50
  
  if (marketType === 'spread') {
    const homeLine = data.homeLine
    const awayLine = data.awayLine
    // Show as "+3.5/-3.5" or "-3.5/+3.5"
    const homeFormatted = homeLine > 0 ? `+${homeLine}` : homeLine.toString()
    const awayFormatted = awayLine > 0 ? `+${awayLine}` : awayLine.toString()
    formattedValue = `${awayFormatted}/${homeFormatted}`
    betPct = data.homeBetPct
  } else if (marketType === 'ml') {
    const mlHome = data.mlHome
    const mlAway = data.mlAway
    // Show as "-145/+120" or "+105/-125"
    const homeFormatted = mlHome > 0 ? `+${mlHome}` : mlHome.toString()
    const awayFormatted = mlAway > 0 ? `+${mlAway}` : mlAway.toString()
    formattedValue = `${awayFormatted}/${homeFormatted}`
    betPct = data.mlHomeBetPct || 50
  } else if (marketType === 'total') {
    // For totals, just show the total value
    formattedValue = data.total.toString()
    betPct = data.totalOverBetPct || 50
  }
  
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
  getTeamColor,
  timelineData,
  timelineLoading,
  sportsbookOdds,
  getSportsbookOddsForMarket
}: {
  game: GameOdds
  graphTimeFilter: TimeFilter
  setGraphTimeFilter: (f: TimeFilter) => void
  graphMarketType: MarketType
  setGraphMarketType: (m: MarketType) => void
  formatSpread: (s: number, isHome: boolean) => string
  getTeamName: (name: string) => string
  getTeamColor: (game: GameOdds, isHome: boolean) => string
  timelineData: LineMovementPoint[]
  timelineLoading: boolean
  sportsbookOdds: any
  getSportsbookOddsForMarket: (marketType: MarketType) => any[]
}) => {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTeam, setHistoryTeam] = useState<'home' | 'away'>('home')
  const [sportsbooksOpen, setSportsbooksOpen] = useState(false)
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
              stroke={getTeamColor(game, true)} 
              strokeWidth={2.5}
              dot={{ r: 4, fill: getTeamColor(game, true), stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="awayLine" 
              stroke={getTeamColor(game, false)} 
              strokeWidth={2.5}
              dot={{ r: 4, fill: getTeamColor(game, false), stroke: '#FFFFFF', strokeWidth: 2 }}
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
                {getTeamName(game.away_team, game.sport)}
              </button>
              <button
                className={`${styles.mobileHistoryTeamBtn} ${historyTeam === 'home' ? styles.active : ''}`}
                onClick={() => setHistoryTeam('home')}
              >
                {getTeamName(game.home_team, game.sport)}
              </button>
            </div>
            
            {/* History Table */}
            <table className={styles.mobileHistoryTable}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Odds</th>
                </tr>
              </thead>
              <tbody>
                {timelineData.length === 0 ? (
                  <tr><td colSpan={2}>No history</td></tr>
                ) : (
                  timelineData.map((point, idx) => {
                    let oddVal: string
                    if (graphMarketType === 'spread') {
                      oddVal = historyTeam === 'home' 
                        ? (point.homeLine > 0 ? `+${point.homeLine}` : point.homeLine.toString())
                        : (point.awayLine > 0 ? `+${point.awayLine}` : point.awayLine.toString())
                    } else if (graphMarketType === 'ml') {
                      oddVal = historyTeam === 'home'
                        ? (point.mlHome > 0 ? `+${point.mlHome}` : point.mlHome.toString())
                        : (point.mlAway > 0 ? `+${point.mlAway}` : point.mlAway.toString())
                    } else {
                      oddVal = historyTeam === 'home' ? `U ${point.total}` : `O ${point.total}`
                    }
                    
                    return (
                      <tr key={idx}>
                        <td>{point.time}</td>
                        <td>{oddVal}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Sportsbooks Section */}
      <div className={styles.mobileHistorySection}>
        <button 
          className={styles.mobileHistoryToggle}
          onClick={() => setSportsbooksOpen(!sportsbooksOpen)}
        >
          <span>Sportsbooks</span>
          <FiChevronDown className={sportsbooksOpen ? styles.rotated : ''} />
        </button>
        
        {sportsbooksOpen && (
          <div className={styles.mobileHistoryContent}>
            <table className={styles.mobileHistoryTable}>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>{graphMarketType === 'total' ? 'Over' : getTeamName(game.away_team, game.sport)}</th>
                  <th>{graphMarketType === 'total' ? 'Under' : getTeamName(game.home_team, game.sport)}</th>
                </tr>
              </thead>
              <tbody>
                {!sportsbookOdds ? (
                  <tr><td colSpan={3}>Loading...</td></tr>
                ) : (
                  getSportsbookOddsForMarket(graphMarketType).map((bookOdds, idx) => {
                    let awayVal: string, homeVal: string
                    
                    if (graphMarketType === 'ml') {
                      const ml = bookOdds.value as { home: number, away: number }
                      awayVal = ml.away > 0 ? `+${ml.away}` : ml.away.toString()
                      homeVal = ml.home > 0 ? `+${ml.home}` : ml.home.toString()
                    } else if (graphMarketType === 'spread') {
                      const spread = bookOdds.value as number
                      awayVal = -spread > 0 ? `+${-spread}` : (-spread).toString()
                      homeVal = spread > 0 ? `+${spread}` : spread.toString()
                    } else {
                      const total = bookOdds.value as number
                      awayVal = `O ${total}`
                      homeVal = `U ${total}`
                    }
                    
                    return (
                      <tr key={idx} className={bookOdds.isConsensus ? styles.consensusRow : ''}>
                        <td className={styles.bookName}>{bookOdds.book}</td>
                        <td>{awayVal}</td>
                        <td>{homeVal}</td>
                      </tr>
                    )
                  })
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
  const [activeSorts, setActiveSorts] = useState<ActiveSorts>({
    movement: false,
    bet_pct: false,
    money_pct: false,
    diff: false,
    signal: false
  })
  const [expandedGame, setExpandedGame] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false)
  const [graphTimeFilter, setGraphTimeFilter] = useState<TimeFilter>('all')
  const [graphMarketType, setGraphMarketType] = useState<MarketType>('spread')
  const [timelineData, setTimelineData] = useState<LineMovementPoint[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [sportsbookOdds, setSportsbookOdds] = useState<any>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [booksOpen, setBooksOpen] = useState(false)

  useEffect(() => {
    fetchGames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport])

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
        setSportsbookOdds(data.sportsbookOdds || null)
        console.log(`[Timeline] Loaded ${data.snapshotCount} snapshots for game ${gameId}`)
      } else {
        setTimelineData([])
        setSportsbookOdds(null)
        console.log('[Timeline] No data:', data.message)
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
      setTimelineData([])
      setSportsbookOdds(null)
    } finally {
      setTimelineLoading(false)
    }
  }

  const fetchGames = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/public-betting/live-odds?sport=${selectedSport}`)
      const data = await response.json()
      
      if (data.success && data.games) {
        const processedGames = data.games.map((game: any) => {
          const hasSplits = game.has_splits !== false // Default to true if not specified
          
          return {
            ...game,
            // Logos and colors from API
            home_logo: game.home_logo || '',
            away_logo: game.away_logo || '',
            home_abbrev: game.home_abbrev || getAbbrev(game.home_team),
            away_abbrev: game.away_abbrev || getAbbrev(game.away_team),
            home_primary_color: game.home_primary_color || null,
            away_primary_color: game.away_primary_color || null,
            home_secondary_color: game.home_secondary_color || null,
            away_secondary_color: game.away_secondary_color || null,
            
            // Spread percentages - away is inverse of home (only if has splits)
            public_spread_home_bet_pct: hasSplits ? (game.public_spread_bet_pct ?? null) : null,
            public_spread_home_money_pct: hasSplits ? (game.public_spread_money_pct ?? null) : null,
            public_spread_away_bet_pct: hasSplits ? (game.public_spread_bet_pct !== null ? 100 - game.public_spread_bet_pct : null) : null,
            public_spread_away_money_pct: hasSplits ? (game.public_spread_money_pct !== null ? 100 - game.public_spread_money_pct : null) : null,
          
            // Totals percentages - over/under (only if has splits)
            public_total_over_bet_pct: hasSplits ? (game.public_total_over_bet_pct ?? null) : null,
            public_total_over_money_pct: hasSplits ? (game.public_total_over_money_pct ?? null) : null,
            public_total_under_bet_pct: hasSplits ? (game.public_total_over_bet_pct !== null ? 100 - game.public_total_over_bet_pct : null) : null,
            public_total_under_money_pct: hasSplits ? (game.public_total_over_money_pct !== null ? 100 - game.public_total_over_money_pct : null) : null,
          
            // Moneyline percentages - home/away (only if has splits)
            public_ml_home_bet_pct: hasSplits ? (game.public_ml_bet_pct ?? null) : null,
            public_ml_home_money_pct: hasSplits ? (game.public_ml_money_pct ?? null) : null,
            public_ml_away_bet_pct: hasSplits ? (game.public_ml_bet_pct !== null ? 100 - game.public_ml_bet_pct : null) : null,
            public_ml_away_money_pct: hasSplits ? (game.public_ml_money_pct !== null ? 100 - game.public_ml_money_pct : null) : null,
          
          // RLM comes from API now
          rlm: game.rlm || '-',
          rlm_side: game.rlm_side || '',
          respected: game.respected || '',
          respected_side: game.respected_side || '',
          money_vs_bets_diff: game.money_vs_bets_diff || 0,
            snapshot_count: game.snapshot_count || 1,
            has_splits: hasSplits
          }
        })
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

  const getTeamName = (fullName: string, sport?: string): string => {
    // For CFB and CBB: Show school name (abbreviated if too long), not mascot
    if (sport === 'cfb' || sport === 'cbb' || selectedSport === 'cfb' || selectedSport === 'cbb') {
      // Remove mascot (last word, or last 2 words for compound mascots like "Crimson Tide")
      const words = fullName.split(' ')
      let schoolName = fullName
      
      // Common two-word mascots
      const twoWordMascots = ['crimson tide', 'tar heels', 'blue devils', 'fighting irish', 'golden gophers', 
                             'orange crush', 'green wave', 'blue raiders', 'golden eagles', 'red raiders',
                             'blue demons', 'golden hurricanes', 'sun devils', 'demon deacons', 'horned frogs',
                             'scarlet knights', 'yellow jackets', 'mean green', 'red wolves', 'black bears',
                             'golden bears', 'grizzly bears', 'polar bears', 'bruin bears']
      
      if (words.length >= 2) {
        const lastTwo = `${words[words.length - 2]} ${words[words.length - 1]}`.toLowerCase()
        if (twoWordMascots.includes(lastTwo)) {
          // Remove last 2 words (compound mascot)
          schoolName = words.slice(0, -2).join(' ')
        } else {
          // Remove last word (mascot)
          schoolName = words.slice(0, -1).join(' ')
        }
      }
      
      // Remove common prefixes
      schoolName = schoolName
        .replace(/^University of /i, '')
        .replace(/^College of /i, '')
        .replace(/^The /i, '')
        .trim()
      
      // Common abbreviations for well-known schools
      const abbrevMap: Record<string, string> = {
        'North Carolina': 'UNC',
        'North Carolina State': 'NC State',
        'Ohio State': 'Ohio St',
        'Penn State': 'Penn St',
        'Michigan State': 'Michigan St',
        'Florida State': 'Florida St',
        'Oklahoma State': 'Oklahoma St',
        'Kansas State': 'Kansas St',
        'Iowa State': 'Iowa St',
        'Mississippi State': 'Mississippi St',
        'Washington State': 'Washington St',
        'Oregon State': 'Oregon St',
        'Arizona State': 'Arizona St',
        'Colorado State': 'Colorado St',
        'San Diego State': 'San Diego St',
        'Boise State': 'Boise St',
        'Fresno State': 'Fresno St',
        'Utah State': 'Utah St',
        'New Mexico State': 'New Mexico St',
        'Louisiana State': 'LSU',
        'Texas A&M': 'Texas A&M',
        'Texas Christian': 'TCU',
        'Southern California': 'USC',
        'Southern Methodist': 'SMU',
        'Brigham Young': 'BYU',
        'Virginia Commonwealth': 'VCU',
        'Massachusetts': 'UMass',
        'Central Florida': 'UCF',
        'South Florida': 'USF',
        'Texas El Paso': 'UTEP',
        'Texas San Antonio': 'UTSA',
        'Middle Tennessee': 'Middle Tenn',
        'Western Kentucky': 'WKU',
        'Appalachian State': 'App State',
        'Coastal Carolina': 'Coastal Car',
        'Georgia Southern': 'Georgia So',
        'Louisiana Lafayette': 'Louisiana',
        'Louisiana Monroe': 'ULM',
        'Prairie View A&M': 'Prairie View',
        'Mississippi Valley State': 'Miss Valley St',
        'Alabama Birmingham': 'UAB',
      }
      
      // Check for exact match (case-insensitive)
      const schoolNameLower = schoolName.toLowerCase()
      for (const [key, abbrev] of Object.entries(abbrevMap)) {
        if (schoolNameLower === key.toLowerCase()) {
          return abbrev
        }
      }
      
      // If too long (more than 15 characters), abbreviate
      if (schoolName.length > 15) {
        const schoolWords = schoolName.split(' ')
        if (schoolWords.length > 1) {
          // Use first word + first letter of remaining words
          return `${schoolWords[0]} ${schoolWords.slice(1).map(w => w[0]).join('')}`
        }
        // Single word: truncate to 12 chars
        return schoolName.substring(0, 12)
      }
      
      return schoolName
    }
    
    // For other sports: Return last word (mascot/team name)
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
    setActiveSorts(prev => {
      // If signal is clicked, turn off all others and toggle signal
      if (field === 'signal') {
        return {
          movement: false,
          bet_pct: false,
          money_pct: false,
          diff: false,
          signal: !prev.signal
        }
      }
      
      // If any other field is clicked and signal is on, turn signal off
      if (prev.signal) {
        return {
          ...prev,
          signal: false,
          [field]: true
        }
      }
      
      // Toggle the clicked field
      return {
        ...prev,
        [field]: !prev[field]
      }
    })
  }

  const getSortedGames = () => {
    // Games are already filtered by sport from API, no need to filter again
    let filtered = games

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

    // Check if any sorts are active
    const hasActiveSorts = Object.values(activeSorts).some(v => v)
    if (!hasActiveSorts) return filtered

    // Sort by combined score of all active filters
    return [...filtered].sort((a, b) => {
      let aScore = 0, bScore = 0
      
      // For each active sort, add to the score
      if (activeSorts.movement) {
        // Biggest absolute movement = higher score
        aScore += Math.abs(a.spread_movement || 0) * 10 // Weight by 10 to make it significant
        bScore += Math.abs(b.spread_movement || 0) * 10
      }
      
      if (activeSorts.bet_pct) {
        // Most bets (highest percentage on either side) = higher score
        const aHomeBets = a.public_spread_home_bet_pct || 50
        const aAwayBets = a.public_spread_away_bet_pct || 50
        const bHomeBets = b.public_spread_home_bet_pct || 50
        const bAwayBets = b.public_spread_away_bet_pct || 50
        
        aScore += Math.max(aHomeBets, aAwayBets)
        bScore += Math.max(bHomeBets, bAwayBets)
      }
      
      if (activeSorts.money_pct) {
        // Most money (highest percentage on either side) = higher score
        const aHomeMoney = a.public_spread_home_money_pct || 50
        const aAwayMoney = a.public_spread_away_money_pct || 50
        const bHomeMoney = b.public_spread_home_money_pct || 50
        const bAwayMoney = b.public_spread_away_money_pct || 50
        
        aScore += Math.max(aHomeMoney, aAwayMoney)
        bScore += Math.max(bHomeMoney, bAwayMoney)
      }
      
      if (activeSorts.diff) {
        // Biggest absolute difference between bets and money = higher score
        const aHomeDiff = Math.abs((a.public_spread_home_bet_pct || 50) - (a.public_spread_home_money_pct || 50))
        const aAwayDiff = Math.abs((a.public_spread_away_bet_pct || 50) - (a.public_spread_away_money_pct || 50))
        const bHomeDiff = Math.abs((b.public_spread_home_bet_pct || 50) - (b.public_spread_home_money_pct || 50))
        const bAwayDiff = Math.abs((b.public_spread_away_bet_pct || 50) - (b.public_spread_away_money_pct || 50))
        
        aScore += Math.max(aHomeDiff, aAwayDiff) * 2 // Weight by 2
        bScore += Math.max(bHomeDiff, bAwayDiff) * 2
      }
      
      if (activeSorts.signal) {
        // Has signal = higher score
        aScore += (a.rlm !== '-' ? 100 : 0)
        bScore += (b.rlm !== '-' ? 100 : 0)
      }
      
      // Sort descending (highest score first)
      return bScore - aScore
    })
  }

  const formatSpread = (spread: number, isHome: boolean) => {
    const val = isHome ? spread : -spread
    return val > 0 ? `+${val}` : val.toString()
  }

  // Get team color with fallback
  const getTeamColor = (game: GameOdds, isHome: boolean): string => {
    const color = isHome ? game.home_primary_color : game.away_primary_color
    
    // If color exists and is valid hex, use it
    if (color && color.startsWith('#')) {
      return color
    }
    // Default fallback colors
    return isHome ? '#98ADD1' : '#EF4444'
  }

  // Helper to parse game time - stored as UTC in database
  const parseGameTimeEST = (gameTime: string): Date | null => {
    if (!gameTime) return null
    
    try {
      // game_time from ClickHouse is in UTC format: "2025-12-31 17:00:00"
      // Add Z to explicitly mark it as UTC
      const cleanTime = gameTime.replace(' ', 'T') + 'Z'
      const date = new Date(cleanTime)
      
      if (isNaN(date.getTime())) {
        return null
      }
      
      return date
    } catch {
      return null
    }
  }

  const formatGameDate = (dateStr: string) => {
    // If it's already a YYYY-MM-DD string from getGamesByDate
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse as local date and format
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric'
      })
    }

    const date = parseGameTimeEST(dateStr)
    if (!date) return ''
    // Format as "Mon, Dec 18" in EST
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'America/New_York'
    })
  }

  const getGamesByDate = () => {
    const sorted = getSortedGames()
    const grouped: { [date: string]: typeof sorted } = {}
    
    sorted.forEach(game => {
      // Use pre-computed EST date from API (avoids timezone conversion issues)
      const dateKey = game.est_date || ''
      if (!dateKey) return
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(game)
    })
    
    // Sort keys (dates) chronologically
    const sortedGrouped: { [date: string]: typeof sorted } = {}
    Object.keys(grouped).sort().forEach(key => {
      sortedGrouped[key] = grouped[key]
    })
    
    return sortedGrouped
  }

  const getSportsbookOddsForMarket = (marketType: MarketType) => {
    if (!sportsbookOdds) return []
    
    let oddsData: { [key: string]: number } = {}
    let consensusValue = 0
    
    if (marketType === 'spread') {
      oddsData = sportsbookOdds.spreads || {}
      consensusValue = games.find(g => g.id === expandedGame)?.current_spread || 0
    } else if (marketType === 'total') {
      oddsData = sportsbookOdds.totals || {}
      consensusValue = games.find(g => g.id === expandedGame)?.current_total || 0
    } else {
      oddsData = sportsbookOdds.moneylines || {}
    }
    
    // Convert to array and sort by value
    const oddsArray = Object.entries(oddsData).map(([book, value]) => ({
      book,
      value: typeof value === 'object' ? value : value,
      isConsensus: false
    }))
    
    // Add consensus
    if (marketType === 'ml') {
      const currentGame = games.find(g => g.id === expandedGame)
      if (currentGame) {
        oddsArray.unshift({
          book: 'Consensus',
          value: { home: currentGame.current_ml_home, away: currentGame.current_ml_away },
          isConsensus: true
        })
      }
    } else {
      oddsArray.unshift({
        book: 'Consensus',
        value: consensusValue,
        isConsensus: true
      })
    }
    
    return oddsArray
  }

  const formatDiff = (betPct: number | null, moneyPct: number | null) => {
    if (betPct === null || moneyPct === null) return '—'
    const diff = moneyPct - betPct // Positive = more money than bets
    if (diff > 0) return `+${Math.abs(diff).toFixed(0)}%`
    if (diff < 0) return `-${Math.abs(diff).toFixed(0)}%`
    return '0%'
  }

  const getDiffClass = (betPct: number | null, moneyPct: number | null) => {
    if (betPct === null || moneyPct === null) return ''
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
    // If game has no splits, return null
    if (!game.has_splits) {
      return { betPct: null, moneyPct: null }
    }
    
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

  // Format game time for display - use pre-computed EST values from API
  const formatGameTimeDisplay = (game: GameOdds) => {
    // Use pre-computed EST time from API (HH:mm format)
    if (game.est_time) {
      const [hours, minutes] = game.est_time.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHour = hours % 12 || 12
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
    }
    
    // Fallback to old method if est_time not available
    const date = parseGameTimeEST(game.game_time)
    if (!date) return ''
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    })
  }

  const sortedGames = getSortedGames()

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      {/* Header with Filters */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                {selectedSport === 'all' ? '' : `${selectedSport.toUpperCase()} `}Public Betting
              </h1>
            </div>
            <p className={styles.subtitle}>Public betting splits, movements & indicators from 150 sportsbooks.</p>
          </div>
        </div>
        
        <div className={styles.filtersRow}>
          {/* Left side: Sports + Search */}
          <div className={styles.leftFilters}>
            {/* Desktop Sport Filters */}
            <div className={styles.sportFilters}>
              {['nfl', 'nba', 'nhl', 'cfb', 'cbb'].map(sport => (
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
                  {['nfl', 'nba', 'nhl', 'cfb', 'cbb'].map(sport => (
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
                className={`${styles.sortable} ${activeSorts.movement ? styles.sorted : ''}`}
                onClick={() => handleSort('movement')}
              >
                Move {activeSorts.movement && <FiChevronDown />}
              </th>
              <th 
                className={`${styles.sortable} ${activeSorts.bet_pct ? styles.sorted : ''}`}
                onClick={() => handleSort('bet_pct')}
              >
                Bets {activeSorts.bet_pct && <FiChevronDown />}
              </th>
              <th 
                className={`${styles.sortable} ${activeSorts.money_pct ? styles.sorted : ''}`}
                onClick={() => handleSort('money_pct')}
              >
                Money {activeSorts.money_pct && <FiChevronDown />}
              </th>
              <th 
                className={`${styles.sortable} ${activeSorts.diff ? styles.sorted : ''}`}
                onClick={() => handleSort('diff')}
              >
                Diff {activeSorts.diff && <FiChevronDown />}
              </th>
              <th 
                className={`${styles.sortable} ${activeSorts.signal ? styles.sorted : ''}`}
                onClick={() => handleSort('signal')}
              >
                Signal {activeSorts.signal && <FiChevronDown />}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.loadingCell}>Loading...</td></tr>
            ) : sortedGames.length === 0 ? (
              <tr><td colSpan={8} className={styles.emptyCell}>No games found</td></tr>
            ) : (
              Object.entries(getGamesByDate()).map(([dateKey, gamesOnDate]) => (
                <React.Fragment key={`group-${dateKey}`}>
                  {/* Date separator row */}
                  <tr className={styles.dateSeparator}>
                    <td colSpan={8}>{formatGameDate(dateKey)}</td>
                  </tr>
                  {/* Games for this date */}
                  {gamesOnDate.map(game => {
                    const awayPcts = getMarketPcts(game, false)
                    const homePcts = getMarketPcts(game, true)
                    const awayMove = getMarketMove(game, false)
                    const homeMove = getMarketMove(game, true)
                    const isExpanded = expandedGame === game.id

                    return (
                      <React.Fragment key={game.id}>
                        <tr 
                          className={`${styles.awayRow} ${isExpanded ? styles.expanded : ''}`}
                          onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                        >
                          <td className={styles.teamCell}>
                            {game.away_logo && <img src={game.away_logo} alt="" className={styles.teamLogo} />}
                            <span className={styles.teamName}>{getTeamName(game.away_team, game.sport)}</span>
                          </td>
                          <td>{getMarketOdds(game, false, true)}</td>
                          <td>{getMarketOdds(game, false, false)}</td>
                          <td className={awayMove !== 0 ? (awayMove > 0 ? styles.moveDown : styles.moveUp) : ''}>
                            {formatMove(awayMove)}
                          </td>
                          <td>
                            <div className={styles.pctStack}>
                              {awayPcts.betPct !== null ? (
                                <>
                                  <span className={styles.pctValue}>{Math.round(awayPcts.betPct)}%</span>
                                  <div className={styles.miniMeterBlue}>
                                    <div style={{ width: `${awayPcts.betPct}%` }} />
                                  </div>
                                </>
                              ) : (
                                <span className={styles.pctValue} style={{ color: '#696969' }}>N/A</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.pctStack}>
                              {awayPcts.moneyPct !== null ? (
                                <>
                                  <span className={styles.pctValue}>{Math.round(awayPcts.moneyPct)}%</span>
                                  <div className={styles.miniMeterGreen}>
                                    <div style={{ width: `${awayPcts.moneyPct}%` }} />
                                  </div>
                                </>
                              ) : (
                                <span className={styles.pctValue} style={{ color: '#696969' }}>N/A</span>
                              )}
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
                          className={`${styles.homeRow} ${isExpanded ? styles.expanded : ''}`}
                          onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                        >
                          <td className={styles.teamCell}>
                            {game.home_logo && <img src={game.home_logo} alt="" className={styles.teamLogo} />}
                            <span className={styles.teamName}>{getTeamName(game.home_team, game.sport)}</span>
                          </td>
                          <td>{getMarketOdds(game, true, true)}</td>
                          <td>{getMarketOdds(game, true, false)}</td>
                          <td className={homeMove !== 0 ? (homeMove > 0 ? styles.moveDown : styles.moveUp) : ''}>
                            {formatMove(homeMove)}
                          </td>
                          <td>
                            <div className={styles.pctStack}>
                              {homePcts.betPct !== null ? (
                                <>
                                  <span className={styles.pctValue}>{Math.round(homePcts.betPct)}%</span>
                                  <div className={styles.miniMeterBlue}>
                                    <div style={{ width: `${homePcts.betPct}%` }} />
                                  </div>
                                </>
                              ) : (
                                <span className={styles.pctValue} style={{ color: '#696969' }}>N/A</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.pctStack}>
                              {homePcts.moneyPct !== null ? (
                                <>
                                  <span className={styles.pctValue}>{Math.round(homePcts.moneyPct)}%</span>
                                  <div className={styles.miniMeterGreen}>
                                    <div style={{ width: `${homePcts.moneyPct}%` }} />
                                  </div>
                                </>
                              ) : (
                                <span className={styles.pctValue} style={{ color: '#696969' }}>N/A</span>
                              )}
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
                                        <span className={styles.expandedTeamText}>{getTeamName(game.away_team, game.sport)} @ {getTeamName(game.home_team, game.sport)}</span>
                                        {game.home_logo && <img src={game.home_logo} alt="" className={styles.expandedLogoSmall} />}
                                        <span className={styles.expandedGameTime}>{formatGameDate(game.est_date)} • {formatGameTimeDisplay(game)}</span>
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
                                            stroke={graphMarketType === 'total' ? '#98ADD1' : getTeamColor(game, true)} 
                                            strokeWidth={2}
                                            dot={{ r: 3, fill: graphMarketType === 'total' ? '#98ADD1' : getTeamColor(game, true), stroke: '#151E2A', strokeWidth: 1 }}
                                            activeDot={{ r: 5, fill: graphMarketType === 'total' ? '#98ADD1' : getTeamColor(game, true), stroke: '#FFFFFF', strokeWidth: 2 }}
                                            isAnimationActive={false}
                                            name={graphMarketType === 'total' ? 'Total' : getTeamName(game.home_team, game.sport)}
                                          />
                                          {graphMarketType !== 'total' && (
                                            <Line 
                                              type="monotone" 
                                              dataKey={graphMarketType === 'spread' ? 'awayLine' : 'mlAway'} 
                                              stroke={getTeamColor(game, false)} 
                                              strokeWidth={2}
                                              dot={{ r: 3, fill: getTeamColor(game, false), stroke: '#151E2A', strokeWidth: 1 }}
                                              activeDot={{ r: 5, fill: getTeamColor(game, false), stroke: '#FFFFFF', strokeWidth: 2 }}
                                              isAnimationActive={false}
                                              name={getTeamName(game.away_team, game.sport)}
                                              strokeDasharray="5 5"
                                            />
                                          )}
                                        </ComposedChart>
                                      </ResponsiveContainer>
                                    )}
                                    
                                    {/* Legend */}
                                    <div className={styles.graphLegend}>
                                      {graphMarketType !== 'total' && (
                                        <div className={styles.legendItem}>
                                          <span 
                                            className={styles.legendLineDashed} 
                                            style={{ 
                                              background: `repeating-linear-gradient(90deg, ${getTeamColor(game, false)}, ${getTeamColor(game, false)} 4px, transparent 4px, transparent 6px)`
                                            }}
                                          ></span>
                                          <span>{getTeamName(game.away_team, game.sport)}</span>
                                        </div>
                                      )}
                                      <div className={styles.legendItem}>
                                        <span className={styles.legendLine} style={{ background: graphMarketType === 'total' ? '#98ADD1' : getTeamColor(game, true) }}></span>
                                        <span>{graphMarketType === 'total' ? 'Total' : getTeamName(game.home_team, game.sport)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Bottom Section: History + Sportsbooks (Collapsible) */}
                                <div className={styles.bottomSection}>
                                  {/* Odds History Table (Collapsible) */}
                                  <div className={styles.oddsHistorySection}>
                                    <button 
                                      className={styles.collapsibleHeader}
                                      onClick={(e) => { e.stopPropagation(); setHistoryOpen(!historyOpen) }}
                                    >
                                      <span className={styles.collapsibleTitle}>Line History</span>
                                      {historyOpen ? <FiChevronUp /> : <FiChevronDown />}
                                    </button>
                                    {historyOpen && (
                                      <div className={styles.historyTableWrapper}>
                                        <table className={styles.historyTable}>
                                          <thead>
                                            <tr>
                                              <th>Time</th>
                                              <th>{graphMarketType === 'total' ? 'Over' : getTeamName(game.away_team, game.sport)}</th>
                                              <th>{graphMarketType === 'total' ? 'Under' : getTeamName(game.home_team, game.sport)}</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {timelineData.length === 0 ? (
                                              <tr><td colSpan={3} className={styles.emptyCell}>No history available</td></tr>
                                            ) : (
                                              timelineData.map((point: any, idx) => {
                                                // Get values based on market type
                                                let awayVal: string, homeVal: string
                                                
                                                if (graphMarketType === 'spread') {
                                                  awayVal = point.awayLine > 0 ? `+${point.awayLine}` : point.awayLine.toString()
                                                  homeVal = point.homeLine > 0 ? `+${point.homeLine}` : point.homeLine.toString()
                                                } else if (graphMarketType === 'ml') {
                                                  awayVal = point.mlAway > 0 ? `+${point.mlAway}` : point.mlAway.toString()
                                                  homeVal = point.mlHome > 0 ? `+${point.mlHome}` : point.mlHome.toString()
                                                } else {
                                                  // Total
                                                  awayVal = `O ${point.total}`
                                                  homeVal = `U ${point.total}`
                                                }
                                                
                                                const isCurrent = idx === timelineData.length - 1
                                                
                                                return (
                                                  <tr key={idx} className={isCurrent ? styles.currentRow : ''}>
                                                    <td>{point.time}</td>
                                                    <td>{awayVal}</td>
                                                    <td>{homeVal}</td>
                                                  </tr>
                                                )
                                              })
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Sportsbooks Comparison (Collapsible) */}
                                  <div className={styles.sportsbooksSection}>
                                    <button 
                                      className={styles.collapsibleHeader}
                                      onClick={(e) => { e.stopPropagation(); setBooksOpen(!booksOpen) }}
                                    >
                                      <span className={styles.collapsibleTitle}>All Books</span>
                                      {booksOpen ? <FiChevronUp /> : <FiChevronDown />}
                                    </button>
                                    {booksOpen && (
                                      <div className={styles.sportsbooksWrapper}>
                                        {!sportsbookOdds ? (
                                          <div className={styles.emptyCell}>Loading...</div>
                                        ) : (
                                          <table className={styles.sportsbooksTable}>
                                            <thead>
                                              <tr>
                                                <th>Book</th>
                                                <th>{graphMarketType === 'total' ? 'Over' : getTeamName(game.away_team, game.sport)}</th>
                                                <th>{graphMarketType === 'total' ? 'Under' : getTeamName(game.home_team, game.sport)}</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {getSportsbookOddsForMarket(graphMarketType).map((bookOdds, idx) => {
                                                let awayVal: string, homeVal: string
                                                
                                                if (graphMarketType === 'ml') {
                                                  const ml = bookOdds.value as { home: number, away: number }
                                                  awayVal = ml.away > 0 ? `+${ml.away}` : ml.away.toString()
                                                  homeVal = ml.home > 0 ? `+${ml.home}` : ml.home.toString()
                                                } else if (graphMarketType === 'spread') {
                                                  const spread = bookOdds.value as number
                                                  awayVal = -spread > 0 ? `+${-spread}` : (-spread).toString()
                                                  homeVal = spread > 0 ? `+${spread}` : spread.toString()
                                                } else {
                                                  const total = bookOdds.value as number
                                                  awayVal = `O ${total}`
                                                  homeVal = `U ${total}`
                                                }
                                                
                                                return (
                                                  <tr key={idx} className={bookOdds.isConsensus ? styles.consensusRow : ''}>
                                                    <td className={styles.bookName}>{bookOdds.book}</td>
                                                    <td>{awayVal}</td>
                                                    <td>{homeVal}</td>
                                                  </tr>
                                                )
                                              })}
                                            </tbody>
                                          </table>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              ))
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
              className={`${styles.mobileHeaderCell} ${styles.sortableHeader} ${activeSorts.bet_pct ? styles.sorted : ''}`}
              onClick={() => handleSort('bet_pct')}
            >
              Bets
            </div>
            <div 
              className={`${styles.mobileHeaderCell} ${styles.sortableHeader} ${activeSorts.money_pct ? styles.sorted : ''}`}
              onClick={() => handleSort('money_pct')}
            >
              $$$
            </div>
            <div 
              className={`${styles.mobileHeaderCell} ${styles.sortableHeader} ${activeSorts.signal ? styles.sorted : ''}`}
              onClick={() => handleSort('signal')}
            >
              Signal
            </div>
          </div>
          
          {loading ? (
            <div className={styles.loadingCell}>Loading...</div>
          ) : sortedGames.length === 0 ? (
            <div className={styles.emptyCell}>No games found</div>
          ) : (
            Object.entries(getGamesByDate()).map(([dateKey, gamesOnDate]) => (
              <React.Fragment key={`mobile-group-${dateKey}`}>
                {/* Date separator */}
                <div className={styles.mobileDateSeparator}>
                  {formatGameDate(dateKey)}
                </div>
                {/* Games for this date */}
                {gamesOnDate.map(game => {
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
                          {awayPcts.betPct !== null ? (
                            <>
                              <span>{Math.round(awayPcts.betPct)}%</span>
                              <div className={styles.miniMeterBlue}><div style={{ width: `${awayPcts.betPct}%` }} /></div>
                            </>
                          ) : (
                            <span style={{ color: '#696969' }}>N/A</span>
                          )}
                        </div>
                        <div className={styles.mobilePct}>
                          {awayPcts.moneyPct !== null ? (
                            <>
                              <span>{Math.round(awayPcts.moneyPct)}%</span>
                              <div className={styles.miniMeterGreen}><div style={{ width: `${awayPcts.moneyPct}%` }} /></div>
                            </>
                          ) : (
                            <span style={{ color: '#696969' }}>N/A</span>
                          )}
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
                          {homePcts.betPct !== null ? (
                            <>
                              <span>{Math.round(homePcts.betPct)}%</span>
                              <div className={styles.miniMeterBlue}><div style={{ width: `${homePcts.betPct}%` }} /></div>
                            </>
                          ) : (
                            <span style={{ color: '#696969' }}>N/A</span>
                          )}
                        </div>
                        <div className={styles.mobilePct}>
                          {homePcts.moneyPct !== null ? (
                            <>
                              <span>{Math.round(homePcts.moneyPct)}%</span>
                              <div className={styles.miniMeterGreen}><div style={{ width: `${homePcts.moneyPct}%` }} /></div>
                            </>
                          ) : (
                            <span style={{ color: '#696969' }}>N/A</span>
                          )}
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
                          getTeamColor={getTeamColor}
                          timelineData={timelineData}
                          timelineLoading={timelineLoading}
                          sportsbookOdds={sportsbookOdds}
                          getSportsbookOddsForMarket={getSportsbookOddsForMarket}
                        />
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
