'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import styles from './builder.module.css'

// Icons
import { FaCheckCircle, FaToolbox } from "react-icons/fa"
import { FaHammer } from "react-icons/fa6"
import { HiOutlineXCircle, HiBuildingOffice2 } from "react-icons/hi2"
import { IoMdTrendingUp } from "react-icons/io"
import { IoRocketOutline } from "react-icons/io5"
import { TbTargetArrow } from "react-icons/tb"
import { PiFootballHelmetDuotone, PiChartBarLight, PiMoneyWavy } from "react-icons/pi"
import { GiWhistle } from "react-icons/gi"
import { MdOutlineTipsAndUpdates, MdOutlineAutoGraph, MdOutlineStadium, MdExpandMore, MdExpandLess, MdOutlineUpcoming, MdRoomPreferences } from "react-icons/md"
import { BsCalendarEvent, BsShare } from "react-icons/bs"
import { FiCopy, FiCheck, FiMenu, FiChevronLeft } from "react-icons/fi"
import { LuGitPullRequestArrow, LuBot } from "react-icons/lu"
import { useUser } from "@clerk/nextjs"
import { serializeQueryState, deserializeQueryConfig } from "@/lib/saved-queries"

// Types
type QueryType = 'prop' | 'team' | 'referee' | 'trend'
type TimePeriod = 'L3' | 'L5' | 'L10' | 'L15' | 'L20' | 'L30' | 'season' | 'last_season' | 'L2years' | 'L3years' | 'since_2023' | 'since_2022'

interface QueryResult {
  success?: boolean
  hits: number
  misses: number
  pushes: number
  total_games: number
  hit_rate: number
  avg_value: number
  avg_differential: number
  current_streak: number
  longest_hit_streak: number
  longest_miss_streak: number
  estimated_roi?: number
  total_profit?: number
  query_time_ms: number
  filters_applied: string[]
  games: any[]
  error?: string
}

interface UpcomingGame {
  game_id: string
  game_time: string
  venue?: string
  home_team: {
    id: number
    name: string
    abbr: string
    offense_rank: number
    defense_rank: number
    streak: number
    prev_margin: number
    division?: string
    conference?: string
  }
  away_team: {
    id: number
    name: string
    abbr: string
    offense_rank: number
    defense_rank: number
    streak: number
    prev_margin: number
    division?: string
    conference?: string
  }
  is_division_game: boolean
  is_conference_game: boolean
  books: {
    bookmaker: string
    bookmaker_title: string
    spread: {
      home: number
      home_odds: number
      away: number
      away_odds: number
      opening: number
      movement: number
    }
    total: {
      line: number
      over_odds: number
      under_odds: number
      opening: number
      movement: number
    }
    moneyline: {
      home: number
      away: number
      opening_home: number
      opening_away: number
      home_movement: number
    }
  }[]
}

interface UpcomingResult {
  success: boolean
  filters: string[]
  upcoming_games?: UpcomingGame[]
  upcoming_props?: any[]  // For prop queries
  total_games: number
  total_props?: number    // For prop queries
  total_book_options?: number
  query_time_ms?: number
}

// Constants
const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'L3', label: 'Last 3' },
  { value: 'L5', label: 'Last 5' },
  { value: 'L10', label: 'Last 10' },
  { value: 'L15', label: 'Last 15' },
  { value: 'L20', label: 'Last 20' },
  { value: 'L30', label: 'Last 30' },
  { value: 'season', label: 'This Season' },
  { value: 'last_season', label: 'Last Season' },
  { value: 'L2years', label: 'Last 2 Years' },
  { value: 'L3years', label: 'Last 3 Years' },
  { value: 'since_2023', label: 'Since 2023' },
  { value: 'since_2022', label: 'Since 2022' },
]

// Position-specific prop stats
const POSITIONS = [
  { value: 'any', label: 'All Positions' },
  { value: 'QB', label: 'Quarterback' },
  { value: 'RB', label: 'Running Back' },
  { value: 'WR', label: 'Wide Receiver' },
  { value: 'TE', label: 'Tight End' },
  { value: 'K', label: 'Kicker' },
]

const PROP_STATS_BY_POSITION: Record<string, { value: string; label: string }[]> = {
  any: [
    { value: 'pass_yards', label: 'Pass Yards' },
    { value: 'rush_yards', label: 'Rush Yards' },
    { value: 'receiving_yards', label: 'Receiving Yards' },
    { value: 'receptions', label: 'Receptions' },
  ],
  QB: [
    { value: 'pass_yards', label: 'Pass Yards' },
    { value: 'pass_tds', label: 'Pass TDs' },
    { value: 'pass_attempts', label: 'Pass Attempts' },
    { value: 'completions', label: 'Completions' },
    { value: 'interceptions', label: 'Interceptions' },
    { value: 'rush_yards', label: 'Rush Yards' },
    { value: 'rush_tds', label: 'Rush TDs' },
    { value: 'rush_long', label: 'Longest Rush' },
  ],
  RB: [
    { value: 'rush_yards', label: 'Rush Yards' },
    { value: 'rush_tds', label: 'Rush TDs' },
    { value: 'rush_attempts', label: 'Rush Attempts' },
    { value: 'rush_long', label: 'Longest Rush' },
    { value: 'receiving_yards', label: 'Receiving Yards' },
    { value: 'receptions', label: 'Receptions' },
    { value: 'receiving_long', label: 'Longest Reception' },
  ],
  WR: [
    { value: 'receiving_yards', label: 'Receiving Yards' },
    { value: 'receptions', label: 'Receptions' },
    { value: 'receiving_tds', label: 'Receiving TDs' },
    { value: 'receiving_long', label: 'Longest Reception' },
    { value: 'rush_yards', label: 'Rush Yards' },
  ],
  TE: [
    { value: 'receiving_yards', label: 'Receiving Yards' },
    { value: 'receptions', label: 'Receptions' },
    { value: 'receiving_tds', label: 'Receiving TDs' },
    { value: 'receiving_long', label: 'Longest Reception' },
  ],
  K: [
    { value: 'fg_made', label: 'FG Made' },
    { value: 'fg_attempts', label: 'FG Attempts' },
    { value: 'xp_made', label: 'XP Made' },
  ],
}

// Legacy prop stats (for backwards compatibility)
const PROP_STATS = [
  { value: 'pass_yards', label: 'Pass Yards' },
  { value: 'pass_tds', label: 'Pass TDs' },
  { value: 'rush_yards', label: 'Rush Yards' },
  { value: 'rush_tds', label: 'Rush TDs' },
  { value: 'receiving_yards', label: 'Receiving Yards' },
  { value: 'receptions', label: 'Receptions' },
  { value: 'receiving_tds', label: 'Receiving TDs' },
  { value: 'interceptions', label: 'Interceptions' },
]

// Referee type from database
interface RefereeResult {
  referee_name: string
  game_count: number
}

// Player type from database
interface PlayerResult {
  espn_player_id: number
  name: string
  position: string
  team_id: number
  headshot_url: string
}

// ESPN Team IDs from database
const NFL_TEAMS = [
  { id: 22, name: 'Arizona Cardinals', abbr: 'ARI' },
  { id: 1, name: 'Atlanta Falcons', abbr: 'ATL' },
  { id: 33, name: 'Baltimore Ravens', abbr: 'BAL' },
  { id: 2, name: 'Buffalo Bills', abbr: 'BUF' },
  { id: 29, name: 'Carolina Panthers', abbr: 'CAR' },
  { id: 3, name: 'Chicago Bears', abbr: 'CHI' },
  { id: 4, name: 'Cincinnati Bengals', abbr: 'CIN' },
  { id: 5, name: 'Cleveland Browns', abbr: 'CLE' },
  { id: 6, name: 'Dallas Cowboys', abbr: 'DAL' },
  { id: 7, name: 'Denver Broncos', abbr: 'DEN' },
  { id: 8, name: 'Detroit Lions', abbr: 'DET' },
  { id: 9, name: 'Green Bay Packers', abbr: 'GB' },
  { id: 34, name: 'Houston Texans', abbr: 'HOU' },
  { id: 11, name: 'Indianapolis Colts', abbr: 'IND' },
  { id: 30, name: 'Jacksonville Jaguars', abbr: 'JAX' },
  { id: 12, name: 'Kansas City Chiefs', abbr: 'KC' },
  { id: 13, name: 'Las Vegas Raiders', abbr: 'LV' },
  { id: 24, name: 'Los Angeles Chargers', abbr: 'LAC' },
  { id: 14, name: 'Los Angeles Rams', abbr: 'LAR' },
  { id: 15, name: 'Miami Dolphins', abbr: 'MIA' },
  { id: 16, name: 'Minnesota Vikings', abbr: 'MIN' },
  { id: 17, name: 'New England Patriots', abbr: 'NE' },
  { id: 18, name: 'New Orleans Saints', abbr: 'NO' },
  { id: 19, name: 'New York Giants', abbr: 'NYG' },
  { id: 20, name: 'New York Jets', abbr: 'NYJ' },
  { id: 21, name: 'Philadelphia Eagles', abbr: 'PHI' },
  { id: 23, name: 'Pittsburgh Steelers', abbr: 'PIT' },
  { id: 25, name: 'San Francisco 49ers', abbr: 'SF' },
  { id: 26, name: 'Seattle Seahawks', abbr: 'SEA' },
  { id: 27, name: 'Tampa Bay Buccaneers', abbr: 'TB' },
  { id: 10, name: 'Tennessee Titans', abbr: 'TEN' },
  { id: 28, name: 'Washington Commanders', abbr: 'WAS' },
]

function SportsEngineContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Share functionality state
  const [showCopiedToast, setShowCopiedToast] = useState(false)
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false)
  
  // Determine initial query type from URL path
  const getQueryTypeFromPath = (path: string): QueryType => {
    if (path.includes('/teams')) return 'team'
    if (path.includes('/referees')) return 'referee'
    if (path.includes('/props')) return 'prop'
    return 'trend'
  }
  
  // State
  const [queryType, setQueryType] = useState<QueryType>(() => getQueryTypeFromPath(pathname))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teamLogos, setTeamLogos] = useState<Record<number, string>>({})
  const [visibleGames, setVisibleGames] = useState(10)
  // Use string to allow composite keys like "gameId_playerId" for props
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)
  
  // Upcoming games toggle and data
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [upcomingResult, setUpcomingResult] = useState<UpcomingResult | null>(null)
  const [upcomingLoading, setUpcomingLoading] = useState(false)
  const [expandedUpcomingGameId, setExpandedUpcomingGameId] = useState<string | null>(null)
  const [upcomingSortBy, setUpcomingSortBy] = useState<'time' | 'best_odds'>('time')
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'builder' | 'myBuilds' | 'buddy' | 'topBuilds' | 'preferences'>('builder')
  
  // Saved queries state
  const { user, isSignedIn } = useUser()
  const [savedQueries, setSavedQueries] = useState<any[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false)
  const [saveQueryName, setSaveQueryName] = useState('')
  const [saveQueryDescription, setSaveQueryDescription] = useState('')
  const [savingQuery, setSavingQuery] = useState(false)
  const [loadingSavedQueries, setLoadingSavedQueries] = useState(false)
  const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null)
  
  // Collapsible filter sections - all closed by default
  const [expandedSections, setExpandedSections] = useState({
    playerStats: false,
    matchup: false,
    betting: false,
    teamStats: false
  })
  
  // Referees from database
  const [refereeList, setRefereeList] = useState<RefereeResult[]>([])
  const [refereeSearch, setRefereeSearch] = useState<string>('')
  const [selectedReferee, setSelectedReferee] = useState<RefereeResult | null>(null)
  const [refereeSearchResults, setRefereeSearchResults] = useState<RefereeResult[]>([])

  // Filters
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('since_2022')
  const [location, setLocation] = useState<string>('any')
  const [division, setDivision] = useState<string>('any')
  const [conference, setConference] = useState<string>('any')
  const [playoff, setPlayoff] = useState<string>('any')
  const [favorite, setFavorite] = useState<string>('any')
  // Subject team's own rankings (Team Defense/Offense)
  const [ownDefenseRank, setOwnDefenseRank] = useState<string>('any')
  const [ownDefenseStat, setOwnDefenseStat] = useState<string>('overall')
  const [ownOffenseRank, setOwnOffenseRank] = useState<string>('any')
  const [ownOffenseStat, setOwnOffenseStat] = useState<string>('overall')
  
  // Opponent's rankings (vs Defense/Offense)
  const [defenseRank, setDefenseRank] = useState<string>('any')
  const [defenseStat, setDefenseStat] = useState<string>('pass')
  const [offenseRank, setOffenseRank] = useState<string>('any')
  const [offenseStat, setOffenseStat] = useState<string>('points')
  
  // Win Percentage Filters (0-100)
  const [teamWinPctMin, setTeamWinPctMin] = useState<string>('')
  const [teamWinPctMax, setTeamWinPctMax] = useState<string>('')
  const [oppWinPctMin, setOppWinPctMin] = useState<string>('')
  const [oppWinPctMax, setOppWinPctMax] = useState<string>('')
  
  // Position-specific stat filters (for vs WRs, vs TEs, vs RBs)
  const [defenseStatPosition, setDefenseStatPosition] = useState<string>('')
  const [offenseStatPosition, setOffenseStatPosition] = useState<string>('')
  const [ownDefenseStatPosition, setOwnDefenseStatPosition] = useState<string>('')
  const [ownOffenseStatPosition, setOwnOffenseStatPosition] = useState<string>('')
  
  const [spreadMin, setSpreadMin] = useState<string>('')
  const [spreadMax, setSpreadMax] = useState<string>('')
  const [totalMin, setTotalMin] = useState<string>('')
  const [totalMax, setTotalMax] = useState<string>('')
  const [mlMin, setMlMin] = useState<string>('')
  const [mlMax, setMlMax] = useState<string>('')
  
  // Line movement filters
  const [spreadMoveMin, setSpreadMoveMin] = useState<string>('')
  const [spreadMoveMax, setSpreadMoveMax] = useState<string>('')
  const [totalMoveMin, setTotalMoveMin] = useState<string>('')
  const [totalMoveMax, setTotalMoveMax] = useState<string>('')
  const [mlMoveMin, setMlMoveMin] = useState<string>('')
  const [mlMoveMax, setMlMoveMax] = useState<string>('')

  // O/U Specific Filters
  const [homeFavDog, setHomeFavDog] = useState<string>('any')
  
  // O/U Four-Way Team Stats
  const [homeTeamDefenseRank, setHomeTeamDefenseRank] = useState<string>('any')
  const [homeTeamDefenseStat, setHomeTeamDefenseStat] = useState<string>('overall')
  const [homeTeamOffenseRank, setHomeTeamOffenseRank] = useState<string>('any')
  const [homeTeamOffenseStat, setHomeTeamOffenseStat] = useState<string>('overall')
  const [awayTeamDefenseRank, setAwayTeamDefenseRank] = useState<string>('any')
  const [awayTeamDefenseStat, setAwayTeamDefenseStat] = useState<string>('overall')
  const [awayTeamOffenseRank, setAwayTeamOffenseRank] = useState<string>('any')
  const [awayTeamOffenseStat, setAwayTeamOffenseStat] = useState<string>('overall')
  
  // Momentum Filters (simplified: negative = losses, positive = wins)
  // -1 = prev game loss, -2 = lost 2 in a row, 1 = prev game win, 2 = won 2 in a row
  const [streak, setStreak] = useState<string>('')
  const [prevGameMarginMin, setPrevGameMarginMin] = useState<string>('')
  const [prevGameMarginMax, setPrevGameMarginMax] = useState<string>('')
  
  // O/U: Away Team Momentum
  const [awayStreak, setAwayStreak] = useState<string>('')
  const [awayPrevGameMarginMin, setAwayPrevGameMarginMin] = useState<string>('')
  const [awayPrevGameMarginMax, setAwayPrevGameMarginMax] = useState<string>('')

  // Type-specific
  const [betType, setBetType] = useState<string>('spread')
  const [side, setSide] = useState<string>('over') // For totals
  const [playerId, setPlayerId] = useState<number>(3139477)
  const [propStat, setPropStat] = useState<string>('pass_yards')
  const [propLine, setPropLine] = useState<string>('250')
  const [refereeId, setRefereeId] = useState<string>('')
  const [teamId, setTeamId] = useState<number>(2) // Buffalo Bills (ESPN ID: 2)
  
  // Team Query - Search and Filters
  const [teamSearch, setTeamSearch] = useState<string>('')
  const [teamSearchResults, setTeamSearchResults] = useState<typeof NFL_TEAMS>([])
  const [selectedTeam, setSelectedTeam] = useState<typeof NFL_TEAMS[0] | null>(null)
  const [teamLocation, setTeamLocation] = useState<'any' | 'home' | 'away'>('any')
  
  // Team Query - Versus (head-to-head)
  const [versusTeamSearch, setVersusTeamSearch] = useState<string>('')
  const [versusTeamSearchResults, setVersusTeamSearchResults] = useState<typeof NFL_TEAMS>([])
  const [selectedVersusTeam, setSelectedVersusTeam] = useState<typeof NFL_TEAMS[0] | null>(null)
  
  // Props - Position & Player Search
  const [propPosition, setPropPosition] = useState<string>('any')
  const [playerSearch, setPlayerSearch] = useState<string>('')
  const [playerSearchResults, setPlayerSearchResults] = useState<PlayerResult[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerResult | null>(null)
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false)
  
  // Props - Versus Team filter
  const [propVersusTeamSearch, setPropVersusTeamSearch] = useState<string>('')
  const [propVersusTeamResults, setPropVersusTeamResults] = useState<typeof NFL_TEAMS>([])
  const [selectedPropVersusTeam, setSelectedPropVersusTeam] = useState<typeof NFL_TEAMS[0] | null>(null)
  
  // Props - Line Mode (Book Line, And (both), or Any Line)
  const [propLineMode, setPropLineMode] = useState<'book' | 'and' | 'any'>('any')
  const [bookLineMin, setBookLineMin] = useState<string>('')
  const [bookLineMax, setBookLineMax] = useState<string>('')
  
  // Props - Player Stats Filters (game conditions, not bet types)
  const [minTargets, setMinTargets] = useState<string>('')
  const [minCarries, setMinCarries] = useState<string>('')
  const [minPassAttempts, setMinPassAttempts] = useState<string>('')
  
  // Get available stats based on position (use selected player's position if available)
  const effectivePosition = selectedPlayer?.position || propPosition
  const availablePropStats = PROP_STATS_BY_POSITION[effectivePosition] || PROP_STATS_BY_POSITION['any']
  
  // Navigate to query type URL (seamless transition)
  const navigateToQueryType = (type: QueryType) => {
    const paths: Record<QueryType, string> = {
      trend: '/builder',
      team: '/builder/teams',
      referee: '/builder/referees',
      prop: '/builder/props'
    }
    setQueryType(type) // Update state immediately for instant UI feedback
    router.push(paths[type], { scroll: false }) // Navigate without scroll reset
  }
  
  // Clear all filters to defaults
  const clearFilters = () => {
    // Time & basic filters
    setTimePeriod('since_2022')
    setLocation('any')
    setDivision('any')
    setConference('any')
    setPlayoff('any')
    setFavorite('any')
    
    // Subject team's own rankings
    setOwnDefenseRank('any')
    setOwnDefenseStat('overall')
    setOwnOffenseRank('any')
    setOwnOffenseStat('overall')
    
    // Opponent rankings (vs Defense/Offense)
    setDefenseRank('any')
    setDefenseStat('pass')
    setOffenseRank('any')
    setOffenseStat('points')
    
    // Win percentage
    setTeamWinPctMin('')
    setTeamWinPctMax('')
    setOppWinPctMin('')
    setOppWinPctMax('')
    
    // Position-specific stat filters
    setDefenseStatPosition('')
    setOffenseStatPosition('')
    setOwnDefenseStatPosition('')
    setOwnOffenseStatPosition('')
    
    // Ranges
    setSpreadMin('')
    setSpreadMax('')
    setTotalMin('')
    setTotalMax('')
    setMlMin('')
    setMlMax('')
    
    // Line movement
    setSpreadMoveMin('')
    setSpreadMoveMax('')
    setTotalMoveMin('')
    setTotalMoveMax('')
    setMlMoveMin('')
    setMlMoveMax('')
    
    // O/U specific
    setHomeFavDog('any')
    setHomeTeamDefenseRank('any')
    setHomeTeamDefenseStat('overall')
    setHomeTeamOffenseRank('any')
    setHomeTeamOffenseStat('overall')
    setAwayTeamDefenseRank('any')
    setAwayTeamDefenseStat('overall')
    setAwayTeamOffenseRank('any')
    setAwayTeamOffenseStat('overall')
    
    // Momentum
    setStreak('')
    setPrevGameMarginMin('')
    setPrevGameMarginMax('')
    setAwayStreak('')
    setAwayPrevGameMarginMin('')
    setAwayPrevGameMarginMax('')
    
    // Bet type
    setBetType('spread')
    setSide('over')
    
    // Team search
    setTeamSearch('')
    setSelectedTeam(null)
    setTeamLocation('any')
    setVersusTeamSearch('')
    setSelectedVersusTeam(null)
    
    // Referee
    setRefereeSearch('')
    setSelectedReferee(null)
    setRefereeId('')
    
    // Props
    setPropPosition('any')
    setPlayerSearch('')
    setSelectedPlayer(null)
    setPropStat('pass_yards')
    setPropLine('250')
    setPropLineMode('any')
    setBookLineMin('')
    setBookLineMax('')
    setPropVersusTeamSearch('')
    setPropVersusTeamResults([])
    setSelectedPropVersusTeam(null)
    
    // Player Stats filters
    setMinTargets('')
    setMinCarries('')
    setMinPassAttempts('')
    
    // Clear results
    setResult(null)
    setError(null)
  }
  
  // ============================================
  // SAVED QUERIES FUNCTIONALITY
  // ============================================

  // Load all saved queries for the current user
  const loadSavedQueries = async () => {
    if (!isSignedIn) return
    
    setLoadingSavedQueries(true)
    try {
      const response = await fetch('/api/saved-queries')
      if (!response.ok) {
        console.error('Failed to load saved queries')
        return
      }
      const data = await response.json()
      if (data.success) {
        setSavedQueries(data.queries || [])
      }
    } catch (error) {
      console.error('Error loading saved queries:', error)
    } finally {
      setLoadingSavedQueries(false)
    }
  }

  // Save current query state
  const handleSaveQuery = async () => {
    if (!isSignedIn) {
      alert('Please sign in to save queries')
      return
    }
    
    if (!saveQueryName.trim()) {
      alert('Please enter a name for your saved query')
      return
    }
    
    setSavingQuery(true)
    try {
      // Serialize current state
      const queryConfig = serializeQueryState({
        queryType,
        betType,
        side,
        timePeriod,
        location,
        division,
        conference,
        playoff,
        favorite,
        homeFavDog,
        ownDefenseRank,
        ownDefenseStat,
        ownOffenseRank,
        ownOffenseStat,
        defenseRank,
        defenseStat,
        offenseRank,
        offenseStat,
        defenseStatPosition,
        offenseStatPosition,
        ownDefenseStatPosition,
        ownOffenseStatPosition,
        teamWinPctMin,
        teamWinPctMax,
        oppWinPctMin,
        oppWinPctMax,
        spreadMin,
        spreadMax,
        totalMin,
        totalMax,
        mlMin,
        mlMax,
        spreadMoveMin,
        spreadMoveMax,
        totalMoveMin,
        totalMoveMax,
        mlMoveMin,
        mlMoveMax,
        homeTeamDefenseRank,
        homeTeamDefenseStat,
        homeTeamOffenseRank,
        homeTeamOffenseStat,
        awayTeamDefenseRank,
        awayTeamDefenseStat,
        awayTeamOffenseRank,
        awayTeamOffenseStat,
        streak,
        prevGameMarginMin,
        prevGameMarginMax,
        awayStreak,
        awayPrevGameMarginMin,
        awayPrevGameMarginMax,
        teamId,
        teamLocation,
        selectedVersusTeam,
        refereeId,
        selectedReferee,
        playerId: selectedPlayer?.espn_player_id,
        selectedPlayer,
        propPosition,
        propStat,
        propLine,
        propLineMode,
        bookLineMin,
        bookLineMax,
        selectedPropVersusTeam,
        minTargets,
        minCarries,
        minPassAttempts
      })
      
      // Save last result summary if available (including ROI)
      const lastResultSummary = result ? {
        hits: result.hits,
        misses: result.misses,
        hit_rate: result.hit_rate,
        total_games: result.total_games,
        roi: result.estimated_roi
      } : null
      
      const response = await fetch('/api/saved-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveQueryName.trim(),
          description: saveQueryDescription.trim() || null,
          query_config: queryConfig,
          last_result_summary: lastResultSummary
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to save query')
        return
      }
      
      // Success - reload queries and show success modal
      await loadSavedQueries()
      setShowSaveModal(false)
      setSaveQueryName('')
      setSaveQueryDescription('')
      setShowSaveSuccessModal(true)
    } catch (error) {
      console.error('Error saving query:', error)
      alert('Failed to save query')
    } finally {
      setSavingQuery(false)
    }
  }

  // Load a saved query into the builder
  const handleLoadQuery = async (savedQuery: any) => {
    try {
      const config = savedQuery.query_config
      
      // Navigate to the correct query type first
      if (config.queryType) {
        navigateToQueryType(config.queryType)
      }
      
      // Deserialize and apply all the state
      const state = deserializeQueryConfig(config)
      
      // Apply basic filters
      if (state.timePeriod) setTimePeriod(state.timePeriod as TimePeriod)
      if (state.betType) setBetType(state.betType)
      if (state.side) setSide(state.side)
      if (state.location) setLocation(state.location)
      if (state.division) setDivision(state.division)
      if (state.conference) setConference(state.conference)
      if (state.playoff) setPlayoff(state.playoff)
      if (state.favorite) setFavorite(state.favorite)
      if (state.homeFavDog) setHomeFavDog(state.homeFavDog)
      
      // Rankings
      if (state.ownDefenseRank) setOwnDefenseRank(state.ownDefenseRank)
      if (state.ownDefenseStat) setOwnDefenseStat(state.ownDefenseStat)
      if (state.ownOffenseRank) setOwnOffenseRank(state.ownOffenseRank)
      if (state.ownOffenseStat) setOwnOffenseStat(state.ownOffenseStat)
      if (state.defenseRank) setDefenseRank(state.defenseRank)
      if (state.defenseStat) setDefenseStat(state.defenseStat)
      if (state.offenseRank) setOffenseRank(state.offenseRank)
      if (state.offenseStat) setOffenseStat(state.offenseStat)
      if (state.defenseStatPosition) setDefenseStatPosition(state.defenseStatPosition)
      if (state.offenseStatPosition) setOffenseStatPosition(state.offenseStatPosition)
      if (state.ownDefenseStatPosition) setOwnDefenseStatPosition(state.ownDefenseStatPosition)
      if (state.ownOffenseStatPosition) setOwnOffenseStatPosition(state.ownOffenseStatPosition)
      
      // Win percentages
      if (state.teamWinPctMin) setTeamWinPctMin(state.teamWinPctMin)
      if (state.teamWinPctMax) setTeamWinPctMax(state.teamWinPctMax)
      if (state.oppWinPctMin) setOppWinPctMin(state.oppWinPctMin)
      if (state.oppWinPctMax) setOppWinPctMax(state.oppWinPctMax)
      
      // Ranges
      if (state.spreadMin) setSpreadMin(state.spreadMin)
      if (state.spreadMax) setSpreadMax(state.spreadMax)
      if (state.totalMin) setTotalMin(state.totalMin)
      if (state.totalMax) setTotalMax(state.totalMax)
      if (state.mlMin) setMlMin(state.mlMin)
      if (state.mlMax) setMlMax(state.mlMax)
      
      // Line movement
      if (state.spreadMoveMin) setSpreadMoveMin(state.spreadMoveMin)
      if (state.spreadMoveMax) setSpreadMoveMax(state.spreadMoveMax)
      if (state.totalMoveMin) setTotalMoveMin(state.totalMoveMin)
      if (state.totalMoveMax) setTotalMoveMax(state.totalMoveMax)
      if (state.mlMoveMin) setMlMoveMin(state.mlMoveMin)
      if (state.mlMoveMax) setMlMoveMax(state.mlMoveMax)
      
      // O/U specific
      if (state.homeTeamDefenseRank) setHomeTeamDefenseRank(state.homeTeamDefenseRank)
      if (state.homeTeamDefenseStat) setHomeTeamDefenseStat(state.homeTeamDefenseStat)
      if (state.homeTeamOffenseRank) setHomeTeamOffenseRank(state.homeTeamOffenseRank)
      if (state.homeTeamOffenseStat) setHomeTeamOffenseStat(state.homeTeamOffenseStat)
      if (state.awayTeamDefenseRank) setAwayTeamDefenseRank(state.awayTeamDefenseRank)
      if (state.awayTeamDefenseStat) setAwayTeamDefenseStat(state.awayTeamDefenseStat)
      if (state.awayTeamOffenseRank) setAwayTeamOffenseRank(state.awayTeamOffenseRank)
      if (state.awayTeamOffenseStat) setAwayTeamOffenseStat(state.awayTeamOffenseStat)
      
      // Momentum
      if (state.streak) setStreak(state.streak)
      if (state.prevGameMarginMin) setPrevGameMarginMin(state.prevGameMarginMin)
      if (state.prevGameMarginMax) setPrevGameMarginMax(state.prevGameMarginMax)
      if (state.awayStreak) setAwayStreak(state.awayStreak)
      if (state.awayPrevGameMarginMin) setAwayPrevGameMarginMin(state.awayPrevGameMarginMin)
      if (state.awayPrevGameMarginMax) setAwayPrevGameMarginMax(state.awayPrevGameMarginMax)
      
      // Type-specific
      if (config.queryType === 'team') {
        if (state.teamId) {
          setTeamId(state.teamId)
          const team = NFL_TEAMS.find(t => t.id === state.teamId)
          if (team) setSelectedTeam(team)
        }
        if (state.teamLocation) setTeamLocation(state.teamLocation)
        if (state.selectedVersusTeam) {
          const vsTeam = NFL_TEAMS.find(t => t.id === state.selectedVersusTeam.id)
          if (vsTeam) setSelectedVersusTeam(vsTeam)
        }
      }
      
      if (config.queryType === 'referee') {
        if (state.refereeId) setRefereeId(state.refereeId)
        if (state.selectedReferee) {
          setSelectedReferee(state.selectedReferee)
        }
      }
      
      if (config.queryType === 'prop') {
        if (state.propPosition) setPropPosition(state.propPosition)
        if (state.propStat) setPropStat(state.propStat)
        if (state.propLine) setPropLine(state.propLine)
        if (state.propLineMode) setPropLineMode(state.propLineMode)
        if (state.bookLineMin) setBookLineMin(state.bookLineMin)
        if (state.bookLineMax) setBookLineMax(state.bookLineMax)
        if (state.selectedPropVersusTeam) {
          const vsTeam = NFL_TEAMS.find(t => t.id === state.selectedPropVersusTeam.id)
          if (vsTeam) setSelectedPropVersusTeam(vsTeam)
        }
        if (state.minTargets) setMinTargets(state.minTargets)
        if (state.minCarries) setMinCarries(state.minCarries)
        if (state.minPassAttempts) setMinPassAttempts(state.minPassAttempts)
        
        // Load player if saved
        if (state.selectedPlayer && state.selectedPlayer.espn_player_id) {
          // Search for the player and set it when found
          const playerIdToFind = state.selectedPlayer.espn_player_id
          const playerName = state.selectedPlayer.name || ''
          const playerPosition = state.selectedPlayer.position || propPosition
          
          searchPlayers(playerName, playerPosition).then(() => {
            // Use a small delay to allow state to update
            setTimeout(() => {
              // The searchPlayers function updates playerSearchResults state
              // We need to check it after the state updates
              // For now, we'll set the player info directly from saved data
              if (state.selectedPlayer) {
                setSelectedPlayer({
                  espn_player_id: playerIdToFind,
                  name: state.selectedPlayer.name || '',
                  position: state.selectedPlayer.position || '',
                  headshot_url: state.selectedPlayer.headshot_url
                } as any)
                setPlayerId(playerIdToFind)
              }
            }, 300)
          }).catch(() => {
            // If search fails, still try to set the player from saved data
            if (state.selectedPlayer) {
              setSelectedPlayer({
                espn_player_id: playerIdToFind,
                name: state.selectedPlayer.name || '',
                position: state.selectedPlayer.position || '',
                headshot_url: state.selectedPlayer.headshot_url
              } as any)
              setPlayerId(playerIdToFind)
            }
          })
        }
      }
      
      // Switch to builder section
      setActiveSection('builder')
      setSidebarOpen(false)
      
      // Track that this query was loaded
      if (savedQuery.id) {
        fetch(`/api/saved-queries/${savedQuery.id}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(err => console.error('Failed to track query run:', err))
      }
    } catch (error) {
      console.error('Error loading query:', error)
      alert('Failed to load query')
    }
  }

  // Delete a saved query
  const handleDeleteQuery = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved query?')) {
      return
    }
    
    setDeletingQueryId(id)
    try {
      const response = await fetch(`/api/saved-queries/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        alert('Failed to delete query')
        return
      }
      
      // Reload queries
      await loadSavedQueries()
    } catch (error) {
      console.error('Error deleting query:', error)
      alert('Failed to delete query')
    } finally {
      setDeletingQueryId(null)
    }
  }
  
  // Sync query type with URL when path changes (for browser back/forward)
  useEffect(() => {
    const typeFromPath = getQueryTypeFromPath(pathname)
    if (typeFromPath !== queryType) {
      setQueryType(typeFromPath)
    }
  }, [pathname])
  
  // Auto-switch time period when Book Line mode is selected (book lines only available since 2023)
  useEffect(() => {
    if ((propLineMode === 'book' || propLineMode === 'and') && timePeriod === 'since_2022') {
      setTimePeriod('since_2023')
    }
  }, [propLineMode])
  
  // Load saved queries when user signs in
  useEffect(() => {
    if (isSignedIn) {
      loadSavedQueries()
    }
  }, [isSignedIn])
  
  // Search players from database
  const searchPlayers = async (query: string, position: string): Promise<void> => {
    if (query.length < 2 && position === 'any') {
      setPlayerSearchResults([])
      return Promise.resolve()
    }
    
    setPlayerSearchLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        position: position === 'any' ? '' : position,
        sport: 'nfl',
        limit: '15'
      })
      
      const response = await fetch(`/api/clickhouse/search-players?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setPlayerSearchResults(data.players)
      }
    } catch (error) {
      console.error('Player search error:', error)
    } finally {
      setPlayerSearchLoading(false)
    }
  }
  
  // Search teams (client-side filter of NFL_TEAMS)
  const searchTeams = (query: string): typeof NFL_TEAMS => {
    if (!query || query.length < 1) return []
    const lowerQuery = query.toLowerCase()
    return NFL_TEAMS.filter(team => 
      team.name.toLowerCase().includes(lowerQuery) ||
      team.abbr.toLowerCase().includes(lowerQuery)
    )
  }
  
  // Handle team search input
  const handleTeamSearch = (query: string) => {
    setTeamSearch(query)
    setTeamSearchResults(searchTeams(query))
  }
  
  // Handle versus team search input
  const handleVersusTeamSearch = (query: string) => {
    setVersusTeamSearch(query)
    setVersusTeamSearchResults(searchTeams(query))
  }
  
  // Handle prop versus team search input
  const handlePropVersusTeamSearch = (query: string) => {
    setPropVersusTeamSearch(query)
    setPropVersusTeamResults(searchTeams(query))
  }
  
  // Helper to check if current bet type is O/U
  const isOUQuery = betType === 'total'

  // Fetch team logos on mount with retry logic
  useEffect(() => {
    const fetchLogos = async (retryCount = 0) => {
      try {
        const response = await fetch('/api/clickhouse/team-logos')
        if (!response.ok) {
          console.error('Team logos API returned:', response.status)
          // Retry on server error
          if (response.status >= 500 && retryCount < 2) {
            setTimeout(() => fetchLogos(retryCount + 1), 2000 * (retryCount + 1))
          }
          return
        }
        const text = await response.text()
        if (!text || text.startsWith('<!')) {
          console.error('Team logos API returned HTML, not JSON')
          return
        }
        const data = JSON.parse(text)
        if (data.logos && data.logos.length > 0) {
          const logoMap: Record<number, string> = {}
          data.logos.forEach((t: { espn_team_id: number; logo_url: string }) => {
            logoMap[t.espn_team_id] = t.logo_url
          })
          setTeamLogos(logoMap)
        } else if (retryCount < 2) {
          // No logos returned, retry
          console.log('No logos returned, retrying...')
          setTimeout(() => fetchLogos(retryCount + 1), 2000 * (retryCount + 1))
        }
      } catch (err) {
        console.error('Failed to fetch team logos:', err)
        // Retry on error
        if (retryCount < 2) {
          setTimeout(() => fetchLogos(retryCount + 1), 2000 * (retryCount + 1))
        }
      }
    }
    fetchLogos()
  }, [])
  
  // Fetch referees on mount
  useEffect(() => {
    const fetchReferees = async () => {
      try {
        const response = await fetch('/api/clickhouse/referees')
        if (!response.ok) return
        const data = await response.json()
        if (data.success && data.referees) {
          setRefereeList(data.referees)
        }
      } catch (err) {
        console.error('Failed to fetch referees:', err)
      }
    }
    fetchReferees()
  }, [])
  
  // Filter referees based on search
  const searchReferees = (query: string): RefereeResult[] => {
    if (!query) return refereeList.slice(0, 10)
    const lowerQuery = query.toLowerCase()
    return refereeList.filter(ref => 
      ref.referee_name.toLowerCase().includes(lowerQuery)
    ).slice(0, 10)
  }
  
  // Handle referee search input
  const handleRefereeSearch = (query: string) => {
    setRefereeSearch(query)
    setRefereeSearchResults(searchReferees(query))
  }

  // ============================================
  // SHARE FUNCTIONALITY
  // ============================================
  
  // Build shareable URL from current state
  const buildShareableUrl = useCallback(() => {
    const params = new URLSearchParams()
    
    // Query type
    params.set('type', queryType)
    
    // Bet type (for trends/teams/refs)
    if (queryType !== 'prop') {
      params.set('bet', betType)
      if (betType === 'total' && side) params.set('side', side)
    }
    
    // Time period
    params.set('period', timePeriod)
    
    // Basic filters
    if (location !== 'any') params.set('loc', location)
    if (division !== 'any') params.set('div', division)
    if (conference !== 'any') params.set('conf', conference)
    if (playoff !== 'any') params.set('playoff', playoff)
    if (favorite !== 'any') params.set('fav', favorite)
    if (homeFavDog !== 'any') params.set('homefav', homeFavDog)
    
    // Rankings
    if (ownDefenseRank !== 'any') params.set('ownDef', ownDefenseRank)
    if (ownOffenseRank !== 'any') params.set('ownOff', ownOffenseRank)
    if (defenseRank !== 'any') params.set('vsDef', defenseRank)
    if (offenseRank !== 'any') params.set('vsOff', offenseRank)
    if (ownDefenseStat !== 'overall') params.set('ownDefStat', ownDefenseStat)
    if (ownOffenseStat !== 'overall') params.set('ownOffStat', ownOffenseStat)
    if (defenseStat !== 'overall') params.set('defStat', defenseStat)
    if (offenseStat !== 'overall') params.set('offStat', offenseStat)
    
    // Ranges
    if (spreadMin) params.set('spMin', spreadMin)
    if (spreadMax) params.set('spMax', spreadMax)
    if (totalMin) params.set('totMin', totalMin)
    if (totalMax) params.set('totMax', totalMax)
    if (mlMin) params.set('mlMin', mlMin)
    if (mlMax) params.set('mlMax', mlMax)
    
    // Line movement
    if (spreadMoveMin) params.set('spMoveMin', spreadMoveMin)
    if (spreadMoveMax) params.set('spMoveMax', spreadMoveMax)
    if (totalMoveMin) params.set('totMoveMin', totalMoveMin)
    if (totalMoveMax) params.set('totMoveMax', totalMoveMax)
    
    // Win percentages
    if (teamWinPctMin) params.set('teamWinMin', teamWinPctMin)
    if (teamWinPctMax) params.set('teamWinMax', teamWinPctMax)
    if (oppWinPctMin) params.set('oppWinMin', oppWinPctMin)
    if (oppWinPctMax) params.set('oppWinMax', oppWinPctMax)
    
    // Momentum
    if (streak) params.set('streak', streak)
    if (prevGameMarginMin) params.set('prevMin', prevGameMarginMin)
    if (prevGameMarginMax) params.set('prevMax', prevGameMarginMax)
    
    // Team-specific
    if (queryType === 'team' && teamId) params.set('team', teamId.toString())
    if (teamLocation !== 'any') params.set('teamLoc', teamLocation)
    if (selectedVersusTeam) params.set('opp', selectedVersusTeam.id.toString())
    
    // Referee-specific
    if (queryType === 'referee' && selectedReferee) params.set('ref', selectedReferee.referee_name)
    
    // Props-specific
    if (queryType === 'prop') {
      if (propPosition !== 'any') params.set('pos', propPosition)
      if (propStat) params.set('stat', propStat)
      if (propLine) params.set('line', propLine)
      if (propLineMode === 'book' || propLineMode === 'and') {
        params.set('lineMode', propLineMode)
        if (bookLineMin) params.set('bookMin', bookLineMin)
        if (bookLineMax) params.set('bookMax', bookLineMax)
      }
      if (selectedPropVersusTeam) params.set('vsTeam', selectedPropVersusTeam.toString())
    }
    
    // Build the full URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/builder?${params.toString()}`
  }, [queryType, betType, side, timePeriod, location, division, conference, playoff, favorite, homeFavDog,
      ownDefenseRank, ownOffenseRank, defenseRank, offenseRank, ownDefenseStat, ownOffenseStat, defenseStat, offenseStat,
      spreadMin, spreadMax, totalMin, totalMax, mlMin, mlMax, spreadMoveMin, spreadMoveMax, totalMoveMin, totalMoveMax,
      teamWinPctMin, teamWinPctMax, oppWinPctMin, oppWinPctMax, streak, prevGameMarginMin, prevGameMarginMax,
      teamId, teamLocation, selectedVersusTeam, selectedReferee, propPosition, propStat, propLine, propLineMode, 
      bookLineMin, bookLineMax, selectedPropVersusTeam])
  
  // Handle share button click
  const handleShare = async () => {
    const url = buildShareableUrl()
    
    try {
      await navigator.clipboard.writeText(url)
      setShowCopiedToast(true)
      setTimeout(() => setShowCopiedToast(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setShowCopiedToast(true)
      setTimeout(() => setShowCopiedToast(false), 2000)
    }
  }
  
  // Load filters from URL on mount
  useEffect(() => {
    // Get the type param - if it doesn't exist, no share params in URL
    const type = searchParams.get('type') as QueryType | null
    if (!type) return
    
    // Only load once per set of params
    if (hasLoadedFromUrl) return
    setHasLoadedFromUrl(true)
    
    // Query type
    if (type) setQueryType(type)
    
    // Bet type
    const bet = searchParams.get('bet')
    if (bet) setBetType(bet as any)
    const sideParam = searchParams.get('side')
    if (sideParam) setSide(sideParam as any)
    
    // Time period
    const period = searchParams.get('period')
    if (period) setTimePeriod(period as TimePeriod)
    
    // Basic filters
    const loc = searchParams.get('loc')
    if (loc) setLocation(loc)
    const div = searchParams.get('div')
    if (div) setDivision(div)
    const conf = searchParams.get('conf')
    if (conf) setConference(conf)
    const playoffParam = searchParams.get('playoff')
    if (playoffParam) setPlayoff(playoffParam)
    const fav = searchParams.get('fav')
    if (fav) setFavorite(fav)
    const homefav = searchParams.get('homefav')
    if (homefav) setHomeFavDog(homefav)
    
    // Rankings
    const ownDef = searchParams.get('ownDef')
    if (ownDef) setOwnDefenseRank(ownDef)
    const ownOff = searchParams.get('ownOff')
    if (ownOff) setOwnOffenseRank(ownOff)
    const vsDef = searchParams.get('vsDef')
    if (vsDef) setDefenseRank(vsDef)
    const vsOff = searchParams.get('vsOff')
    if (vsOff) setOffenseRank(vsOff)
    const ownDefStat = searchParams.get('ownDefStat')
    if (ownDefStat) setOwnDefenseStat(ownDefStat)
    const ownOffStat = searchParams.get('ownOffStat')
    if (ownOffStat) setOwnOffenseStat(ownOffStat)
    const defStat = searchParams.get('defStat')
    if (defStat) setDefenseStat(defStat)
    const offStat = searchParams.get('offStat')
    if (offStat) setOffenseStat(offStat)
    
    // Ranges
    const spMin = searchParams.get('spMin')
    if (spMin) setSpreadMin(spMin)
    const spMax = searchParams.get('spMax')
    if (spMax) setSpreadMax(spMax)
    const totMin = searchParams.get('totMin')
    if (totMin) setTotalMin(totMin)
    const totMax = searchParams.get('totMax')
    if (totMax) setTotalMax(totMax)
    const mlMinParam = searchParams.get('mlMin')
    if (mlMinParam) setMlMin(mlMinParam)
    const mlMaxParam = searchParams.get('mlMax')
    if (mlMaxParam) setMlMax(mlMaxParam)
    
    // Line movement
    const spMoveMin = searchParams.get('spMoveMin')
    if (spMoveMin) setSpreadMoveMin(spMoveMin)
    const spMoveMax = searchParams.get('spMoveMax')
    if (spMoveMax) setSpreadMoveMax(spMoveMax)
    const totMoveMin = searchParams.get('totMoveMin')
    if (totMoveMin) setTotalMoveMin(totMoveMin)
    const totMoveMax = searchParams.get('totMoveMax')
    if (totMoveMax) setTotalMoveMax(totMoveMax)
    
    // Win percentages
    const teamWinMin = searchParams.get('teamWinMin')
    if (teamWinMin) setTeamWinPctMin(teamWinMin)
    const teamWinMax = searchParams.get('teamWinMax')
    if (teamWinMax) setTeamWinPctMax(teamWinMax)
    const oppWinMin = searchParams.get('oppWinMin')
    if (oppWinMin) setOppWinPctMin(oppWinMin)
    const oppWinMax = searchParams.get('oppWinMax')
    if (oppWinMax) setOppWinPctMax(oppWinMax)
    
    // Momentum
    const streakParam = searchParams.get('streak')
    if (streakParam) setStreak(streakParam)
    const prevMin = searchParams.get('prevMin')
    if (prevMin) setPrevGameMarginMin(prevMin)
    const prevMax = searchParams.get('prevMax')
    if (prevMax) setPrevGameMarginMax(prevMax)
    
    // Team-specific
    const teamParam = searchParams.get('team')
    if (teamParam) setTeamId(parseInt(teamParam))
    const teamLoc = searchParams.get('teamLoc')
    if (teamLoc && ['any', 'home', 'away'].includes(teamLoc)) {
      setTeamLocation(teamLoc as 'any' | 'home' | 'away')
    }
    const oppParam = searchParams.get('opp')
    if (oppParam) {
      const oppTeam = NFL_TEAMS.find(t => t.id === parseInt(oppParam))
      if (oppTeam) setSelectedVersusTeam(oppTeam)
    }
    
    // Referee-specific
    const refParam = searchParams.get('ref')
    if (refParam) {
      // Create a minimal referee object from the URL param
      setSelectedReferee({ referee_name: refParam, game_count: 0 })
    }
    
    // Props-specific
    const posParam = searchParams.get('pos')
    if (posParam) setPropPosition(posParam)
    const statParam = searchParams.get('stat')
    if (statParam) setPropStat(statParam as any)
    const lineParam = searchParams.get('line')
    if (lineParam) setPropLine(lineParam)
    const lineMode = searchParams.get('lineMode')
    if (lineMode === 'book' || lineMode === 'and') {
      setPropLineMode(lineMode as 'book' | 'and')
      const bookMin = searchParams.get('bookMin')
      if (bookMin) setBookLineMin(bookMin)
      const bookMax = searchParams.get('bookMax')
      if (bookMax) setBookLineMax(bookMax)
    }
    const vsTeam = searchParams.get('vsTeam')
    if (vsTeam) {
      const versusTeam = NFL_TEAMS.find(t => t.id === parseInt(vsTeam))
      if (versusTeam) setSelectedPropVersusTeam(versusTeam)
    }
    
  }, [searchParams, hasLoadedFromUrl])

  // Build display filters list
  const getAppliedFiltersDisplay = () => {
    const filters: string[] = []
    
    // Bet type - only show for trends, teams, and refs (not props)
    if (queryType !== 'prop' && betType) {
      const betLabel = betType === 'spread' ? 'Spread' 
        : betType === 'total' ? (side === 'over' ? 'Over' : 'Under') 
        : 'Moneyline'
      filters.push(betLabel)
    }
    
    // Time period
    const tp = TIME_PERIODS.find(t => t.value === timePeriod)
    if (tp) filters.push(tp.label)
    
    // Basic filters - different for O/U
    if (!isOUQuery && location !== 'any') {
      filters.push(location === 'home' ? 'Home' : 'Away')
    }
    if (division !== 'any') filters.push(division === 'division' ? 'Division Game' : 'Non-Division')
    if (conference !== 'any') filters.push(conference === 'conference' ? 'Conference Game' : 'Non-Conference')
    if (playoff !== 'any') filters.push(playoff === 'playoff' ? 'Playoff' : 'Regular Season')
    
    // Fav/Dog - different for O/U
    if (!isOUQuery && favorite !== 'any') {
      filters.push(favorite === 'favorite' ? 'Favorite' : 'Underdog')
    }
    if (isOUQuery && homeFavDog !== 'any') {
      filters.push(homeFavDog === 'home_fav' ? 'Home Favorite' : 'Home Underdog')
    }
    
    // Team stats - different for O/U
    if (!isOUQuery) {
      // Subject team's own rankings
      if (ownDefenseRank !== 'any') {
        const statLabel = ownDefenseStat !== 'overall' ? ` (${ownDefenseStat})` : ''
        filters.push(`Team ${ownDefenseRank.replace('_', ' ')} Defense${statLabel}`)
      }
      if (ownOffenseRank !== 'any') {
        const statLabel = ownOffenseStat !== 'overall' ? ` (${ownOffenseStat})` : ''
        filters.push(`Team ${ownOffenseRank.replace('_', ' ')} Offense${statLabel}`)
      }
      // Opponent rankings
      if (defenseRank !== 'any') {
        const statLabel = defenseStat === 'overall' ? '' : ` (${defenseStat})`
        filters.push(`vs ${defenseRank.replace('_', ' ')} Defense${statLabel}`)
      }
      if (offenseRank !== 'any') {
        const statLabel = offenseStat === 'overall' ? '' : ` (${offenseStat})`
        filters.push(`vs ${offenseRank.replace('_', ' ')} Offense${statLabel}`)
      }
      // Win percentage
      if (teamWinPctMin || teamWinPctMax) {
        if (teamWinPctMin && teamWinPctMax) {
          filters.push(`Team Win%: ${teamWinPctMin}-${teamWinPctMax}%`)
        } else if (teamWinPctMin) {
          filters.push(`Team Win%: ${teamWinPctMin}%+`)
        } else if (teamWinPctMax) {
          filters.push(`Team Win%: ≤${teamWinPctMax}%`)
        }
      }
      if (oppWinPctMin || oppWinPctMax) {
        if (oppWinPctMin && oppWinPctMax) {
          filters.push(`Opp Win%: ${oppWinPctMin}-${oppWinPctMax}%`)
        } else if (oppWinPctMin) {
          filters.push(`Opp Win%: ${oppWinPctMin}%+`)
        } else if (oppWinPctMax) {
          filters.push(`Opp Win%: ≤${oppWinPctMax}%`)
        }
      }
    } else {
      // O/U four-way team stats
      if (homeTeamDefenseRank !== 'any') {
        const statLabel = homeTeamDefenseStat !== 'overall' ? ` (${homeTeamDefenseStat})` : ''
        filters.push(`Home ${homeTeamDefenseRank.replace('_', ' ')} D${statLabel}`)
      }
      if (homeTeamOffenseRank !== 'any') {
        const statLabel = homeTeamOffenseStat !== 'overall' ? ` (${homeTeamOffenseStat})` : ''
        filters.push(`Home ${homeTeamOffenseRank.replace('_', ' ')} O${statLabel}`)
      }
      if (awayTeamDefenseRank !== 'any') {
        const statLabel = awayTeamDefenseStat !== 'overall' ? ` (${awayTeamDefenseStat})` : ''
        filters.push(`Away ${awayTeamDefenseRank.replace('_', ' ')} D${statLabel}`)
      }
      if (awayTeamOffenseRank !== 'any') {
        const statLabel = awayTeamOffenseStat !== 'overall' ? ` (${awayTeamOffenseStat})` : ''
        filters.push(`Away ${awayTeamOffenseRank.replace('_', ' ')} O${statLabel}`)
      }
    }
    
    // Spread range
    if (spreadMin || spreadMax) {
      const prefix = isOUQuery ? 'Home Spread' : 'Spread'
      if (spreadMin && spreadMax) {
        const minVal = parseFloat(spreadMin)
        const maxVal = parseFloat(spreadMax)
        filters.push(`${prefix}: ${minVal > 0 ? '+' : ''}${spreadMin} to ${maxVal > 0 ? '+' : ''}${spreadMax}`)
      } else if (spreadMin) {
        const minVal = parseFloat(spreadMin)
        filters.push(`${prefix}: ${minVal >= 0 ? '+' + spreadMin + ' or more' : spreadMin + ' or more'}`)
      } else if (spreadMax) {
        const maxVal = parseFloat(spreadMax)
        filters.push(`${prefix}: ${maxVal >= 0 ? '+' + spreadMax + ' or less' : spreadMax + ' or less'}`)
      }
    }
    
    // Total range
    if (totalMin || totalMax) {
      if (totalMin && totalMax) {
        filters.push(`Total: ${totalMin} to ${totalMax}`)
      } else if (totalMin) {
        filters.push(`Total: ${totalMin}+`)
      } else if (totalMax) {
        filters.push(`Total: ≤${totalMax}`)
      }
    }
    
    // Team name and location (for Teams query type)
    if (queryType === 'team' && selectedTeam) {
      let teamDisplay = selectedTeam.name
      if (teamLocation === 'home') {
        teamDisplay = `${selectedTeam.name} at Home`
      } else if (teamLocation === 'away') {
        teamDisplay = `${selectedTeam.name} Away`
      }
      filters.push(teamDisplay)
      
      // Opponent
      if (selectedVersusTeam) {
        filters.push(`vs ${selectedVersusTeam.name}`)
      }
    }
    
    // Momentum filters - simplified streak
    if (streak) {
      const streakNum = parseInt(streak)
      const teamLabel = isOUQuery ? 'Home' : (queryType === 'team' && selectedTeam ? '' : 'Team')
      if (streakNum > 0) {
        filters.push(`${teamLabel}${teamLabel ? ' ' : ''}${streakNum}W Streak`)
      } else if (streakNum < 0) {
        filters.push(`${teamLabel}${teamLabel ? ' ' : ''}${Math.abs(streakNum)}L Streak`)
      }
    }
    
    // Previous game margin - improved display
    if (prevGameMarginMin || prevGameMarginMax) {
      const teamLabel = isOUQuery ? 'Home team' : (queryType === 'team' && selectedTeam ? selectedTeam.name : 'Team')
      const minVal = prevGameMarginMin ? parseInt(prevGameMarginMin) : null
      const maxVal = prevGameMarginMax ? parseInt(prevGameMarginMax) : null
      
      // Determine if we're looking at wins (positive) or losses (negative)
      if (minVal !== null && maxVal !== null) {
        // Both min and max
        if (minVal >= 0 && maxVal >= 0) {
          // Won by range
          filters.push(`${teamLabel} won prev by ${minVal} to ${maxVal}`)
        } else if (minVal < 0 && maxVal < 0) {
          // Lost by range (show as positive numbers)
          filters.push(`${teamLabel} lost prev by ${Math.abs(maxVal)} to ${Math.abs(minVal)}`)
        } else {
          // Mixed range
          filters.push(`${teamLabel} prev margin: ${minVal > 0 ? '+' : ''}${minVal} to ${maxVal > 0 ? '+' : ''}${maxVal}`)
        }
      } else if (minVal !== null) {
        // Min only
        if (minVal >= 0) {
          filters.push(`${teamLabel} won prev by ${minVal}+`)
        } else {
          filters.push(`${teamLabel} lost prev by ≤${Math.abs(minVal)}`)
        }
      } else if (maxVal !== null) {
        // Max only
        if (maxVal >= 0) {
          filters.push(`${teamLabel} won prev by ≤${maxVal}`)
        } else {
          filters.push(`${teamLabel} lost prev by ${Math.abs(maxVal)}+`)
        }
      }
    }
    
    // O/U: Away team momentum
    if (isOUQuery) {
      if (awayStreak) {
        const streakNum = parseInt(awayStreak)
        if (streakNum > 0) {
          filters.push(`Away ${streakNum}W Streak`)
        } else if (streakNum < 0) {
          filters.push(`Away ${Math.abs(streakNum)}L Streak`)
        }
      }
      if (awayPrevGameMarginMin || awayPrevGameMarginMax) {
        const minVal = awayPrevGameMarginMin ? parseInt(awayPrevGameMarginMin) : null
        const maxVal = awayPrevGameMarginMax ? parseInt(awayPrevGameMarginMax) : null
        
        if (minVal !== null && maxVal !== null) {
          if (minVal >= 0 && maxVal >= 0) {
            filters.push(`Away won prev by ${minVal} to ${maxVal}`)
          } else if (minVal < 0 && maxVal < 0) {
            filters.push(`Away lost prev by ${Math.abs(maxVal)} to ${Math.abs(minVal)}`)
          } else {
            filters.push(`Away prev margin: ${minVal > 0 ? '+' : ''}${minVal} to ${maxVal > 0 ? '+' : ''}${maxVal}`)
          }
        } else if (minVal !== null) {
          if (minVal >= 0) {
            filters.push(`Away won prev by ${minVal}+`)
          } else {
            filters.push(`Away lost prev by ≤${Math.abs(minVal)}`)
          }
        } else if (maxVal !== null) {
          if (maxVal >= 0) {
            filters.push(`Away won prev by ≤${maxVal}`)
          } else {
            filters.push(`Away lost prev by ${Math.abs(maxVal)}+`)
          }
        }
      }
    }
    
    // Line movement
    if (spreadMoveMin || spreadMoveMax) {
      if (spreadMoveMin && spreadMoveMax) {
        filters.push(`Spread Move: ${spreadMoveMin} to ${spreadMoveMax}`)
      } else if (spreadMoveMin) {
        filters.push(`Spread Move: ${parseFloat(spreadMoveMin) >= 0 ? '+' + spreadMoveMin : spreadMoveMin}+`)
      } else if (spreadMoveMax) {
        filters.push(`Spread Move: ≤${spreadMoveMax}`)
      }
    }
    if (totalMoveMin || totalMoveMax) {
      if (totalMoveMin && totalMoveMax) {
        filters.push(`Total Move: ${totalMoveMin} to ${totalMoveMax}`)
      } else if (totalMoveMin) {
        filters.push(`Total Move: ${parseFloat(totalMoveMin) >= 0 ? '+' + totalMoveMin : totalMoveMin}+`)
      } else if (totalMoveMax) {
        filters.push(`Total Move: ≤${totalMoveMax}`)
      }
    }
    if (mlMoveMin || mlMoveMax) {
      if (mlMoveMin && mlMoveMax) {
        filters.push(`ML Move: ${mlMoveMin} to ${mlMoveMax}`)
      } else if (mlMoveMin) {
        filters.push(`ML Move: ${parseFloat(mlMoveMin) >= 0 ? '+' + mlMoveMin : mlMoveMin}+`)
      } else if (mlMoveMax) {
        filters.push(`ML Move: ≤${mlMoveMax}`)
      }
    }
    
    // Prop-specific filters
    if (queryType === 'prop') {
      if (selectedPlayer) {
        filters.push(selectedPlayer.name)
      } else if (propPosition && propPosition !== 'any') {
        filters.push(`All ${propPosition}s`)
      }
      
      // Stat type
      const statLabel = availablePropStats.find(s => s.value === propStat)?.label || propStat
      filters.push(statLabel)
      
      // Line mode
      if (propLineMode === 'book') {
        if (bookLineMin && bookLineMax) {
          filters.push(`Book Line: ${bookLineMin} to ${bookLineMax}`)
        } else if (bookLineMin) {
          filters.push(`Book Line: ${bookLineMin}+`)
        } else if (bookLineMax) {
          filters.push(`Book Line: ≤${bookLineMax}`)
        } else {
          filters.push('Book Lines (any)')
        }
      } else if (propLine) {
        filters.push(`Line: ${propLine}+`)
      }
      
      if (selectedPropVersusTeam) {
        filters.push(`vs ${selectedPropVersusTeam.name}`)
      }
      
      // Player Stats filters
      if (minTargets) {
        filters.push(`${minTargets}+ Targets`)
      }
      if (minCarries) {
        filters.push(`${minCarries}+ Carries`)
      }
      if (minPassAttempts) {
        filters.push(`${minPassAttempts}+ Pass Att`)
      }
    }
    
    return filters
  }

  // Calculate streak from games
  const calculateStreak = (games: any[]) => {
    if (!games || games.length === 0) return { current: 0, longest_hit: 0, longest_miss: 0 }
    
    let currentStreak = 0
    let currentType: boolean | null = null
    let longestHit = 0
    let longestMiss = 0
    let tempHitStreak = 0
    let tempMissStreak = 0
    
    // Current streak - count from most recent
    for (let i = 0; i < games.length; i++) {
      if (i === 0) {
        currentType = games[i].hit
        currentStreak = 1
      } else if (games[i].hit === currentType) {
        currentStreak++
      } else {
        break
      }
    }
    
    // Longest streaks
    for (let i = 0; i < games.length; i++) {
      if (games[i].hit) {
        tempHitStreak++
        tempMissStreak = 0
        if (tempHitStreak > longestHit) longestHit = tempHitStreak
      } else {
        tempMissStreak++
        tempHitStreak = 0
        if (tempMissStreak > longestMiss) longestMiss = tempMissStreak
      }
    }
    
    return {
      current: currentType === true ? currentStreak : -currentStreak,
      longest_hit: longestHit,
      longest_miss: longestMiss
    }
  }

  const runQuery = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setVisibleGames(10)

    try {
      const filters: any = {
        time_period: timePeriod,
      }

      // Common filters
      if (division !== 'any') filters.is_division = division
      if (conference !== 'any') filters.is_conference = conference
      if (playoff !== 'any') filters.is_playoff = playoff
      
      // Non-O/U specific filters
      if (!isOUQuery) {
        if (location !== 'any') filters.location = location
        if (favorite !== 'any') filters.is_favorite = favorite
        
        // Subject team's own rankings (Team Defense/Offense)
        if (ownDefenseRank !== 'any') {
          filters.own_defense_rank = ownDefenseRank
          filters.own_defense_stat = ownDefenseStat
        }
        if (ownOffenseRank !== 'any') {
          filters.own_offense_rank = ownOffenseRank
          filters.own_offense_stat = ownOffenseStat
        }
        
        // Opponent rankings (vs Defense/Offense)
        if (defenseRank !== 'any') {
          filters.vs_defense_rank = defenseRank
          filters.defense_stat = defenseStat
          // Position-specific defense stat
          if (defenseStatPosition) {
            filters.defense_stat_position = defenseStatPosition
          }
        }
        if (offenseRank !== 'any') {
          filters.vs_offense_rank = offenseRank
          filters.offense_stat = offenseStat
          // Position-specific offense stat
          if (offenseStatPosition) {
            filters.offense_stat_position = offenseStatPosition
          }
        }
        
        // Subject team's position-specific stats
        if (ownDefenseRank !== 'any' && ownDefenseStatPosition) {
          filters.own_defense_stat_position = ownDefenseStatPosition
        }
        if (ownOffenseRank !== 'any' && ownOffenseStatPosition) {
          filters.own_offense_stat_position = ownOffenseStatPosition
        }
        
        // Win percentage filters
        if (teamWinPctMin || teamWinPctMax) {
          filters.team_win_pct = {
            ...(teamWinPctMin && { min: parseFloat(teamWinPctMin) }),
            ...(teamWinPctMax && { max: parseFloat(teamWinPctMax) })
          }
        }
        if (oppWinPctMin || oppWinPctMax) {
          filters.opp_win_pct = {
            ...(oppWinPctMin && { min: parseFloat(oppWinPctMin) }),
            ...(oppWinPctMax && { max: parseFloat(oppWinPctMax) })
          }
        }
      }
      
      // O/U specific filters
      if (isOUQuery) {
        if (homeFavDog !== 'any') filters.home_fav_dog = homeFavDog
        
        // Four-way team stats
        if (homeTeamDefenseRank !== 'any') {
          filters.home_team_defense_rank = homeTeamDefenseRank
          filters.home_team_defense_stat = homeTeamDefenseStat
        }
        if (homeTeamOffenseRank !== 'any') {
          filters.home_team_offense_rank = homeTeamOffenseRank
          filters.home_team_offense_stat = homeTeamOffenseStat
        }
        if (awayTeamDefenseRank !== 'any') {
          filters.away_team_defense_rank = awayTeamDefenseRank
          filters.away_team_defense_stat = awayTeamDefenseStat
        }
        if (awayTeamOffenseRank !== 'any') {
          filters.away_team_offense_rank = awayTeamOffenseRank
          filters.away_team_offense_stat = awayTeamOffenseStat
        }
        
        // Away team momentum - simplified streak
        if (awayStreak) {
          const streakNum = parseInt(awayStreak)
          if (streakNum > 0) {
            filters.away_winning_streak = streakNum
          } else if (streakNum < 0) {
            filters.away_losing_streak = Math.abs(streakNum)
          }
        }
        if (awayPrevGameMarginMin && awayPrevGameMarginMax) {
          filters.away_prev_game_margin = { 
            min: parseFloat(awayPrevGameMarginMin), 
            max: parseFloat(awayPrevGameMarginMax) 
          }
        }
      }

      // Spread range (for O/U, this is home team's spread)
      if (spreadMin || spreadMax) {
        const range: any = {}
        if (spreadMin) range.min = parseFloat(spreadMin)
        if (spreadMax) range.max = parseFloat(spreadMax)
        filters.spread_range = range
      }
      
      // Total range
      if (totalMin || totalMax) {
        const range: any = {}
        if (totalMin) range.min = parseFloat(totalMin)
        if (totalMax) range.max = parseFloat(totalMax)
        filters.total_range = range
      }
      
      // Momentum filters - simplified streak (positive = wins, negative = losses)
      if (streak) {
        const streakNum = parseInt(streak)
        if (streakNum > 0) {
          filters.winning_streak = streakNum
        } else if (streakNum < 0) {
          filters.losing_streak = Math.abs(streakNum)
        }
      }
      if (prevGameMarginMin && prevGameMarginMax) {
        filters.prev_game_margin = { 
          min: parseFloat(prevGameMarginMin), 
          max: parseFloat(prevGameMarginMax) 
        }
      }
      
      // Line movement ranges (allows min-only, max-only, or both)
      if (spreadMoveMin || spreadMoveMax) {
        const range: any = {}
        if (spreadMoveMin) range.min = parseFloat(spreadMoveMin)
        if (spreadMoveMax) range.max = parseFloat(spreadMoveMax)
        filters.spread_movement_range = range
      }
      if (totalMoveMin || totalMoveMax) {
        const range: any = {}
        if (totalMoveMin) range.min = parseFloat(totalMoveMin)
        if (totalMoveMax) range.max = parseFloat(totalMoveMax)
        filters.total_movement_range = range
      }
      if (mlMoveMin || mlMoveMax) {
        const range: any = {}
        if (mlMoveMin) range.min = parseFloat(mlMoveMin)
        if (mlMoveMax) range.max = parseFloat(mlMoveMax)
        filters.ml_movement_range = range
      }

      let body: any = { type: queryType, filters }

      if (queryType === 'trend') {
        body.bet_type = betType
        // Determine side from mini-filters
        if (betType === 'total') {
          body.side = side
        } else if (favorite !== 'any') {
          body.side = favorite
        } else if (location !== 'any') {
          body.side = location
        } else {
          body.side = 'favorite' // Default
        }
      } else if (queryType === 'team') {
        body.team_id = teamId
        body.bet_type = betType
        body.location = teamLocation // home, away, or any
        if (selectedVersusTeam) {
          body.opponent_id = selectedVersusTeam.id // Head-to-head filter
        }
        if (betType === 'total') {
          body.side = side
        } else {
          // For spread/ML, use teamLocation to determine perspective
          body.side = teamLocation === 'away' ? 'away' : 'home'
        }
      } else if (queryType === 'referee') {
        body.bet_type = betType
        if (betType === 'total') {
          body.side = side
        } else if (location !== 'any') {
          // Use location filter to determine perspective (same as trends)
          body.side = location
        } else {
          body.side = 'home' // Default to home teams
        }
        if (refereeId) body.referee_id = refereeId
      } else if (queryType === 'prop') {
        // If a specific player is selected, use player_id
        // If position is selected without a player, use position
        if (selectedPlayer && selectedPlayer.espn_player_id) {
          body.player_id = selectedPlayer.espn_player_id
        } else if (propPosition && propPosition !== 'any') {
          body.position = propPosition
        } else {
          setError('Please select a player or position')
          setLoading(false)
          return
        }
        body.stat = propStat
        
        // Book Line mode vs Any Line mode vs "And" mode (both)
        if (propLineMode === 'book') {
          // Book line only - filter by book lines, calculate hit against book line
          body.use_book_lines = true
          if (bookLineMin) body.book_line_min = parseFloat(bookLineMin)
          if (bookLineMax) body.book_line_max = parseFloat(bookLineMax)
          body.line = 0 // Line will come from book data
        } else if (propLineMode === 'and') {
          // DUAL MODE - filter by book lines, but calculate hit against custom line
          body.use_book_lines = true
          if (bookLineMin) body.book_line_min = parseFloat(bookLineMin)
          if (bookLineMax) body.book_line_max = parseFloat(bookLineMax)
          body.line = parseFloat(propLine) || 0 // Custom line for hit calculation
        } else {
          // Any line mode - no book line filtering
          body.use_book_lines = false
          body.line = parseFloat(propLine) || 0
        }
        
        // Versus team filter for props - goes into filters
        if (selectedPropVersusTeam) {
          filters.opponent_id = selectedPropVersusTeam.id
        }
        // Include location filter if not 'any'
        if (location !== 'any') {
          filters.location = location
        }
        
        // Player Stats filters (game conditions)
        if (minTargets) {
          filters.min_targets = parseInt(minTargets)
        }
        if (minCarries) {
          filters.min_carries = parseInt(minCarries)
        }
        if (minPassAttempts) {
          filters.min_pass_attempts = parseInt(minPassAttempts)
        }
      }

      const response = await fetch('/api/query-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        // Recalculate streaks client-side for accuracy
        const streaks = calculateStreak(data.games || [])
        setResult({
          ...data,
          current_streak: streaks.current,
          longest_hit_streak: streaks.longest_hit,
          longest_miss_streak: streaks.longest_miss,
        })
      }
    } catch (err: any) {
      setError(err.message || 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  // Fetch upcoming games that match current filters
  const fetchUpcoming = async () => {
    setUpcomingLoading(true)
    setUpcomingResult(null)
    
    try {
      const filters: any = {}
      
      // Build filters matching the historical query
      if (location !== 'any') filters.location = location
      
      // For O/U queries, use homeFavDog; for other bet types, use favorite
      const isOUQuery = betType === 'total'
      if (isOUQuery) {
        // For totals, home_fav means home team is favorite (home_spread < 0)
        if (homeFavDog === 'home_fav') filters.is_home_favorite = true
        if (homeFavDog === 'home_dog') filters.is_home_favorite = false
      } else {
        if (favorite !== 'any') filters.is_favorite = favorite === 'favorite'
      }
      
      if (division === 'division') filters.is_division_game = true
      if (division === 'non_division') filters.is_division_game = false
      if (conference === 'conference') filters.is_conference_game = true
      if (conference === 'non_conference') filters.is_conference_game = false
      
      // Team rankings
      if (ownDefenseRank !== 'any') filters.own_defense_rank = ownDefenseRank
      if (ownOffenseRank !== 'any') filters.own_offense_rank = ownOffenseRank
      if (defenseRank !== 'any') filters.vs_defense_rank = defenseRank
      if (offenseRank !== 'any') filters.vs_offense_rank = offenseRank
      
      // Pass stat types for ranking filters
      if (ownDefenseStat) filters.own_defense_stat = ownDefenseStat
      if (ownOffenseStat) filters.own_offense_stat = ownOffenseStat
      if (defenseStat) filters.defense_stat = defenseStat
      if (offenseStat) filters.offense_stat = offenseStat
      
      // Win percentage filters
      if (teamWinPctMin !== '' || teamWinPctMax !== '') {
        filters.team_win_pct = {
          min: teamWinPctMin ? parseFloat(teamWinPctMin) : undefined,
          max: teamWinPctMax ? parseFloat(teamWinPctMax) : undefined
        }
      }
      if (oppWinPctMin !== '' || oppWinPctMax !== '') {
        filters.opp_win_pct = {
          min: oppWinPctMin ? parseFloat(oppWinPctMin) : undefined,
          max: oppWinPctMax ? parseFloat(oppWinPctMax) : undefined
        }
      }
      
      // Spread/Total ranges
      if (spreadMin || spreadMax) {
        filters.spread_range = {
          min: spreadMin ? parseFloat(spreadMin) : undefined,
          max: spreadMax ? parseFloat(spreadMax) : undefined
        }
      }
      if (totalMin || totalMax) {
        filters.total_range = {
          min: totalMin ? parseFloat(totalMin) : undefined,
          max: totalMax ? parseFloat(totalMax) : undefined
        }
      }
      
      // Line movement
      if (spreadMoveMin || spreadMoveMax) {
        filters.spread_movement_range = {
          min: spreadMoveMin ? parseFloat(spreadMoveMin) : undefined,
          max: spreadMoveMax ? parseFloat(spreadMoveMax) : undefined
        }
      }
      if (totalMoveMin || totalMoveMax) {
        filters.total_movement_range = {
          min: totalMoveMin ? parseFloat(totalMoveMin) : undefined,
          max: totalMoveMax ? parseFloat(totalMoveMax) : undefined
        }
      }
      
      // Momentum
      if (streak) filters.streak = parseInt(streak)
      if (prevGameMarginMin || prevGameMarginMax) {
        filters.prev_margin_range = {
          min: prevGameMarginMin ? parseFloat(prevGameMarginMin) : undefined,
          max: prevGameMarginMax ? parseFloat(prevGameMarginMax) : undefined
        }
      }
      
      // Team specific
      if (queryType === 'team' && teamId) {
        filters.team_id = teamId
      }

      // Use different endpoint for props
      if (queryType === 'prop') {
        const propResponse = await fetch('/api/query-engine/upcoming-props', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position: propPosition !== 'any' ? propPosition : undefined,
            stat: propStat,
            line_min: propLineMode === 'book' && bookLineMin ? parseFloat(bookLineMin) : (parseFloat(propLine) > 0 ? parseFloat(propLine) - 10 : undefined),
            line_max: propLineMode === 'book' && bookLineMax ? parseFloat(bookLineMax) : (parseFloat(propLine) > 0 ? parseFloat(propLine) + 10 : undefined),
            filters
          })
        })
        
        const propData = await propResponse.json()
        
        if (propData.success) {
          setUpcomingResult(propData)
        }
      } else {
        const response = await fetch('/api/query-engine/upcoming', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query_type: queryType,
            bet_type: betType,
            filters
          })
        })

        const data = await response.json()
        
        if (data.success) {
          setUpcomingResult(data)
        }
      }
    } catch (err) {
      console.error('Upcoming fetch error:', err)
    } finally {
      setUpcomingLoading(false)
    }
  }

  // Fetch upcoming when toggle is turned on and we have results
  useEffect(() => {
    if (showUpcoming && result) {
      fetchUpcoming()
    }
  }, [showUpcoming])

  // Format odds for display
  const formatOdds = (odds: number) => {
    if (!odds) return ''
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  // ===== UNIFIED DATE FORMATTERS (EST) =====
  
  // Format historical date: "Dec 8, 2025" (EST)
  // Takes either game_date (YYYY-MM-DD) or game_time (full timestamp)
  const formatHistoricalDate = (dateStr: string, gameTime?: string) => {
    if (!dateStr && !gameTime) return ''
    try {
      let date: Date
      
      // Prefer full timestamp (game_time) if available - it has accurate time for EST conversion
      if (gameTime && (gameTime.includes('T') || gameTime.includes(' '))) {
        const normalized = gameTime.includes(' ') ? gameTime.replace(' ', 'T') : gameTime
        date = new Date(normalized + (normalized.includes('Z') ? '' : 'Z'))
      }
      // If only date string (YYYY-MM-DD), use midnight UTC
      // This converts to 7pm EST previous day, ensuring night games show correct EST date
      // Example: Dec 9 UTC (for Dec 8 8:15pm EST game) → Dec 9 00:00 UTC = Dec 8 7pm EST = Dec 8
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        date = new Date(`${dateStr}T00:00:00Z`)
      } else if (dateStr.includes(' ') && !dateStr.includes('T')) {
        date = new Date(dateStr.replace(' ', 'T') + 'Z')
      } else if (dateStr.includes('T')) {
        date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'))
      } else {
        date = new Date(dateStr)
      }
      
      if (isNaN(date.getTime())) {
        return dateStr
      }
      
      return date.toLocaleDateString('en-US', { 
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  // Format upcoming date: "Dec 8, 8:15pm" (EST)
  const formatUpcomingDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'))
      
      if (isNaN(date.getTime())) {
        return dateStr
      }
      
      const monthDay = date.toLocaleDateString('en-US', { 
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric'
      })
      
      const time = date.toLocaleTimeString('en-US', { 
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase()
      
      return `${monthDay}, ${time}`
    } catch {
      return dateStr
    }
  }

  // Book priority cascade for best odds
  const BOOK_PRIORITY = [
    'fanduel', 'draftkings', 'betmgm', 'williamhill_us', 'betrivers',
    'fanatics', 'bovada', 'pointsbetus', 'barstool', 'betonlineag', 'unibet_us'
  ]

  // Get best book from list using priority cascade
  const getBestBook = (books: any[]) => {
    if (!books || books.length === 0) return null
    
    // Sort by priority
    const sorted = [...books].sort((a, b) => {
      const aIdx = BOOK_PRIORITY.indexOf(a.bookmaker?.toLowerCase() || '')
      const bIdx = BOOK_PRIORITY.indexOf(b.bookmaker?.toLowerCase() || '')
      // If not in priority list, put at end
      const aPriority = aIdx === -1 ? 999 : aIdx
      const bPriority = bIdx === -1 ? 999 : bIdx
      return aPriority - bPriority
    })
    
    return sorted[0]
  }

  // Get the bet display for upcoming game based on query type and filters
  const getUpcomingBetDisplay = (game: UpcomingGame) => {
    const bestBook = getBestBook(game.books)
    if (!bestBook) return null

    // Determine subject team based on location filter
    const isHomeSubject = location !== 'away'
    const subjectTeam = isHomeSubject ? game.home_team : game.away_team
    const subjectLogo = teamLogos[subjectTeam.id]
    
    if (betType === 'spread') {
      const spread = isHomeSubject ? bestBook.spread.home : bestBook.spread.away
      const odds = isHomeSubject ? bestBook.spread.home_odds : bestBook.spread.away_odds
      return {
        teamName: subjectTeam.name,
        teamAbbr: subjectTeam.abbr,
        teamLogo: subjectLogo,
        line: `${spread > 0 ? '+' : ''}${spread}`,
        odds: formatOdds(odds),
        bookName: bestBook.bookmaker_title
      }
    } else if (betType === 'total') {
      // For totals, show both teams with O/U
      const selectedSide = side || 'over' // Default to over if not specified
      return {
        teamName: `${game.away_team.abbr} @ ${game.home_team.abbr}`,
        teamAbbr: '',
        teamLogo: null,
        awayLogo: teamLogos[game.away_team.id],
        homeLogo: teamLogos[game.home_team.id],
        isTotal: true,
        line: selectedSide === 'over' ? `O ${bestBook.total.line}` : `U ${bestBook.total.line}`,
        odds: formatOdds(selectedSide === 'over' ? bestBook.total.over_odds : bestBook.total.under_odds),
        bookName: bestBook.bookmaker_title
      }
    } else { // moneyline
      const ml = isHomeSubject ? bestBook.moneyline.home : bestBook.moneyline.away
      return {
        teamName: subjectTeam.name,
        teamAbbr: subjectTeam.abbr,
        teamLogo: subjectLogo,
        line: formatOdds(ml),
        odds: '',
        bookName: bestBook.bookmaker_title
      }
    }
  }

  // Get "why this matches" items for upcoming game
  const getMatchReasons = (game: UpcomingGame) => {
    const reasons: { label: string; value: string; match: boolean }[] = []
    const bestBook = getBestBook(game.books)
    if (!bestBook) return reasons

    const isHomeSubject = location !== 'away'
    const subjectTeam = isHomeSubject ? game.home_team : game.away_team
    const opponentTeam = isHomeSubject ? game.away_team : game.home_team
    const subjectSpread = isHomeSubject ? bestBook.spread.home : bestBook.spread.away

    // Bet type
    if (betType) {
      const betLabel = betType === 'spread' ? 'Spread' : betType === 'total' ? (side === 'over' ? 'Over' : 'Under') : 'Moneyline'
      reasons.push({ label: 'Bet Type', value: betLabel, match: true })
    }

    // Location - show as stadium context
    if (location === 'home') {
      reasons.push({ label: 'Location', value: `${game.home_team.abbr} at Home`, match: true })
    } else if (location === 'away') {
      reasons.push({ label: 'Location', value: `${game.away_team.abbr} on Road`, match: true })
    }

    // Division/Conference - show actual divisions
    if (division === 'division' && game.is_division_game) {
      const homeDivision = game.home_team.division || ''
      reasons.push({ 
        label: 'Division', 
        value: homeDivision ? `${homeDivision.split(' ')[0]} ${homeDivision.split(' ')[1]}` : 'Division Game',
        match: true 
      })
    } else if (division === 'non_division' && !game.is_division_game) {
      reasons.push({ label: 'Division', value: 'Non-Division', match: true })
    }
    
    if (conference === 'conference' && game.is_conference_game) {
      const homeConf = game.home_team.conference || ''
      reasons.push({ 
        label: 'Conference', 
        value: homeConf ? `${homeConf} vs ${homeConf}` : 'Conference Game',
        match: true 
      })
    } else if (conference === 'non_conference' && !game.is_conference_game) {
      const homeConf = game.home_team.conference || 'NFC'
      const awayConf = game.away_team.conference || 'AFC'
      reasons.push({ 
        label: 'Conference', 
        value: `${awayConf} vs ${homeConf}`,
        match: true 
      })
    }

    // Favorite/Underdog
    if (favorite === 'favorite') {
      reasons.push({ label: 'Favorite', value: `${subjectSpread > 0 ? '+' : ''}${subjectSpread}`, match: subjectSpread < 0 })
    } else if (favorite === 'underdog') {
      reasons.push({ label: 'Underdog', value: `${subjectSpread > 0 ? '+' : ''}${subjectSpread}`, match: subjectSpread > 0 })
    }

    // Home fav/dog for O/U
    if (homeFavDog === 'favorite') {
      reasons.push({ 
        label: 'Home Fav', 
        value: `${bestBook.spread.home > 0 ? '+' : ''}${bestBook.spread.home}`, 
        match: bestBook.spread.home < 0 
      })
    } else if (homeFavDog === 'underdog') {
      reasons.push({ 
        label: 'Home Dog', 
        value: `${bestBook.spread.home > 0 ? '+' : ''}${bestBook.spread.home}`, 
        match: bestBook.spread.home > 0 
      })
    }

    // Spread range
    if (spreadMin || spreadMax) {
      reasons.push({ 
        label: 'Spread', 
        value: `${subjectSpread > 0 ? '+' : ''}${subjectSpread}`,
        match: true 
      })
    }

    // Total range
    if (totalMin || totalMax) {
      reasons.push({ 
        label: 'Total', 
        value: `O/U ${bestBook.total.line}`,
        match: true 
      })
    }

    // Team rankings
    if (defenseRank !== 'any') {
      const defLabel = defenseRank.includes('top') ? `Top ${defenseRank.split('_')[1]}` : `Bottom ${defenseRank.split('_')[1]}`
      reasons.push({ 
        label: 'vs Defense', 
        value: `${opponentTeam.abbr} #${opponentTeam.defense_rank} (${defLabel})`,
        match: true 
      })
    }
    if (offenseRank !== 'any') {
      const offLabel = offenseRank.includes('top') ? `Top ${offenseRank.split('_')[1]}` : `Bottom ${offenseRank.split('_')[1]}`
      reasons.push({ 
        label: 'vs Offense', 
        value: `${opponentTeam.abbr} #${opponentTeam.offense_rank} (${offLabel})`,
        match: true 
      })
    }
    if (ownDefenseRank !== 'any') {
      const ownDefLabel = ownDefenseRank.includes('top') ? `Top ${ownDefenseRank.split('_')[1]}` : `Bottom ${ownDefenseRank.split('_')[1]}`
      reasons.push({ 
        label: 'Team Defense', 
        value: `${subjectTeam.abbr} #${subjectTeam.defense_rank} (${ownDefLabel})`,
        match: true 
      })
    }
    if (ownOffenseRank !== 'any') {
      const ownOffLabel = ownOffenseRank.includes('top') ? `Top ${ownOffenseRank.split('_')[1]}` : `Bottom ${ownOffenseRank.split('_')[1]}`
      reasons.push({ 
        label: 'Team Offense', 
        value: `${subjectTeam.abbr} #${subjectTeam.offense_rank} (${ownOffLabel})`,
        match: true 
      })
    }

    // Streaks
    if (streak) {
      const teamStreak = isHomeSubject ? game.home_team.streak : game.away_team.streak
      reasons.push({ 
        label: 'Streak', 
        value: teamStreak > 0 ? `${teamStreak}W streak` : `${Math.abs(teamStreak)}L streak`,
        match: true 
      })
    }

    // Previous margin
    if (prevGameMarginMin || prevGameMarginMax) {
      const teamPrevMargin = isHomeSubject ? game.home_team.prev_margin : game.away_team.prev_margin
      reasons.push({ 
        label: 'Prev Game', 
        value: teamPrevMargin > 0 ? `Won by ${teamPrevMargin}` : `Lost by ${Math.abs(teamPrevMargin)}`,
        match: true 
      })
    }

    return reasons
  }
  
  // Get "why this fits" items for historical game
  const getHistoricalMatchReasons = (game: any) => {
    const reasons: { label: string; value: string }[] = []
    const homeAbbr = game.home_abbr || 'HOME'
    const awayAbbr = game.away_abbr || 'AWAY'
    const homeSpread = game.spread_close ?? 0
    const awaySpread = -homeSpread // Away team's spread is inverse of home
    const gameTotal = game.total_close ?? game.total ?? 0
    
    // Determine subject team based on side selection
    // For home: subject = home team
    // For away: subject = away team  
    // For favorite: subject = whichever team is favorite
    // For underdog: subject = whichever team is underdog
    const homeIsFav = homeSpread < 0
    let subjectAbbr: string
    let subjectSpread: number
    
    if (location === 'home' || side === 'home') {
      subjectAbbr = homeAbbr
      subjectSpread = homeSpread
    } else if (location === 'away' || side === 'away') {
      subjectAbbr = awayAbbr
      subjectSpread = awaySpread
    } else if (side === 'favorite' || favorite === 'favorite') {
      subjectAbbr = homeIsFav ? homeAbbr : awayAbbr
      subjectSpread = homeIsFav ? homeSpread : awaySpread
    } else if (side === 'underdog' || favorite === 'underdog') {
      subjectAbbr = homeIsFav ? awayAbbr : homeAbbr
      subjectSpread = homeIsFav ? awaySpread : homeSpread
    } else {
      // Default to home perspective
      subjectAbbr = homeAbbr
      subjectSpread = homeSpread
    }
    
    // Bet type
    if (betType) {
      const betLabel = betType === 'spread' ? 'Spread' : betType === 'total' ? (side === 'over' ? 'Over' : 'Under') : 'Moneyline'
      reasons.push({ label: 'Bet Type', value: betLabel })
    }

    // Location/Venue - show stadium name if available
    if (location === 'home' || location === 'away') {
      if (game.venue) {
        reasons.push({ label: 'Location', value: `@ ${game.venue}` })
      } else {
        reasons.push({ 
          label: 'Location', 
          value: location === 'home' ? `${homeAbbr} at Home` : `${awayAbbr} on Road`
        })
      }
    }

    // Division filter - show actual division names
    if (division === 'division') {
      if (game.home_division) {
        reasons.push({ label: 'Division', value: game.home_division })
      } else {
        reasons.push({ label: 'Division', value: 'Division Game' })
      }
    } else if (division === 'non_division') {
      if (game.home_division && game.away_division) {
        reasons.push({ label: 'Non-Division', value: `${game.away_division} vs ${game.home_division}` })
      } else {
        reasons.push({ label: 'Non-Division', value: 'Non-Division Game' })
      }
    }
    
    // Conference filter - show actual conference names
    if (conference === 'conference') {
      if (game.home_conference) {
        reasons.push({ label: 'Conference', value: `${game.home_conference} vs ${game.home_conference}` })
      } else {
        reasons.push({ label: 'Conference', value: 'Conference Game' })
      }
    } else if (conference === 'non_conference') {
      if (game.home_conference && game.away_conference) {
        reasons.push({ label: 'Non-Conf', value: `${game.away_conference} vs ${game.home_conference}` })
      } else {
        reasons.push({ label: 'Non-Conf', value: 'Non-Conference Game' })
      }
    }

    // Favorite/Underdog - for non-O/U (show the subject team, not always home)
    if (!isOUQuery && favorite !== 'any') {
      const favAbbr = homeIsFav ? homeAbbr : awayAbbr
      const favSpread = homeIsFav ? homeSpread : awaySpread
      const dogAbbr = homeIsFav ? awayAbbr : homeAbbr  
      const dogSpread = homeIsFav ? awaySpread : homeSpread
      reasons.push({ 
        label: favorite === 'favorite' ? 'Favorite' : 'Underdog', 
        value: favorite === 'favorite' 
          ? `${favAbbr} ${favSpread > 0 ? '+' : ''}${favSpread}`
          : `${dogAbbr} ${dogSpread > 0 ? '+' : ''}${dogSpread}`
      })
    }

    // Home Favorite/Underdog - for O/U queries
    if (isOUQuery && homeFavDog !== 'any') {
      reasons.push({ 
        label: homeFavDog === 'home_fav' ? 'Home Fav' : 'Home Dog', 
        value: `${homeAbbr} ${homeSpread > 0 ? '+' : ''}${homeSpread}`
      })
    }

    // Spread range - for non-O/U (show subject team's spread)
    if (!isOUQuery && (spreadMin || spreadMax)) {
      reasons.push({ 
        label: 'Spread', 
        value: `${subjectAbbr} ${subjectSpread > 0 ? '+' : ''}${subjectSpread}`
      })
    }

    // Total range
    if (totalMin || totalMax) {
      reasons.push({ label: 'Total', value: `O/U ${gameTotal}` })
    }

    // Spread/Line info for spreads (only if no spread range filter) - show subject team
    if (betType === 'spread' && !spreadMin && !spreadMax && favorite === 'any') {
      reasons.push({ 
        label: 'Line', 
        value: `${subjectAbbr} ${subjectSpread > 0 ? '+' : ''}${subjectSpread}`
      })
    }

    // Referee - always show if referee query type
    if (queryType === 'referee' && game.referee_name) {
      reasons.push({ label: 'Referee', value: game.referee_name })
    }

    // Defense rank filter - show actual rank from game data
    if (defenseRank !== 'any') {
      // Determine opponent team (opposite of subject)
      const isSubjectHome = location !== 'away'
      const oppDefRank = isSubjectHome
        ? (defenseStat === 'pass' ? game.away_def_rank_pass : defenseStat === 'rush' ? game.away_def_rank_rush : game.away_def_rank_points)
        : (defenseStat === 'pass' ? game.home_def_rank_pass : defenseStat === 'rush' ? game.home_def_rank_rush : game.home_def_rank_points)
      const statLabel = defenseStat === 'pass' ? 'Pass D' : defenseStat === 'rush' ? 'Rush D' : 'Pts D'
      const oppAbbr = isSubjectHome ? (game.away_abbr || 'OPP') : (game.home_abbr || 'OPP')
      if (oppDefRank) {
        reasons.push({ label: 'vs Defense', value: `${oppAbbr} #${oppDefRank} ${statLabel}` })
      } else {
        reasons.push({ label: 'vs Defense', value: `${defenseRank.replace('_', ' ')} (${statLabel})` })
      }
    }

    // Offense rank filter - show actual rank from game data
    if (offenseRank !== 'any') {
      const isSubjectHome = location !== 'away'
      const oppOffRank = isSubjectHome
        ? (offenseStat === 'pass' || offenseStat === 'passing' ? game.away_off_rank_pass : offenseStat === 'rush' || offenseStat === 'rushing' ? game.away_off_rank_rush : game.away_off_rank_points)
        : (offenseStat === 'pass' || offenseStat === 'passing' ? game.home_off_rank_pass : offenseStat === 'rush' || offenseStat === 'rushing' ? game.home_off_rank_rush : game.home_off_rank_points)
      const statLabel = offenseStat === 'pass' || offenseStat === 'passing' ? 'Pass O' : offenseStat === 'rush' || offenseStat === 'rushing' ? 'Rush O' : 'Pts O'
      const oppAbbr = isSubjectHome ? (game.away_abbr || 'OPP') : (game.home_abbr || 'OPP')
      if (oppOffRank) {
        reasons.push({ label: 'vs Offense', value: `${oppAbbr} #${oppOffRank} ${statLabel}` })
      } else {
        reasons.push({ label: 'vs Offense', value: `${offenseRank.replace('_', ' ')} (${statLabel})` })
      }
    }

    // Own defense rank - show actual rank from game data
    if (ownDefenseRank !== 'any') {
      const isSubjectHome = location !== 'away'
      const ownDefRank = isSubjectHome
        ? (ownDefenseStat === 'pass' ? game.home_def_rank_pass : ownDefenseStat === 'rush' ? game.home_def_rank_rush : game.home_def_rank_points)
        : (ownDefenseStat === 'pass' ? game.away_def_rank_pass : ownDefenseStat === 'rush' ? game.away_def_rank_rush : game.away_def_rank_points)
      const statLabel = ownDefenseStat === 'pass' ? 'Pass D' : ownDefenseStat === 'rush' ? 'Rush D' : 'Pts D'
      const teamAbbr = isSubjectHome ? (game.home_abbr || 'TEAM') : (game.away_abbr || 'TEAM')
      if (ownDefRank) {
        reasons.push({ label: 'Team Defense', value: `${teamAbbr} #${ownDefRank} ${statLabel}` })
      } else {
        reasons.push({ label: 'Team Defense', value: `${ownDefenseRank.replace('_', ' ')}` })
      }
    }

    // Own offense rank - show actual rank from game data
    if (ownOffenseRank !== 'any') {
      const isSubjectHome = location !== 'away'
      const ownOffRank = isSubjectHome
        ? (ownOffenseStat === 'pass' || ownOffenseStat === 'passing' ? game.home_off_rank_pass : ownOffenseStat === 'rush' || ownOffenseStat === 'rushing' ? game.home_off_rank_rush : game.home_off_rank_points)
        : (ownOffenseStat === 'pass' || ownOffenseStat === 'passing' ? game.away_off_rank_pass : ownOffenseStat === 'rush' || ownOffenseStat === 'rushing' ? game.away_off_rank_rush : game.away_off_rank_points)
      const statLabel = ownOffenseStat === 'pass' || ownOffenseStat === 'passing' ? 'Pass O' : ownOffenseStat === 'rush' || ownOffenseStat === 'rushing' ? 'Rush O' : 'Pts O'
      const teamAbbr = isSubjectHome ? (game.home_abbr || 'TEAM') : (game.away_abbr || 'TEAM')
      if (ownOffRank) {
        reasons.push({ label: 'Team Offense', value: `${teamAbbr} #${ownOffRank} ${statLabel}` })
      } else {
        reasons.push({ label: 'Team Offense', value: `${ownOffenseRank.replace('_', ' ')}` })
      }
    }

    // Win percentage filters - display actual values from game data
    if (teamWinPctMin !== '' || teamWinPctMax !== '') {
      const isSubjectHome = location !== 'away'
      const teamWinPct = isSubjectHome ? game.home_win_pct : game.away_win_pct
      if (teamWinPct !== undefined && teamWinPct !== null) {
        reasons.push({ label: 'Team Win%', value: `${(teamWinPct * 100).toFixed(0)}%` })
      } else {
        const pctDisplay = teamWinPctMin && teamWinPctMax 
          ? `${teamWinPctMin}-${teamWinPctMax}%`
          : teamWinPctMin ? `${teamWinPctMin}%+` : `≤${teamWinPctMax}%`
        reasons.push({ label: 'Team Win%', value: pctDisplay })
      }
    }
    if (oppWinPctMin !== '' || oppWinPctMax !== '') {
      const isSubjectHome = location !== 'away'
      const oppWinPct = isSubjectHome ? game.away_win_pct : game.home_win_pct
      if (oppWinPct !== undefined && oppWinPct !== null) {
        reasons.push({ label: 'Opp Win%', value: `${(oppWinPct * 100).toFixed(0)}%` })
      } else {
        const pctDisplay = oppWinPctMin && oppWinPctMax 
          ? `${oppWinPctMin}-${oppWinPctMax}%`
          : oppWinPctMin ? `${oppWinPctMin}%+` : `≤${oppWinPctMax}%`
        reasons.push({ label: 'Opp Win%', value: pctDisplay })
      }
    }

    // Position-specific Defense ranking (vs WRs, vs TEs, vs RBs)
    if (defenseStatPosition && defenseStatPosition !== '') {
      const isSubjectHome = location !== 'away'
      const oppAbbr = isSubjectHome ? (game.away_abbr || 'OPP') : (game.home_abbr || 'OPP')
      const actualRank = defenseStatPosition === 'vs_wr' || defenseStatPosition === 'wr' 
        ? (isSubjectHome ? game.away_def_rank_vs_wr : game.home_def_rank_vs_wr)
        : defenseStatPosition === 'vs_te' || defenseStatPosition === 'te' 
        ? (isSubjectHome ? game.away_def_rank_vs_te : game.home_def_rank_vs_te)
        : defenseStatPosition === 'vs_rb' || defenseStatPosition === 'rb' 
        ? (isSubjectHome ? game.away_def_rank_vs_rb : game.home_def_rank_vs_rb)
        : null
      const statLabel = defenseStatPosition === 'vs_wr' || defenseStatPosition === 'wr' ? 'D vs WRs'
        : defenseStatPosition === 'vs_te' || defenseStatPosition === 'te' ? 'D vs TEs'
        : defenseStatPosition === 'vs_rb' || defenseStatPosition === 'rb' ? 'D vs RBs'
        : ''
      if (actualRank && statLabel) {
        reasons.push({ label: 'vs Defense', value: `${oppAbbr} #${actualRank} ${statLabel}` })
      }
    }

    // Position-specific Offense ranking (WR/TE/RB production)
    if (offenseStatPosition && offenseStatPosition !== '') {
      const isSubjectHome = location !== 'away'
      const oppAbbr = isSubjectHome ? (game.away_abbr || 'OPP') : (game.home_abbr || 'OPP')
      const actualRank = offenseStatPosition === 'wr_prod' || offenseStatPosition === 'wr' 
        ? (isSubjectHome ? game.away_off_rank_wr_prod : game.home_off_rank_wr_prod)
        : offenseStatPosition === 'te_prod' || offenseStatPosition === 'te' 
        ? (isSubjectHome ? game.away_off_rank_te_prod : game.home_off_rank_te_prod)
        : offenseStatPosition === 'rb_prod' || offenseStatPosition === 'rb' 
        ? (isSubjectHome ? game.away_off_rank_rb_prod : game.home_off_rank_rb_prod)
        : null
      const statLabel = offenseStatPosition === 'wr_prod' || offenseStatPosition === 'wr' ? 'WR Prod'
        : offenseStatPosition === 'te_prod' || offenseStatPosition === 'te' ? 'TE Prod'
        : offenseStatPosition === 'rb_prod' || offenseStatPosition === 'rb' ? 'RB Prod'
        : ''
      if (actualRank && statLabel) {
        reasons.push({ label: 'vs Offense', value: `${oppAbbr} #${actualRank} ${statLabel}` })
      }
    }

    // Own position-specific Defense ranking (Team defense vs WR/TE/RB)
    if (ownDefenseStatPosition && ownDefenseStatPosition !== '') {
      const isSubjectHome = location !== 'away'
      const teamAbbr = isSubjectHome ? (game.home_abbr || 'TEAM') : (game.away_abbr || 'TEAM')
      const actualRank = ownDefenseStatPosition === 'vs_wr' || ownDefenseStatPosition === 'wr' 
        ? (isSubjectHome ? game.home_def_rank_vs_wr : game.away_def_rank_vs_wr)
        : ownDefenseStatPosition === 'vs_te' || ownDefenseStatPosition === 'te' 
        ? (isSubjectHome ? game.home_def_rank_vs_te : game.away_def_rank_vs_te)
        : ownDefenseStatPosition === 'vs_rb' || ownDefenseStatPosition === 'rb' 
        ? (isSubjectHome ? game.home_def_rank_vs_rb : game.away_def_rank_vs_rb)
        : null
      const statLabel = ownDefenseStatPosition === 'vs_wr' || ownDefenseStatPosition === 'wr' ? 'D vs WRs'
        : ownDefenseStatPosition === 'vs_te' || ownDefenseStatPosition === 'te' ? 'D vs TEs'
        : ownDefenseStatPosition === 'vs_rb' || ownDefenseStatPosition === 'rb' ? 'D vs RBs'
        : ''
      if (actualRank && statLabel) {
        reasons.push({ label: 'Team Defense', value: `${teamAbbr} #${actualRank} ${statLabel}` })
      }
    }

    // Own position-specific Offense ranking (Team WR/TE/RB production)
    if (ownOffenseStatPosition && ownOffenseStatPosition !== '') {
      const isSubjectHome = location !== 'away'
      const teamAbbr = isSubjectHome ? (game.home_abbr || 'TEAM') : (game.away_abbr || 'TEAM')
      const actualRank = ownOffenseStatPosition === 'wr_prod' || ownOffenseStatPosition === 'wr' 
        ? (isSubjectHome ? game.home_off_rank_wr_prod : game.away_off_rank_wr_prod)
        : ownOffenseStatPosition === 'te_prod' || ownOffenseStatPosition === 'te' 
        ? (isSubjectHome ? game.home_off_rank_te_prod : game.away_off_rank_te_prod)
        : ownOffenseStatPosition === 'rb_prod' || ownOffenseStatPosition === 'rb' 
        ? (isSubjectHome ? game.home_off_rank_rb_prod : game.away_off_rank_rb_prod)
        : null
      const statLabel = ownOffenseStatPosition === 'wr_prod' || ownOffenseStatPosition === 'wr' ? 'WR Prod'
        : ownOffenseStatPosition === 'te_prod' || ownOffenseStatPosition === 'te' ? 'TE Prod'
        : ownOffenseStatPosition === 'rb_prod' || ownOffenseStatPosition === 'rb' ? 'RB Prod'
        : ''
      if (actualRank && statLabel) {
        reasons.push({ label: 'Team Offense', value: `${teamAbbr} #${actualRank} ${statLabel}` })
      }
    }

    // For O/U queries - home/away team stats with actual ranks
    if (isOUQuery) {
      if (homeTeamDefenseRank !== 'any') {
        const homeDefRank = homeTeamDefenseStat === 'pass' ? game.home_def_rank_pass : homeTeamDefenseStat === 'rush' ? game.home_def_rank_rush : game.home_def_rank_points
        const statLabel = homeTeamDefenseStat === 'pass' ? 'Pass D' : homeTeamDefenseStat === 'rush' ? 'Rush D' : 'Pts D'
        if (homeDefRank) {
          reasons.push({ label: 'Home Def', value: `${game.home_abbr || 'HOME'} #${homeDefRank} ${statLabel}` })
        } else {
          reasons.push({ label: 'Home Def', value: homeTeamDefenseRank.replace('_', ' ') })
        }
      }
      if (homeTeamOffenseRank !== 'any') {
        const homeOffRank = homeTeamOffenseStat === 'pass' || homeTeamOffenseStat === 'passing' ? game.home_off_rank_pass : homeTeamOffenseStat === 'rush' || homeTeamOffenseStat === 'rushing' ? game.home_off_rank_rush : game.home_off_rank_points
        const statLabel = homeTeamOffenseStat === 'pass' || homeTeamOffenseStat === 'passing' ? 'Pass O' : homeTeamOffenseStat === 'rush' || homeTeamOffenseStat === 'rushing' ? 'Rush O' : 'Pts O'
        if (homeOffRank) {
          reasons.push({ label: 'Home Off', value: `${game.home_abbr || 'HOME'} #${homeOffRank} ${statLabel}` })
        } else {
          reasons.push({ label: 'Home Off', value: homeTeamOffenseRank.replace('_', ' ') })
        }
      }
      if (awayTeamDefenseRank !== 'any') {
        const awayDefRank = awayTeamDefenseStat === 'pass' ? game.away_def_rank_pass : awayTeamDefenseStat === 'rush' ? game.away_def_rank_rush : game.away_def_rank_points
        const statLabel = awayTeamDefenseStat === 'pass' ? 'Pass D' : awayTeamDefenseStat === 'rush' ? 'Rush D' : 'Pts D'
        if (awayDefRank) {
          reasons.push({ label: 'Away Def', value: `${game.away_abbr || 'AWAY'} #${awayDefRank} ${statLabel}` })
        } else {
          reasons.push({ label: 'Away Def', value: awayTeamDefenseRank.replace('_', ' ') })
        }
      }
      if (awayTeamOffenseRank !== 'any') {
        const awayOffRank = awayTeamOffenseStat === 'pass' || awayTeamOffenseStat === 'passing' ? game.away_off_rank_pass : awayTeamOffenseStat === 'rush' || awayTeamOffenseStat === 'rushing' ? game.away_off_rank_rush : game.away_off_rank_points
        const statLabel = awayTeamOffenseStat === 'pass' || awayTeamOffenseStat === 'passing' ? 'Pass O' : awayTeamOffenseStat === 'rush' || awayTeamOffenseStat === 'rushing' ? 'Rush O' : 'Pts O'
        if (awayOffRank) {
          reasons.push({ label: 'Away Off', value: `${game.away_abbr || 'AWAY'} #${awayOffRank} ${statLabel}` })
        } else {
          reasons.push({ label: 'Away Off', value: awayTeamOffenseRank.replace('_', ' ') })
        }
      }
    }

    // Streaks
    if (streak && (game.home_streak !== undefined || game.away_streak !== undefined)) {
      const isHomeSubject = location !== 'away'
      const teamStreak = isHomeSubject ? game.home_streak : game.away_streak
      if (teamStreak !== undefined && teamStreak !== 0) {
        reasons.push({ 
          label: 'Streak', 
          value: teamStreak > 0 ? `${teamStreak}W streak` : `${Math.abs(teamStreak)}L streak`
        })
      }
    }

    // Previous margin
    if ((prevGameMarginMin || prevGameMarginMax) && (game.home_prev_margin !== undefined || game.away_prev_margin !== undefined)) {
      const isHomeSubject = location !== 'away'
      const prevMargin = isHomeSubject ? game.home_prev_margin : game.away_prev_margin
      if (prevMargin !== undefined) {
        reasons.push({ 
          label: 'Prev Game', 
          value: prevMargin > 0 ? `Won by ${prevMargin}` : `Lost by ${Math.abs(prevMargin)}`
        })
      }
    }

    return reasons
  }
  
  // Get "why this fits" items for prop game
  const getPropMatchReasons = (game: any) => {
    const reasons: { label: string; value: string }[] = []
    
    // Prop Position - show if filtering by position (not specific player)
    if (propPosition && propPosition !== 'any' && !selectedPlayer) {
      reasons.push({ label: 'Position', value: propPosition.toUpperCase() })
    }
    
    // Prop Stat Type
    if (propStat) {
      const statLabel = availablePropStats.find(s => s.value === propStat)?.label || propStat
      reasons.push({ label: 'Stat', value: statLabel })
    }
    
    // Location - ONLY show if user specifically selected home or away
    if (location && location !== 'any') {
      if (game.venue) {
        reasons.push({ label: 'Location', value: `@ ${game.venue}` })
      } else {
        reasons.push({ 
          label: 'Location', 
          value: location === 'home' ? `${game.player_name?.split(' ')[1] || 'Player'} at Home` : `${game.player_name?.split(' ')[1] || 'Player'} on Road`
        })
      }
    }

    // Division - show actual divisions if filter applied
    if (division === 'division' && game.is_division_game) {
      const homeDiv = game.home_division || ''
      const awayDiv = game.away_division || ''
      if (homeDiv && awayDiv) {
        reasons.push({ label: 'Division', value: `${awayDiv} vs ${homeDiv}` })
      } else {
        reasons.push({ label: 'Division', value: 'Division Game' })
      }
    } else if (division === 'non_division' && !game.is_division_game) {
      const homeDiv = game.home_division || ''
      const awayDiv = game.away_division || ''
      if (homeDiv && awayDiv) {
        reasons.push({ label: 'Non-Division', value: `${awayDiv} vs ${homeDiv}` })
      } else {
        reasons.push({ label: 'Non-Division', value: 'Non-Division Game' })
      }
    }
    
    // Conference - show actual conferences if filter applied
    if (conference === 'conference' && game.is_conference_game) {
      const homeConf = game.home_conference || ''
      const awayConf = game.away_conference || ''
      if (homeConf && awayConf) {
        reasons.push({ label: 'Conference', value: `${awayConf} vs ${homeConf}` })
      } else {
        reasons.push({ label: 'Conference', value: 'Conference Game' })
      }
    } else if (conference === 'non_conference' && !game.is_conference_game) {
      const homeConf = game.home_conference || ''
      const awayConf = game.away_conference || ''
      if (homeConf && awayConf) {
        reasons.push({ label: 'Non-Conference', value: `${awayConf} vs ${homeConf}` })
      } else {
        reasons.push({ label: 'Non-Conference', value: 'Non-Conference Game' })
      }
    }

    // Versus opponent
    if (selectedPropVersusTeam) {
      const opponentName = NFL_TEAMS.find(t => t.id === game.opponent_id)?.abbr || 'OPP'
      reasons.push({ label: 'vs Team', value: opponentName })
    }

    // Defense rank - show actual rank number (including position-specific)
    if (defenseRank && defenseRank !== 'any') {
      const opponentAbbr = NFL_TEAMS.find(t => t.id === game.opponent_id)?.abbr || 'OPP'
      
      // Check for position-specific defense first (can come from defenseStat or defenseStatPosition)
      const posDefStat = defenseStatPosition || defenseStat
      let actualRank: number | null = null
      let statLabel = ''
      
      if (posDefStat === 'wr' || posDefStat === 'vs_wr') {
        actualRank = game.opp_def_rank_vs_wr
        statLabel = 'D vs WRs'
      } else if (posDefStat === 'te' || posDefStat === 'vs_te') {
        actualRank = game.opp_def_rank_vs_te
        statLabel = 'D vs TEs'
      } else if (posDefStat === 'rb' || posDefStat === 'vs_rb') {
        actualRank = game.opp_def_rank_vs_rb
        statLabel = 'D vs RBs'
      } else if (posDefStat === 'pass') {
        actualRank = game.opp_def_rank_pass_yards || game.opp_def_rank_pass
        statLabel = 'Pass D'
      } else if (posDefStat === 'rush') {
        actualRank = game.opp_def_rank_rush_yards || game.opp_def_rank_rush
        statLabel = 'Rush D'
      } else {
        actualRank = game.opp_def_rank_receiving_yards || game.opp_def_rank_receiving
        statLabel = 'Rec D'
      }
      
      if (actualRank) {
        reasons.push({ label: 'vs Defense', value: `${opponentAbbr} #${actualRank} ${statLabel}` })
      } else {
        const rankLabel = defenseRank.includes('top') ? `Top ${defenseRank.split('_')[1]}` : `Bottom ${defenseRank.split('_')[1]}`
        reasons.push({ label: 'vs Defense', value: `${opponentAbbr} (${rankLabel} ${statLabel})` })
      }
    }

    // Offense rank - show actual rank number
    if (offenseRank && offenseRank !== 'any') {
      const opponentAbbr = NFL_TEAMS.find(t => t.id === game.opponent_id)?.abbr || 'OPP'
      const actualRank = offenseStat === 'points' ? game.opp_off_rank_points
        : offenseStat === 'pass' || offenseStat === 'passing' ? game.opp_off_rank_pass
        : offenseStat === 'rush' || offenseStat === 'rushing' ? game.opp_off_rank_rush
        : game.opp_off_rank_points
      const statLabel = offenseStat === 'points' ? 'Pts O' 
        : offenseStat === 'pass' || offenseStat === 'passing' ? 'Pass O' 
        : offenseStat === 'rush' || offenseStat === 'rushing' ? 'Rush O'
        : 'Pts O'
      if (actualRank) {
        reasons.push({ label: 'vs Offense', value: `${opponentAbbr} #${actualRank} ${statLabel}` })
      } else {
        const rankLabel = offenseRank.includes('top') ? `Top ${offenseRank.split('_')[1]}` : `Bottom ${offenseRank.split('_')[1]}`
        reasons.push({ label: 'vs Offense', value: `${opponentAbbr} (${rankLabel})` })
      }
    }

    // Favorite/Underdog filter
    if (favorite && favorite !== 'any') {
      const playerSpread = game.is_home ? game.spread_close : -game.spread_close
      if (playerSpread !== undefined) {
        reasons.push({ 
          label: favorite === 'favorite' ? 'Favorite' : 'Underdog', 
          value: `${Math.abs(playerSpread).toFixed(1)} pts`
        })
      }
    }

    // Total range filter
    if (totalMin || totalMax) {
      const gameTotal = game.total || game.total_close
      if (gameTotal) {
        let totalDesc = ''
        if (totalMin && totalMax) {
          totalDesc = `O/U ${gameTotal} (${totalMin}-${totalMax} range)`
        } else if (totalMin) {
          totalDesc = `O/U ${gameTotal} (${totalMin}+)`
        } else if (totalMax) {
          totalDesc = `O/U ${gameTotal} (≤${totalMax})`
        }
        reasons.push({ label: 'Total', value: totalDesc })
      }
    }

    // Spread range filter
    if (spreadMin || spreadMax) {
      const playerSpread = game.is_home ? game.spread_close : -game.spread_close
      if (playerSpread !== undefined) {
        let spreadDesc = `${playerSpread > 0 ? '+' : ''}${playerSpread.toFixed(1)}`
        reasons.push({ label: 'Spread', value: spreadDesc })
      }
    }

    // Book Line filter (the filter itself, not just the line value)
    if (propLineMode === 'book' && (bookLineMin || bookLineMax)) {
      let filterDesc = ''
      if (bookLineMin && bookLineMax) {
        filterDesc = `${bookLineMin} to ${bookLineMax}`
      } else if (bookLineMin) {
        filterDesc = `${bookLineMin}+`
      } else if (bookLineMax) {
        filterDesc = `≤${bookLineMax}`
      }
      reasons.push({ label: 'Book Line Filter', value: filterDesc })
    }

    // Actual book line value
    if (game.book_line !== undefined && game.bookmaker) {
      reasons.push({ label: game.bookmaker.charAt(0).toUpperCase() + game.bookmaker.slice(1), value: `o${game.book_line}` })
    } else if (game.book_line !== undefined) {
      reasons.push({ label: 'Book Line', value: `o${game.book_line}` })
    } else if (parseFloat(propLine) > 0) {
      reasons.push({ label: 'Line', value: `o${propLine}` })
    }

    // Line movement filters
    if (spreadMoveMin || spreadMoveMax) {
      const movement = game.spread_movement
      if (movement !== undefined) {
        reasons.push({ label: 'Spread Move', value: `${movement > 0 ? '+' : ''}${movement.toFixed(1)}` })
      }
    }
    if (totalMoveMin || totalMoveMax) {
      const movement = game.total_movement
      if (movement !== undefined) {
        reasons.push({ label: 'Total Move', value: `${movement > 0 ? '+' : ''}${movement.toFixed(1)}` })
      }
    }

    // Referee
    if (game.referee_name) {
      reasons.push({ label: 'Referee', value: game.referee_name })
    }

    // Streaks - using game-level streak data
    if (streak) {
      const teamStreak = game.is_home ? game.home_streak : game.away_streak
      if (teamStreak !== undefined && teamStreak !== 0) {
        reasons.push({ 
          label: 'Team Streak', 
          value: teamStreak > 0 ? `${teamStreak}W streak` : `${Math.abs(teamStreak)}L streak`
        })
      }
    }

    // Previous game margin
    if (prevGameMarginMin || prevGameMarginMax) {
      const prevMargin = game.is_home ? game.home_prev_margin : game.away_prev_margin
      if (prevMargin !== undefined) {
        reasons.push({ 
          label: 'Prev Game', 
          value: prevMargin > 0 ? `Won by ${prevMargin}` : `Lost by ${Math.abs(prevMargin)}`
        })
      }
    }

    // Note: Position-specific Defense ranking is now handled in the main defense rank block above

    // Position-specific Offense ranking (WR/TE/RB production)
    if (offenseStatPosition && offenseStatPosition !== '') {
      const opponentAbbr = NFL_TEAMS.find(t => t.id === game.opponent_id)?.abbr || 'OPP'
      const actualRank = offenseStatPosition === 'wr_prod' || offenseStatPosition === 'wr' ? game.opp_off_rank_wr_prod
        : offenseStatPosition === 'te_prod' || offenseStatPosition === 'te' ? game.opp_off_rank_te_prod
        : offenseStatPosition === 'rb_prod' || offenseStatPosition === 'rb' ? game.opp_off_rank_rb_prod
        : null
      const statLabel = offenseStatPosition === 'wr_prod' || offenseStatPosition === 'wr' ? 'WR Prod'
        : offenseStatPosition === 'te_prod' || offenseStatPosition === 'te' ? 'TE Prod'
        : offenseStatPosition === 'rb_prod' || offenseStatPosition === 'rb' ? 'RB Prod'
        : ''
      if (actualRank && statLabel) {
        reasons.push({ label: 'vs Offense', value: `${opponentAbbr} #${actualRank} ${statLabel}` })
      }
    }

    // Team Win Percentage
    if (teamWinPctMin !== '' || teamWinPctMax !== '') {
      const teamWinPct = game.team_win_pct
      if (teamWinPct !== undefined && teamWinPct !== null) {
        reasons.push({ label: 'Team Win%', value: `${(teamWinPct * 100).toFixed(0)}%` })
      }
    }

    // Opponent Win Percentage
    if (oppWinPctMin !== '' || oppWinPctMax !== '') {
      const oppWinPct = game.opp_win_pct
      if (oppWinPct !== undefined && oppWinPct !== null) {
        reasons.push({ label: 'Opp Win%', value: `${(oppWinPct * 100).toFixed(0)}%` })
      }
    }

    return reasons
  }

  // Render expanded prop details (player box score - FULL stats from nfl_box_scores_v2)
  const renderPropDetails = (game: any) => {
    const playerName = game.player_name || selectedPlayer?.name || 'Player'
    const playerPos = game.player_position || selectedPlayer?.position || propPosition
    const opponentAbbr = NFL_TEAMS.find(t => t.id === game.opponent_id)?.abbr || game.opponent?.substring(0, 3).toUpperCase()
    
    // QB Stats - comprehensive
    const qbStats = playerPos === 'QB' ? {
      title: 'PASSING',
      primary: [
        { label: 'COMP/ATT', value: `${game.pass_completions || 0}/${game.pass_attempts || 0}` },
        { label: 'YARDS', value: game.pass_yards, highlight: true },
        { label: 'TDs', value: game.pass_tds },
        { label: 'INTs', value: game.interceptions },
        { label: 'QBR', value: game.qb_rating?.toFixed(1) || '-' },
        { label: 'SACKS', value: game.sacks },
      ],
      secondary: [
        { label: 'RUSH ATT', value: game.rush_attempts },
        { label: 'RUSH YDS', value: game.rush_yards },
        { label: 'RUSH TDs', value: game.rush_tds },
        { label: 'LONG RUSH', value: game.rush_long },
      ]
    } : null
    
    // RB Stats - comprehensive
    const rbStats = playerPos === 'RB' ? {
      title: 'RUSHING',
      primary: [
        { label: 'CARRIES', value: game.rush_attempts },
        { label: 'YARDS', value: game.rush_yards, highlight: true },
        { label: 'TDs', value: game.rush_tds },
        { label: 'LONG', value: game.rush_long },
        { label: 'YPC', value: game.yards_per_carry?.toFixed(1) || '-' },
      ],
      secondary: [
        { label: 'TARGETS', value: game.targets },
        { label: 'REC', value: game.receptions },
        { label: 'REC YDS', value: game.receiving_yards },
        { label: 'REC TDs', value: game.receiving_tds },
        { label: 'REC LONG', value: game.receiving_long },
      ]
    } : null
    
    // WR/TE Stats - comprehensive
    const wrTeStats = (playerPos === 'WR' || playerPos === 'TE') ? {
      title: 'RECEIVING',
      primary: [
        { label: 'TARGETS', value: game.targets },
        { label: 'REC', value: game.receptions },
        { label: 'YARDS', value: game.receiving_yards, highlight: true },
        { label: 'TDs', value: game.receiving_tds },
        { label: 'LONG', value: game.receiving_long },
        { label: 'YPR', value: game.yards_per_reception?.toFixed(1) || '-' },
      ],
      secondary: [
        { label: 'RUSH ATT', value: game.rush_attempts },
        { label: 'RUSH YDS', value: game.rush_yards },
        { label: 'RUSH TDs', value: game.rush_tds },
      ]
    } : null
    
    const statsConfig = qbStats || rbStats || wrTeStats
    
    return (
      <div className={styles.propDetailsExpanded}>
        <div className={styles.propDetailsHeader}>
          <div className={styles.propPlayerInfo}>
            <span className={styles.propPlayerName}>{playerName}</span>
            <span className={styles.propGameInfo}>vs {opponentAbbr} • {formatHistoricalDate(game.game_date, game.game_time)}</span>
          </div>
        </div>
        
        {statsConfig && (
          <>
            <div className={styles.boxScoreSection}>
              <div className={styles.boxScoreSectionTitle}>{statsConfig.title}</div>
              <div className={styles.boxScoreGrid}>
                {statsConfig.primary.filter(s => s.value !== undefined && s.value !== null && s.value !== 0 && s.value !== '0' && s.value !== '-').map((stat, i) => (
                  <div key={i} className={`${styles.boxScoreStat} ${stat.highlight ? styles.highlighted : ''}`}>
                    <span className={styles.boxScoreValue}>{stat.value}</span>
                    <span className={styles.boxScoreLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {statsConfig.secondary.some(s => s.value !== undefined && s.value !== null && s.value !== 0) && (
              <div className={styles.boxScoreSection}>
                <div className={styles.boxScoreSectionTitle}>
                  {playerPos === 'QB' ? 'RUSHING' : 'RUSHING'}
                </div>
                <div className={styles.boxScoreGrid}>
                  {statsConfig.secondary.filter(s => s.value !== undefined && s.value !== null && s.value !== 0).map((stat, i) => (
                    <div key={i} className={styles.boxScoreStat}>
                      <span className={styles.boxScoreValue}>{stat.value}</span>
                      <span className={styles.boxScoreLabel}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {!statsConfig && (
          <div className={styles.boxScoreGrid}>
            <div className={styles.boxScoreStat}>
              <span className={styles.boxScoreValue}>{game.actual_value}</span>
              <span className={styles.boxScoreLabel}>VALUE</span>
            </div>
          </div>
        )}
        
        {/* Book Lines section - show when book line data is available */}
        {game.book_line !== undefined && (
          <div className={styles.boxScoreSection}>
            <div className={styles.boxScoreSectionTitle}>BOOK LINE</div>
            <div className={styles.boxScoreGrid}>
              <div className={styles.boxScoreStat}>
                <span className={styles.boxScoreValue}>{formatBookmaker(game.bookmaker)}</span>
                <span className={styles.boxScoreLabel}>BOOK</span>
              </div>
              <div className={`${styles.boxScoreStat} ${game.hit ? styles.boxScoreHighlight : ''}`}>
                <span className={styles.boxScoreValue}>o{game.book_line}</span>
                <span className={styles.boxScoreLabel}>LINE</span>
              </div>
              <div className={styles.boxScoreStat}>
                <span className={styles.boxScoreValue}>{game.actual_value}</span>
                <span className={styles.boxScoreLabel}>ACTUAL</span>
              </div>
              <div className={styles.boxScoreStat}>
                <span className={`${styles.boxScoreValue} ${game.differential >= 0 ? styles.positive : styles.negative}`}>
                  {game.differential >= 0 ? '+' : ''}{game.differential}
                </span>
                <span className={styles.boxScoreLabel}>DIFF</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Why This Fits */}
        {(() => {
          const propReasons = getPropMatchReasons(game)
          return propReasons.length > 0 ? (
            <div className={styles.whyThisFits}>
              <div className={styles.whyThisFitsTitle}>Why this fits:</div>
              <div className={styles.whyThisFitsList}>
                {propReasons.map((reason, i) => (
                  <div key={i} className={styles.whyThisFitsItem}>
                    <FaCheckCircle className={styles.matchCheck} />
                    <span>{reason.label}:</span>
                    <strong>{reason.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        })()}
      </div>
    )
  }

  // Render game row for Props - shows player vs team with actual stat
  const renderPropGameRow = (game: any, index: number) => {
    const opponentLogo = teamLogos[game.opponent_id]
    const opponentAbbr = NFL_TEAMS.find(t => t.id === game.opponent_id)?.abbr || game.opponent?.substring(0, 3).toUpperCase()
    
    // Find stat label for display
    const statLabel = availablePropStats.find(s => s.value === propStat)?.label || propStat
    
    // Use unified historical date formatter
    
    // Use player from game data (for position queries) or selected player
    const playerHeadshot = game.player_headshot || 
      (selectedPlayer?.headshot_url || `https://a.espncdn.com/i/headshots/nfl/players/full/${game.player_id || selectedPlayer?.espn_player_id}.png`)
    const playerName = game.player_name || selectedPlayer?.name
    
    // Use composite key for props to handle position-based queries where multiple players share same game_id
    const gameKey = `${game.game_id}_${game.player_id || index}`
    const isExpanded = expandedGameId === gameKey
    
    return (
      <div key={gameKey} className={styles.gameRowWrapper}>
        <div 
          className={`${styles.propGameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
          onClick={() => toggleGameExpanded(gameKey)}
        >
          <span className={styles.propGameDate}>{formatHistoricalDate(game.game_date, game.game_time)}</span>
          <div className={styles.propMatchup}>
            <img 
              src={playerHeadshot}
              alt={playerName || ''}
              className={styles.propPlayerThumb}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {/* Show player name if position-based query (no specific player selected) */}
            {!selectedPlayer && game.player_name && (
              <span className={styles.playerNameSmall}>{game.player_name.split(' ').pop()}</span>
            )}
            <span className={styles.vsText}>vs</span>
            <span className={styles.opponentAbbr}>{opponentAbbr}</span>
            {opponentLogo && (
              <img src={opponentLogo} alt="" className={styles.propTeamThumb} />
            )}
          </div>
          <div className={styles.propStatValue}>
            <span className={game.hit ? styles.statHit : styles.statMiss}>
              {game.actual_value}
            </span>
            {/* Show book line with bookmaker name if using book lines mode */}
            {game.book_line !== undefined && (
              <span className={styles.bookLineValue}>
                {formatBookmaker(game.bookmaker)}: o{game.book_line}
              </span>
            )}
            {game.book_line === undefined && (
              <span className={styles.statType}>{statLabel}</span>
            )}
          </div>
          <span className={styles.propResult}>
            {game.hit ? (
              <FaCheckCircle className={styles.hitIcon} />
            ) : (
              <HiOutlineXCircle className={styles.missIcon} />
            )}
          </span>
        </div>
        {isExpanded && renderPropDetails(game)}
      </div>
    )
  }

  
  // Helper to format bookmaker name nicely
  const formatBookmaker = (bookmaker?: string): string => {
    if (!bookmaker) return 'Book'
    const formatMap: Record<string, string> = {
      'fanduel': 'FanDuel',
      'draftkings': 'DraftKings',
      'betmgm': 'BetMGM',
      'williamhill_us': 'Caesars',
      'betrivers': 'BetRivers',
      'fanatics': 'Fanatics',
      'bovada': 'Bovada',
      'pointsbetus': 'PointsBet',
      'barstool': 'Barstool',
      'betonlineag': 'BetOnline',
      'unibet_us': 'Unibet',
    }
    return formatMap[bookmaker.toLowerCase()] || bookmaker
  }

  // Toggle expanded game details - supports composite keys for props
  const toggleGameExpanded = (gameKey: string) => {
    setExpandedGameId(prev => prev === gameKey ? null : gameKey)
  }
  
  // Toggle collapsible filter sections
  const toggleSection = (section: 'playerStats' | 'matchup' | 'betting' | 'teamStats') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Render expanded game details
  const renderGameDetails = (game: any) => {
    const homeScore = game.home_score || 0
    const awayScore = game.away_score || 0
    const homeAbbr = game.home_abbr || NFL_TEAMS.find(t => t.id === game.home_team_id)?.abbr || 'HOME'
    const awayAbbr = game.away_abbr || NFL_TEAMS.find(t => t.id === game.away_team_id)?.abbr || 'AWAY'
    const homeSpread = game.spread_close ?? 0
    const awaySpread = -homeSpread
    const homeIsFav = homeSpread < 0
    
    // Determine subject team based on side selection (same logic as getHistoricalMatchReasons)
    let subjectAbbr: string
    let subjectSpread: number
    
    if (location === 'home' || side === 'home') {
      subjectAbbr = homeAbbr
      subjectSpread = homeSpread
    } else if (location === 'away' || side === 'away') {
      subjectAbbr = awayAbbr
      subjectSpread = awaySpread
    } else if (side === 'favorite' || favorite === 'favorite') {
      subjectAbbr = homeIsFav ? homeAbbr : awayAbbr
      subjectSpread = homeIsFav ? homeSpread : awaySpread
    } else if (side === 'underdog' || favorite === 'underdog') {
      subjectAbbr = homeIsFav ? awayAbbr : homeAbbr
      subjectSpread = homeIsFav ? awaySpread : homeSpread
    } else {
      // Default to home perspective for O/U or general queries
      subjectAbbr = homeAbbr
      subjectSpread = homeSpread
    }
    
    const matchReasons = getHistoricalMatchReasons(game)
    
    return (
      <div className={styles.gameDetailsExpanded}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Date</span>
          <span className={styles.detailValue}>{formatHistoricalDate(game.game_date, game.game_time)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Final Score</span>
          <span className={styles.detailValue}>
            {awayAbbr} {awayScore} @ {homeAbbr} {homeScore}
          </span>
        </div>
        {(game.spread_close !== undefined || game.spread !== undefined) && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Spread</span>
            <span className={styles.detailValue}>
              {subjectAbbr} {subjectSpread > 0 ? '+' : ''}{subjectSpread}
            </span>
          </div>
        )}
        {(game.total_close !== undefined || game.total !== undefined) && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Total</span>
            <span className={styles.detailValue}>O/U {game.total_close || game.total}</span>
          </div>
        )}
        {game.referee_name && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Referee</span>
            <span className={styles.detailValue}>{game.referee_name}</span>
          </div>
        )}
        
        {/* Why This Fits */}
        {matchReasons.length > 0 && (
          <div className={styles.whyThisFits}>
            <div className={styles.whyThisFitsTitle}>Why this fits:</div>
            <div className={styles.whyThisFitsList}>
              {matchReasons.map((reason, i) => (
                <div key={i} className={styles.whyThisFitsItem}>
                  <FaCheckCircle className={styles.matchCheck} />
                  <span>{reason.label}:</span>
                  <strong>{reason.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render game row based on bet type
  const renderGameRow = (game: any, index: number) => {
    // Get team info - for all game types now
    const homeLogo = teamLogos[game.home_team_id] || teamLogos[game.subject_team_id]
    const awayLogo = teamLogos[game.away_team_id] || teamLogos[game.opponent_team_id] || teamLogos[game.opponent_id]
    const homeAbbr = game.home_abbr || NFL_TEAMS.find(t => t.id === (game.home_team_id || game.subject_team_id))?.abbr || 'HOME'
    const awayAbbr = game.away_abbr || NFL_TEAMS.find(t => t.id === (game.away_team_id || game.opponent_team_id || game.opponent_id))?.abbr || 'AWAY'
    const homeScore = game.home_score || 0
    const awayScore = game.away_score || 0
    
    const gameKey = String(game.game_id)
    const isExpanded = expandedGameId === gameKey
    
    if (betType === 'moneyline') {
      // Moneyline: Show both teams + final score (logos only, no abbr)
      return (
        <div key={gameKey} className={styles.gameRowWrapper}>
          <div 
            className={`${styles.gameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
            onClick={() => toggleGameExpanded(gameKey)}
          >
            <span className={styles.gameDate}>{formatHistoricalDate(game.game_date, game.game_time)}</span>
            <span className={styles.gameTeamMatchup}>
              <span className={styles.scoreTeam}>{awayScore}</span>
              {awayLogo && <img src={awayLogo} alt={awayAbbr} className={styles.teamLogoSmall} />}
              <span className={styles.atSymbol}>@</span>
              {homeLogo && <img src={homeLogo} alt={homeAbbr} className={styles.teamLogoSmall} />}
              <span className={styles.scoreTeam}>{homeScore}</span>
            </span>
            <span className={styles.gameResult}>
              {game.hit ? (
                <FaCheckCircle className={styles.hitIcon} />
              ) : (
                <HiOutlineXCircle className={styles.missIcon} />
              )}
            </span>
          </div>
          {isExpanded && renderGameDetails(game)}
        </div>
      )
    } else if (betType === 'total') {
      // Totals: Show both teams + total + final score (logos only)
      const totalPoints = homeScore + awayScore || game.actual_value || 0
      const line = game.total || game.line || 0
      
      return (
        <div key={gameKey} className={styles.gameRowWrapper}>
          <div 
            className={`${styles.gameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
            onClick={() => toggleGameExpanded(gameKey)}
          >
            <span className={styles.gameDate}>{formatHistoricalDate(game.game_date, game.game_time)}</span>
            <span className={styles.gameTeamMatchup}>
              <span className={styles.scoreTeam}>{awayScore}</span>
              {awayLogo && <img src={awayLogo} alt={awayAbbr} className={styles.teamLogoSmall} />}
              <span className={styles.atSymbol}>@</span>
              {homeLogo && <img src={homeLogo} alt={homeAbbr} className={styles.teamLogoSmall} />}
              <span className={styles.scoreTeam}>{homeScore}</span>
            </span>
            <span className={styles.gameTotal}>
              <span className={styles.totalLine}>O/U {line}</span>
              <span className={styles.totalFinal}>({totalPoints})</span>
            </span>
            <span className={styles.gameResult}>
              {game.hit ? (
                <FaCheckCircle className={styles.hitIcon} />
              ) : (
                <HiOutlineXCircle className={styles.missIcon} />
              )}
            </span>
          </div>
          {isExpanded && renderGameDetails(game)}
        </div>
      )
    } else {
      // Spread: Show both teams + spread + final score (logos only)
      const spread = game.spread || game.line || 0
      
      return (
        <div key={gameKey} className={styles.gameRowWrapper}>
          <div 
            className={`${styles.gameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
            onClick={() => toggleGameExpanded(gameKey)}
          >
            <span className={styles.gameDate}>{formatHistoricalDate(game.game_date, game.game_time)}</span>
            <span className={styles.gameTeamMatchup}>
              <span className={styles.scoreTeam}>{awayScore}</span>
              {awayLogo && <img src={awayLogo} alt={awayAbbr} className={styles.teamLogoSmall} />}
              <span className={styles.atSymbol}>@</span>
              {homeLogo && <img src={homeLogo} alt={homeAbbr} className={styles.teamLogoSmall} />}
              <span className={styles.scoreTeam}>{homeScore}</span>
            </span>
            <span className={styles.gameSpread}>
              <span className={styles.spreadLine}>{spread > 0 ? '+' : ''}{spread}</span>
            </span>
            <span className={styles.gameResult}>
              {game.hit ? (
                <FaCheckCircle className={styles.hitIcon} />
              ) : (
                <HiOutlineXCircle className={styles.missIcon} />
              )}
            </span>
          </div>
          {isExpanded && renderGameDetails(game)}
        </div>
      )
    }
  }

  // Get dynamic stat label based on query type and selected stat
  const getAvgStatLabel = () => {
    if (queryType === 'prop') {
      // Find the label for the selected prop stat
      const statConfig = availablePropStats.find(s => s.value === propStat)
      return `Avg ${statConfig?.label || propStat}`
    }
    if (betType === 'total') {
      return 'Avg Total Points'
    }
    return 'Avg Win Margin'
  }

  // Render stats based on bet type
  const renderAdditionalStats = () => {
    if (!result) return null

    // Props have different stats display
    if (queryType === 'prop') {
      return (
        <div className={styles.additionalStats}>
          <div>
            <span>{getAvgStatLabel()}:</span>
            <strong>{result.avg_value}</strong>
          </div>
          <div>
            <span>Avg vs Line:</span>
            <strong className={result.avg_differential > 0 ? styles.positive : styles.negative}>
              {result.avg_differential > 0 ? '+' : ''}{result.avg_differential}
            </strong>
          </div>
          <div>
            <span>Current Streak:</span>
            <strong className={result.current_streak > 0 ? styles.positive : styles.negative}>
              {result.current_streak > 0 ? `${result.current_streak}W` : `${Math.abs(result.current_streak)}L`}
            </strong>
          </div>
          <div>
            <span>Best Streak:</span>
            <strong>{result.longest_hit_streak}W</strong>
          </div>
        </div>
      )
    }

    if (betType === 'moneyline') {
      return (
        <div className={styles.additionalStats}>
          <div>
            <span>Avg Win Margin:</span>
            <strong className={result.avg_value > 0 ? styles.positive : styles.negative}>
              {result.avg_value > 0 ? '+' : ''}{result.avg_value}
            </strong>
          </div>
          <div>
            <span>Current Streak:</span>
            <strong className={result.current_streak > 0 ? styles.positive : styles.negative}>
              {result.current_streak > 0 ? `${result.current_streak}W` : `${Math.abs(result.current_streak)}L`}
            </strong>
          </div>
          <div>
            <span>Best Streak:</span>
            <strong>{result.longest_hit_streak}W</strong>
          </div>
        </div>
      )
    } else if (betType === 'total') {
      return (
        <div className={styles.additionalStats}>
          <div>
            <span>Avg Total Points:</span>
            <strong>{result.avg_value}</strong>
          </div>
          <div>
            <span>Avg Diff vs Total:</span>
            <strong className={result.avg_differential > 0 ? styles.positive : styles.negative}>
              {result.avg_differential > 0 ? '+' : ''}{result.avg_differential}
            </strong>
          </div>
          <div>
            <span>Current Streak:</span>
            <strong className={result.current_streak > 0 ? styles.positive : styles.negative}>
              {result.current_streak > 0 ? `${result.current_streak}W` : `${Math.abs(result.current_streak)}L`}
            </strong>
          </div>
          <div>
            <span>Best Streak:</span>
            <strong>{result.longest_hit_streak}W</strong>
          </div>
        </div>
      )
    } else {
      // Spread
      return (
        <div className={styles.additionalStats}>
          <div>
            <span>Avg Win Margin:</span>
            <strong className={result.avg_value > 0 ? styles.positive : styles.negative}>
              {result.avg_value > 0 ? '+' : ''}{result.avg_value}
            </strong>
          </div>
          <div>
            <span>Avg Cover Diff:</span>
            <strong className={result.avg_differential > 0 ? styles.positive : styles.negative}>
              {result.avg_differential > 0 ? '+' : ''}{result.avg_differential}
            </strong>
          </div>
          <div>
            <span>Current Streak:</span>
            <strong className={result.current_streak > 0 ? styles.positive : styles.negative}>
              {result.current_streak > 0 ? `${result.current_streak}W` : `${Math.abs(result.current_streak)}L`}
            </strong>
          </div>
          <div>
            <span>Best Streak:</span>
            <strong>{result.longest_hit_streak}W</strong>
          </div>
        </div>
      )
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      <header className={styles.header}>
        <h1>
          Builder <span className={styles.versionTag}>1.0</span>
        </h1>
        <p className={styles.tagline}>Test historical trends with any filter combination. For premium subs only.</p>
      </header>

      <div className={styles.mainWrapper}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>MENU</span>
            <div className={styles.sportBadge}>
              <img 
                src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png" 
                alt="NFL" 
                className={styles.sportLogo}
              />
            </div>
            <button 
              className={styles.sidebarClose}
              onClick={() => setSidebarOpen(false)}
            >
              <FiChevronLeft />
            </button>
          </div>
          
          <nav className={styles.sidebarNav}>
            <button 
              className={`${styles.sidebarItem} ${activeSection === 'builder' ? styles.sidebarItemActive : ''}`}
              onClick={() => { setActiveSection('builder'); setSidebarOpen(false); }}
            >
              <FaHammer className={styles.sidebarIcon} />
              <span>Builder</span>
            </button>
            
            <button 
              className={styles.sidebarItem}
              onClick={() => router.push('/builder/my-builds')}
            >
              <FaToolbox className={styles.sidebarIcon} />
              <span>My Builds</span>
              {savedQueries.length > 0 && <span className={styles.badge}>{savedQueries.length}</span>}
            </button>
            
            <button 
              className={`${styles.sidebarItem} ${activeSection === 'buddy' ? styles.sidebarItemActive : ''} ${styles.sidebarItemDisabled}`}
              onClick={() => {}}
            >
              <LuBot className={styles.sidebarIcon} />
              <span>Buddy</span>
              <span className={styles.soonTag}>soon</span>
            </button>
            
            <button 
              className={`${styles.sidebarItem} ${activeSection === 'topBuilds' ? styles.sidebarItemActive : ''} ${styles.sidebarItemDisabled}`}
              onClick={() => {}}
            >
              <HiBuildingOffice2 className={styles.sidebarIcon} />
              <span>Top Builds</span>
              <span className={styles.soonTag}>soon</span>
            </button>
          </nav>
          
          <div className={styles.sidebarFooter}>
            <button 
              className={`${styles.sidebarItem} ${activeSection === 'preferences' ? styles.sidebarItemActive : ''} ${styles.sidebarItemDisabled}`}
              onClick={() => {}}
            >
              <MdRoomPreferences className={styles.sidebarIcon} />
              <span>Preferences</span>
              <span className={styles.soonTag}>soon</span>
            </button>
          </div>
        </aside>
        
        {/* Sidebar Toggle (when closed) */}
        {!sidebarOpen && (
          <button 
            className={styles.sidebarToggle}
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </button>
        )}
        
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div 
            className={styles.sidebarOverlay}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {activeSection === 'builder' && (
        <div className={styles.layout}>
          {/* Builder Panel */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Builder</h2>
              {/* Sport selector moved to sidebar */}
              <div className={styles.sportSelector} style={{ display: 'none' }}>
              <img 
                src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg"
                alt="NFL"
                className={styles.sportLogo}
                title="NFL"
              />
            </div>
          </div>

          {/* Query Type */}
          <div className={styles.section}>
            <label>Query Type</label>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.typeBtn} ${queryType === 'trend' ? styles.active : ''}`}
                onClick={() => navigateToQueryType('trend')}
              >
                <IoMdTrendingUp className={styles.btnIcon} />
                <span>Trends</span>
              </button>
              <button
                className={`${styles.typeBtn} ${queryType === 'team' ? styles.active : ''}`}
                onClick={() => navigateToQueryType('team')}
              >
                <PiFootballHelmetDuotone className={styles.btnIcon} />
                <span>Teams</span>
              </button>
              <button
                className={`${styles.typeBtn} ${queryType === 'referee' ? styles.active : ''}`}
                onClick={() => navigateToQueryType('referee')}
              >
                <GiWhistle className={styles.btnIcon} />
                <span>Refs</span>
              </button>
              <button
                className={`${styles.typeBtn} ${queryType === 'prop' ? styles.active : ''}`}
                onClick={() => navigateToQueryType('prop')}
              >
                <MdOutlineTipsAndUpdates className={styles.btnIcon} />
                <span>Props</span>
              </button>
            </div>
          </div>

          {/* Bet Type - for trends, teams, refs */}
          {(queryType === 'trend' || queryType === 'team' || queryType === 'referee') && (
            <div className={styles.section}>
              <label>Bet Type</label>
              <select value={betType} onChange={(e) => setBetType(e.target.value)}>
                <option value="spread">Spread</option>
                <option value="total">Total (O/U)</option>
                <option value="moneyline">Moneyline</option>
              </select>
              
              {betType === 'total' && (
                <>
                  <label>Side</label>
                  <select value={side} onChange={(e) => setSide(e.target.value)}>
                    <option value="over">Over</option>
                    <option value="under">Under</option>
                  </select>
                </>
              )}
            </div>
          )}

          {/* Team Selection - with search, Home/Any/Away, and Versus */}
          {queryType === 'team' && (
            <div className={styles.teamSection}>
              {/* Main Team Search */}
              <div className={styles.teamSearchRow}>
                <label>Team</label>
                <div className={styles.teamSearchWrapper}>
                  <input
                    type="text"
                    placeholder={selectedTeam ? selectedTeam.name : "Search team..."}
                    value={teamSearch}
                    onChange={(e) => handleTeamSearch(e.target.value)}
                    onFocus={() => {
                      if (!teamSearch) setTeamSearchResults(NFL_TEAMS.slice(0, 10))
                    }}
                    onBlur={() => setTimeout(() => setTeamSearchResults([]), 200)}
                    className={styles.teamSearchInput}
                  />
                  {teamSearchResults.length > 0 && (
                    <div className={styles.teamSearchDropdown}>
                      {teamSearchResults.map((team) => (
                        <div
                          key={team.id}
                          className={styles.teamSearchOption}
                          onClick={() => {
                            setSelectedTeam(team)
                            setTeamId(team.id)
                            setTeamSearch('')
                            setTeamSearchResults([])
                          }}
                        >
                          {teamLogos[team.id] && (
                            <img src={teamLogos[team.id]} alt="" className={styles.teamOptionLogo} />
                          )}
                          <span className={styles.teamOptionName}>{team.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Home / Any / Away Toggle */}
              <div className={styles.teamLocationToggle}>
                <button
                  className={`${styles.locationBtn} ${teamLocation === 'home' ? styles.activeLocation : ''}`}
                  onClick={() => setTeamLocation('home')}
                >
                  Home
                </button>
                <button
                  className={`${styles.locationBtn} ${teamLocation === 'any' ? styles.activeLocation : ''}`}
                  onClick={() => setTeamLocation('any')}
                >
                  Any
                </button>
                <button
                  className={`${styles.locationBtn} ${teamLocation === 'away' ? styles.activeLocation : ''}`}
                  onClick={() => setTeamLocation('away')}
                >
                  Away
                </button>
              </div>
              
              {/* Versus Section */}
              <div className={styles.versusSection}>
                <div className={styles.versusLabel}>versus</div>
                
                <div className={styles.teamSearchWrapper}>
                  <input
                    type="text"
                    placeholder={selectedVersusTeam ? selectedVersusTeam.name : "Any team"}
                    value={versusTeamSearch}
                    onChange={(e) => handleVersusTeamSearch(e.target.value)}
                    onFocus={() => {
                      if (!versusTeamSearch) setVersusTeamSearchResults(NFL_TEAMS.slice(0, 10))
                    }}
                    onBlur={() => setTimeout(() => setVersusTeamSearchResults([]), 200)}
                    className={styles.teamSearchInput}
                  />
                  {versusTeamSearchResults.length > 0 && (
                    <div className={styles.teamSearchDropdown}>
                      {versusTeamSearchResults.map((team) => (
                        <div
                          key={team.id}
                          className={styles.teamSearchOption}
                          onClick={() => {
                            setSelectedVersusTeam(team)
                            setVersusTeamSearch('')
                            setVersusTeamSearchResults([])
                          }}
                        >
                          {teamLogos[team.id] && (
                            <img src={teamLogos[team.id]} alt="" className={styles.teamOptionLogo} />
                          )}
                          <span className={styles.teamOptionName}>{team.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedVersusTeam && (
                    <button 
                      className={styles.clearVersusBtn}
                      onClick={() => setSelectedVersusTeam(null)}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {queryType === 'referee' && (
            <div className={styles.teamSection}>
              <div className={styles.teamSearchRow}>
                <label>Referee</label>
                <div className={styles.teamSearchWrapper}>
                  <input
                    type="text"
                    placeholder={selectedReferee ? selectedReferee.referee_name : "Search referee..."}
                    value={refereeSearch}
                    onChange={(e) => handleRefereeSearch(e.target.value)}
                    onFocus={() => {
                      if (!refereeSearch) setRefereeSearchResults(refereeList.slice(0, 10))
                    }}
                    onBlur={() => setTimeout(() => setRefereeSearchResults([]), 200)}
                    className={styles.teamSearchInput}
                  />
                  {refereeSearchResults.length > 0 && (
                    <div className={styles.teamSearchDropdown}>
                      <div
                        className={styles.teamSearchOption}
                        onClick={() => {
                          setSelectedReferee(null)
                          setRefereeId('')
                          setRefereeSearch('')
                          setRefereeSearchResults([])
                        }}
                      >
                        <span className={styles.teamOptionName}>All Referees</span>
                      </div>
                      {refereeSearchResults.map((ref) => (
                        <div
                          key={ref.referee_name}
                          className={styles.teamSearchOption}
                          onClick={() => {
                            setSelectedReferee(ref)
                            setRefereeId(ref.referee_name)
                            setRefereeSearch('')
                            setRefereeSearchResults([])
                          }}
                        >
                          <span className={styles.teamOptionName}>{ref.referee_name}</span>
                          <span className={styles.refGameCount}>{ref.game_count} games</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedReferee && (
                    <button 
                      className={styles.clearVersusBtn}
                      onClick={() => {
                        setSelectedReferee(null)
                        setRefereeId('')
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {queryType === 'prop' && (
            <div className={styles.propsSection}>
              {/* Position Filter */}
              <div className={styles.propRow}>
                <label>Position</label>
                <select 
                  value={propPosition} 
                  onChange={(e) => {
                    setPropPosition(e.target.value)
                    // Reset stat when position changes
                    const newStats = PROP_STATS_BY_POSITION[e.target.value] || PROP_STATS_BY_POSITION['any']
                    if (newStats.length > 0) setPropStat(newStats[0].value)
                    // Clear selected player when position changes
                    setSelectedPlayer(null)
                    setPlayerSearch('')
                  }}
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Player Search */}
              <div className={styles.propRow}>
                <label>Player</label>
                <div className={styles.playerSearchWrapper}>
                  <input
                    type="text"
                    placeholder={selectedPlayer ? selectedPlayer.name : "Search player..."}
                    value={playerSearch}
                    onChange={(e) => {
                      setPlayerSearch(e.target.value)
                      searchPlayers(e.target.value, propPosition)
                    }}
                    onFocus={() => {
                      // Show players when focused (filtered by position if selected)
                      if (!playerSearch && propPosition !== 'any') {
                        searchPlayers('', propPosition)
                      }
                    }}
                    onBlur={() => {
                      // Clear results after a short delay (allows click to register)
                      setTimeout(() => setPlayerSearchResults([]), 200)
                    }}
                    className={styles.playerSearchInput}
                  />
                  {playerSearchLoading && (
                    <div className={styles.searchLoading}>Searching...</div>
                  )}
                  {playerSearchResults.length > 0 && (
                    <div className={styles.playerSearchDropdown}>
                      {playerSearchResults.map((p) => (
                        <div
                          key={p.espn_player_id}
                          className={styles.playerSearchOption}
                          onClick={() => {
                            setSelectedPlayer(p)
                            setPlayerId(p.espn_player_id)
                            setPlayerSearch('')
                            setPlayerSearchResults([])
                            // Update prop stats based on player's position
                            const newStats = PROP_STATS_BY_POSITION[p.position] || PROP_STATS_BY_POSITION['any']
                            if (newStats.length > 0) setPropStat(newStats[0].value)
                          }}
                        >
                          <img 
                            src={p.headshot_url || `https://a.espncdn.com/i/headshots/nfl/players/full/${p.espn_player_id}.png`}
                            alt=""
                            className={styles.playerOptionThumb}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <span className={styles.playerOptionName}>{p.name}</span>
                          <span className={styles.playerOptionPos}>{p.position}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stat Type - Position Specific */}
              <div className={styles.propRow}>
                <label>Stat Type</label>
                <select value={propStat} onChange={(e) => setPropStat(e.target.value)}>
                  {availablePropStats.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Line Mode Toggle - Book Line / And / Any Line */}
              <div className={styles.propRow}>
                <label>Line Type</label>
                <div className={styles.lineTypeToggle}>
                  <button
                    type="button"
                    className={`${styles.lineTypeBtn} ${propLineMode === 'book' || propLineMode === 'and' ? styles.active : ''}`}
                    onClick={() => setPropLineMode('book')}
                  >
                    Book Line
                  </button>
                  <button
                    type="button"
                    className={`${styles.lineTypeBtn} ${styles.andBtn} ${propLineMode === 'and' ? styles.active : ''}`}
                    onClick={() => setPropLineMode('and')}
                  >
                    &
                  </button>
                  <button
                    type="button"
                    className={`${styles.lineTypeBtn} ${propLineMode === 'any' || propLineMode === 'and' ? styles.active : ''}`}
                    onClick={() => setPropLineMode('any')}
                  >
                    Any Line
                  </button>
                </div>
              </div>

              {/* Book Line Range (min/max) - shown for 'book' or 'and' mode */}
              {(propLineMode === 'book' || propLineMode === 'and') && (
                <div className={styles.propRow}>
                  <label>Book Line Range</label>
                  <div className={styles.rangeInputs}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Min"
                      value={bookLineMin}
                      onChange={(e) => setBookLineMin(e.target.value)}
                      className={styles.rangeInput}
                    />
                    <span className={styles.rangeSeparator}>to</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Max"
                      value={bookLineMax}
                      onChange={(e) => setBookLineMax(e.target.value)}
                      className={styles.rangeInput}
                    />
                  </div>
                </div>
              )}

              {/* Any Line (Over) - shown for 'any' or 'and' mode */}
              {(propLineMode === 'any' || propLineMode === 'and') && (
                <div className={styles.propRow}>
                  <label>{propLineMode === 'and' ? 'Test Against Line' : 'Line (Over)'}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 5.5 or 250"
                    value={propLine}
                    onChange={(e) => setPropLine(e.target.value)}
                    className={styles.lineInput}
                  />
                  {propLineMode === 'and' && (
                    <div className={styles.hint}>
                      Find alt prop value by testing hit rate at any line, based on what books set
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Time Period */}
          <div className={styles.section}>
            <label>Time Period</label>
            <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}>
              {TIME_PERIODS.map((tp) => (
                <option 
                  key={tp.value} 
                  value={tp.value}
                  disabled={propLineMode === 'book' && tp.value === 'since_2022'}
                >
                  {tp.label}{propLineMode === 'book' && tp.value === 'since_2022' ? ' (no book lines)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ============================================ */}
          {/* PLAYER STATS (Props only, Collapsible) */}
          {/* ============================================ */}
          {queryType === 'prop' && (
            <div className={styles.filterBlock}>
              <div 
                className={styles.filterBlockHeaderCollapsible}
                onClick={() => toggleSection('playerStats')}
              >
                <div className={styles.filterHeaderLeft}>
                  <LuGitPullRequestArrow /> Player Stats
                </div>
                {expandedSections.playerStats ? <MdExpandLess className={styles.chevron} /> : <MdExpandMore className={styles.chevron} />}
              </div>
              {expandedSections.playerStats && (
                <div className={styles.filterGrid3}>
                  {/* Targets - for WR, TE, RB */}
                  <div>
                    <span>Targets</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="5+"
                      value={minTargets}
                      onChange={(e) => setMinTargets(e.target.value.replace(/[^0-9]/g, ''))}
                      className={styles.rangeInput}
                    />
                  </div>
                  
                  {/* Carries - for RB/any */}
                  <div>
                    <span>Carries</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="10+"
                      value={minCarries}
                      onChange={(e) => setMinCarries(e.target.value.replace(/[^0-9]/g, ''))}
                      className={styles.rangeInput}
                    />
                  </div>
                  
                  {/* Pass Attempts - for QB/any */}
                  <div>
                    <span>Pass Att</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="20+"
                      value={minPassAttempts}
                      onChange={(e) => setMinPassAttempts(e.target.value.replace(/[^0-9]/g, ''))}
                      className={styles.rangeInput}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* MATCHUP FILTERS (Collapsible) */}
          {/* ============================================ */}
          <div className={styles.filterBlock}>
            <div 
              className={styles.filterBlockHeaderCollapsible}
              onClick={() => toggleSection('matchup')}
            >
              <div className={styles.filterHeaderLeft}>
                <MdOutlineStadium /> Matchup Filters
              </div>
              {expandedSections.matchup ? <MdExpandLess className={styles.chevron} /> : <MdExpandMore className={styles.chevron} />}
            </div>
            {expandedSections.matchup && (
              <div className={styles.filterGrid}>
                {!isOUQuery && queryType !== 'team' && (
                  <div>
                    <span>Home/Away</span>
                    <select value={location} onChange={(e) => setLocation(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="home">Home</option>
                      <option value="away">Away</option>
                    </select>
                  </div>
                )}
                
                {/* Versus Team - for Props */}
                {queryType === 'prop' && (
                  <div>
                    <span>Versus Team</span>
                    <div className={styles.teamSearchWrapper}>
                      <input
                        type="text"
                        placeholder={selectedPropVersusTeam ? selectedPropVersusTeam.name : "Any team"}
                        value={propVersusTeamSearch}
                        onChange={(e) => handlePropVersusTeamSearch(e.target.value)}
                        onFocus={() => {
                          if (!propVersusTeamSearch) setPropVersusTeamResults(NFL_TEAMS.slice(0, 10))
                        }}
                        onBlur={() => setTimeout(() => setPropVersusTeamResults([]), 200)}
                        className={styles.teamSearchInput}
                      />
                      {propVersusTeamResults.length > 0 && (
                        <div className={styles.teamSearchDropdown}>
                          {propVersusTeamResults.map((team) => (
                            <div
                              key={team.id}
                              className={styles.teamSearchOption}
                              onClick={() => {
                                setSelectedPropVersusTeam(team)
                                setPropVersusTeamSearch('')
                                setPropVersusTeamResults([])
                              }}
                            >
                              {teamLogos[team.id] && (
                                <img src={teamLogos[team.id]} alt="" className={styles.teamOptionLogo} />
                              )}
                              <span className={styles.teamOptionName}>{team.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedPropVersusTeam && (
                        <button 
                          className={styles.clearVersusBtn}
                          onClick={() => setSelectedPropVersusTeam(null)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <span>Division</span>
                  <select value={division} onChange={(e) => setDivision(e.target.value)}>
                    <option value="any">Any</option>
                    <option value="division">Division</option>
                    <option value="non_division">Non-Division</option>
                  </select>
                </div>
                <div>
                  <span>Conference</span>
                  <select value={conference} onChange={(e) => setConference(e.target.value)}>
                    <option value="any">Any</option>
                    <option value="conference">Conference</option>
                    <option value="non_conference">Non-Conference</option>
                  </select>
                </div>
                <div>
                  <span>Season Type</span>
                  <select value={playoff} onChange={(e) => setPlayoff(e.target.value)}>
                    <option value="any">Any</option>
                    <option value="playoff">Playoff</option>
                    <option value="regular">Regular Season</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ============================================ */}
          {/* BETTING FILTERS (Collapsible) */}
          {/* ============================================ */}
          <div className={styles.filterBlock}>
            <div 
              className={styles.filterBlockHeaderCollapsible}
              onClick={() => toggleSection('betting')}
            >
              <div className={styles.filterHeaderLeft}>
                <PiMoneyWavy /> Betting Filters
              </div>
              {expandedSections.betting ? <MdExpandLess className={styles.chevron} /> : <MdExpandMore className={styles.chevron} />}
            </div>
            
            {expandedSections.betting && (
              <>
                {/* Fav/Dog */}
                <div className={styles.filterGrid}>
                  {!isOUQuery ? (
                    <div>
                      <span>Fav/Dog</span>
                      <select value={favorite} onChange={(e) => setFavorite(e.target.value)}>
                        <option value="any">Any</option>
                        <option value="favorite">Favorite</option>
                        <option value="underdog">Underdog</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <span>Home Team</span>
                      <select value={homeFavDog} onChange={(e) => setHomeFavDog(e.target.value)}>
                        <option value="any">Any</option>
                        <option value="home_fav">Home Favorite</option>
                        <option value="home_dog">Home Underdog</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Ranges Row */}
                <div className={styles.subHeader}>
                  <TbTargetArrow /> Ranges
                </div>
                <div className={styles.rangeGrid}>
                  <div>
                    <span>{isOUQuery ? 'Home Spread' : 'Spread Range'}</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min" value={spreadMin} onChange={(e) => setSpreadMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max" value={spreadMax} onChange={(e) => setSpreadMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>ML Range</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min" value={mlMin} onChange={(e) => setMlMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max" value={mlMax} onChange={(e) => setMlMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>Total Range</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min" value={totalMin} onChange={(e) => setTotalMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max" value={totalMax} onChange={(e) => setTotalMax(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Line Movement */}
                <div className={styles.subHeader}>
                  <MdOutlineAutoGraph /> Line Movement
                </div>
                <div className={styles.rangeGrid}>
                  <div>
                    <span>Spread Move</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min" value={spreadMoveMin} onChange={(e) => setSpreadMoveMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max" value={spreadMoveMax} onChange={(e) => setSpreadMoveMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>ML Move</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min" value={mlMoveMin} onChange={(e) => setMlMoveMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max" value={mlMoveMax} onChange={(e) => setMlMoveMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>Total Move</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min" value={totalMoveMin} onChange={(e) => setTotalMoveMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max" value={totalMoveMax} onChange={(e) => setTotalMoveMax(e.target.value)} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ============================================ */}
          {/* TEAM STATS (Collapsible) */}
          {/* ============================================ */}
          <div className={styles.filterBlock}>
            <div 
              className={styles.filterBlockHeaderCollapsible}
              onClick={() => toggleSection('teamStats')}
            >
              <div className={styles.filterHeaderLeft}>
                <PiChartBarLight /> Team Stats {isOUQuery ? '(Both Teams)' : ''}
              </div>
              {expandedSections.teamStats ? <MdExpandLess className={styles.chevron} /> : <MdExpandMore className={styles.chevron} />}
            </div>
            
            {/* Non-O/U: Team Rankings + vs Opponent Rankings + Streak */}
            {expandedSections.teamStats && !isOUQuery && (
              <>
                {/* Row 1: Team Defense & Team Offense (Subject team's own rankings) */}
                <div className={styles.filterGrid}>
                  <div>
                    <span>Team Defense</span>
                    <select value={ownDefenseRank} onChange={(e) => setOwnDefenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {ownDefenseRank !== 'any' && (
                      <select value={ownDefenseStat} onChange={(e) => setOwnDefenseStat(e.target.value)}>
                        <option value="overall">Any Stat</option>
                        <option value="pass">Pass D</option>
                        <option value="rush">Rush D</option>
                        <option value="points">Points Allowed</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <span>Team Offense</span>
                    <select value={ownOffenseRank} onChange={(e) => setOwnOffenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {ownOffenseRank !== 'any' && (
                      <select value={ownOffenseStat} onChange={(e) => setOwnOffenseStat(e.target.value)}>
                        <option value="overall">Any Stat</option>
                        <option value="points">Points</option>
                        <option value="pass">Passing</option>
                        <option value="rush">Rushing</option>
                      </select>
                    )}
                  </div>
                </div>
                
                {/* Row 2: vs Defense & vs Offense (Opponent rankings) */}
                <div className={styles.filterGrid}>
                  <div>
                    <span>vs Defense</span>
                    <select value={defenseRank} onChange={(e) => setDefenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {defenseRank !== 'any' && (
                      <select value={defenseStat} onChange={(e) => setDefenseStat(e.target.value)}>
                        <option value="overall">Any Stat</option>
                        <option value="pass">vs Pass</option>
                        <option value="rush">vs Rush</option>
                        <option value="points">vs Points</option>
                        <option value="wr">vs WRs</option>
                        <option value="te">vs TEs</option>
                        <option value="rb">vs RBs</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <span>vs Offense</span>
                    <select value={offenseRank} onChange={(e) => setOffenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {offenseRank !== 'any' && (
                      <select value={offenseStat} onChange={(e) => setOffenseStat(e.target.value)}>
                        <option value="overall">Any Stat</option>
                        <option value="points">Points</option>
                        <option value="pass">Passing</option>
                        <option value="rush">Rushing</option>
                        <option value="wr">WR Production</option>
                        <option value="te">TE Production</option>
                        <option value="rb">RB Production</option>
                      </select>
                    )}
                  </div>
                </div>
                
                {/* Row 3: Win Percentage */}
                <div className={styles.filterGrid}>
                  <div>
                    <span>Team Win %</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min %" value={teamWinPctMin} onChange={(e) => setTeamWinPctMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max %" value={teamWinPctMax} onChange={(e) => setTeamWinPctMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>Opp Win %</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min %" value={oppWinPctMin} onChange={(e) => setOppWinPctMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max %" value={oppWinPctMax} onChange={(e) => setOppWinPctMax(e.target.value)} />
                    </div>
                  </div>
                </div>
                
                {/* Row 4: Prev Game Margin & W/L Streak */}
                <div className={styles.filterGrid}>
                  <div>
                    <span>Prev Game Margin</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="text" placeholder="Min" value={prevGameMarginMin} onChange={(e) => setPrevGameMarginMin(e.target.value)} />
                      <input type="text" inputMode="text" placeholder="Max" value={prevGameMarginMax} onChange={(e) => setPrevGameMarginMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>W/L Streak</span>
                    <input type="text" inputMode="text" placeholder="2 or -2" value={streak} onChange={(e) => setStreak(e.target.value)} className={styles.streakInput} />
                    <div className={styles.hint}>+ wins, - losses</div>
                  </div>
                </div>
              </>
            )}
            
            {/* O/U: Four-Way Team Stats */}
            {expandedSections.teamStats && isOUQuery && (
              <>
                {/* Away Team Row */}
                <div className={styles.teamRow}>
                  <div className={styles.teamLabel}>Away</div>
                  <div>
                    <span>Defense</span>
                    <select value={awayTeamDefenseRank} onChange={(e) => setAwayTeamDefenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {awayTeamDefenseRank !== 'any' && (
                      <select value={awayTeamDefenseStat} onChange={(e) => setAwayTeamDefenseStat(e.target.value)}>
                        <option value="overall">Any</option>
                        <option value="pass">Pass</option>
                        <option value="rush">Rush</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <span>Offense</span>
                    <select value={awayTeamOffenseRank} onChange={(e) => setAwayTeamOffenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {awayTeamOffenseRank !== 'any' && (
                      <select value={awayTeamOffenseStat} onChange={(e) => setAwayTeamOffenseStat(e.target.value)}>
                        <option value="overall">Any</option>
                        <option value="points">Pts</option>
                        <option value="pass">Pass</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <span>Streak</span>
                    <input type="text" inputMode="text" placeholder="-2" value={awayStreak} onChange={(e) => setAwayStreak(e.target.value)} />
                  </div>
                </div>
                
                {/* Home Team Row */}
                <div className={styles.teamRow}>
                  <div className={styles.teamLabel}>Home</div>
                  <div>
                    <span>Defense</span>
                    <select value={homeTeamDefenseRank} onChange={(e) => setHomeTeamDefenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {homeTeamDefenseRank !== 'any' && (
                      <select value={homeTeamDefenseStat} onChange={(e) => setHomeTeamDefenseStat(e.target.value)}>
                        <option value="overall">Any</option>
                        <option value="pass">Pass</option>
                        <option value="rush">Rush</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <span>Offense</span>
                    <select value={homeTeamOffenseRank} onChange={(e) => setHomeTeamOffenseRank(e.target.value)}>
                      <option value="any">Any</option>
                      <option value="top_5">Top 5</option>
                      <option value="top_10">Top 10</option>
                      <option value="top_15">Top 15</option>
                      <option value="bottom_15">Bottom 15</option>
                      <option value="bottom_10">Bottom 10</option>
                      <option value="bottom_5">Bottom 5</option>
                    </select>
                    {homeTeamOffenseRank !== 'any' && (
                      <select value={homeTeamOffenseStat} onChange={(e) => setHomeTeamOffenseStat(e.target.value)}>
                        <option value="overall">Any</option>
                        <option value="points">Pts</option>
                        <option value="pass">Pass</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <span>Streak</span>
                    <input type="text" inputMode="text" placeholder="3" value={streak} onChange={(e) => setStreak(e.target.value)} />
                  </div>
                </div>
                
                {/* Prev Game Margins for O/U */}
                <div className={styles.marginSection}>
                  <span>Prev Game Margin</span>
                  <div className={styles.rangeRow}>
                    <input type="text" inputMode="text" placeholder="Home Min" value={prevGameMarginMin} onChange={(e) => setPrevGameMarginMin(e.target.value)} />
                    <input type="text" inputMode="text" placeholder="Home Max" value={prevGameMarginMax} onChange={(e) => setPrevGameMarginMax(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              className={styles.runBtn}
              onClick={runQuery}
              disabled={loading}
            >
              {loading ? 'Running...' : <><IoRocketOutline /> Run Build</>}
            </button>
            <button
              className={styles.saveBtn}
              onClick={() => setShowSaveModal(true)}
              type="button"
              disabled={!isSignedIn}
              title={!isSignedIn ? 'Sign in to save queries' : 'Save this build'}
            >
              <FiCopy /> Save Build
            </button>
            <button
              className={styles.clearBtn}
              onClick={clearFilters}
              type="button"
            >
              Clear
            </button>
          </div>
          <span className={styles.filtersAppliedCount}>
            Filters applied: {getAppliedFiltersDisplay().length}
          </span>
        </div>

        {/* Results Panel */}
        <div className={styles.resultsPanel}>
          <div className={styles.resultsPanelHeader}>
            <h2>Results</h2>
            <div className={styles.headerActions}>
              {result && (
                <div className={styles.upcomingToggle}>
                  <button
                    className={`${styles.toggleBtn} ${!showUpcoming ? styles.active : ''}`}
                    onClick={() => setShowUpcoming(false)}
                  >
                    Historical
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${showUpcoming ? styles.active : ''}`}
                    onClick={() => setShowUpcoming(true)}
                  >
                    <BsCalendarEvent /> Upcoming
                  </button>
                </div>
              )}
              <button
                className={styles.shareBtn}
                onClick={handleShare}
                title="Copy shareable link"
              >
                {showCopiedToast ? <FiCheck /> : <BsShare />}
                {showCopiedToast ? 'Copied!' : 'Share'}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <HiOutlineXCircle className={styles.errorIcon} /> {error}
            </div>
          )}

          {result && (
            <>
              {/* Header with Image for Props/Teams */}
              {(queryType === 'prop' || queryType === 'team') && (
                <div className={styles.resultHeader}>
                  <div className={styles.resultImageWrapper}>
                    {queryType === 'prop' && selectedPlayer && (
                      <img 
                        src={selectedPlayer.headshot_url || `https://a.espncdn.com/i/headshots/nfl/players/full/${selectedPlayer.espn_player_id}.png`}
                        alt={selectedPlayer.name}
                        className={styles.resultPlayerImage}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/player-placeholder.png' }}
                      />
                    )}
                    {queryType === 'team' && teamLogos[teamId] && (
                      <img 
                        src={teamLogos[teamId]}
                        alt="Team"
                        className={styles.resultTeamImage}
                      />
                    )}
                  </div>
                  <div className={styles.resultHeaderStats}>
                    {queryType === 'prop' && selectedPlayer && (
                      <div className={styles.resultPlayerName}>{selectedPlayer.name}</div>
                    )}
                    {queryType === 'team' && selectedTeam && (
                      <div className={styles.resultPlayerName}>
                        {selectedTeam.name}
                        {selectedVersusTeam && <span className={styles.vsText}> vs {selectedVersusTeam.name}</span>}
                      </div>
                    )}
                    <div className={styles.resultRecord}>
                      {result.hits}-{result.misses}
                      {result.pushes > 0 && <span className={styles.pushes}>-{result.pushes}P</span>}
                    </div>
                    <div className={styles.resultHitRate} data-hot={result.hit_rate >= 55} data-cold={result.hit_rate <= 45}>
                      {result.hit_rate}%
                    </div>
                    <div className={styles.resultGames}>
                      {result.total_games} games
                    </div>
                  </div>
                </div>
              )}

              {/* Main Stats (for non-prop/team) */}
              {queryType !== 'prop' && queryType !== 'team' && (
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>
                      {result.hits}-{result.misses}
                      {result.pushes > 0 && <span className={styles.pushes}>-{result.pushes}P</span>}
                    </div>
                    <div className={styles.statLabel}>Record</div>
                  </div>
                  <div className={`${styles.statCard} ${result.hit_rate >= 55 ? styles.hot : result.hit_rate <= 45 ? styles.cold : ''}`}>
                    <div className={styles.statValue}>{result.hit_rate}%</div>
                    <div className={styles.statLabel}>Hit Rate</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{result.total_games}</div>
                    <div className={styles.statLabel}>Games</div>
                  </div>
                  {result.estimated_roi !== undefined && (
                    <div className={`${styles.statCard} ${result.estimated_roi >= 0 ? styles.hot : styles.cold}`}>
                      <div className={styles.statValue}>
                        {result.estimated_roi >= 0 ? '+' : ''}{result.estimated_roi}%
                      </div>
                      <div className={styles.statLabel}>Est. ROI</div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Stats - varies by bet type */}
              {renderAdditionalStats()}

              {/* Filters Applied */}
              <div className={styles.filtersApplied}>
                <strong>Filters:</strong>
                {getAppliedFiltersDisplay().map((f, i) => (
                  <span key={i} className={styles.filterTag}>{f}</span>
                ))}
              </div>

              {/* Recent Games - only show when not in upcoming mode */}
              {!showUpcoming && (
                <div className={styles.gamesSection}>
                  <h3>Games ({Math.min(visibleGames, result.games?.length || 0)} of {result.games?.length || 0})</h3>
                  <div className={styles.gamesList}>
                    {result.games?.slice(0, visibleGames).map((game, i) => 
                      queryType === 'prop' ? renderPropGameRow(game, i) : renderGameRow(game, i)
                    )}
                  </div>
                  
                  {/* Load More Button */}
                  {result.games && visibleGames < result.games.length && (
                    <button 
                      className={styles.loadMoreBtn}
                      onClick={() => setVisibleGames(prev => prev + 10)}
                    >
                      Load Next 10 →
                    </button>
                  )}
                  
                  {/* Query Time */}
                  <div className={styles.queryTimeFooter}>
                    Query: {result.query_time_ms}ms
                  </div>
                </div>
              )}

              {/* Upcoming Games Section */}
              {showUpcoming && (
                <div className={styles.upcomingSection}>
                  <div className={styles.upcomingHeader}>
                    <h3>
                      <BsCalendarEvent /> {queryType === 'prop' ? 'Upcoming Props' : 'Upcoming Matchups'} ({queryType === 'prop' ? upcomingResult?.total_props || 0 : upcomingResult?.total_games || 0})
                    </h3>
                  </div>

                  {upcomingLoading && (
                    <div className={styles.upcomingLoading}>
                      Finding upcoming matchups...
                    </div>
                  )}

                  {!upcomingLoading && ((queryType !== 'prop' && upcomingResult?.upcoming_games?.length === 0) || (queryType === 'prop' && upcomingResult?.upcoming_props?.length === 0)) && (
                    <div className={styles.noUpcoming}>
                      {queryType === 'prop' ? 'No upcoming props match your current filters.' : 'No upcoming games match your current filters.'}
                    </div>
                  )}
                  
                  {/* Upcoming Props Display */}
                  {queryType === 'prop' && upcomingResult?.upcoming_props?.map((prop: any, index: number) => {
                    const homeAbbr = prop.home_team_abbr || 'HOME'
                    const awayAbbr = prop.away_team_abbr || 'AWAY'
                    const homeLogo = teamLogos[prop.home_team_id]
                    const awayLogo = teamLogos[prop.away_team_id]
                    
                    // Get relevant defense rank based on filter
                    const defRankValue = defenseStat === 'wr' || defenseStatPosition === 'wr'
                      ? Math.max(prop.home_rank_vs_wr || 99, prop.away_rank_vs_wr || 99)
                      : defenseStat === 'te' || defenseStatPosition === 'te'
                      ? Math.max(prop.home_rank_vs_te || 99, prop.away_rank_vs_te || 99)
                      : defenseStat === 'rb' || defenseStatPosition === 'rb'
                      ? Math.max(prop.home_rank_vs_rb || 99, prop.away_rank_vs_rb || 99)
                      : null
                    
                    const propKey = `${prop.game_id}_${prop.player_name}_${prop.prop_type}_${index}`
                    const isExpanded = expandedUpcomingGameId === propKey
                    
                    return (
                      <div key={propKey} className={styles.upcomingGame}>
                        <div 
                          className={styles.upcomingGameHeader}
                          onClick={() => setExpandedUpcomingGameId(isExpanded ? null : propKey)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={styles.upcomingGameTime}>
                            {formatUpcomingDate(prop.game_time)}
                          </div>
                          
                          <div className={styles.upcomingBetDisplay}>
                            {prop.player_headshot && (
                              <img 
                                src={prop.player_headshot} 
                                alt={prop.player_name}
                                className={styles.upcomingPlayerHeadshot}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            )}
                            <span className={styles.upcomingPlayerName}>{prop.player_name}</span>
                            <span className={styles.upcomingBetLine}>
                              o{prop.line} {prop.prop_type?.replace('player_', '').replace('_', ' ')}
                            </span>
                            <span className={styles.upcomingBetOdds}>
                              ({formatOdds(prop.over_odds)})
                            </span>
                          </div>
                          
                          <div className={styles.upcomingMeta}>
                            <span className={styles.bookSource}>{prop.bookmaker}</span>
                          </div>
                          
                          <MdExpandMore className={`${styles.expandIcon} ${isExpanded ? styles.rotated : ''}`} />
                        </div>
                        
                        {isExpanded && (
                          <div className={styles.upcomingDetails}>
                            {/* Game info */}
                            <div className={styles.upcomingGameInfo}>
                              <div className={styles.upcomingMatchupFull}>
                                {awayLogo && <img src={awayLogo} alt="" className={styles.teamOddsLogo} />}
                                <span>{awayAbbr}</span>
                                <span className={styles.atSymbolSmall}>@</span>
                                {homeLogo && <img src={homeLogo} alt="" className={styles.teamOddsLogo} />}
                                <span>{homeAbbr}</span>
                              </div>
                              <div className={styles.propDetails}>
                                <span>Total: O/U {prop.total_line}</span>
                                <span>Spread: {prop.home_spread > 0 ? `+${prop.home_spread}` : prop.home_spread}</span>
                              </div>
                            </div>
                            
                            {/* All Sportsbooks Lines */}
                            {prop.all_books && prop.all_books.length > 1 && (
                              <div className={styles.allBooksSection}>
                                <div className={styles.allBooksTitle}>All Sportsbook Lines:</div>
                                <div className={styles.allBooksList}>
                                  {prop.all_books.map((book: any, bookIdx: number) => (
                                    <div 
                                      key={bookIdx} 
                                      className={`${styles.bookLineRow} ${book.in_filter_range ? styles.inRange : styles.outOfRange}`}
                                    >
                                      <span className={styles.bookName}>{book.bookmaker}</span>
                                      <span className={styles.bookLine}>o{book.line}</span>
                                      <span className={styles.bookOdds}>({formatOdds(book.over_odds)})</span>
                                      {book.in_filter_range && <span className={styles.matchesBadge}>✓</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Why this fits */}
                            <div className={styles.whyThisFits}>
                              <div className={styles.whyThisFitsTitle}>Why this fits:</div>
                              <div className={styles.whyThisFitsList}>
                                {prop.total_line && totalMin && (
                                  <div className={styles.whyThisFitsItem}>
                                    <FaCheckCircle className={styles.matchCheck} />
                                    <span>Total:</span>
                                    <strong>O/U {prop.total_line} ({totalMin}+ filter)</strong>
                                  </div>
                                )}
                                {defenseRank && defenseRank !== 'any' && defRankValue && (
                                  <div className={styles.whyThisFitsItem}>
                                    <FaCheckCircle className={styles.matchCheck} />
                                    <span>vs Defense:</span>
                                    <strong>
                                      {defenseStat === 'wr' || defenseStatPosition === 'wr' ? 
                                        `#${Math.min(prop.home_rank_vs_wr || 32, prop.away_rank_vs_wr || 32)} D vs WRs` :
                                        defenseStat === 'te' || defenseStatPosition === 'te' ? 
                                        `#${Math.min(prop.home_rank_vs_te || 32, prop.away_rank_vs_te || 32)} D vs TEs` :
                                        `#${Math.min(prop.home_rank_vs_rb || 32, prop.away_rank_vs_rb || 32)} D vs RBs`
                                      }
                                    </strong>
                                  </div>
                                )}
                                <div className={styles.whyThisFitsItem}>
                                  <FaCheckCircle className={styles.matchCheck} />
                                  <span>Line:</span>
                                  <strong>o{prop.line} ({prop.bookmaker})</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {queryType !== 'prop' && upcomingResult?.upcoming_games?.map((game) => {
                    const betDisplay = getUpcomingBetDisplay(game)
                    const matchReasons = getMatchReasons(game)
                    const bestBook = getBestBook(game.books)
                    const isHomeSubject = location !== 'away'
                    
                    return (
                      <div 
                        key={game.game_id} 
                        className={styles.upcomingGame}
                      >
                        {/* Collapsed Header - Shows the BET */}
                        <div 
                          className={styles.upcomingGameHeader}
                          onClick={() => setExpandedUpcomingGameId(
                            expandedUpcomingGameId === game.game_id ? null : game.game_id
                          )}
                        >
                          <div className={styles.upcomingGameTime}>
                            {formatUpcomingDate(game.game_time)}
                          </div>
                          
                          {/* The Bet Display */}
                          <div className={styles.upcomingBetDisplay}>
                            {/* For totals, show both team logos */}
                            {(betDisplay as any)?.isTotal ? (
                              <>
                                <div className={styles.upcomingMatchupLogos}>
                                  {(betDisplay as any)?.awayLogo && (
                                    <img src={(betDisplay as any).awayLogo} alt="" className={styles.upcomingBetLogo} />
                                  )}
                                  <span className={styles.atSymbolSmall}>@</span>
                                  {(betDisplay as any)?.homeLogo && (
                                    <img src={(betDisplay as any).homeLogo} alt="" className={styles.upcomingBetLogo} />
                                  )}
                                </div>
                                <span className={styles.upcomingBetLine}>
                                  {betDisplay?.line}
                                </span>
                              </>
                            ) : (
                              <>
                                {betDisplay?.teamLogo && (
                                  <img src={betDisplay.teamLogo} alt="" className={styles.upcomingBetLogo} />
                                )}
                                <div className={styles.upcomingBetInfo}>
                                  <span className={styles.upcomingBetTeam}>
                                    {betDisplay?.teamAbbr || betDisplay?.teamName}
                                  </span>
                                  <span className={styles.upcomingBetLine}>
                                    {betDisplay?.line}
                                  </span>
                                </div>
                              </>
                            )}
                            {betDisplay?.odds && (
                              <span className={styles.upcomingBetOdds}>
                                ({betDisplay.odds})
                              </span>
                            )}
                          </div>

                          <div className={styles.upcomingMeta}>
                            <span className={styles.bookCount}>{game.books.length} books</span>
                            <span className={styles.bookSource}>{betDisplay?.bookName}</span>
                          </div>
                          
                          <MdExpandMore className={`${styles.expandIcon} ${expandedUpcomingGameId === game.game_id ? styles.rotated : ''}`} />
                        </div>

                        {/* Expanded Details */}
                        {expandedUpcomingGameId === game.game_id && (
                          <div className={styles.upcomingDetails}>
                            {/* Sportsbook-style odds display */}
                            <div className={styles.sportsbookOdds}>
                              {/* Away Team Row */}
                              <div className={`${styles.teamOddsRow} ${!isHomeSubject ? styles.subjectTeam : ''}`}>
                                <div className={styles.teamOddsInfo}>
                                  {teamLogos[game.away_team.id] && (
                                    <img src={teamLogos[game.away_team.id]} alt="" className={styles.teamOddsLogo} />
                                  )}
                                  <span className={styles.teamOddsName}>{game.away_team.abbr}</span>
                                </div>
                                <div className={styles.teamOddsValues}>
                                  <div className={`${styles.oddsCell} ${betType === 'moneyline' && !isHomeSubject ? styles.highlighted : ''}`}>
                                    <span className={styles.oddsLabel}>ML</span>
                                    <span className={styles.oddsValue}>{formatOdds(bestBook?.moneyline.away || 0)}</span>
                                  </div>
                                  <div className={`${styles.oddsCell} ${betType === 'spread' && !isHomeSubject ? styles.highlighted : ''}`}>
                                    <span className={styles.oddsLabel}>Spread</span>
                                    <span className={styles.oddsValue}>
                                      {bestBook?.spread.away > 0 ? '+' : ''}{bestBook?.spread.away}
                                      <small>({formatOdds(bestBook?.spread.away_odds || 0)})</small>
                                    </span>
                                  </div>
                                  <div className={`${styles.oddsCell} ${betType === 'total' ? styles.highlighted : ''}`}>
                                    <span className={styles.oddsLabel}>Over</span>
                                    <span className={styles.oddsValue}>
                                      O {bestBook?.total.line}
                                      <small>({formatOdds(bestBook?.total.over_odds || 0)})</small>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Home Team Row */}
                              <div className={`${styles.teamOddsRow} ${isHomeSubject ? styles.subjectTeam : ''}`}>
                                <div className={styles.teamOddsInfo}>
                                  {teamLogos[game.home_team.id] && (
                                    <img src={teamLogos[game.home_team.id]} alt="" className={styles.teamOddsLogo} />
                                  )}
                                  <span className={styles.teamOddsName}>{game.home_team.abbr}</span>
                                </div>
                                <div className={styles.teamOddsValues}>
                                  <div className={`${styles.oddsCell} ${betType === 'moneyline' && isHomeSubject ? styles.highlighted : ''}`}>
                                    <span className={styles.oddsLabel}>ML</span>
                                    <span className={styles.oddsValue}>{formatOdds(bestBook?.moneyline.home || 0)}</span>
                                  </div>
                                  <div className={`${styles.oddsCell} ${betType === 'spread' && isHomeSubject ? styles.highlighted : ''}`}>
                                    <span className={styles.oddsLabel}>Spread</span>
                                    <span className={styles.oddsValue}>
                                      {bestBook?.spread.home > 0 ? '+' : ''}{bestBook?.spread.home}
                                      <small>({formatOdds(bestBook?.spread.home_odds || 0)})</small>
                                    </span>
                                  </div>
                                  <div className={`${styles.oddsCell} ${betType === 'total' ? styles.highlighted : ''}`}>
                                    <span className={styles.oddsLabel}>Under</span>
                                    <span className={styles.oddsValue}>
                                      U {bestBook?.total.line}
                                      <small>({formatOdds(bestBook?.total.under_odds || 0)})</small>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Why This Matches */}
                            {matchReasons.length > 0 && (
                              <div className={styles.matchReasons}>
                                <div className={styles.matchReasonsTitle}>Why this matches:</div>
                                <div className={styles.matchReasonsList}>
                                  {matchReasons.map((reason, i) => (
                                    <div key={i} className={styles.matchReason}>
                                      <FaCheckCircle className={styles.matchCheck} />
                                      <span>{reason.label}:</span>
                                      <strong>{reason.value}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* More Books */}
                            <details className={styles.moreBooks}>
                              <summary>View all {game.books.length} sportsbooks</summary>
                              <div className={styles.upcomingBooksGrid}>
                                <div className={styles.booksHeader}>
                                  <span>Book</span>
                                  <span>Spread</span>
                                  <span>Total</span>
                                  <span>ML</span>
                                </div>
                                {game.books.map((book, i) => (
                                  <div key={i} className={styles.bookRow}>
                                    <span className={styles.bookName}>{book.bookmaker_title}</span>
                                    <span className={styles.bookSpread}>
                                      {book.spread.home > 0 ? '+' : ''}{book.spread.home}
                                      <small>({formatOdds(book.spread.home_odds)})</small>
                                    </span>
                                    <span className={styles.bookTotal}>
                                      {book.total.line}
                                      <small>({formatOdds(book.total.over_odds)})</small>
                                    </span>
                                    <span className={styles.bookML}>
                                      {formatOdds(book.moneyline.home)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>

                            {/* Badges */}
                            <div className={styles.gameBadges}>
                              {game.is_division_game && <span className={styles.divisionBadge}>Division</span>}
                              {game.is_conference_game && !game.is_division_game && <span className={styles.confBadge}>Conference</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {upcomingResult && (
                    <div className={styles.queryTimeFooter}>
                      Query: {upcomingResult.query_time_ms}ms
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!result && !error && !loading && (
            <div className={styles.placeholder}>
              <p>Configure your build and click "Run Build" to see results</p>
            </div>
          )}
        </div>
      </div>
        )}

      {/* Save Query Modal */}
      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Save Build</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowSaveModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Name *</label>
                <input
                  type="text"
                  value={saveQueryName}
                  onChange={(e) => setSaveQueryName(e.target.value)}
                  placeholder="e.g., 'Chiefs Home Favorites'"
                  autoFocus
                />
              </div>
              <div className={styles.modalField}>
                <label>Description (optional)</label>
                <textarea
                  value={saveQueryDescription}
                  onChange={(e) => setSaveQueryDescription(e.target.value)}
                  placeholder="Add a note about this build..."
                  rows={3}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancel}
                onClick={() => {
                  setShowSaveModal(false)
                  setSaveQueryName('')
                  setSaveQueryDescription('')
                }}
              >
                Cancel
              </button>
              <button
                className={styles.modalSave}
                onClick={handleSaveQuery}
                disabled={savingQuery || !saveQueryName.trim()}
              >
                {savingQuery ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Modal */}
      {showSaveSuccessModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveSuccessModal(false)}>
          <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.successIcon}>
              <FaToolbox />
            </div>
            <h3 className={styles.successTitle}>Your build has been saved!</h3>
            <div className={styles.successButtons}>
              <button
                className={styles.successBtnSecondary}
                onClick={() => {
                  setShowSaveSuccessModal(false)
                  setActiveSection('myBuilds')
                  setSidebarOpen(true)
                }}
              >
                View Builds
              </button>
              <button
                className={styles.successBtnPrimary}
                onClick={() => setShowSaveSuccessModal(false)}
              >
                Keep Building
              </button>
            </div>
          </div>
        </div>
      )}
      </div>{/* mainWrapper */}
    </div>
  )
}

// Wrapper component with Suspense for useSearchParams
export default function SportsEnginePage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a14 0%, #12121e 50%, #0d0d18 100%)',
        color: '#888'
      }}>
        Loading Sports Engine...
      </div>
    }>
      <SportsEngineContent />
    </Suspense>
  )
}
