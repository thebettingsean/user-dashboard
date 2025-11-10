'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './newDashboard.module.css'
import { FaFireAlt } from 'react-icons/fa'

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
    strengthLabel: 'Edge' | 'Moderate' | 'Strong' | null
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
    record: string | null
    hitRate: number | null
  }>
}

const tabLabels: Record<TabKey, string> = {
  games: 'Games',
  picks: 'Picks',
  scripts: 'Scripts',
  public: 'Public'
}

const subFilters: Record<TabKey, SubFilterKey[]> = {
  games: [],
  picks: ['upcoming', 'byCapper', 'topProps', 'results'],
  scripts: ['scriptsInfo', 'scriptsAbout'],
  public: ['publicMost', 'publicVegas', 'publicSharp', 'publicAbout']
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
  id: SupportedSport | 'nhl' | 'ncaaf' | 'ncaab' | 'mlb'
  label: string
  logo: string
  status: 'active' | 'coming-soon' | 'season-over'
}> = [
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
    label: 'NHL (coming soon)',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg',
    status: 'coming-soon'
  },
  {
    id: 'ncaaf',
    label: 'NCAAF (coming soon)',
    logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ba3d7e3f2bf6ce88f_4.svg',
    status: 'coming-soon'
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
  return `(${normalizedOdds} | ${units.toFixed(1)}u)`
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
  if (!pm) return [] as Array<{ id: string; label: string; bets: number | null; stake: number | null }>

  const markets: Array<{ id: string; label: string; bets: number | null; stake: number | null }> = []

  markets.push(
    {
      id: 'ml_away',
      label: `${game.awayTeam} ML`,
      bets: toNumber(pm.public_money_ml_away_bets_pct),
      stake: toNumber(pm.public_money_ml_away_stake_pct)
    },
    {
      id: 'ml_home',
      label: `${game.homeTeam} ML`,
      bets: toNumber(pm.public_money_ml_home_bets_pct),
      stake: toNumber(pm.public_money_ml_home_stake_pct)
    },
    {
      id: 'spread_away',
      label: `${game.awayTeam} Spread`,
      bets: toNumber(pm.public_money_spread_away_bets_pct),
      stake: toNumber(pm.public_money_spread_away_stake_pct)
    },
    {
      id: 'spread_home',
      label: `${game.homeTeam} Spread`,
      bets: toNumber(pm.public_money_spread_home_bets_pct),
      stake: toNumber(pm.public_money_spread_home_stake_pct)
    },
    {
      id: 'total_over',
      label: 'Over',
      bets: toNumber(pm.public_money_over_bets_pct),
      stake: toNumber(pm.public_money_over_stake_pct)
    },
    {
      id: 'total_under',
      label: 'Under',
      bets: toNumber(pm.public_money_under_bets_pct),
      stake: toNumber(pm.public_money_under_stake_pct)
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

export default function NewDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('games')
  const [activeSport, setActiveSport] = useState<SupportedSport>('nfl')
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

  const getDefaultFilter = (tab: TabKey): SubFilterKey | undefined => subFilters[tab][0]

  const [activeFilter, setActiveFilter] = useState<SubFilterKey>(getDefaultFilter('picks') ?? 'upcoming')

  const availableFilters = subFilters[activeTab] ?? []

  const handleTabSelect = (tab: TabKey) => {
    setActiveTab(tab)
    const filters = subFilters[tab]
    if (filters.length > 0) {
      setActiveFilter(filters[0])
    }
  }

  const upcomingGames = useMemo(() => {
    const now = Date.now()
    const upcoming = games.filter((game) => {
      const kickoffTime = new Date(game.kickoff).getTime()
      return Number.isFinite(kickoffTime) && kickoffTime >= now
    })
    console.log(`Upcoming games: ${upcoming.length} out of ${games.length}`)
    return upcoming
  }, [games])

  const sortedGames = useMemo(() => {
    return [...upcomingGames].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
  }, [upcomingGames])

  const featuredGame = useMemo(() => {
    if (sortedGames.length === 0) return undefined
    return [...sortedGames].sort((a, b) => {
      const strengthB = b.script.creditsRequired ?? 0
      const strengthA = a.script.creditsRequired ?? 0
      if (strengthB !== strengthA) {
        return strengthB - strengthA
      }
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
        const response = await fetch(`/api/dashboard/game-hub?sport=${activeSport}`, {
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
        const response = await fetch(
          `/api/dashboard/picks?sport=${activeSport}&filter=${activeFilter}`,
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

  useEffect(() => {
    if (activeTab !== 'picks' || activeFilter !== 'topProps') return

    setTopPropsLoading(true)
    setTopPropsError(false)

    const controller = new AbortController()

    async function loadTopProps() {
      try {
        const response = await fetch(`/api/dashboard/props?sport=${activeSport}`, {
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

  const handleGenerateScript = async (gameId: string) => {
    if (loadingScripts.has(gameId) || scriptContent.has(gameId)) {
      // Toggle expand/collapse if already loaded
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

    // Start loading
    setLoadingScripts((prev) => new Set(prev).add(gameId))
    setExpandedScripts((prev) => new Set(prev).add(gameId))

    try {
      // Simulate 3-second loading
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Fetch the actual script
      const response = await fetch(`/api/scripts/${gameId}?sport=${activeSport}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to load script')
      }

      const data = await response.json()
      const content = data.script?.content || data.script || 'Script not available'

      setScriptContent((prev) => new Map(prev).set(gameId, content))
    } catch (error) {
      console.error('Failed to load script:', error)
      setScriptContent((prev) => new Map(prev).set(gameId, 'Unable to load script. Please try again.'))
    } finally {
      setLoadingScripts((prev) => {
        const next = new Set(prev)
        next.delete(gameId)
        return next
      })
    }
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

    const displayGame = activeGame || sortedGames[0]
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
    const refereeName = (displayGame.referee as any)?.referee_name || 'Ref TBD'

    return (
      <div className={styles.gameContent}>
        <div className={`${styles.featuredWrapper} ${featuredGame && featuredGame.id === displayGame.id ? styles.featuredActive : ''}`}>
          <div className={styles.featuredTitle}>Featured Game</div>
          <div className={styles.featuredSeparator} />
          <div className={styles.featuredMatchup}>
            {displayGame.awayTeamLogo && (
              <div className={styles.featuredLogoWrapper}>
                <img src={displayGame.awayTeamLogo} alt={displayGame.awayTeam} className={styles.featuredLogo} />
              </div>
            )}
            <span className={styles.featuredVs}>@</span>
            {displayGame.homeTeamLogo && (
              <div className={styles.featuredLogoWrapper}>
                <img src={displayGame.homeTeamLogo} alt={displayGame.homeTeam} className={styles.featuredLogo} />
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
          <div className={styles.featuredRef}>Referee · {refereeName}</div>
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
              >
                <div className={styles.gameCardRow1}>
                  <span className={styles.compactMatchup}>
                    {game.awayTeam} @ {game.homeTeam}
                  </span>
                  {game.awayTeamLogo && game.homeTeamLogo && (
                    <div className={styles.teamLogos}>
                      <img src={game.awayTeamLogo} alt={game.awayTeam} className={styles.teamLogo} />
                      <img src={game.homeTeamLogo} alt={game.homeTeam} className={styles.teamLogo} />
                    </div>
                  )}
                </div>
                <div className={styles.gameCardRow2}>
                  <span className={styles.compactPill}>Script {game.script.strengthLabel ?? 'Minimal'}</span>
                  <span className={styles.compactPill}>Picks {game.picks.total}</span>
                  <span className={styles.compactPill}>Data {dataCount}/4</span>
                </div>
                <div className={styles.gameCardRow3}>
                  <span className={styles.viewDetails}>View details</span>
                  <span className={styles.compactTime}>{game.kickoffLabel}</span>
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
            <div key={game.gameId} className={styles.topPropsCard}>
              <div className={styles.topPropsHeader}>
                <span>{game.matchup}</span>
                <span>{game.kickoffLabel}</span>
              </div>
              <div className={styles.topPropsDivider} />
              <div className={styles.topPropsList}>
                {game.props.length === 0 && <div className={styles.topPropsEmpty}>Props syncing soon.</div>}
                {game.props.map((prop) => (
                  <div key={prop.id} className={styles.topPropRow}>
                    <div className={styles.topPropNameLine}>
                      <span className={styles.topPropName}>{prop.playerName}</span>
                      {prop.hitRate !== null && (
                        <span className={styles.topPropBadge}>
                          <FaFireAlt className={styles.topPropIcon} />
                          {formatPercentage(prop.hitRate)}
                        </span>
                      )}
                    </div>
                    <div className={styles.topPropMeta}>
                      <span className={styles.topPropTitle}>{prop.betTitle} | {prop.line}</span>
                    </div>
                  </div>
                ))}
              </div>
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
          {picksByCapper.map((group) => (
            <div key={group.name} className={styles.capperCard}>
              <div className={styles.capperHeader}>
                <span className={styles.capperName}>{group.name}</span>
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
                        <div className={styles.pickHeaderMeta}>{formatOddsUnits(pick.odds, pick.units)}</div>
                      </div>
                      <div className={styles.pickBody}>
                        {(pick.awayTeam || pick.homeTeam) && (
                          <div className={styles.pickMatchup}>
                            {pick.awayTeam ?? 'Away'} @ {pick.homeTeam ?? 'Home'}
                          </div>
                        )}
                        <p className={styles.pickTitle}>{pick.betTitle}</p>
                        <div className={styles.pickFooter}>
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
                        </div>
                        {isExpanded && pick.analysis && (
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
          ))}
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
                <span className={styles.pickBettor}>{pick.bettorName}</span>
                <div className={styles.pickHeaderMeta}>{formatOddsUnits(pick.odds, pick.units)}</div>
              </div>
              <div className={styles.pickBody}>
                {(pick.awayTeam || pick.homeTeam) && (
                  <div className={styles.pickMatchup}>
                    {pick.awayTeam ?? 'Away'} @ {pick.homeTeam ?? 'Home'}
                  </div>
                )}
                <p className={styles.pickTitle}>{pick.betTitle}</p>
                <div className={styles.pickFooter}>
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
                </div>
                {isExpanded && pick.analysis && (
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
              Our <strong>AI Game Scripts</strong> are powered by <strong>Claude 3.5 Sonnet</strong> and 
              meticulously crafted using insider betting data to give you an edge.
            </p>

            <h3>What Goes Into Each Script:</h3>
            <ul>
              <li><strong>Live Betting Splits</strong> — See where the public and sharps are leaning</li>
              <li><strong>Referee Trends</strong> — Historical data on how officials impact game outcomes</li>
              <li><strong>Team H2H Stats</strong> — 3-year head-to-head matchup analysis</li>
              <li><strong>Top Player Props</strong> — High-confidence plays based on historical hit rates</li>
            </ul>

            <div className={styles.aboutHighlight}>
              <strong>Script Strength Levels:</strong>
              <div className={styles.aboutSubtitle}>
                Minimal (1 credit) · Above Avg (2 credits) · Strong (3 credits)
              </div>
            </div>

            <p>
              Each script is <strong>regenerated every 4 hours</strong> leading up to game time to ensure 
              you have the most up-to-date analysis. The AI synthesizes all available data into a 
              clear, actionable narrative.
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
              <div className={styles.scriptHeader}>
                <span className={styles.scriptMatchup}>
                  {game.awayTeam} @ {game.homeTeam}
                </span>
                <div className={styles.scriptBars}>
                  {[1, 2, 3].map((level) => (
                    <span
                      key={level}
                      className={`${styles.scriptBar} ${strength >= level ? styles[`scriptBarActive${level}`] : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.scriptData}>Active Data: {strengthLabel}</div>
              <div className={styles.scriptFooter}>
                <div className={styles.scriptDate}>
                  <span>{formatKickoffDate(game.kickoff)}</span>
                  <span>{game.kickoffLabel}</span>
                </div>
                <button 
                  className={styles.scriptGenerate} 
                  type="button"
                  onClick={() => handleGenerateScript(game.id)}
                >
                  {content ? (isExpanded ? 'Hide Script' : 'View Script') : 'Generate Script'}
                </button>
              </div>
              {isExpanded && (
                <div className={styles.scriptContent}>
                  {isLoading ? (
                    <div className={styles.scriptLoader}>
                      <span className={styles.dot}></span>
                      <span className={styles.dot}></span>
                      <span className={styles.dot}></span>
                    </div>
                  ) : (
                    <div className={styles.scriptText} dangerouslySetInnerHTML={{ __html: content || '' }} />
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
              <div key={game.id} className={styles.publicCard}>
                <div className={styles.publicHeader}>
                  <div>
                    <div className={styles.publicMatchup}>{game.awayTeam} @ {game.homeTeam}</div>
                    <div className={styles.publicTime}>{game.kickoffLabel}</div>
                  </div>
                  <div className={styles.publicTag}>{formatPublicCardDate(game.kickoff)}</div>
                </div>

                {activeFilter === 'publicMost' && (
                  <div className={styles.publicMetrics}>
                    {mostMarkets.map((market) => (
                      <div key={market.id} className={styles.publicMetric}>
                        <div className={styles.publicMetricLabel}>{market.label}</div>
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
                    {rlmStats.map((stat, index) => (
                      <div key={`${game.id}-rlm-${index}`} className={styles.publicMetric}>
                        <div className={styles.publicMetricLabel}>{formatBetTypeLabel(stat.bet_type as string | undefined, game)}</div>
                        <div className={styles.publicMetricValues}>
                          <span>{formatPercentage(stat.percentage)} movement</span>
                        </div>
                        <div className={styles.publicMetricBar}>
                          <div
                            className={styles.publicMetricFill}
                            style={{ width: `${Math.min(100, Math.max(0, stat.percentage ?? 0))}%` }}
                          />
                        </div>
                      </div>
                    ))}
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
            )
          })}
        </div>
      )
    } catch (error) {
      console.error('Failed to render public view', error)
      return renderPlaceholder('Public data temporarily unavailable.')
    }
  }

  const renderContent = () => {
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
                      if (option.id === 'nfl' || option.id === 'nba') {
                        setActiveSport(option.id)
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
        <div className={styles.creditPill}>Credits: 12</div>
      </div>

      <nav className={styles.tabBar}>
        {Object.entries(tabLabels).map(([key, label]) => {
          const typedKey = key as TabKey
          return (
            <button
              key={key}
              className={`${styles.tabButton} ${activeTab === typedKey ? styles.tabButtonActive : ''}`}
              onClick={() => handleTabSelect(typedKey)}
            >
              {label.toUpperCase()}
            </button>
          )
        })}
      </nav>

      {availableFilters.length > 0 && (
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
