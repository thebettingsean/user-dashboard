'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '../../../../lib/hooks/useSubscription'
import { generateGameSlug } from '../../../../lib/utils/gameSlug'
import { formatScript } from '../../../../lib/utils/formatScript'
import styles from './dashboard.module.css'
import { FaFireAlt, FaLock, FaWrench } from 'react-icons/fa'
import { FaDice, FaWandMagicSparkles } from 'react-icons/fa6'
import { GiTwoCoins } from 'react-icons/gi'
import { PiMoneyWavy } from 'react-icons/pi'
import { LuArrowBigUpDash } from 'react-icons/lu'
import DiscordWidget from '../../../../components/DiscordWidget'
import AffiliateWidget from '../../../../components/AffiliateWidget'
import MaximizeProfitWidget from '../../../../components/MaximizeProfitWidget'
import TopRatedBooksWidget from '../../../../components/TopRatedBooksWidget'

type TabKey = 'games' | 'picks' | 'scripts' | 'public'

type SubFilterKey =
  | 'upcoming'
  | 'byCapper'
  | 'topProps'
  | 'results'
  | 'scriptsInfo'
  | 'scriptsAbout'
  | 'publicMost'
  | 'publicVegas'
  | 'publicSharp'
  | 'publicAbout'

type SupportedSport = 'nfl' | 'nba'

type SpreadSummary = {
  label: string | null
  homeLine: number | null
  homeOdds: number | null
  awayLine: number | null
  awayOdds: number | null
}

type TotalsSummary = {
  label: string | null
  number: number | null
  overOdds: number | null
  underOdds: number | null
}

type SharpStat = {
  bet_type?: string
  sharpness_level?: string
  stake_pct?: number
}

type RlmStat = {
  bet_type?: string
  percentage?: number
  percentage2?: number
  rlm_strength?: number
  line_movement?: number
  rlm_strength_normalized?: number
}

type PublicMoneySummary = {
  public_money_ml_away_bets_pct?: number | null
  public_money_ml_away_stake_pct?: number | null
  public_money_ml_home_bets_pct?: number | null
  public_money_ml_home_stake_pct?: number | null
  public_money_spread_away_bets_pct?: number | null
  public_money_spread_away_stake_pct?: number | null
  public_money_spread_home_bets_pct?: number | null
  public_money_spread_home_stake_pct?: number | null
  public_money_over_bets_pct?: number | null
  public_money_over_stake_pct?: number | null
  public_money_under_bets_pct?: number | null
  public_money_under_stake_pct?: number | null
  sharp_money_stats?: SharpStat[]
  rlm_stats?: RlmStat[]
  pregame_odds?: Array<Record<string, any>>
  away_team_ml?: number | null
  home_team_ml?: number | null
  away_team_point_spread?: number | null
  home_team_point_spread?: number | null
  top_market?: { label: string; bets: number | null }
}

type TeamTrendsSummary = {
  competitors?: {
    home?: Record<string, any>
    away?: Record<string, any>
    head_to_head?: Record<string, any>
  }
} | null

type GameSummary = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  spread: SpreadSummary | null
  totals: TotalsSummary | null
  moneyline: {
    home: number | null
    away: number | null
  }
  script: {
    strengthLabel: 'Minimal' | 'Above Avg' | 'Strong' | null
    creditsRequired: number | null
    generatedAt: string | null
  }
  picks: {
    total: number
  }
  publicMoney: PublicMoneySummary | null
  teamTrends: TeamTrendsSummary
  propsCount: number
  referee: Record<string, unknown> | null
}

type DashboardPick = {
  id: string
  sport: string
  bettorName: string
  bettorProfileImage: string | null
  bettorProfileInitials: string | null
  betTitle: string
  units: number
  odds: string
  result: string
  gameTime: string
  gameTimeLabel: string
  gameId: string | null
  kickoffUtc: string | null
  awayTeam: string | null
  homeTeam: string | null
  matchup: string
  analysis: string
  bettorRecord: string | null
  bettorWinStreak: number | null
}

type DashboardPropGame = {
  gameId: string
  matchup: string
  kickoff: string
  kickoffLabel: string
  props: Array<{
    id: string
    playerName: string
    team: string | null
    betTitle: string
    line: string
    wins: number | null
    losses: number | null
    record: string | null
    hitRate: number | null
    headshot: string | null
  }>
}

const tabLabels: Record<TabKey, string> = {
  games: 'Games',
  picks: 'Picks',
  scripts: 'Scripts',
  public: 'Public'
}

// Dynamic subfilters based on sport (no props for CFB)
const getSubFilters = (sport: string): Record<TabKey, SubFilterKey[]> => {
  const isCollegeSport = sport === 'college-football' || sport === 'cfb'
  
  return {
    games: [],
    picks: isCollegeSport 
      ? ['upcoming', 'byCapper', 'results'] // No topProps for CFB
      : ['upcoming', 'byCapper', 'topProps', 'results'],
    scripts: ['scriptsInfo', 'scriptsAbout'],
    public: ['publicMost', 'publicVegas', 'publicSharp', 'publicAbout']
  }
}

const subFilterLabels: Record<SubFilterKey, string> = {
  upcoming: 'Upcoming',
  byCapper: 'By Capper',
  topProps: 'Top Props',
  results: 'Results',
  scriptsInfo: 'Powered by Claude & Insider Data',
  scriptsAbout: 'About',
  publicMost: 'Most Public',
  publicVegas: 'Vegas Backed',
  publicSharp: 'Big Money',
  publicAbout: 'About'
}

const sportOptions: Array<{
  id: SupportedSport | 'nhl' | 'college-football' | 'ncaab' | 'mlb' | 'all'
  label: string
  logo: string
  status: 'active' | 'coming-soon' | 'season-over'
}> = [
  {
    id: 'all',
    label: 'All Sports',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6917f63fdc8769f00b25fc23_every%20sport%20in%201-2.svg',
    status: 'active'
  },
  {
    id: 'nfl',
    label: 'NFL',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg',
    status: 'active'
  },
  {
    id: 'nba',
    label: 'NBA',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg',
    status: 'active'
  },
  {
    id: 'nhl',
    label: 'NHL',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg',
    status: 'active'
  },
  {
    id: 'college-football',
    label: 'NCAAF',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ba3d7e3f2bf6ce88f_4.svg',
    status: 'active'
  },
  {
    id: 'ncaab',
    label: 'NCAAB (coming soon)',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b63f708e0881f1517_5.svg',
    status: 'coming-soon'
  },
  {
    id: 'mlb',
    label: 'MLB (season over)',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b3e55c1052977cf37_3.svg',
    status: 'season-over'
  }
]

function formatKickoffDate(isoString: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York'
  }).format(date)
}

function formatOddsUnits(oddsRaw: string, units: number) {
  const normalizedOdds = oddsRaw && oddsRaw.trim().length > 0 ? oddsRaw.trim() : 'EVEN'
  return `${normalizedOdds} | ${units.toFixed(1)}u`
}

function formatOdds(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '--'
  return value > 0 ? `+${value}` : value.toString()
}

function formatLine(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '--'
  return value > 0 ? `+${value}` : value.toString()
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function formatPercentage(value: number | null | undefined) {
  const numeric = toNumber(value)
  if (numeric === null) return '--'
  return `${Math.round(numeric)}%`
}

function getPublicMarkets(game: GameSummary) {
  const pm = game.publicMoney
  if (!pm) return [] as Array<{ id: string; label: string; bets: number | null; stake: number | null; lineMovement: number | null }>

  // Extract RLM stats for line movement
  const rlmStats = Array.isArray(pm.rlm_stats) ? pm.rlm_stats.filter(Boolean) : []
  const getRlmForBetType = (betType: string) => {
    const stat = rlmStats.find((s) => s?.bet_type?.toLowerCase().includes(betType.toLowerCase()))
    return stat?.line_movement !== undefined && stat?.line_movement !== null ? toNumber(stat.line_movement) : null
  }

  const markets: Array<{ id: string; label: string; bets: number | null; stake: number | null; lineMovement: number | null }> = []

  markets.push(
    {
      id: 'ml_away',
      label: `${game.awayTeam} ML`,
      bets: toNumber(pm.public_money_ml_away_bets_pct),
      stake: toNumber(pm.public_money_ml_away_stake_pct),
      lineMovement: getRlmForBetType('moneyline_away')
    },
    {
      id: 'ml_home',
      label: `${game.homeTeam} ML`,
      bets: toNumber(pm.public_money_ml_home_bets_pct),
      stake: toNumber(pm.public_money_ml_home_stake_pct),
      lineMovement: getRlmForBetType('moneyline_home')
    },
    {
      id: 'spread_away',
      label: `${game.awayTeam} Spread`,
      bets: toNumber(pm.public_money_spread_away_bets_pct),
      stake: toNumber(pm.public_money_spread_away_stake_pct),
      lineMovement: getRlmForBetType('spread_away')
    },
    {
      id: 'spread_home',
      label: `${game.homeTeam} Spread`,
      bets: toNumber(pm.public_money_spread_home_bets_pct),
      stake: toNumber(pm.public_money_spread_home_stake_pct),
      lineMovement: getRlmForBetType('spread_home')
    },
    {
      id: 'total_over',
      label: 'Over',
      bets: toNumber(pm.public_money_over_bets_pct),
      stake: toNumber(pm.public_money_over_stake_pct),
      lineMovement: getRlmForBetType('over')
    },
    {
      id: 'total_under',
      label: 'Under',
      bets: toNumber(pm.public_money_under_bets_pct),
      stake: toNumber(pm.public_money_under_stake_pct),
      lineMovement: getRlmForBetType('under')
    }
  )

  return markets.filter((entry) => entry.bets !== null)
}

function getTopPublicMarkets(game: GameSummary, limit = 3) {
  return getPublicMarkets(game)
    .sort((a, b) => (b.bets ?? -Infinity) - (a.bets ?? -Infinity))
    .slice(0, limit)
}

function getSharpStats(pm: PublicMoneySummary | null | undefined) {
  if (!pm || !Array.isArray(pm.sharp_money_stats)) return []
  return pm.sharp_money_stats.filter(Boolean)
}

function getRlmStats(pm: PublicMoneySummary | null | undefined) {
  if (!pm || !Array.isArray(pm.rlm_stats)) return []
  return pm.rlm_stats.filter(Boolean)
}

function formatRoi(value: unknown) {
  const numeric = toNumber(value)
  if (numeric === null) return '--'
  return `${numeric.toFixed(1)}%`
}

function formatRecord(wins: unknown, losses: unknown) {
  const w = toNumber(wins)
  const l = toNumber(losses)
  if (w === null && l === null) return '--'
  return `${w ?? 0}-${l ?? 0}`
}

function extractTeamTrend(trends: TeamTrendsSummary, side: 'home' | 'away') {
  if (!trends?.competitors) return null
  const entry = trends.competitors[side] as any
  if (!entry) return null

  const statsKey = side === 'home' ? 'stats_as_home' : 'stats_as_away'
  const stats = entry?.[statsKey] ?? entry?.team_stats ?? null
  if (!stats) return null

  const moneyline = stats.moneyline ?? entry?.team_stats?.moneyline ?? null
  const spread = stats.spread ?? entry?.team_stats?.spread ?? null
  const overUnder = stats.over_under ?? entry?.team_stats?.over_under ?? null

  return {
    moneyline,
    spread,
    overUnder
  }
}

function formatBetTypeLabel(betType: string | undefined, game: GameSummary) {
  if (!betType) return 'Market'
  switch (betType) {
    case 'moneyline_home':
      return `${game.homeTeam} ML`
    case 'moneyline_away':
      return `${game.awayTeam} ML`
    case 'spread_home':
      return `${game.homeTeam} Spread`
    case 'spread_away':
      return `${game.awayTeam} Spread`
    case 'over':
      return 'Over'
    case 'under':
      return 'Under'
    default:
      return betType.replace(/_/g, ' ')
  }
}

function formatPublicCardDate(isoString: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  }).format(date)
}

function getMostPublicScore(game: GameSummary) {
  const markets = getPublicMarkets(game)
  if (markets.length === 0) return -Infinity
  return Math.max(
    ...markets.map((market) => Math.max(market.bets ?? -Infinity, market.stake ?? -Infinity))
  )
}

function getBigMoneyStats(game: GameSummary) {
  return getPublicMarkets(game)
    .map((market) => {
      const bets = toNumber(market.bets)
      const stake = toNumber(market.stake)
      const diff = stake !== null && bets !== null ? stake - bets : null
      return {
        id: market.id,
        label: market.label,
        bets,
        stake,
        diff
      }
    })
    .filter((entry) => entry.diff !== null && entry.diff > 0)
    .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
}

interface DashboardLayoutProps {
  sport: string
  initialTab: TabKey
  initialFilter?: SubFilterKey
}

export default function DashboardLayout({ sport, initialTab, initialFilter }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Auth hooks
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed, isLoading: subLoading } = useSubscription()
  
  // Map URL slug to internal sport code (college-football → cfb for API calls)
  const mapSportSlug = (slug: string): string => {
    if (slug === 'college-football') return 'cfb'
    return slug
  }
  
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [activeSport, setActiveSport] = useState<SupportedSport>(sport.toLowerCase() as SupportedSport)
  const [games, setGames] = useState<GameSummary[]>([])
  const [spotlightGameId, setSpotlightGameId] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [picks, setPicks] = useState<DashboardPick[]>([])
  const [picksLoading, setPicksLoading] = useState(false)
  const [picksError, setPicksError] = useState(false)
  const [topPropsGames, setTopPropsGames] = useState<DashboardPropGame[]>([])
  const [topPropsLoading, setTopPropsLoading] = useState(false)
  const [topPropsError, setTopPropsError] = useState(false)
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set())
  const [loadingScripts, setLoadingScripts] = useState<Set<string>>(new Set())
  const [scriptContent, setScriptContent] = useState<Map<string, string>>(new Map())
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(new Set())
  const [isSportMenuOpen, setIsSportMenuOpen] = useState(false)
  const sportMenuRef = useRef<HTMLDivElement>(null)
  
  // Toolkit state - detect from URL
  const isToolkitOpen = searchParams?.get('toolkit') === 'true'
  
  // Featured game specific state (for desktop enhanced view)
  const [featuredGamePicks, setFeaturedGamePicks] = useState<DashboardPick[]>([])
  const [featuredGamePicksLoading, setFeaturedGamePicksLoading] = useState(false)
  
  // Determine if user has access
  const hasAccess = isSubscribed

  // Get dynamic subfilters based on sport
  const subFilters = getSubFilters(activeSport)

  const getDefaultFilter = (tab: TabKey): SubFilterKey | undefined => subFilters[tab][0]

  const [activeFilter, setActiveFilter] = useState<SubFilterKey>(
    initialFilter || (getDefaultFilter(initialTab) ?? 'upcoming')
  )

  const availableFilters = subFilters[activeTab] ?? []

  const handleTabSelect = (tab: TabKey) => {
    // Map tab keys to route paths
    const tabRoutes: Record<TabKey, string> = {
      games: 'games',
      picks: 'picks',
      scripts: 'ai-scripts',
      public: 'public-betting'
    }
    
    const route = tabRoutes[tab]
    
    // Set default filter for public tab
    if (tab === 'public') {
      setActiveFilter('publicMost')
    } else {
      const defaultFilter = getDefaultFilter(tab)
      if (defaultFilter) setActiveFilter(defaultFilter)
    }
    
    // Close toolkit when switching tabs
    router.push(`/sports/${activeSport}/${route}`)
  }

  const handleToolkitToggle = () => {
    if (isToolkitOpen) {
      // Close toolkit - remove query param
      router.push(pathname || `/sports/${activeSport}`)
    } else {
      // Open toolkit - add query param
      const currentPath = pathname || `/sports/${activeSport}`
      router.push(`${currentPath}?toolkit=true`)
    }
  }

  const upcomingGames = useMemo(() => {
    // Show all games - no filtering based on kickoff time
    console.log(`Total games available: ${games.length}`)
    return games
  }, [games])

  const sortedGames = useMemo(() => {
    return [...upcomingGames].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
  }, [upcomingGames])

  const featuredGame = useMemo(() => {
    if (sortedGames.length === 0) return undefined
    
    // Prioritize: 1) Most picks, 2) Strongest data, 3) Earliest kickoff
    return [...sortedGames].sort((a, b) => {
      const picksB = b.picks.total ?? 0
      const picksA = a.picks.total ?? 0
      
      // First priority: Most active picks
      if (picksB !== picksA) {
        return picksB - picksA
      }
      
      // Second priority: Strongest data (if no picks or tied)
      const dataCountA = (a.publicMoney ? 1 : 0) + (a.referee ? 1 : 0) + (a.teamTrends ? 1 : 0) + (a.propsCount > 0 ? 1 : 0)
      const dataCountB = (b.publicMoney ? 1 : 0) + (b.referee ? 1 : 0) + (b.teamTrends ? 1 : 0) + (b.propsCount > 0 ? 1 : 0)
      if (dataCountB !== dataCountA) {
        return dataCountB - dataCountA
      }
      
      // Third priority: Earliest kickoff (soonest game)
      return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
    })[0]
  }, [sortedGames])

  const activeGame = useMemo(() => {
    if (featuredGame && (!selectedGameId || selectedGameId === featuredGame.id)) {
      return featuredGame
    }
    if (!selectedGameId) return sortedGames[0]
    return sortedGames.find((game) => game.id === selectedGameId) || sortedGames[0]
  }, [sortedGames, selectedGameId, featuredGame])

  useEffect(() => {
    if (featuredGame && !selectedGameId) {
      setSelectedGameId(featuredGame.id)
    }
  }, [featuredGame, selectedGameId])

  const isByCapper = activeFilter === 'byCapper'

  const picksByCapper = useMemo(() => {
    if (!isByCapper) return [] as Array<{ name: string; record: string | null; winStreak: number | null; picks: DashboardPick[] }>

    const groups = new Map<string, { record: string | null; winStreak: number | null; picks: DashboardPick[] }>()

    picks.forEach((pick) => {
      const key = pick.bettorName || 'Insider'
      const existing = groups.get(key)
      if (existing) {
        existing.record = existing.record ?? pick.bettorRecord ?? null
        existing.winStreak = existing.winStreak ?? pick.bettorWinStreak ?? null
        existing.picks.push(pick)
      } else {
        groups.set(key, {
          record: pick.bettorRecord ?? null,
          winStreak: pick.bettorWinStreak ?? null,
          picks: [pick]
        })
      }
    })

    return Array.from(groups.entries())
      .map(([name, data]) => ({
        name,
        record: data.record && data.record.trim().length > 0 ? data.record.trim() : null,
        winStreak: typeof data.winStreak === 'number' && !Number.isNaN(data.winStreak) ? data.winStreak : null,
        picks: [...data.picks].sort((a, b) => b.units - a.units)
      }))
      .sort((a, b) => {
        const streakDiff = (b.winStreak ?? 0) - (a.winStreak ?? 0)
        if (streakDiff !== 0) return streakDiff
        const pickCountDiff = b.picks.length - a.picks.length
        if (pickCountDiff !== 0) return pickCountDiff
        return a.name.localeCompare(b.name)
      })
  }, [isByCapper, picks])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isSportMenuOpen && sportMenuRef.current && !sportMenuRef.current.contains(event.target as Node)) {
        setIsSportMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isSportMenuOpen])

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)

    const controller = new AbortController()

    async function loadGameHubData() {
      try {
        const apiSport = mapSportSlug(activeSport)
        const response = await fetch(`/api/dashboard/game-hub?sport=${apiSport}`, {
          signal: controller.signal,
          cache: 'no-store'
        })

        if (!response.ok) {
          throw new Error(`Game hub API returned ${response.status}`)
        }

        const data = await response.json()
        const fetchedGames: GameSummary[] = data.games || []
        console.log(`[${activeSport.toUpperCase()}] Fetched ${fetchedGames.length} games`)
        setGames(fetchedGames)
        setSpotlightGameId(data.spotlightGameId || null)
        setExpandedAnalysis(new Set())

        const upcoming = fetchedGames.filter((game) => new Date(game.kickoff).getTime() >= Date.now())
        if (data.spotlightGameId && upcoming.some((game) => game.id === data.spotlightGameId)) {
          setSelectedGameId(data.spotlightGameId)
        } else if (upcoming.length > 0) {
          setSelectedGameId(upcoming[0].id)
        } else if (fetchedGames.length > 0) {
          setSelectedGameId(fetchedGames[0].id)
        } else {
          setSelectedGameId('')
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load game hub data:', error)
          setHasError(true)
          setGames([])
          setSelectedGameId('')
          setSpotlightGameId(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadGameHubData()

    return () => {
      controller.abort()
    }
  }, [activeSport])

  useEffect(() => {
    if (activeTab !== 'picks') return

    setPicksLoading(true)
    setPicksError(false)
    setExpandedAnalysis(new Set())

    const controller = new AbortController()

    async function loadPicks() {
      try {
        const apiSport = mapSportSlug(activeSport)
        const response = await fetch(
          `/api/dashboard/picks?sport=${apiSport}&filter=${activeFilter}`,
          {
            signal: controller.signal,
            cache: 'no-store'
          }
        )

        if (!response.ok) {
          throw new Error(`Picks API returned ${response.status}`)
        }

        const data = await response.json()
        setPicks(data.picks || [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load picks data:', error)
          setPicksError(true)
          setPicks([])
        }
      } finally {
        setPicksLoading(false)
      }
    }

    loadPicks()

    return () => {
      controller.abort()
    }
  }, [activeTab, activeFilter, activeSport])

  // Load featured game picks and auto-generate script (for desktop enhanced view)
  useEffect(() => {
    if (!featuredGame || activeTab !== 'games') return

    const controller = new AbortController()

    async function loadFeaturedGameData() {
      setFeaturedGamePicksLoading(true)

      try {
        // Load picks for featured game
        const apiSport = mapSportSlug(activeSport)
        const picksResponse = await fetch(
          `/api/dashboard/picks?sport=${apiSport}&filter=upcoming`,
          {
            signal: controller.signal,
            cache: 'no-store'
          }
        )

        if (picksResponse.ok) {
          const picksData = await picksResponse.json()
          const allPicks = picksData.picks || []
          // Filter to only picks for the featured game
          const gamePicks = allPicks.filter((pick: DashboardPick) => pick.gameId === featuredGame.id)
          setFeaturedGamePicks(gamePicks.slice(0, 3)) // Top 3 picks
        }

        // Auto-generate script for subscribed users only
        if (hasAccess && !scriptContent.has(featuredGame.id)) {
          await handleGenerateScript(featuredGame.id)
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load featured game data:', error)
          setFeaturedGamePicks([])
        }
      } finally {
        setFeaturedGamePicksLoading(false)
      }
    }

    loadFeaturedGameData()

    return () => {
      controller.abort()
    }
  }, [featuredGame, activeTab, activeSport, hasAccess])

  useEffect(() => {
    if (activeTab !== 'picks' || activeFilter !== 'topProps') return

    setTopPropsLoading(true)
    setTopPropsError(false)

    const controller = new AbortController()

    async function loadTopProps() {
      try {
        const apiSport = mapSportSlug(activeSport)
        const response = await fetch(`/api/dashboard/props?sport=${apiSport}`, {
          signal: controller.signal,
          cache: 'no-store'
        })

        if (!response.ok) {
          throw new Error(`Props API returned ${response.status}`)
        }

        const data = await response.json()
        setTopPropsGames(data.props || [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load props data:', error)
          setTopPropsError(true)
          setTopPropsGames([])
        }
      } finally {
        setTopPropsLoading(false)
      }
    }

    loadTopProps()

    return () => controller.abort()
  }, [activeTab, activeFilter, activeSport])

  const renderPlaceholder = (message: string) => <div className={styles.placeholder}>{message}</div>

  // Bettor Profile Image Component
  const BettorProfileImage = ({ 
    imageUrl, 
    initials, 
    size = 32 
  }: { 
    imageUrl: string | null; 
    initials: string | null; 
    size?: number 
  }) => {
    const [imgError, setImgError] = useState(false)
    
    const showInitials = !imageUrl || imgError
    
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: showInitials 
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))'
            : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {showInitials ? (
          <span style={{ 
            color: 'white', 
            fontSize: `${size * 0.4}px`, 
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {initials || '?'}
          </span>
        ) : (
          <img
            src={imageUrl}
            alt="Profile"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
      </div>
    )
  }

  const handleGenerateScript = async (gameId: string) => {
    // If already loaded, toggle expand/collapse
    if (scriptContent.has(gameId)) {
      setExpandedScripts((prev) => {
        const next = new Set(prev)
        if (next.has(gameId)) {
          next.delete(gameId)
        } else {
          next.add(gameId)
        }
        return next
      })
      return
    }

    // If already loading, expand it
    if (loadingScripts.has(gameId)) {
      setExpandedScripts((prev) => new Set(prev).add(gameId))
      return
    }

    // Start loading FIRST (to show user feedback)
    setLoadingScripts((prev) => new Set(prev).add(gameId))
    setExpandedScripts((prev) => new Set(prev).add(gameId))

    try {
      // Check authentication after showing loading
      if (!isSignedIn) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        setScriptContent((prev) => new Map(prev).set(gameId, 
          '⚠️ **Sign In Required**\n\nOops! You need to sign in to generate AI scripts.\n\n[Click here to sign in and start your $1 trial](/pricing)'
        ))
        setLoadingScripts((prev) => {
          const next = new Set(prev)
          next.delete(gameId)
          return next
        })
        
        setTimeout(() => {
          openSignUp({ redirectUrl: '/pricing' })
        }, 500)
        return
      }

      // Check subscription access
      if (!hasAccess) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        setScriptContent((prev) => new Map(prev).set(gameId, 
          '🔒 **Subscription Required**\n\nOops! You don\'t have an active subscription.\n\nPlease sign in or start your $1 trial to generate AI scripts.\n\n[Start $1 Trial Now](/pricing)'
        ))
        setLoadingScripts((prev) => {
          const next = new Set(prev)
          next.delete(gameId)
          return next
        })
        
        setTimeout(() => {
          router.push('/pricing')
        }, 500)
        return
      }

      // Fetch the actual script (using same approach as game-specific script page)
      const apiSport = mapSportSlug(activeSport)
      console.log(`📜 Fetching script: gameId=${gameId}, activeSport=${activeSport}, apiSport=${apiSport}`)
      
      const response = await fetch(`/api/scripts/${gameId}?sport=${apiSport}`, {
        cache: 'no-store'
      })
      
      console.log(`📡 Script API response: status=${response.status}, ok=${response.ok}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Script API failed: ${response.status} - ${errorText}`)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      
      // Log for debugging
      console.log(`✅ Script data received:`, {
        hasScript: !!data.script,
        scriptLength: data.script?.length || 0,
        strength: data.strength,
        generatedAt: data.generatedAt
      })

      // Handle response exactly like the game-specific script page does
      if (data.script) {
        setScriptContent((prev) => new Map(prev).set(gameId, data.script))
      } else {
        // No script available yet
        setScriptContent((prev) => new Map(prev).set(gameId, 
          '📝 **Script Not Ready Yet**\n\nThis game script hasn\'t been generated yet. Our AI generates scripts closer to game time when more data is available.\n\nCheck back later for the full analysis!'
        ))
      }
    } catch (error: any) {
      console.error('❌ Script generation error:', error)
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        gameId,
        activeSport
      })
      setScriptContent((prev) => new Map(prev).set(gameId, 
        '❌ **Error Loading Script**\n\nUnable to load the script right now. Please try again in a moment.\n\nIf the problem persists, contact support.'
      ))
    } finally {
      setLoadingScripts((prev) => {
        const next = new Set(prev)
        next.delete(gameId)
        return next
      })
    }
  }

  // Helper to render public betting splits for desktop featured game
  const renderFeaturedPublicBetting = (game: GameSummary) => {
    const pm = game.publicMoney
    if (!pm) return null

    // Get the most public ML (by stake %)
    const mlOptions = [
      { label: `${game.homeTeam} ML`, bets: pm.public_money_ml_home_bets_pct, stake: pm.public_money_ml_home_stake_pct },
      { label: `${game.awayTeam} ML`, bets: pm.public_money_ml_away_bets_pct, stake: pm.public_money_ml_away_stake_pct }
    ].filter(m => m.stake !== null && m.stake !== undefined)
    const topML = mlOptions.sort((a, b) => (b.stake || 0) - (a.stake || 0))[0]

    // Get the most public Spread (by stake %)
    const spreadOptions = [
      { label: `${game.homeTeam} Spread`, bets: pm.public_money_spread_home_bets_pct, stake: pm.public_money_spread_home_stake_pct },
      { label: `${game.awayTeam} Spread`, bets: pm.public_money_spread_away_bets_pct, stake: pm.public_money_spread_away_stake_pct }
    ].filter(m => m.stake !== null && m.stake !== undefined)
    const topSpread = spreadOptions.sort((a, b) => (b.stake || 0) - (a.stake || 0))[0]

    // Get the most public O/U (by stake %)
    const ouOptions = [
      { label: 'Over', bets: pm.public_money_over_bets_pct, stake: pm.public_money_over_stake_pct },
      { label: 'Under', bets: pm.public_money_under_bets_pct, stake: pm.public_money_under_stake_pct }
    ].filter(m => m.stake !== null && m.stake !== undefined)
    const topOU = ouOptions.sort((a, b) => (b.stake || 0) - (a.stake || 0))[0]

    const topMarkets = [topML, topSpread, topOU].filter(Boolean)
    if (topMarkets.length === 0) return null

    return (
      <div style={{ marginTop: '16px' }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(226, 232, 240, 0.8)',
          marginBottom: '10px'
        }}>
          Most Public Bets
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topMarkets.map((market, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600,
                color: 'rgba(226, 232, 240, 0.85)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{market!.label}</span>
                <span style={{ color: '#81e7ff' }}>
                  {formatPercentage(market!.stake)} $ · {formatPercentage(market!.bets)} bets
                </span>
              </div>
              <div style={{ 
                height: '6px', 
                borderRadius: '999px',
                background: 'rgba(148, 163, 184, 0.25)',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${market!.stake}%`,
                  background: 'linear-gradient(90deg, #22d3ee, #6366f1)'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderGamesView = () => {
    if (isLoading) {
      return renderPlaceholder('Loading live data...')
    }

    if (hasError) {
      return renderPlaceholder('Unable to load games. Try again shortly.')
    }

    if (sortedGames.length === 0) {
      return renderPlaceholder('No games found for this sport.')
    }

    // Use featuredGame for display (not activeGame) to avoid mismatch
    const displayGame = featuredGame || sortedGames[0]
    if (!displayGame) {
      return renderPlaceholder('No games available.')
    }

    const topMarkets = getTopPublicMarkets(displayGame, 3)
    const strongestDataCount = (displayGame.publicMoney ? 1 : 0) + (displayGame.referee ? 1 : 0) + (displayGame.teamTrends ? 1 : 0) + (displayGame.propsCount > 0 ? 1 : 0)
    const featuredStats = [
      { label: 'Script Strength', value: displayGame.script.strengthLabel ?? 'Minimal' },
      { label: 'Active Picks', value: `${displayGame.picks.total}` },
      {
        label: 'Most Public',
        value: (() => {
          const tm = displayGame.publicMoney?.top_market
          if (!tm) return 'Waiting'
          if (tm.label === 'over' || tm.label === 'under') {
            return `${tm.label.charAt(0).toUpperCase()}${tm.label.slice(1)} · ${formatPercentage(tm.bets)}`
          }
          const teamLabel = tm.label === 'home' ? displayGame.homeTeam : displayGame.awayTeam
          return `${teamLabel} · ${formatPercentage(tm.bets)}`
        })()
      },
      { label: 'Game Data', value: `${strongestDataCount}/4 retrieved` }
    ]
    
    // Determine if this is a college sport
    const isCollegeSport = activeSport === 'college-football' || activeSport === 'cfb'
    
    // Get official name (referee for pro sports, coach for college)
    let officialName = 'TBD'
    let officialLabel = 'Referee'
    
    if (isCollegeSport) {
      // For CFB, show away coach at home coach
      const coaching = (displayGame as any).coaching
      const awayCoach = coaching?.away?.ATS?.coach || 'TBD'
      const homeCoach = coaching?.home?.ATS?.coach || 'TBD'
      officialName = `${awayCoach} at ${homeCoach}`
      officialLabel = 'Coaches'
    } else {
      // For pro sports, show referee
      officialName = (displayGame.referee as any)?.referee_name || 'Ref TBD'
      officialLabel = 'Referee'
    }

    const handleGameClick = (game: GameSummary) => {
      const slug = generateGameSlug(game.awayTeam, game.homeTeam, game.kickoff)
      router.push(`/sports/${activeSport}/games/${slug}/data`)
    }

    const featuredScript = scriptContent.get(displayGame.id)
    const isScriptLoading = loadingScripts.has(displayGame.id)

    return (
      <div className={styles.gameContent}>
        {/* MOBILE FEATURED GAME - Keep original compact design */}
        <div 
          className={`${styles.featuredWrapper} ${styles.featuredWrapperMobile} ${featuredGame && featuredGame.id === displayGame.id ? styles.featuredActive : ''}`}
          onClick={() => handleGameClick(displayGame)}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.featuredTitle}>Featured Game</div>
          <div className={styles.featuredSeparator} />
          <div className={styles.featuredMatchup}>
            {displayGame.awayTeamLogo && (
              <div className={styles.featuredLogoWrapper}>
                <img src={displayGame.awayTeamLogo} alt={displayGame.awayTeam} className={styles.featuredLogo} />
                {isCollegeSport && (displayGame as any).awayTeamRank && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)'
                  }}>
                    #{(displayGame as any).awayTeamRank}
                  </div>
                )}
              </div>
            )}
            <span className={styles.featuredVs}>@</span>
            {displayGame.homeTeamLogo && (
              <div className={styles.featuredLogoWrapper}>
                <img src={displayGame.homeTeamLogo} alt={displayGame.homeTeam} className={styles.featuredLogo} />
                {isCollegeSport && (displayGame as any).homeTeamRank && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)'
                  }}>
                    #{(displayGame as any).homeTeamRank}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className={styles.featuredDate}>{formatKickoffDate(displayGame.kickoff)} · {displayGame.kickoffLabel}</div>
          <div className={styles.featuredStatGrid}>
            {featuredStats.map((stat) => (
              <div key={stat.label} className={styles.featuredStat}>
                <span className={styles.featuredStatLabel}>{stat.label}</span>
                <span className={styles.featuredStatValue}>{stat.value}</span>
              </div>
            ))}
          </div>
          {(activeSport === 'nfl' || activeSport === 'nba') && (
            <div className={styles.featuredRef}>{officialLabel} · {officialName}</div>
          )}
        </div>

        {/* DESKTOP FEATURED GAME - Enhanced information-dense design */}
        <div 
          className={`${styles.featuredWrapper} ${styles.featuredWrapperDesktop} ${featuredGame && featuredGame.id === displayGame.id ? styles.featuredActive : ''}`}
          onClick={() => handleGameClick(displayGame)}
          style={{ cursor: 'pointer' }}
        >
          {/* Header */}
          <div className={styles.featuredTitle}>Featured Game</div>
          <div className={styles.featuredSeparator} />
          
          {/* Teams & Date */}
          <div className={styles.featuredMatchup}>
            {displayGame.awayTeamLogo && (
              <div className={styles.featuredLogoWrapper}>
                <img src={displayGame.awayTeamLogo} alt={displayGame.awayTeam} className={styles.featuredLogo} />
                {isCollegeSport && (displayGame as any).awayTeamRank && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)'
                  }}>
                    #{(displayGame as any).awayTeamRank}
                  </div>
                )}
              </div>
            )}
            <span className={styles.featuredVs}>@</span>
            {displayGame.homeTeamLogo && (
              <div className={styles.featuredLogoWrapper}>
                <img src={displayGame.homeTeamLogo} alt={displayGame.homeTeam} className={styles.featuredLogo} />
                {isCollegeSport && (displayGame as any).homeTeamRank && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)'
                  }}>
                    #{(displayGame as any).homeTeamRank}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className={styles.featuredDate}>{formatKickoffDate(displayGame.kickoff)} · {displayGame.kickoffLabel}</div>
          
          {/* Referee/Coach (NFL/NBA only) */}
          {(activeSport === 'nfl' || activeSport === 'nba') && (
            <div className={styles.featuredRef} style={{ marginBottom: '8px' }}>{officialLabel} · {officialName}</div>
          )}

          {/* Public Betting Splits */}
          {renderFeaturedPublicBetting(displayGame)}

          {/* Top 3 Picks */}
          {featuredGamePicks.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(226, 232, 240, 0.8)',
                marginBottom: '10px'
              }}>
                Active Picks ({featuredGamePicks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {featuredGamePicks.map((pick) => (
                  <div key={pick.id} style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {/* Bettor Image */}
                    <BettorProfileImage 
                      imageUrl={pick.bettorProfileImage}
                      initials={pick.bettorProfileInitials}
                      size={36}
                    />
                    {/* Bet Title */}
                    <div style={{ 
                      flex: 1,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#f8fafc',
                      lineHeight: '1.4'
                    }}>
                      {pick.betTitle}
                    </div>
                    {/* Units */}
                    <span style={{ 
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(129, 140, 248, 0.35)',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      color: '#c7d2fe',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {pick.units}U
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game Script */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(226, 232, 240, 0.8)',
              marginBottom: '10px'
            }}>
              AI Game Script
            </div>
            
            {/* Show actual script for subscribed users */}
            {hasAccess && featuredScript && (
              <div 
                style={{ 
                  color: 'rgba(226, 232, 240, 0.9)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
                dangerouslySetInnerHTML={{ __html: formatScript(featuredScript) }}
              />
            )}
            
            {/* Loading state */}
            {hasAccess && isScriptLoading && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                </div>
              </div>
            )}
            
            {/* Blurred preview + CTA for non-subscribed users */}
            {!hasAccess && (
              <div style={{ position: 'relative' }}>
                {/* Blurred preview text */}
                <div style={{
                  filter: 'blur(8px)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  color: 'rgba(226, 232, 240, 0.6)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '12px'
                }}>
                  <p><strong>Game Analysis</strong></p>
                  <p>This matchup features two teams with contrasting styles. The home team enters with momentum from their recent performances, while the visitors look to exploit key matchups.</p>
                  <p><strong>Key Factors</strong></p>
                  <p>Public betting is heavily favoring one side, creating potential value on the other. The referee's tendencies and recent team trends suggest interesting betting opportunities.</p>
                  <p><strong>Recommendation</strong></p>
                  <p>Based on our comprehensive analysis of betting data, team statistics, and market inefficiencies...</p>
                </div>
                
                {/* Overlay CTA */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(12, 20, 37, 0.95)',
                  border: '1px solid rgba(129, 140, 248, 0.4)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  textAlign: 'center',
                  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '12px', fontWeight: 600 }}>
                    🔒 Unlock AI Game Scripts
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isSignedIn) {
                        router.push('/pricing')
                      } else {
                        openSignUp({ redirectUrl: '/pricing' })
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #6366f1, #0ea5e9)',
                      border: 'none',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    {isSignedIn ? 'Start $1 Trial' : 'Sign Up - $1 Trial'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.gameList}>
          {sortedGames
            .filter((game) => !featuredGame || game.id !== featuredGame.id)
            .map((game) => {
            const dataCount = (game.publicMoney ? 1 : 0) + (game.referee ? 1 : 0) + (game.teamTrends ? 1 : 0) + (game.propsCount > 0 ? 1 : 0)
            return (
              <div
                key={game.id}
                className={styles.gameCard}
                onClick={() => handleGameClick(game)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.sbRow}>
                  <div className={styles.sbTeamRow}>
                    {game.awayTeamLogo && <img src={game.awayTeamLogo} alt={game.awayTeam} className={styles.sbLogo} />}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      {/* Ranking badge for away team (CFB only) - bottom-right of team name */}
                      {isCollegeSport && (game as any).awayTeamRank && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-8px',
                          right: '-2px',
                          background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                          color: 'white',
                          fontSize: '8px',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: '0 1px 4px rgba(234, 88, 12, 0.4)',
                          lineHeight: '1',
                          zIndex: 1
                        }}>
                          #{(game as any).awayTeamRank}
                        </div>
                      )}
                      <span className={styles.sbTeamName}>{game.awayTeam}</span>
                    </div>
                  </div>
                  <div className={styles.sbRight}>
                    <span 
                      className={styles.sbPill}
                      style={game.picks.total > 0 ? {
                        background: 'rgba(234, 88, 12, 0.25)',
                        borderColor: 'rgba(251, 146, 60, 0.5)',
                        color: 'rgba(251, 146, 60, 0.95)'
                      } : {}}
                    >
                      Picks {game.picks.total}
                    </span>
                    <span 
                      className={styles.sbPill}
                      style={dataCount === 4 ? {
                        background: 'rgba(30, 58, 138, 0.35)',
                        borderColor: 'rgba(96, 165, 250, 0.5)',
                        color: 'rgba(147, 197, 253, 0.95)'
                      } : {}}
                    >
                      Data {dataCount}/4
                    </span>
                  </div>
                </div>
                <div className={styles.sbRow}>
                  <div className={styles.sbTeamRow}>
                    {game.homeTeamLogo && <img src={game.homeTeamLogo} alt={game.homeTeam} className={styles.sbLogo} />}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      {/* Ranking badge for home team (CFB only) - bottom-right of team name */}
                      {isCollegeSport && (game as any).homeTeamRank && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-8px',
                          right: '-2px',
                          background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                          color: 'white',
                          fontSize: '8px',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: '0 1px 4px rgba(234, 88, 12, 0.4)',
                          lineHeight: '1',
                          zIndex: 1
                        }}>
                          #{(game as any).homeTeamRank}
                        </div>
                      )}
                      <span className={styles.sbTeamName}>{game.homeTeam}</span>
                    </div>
                  </div>
                  <div className={styles.sbRight}>
                    <span 
                      className={styles.sbPill}
                      style={
                        game.script.strengthLabel === 'Strong' ? {
                          background: 'rgba(21, 128, 61, 0.25)',
                          borderColor: 'rgba(74, 222, 128, 0.5)',
                          color: 'rgba(134, 239, 172, 0.95)'
                        } : game.script.strengthLabel === 'Above Avg' ? {
                          background: 'rgba(133, 77, 14, 0.25)',
                          borderColor: 'rgba(250, 204, 21, 0.5)',
                          color: 'rgba(253, 224, 71, 0.95)'
                        } : {}
                      }
                    >
                      Script {game.script.strengthLabel ?? 'Minimal'}
                    </span>
                  </div>
                </div>
                <div className={styles.sbTimeRow}>
                  <span className={styles.sbTime}>{game.kickoffLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderPicksView = () => {
    if (activeFilter === 'topProps') {
      if (topPropsLoading) {
        return renderPlaceholder('Loading top props...')
      }
      if (topPropsError) {
        return renderPlaceholder('Unable to load props right now.')
      }
      if (topPropsGames.length === 0) {
        return renderPlaceholder('No props found for upcoming games.')
      }

      const sortedPropGames = [...topPropsGames].sort((a, b) => {
        // Games with props first
        const aHasProps = a.props.length > 0 ? 1 : 0
        const bHasProps = b.props.length > 0 ? 1 : 0
        if (bHasProps !== aHasProps) return bHasProps - aHasProps
        // Then by kickoff time
        return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      })

      return (
        <div className={styles.topPropsGrid}>
          {sortedPropGames.map((game) => (
            <div key={game.gameId} className={styles.topPropsCard} style={{ position: 'relative' }}>
              <div className={styles.topPropsHeader}>
                <span>{game.matchup}</span>
                <span>{game.kickoffLabel}</span>
              </div>
              <div className={styles.topPropsDivider} />
              <div className={styles.topPropsList} style={!hasAccess ? { filter: 'blur(6px)', userSelect: 'none' } : {}}>
                {game.props.length === 0 && <div className={styles.topPropsEmpty}>Props syncing soon.</div>}
                {game.props.map((prop) => (
                  <div key={prop.id} className={styles.topPropRow}>
                    {/* Player Headshot */}
                    {prop.headshot && (
                      <img 
                        src={prop.headshot} 
                        alt={prop.playerName}
                        className={styles.topPropHeadshot}
                      />
                    )}
                    
                    {/* Player Info */}
                    <div className={styles.topPropInfo}>
                      <div className={styles.topPropNameLine}>
                        <span className={styles.topPropName}>{prop.playerName}</span>
                        {prop.hitRate !== null && (
                          <span className={styles.topPropBadge}>
                            <FaFireAlt className={styles.topPropIcon} />
                            {prop.wins !== undefined && prop.losses !== undefined ? `${prop.wins}-${prop.losses} ` : ''}
                            ({formatPercentage(prop.hitRate)})
                          </span>
                        )}
                      </div>
                      <div className={styles.topPropMeta}>
                        <span className={styles.topPropTitle}>{prop.betTitle} | {prop.line}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!hasAccess && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: !isSignedIn ? 'pointer' : 'default'
                  }}
                  onClick={() => !isSignedIn && openSignUp()}
                >
                  {!isSignedIn ? 'Sign up to view' : 'Get sub to view'}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (picksLoading) {
      return renderPlaceholder('Loading picks...')
    }

    if (picksError) {
      return renderPlaceholder('Unable to load picks right now.')
    }

    if (picks.length === 0) {
      return renderPlaceholder('No picks found for this filter.')
    }

    if (isByCapper) {
      if (picksByCapper.length === 0) {
        return renderPlaceholder('No picks found for this filter.')
      }

      return (
        <div className={styles.capperList}>
          {picksByCapper.map((group) => {
            // Get profile data from first pick in the group
            const firstPick = group.picks[0]
            return (
              <div key={group.name} className={styles.capperCard}>
                <div className={styles.capperHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BettorProfileImage 
                      imageUrl={firstPick?.bettorProfileImage || null} 
                      initials={firstPick?.bettorProfileInitials || null}
                      size={36}
                    />
                    <span className={styles.capperName}>{group.name}</span>
                  </div>
                  {typeof group.winStreak === 'number' && group.winStreak > 0 && (
                    <span className={styles.capperStreak}>
                      <FaFireAlt className={styles.capperStreakIcon} />
                      {group.winStreak}
                    </span>
                  )}
                </div>
                {group.record && <div className={styles.capperRecord}>{group.record}</div>}
              <div className={styles.capperPickList}>
                {group.picks.map((pick) => {
                  const isExpanded = expandedAnalysis.has(pick.id)
                  return (
                    <div key={pick.id} className={styles.capperPickCard}>
                      <div className={styles.capperPickHeader}>
                        <div 
                          className={styles.pickHeaderMeta}
                          style={pick.units > 1.5 ? { 
                            background: 'rgba(234, 88, 12, 0.25)', 
                            borderColor: 'rgba(251, 146, 60, 0.5)',
                            color: 'rgba(251, 146, 60, 0.95)'
                          } : {}}
                        >
                          {formatOddsUnits(pick.odds, pick.units)}
                        </div>
                      </div>
                      <div className={styles.pickBody}>
                        {(pick.awayTeam || pick.homeTeam) && (
                          <div className={styles.pickMatchup}>
                            {pick.awayTeam ?? 'Away'} @ {pick.homeTeam ?? 'Home'}
                          </div>
                        )}
                        <p 
                          className={styles.pickTitle}
                          style={!hasAccess ? { filter: 'blur(6px)', userSelect: 'none' } : {}}
                        >
                          {pick.betTitle}
                        </p>
                        <div className={styles.pickFooter}>
                          {hasAccess ? (
                            <>
                              <button
                                className={styles.pickAnalysisLink}
                                type="button"
                                onClick={() => {
                                  setExpandedAnalysis((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(pick.id)) {
                                      next.delete(pick.id)
                                    } else {
                                      next.add(pick.id)
                                    }
                                    return next
                                  })
                                }}
                              >
                                <span>Analysis</span>
                                <span
                                  className={styles.pickAnalysisLinkIcon}
                                  style={{ transform: isExpanded ? 'rotate(-135deg)' : 'rotate(45deg)' }}
                                />
                              </button>
                              <span>{pick.gameTimeLabel}</span>
                            </>
                          ) : (
                            <>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                filter: 'blur(6px)',
                                userSelect: 'none'
                              }}>
                                <FaLock style={{ fontSize: '0.75rem' }} />
                                <span style={{ fontSize: '0.875rem' }}>Analysis</span>
                              </div>
                              <span 
                                style={{ 
                                  fontSize: '0.75rem', 
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  cursor: !isSignedIn ? 'pointer' : 'default'
                                }}
                                onClick={() => !isSignedIn && openSignUp()}
                              >
                                {!isSignedIn ? 'Sign up to view' : 'Get sub to view'}
                              </span>
                            </>
                          )}
                        </div>
                        {hasAccess && isExpanded && pick.analysis && (
                          <div
                            className={styles.pickAnalysisContent}
                            dangerouslySetInnerHTML={{ __html: pick.analysis }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className={styles.pickList}>
        {picks.map((pick) => {
          const isExpanded = expandedAnalysis.has(pick.id)
          return (
            <div key={pick.id} className={styles.pickCard}>
              <div className={styles.pickHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BettorProfileImage 
                    imageUrl={pick.bettorProfileImage} 
                    initials={pick.bettorProfileInitials}
                    size={32}
                  />
                  <span className={styles.pickBettor}>{pick.bettorName}</span>
                </div>
                <div 
                  className={styles.pickHeaderMeta}
                  style={pick.units > 1.5 ? { 
                    background: 'rgba(234, 88, 12, 0.25)', 
                    borderColor: 'rgba(251, 146, 60, 0.5)',
                    color: 'rgba(251, 146, 60, 0.95)'
                  } : {}}
                >
                  {formatOddsUnits(pick.odds, pick.units)}
                </div>
              </div>
              <div className={styles.pickBody}>
                {(pick.awayTeam || pick.homeTeam) && (
                  <div className={styles.pickMatchup}>
                    {pick.awayTeam ?? 'Away'} @ {pick.homeTeam ?? 'Home'}
                  </div>
                )}
                <p 
                  className={styles.pickTitle}
                  style={!hasAccess ? { filter: 'blur(6px)', userSelect: 'none' } : {}}
                >
                  {pick.betTitle}
                </p>
                <div className={styles.pickFooter}>
                  {hasAccess ? (
                    <>
                      <button
                        className={styles.pickAnalysisLink}
                        type="button"
                        onClick={() => {
                          setExpandedAnalysis((prev) => {
                            const next = new Set(prev)
                            if (next.has(pick.id)) {
                              next.delete(pick.id)
                            } else {
                              next.add(pick.id)
                            }
                            return next
                          })
                        }}
                      >
                        <span>Analysis</span>
                        <span
                          className={styles.pickAnalysisLinkIcon}
                          style={{ transform: isExpanded ? 'rotate(-135deg)' : 'rotate(45deg)' }}
                        />
                      </button>
                      <span>{pick.gameTimeLabel}</span>
                    </>
                  ) : (
                    <>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        filter: 'blur(6px)',
                        userSelect: 'none'
                      }}>
                        <FaLock style={{ fontSize: '0.75rem' }} />
                        <span style={{ fontSize: '0.875rem' }}>Analysis</span>
                      </div>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          color: 'rgba(255, 255, 255, 0.5)',
                          cursor: !isSignedIn ? 'pointer' : 'default'
                        }}
                        onClick={() => !isSignedIn && openSignUp()}
                      >
                        {!isSignedIn ? 'Sign up to view' : 'Get sub to view'}
                      </span>
                    </>
                  )}
                </div>
                {hasAccess && isExpanded && pick.analysis && (
                  <div className={styles.pickAnalysisContent} dangerouslySetInnerHTML={{ __html: pick.analysis }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderScriptsView = () => {
    if (activeFilter === 'scriptsAbout') {
      return (
        <div className={styles.aboutInline}>
          <h2 className={styles.aboutInlineTitle}>AI Game Scripts</h2>
          <div className={styles.aboutInlineBody}>
            <p>
              Our <strong>AI Game Scripts</strong> are powered by <strong>Claude</strong>, the most advanced reasoning model 
              available, specifically chosen for its exceptional mathematical and analytical capabilities.
            </p>

            <h3>What Goes Into Each Script:</h3>
            <ul>
              <li><strong>Live Betting Splits</strong> — See where the public and sharps are leaning</li>
              <li><strong>Referee Trends</strong> — Historical data on how officials impact game outcomes</li>
              <li><strong>Detailed Team Stats</strong> — Key offensive and defensive metrics</li>
              <li><strong>Analyst Data</strong> — Professional narratives and picks from top cappers</li>
              <li><strong>Top Player Props</strong> — High-confidence plays based on historical hit rates</li>
            </ul>

            <h3>Script Strength:</h3>
            <p>
              Each game is assigned a strength rating based on data availability and quality. Games with more complete 
              data sets (referee history, team trends, public betting, props) receive higher ratings, giving you 
              confidence in the depth of analysis behind each script.
            </p>

            <p>
              <strong>Bold text</strong> in scripts highlights key insights and actionable angles.
            </p>
          </div>
        </div>
      )
    }

    if (isLoading) {
      return renderPlaceholder('Loading scripts...')
    }

    if (hasError) {
      return renderPlaceholder('Unable to load scripts right now.')
    }

    if (sortedGames.length === 0) {
      return renderPlaceholder('No upcoming games to script.')
    }

    return (
      <div className={styles.scriptList}>
        {sortedGames.map((game) => {
          const strengthLabel = game.script.strengthLabel || 'Minimal'
          const strength = game.script.creditsRequired || 1
          const isExpanded = expandedScripts.has(game.id)
          const isLoading = loadingScripts.has(game.id)
          const content = scriptContent.get(game.id)
          
          return (
            <div key={game.id} className={styles.scriptCard}>
              {/* Row 1: Logos + Strength bars */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {game.awayTeamLogo && (
                    <img src={game.awayTeamLogo} alt={game.awayTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  )}
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>@</span>
                  {game.homeTeamLogo && (
                    <img src={game.homeTeamLogo} alt={game.homeTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  )}
                </div>
                <div className={styles.scriptBars}>
                  {[1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={`${styles.scriptBar} ${strength >= level ? styles[`scriptBarActive${level}`] : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* Row 2: Game Stats + Date + Generate Button (Compact) */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                {/* Left Side: Game Stats + Date on Same Line */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flex: 1
                }}>
                  {/* Game Stats (NHL: Moneylines | Others: Spreads) */}
                  <div style={{ 
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: '"Courier New", monospace',
                    letterSpacing: '0.03em'
                  }}>
                    {activeSport === 'nhl' ? (
                      // NHL: Show Away ML | OU | Home ML
                      <>
                        {game.moneyline?.away != null && (
                          <span>{game.moneyline.away > 0 ? '+' : ''}{game.moneyline.away}</span>
                        )}
                        {game.moneyline?.away != null && game.totals?.number != null && (
                          <span style={{ margin: '0 0.4rem', color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
                        )}
                        {game.totals?.number != null && (
                          <span>o{game.totals.number}</span>
                        )}
                        {game.totals?.number != null && game.moneyline?.home != null && (
                          <span style={{ margin: '0 0.4rem', color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
                        )}
                        {game.moneyline?.home != null && (
                          <span>{game.moneyline.home > 0 ? '+' : ''}{game.moneyline.home}</span>
                        )}
                      </>
                    ) : (
                      // NFL/NBA/CFB: Show Spread | Total
                      <>
                        {game.spread?.awayLine != null && (
                          <span>{game.spread.awayLine > 0 ? '+' : ''}{game.spread.awayLine}</span>
                        )}
                        {game.spread?.awayLine != null && game.totals?.number != null && (
                          <span style={{ margin: '0 0.4rem', color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
                        )}
                        {game.totals?.number != null && (
                          <span>o{game.totals.number}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Date Tag */}
                  <div style={{ 
                    fontSize: '0.65rem',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}>
                    {formatPublicCardDate(game.kickoff)}
                  </div>
                </div>

                {/* Right Side: Generate Button */}
                <button 
                  className={styles.scriptGenerate} 
                  type="button"
                  onClick={() => handleGenerateScript(game.id)}
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.8rem',
                    background: 'rgba(37, 99, 235, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '6px',
                    color: 'rgba(96, 165, 250, 0.95)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.25)'
                    e.currentTarget.style.boxShadow = '0 0 18px rgba(59, 130, 246, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)'
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.2)'
                  }}
                >
                  {content ? (isExpanded ? 'Hide Script' : 'View Script') : (
                    <>
                      Generate
                      <FaWandMagicSparkles style={{ fontSize: '0.9rem' }} />
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Script Content */}
              {isExpanded && (
                <div className={styles.scriptContent} style={{ position: 'relative' }}>
                  {isLoading ? (
                    <div className={styles.scriptLoader}>
                      <span className={styles.dot}></span>
                      <span className={styles.dot}></span>
                      <span className={styles.dot}></span>
                    </div>
                  ) : (
                    <>
                      <div 
                        className={styles.scriptText} 
                        dangerouslySetInnerHTML={{ __html: formatScript(content || '') }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderPublicView = () => {
    try {
      if (activeFilter === 'publicAbout') {
        return (
          <div className={styles.aboutInline}>
            <h2 className={styles.aboutInlineTitle}>Public Betting Data</h2>
            <div className={styles.aboutInlineBody}>
              <p>
                Our <strong>Public Betting Data</strong> aggregates live betting splits from <strong>30+ sportsbooks</strong> — 
                including in-person, offshore, and classic retail books — to show you where the money is really flowing.
              </p>

              <h3>Understanding the Filters:</h3>

              <div className={styles.aboutHighlight}>
                <strong>Most Public</strong>
                <p style={{ marginTop: '8px', marginBottom: 0 }}>
                  Shows games where the public is most heavily backing one side, based on both bet count 
                  and dollar volume. Useful for identifying potential fade opportunities.
                </p>
              </div>

              <div className={styles.aboutHighlight}>
                <strong>Vegas Backed</strong>
                <p style={{ marginTop: '8px', marginBottom: 0 }}>
                  Highlights games with <strong>Reverse Line Movement (RLM)</strong> and sharp money indicators. 
                  Takes steam moves, non-public sides, and line movement into account to calculate a 
                  weighted value percentage for each bet type.
                </p>
              </div>

              <div className={styles.aboutHighlight}>
                <strong>Big Money</strong>
                <p style={{ marginTop: '8px', marginBottom: 0 }}>
                  Tracks the <strong>difference between % of bets wagered and % of dollars wagered</strong>. 
                  Large gaps indicate sharp money on one side, even if public bets favor the other.
                </p>
              </div>

              <p>
                Use these filters to spot market inefficiencies, sharp action, and public traps before placing your bets.
              </p>
            </div>
          </div>
        )
      }

      console.log('[PublicView] render start', activeFilter, sortedGames.length)

      if (isLoading) {
        return renderPlaceholder('Syncing public money...')
      }

      if (hasError) {
        return renderPlaceholder('Unable to load public data right now.')
      }

      let gamesWithPublic = sortedGames.filter((game) => !!game.publicMoney)
      console.log('[PublicView] games with data', gamesWithPublic.length)

      if (activeFilter === 'publicVegas') {
        gamesWithPublic = gamesWithPublic
          .map((game) => ({ game, rlm: getRlmStats(game.publicMoney) }))
          .filter(({ rlm }) => rlm.length > 0)
          .sort((a, b) => {
            const bestA = Math.max(...a.rlm.map((stat) => stat.percentage ?? -Infinity))
            const bestB = Math.max(...b.rlm.map((stat) => stat.percentage ?? -Infinity))
            return bestB - bestA
          })
          .map(({ game }) => game)
        console.log('[PublicView] vegas games', gamesWithPublic.length)
      } else if (activeFilter === 'publicSharp') {
        gamesWithPublic = gamesWithPublic
          .map((game) => ({ game, bigMoney: getBigMoneyStats(game) }))
          .filter(({ bigMoney }) => bigMoney.length > 0)
          .sort((a, b) => (b.bigMoney[0]?.diff ?? 0) - (a.bigMoney[0]?.diff ?? 0))
          .map(({ game }) => game)
        console.log('[PublicView] big money games', gamesWithPublic.length)
      } else if (activeFilter === 'publicMost') {
        gamesWithPublic = gamesWithPublic.sort((a, b) => getMostPublicScore(b) - getMostPublicScore(a))
      }


      if (gamesWithPublic.length === 0) {
        return renderPlaceholder('No public betting data yet. Check back soon.')
      }

      return (
        <div className={styles.publicGrid}>
          {gamesWithPublic.map((game) => {
            const pm = game.publicMoney
            const rlmStats = getRlmStats(pm)
            const sharpStats = getSharpStats(pm)
            const mostMarkets = getTopPublicMarkets(game, 4)
            const bigMoney = getBigMoneyStats(game)

            return (
              <div key={game.id} className={styles.publicCard} style={{ position: 'relative' }}>
                {/* Game header - always visible */}
                <div className={styles.publicHeader}>
                  <div>
                    {/* Logos in a row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {game.awayTeamLogo && (
                        <img src={game.awayTeamLogo} alt={game.awayTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      )}
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>@</span>
                      {game.homeTeamLogo && (
                        <img src={game.homeTeamLogo} alt={game.homeTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      )}
                    </div>
                    {/* Timestamp below logos */}
                    <div className={styles.publicTime}>{formatPublicCardDate(game.kickoff)}</div>
                  </div>
                  {/* Filter icon top right */}
                  <div style={{ 
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: activeFilter === 'publicSharp' ? '1.5rem' : '1.25rem',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    {activeFilter === 'publicMost' && <PiMoneyWavy />}
                    {activeFilter === 'publicVegas' && <FaDice />}
                    {activeFilter === 'publicSharp' && <LuArrowBigUpDash />}
                  </div>
                </div>

                {/* Betting data - blur if no access */}
                <div style={{ position: 'relative' }}>
                  <div style={!hasAccess ? { filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' } : {}}>
                    {activeFilter === 'publicMost' && (
                      <div className={styles.publicMetrics}>
                        {mostMarkets.map((market) => (
                          <div key={market.id} className={styles.publicMetric}>
                            <div className={styles.publicMetricLabel}>
                              {market.label}
                              {market.lineMovement !== null && (
                                <span className={styles.lineMovementBadge}>
                                  {market.lineMovement > 0 ? '-' : '+'}{Math.abs(market.lineMovement).toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className={styles.publicMetricValues}>
                              <span>{formatPercentage(market.bets)} bets</span>
                              {market.stake !== null && <span className={styles.publicStake}>{formatPercentage(market.stake)} money</span>}
                            </div>
                            <div className={styles.publicMetricBar}>
                              <div
                                className={styles.publicMetricFill}
                                style={{ width: `${Math.min(100, Math.max(0, market.bets ?? 0))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeFilter === 'publicVegas' && (
                      <div className={styles.publicMetrics}>
                        {rlmStats.map((stat, index) => {
                          const rlmValue = toNumber(stat.percentage || (stat as any).percentage2)
                          const lineMove = toNumber(stat.line_movement)
                          
                          return (
                            <div key={`${game.id}-rlm-${index}`} className={styles.publicMetric}>
                              <div className={styles.publicMetricLabel}>
                                {formatBetTypeLabel(stat.bet_type as string | undefined, game)}
                                {lineMove !== null && (
                                  <span className={styles.lineMovementBadge}>
                                    {lineMove > 0 ? '-' : '+'}{Math.abs(lineMove).toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <div className={styles.publicMetricValues}>
                                <span>{Math.round(rlmValue ?? 0)}% value</span>
                              </div>
                              <div className={styles.publicMetricBar}>
                                <div
                                  className={styles.publicMetricFill}
                                  style={{ width: `${Math.min(100, Math.max(0, rlmValue ?? 0))}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {activeFilter === 'publicSharp' && (
                      <div className={styles.publicMetrics}>
                        {bigMoney.slice(0, 3).map((stat) => (
                          <div key={`${game.id}-big-${stat.id}`} className={styles.publicMetric}>
                            <div className={styles.publicMetricLabel}>{stat.label}</div>
                            <div className={styles.publicMetricValues}>
                              <span>{formatPercentage(stat.bets)} bets</span>
                              <span className={styles.publicStake}>{formatPercentage(stat.stake)} money</span>
                              <span className={styles.publicDiff}>+{Math.round((stat.diff ?? 0) * 10) / 10}% diff</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Lock overlay - OUTSIDE blur, only over betting data */}
                  {!hasAccess && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: 'rgba(10, 15, 26, 0.5)',
                      backdropFilter: 'blur(2px)',
                      cursor: !isSignedIn ? 'pointer' : 'default',
                      zIndex: 1
                    }}
                    onClick={() => !isSignedIn && openSignUp()}
                    >
                      <FaLock style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.7)' }} />
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                        {!isSignedIn ? 'Sign up to view' : 'Get sub to view'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    } catch (error) {
      console.error('Failed to render public view', error)
      return renderPlaceholder('Public data temporarily unavailable.')
    }
  }

  const renderToolkitView = () => {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        padding: '1rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <DiscordWidget />
        <AffiliateWidget />
        <MaximizeProfitWidget />
        <TopRatedBooksWidget />
      </div>
    )
  }

  const renderContent = () => {
    // If toolkit is open, show toolkit view
    if (isToolkitOpen) {
      return renderToolkitView()
    }

    // Otherwise, show normal dashboard content
    switch (activeTab) {
      case 'picks':
        return renderPicksView()
      case 'scripts':
        return renderScriptsView()
      case 'public':
        return renderPublicView()
      case 'games':
      default:
        return renderGamesView()
    }
  }

  return (
    <div className={`${styles.page} newDashboardPage`}>
      <div className={styles.topBar}>
        <div className={styles.sportPicker} ref={sportMenuRef}>
          <button
            type="button"
            className={styles.sportChip}
            onClick={() => setIsSportMenuOpen((prev) => !prev)}
          >
            {(() => {
              const active = sportOptions.find((option) => option.id === activeSport)
              if (!active) return activeSport.toUpperCase()
              return <img src={active.logo} alt={active.label} className={styles.sportChipLogo} />
            })()}
          </button>
          {isSportMenuOpen && (
            <div className={styles.sportDropdown}>
              {sportOptions.map((option) => {
                const isActive = option.id === activeSport
                const isDisabled = option.status !== 'active'
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.sportOption} ${isActive ? styles.sportOptionActive : ''} ${isDisabled ? styles.sportOptionDisabled : ''}`}
                    onClick={() => {
                      if (isDisabled || option.id === activeSport) return
                      if (option.id === 'all') {
                        router.push('/sports')
                        setIsSportMenuOpen(false)
                      } else {
                        // Navigate to the selected sport (works for all: nfl, nba, nhl, college-football, etc.)
                        // Close toolkit when changing sports
                        const tabRoutes: Record<TabKey, string> = {
                          games: 'games',
                          picks: 'picks',
                          scripts: 'ai-scripts',
                          public: 'public-betting'
                        }
                        const route = tabRoutes[activeTab]
                        router.push(`/sports/${option.id}/${route}`)
                        setIsSportMenuOpen(false)
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <img src={option.logo} alt={option.label} className={styles.sportOptionLogo} />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Toolkit Button */}
        <button
          type="button"
          className={`${styles.toolkitButton} ${isToolkitOpen ? styles.toolkitActive : ''}`}
          onClick={handleToolkitToggle}
        >
          <FaWrench size={16} />
          <span>Toolkit</span>
        </button>
      </div>

      <nav className={`${styles.tabBar} ${isToolkitOpen ? styles.tabBarDimmed : ''}`}>
        {Object.entries(tabLabels).map(([key, label]) => {
          const typedKey = key as TabKey
          return (
            <button
              key={key}
              className={`${styles.tabButton} ${activeTab === typedKey ? styles.tabButtonActive : ''}`}
              onClick={() => handleTabSelect(typedKey)}
              disabled={isToolkitOpen}
              style={isToolkitOpen ? { cursor: 'not-allowed' } : {}}
            >
              {label.toUpperCase()}
            </button>
          )
        })}
      </nav>

      {availableFilters.length > 0 && !isToolkitOpen && (
        <div className={styles.subFilterRow}>
          {availableFilters.map((filterKey) => (
            <button
              key={filterKey}
              className={`${styles.filterPill} ${activeFilter === filterKey ? styles.filterPillActive : ''}`}
              onClick={() => setActiveFilter(filterKey)}
            >
              {subFilterLabels[filterKey]}
            </button>
          ))}
        </div>
      )}

      <main className={styles.contentArea}>{renderContent()}</main>
    </div>
  )
}
