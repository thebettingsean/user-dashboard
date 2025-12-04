'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import styles from './sports-engine.module.css'

// Icons
import { FaCheckCircle } from "react-icons/fa"
import { HiOutlineXCircle } from "react-icons/hi2"
import { IoMdTrendingUp } from "react-icons/io"
import { IoRocketOutline } from "react-icons/io5"
import { TbTargetArrow } from "react-icons/tb"
import { PiFootballHelmetDuotone, PiChartBarLight, PiMoneyWavy } from "react-icons/pi"
import { GiWhistle, Gi3dGlasses } from "react-icons/gi"
import { MdOutlineTipsAndUpdates, MdOutlineAutoGraph, MdOutlineStadium, MdExpandMore, MdExpandLess } from "react-icons/md"

// Types
type QueryType = 'prop' | 'team' | 'referee' | 'trend'
type TimePeriod = 'L3' | 'L5' | 'L10' | 'L15' | 'L20' | 'L30' | 'season' | 'last_season' | 'L2years' | 'L3years' | 'since_2022'

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
  query_time_ms: number
  filters_applied: string[]
  games: any[]
  error?: string
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
  ],
  RB: [
    { value: 'rush_yards', label: 'Rush Yards' },
    { value: 'rush_tds', label: 'Rush TDs' },
    { value: 'rush_attempts', label: 'Rush Attempts' },
    { value: 'receiving_yards', label: 'Receiving Yards' },
    { value: 'receptions', label: 'Receptions' },
    { value: 'targets', label: 'Targets' },
  ],
  WR: [
    { value: 'receiving_yards', label: 'Receiving Yards' },
    { value: 'receptions', label: 'Receptions' },
    { value: 'receiving_tds', label: 'Receiving TDs' },
    { value: 'targets', label: 'Targets' },
    { value: 'rush_yards', label: 'Rush Yards' },
  ],
  TE: [
    { value: 'receiving_yards', label: 'Receiving Yards' },
    { value: 'receptions', label: 'Receptions' },
    { value: 'receiving_tds', label: 'Receiving TDs' },
    { value: 'targets', label: 'Targets' },
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
  { value: 'targets', label: 'Targets' },
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

export default function SportsEnginePage() {
  const router = useRouter()
  const pathname = usePathname()
  
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
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null)
  
  // Collapsible filter sections
  const [expandedSections, setExpandedSections] = useState({
    matchup: true,
    betting: true,
    teamStats: true
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
  const [defenseRank, setDefenseRank] = useState<string>('any')
  const [defenseStat, setDefenseStat] = useState<string>('pass')
  const [offenseRank, setOffenseRank] = useState<string>('any')
  const [offenseStat, setOffenseStat] = useState<string>('points')
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
  
  // Get available stats based on position (use selected player's position if available)
  const effectivePosition = selectedPlayer?.position || propPosition
  const availablePropStats = PROP_STATS_BY_POSITION[effectivePosition] || PROP_STATS_BY_POSITION['any']
  
  // Navigate to query type URL (seamless transition)
  const navigateToQueryType = (type: QueryType) => {
    const paths: Record<QueryType, string> = {
      trend: '/sports-engine',
      team: '/sports-engine/teams',
      referee: '/sports-engine/referees',
      prop: '/sports-engine/props'
    }
    setQueryType(type) // Update state immediately for instant UI feedback
    router.push(paths[type], { scroll: false }) // Navigate without scroll reset
  }
  
  // Sync query type with URL when path changes (for browser back/forward)
  useEffect(() => {
    const typeFromPath = getQueryTypeFromPath(pathname)
    if (typeFromPath !== queryType) {
      setQueryType(typeFromPath)
    }
  }, [pathname])
  
  // Search players from database
  const searchPlayers = async (query: string, position: string) => {
    if (query.length < 2 && position === 'any') {
      setPlayerSearchResults([])
      return
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
  
  // Helper to check if current bet type is O/U
  const isOUQuery = betType === 'total'

  // Fetch team logos on mount
  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const response = await fetch('/api/clickhouse/team-logos')
        if (!response.ok) {
          console.error('Team logos API returned:', response.status)
          return
        }
        const text = await response.text()
        if (!text || text.startsWith('<!')) {
          console.error('Team logos API returned HTML, not JSON')
          return
        }
        const data = JSON.parse(text)
        if (data.logos) {
          const logoMap: Record<number, string> = {}
          data.logos.forEach((t: { espn_team_id: number; logo_url: string }) => {
            logoMap[t.espn_team_id] = t.logo_url
          })
          setTeamLogos(logoMap)
        }
      } catch (err) {
        console.error('Failed to fetch team logos:', err)
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

  // Build display filters list
  const getAppliedFiltersDisplay = () => {
    const filters: string[] = []
    
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
      if (defenseRank !== 'any') {
        const statLabel = defenseStat === 'overall' ? '' : ` (${defenseStat})`
        filters.push(`vs ${defenseRank.replace('_', ' ')} Defense${statLabel}`)
      }
      if (offenseRank !== 'any') {
        const statLabel = offenseStat === 'overall' ? '' : ` (${offenseStat})`
        filters.push(`vs ${offenseRank.replace('_', ' ')} Offense${statLabel}`)
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
        if (defenseRank !== 'any') {
          filters.vs_defense_rank = defenseRank
          filters.defense_stat = defenseStat
        }
        if (offenseRank !== 'any') {
          filters.vs_offense_rank = offenseRank
          filters.offense_stat = offenseStat
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
        } else {
          body.side = 'home'
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
        body.line = parseFloat(propLine) || 0
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
            <span className={styles.propGameInfo}>vs {opponentAbbr} • {formatDateEST(game.game_date)}</span>
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
      </div>
    )
  }

  // Render game row for Props - shows player vs team with actual stat
  const renderPropGameRow = (game: any, index: number) => {
    const opponentLogo = teamLogos[game.opponent_id]
    const opponentAbbr = NFL_TEAMS.find(t => t.id === game.opponent_id)?.abbr || game.opponent?.substring(0, 3).toUpperCase()
    
    // Find stat label for display
    const statLabel = availablePropStats.find(s => s.value === propStat)?.label || propStat
    
    // Format date - handle various formats
    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      // Remove time portion if present
      const datePart = dateStr.split(' ')[0].split('T')[0]
      // Format as MM/DD
      const parts = datePart.split('-')
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`
      }
      return datePart
    }
    
    // Use player from game data (for position queries) or selected player
    const playerHeadshot = game.player_headshot || 
      (selectedPlayer?.headshot_url || `https://a.espncdn.com/i/headshots/nfl/players/full/${game.player_id || selectedPlayer?.espn_player_id}.png`)
    const playerName = game.player_name || selectedPlayer?.name
    
    const isExpanded = expandedGameId === game.game_id
    
    return (
      <div key={index} className={styles.gameRowWrapper}>
        <div 
          className={`${styles.propGameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
          onClick={() => toggleGameExpanded(game.game_id)}
        >
          <span className={styles.propGameDate}>{formatDate(game.game_date)}</span>
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
            <span className={styles.statType}>{statLabel}</span>
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

  // Helper to format date to EST
  const formatDateEST = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr.replace(' ', 'T') + (dateStr.includes('Z') ? '' : 'Z'))
      return date.toLocaleDateString('en-US', { 
        timeZone: 'America/New_York',
        month: 'numeric',
        day: 'numeric',
        year: '2-digit'
      })
    } catch {
      return dateStr.split('T')[0]
    }
  }

  // Toggle expanded game details
  const toggleGameExpanded = (gameId: number) => {
    setExpandedGameId(prev => prev === gameId ? null : gameId)
  }
  
  // Toggle collapsible filter sections
  const toggleSection = (section: 'matchup' | 'betting' | 'teamStats') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Render expanded game details
  const renderGameDetails = (game: any) => {
    const homeScore = game.home_score || 0
    const awayScore = game.away_score || 0
    const homeAbbr = game.home_abbr || NFL_TEAMS.find(t => t.id === game.home_team_id)?.abbr || 'HOME'
    const awayAbbr = game.away_abbr || NFL_TEAMS.find(t => t.id === game.away_team_id)?.abbr || 'AWAY'
    
    return (
      <div className={styles.gameDetailsExpanded}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Date</span>
          <span className={styles.detailValue}>{formatDateEST(game.game_date)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Final Score</span>
          <span className={styles.detailValue}>
            {awayAbbr} {awayScore} @ {homeAbbr} {homeScore}
          </span>
        </div>
        {game.spread !== undefined && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Spread</span>
            <span className={styles.detailValue}>
              {homeAbbr} {game.spread > 0 ? '+' : ''}{game.spread} / {awayAbbr} {game.spread > 0 ? '-' : '+'}{Math.abs(game.spread)}
            </span>
          </div>
        )}
        {game.total !== undefined && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Total</span>
            <span className={styles.detailValue}>O/U {game.total}</span>
          </div>
        )}
        {game.referee_name && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Referee</span>
            <span className={styles.detailValue}>{game.referee_name}</span>
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
    
    const isExpanded = expandedGameId === game.game_id
    
    if (betType === 'moneyline') {
      // Moneyline: Show both teams + final score (logos only, no abbr)
      return (
        <div key={index} className={styles.gameRowWrapper}>
          <div 
            className={`${styles.gameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
            onClick={() => toggleGameExpanded(game.game_id)}
          >
            <span className={styles.gameDate}>{formatDateEST(game.game_date)}</span>
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
        <div key={index} className={styles.gameRowWrapper}>
          <div 
            className={`${styles.gameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
            onClick={() => toggleGameExpanded(game.game_id)}
          >
            <span className={styles.gameDate}>{formatDateEST(game.game_date)}</span>
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
        <div key={index} className={styles.gameRowWrapper}>
          <div 
            className={`${styles.gameRow} ${game.hit ? styles.hit : styles.miss} ${styles.clickable}`}
            onClick={() => toggleGameExpanded(game.game_id)}
          >
            <span className={styles.gameDate}>{formatDateEST(game.game_date)}</span>
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

  // Render stats based on bet type
  const renderAdditionalStats = () => {
    if (!result) return null

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
            <span>Avg Points:</span>
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
        <h1><Gi3dGlasses className={styles.titleIcon} /> Simple Sports Engine</h1>
        <p>Test historical trends with any filter combination</p>
      </header>

      <div className={styles.layout}>
        {/* Query Builder Panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Query Builder</h2>
            <div className={styles.sportSelector}>
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

              {/* Line (Over) */}
              <div className={styles.propRow}>
                <label>Line (Over)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 5.5 or 250"
                  value={propLine}
                  onChange={(e) => setPropLine(e.target.value)}
                  className={styles.lineInput}
                />
              </div>
            </div>
          )}

          {/* Time Period */}
          <div className={styles.section}>
            <label>Time Period</label>
            <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}>
              {TIME_PERIODS.map((tp) => (
                <option key={tp.value} value={tp.value}>{tp.label}</option>
              ))}
            </select>
          </div>

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
                      <input type="text" inputMode="numeric" placeholder="Min" value={spreadMin} onChange={(e) => setSpreadMin(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="Max" value={spreadMax} onChange={(e) => setSpreadMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>ML Range</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="numeric" placeholder="Min" value={mlMin} onChange={(e) => setMlMin(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="Max" value={mlMax} onChange={(e) => setMlMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>Total Range</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="numeric" placeholder="Min" value={totalMin} onChange={(e) => setTotalMin(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="Max" value={totalMax} onChange={(e) => setTotalMax(e.target.value)} />
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
                      <input type="text" inputMode="numeric" placeholder="Min" value={spreadMoveMin} onChange={(e) => setSpreadMoveMin(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="Max" value={spreadMoveMax} onChange={(e) => setSpreadMoveMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>ML Move</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="numeric" placeholder="Min" value={mlMoveMin} onChange={(e) => setMlMoveMin(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="Max" value={mlMoveMax} onChange={(e) => setMlMoveMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>Total Move</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="numeric" placeholder="Min" value={totalMoveMin} onChange={(e) => setTotalMoveMin(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="Max" value={totalMoveMax} onChange={(e) => setTotalMoveMax(e.target.value)} />
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
            
            {/* Non-O/U: Simple vs Defense/Offense + Streak */}
            {expandedSections.teamStats && !isOUQuery && (
              <>
                {/* Row 1: vs Defense & vs Offense */}
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
                      </select>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Prev Game Margin & W/L Streak */}
                <div className={styles.filterGrid}>
                  <div>
                    <span>Prev Game Margin</span>
                    <div className={styles.rangeRow}>
                      <input type="text" inputMode="numeric" placeholder="Min" value={prevGameMarginMin} onChange={(e) => setPrevGameMarginMin(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="Max" value={prevGameMarginMax} onChange={(e) => setPrevGameMarginMax(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span>W/L Streak</span>
                    <input type="text" inputMode="numeric" placeholder="2 or -2" value={streak} onChange={(e) => setStreak(e.target.value)} />
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
                    <input type="text" inputMode="numeric" placeholder="-2" value={awayStreak} onChange={(e) => setAwayStreak(e.target.value)} />
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
                    <input type="text" inputMode="numeric" placeholder="3" value={streak} onChange={(e) => setStreak(e.target.value)} />
                  </div>
                </div>
                
                {/* Prev Game Margins for O/U */}
                <div className={styles.marginSection}>
                  <span>Prev Game Margin</span>
                  <div className={styles.rangeRow}>
                    <input type="text" inputMode="numeric" placeholder="Home Min" value={prevGameMarginMin} onChange={(e) => setPrevGameMarginMin(e.target.value)} />
                    <input type="text" inputMode="numeric" placeholder="Home Max" value={prevGameMarginMax} onChange={(e) => setPrevGameMarginMax(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Run Query Button */}
          <button
            className={styles.runBtn}
            onClick={runQuery}
            disabled={loading}
          >
            {loading ? 'Running...' : <><IoRocketOutline /> Run Query</>}
          </button>
        </div>

        {/* Results Panel */}
        <div className={styles.resultsPanel}>
          <h2>Results</h2>

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

              {/* Recent Games */}
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
            </>
          )}

          {!result && !error && !loading && (
            <div className={styles.placeholder}>
              <p>Configure your query and click "Run Query" to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
