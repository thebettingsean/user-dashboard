'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { BsClipboard2Data } from "react-icons/bs"
import { IoTicketOutline } from "react-icons/io5"
import { GiSelect } from "react-icons/gi"
import { PiMoneyWavy } from 'react-icons/pi'
import { FaDice, FaLock, FaFireAlt, FaWrench } from 'react-icons/fa'
import { FaWandMagicSparkles } from 'react-icons/fa6'
import { LuArrowBigUpDash } from 'react-icons/lu'
import { IoIosGift } from 'react-icons/io'
import { GiReceiveMoney } from 'react-icons/gi'
import { MdAddLink } from 'react-icons/md'
import styles from './sportSelector.module.css'
import dashboardStyles from './[sport]/components/dashboard.module.css'
import DiscordWidget from '@/components/DiscordWidget'
import AffiliateWidget from '@/components/AffiliateWidget'
import MaximizeProfitWidget from '@/components/MaximizeProfitWidget'
import TopRatedBooksWidget from '@/components/TopRatedBooksWidget'

type TabKey = 'games' | 'picks' | 'scripts' | 'public'
type SubFilterKey = 'scriptsAbout' | 'publicAbout'

type SportGameData = {
  sport: string
  sportLabel: string
  sportLogo: string
  gamesCount: number
  picksCount: number
  scriptsCount: number
  topMatchup?: string
  dateLabel: string
  isActive: boolean
}

type Pick = {
  id: string
  bet_title: string
  odds: string
  units: number
  game_time: string
  game_id: string
  result: string
  bettor_id: string
  bettor_name: string
  bettor_record: string
  bettor_win_streak: number
  bettor_profile_initials: string
  bettor_profile_image: string | null
  sport: string
  away_team: string | null
  home_team: string | null
  analysis: string
  date: string
}

type Script = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  script: {
    content: string
    strengthLabel: string
    strengthValue: number
  } | null
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
  away_team_ml?: number | null
  home_team_ml?: number | null
  away_team_point_spread?: number | null
  home_team_point_spread?: number | null
}

type PublicGame = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  publicMoney: PublicMoneySummary | null
}

type SportPublic = {
  sport: string
  sportLabel: string
  sportLogo: string
  games: PublicGame[]
}

const tabLabels: Record<TabKey, string> = {
  games: 'Games',
  picks: 'Picks',
  scripts: 'Scripts',
  public: 'Public'
}

const subFilters: Record<TabKey, SubFilterKey[]> = {
  games: [],
  picks: [],
  scripts: [],
  public: []
}

const sportOptions = [
  { id: 'all', label: 'All Sports', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6917f63fdc8769f00b25fc23_every%20sport%20in%201-2.svg', status: 'active' },
  { id: 'nfl', label: 'NFL', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg', status: 'active' },
  { id: 'nba', label: 'NBA', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg', status: 'active' },
  { id: 'nhl', label: 'NHL', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg', status: 'active' },
  { id: 'college-football', label: 'NCAAF', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ba3d7e3f2bf6ce88f_4.svg', status: 'active' },
  { id: 'ncaab', label: 'NCAAB', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b63f708e0881f1517_5.svg', status: 'inactive' },
  { id: 'mlb', label: 'MLB', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png', status: 'inactive' }
]

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

function formatBetTypeLabel(betType: string | undefined, awayTeam: string, homeTeam: string) {
  if (!betType) return 'Market'
  switch (betType) {
    case 'moneyline_home':
      return `${homeTeam} ML`
    case 'moneyline_away':
      return `${awayTeam} ML`
    case 'spread_home':
      return `${homeTeam} Spread`
    case 'spread_away':
      return `${awayTeam} Spread`
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

// Bettor Profile Image Component
function BettorProfileImage({ imageUrl, initials, size = 36 }: { imageUrl: string | null; initials: string | null; size?: number }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Bettor"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(71, 85, 105, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.8)',
        flexShrink: 0
      }}
    >
      {initials || '?'}
    </div>
  )
}

function SportsSelectorPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { hasAccess } = useSubscription()
  
  // Determine active tab from URL
  const activeTab: TabKey = useMemo(() => {
    if (pathname === '/sports/picks') return 'picks'
    if (pathname === '/sports/ai-scripts') return 'scripts'
    if (pathname === '/sports/public-betting') return 'public'
    return 'games'
  }, [pathname])
  
  const [activeFilter, setActiveFilter] = useState<SubFilterKey | undefined>(undefined)
  const [isSportMenuOpen, setIsSportMenuOpen] = useState(false)
  const sportMenuRef = useRef<HTMLDivElement>(null)
  
  // Toolkit state
  const isToolkitOpen = searchParams?.get('toolkit') === 'true'
  const [expandedToolkitItem, setExpandedToolkitItem] = useState<string | null>(null)
  
  // Games tab state
  const [sportsData, setSportsData] = useState<SportGameData[]>([])
  const [isLoadingGames, setIsLoadingGames] = useState(false)
  
  // Picks tab state
  const [allPicks, setAllPicks] = useState<Pick[]>([])
  const [isLoadingPicks, setIsLoadingPicks] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({})
  const [expandedPicks, setExpandedPicks] = useState<Set<string>>(new Set())
  
  // Scripts tab state
  const [sportsScripts, setSportsScripts] = useState<{ sport: string; sportLabel: string; sportLogo: string; scripts: Script[] }[]>([])
  const [isLoadingScripts, setIsLoadingScripts] = useState(false)
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set())
  const [generatingScripts, setGeneratingScripts] = useState<Set<string>>(new Set())
  
  // Public tab state
  const [sportsPublic, setSportsPublic] = useState<SportPublic[]>([])
  const [isLoadingPublic, setIsLoadingPublic] = useState(false)
  const [publicView, setPublicView] = useState<'most' | 'vegas' | 'sharp'>('most')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sportMenuRef.current && !sportMenuRef.current.contains(event.target as Node)) {
        setIsSportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTabSelect = (tab: TabKey) => {
    const routes: Record<TabKey, string> = {
      games: '/sports',
      picks: '/sports/picks',
      scripts: '/sports/ai-scripts',
      public: '/sports/public-betting'
    }
    // Close toolkit when switching tabs
    router.push(routes[tab])
  }

  const handleToolkitToggle = () => {
    if (isToolkitOpen) {
      // Close toolkit - remove query param
      router.push(pathname || '/sports')
    } else {
      // Open toolkit - add query param
      const currentPath = pathname || '/sports'
      router.push(`${currentPath}?toolkit=true`)
    }
  }

  // Calculate current NFL week (resets every Tuesday)
  const getCurrentNFLWeek = (): number => {
    const now = new Date()
    const seasonStart = new Date('2024-09-05') // NFL 2024 Season Start (Thursday, Sept 5)
    
    // Calculate weeks since season start
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / msPerWeek)
    
    // Week 1 started Sept 5, so add 1
    const currentWeek = weeksSinceStart + 1
    
    // Cap at 18 (max regular season weeks)
    return Math.max(1, Math.min(18, currentWeek))
  }

  // Fetch games data
  useEffect(() => {
    if (activeTab !== 'games') return
    
    setIsLoadingGames(true)
    
    async function fetchAllSports() {
      try {
        const activeSports = sportOptions.filter(s => s.status === 'active' && s.id !== 'all')
        const promises = activeSports.map(async (sport) => {
          try {
            const response = await fetch(`/api/dashboard/game-hub?sport=${sport.id}`, {
              cache: 'no-store'
            })
            
            if (!response.ok) throw new Error(`Failed to fetch ${sport.id}`)
            
            const data = await response.json()
            const games = data.games || []
            
            let dateLabel = 'Today'
            if (sport.id === 'nfl') {
              const currentWeek = getCurrentNFLWeek()
              dateLabel = `Week ${currentWeek}`
            } else if (sport.id === 'nba' || sport.id === 'nhl') {
              dateLabel = 'Today'
            } else if (sport.id === 'college-football') {
              dateLabel = 'This Week'
            }
            
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              gamesCount: games.length,
              picksCount: games.reduce((sum: number, g: any) => sum + (g.picks?.total || 0), 0),
              scriptsCount: games.filter((g: any) => g.script?.strengthLabel).length,
              topMatchup: games[0] ? `${games[0].awayTeam} @ ${games[0].homeTeam}` : undefined,
              dateLabel,
              isActive: true
            }
          } catch (error) {
            console.error(`Error fetching ${sport.id}:`, error)
            
            let dateLabel = 'Today'
            if (sport.id === 'nfl') {
              const currentWeek = getCurrentNFLWeek()
              dateLabel = `Week ${currentWeek}`
            } else if (sport.id === 'college-football') {
              dateLabel = 'This Week'
            }
            
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              gamesCount: 0,
              picksCount: 0,
              scriptsCount: 0,
              dateLabel,
              isActive: true
            }
          }
        })
        
        const results = await Promise.all(promises)
        setSportsData(results)
      } catch (error) {
        console.error('Error fetching all sports:', error)
      } finally {
        setIsLoadingGames(false)
      }
    }
    
    fetchAllSports()
  }, [activeTab])

  // Fetch picks data (EXACT same logic as /betting/dashboard)
  useEffect(() => {
    if (activeTab !== 'picks') return
    
    async function fetchPicks() {
      setIsLoadingPicks(true)
      try {
        const targetDate = currentDate
        const start = new Date(targetDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(targetDate)
        end.setHours(23, 59, 59, 999)
        
        const { data, error } = await supabase
          .from('picks')
          .select('*, bettors(name, record, win_streak, profile_initials, profile_image)')
          .gte('game_time', start.toISOString())
          .lte('game_time', end.toISOString())
          .order('game_time', { ascending: true })

        if (error) throw error

        const picks = (data || []).map(p => ({
          ...p,
          id: p.id,
          bet_title: p.bet_title || '',
          odds: p.odds || '',
          units: p.units || 0,
          game_time: p.game_time || '',
          game_id: p.game_id || '',
          result: p.result || 'pending',
          bettor_id: p.bettor_id || '',
          bettor_name: p.bettors?.name || 'Unknown',
          bettor_record: p.bettors?.record || '',
          bettor_win_streak: p.bettors?.win_streak || 0,
          bettor_profile_initials: p.bettors?.profile_initials || '??',
          bettor_profile_image: p.bettors?.profile_image || null,
          sport: p.sport || '',
          away_team: null,
          home_team: null,
          analysis: p.analysis || '',
          date: formatDateString(targetDate)
        }))

        // Sort by bettor name, then by game time
        picks.sort((a, b) => {
          if (a.bettor_name !== b.bettor_name) {
            return a.bettor_name.localeCompare(b.bettor_name)
          }
          return new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
        })

        setAllPicks(picks)
      } catch (error) {
        console.error('Error fetching picks:', error)
        setAllPicks([])
      } finally {
        setIsLoadingPicks(false)
      }
    }

    fetchPicks()
  }, [activeTab, currentDate])

  // Fetch pick counts for calendar (EXACT same logic as /betting/dashboard)
  useEffect(() => {
    if (activeTab !== 'picks') return
    
    async function fetchPickCounts() {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const dates = []
        for (let i = 0; i < 30; i++) {
          const date = new Date(today)
          date.setDate(today.getDate() + i)
          dates.push(date)
        }

        const startDate = dates[0]
        const endDate = new Date(dates[dates.length - 1])
        endDate.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
          .from('picks')
          .select('game_time')
          .gte('game_time', startDate.toISOString())
          .lte('game_time', endDate.toISOString())

        if (error) throw error

        const counts: Record<string, number> = {}
        
        ;(data || []).forEach(pick => {
          const gameTimeUTC = new Date(pick.game_time)
          const gameTimeEST = new Date(gameTimeUTC.toLocaleString("en-US", {timeZone: "America/New_York"}))
          const estDateStr = `${gameTimeEST.getFullYear()}-${String(gameTimeEST.getMonth() + 1).padStart(2, '0')}-${String(gameTimeEST.getDate()).padStart(2, '0')}`
          
          counts[estDateStr] = (counts[estDateStr] || 0) + 1
        })

        setPickCounts(counts)
      } catch (error) {
        console.error('Error fetching pick counts:', error)
      }
    }

    fetchPickCounts()
  }, [activeTab])

  // Fetch scripts data
  useEffect(() => {
    if (activeTab !== 'scripts') return
    
    async function fetchAllScripts() {
      setIsLoadingScripts(true)
      try {
        const activeSports = sportOptions.filter(s => s.status === 'active' && s.id !== 'all')
        const promises = activeSports.map(async (sport) => {
          try {
            const response = await fetch(`/api/dashboard/game-hub?sport=${sport.id}`, {
              cache: 'no-store'
            })
            
            if (!response.ok) throw new Error(`Failed to fetch ${sport.id}`)
            
            const data = await response.json()
            const games = data.games || []
            
            const scriptsGames = games
              .filter((g: any) => g.script?.strengthLabel)
              .slice(0, 3)
              .map((g: any) => ({
                id: g.id,
                sport: sport.id,
                awayTeam: g.awayTeam,
                homeTeam: g.homeTeam,
                awayTeamLogo: g.awayTeamLogo,
                homeTeamLogo: g.homeTeamLogo,
                kickoff: g.kickoff,
                script: g.script
              }))
            
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              scripts: scriptsGames
            }
          } catch (error) {
            console.error(`Error fetching ${sport.id}:`, error)
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              scripts: []
            }
          }
        })
        
        const results = await Promise.all(promises)
        setSportsScripts(results.filter(s => s.scripts.length > 0))
      } catch (error) {
        console.error('Error fetching all scripts:', error)
      } finally {
        setIsLoadingScripts(false)
      }
    }
    
    fetchAllScripts()
  }, [activeTab, activeFilter])

  // Fetch public data
  useEffect(() => {
    if (activeTab !== 'public') return
    
    async function fetchAllPublic() {
      setIsLoadingPublic(true)
      try {
        const activeSports = sportOptions.filter(s => s.status === 'active' && s.id !== 'all')
        const promises = activeSports.map(async (sport) => {
          try {
            const response = await fetch(`/api/dashboard/game-hub?sport=${sport.id}`, {
              cache: 'no-store'
            })
            
            if (!response.ok) throw new Error(`Failed to fetch ${sport.id}`)
            
            const data = await response.json()
            const games = data.games || []
            
            const gamesWithPublic = games
              .filter((g: any) => g.publicMoney)
              .map((g: any) => ({
                id: g.id,
                sport: sport.id,
                awayTeam: g.awayTeam,
                homeTeam: g.homeTeam,
                awayTeamLogo: g.awayTeamLogo,
                homeTeamLogo: g.homeTeamLogo,
                kickoff: g.kickoff,
                kickoffLabel: g.kickoffLabel,
                publicMoney: g.publicMoney
              }))
            
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              games: gamesWithPublic.slice(0, 3)
            }
          } catch (error) {
            console.error(`Error fetching ${sport.id}:`, error)
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              games: []
            }
          }
        })
        
        const results = await Promise.all(promises)
        setSportsPublic(results.filter(s => s.games.length > 0))
      } catch (error) {
        console.error('Error fetching all public data:', error)
      } finally {
        setIsLoadingPublic(false)
      }
    }
    
    fetchAllPublic()
  }, [activeTab, activeFilter])

  // Helper functions for picks
  const formatDateString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const selectDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(year, month - 1, day))
  }

  const togglePickAnalysis = (pickId: string) => {
    setExpandedPicks((prev) => {
      const next = new Set(prev)
      if (next.has(pickId)) {
        next.delete(pickId)
      } else {
        next.add(pickId)
      }
      return next
    })
  }

  const toggleScriptContent = (scriptId: string) => {
    setExpandedScripts((prev) => {
      const next = new Set(prev)
      if (next.has(scriptId)) {
        next.delete(scriptId)
      } else {
        next.add(scriptId)
      }
      return next
    })
  }

  const handleGenerateScript = async (gameId: string, sport: string) => {
    setGeneratingScripts((prev) => new Set(prev).add(gameId))
    try {
      const response = await fetch(`/api/games/${gameId}/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport })
      })

      if (!response.ok) throw new Error('Failed to generate script')

      // Refresh scripts
      const activeSports = sportOptions.filter(s => s.status === 'active')
      const promises = activeSports.map(async (sport) => {
        const response = await fetch(`/api/dashboard/game-hub?sport=${sport.id}`, { cache: 'no-store' })
        const data = await response.json()
        const games = data.games || []
        return {
          sport: sport.id,
          sportLabel: sport.label,
          sportLogo: sport.logo,
          scripts: games.filter((g: any) => g.script?.strengthLabel).slice(0, 3).map((g: any) => ({
            id: g.id,
            sport: sport.id,
            awayTeam: g.awayTeam,
            homeTeam: g.homeTeam,
            awayTeamLogo: g.awayTeamLogo,
            homeTeamLogo: g.homeTeamLogo,
            kickoff: g.kickoff,
            script: g.script
          }))
        }
      })
      const results = await Promise.all(promises)
      setSportsScripts(results.filter(s => s.scripts.length > 0))
    } catch (error) {
      console.error('Error generating script:', error)
    } finally {
      setGeneratingScripts((prev) => {
        const next = new Set(prev)
        next.delete(gameId)
        return next
      })
    }
  }

  // Helper functions for public betting
  const getPublicMarkets = (game: PublicGame) => {
    const pm = game.publicMoney
    if (!pm) return []

    const rlmStats = Array.isArray(pm.rlm_stats) ? pm.rlm_stats.filter(Boolean) : []
    const getRlmForBetType = (betType: string) => {
      const stat = rlmStats.find((s) => s?.bet_type?.toLowerCase().includes(betType.toLowerCase()))
      return stat?.line_movement !== undefined && stat?.line_movement !== null ? toNumber(stat.line_movement) : null
    }

    const markets = [
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
    ]

    return markets.filter((entry) => entry.bets !== null)
  }

  const getTopPublicMarkets = (game: PublicGame, limit = 3) => {
    return getPublicMarkets(game)
      .sort((a, b) => (b.bets ?? -Infinity) - (a.bets ?? -Infinity))
      .slice(0, limit)
  }

  const getRlmStats = (pm: PublicMoneySummary | null | undefined) => {
    if (!pm || !Array.isArray(pm.rlm_stats)) return []
    return pm.rlm_stats.filter(Boolean)
  }

  const getBigMoneyStats = (game: PublicGame) => {
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

  const handleSportSelect = (sportId: string) => {
    if (sportId === 'all') {
      // Navigate back to /sports page
      router.push('/sports')
    } else {
      const tabRoutes: Record<TabKey, string> = {
        games: 'games',
        picks: 'picks',
        scripts: 'ai-scripts',
        public: 'public-betting'
      }
      const route = tabRoutes[activeTab]
      router.push(`/sports/${sportId}/${route}`)
    }
  }

  const renderAboutScripts = () => {
    return (
      <div className={styles.aboutInline}>
        <div className={styles.aboutInlineHeader}>About AI Game Scripts</div>
        <div className={styles.aboutInlineContent}>
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            Our AI-powered game scripts combine multiple data sources into comprehensive game analysis:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem', lineHeight: '1.8' }}>
            <li><strong>Analyst data:</strong> Narratives and picks from our top analysts</li>
            <li><strong>Detailed team stats:</strong> Key offensive and defensive metrics</li>
            <li><strong>Public betting trends:</strong> Where the money is flowing</li>
            <li><strong>Historical matchups:</strong> Head-to-head performance data</li>
          </ul>
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            Powered by <strong>Claude</strong>, best at math and reasoning, our scripts analyze all available data 
            to generate actionable insights you won't find anywhere else.
          </p>
          <p style={{ lineHeight: '1.6' }}>
            <strong>Script Strength</strong> indicates how confident our AI is based on data quality, analyst 
            consensus, and statistical edges. Higher strength means more compelling betting angles have been identified.
          </p>
        </div>
      </div>
    )
  }

  const renderAboutPublic = () => {
    return (
      <div className={styles.aboutInline}>
        <div className={styles.aboutInlineHeader}>About Public Betting Data</div>
        <div className={styles.aboutInlineContent}>
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            Track where recreational and sharp bettors are placing their money:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem', lineHeight: '1.8' }}>
            <li><strong>Most Public:</strong> Games with the highest public betting percentages</li>
            <li><strong>Vegas Backed:</strong> Lines the sportsbooks are most confident in</li>
            <li><strong>Big Money:</strong> Games with significant differences between bet count and money percentages (sharp action)</li>
          </ul>
          <p style={{ lineHeight: '1.6' }}>
            Understanding public betting patterns helps you identify value and avoid popular traps. When money 
            percentage significantly exceeds bet percentage, it indicates larger bets from sharper bettors.
          </p>
        </div>
      </div>
    )
  }

  const renderGamesView = () => {
    if (isLoadingGames) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '1rem'
        }}>
          Loading sports data...
        </div>
      )
    }

    if (sportsData.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <BsClipboard2Data style={{ fontSize: '4rem', marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.3)' }} />
          <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '0.5rem' }}>
            No games available
          </div>
          <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Check back soon for upcoming games
          </div>
        </div>
      )
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '12px',
        padding: '20px'
      }}>
        {sportsData.map((sport) => (
          <div
            key={sport.sport}
            onClick={() => router.push(`/sports/${sport.sport}/games`)}
            style={{
              position: 'relative',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(99, 102, 241, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.65rem',
              fontWeight: '600',
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {sport.dateLabel}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <img 
                src={sport.sportLogo} 
                alt={sport.sportLabel}
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                {sport.sportLabel}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px dashed rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                padding: '8px 4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#6366f1' }}>
                  {sport.gamesCount}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', marginTop: '2px' }}>
                  Games
                </div>
              </div>
              
              <div style={{
                background: 'rgba(234, 88, 12, 0.1)',
                border: '1px dashed rgba(234, 88, 12, 0.3)',
                borderRadius: '8px',
                padding: '8px 4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ea580c' }}>
                  {sport.picksCount}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', marginTop: '2px' }}>
                  Picks
                </div>
              </div>
              
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px dashed rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '8px 4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>
                  {sport.scriptsCount}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', marginTop: '2px' }}>
                  Scripts
                </div>
              </div>

              <div style={{
                background: 'rgba(251, 146, 60, 0.1)',
                border: '1px dashed rgba(251, 146, 60, 0.3)',
                borderRadius: '8px',
                padding: '8px 4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fb923c' }}>
                  {sport.gamesCount * 4}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', marginTop: '2px' }}>
                  Data
                </div>
              </div>
            </div>

            {sport.topMatchup && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center'
              }}>
                Featured: <span style={{ color: '#ffffff', fontWeight: 600 }}>{sport.topMatchup}</span>
              </div>
            )}
          </div>
        ))}
        
        {/* NCAAB */}
        <div
          style={{
            position: 'relative',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '16px',
            padding: '16px',
            opacity: 0.6
          }}
        >
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(148, 163, 184, 0.15)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.65rem',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase'
          }}>
            Soon
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <img 
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b63f708e0881f1517_5.svg"
              alt="NCAAB"
              style={{ width: '32px', height: '32px', objectFit: 'contain', opacity: 0.5 }}
            />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
              NCAAB
            </h3>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            padding: '24px 8px',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            Coming Soon
          </div>
        </div>
      </div>
    )
  }

  const renderPicksView = () => {
    if (isLoadingPicks) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '1rem'
        }}>
          Loading picks...
        </div>
      )
    }

    const picksByCapper = allPicks.reduce((acc, pick) => {
      const capperName = pick.bettor_name || 'Unknown'
      if (!acc[capperName]) {
        acc[capperName] = {
          name: capperName,
          record: pick.bettor_record || '',
          winStreak: pick.bettor_win_streak || 0,
          profileImage: pick.bettor_profile_image,
          profileInitials: pick.bettor_profile_initials,
          picks: []
        }
      }
      acc[capperName].picks.push(pick)
      return acc
    }, {} as Record<string, any>)

    // Sort cappers by win streak (descending), then by record win percentage
    const cappers = Object.values(picksByCapper).sort((a: any, b: any) => {
      // First sort by win streak
      if (b.winStreak !== a.winStreak) {
        return b.winStreak - a.winStreak
      }
      
      // Then by record (extract wins and calculate percentage)
      const parseRecord = (record: string) => {
        if (!record) return 0
        const match = record.match(/(\d+)-(\d+)/)
        if (!match) return 0
        const wins = parseInt(match[1])
        const losses = parseInt(match[2])
        const total = wins + losses
        return total > 0 ? wins / total : 0
      }
      
      return parseRecord(b.record) - parseRecord(a.record)
    })

    return (
      <div style={{ padding: '20px' }}>
        {/* Horizontal Date Bar (like /betting/dashboard) */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}>
              {(() => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const dates = []
                for (let i = 0; i < 30; i++) {
                  const date = new Date(today)
                  date.setDate(today.getDate() + i)
                  dates.push(date)
                }
                return dates.map((date, index) => {
                  const dateStr = formatDateString(date)
                  const isSelected = isSameDay(date, currentDate)
                  const count = pickCounts[dateStr] || 0
                  const hasData = count > 0
                  const isToday = index === 0

                  return (
                    <button
                      key={dateStr}
                      onClick={() => selectDate(dateStr)}
                      style={{
                        minWidth: isToday ? '60px' : '50px',
                        padding: '0.5rem 0.4rem',
                        background: isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : hasData ? '#1e293b' : '#0f172a',
                        border: `1px solid ${isSelected ? '#8b5cf6' : hasData ? '#334155' : '#1e293b'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.15rem',
                        flexShrink: 0
                      }}
                    >
                      <div style={{
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        color: isSelected ? '#e9d5ff' : '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                      </div>
                      {hasData && (
                        <div style={{
                          fontSize: '0.6rem',
                          fontWeight: '700',
                          color: isSelected ? '#c4b5fd' : '#6366f1',
                          background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(99, 102, 241, 0.2)',
                          padding: '1px 5px',
                          borderRadius: '8px',
                          minWidth: '20px'
                        }}>
                          {count}
                        </div>
                      )}
                    </button>
                  )
                })
              })()}
        </div>

        {/* Picks by capper - Using dashboard styles */}
        {cappers.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <IoTicketOutline style={{ fontSize: '4rem', marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.3)' }} />
            <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '0.5rem' }}>
              No picks for this date
            </div>
            <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Select a different date from the calendar above
            </div>
          </div>
        ) : (
          <div className={dashboardStyles.capperList}>
            {cappers.map((capper) => (
              <div key={capper.name} className={dashboardStyles.capperCard}>
                <div className={dashboardStyles.capperHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BettorProfileImage 
                      imageUrl={capper.profileImage} 
                      initials={capper.profileInitials}
                      size={36}
                    />
                    <span className={dashboardStyles.capperName}>{capper.name}</span>
                  </div>
                  {capper.winStreak > 0 && (
                    <span className={dashboardStyles.capperStreak}>
                      <FaFireAlt className={dashboardStyles.capperStreakIcon} />
                      {capper.winStreak}
                    </span>
                  )}
                </div>
                {capper.record && <div className={dashboardStyles.capperRecord}>{capper.record}</div>}
                <div className={dashboardStyles.capperPickList}>
                  {capper.picks.map((pick: Pick) => {
                    const isExpanded = expandedPicks.has(pick.id)
                    return (
                      <div key={pick.id} className={dashboardStyles.capperPickCard}>
                        <div className={dashboardStyles.capperPickHeader}>
                          <div 
                            className={dashboardStyles.pickHeaderMeta}
                            style={pick.units > 1.5 ? { 
                              background: 'rgba(234, 88, 12, 0.25)', 
                              borderColor: 'rgba(251, 146, 60, 0.5)',
                              color: 'rgba(251, 146, 60, 0.95)'
                            } : {}}
                          >
                            {pick.odds} | {pick.units.toFixed(1)}u
                          </div>
                        </div>
                        <div className={dashboardStyles.pickBody}>
                          {(pick.away_team || pick.home_team) && (
                            <div className={dashboardStyles.pickMatchup}>
                              {pick.away_team ?? 'Away'} @ {pick.home_team ?? 'Home'}
                            </div>
                          )}
                          <p 
                            className={dashboardStyles.pickTitle}
                            style={!hasAccess() ? { filter: 'blur(6px)', userSelect: 'none' } : {}}
                          >
                            {pick.bet_title}
                          </p>
                          <div className={dashboardStyles.pickFooter}>
                            {hasAccess() ? (
                              <>
                                <button
                                  className={dashboardStyles.pickAnalysisLink}
                                  type="button"
                                  onClick={() => togglePickAnalysis(pick.id)}
                                >
                                  <span>Analysis</span>
                                  <span
                                    className={dashboardStyles.pickAnalysisLinkIcon}
                                    style={{ transform: isExpanded ? 'rotate(-135deg)' : 'rotate(45deg)' }}
                                  />
                                </button>
                                <span>{new Date(pick.game_time).toLocaleString('en-US', {
                                  timeZone: 'America/New_York',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}</span>
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
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    if (!isSignedIn) {
                                      openSignUp({ redirectUrl: '/pricing' })
                                    } else {
                                      router.push('/pricing')
                                    }
                                  }}
                                >
                                  {!isSignedIn ? 'Sign Up for $1 Trial' : 'Unlock with $1 Trial'}
                                </span>
                              </>
                            )}
                          </div>
                          {hasAccess() && isExpanded && pick.analysis && (
                            <div
                              className={dashboardStyles.pickAnalysisContent}
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
        )}
      </div>
    )
  }

  const renderScriptsView = () => {
    if (isLoadingScripts) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '1rem'
        }}>
          Loading scripts...
        </div>
      )
    }

    if (sportsScripts.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <BsClipboard2Data style={{ fontSize: '4rem', marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.3)' }} />
          <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '0.5rem' }}>
            No scripts available
          </div>
          <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Check back soon for AI-generated game scripts
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {sportsScripts.map((sportData) => (
          <div key={sportData.sport}>
            {/* Sport Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              <img 
                src={sportData.sportLogo} 
                alt={sportData.sportLabel}
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#ffffff',
                margin: 0
              }}>
                {sportData.sportLabel}
              </h2>
              <span style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginLeft: 'auto'
              }}>
                Top {sportData.scripts.length} Scripts
              </span>
            </div>

            {/* Scripts Grid */}
            <div 
              onClick={() => router.push(`/sports/${sportData.sport}/ai-scripts`)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              {sportData.scripts.map((script) => {
                const isExpanded = expandedScripts.has(script.id)
                const isGenerating = generatingScripts.has(script.id)
                
                return (
                  <div
                    key={script.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.88)',
                      borderRadius: '18px',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Game header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div>
                        {/* Logos */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          {script.awayTeamLogo && (
                            <img src={script.awayTeamLogo} alt={script.awayTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                          )}
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>@</span>
                          {script.homeTeamLogo && (
                            <img src={script.homeTeamLogo} alt={script.homeTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                          )}
                        </div>
                        {/* Matchup */}
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'rgba(226, 232, 240, 0.85)'
                        }}>
                          {script.awayTeam} @ {script.homeTeam}
                        </div>
                      </div>
                      {script.script && (
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#10b981'
                        }}>
                          {script.script.strengthLabel}
                        </div>
                      )}
                    </div>

                    {script.script ? (
                      <>
                        <button
                          onClick={() => toggleScriptContent(script.id)}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#a5b4fc'
                          }}
                        >
                          {isExpanded ? 'Hide Script' : 'View Script'}
                        </button>
                        {isExpanded && (
                          <div style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            lineHeight: '1.6',
                            color: 'rgba(226, 232, 240, 0.9)',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {script.script.content}
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => !isGenerating && handleGenerateScript(script.id, script.sport)}
                        disabled={isGenerating}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: isGenerating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          background: isGenerating ? 'rgba(148, 163, 184, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          border: `1px solid ${isGenerating ? 'rgba(148, 163, 184, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                          color: isGenerating ? 'rgba(148, 163, 184, 0.7)' : '#a5b4fc',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        {isGenerating ? 'Generating...' : (
                          <>
                            Generate Script
                            <FaWandMagicSparkles style={{ fontSize: '0.85rem' }} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* CTA */}
            <div 
              onClick={() => router.push(`/sports/${sportData.sport}/ai-scripts`)}
              style={{
                marginTop: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#a5b4fc',
                textDecoration: 'underline'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#c4b5fd'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a5b4fc'
              }}
              >
                Click here to view all {sportData.sportLabel} scripts →
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderPublicGameCard = (game: PublicGame) => {
    const pm = game.publicMoney
    const rlmStats = getRlmStats(pm)
    const mostMarkets = getTopPublicMarkets(game, 3)
    const bigMoney = getBigMoneyStats(game)

    return (
      <div 
        key={game.id}
        style={{
          position: 'relative',
          background: 'rgba(15, 23, 42, 0.88)',
          borderRadius: '18px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Game header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {game.awayTeamLogo && (
                <img src={game.awayTeamLogo} alt={game.awayTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              )}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>@</span>
              {game.homeTeamLogo && (
                <img src={game.homeTeamLogo} alt={game.homeTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.65)' }}>
              {formatPublicCardDate(game.kickoff)}
            </div>
          </div>
          <div style={{ 
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: publicView === 'sharp' ? '1.5rem' : '1.25rem',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            {publicView === 'most' && <PiMoneyWavy />}
            {publicView === 'vegas' && <FaDice />}
            {publicView === 'sharp' && <LuArrowBigUpDash />}
          </div>
        </div>

        {/* Betting data */}
        <div style={{ position: 'relative' }}>
          <div style={!hasAccess() ? { filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' } : {}}>
            {publicView === 'most' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {mostMarkets.map((market) => (
                  <div key={market.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'rgba(226, 232, 240, 0.85)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {market.label}
                      {market.lineMovement !== null && (
                        <span style={{
                          fontSize: '10px',
                          background: 'rgba(251, 146, 60, 0.15)',
                          border: '1px solid rgba(251, 146, 60, 0.3)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          color: '#fb923c'
                        }}>
                          {market.lineMovement > 0 ? '-' : '+'}{Math.abs(market.lineMovement).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      fontSize: '11px',
                      color: 'rgba(226, 232, 240, 0.7)'
                    }}>
                      <span>{formatPercentage(market.bets)} bets</span>
                      {market.stake !== null && (
                        <span style={{ color: 'rgba(129, 231, 255, 0.95)' }}>
                          {formatPercentage(market.stake)} money
                        </span>
                      )}
                    </div>
                    <div style={{
                      height: '6px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.25)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #22d3ee, #6366f1)',
                        width: `${Math.min(100, Math.max(0, market.bets ?? 0))}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {publicView === 'vegas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rlmStats.slice(0, 3).map((stat, index) => {
                  const rlmValue = toNumber(stat.percentage || (stat as any).percentage2)
                  const lineMove = toNumber(stat.line_movement)
                  
                  return (
                    <div key={`${game.id}-rlm-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'rgba(226, 232, 240, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {formatBetTypeLabel(stat.bet_type as string | undefined, game.awayTeam, game.homeTeam)}
                        {lineMove !== null && (
                          <span style={{
                            fontSize: '10px',
                            background: 'rgba(251, 146, 60, 0.15)',
                            border: '1px solid rgba(251, 146, 60, 0.3)',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            color: '#fb923c'
                          }}>
                            {lineMove > 0 ? '-' : '+'}{Math.abs(lineMove).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '11px',
                        color: 'rgba(226, 232, 240, 0.7)'
                      }}>
                        <span>{Math.round(rlmValue ?? 0)}% value</span>
                      </div>
                      <div style={{
                        height: '6px',
                        borderRadius: '999px',
                        background: 'rgba(148, 163, 184, 0.25)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #22d3ee, #6366f1)',
                          width: `${Math.min(100, Math.max(0, rlmValue ?? 0))}%`
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {publicView === 'sharp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bigMoney.slice(0, 3).map((stat) => (
                  <div key={`${game.id}-big-${stat.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'rgba(226, 232, 240, 0.85)'
                    }}>
                      {stat.label}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      fontSize: '11px',
                      color: 'rgba(226, 232, 240, 0.7)'
                    }}>
                      <span>{formatPercentage(stat.bets)} bets</span>
                      <span style={{ color: 'rgba(129, 231, 255, 0.95)' }}>
                        {formatPercentage(stat.stake)} money
                      </span>
                      <span style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase' }}>
                        +{Math.round((stat.diff ?? 0) * 10) / 10}% diff
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {!hasAccess() && (
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
              cursor: 'pointer',
              zIndex: 1
            }}
            onClick={() => {
              if (!isSignedIn) {
                openSignUp({ redirectUrl: '/pricing' })
              } else {
                router.push('/pricing')
              }
            }}
            >
              <FaLock style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.7)' }} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                {!isSignedIn ? 'Sign Up for $1 Trial' : 'Unlock with $1 Trial'}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderPublicView = () => {
    if (isLoadingPublic) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '1rem'
        }}>
          Loading public betting data...
        </div>
      )
    }

    if (sportsPublic.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <PiMoneyWavy style={{ fontSize: '4rem', marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.3)' }} />
          <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '0.5rem' }}>
            No public betting data available
          </div>
          <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Check back soon for upcoming games
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '20px' }}>
        {/* Sports and games - Default to Most Public view */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {sportsPublic.map((sportData) => (
            <div key={sportData.sport}>
              {/* Sport Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
              }}>
                <img 
                  src={sportData.sportLogo} 
                  alt={sportData.sportLabel}
                  style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                />
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: 0
                }}>
                  {sportData.sportLabel}
                </h2>
                <span style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginLeft: 'auto'
                }}>
                  Top {sportData.games.length} Games
                </span>
              </div>

              {/* Games Grid */}
              <div 
                onClick={() => router.push(`/sports/${sportData.sport}/public-betting`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                  cursor: 'pointer'
                }}
              >
                {sportData.games.map((game) => renderPublicGameCard(game))}
              </div>
              
              {/* CTA */}
              <div 
                onClick={() => router.push(`/sports/${sportData.sport}/public-betting`)}
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#a5b4fc',
                  textDecoration: 'underline'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#c4b5fd'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#a5b4fc'
                }}
                >
                  Click here to view detailed {sportData.sportLabel} public trends →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const toolkitItems = [
    {
      id: 'discord',
      title: 'Pick Notifications',
      icon: <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" style={{ width: '20px', height: '20px' }} alt="Discord" />,
      iconBg: 'rgba(88, 100, 241, 0.15)',
      iconBorder: 'rgba(88, 100, 241, 0.4)',
      component: <DiscordWidget compact={true} />
    },
    {
      id: 'affiliate',
      title: 'Affiliate Program',
      icon: <MdAddLink size={20} />,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconBorder: 'rgba(16, 185, 129, 0.4)',
      component: <AffiliateWidget compact={true} />
    },
    {
      id: 'profit',
      title: 'Profit Guide',
      icon: <GiReceiveMoney size={20} />,
      iconBg: 'rgba(0, 87, 45, 0.15)',
      iconBorder: 'rgba(0, 87, 45, 0.4)',
      component: <MaximizeProfitWidget compact={true} />
    },
    {
      id: 'books',
      title: 'Get a Free 30 Days',
      icon: <IoIosGift size={20} />,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconBorder: 'rgba(16, 185, 129, 0.4)',
      component: <TopRatedBooksWidget compact={true} />
    }
  ]

  const renderToolkitView = () => {
    return (
      <div className={dashboardStyles.toolkitGrid}>
        {toolkitItems.map((item) => {
          const isOpen = expandedToolkitItem === item.id
          return (
            <div key={item.id} className={dashboardStyles.toolkitItem}>
              <div 
                className={dashboardStyles.toolkitItemHeader}
                onClick={() => setExpandedToolkitItem(isOpen ? null : item.id)}
              >
                <div className={dashboardStyles.toolkitItemTitle}>
                  <div 
                    className={dashboardStyles.toolkitItemIcon}
                    style={{
                      background: item.iconBg,
                      border: `1.5px solid ${item.iconBorder}`
                    }}
                  >
                    {item.icon}
                  </div>
                  <span>{item.title}</span>
                </div>
                <div className={`${dashboardStyles.toolkitItemChevron} ${isOpen ? dashboardStyles.toolkitItemChevronOpen : ''}`}>
                  ▼
                </div>
              </div>
              <div className={dashboardStyles.toolkitItemContent} data-open={isOpen}>
                {isOpen && item.component}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderContent = () => {
    // If toolkit is open, show toolkit view
    if (isToolkitOpen) {
      return renderToolkitView()
    }

    if (activeFilter === 'scriptsAbout') {
      return renderAboutScripts()
    }
    if (activeFilter === 'publicAbout') {
      return renderAboutPublic()
    }

    if (activeTab === 'games') {
      return renderGamesView()
    }

    if (activeTab === 'picks') {
      return renderPicksView()
    }

    if (activeTab === 'scripts') {
      return renderScriptsView()
    }

    if (activeTab === 'public') {
      return renderPublicView()
    }

    return null
  }

  const availableFilters = subFilters[activeTab] ?? []
  const filterLabels: Record<SubFilterKey, string> = {
    scriptsAbout: 'About',
    publicAbout: 'About'
  }

  return (
    <div className={`${styles.page} sportsSelectorPage`}>
      <div className={styles.topBar}>
        <div className={styles.sportPicker} ref={sportMenuRef}>
          <button
            type="button"
            className={styles.sportChip}
            onClick={() => setIsSportMenuOpen((prev) => !prev)}
          >
            <GiSelect style={{ color: 'white', fontSize: '1.25rem' }} />
          </button>
          {isSportMenuOpen && (
            <div className={styles.sportDropdown}>
              {sportOptions.map((option) => {
                const isDisabled = option.status !== 'active'
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.sportOption} ${isDisabled ? styles.sportOptionDisabled : ''}`}
                    onClick={() => {
                      if (isDisabled) return
                      handleSportSelect(option.id)
                      setIsSportMenuOpen(false)
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
          className={`${dashboardStyles.toolkitButton} ${isToolkitOpen ? dashboardStyles.toolkitActive : ''}`}
          onClick={handleToolkitToggle}
        >
          <FaWrench size={16} />
          <span>Toolkit</span>
        </button>
      </div>

      <nav className={`${styles.tabBar} ${isToolkitOpen ? dashboardStyles.tabBarDimmed : ''}`}>
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
        <div className={styles.subFilterBar}>
          {availableFilters.map((filter) => (
            <button
              key={filter}
              className={`${styles.subFilterButton} ${activeFilter === filter ? styles.subFilterButtonActive : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
      )}

      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  )
}

export default function SportsSelectorPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <SportsSelectorPageContent />
    </Suspense>
  )
}
