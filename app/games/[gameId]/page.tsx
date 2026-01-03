'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { supabase } from '@/lib/supabase'
import { FiChevronLeft, FiClock, FiChevronDown, FiChevronUp, FiRefreshCw, FiChevronRight } from 'react-icons/fi'
import { IoSparkles } from 'react-icons/io5'
import { GiSupersonicArrow, GiCash } from 'react-icons/gi'
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
import styles from './gameDetail.module.css'

interface GameData {
  id: string
  awayTeam: string
  homeTeam: string
  awayTeamAbbr: string
  homeTeamAbbr: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  awayTeamColor: string | null
  homeTeamColor: string | null
  kickoff: string
  kickoffLabel: string
  sport: string
  spread: { homeLine: number | null; awayLine: number | null } | null
  totals: { number: number | null } | null
  moneyline: { home: number | null; away: number | null } | null
  sportsbook: string | null
  publicBetting: {
    spreadHomeBetPct: number | null
    spreadHomeMoneyPct: number | null
    mlHomeBetPct: number | null
    mlHomeMoneyPct: number | null
    totalOverBetPct: number | null
    totalOverMoneyPct: number | null
  } | null
  signals: {
    spread: {
      home: { publicRespect: number; vegasBacked: number; whaleRespect: number }
      away: { publicRespect: number; vegasBacked: number; whaleRespect: number }
    }
    total: {
      over: { publicRespect: number; vegasBacked: number; whaleRespect: number }
      under: { publicRespect: number; vegasBacked: number; whaleRespect: number }
    }
    ml: {
      home: { publicRespect: number; vegasBacked: number; whaleRespect: number }
      away: { publicRespect: number; vegasBacked: number; whaleRespect: number }
    }
  }
  hasPublicBetting: boolean
}

interface LineMovementPoint {
  time: string
  homeLine: number
  awayLine: number
  total: number
  mlHome: number
  mlAway: number
}

type MarketType = 'spread' | 'total' | 'ml'

function formatGameTime(dateString: string): string {
  // dateString should be "YYYY-MM-DD HH:MM" in EST from API
  // If it contains a space, it's the EST format
  if (dateString.includes(' ') && dateString.length < 20) {
    // Parse EST format: "YYYY-MM-DD HH:MM"
    const [datePart, timePart] = dateString.split(' ')
    const [year, month, day] = datePart.split('-')
    const [hours, minutes] = timePart.split(':').map(Number)
    
    // Format time to 12hr
    const hour12 = hours % 12 || 12
    const ampm = hours >= 12 ? 'PM' : 'AM'
    
    // Create a readable date string
    const date = new Date(`${year}-${month}-${day}T00:00:00`)
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
    const monthName = date.toLocaleDateString('en-US', { month: 'short' })
    const dayNum = parseInt(day)
    
    return `${dayOfWeek}, ${monthName} ${dayNum} at ${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }
  
  // Fallback for UTC ISO format
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatSpread(spread: number | null | undefined): string {
  if (spread === null || spread === undefined) return '-'
  return spread > 0 ? `+${spread}` : `${spread}`
}

function formatML(ml: number | null | undefined): string {
  if (ml === null || ml === undefined) return '-'
  return ml > 0 ? `+${ml}` : `${ml}`
}

// Get just the team name (last word), e.g., "Carolina Panthers" -> "Panthers"
function getTeamName(fullName: string): string {
  const words = fullName.split(' ')
  return words[words.length - 1] || fullName
}

// Bet Logo Component - determines which logo to show based on bet type
function BetLogo({ pick, gameData }: { pick: any; gameData: GameData | null }) {
  // If prop_image exists, show player image
  if (pick.prop_image) {
    return (
      <img
        src={pick.prop_image}
        alt="Player"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0
        }}
      />
    )
  }

  if (!gameData) return null

  // Check if it's a total (O/U) - both logos
  const isTotal = pick.bet_title?.includes(' O') || pick.bet_title?.includes(' U') || 
                   pick.bet_title?.includes('/')
  
  if (isTotal && gameData.awayTeamLogo && gameData.homeTeamLogo) {
    return (
      <div style={{ position: 'relative', width: 36, height: 28, flexShrink: 0 }}>
        <img
          src={gameData.awayTeamLogo}
          alt=""
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            objectFit: 'contain',
            position: 'absolute',
            left: 0,
            zIndex: 1,
            border: '1px solid rgba(0, 0, 0, 0.5)',
            background: 'rgba(0, 0, 0, 0.3)'
          }}
        />
        <img
          src={gameData.homeTeamLogo}
          alt=""
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            objectFit: 'contain',
            position: 'absolute',
            left: 14,
            zIndex: 2,
            border: '1px solid rgba(0, 0, 0, 0.5)',
            background: 'rgba(0, 0, 0, 0.3)'
          }}
        />
      </div>
    )
  }

  // For spreads/MLs, try to determine which team is being bet
  const betTitleLower = (pick.bet_title || '').toLowerCase()
  const awayTeam = gameData.awayTeam.toLowerCase()
  const homeTeam = gameData.homeTeam.toLowerCase()
  
  if (homeTeam && betTitleLower.includes(homeTeam) && gameData.homeTeamLogo) {
    return (
      <img
        src={gameData.homeTeamLogo}
        alt=""
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
    )
  }
  
  if (awayTeam && betTitleLower.includes(awayTeam) && gameData.awayTeamLogo) {
    return (
      <img
        src={gameData.awayTeamLogo}
        alt=""
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
    )
  }

  // Default to home team logo
  if (gameData.homeTeamLogo) {
    return (
      <img
        src={gameData.homeTeamLogo}
        alt=""
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
    )
  }

  return null
}

// Custom Tooltip for the graph
const CustomTooltip = ({ active, payload, marketType }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className={styles.graphTooltip}>
        <p className={styles.tooltipTime}>{data.time}</p>
        {marketType === 'spread' && (
          <>
            <p>Away: {formatSpread(data.awayLine)}</p>
            <p>Home: {formatSpread(data.homeLine)}</p>
          </>
        )}
        {marketType === 'total' && <p>Total: {data.total}</p>}
        {marketType === 'ml' && (
          <>
            <p>Away ML: {formatML(data.mlAway)}</p>
            <p>Home ML: {formatML(data.mlHome)}</p>
          </>
        )}
      </div>
    )
  }
  return null
}

export default function GameDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { hasPicks, hasPublicBetting, hasAny } = useEntitlements()
  
  const gameId = params.gameId as string
  const sport = searchParams.get('sport') || 'nfl'
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [script, setScript] = useState<string | null>(null)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'script' | 'odds' | 'picks' | 'betting'>('script')
  
  // Odds tab state
  const [marketType, setMarketType] = useState<MarketType>('spread')
  const [timelineData, setTimelineData] = useState<LineMovementPoint[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [sportsbookOdds, setSportsbookOdds] = useState<any>(null)
  const [showAllOdds, setShowAllOdds] = useState(false)
  
  // Picks tab state
  const [gamePicks, setGamePicks] = useState<any[]>([])
  const [picksLoading, setPicksLoading] = useState(false)
  const [expandedPicks, setExpandedPicks] = useState<Set<string>>(new Set())
  
  // Active pick counts
  const [pickCounts, setPickCounts] = useState({
    gamePickCount: 0,
    sportPickCount: 0,
    allPicksCount: 0,
  })
  const [countsLoading, setCountsLoading] = useState(false)
  
  // Public Betting tab state - removed, showing all bet types now
  
  // Access checks
  const canViewPicks = hasPicks || hasAny
  const canViewPublicBetting = hasPublicBetting || hasAny
  
  // Team colors for gradient
  const awayColor = gameData?.awayTeamColor || '#3b82f6'
  const homeColor = gameData?.homeTeamColor || '#6366f1'
  
  // Render segmented signal bar (from /public-betting)
  const renderSegmentedBar = (value: number, type: 'public' | 'vegas' | 'whale') => {
    const totalSegments = 20
    const filledSegments = Math.round((value / 100) * totalSegments)
    const barClass = type === 'public' ? styles.publicBar : type === 'vegas' ? styles.vegasBar : styles.whaleBar
    
    return (
      <div className={styles.signalBarContainerV2}>
        {Array.from({ length: totalSegments }, (_, i) => (
          <div 
            key={i} 
            className={`${styles.signalBarSegment} ${i < filledSegments ? `${styles.filled} ${barClass}` : ''}`}
          />
        ))}
      </div>
    )
  }
  
  useEffect(() => {
    async function fetchGameData() {
      try {
        setIsLoading(true)
        
        const gamesRes = await fetch(`/api/games/upcoming?sport=${sport}`)
        const gamesData = await gamesRes.json()
        
        if (gamesData.success && gamesData.games) {
          const game = gamesData.games.find((g: GameData) => g.id === gameId)
          if (game) {
            setGameData(game)
          }
        }
        
        // Fetch FREE script
        // Extract Odds API ID from game_id (e.g., nfl_abc123 -> abc123)
        const oddsApiId = gameId.includes('_') ? gameId.split('_')[1] : gameId
        console.log(`[Game Detail] Fetching script for gameId: ${gameId} -> oddsApiId: ${oddsApiId}`)
        try {
          const scriptRes = await fetch(`/api/game-scripts/free?gameId=${oddsApiId}&sport=${sport.toUpperCase()}`)
          const scriptData = await scriptRes.json()
          console.log(`[Game Detail] Script response:`, scriptData.cached ? 'cached' : (scriptData.script ? 'found' : 'not found'))
          if (scriptData.script) {
            setScript(scriptData.script)
          } else {
            console.warn(`[Game Detail] No script found for ${oddsApiId}`)
          }
        } catch (e) {
          console.error('[Game Detail] Error fetching script:', e)
        }
        
      } catch (error) {
        console.error('Error fetching game data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGameData()
  }, [gameId, sport])
  
  // Fetch timeline data when odds tab is active
  useEffect(() => {
    if (activeTab === 'odds' && gameId) {
      fetchTimelineData()
    }
  }, [activeTab, gameId])
  
  // Fetch picks when picks tab is active (always fetch, even without access, to show blurred picks)
  useEffect(() => {
    if (activeTab === 'picks' && gameId && gameData) {
      fetchGamePicks()
    }
  }, [activeTab, gameId, gameData])
  
  // Reset expanded picks when switching away from picks tab
  useEffect(() => {
    if (activeTab !== 'picks') {
      setExpandedPicks(new Set())
    }
  }, [activeTab])
  
  // Fetch pick counts when game data is available
  useEffect(() => {
    if (gameData && gameId) {
      fetchPickCounts()
    }
  }, [gameData, gameId])
  
  const fetchTimelineData = async () => {
    setTimelineLoading(true)
    try {
      const response = await fetch(`/api/public-betting/game-timeline/${gameId}?timeFilter=all`)
      const data = await response.json()
      
      if (data.success && data.timeline) {
        setTimelineData(data.timeline)
        setSportsbookOdds(data.sportsbookOdds || null)
      } else {
        setTimelineData([])
        setSportsbookOdds(null)
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
      setTimelineData([])
      setSportsbookOdds(null)
    } finally {
      setTimelineLoading(false)
    }
  }
  
  const fetchGamePicks = async () => {
    setPicksLoading(true)
    try {
      if (!gameData) {
        setGamePicks([])
        setPicksLoading(false)
        return
      }

      // Get current time to filter for active picks only
      const now = new Date()
      const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))

      // First try to match by game_id (exact match)
      let { data: gameIdData, error: gameIdError } = await supabase
        .from('picks')
        .select('*, bettors(name, record, win_streak, profile_initials, profile_image)')
        .eq('game_id', gameId)
        .gte('game_time', estNow.toISOString())
        .order('posted_at', { ascending: false })

      if (gameIdError) {
        console.error('[Game Picks] Supabase error (game_id query):', gameIdError)
      }
      
      console.log(`[Game Picks] Found ${(gameIdData || []).length} picks matching game_id: ${gameId}`)

      // Also get picks for the same day/sport to match by team names or time
      // (for picks that might have different game_id format or no game_id)
      let timeData: any[] = []
      if (gameData.kickoff) {
        const gameTime = new Date(gameData.kickoff)
        // Look back 1 day and forward 1 day to catch picks that might have slightly different dates
        const startTime = new Date(gameTime)
        startTime.setDate(startTime.getDate() - 1)
        startTime.setHours(0, 0, 0, 0)
        const endTime = new Date(gameTime)
        endTime.setDate(endTime.getDate() + 1)
        endTime.setHours(23, 59, 59, 999)

        const awayTeamName = gameData.awayTeam.toLowerCase()
        const homeTeamName = gameData.homeTeam.toLowerCase()

        // Get picks for the same day and sport (only active picks)
        // Use the later of startTime or estNow to ensure we only get future picks
        const minTime = startTime > estNow ? startTime : estNow
        const { data: timeQueryData, error: timeError } = await supabase
          .from('picks')
          .select('*, bettors(name, record, win_streak, profile_initials, profile_image)')
          .eq('sport', gameData.sport.toUpperCase())
          .gte('game_time', minTime.toISOString())
          .lte('game_time', endTime.toISOString())
          .order('posted_at', { ascending: false })

        if (!timeError && timeQueryData && timeQueryData.length > 0) {
          console.log(`[Game Picks] Found ${timeQueryData.length} picks for ${gameData.sport} on ${gameData.kickoff}`)
          console.log(`[Game Picks] Looking for teams: ${awayTeamName} / ${homeTeamName}`)
          console.log(`[Game Picks] Game kickoff: ${gameData.kickoff}`)
          console.log(`[Game Picks] Sample picks (first 5):`, timeQueryData.slice(0, 5).map((p: any) => ({
            bet_title: p.bet_title,
            game_title: p.game_title,
            game_id: p.game_id || 'null',
            game_time: p.game_time,
            sport: p.sport
          })))
          
          // Filter picks that match this game by team names in game_title
          // Match by game_title containing both teams (most reliable indicator)
          timeData = timeQueryData.filter((p: any) => {
            // Skip picks that already matched by exact game_id (to avoid duplicates)
            if (p.game_id && p.game_id.trim() !== '' && p.game_id === gameId) {
              return false
            }
            
            // Match by game_title containing both team names
            const title = (p.game_title || p.bet_title || '').toLowerCase()
            
            // Check if game_title contains both team names (most reliable - this is what worked before)
            const awayWords = awayTeamName.split(' ').filter(word => word.length > 2)
            const homeWords = homeTeamName.split(' ').filter(word => word.length > 2)
            const hasAwayInTitle = awayWords.some(word => title.includes(word.toLowerCase()))
            const hasHomeInTitle = homeWords.some(word => title.includes(word.toLowerCase()))
            
            // If BOTH teams are mentioned in game_title, it's for this game
            if (hasAwayInTitle && hasHomeInTitle) {
              console.log(`[Game Picks] Match by both teams in game_title: "${p.bet_title}" | game_title: "${p.game_title}"`)
              return true
            }
            
            // Also check matchup pattern (e.g., "Seahawks @ 49ers")
            const matchupPattern = `${awayTeamName.toLowerCase()} @ ${homeTeamName.toLowerCase()}`
            const reverseMatchupPattern = `${homeTeamName.toLowerCase()} @ ${awayTeamName.toLowerCase()}`
            const hasMatchup = title.includes(matchupPattern) || title.includes(reverseMatchupPattern)
            
            if (hasMatchup) {
              console.log(`[Game Picks] Match by matchup pattern: "${p.bet_title}" | game_title: "${p.game_title}"`)
              return true
            }
            
            // If no match, return false
            const matches = false
            
            // No match found
            console.log(`[Game Picks] No match for: "${p.bet_title}" | game_title: "${p.game_title || 'none'}" | game_id: ${p.game_id || 'null'}`)
            return false
          })
          
          console.log(`[Game Picks] After filtering: ${timeData.length} picks match team names`)
        }
      }

      // Combine results from both queries and deduplicate by pick id
      const allPicks = [...(gameIdData || []), ...timeData]
      const uniquePicks = Array.from(
        new Map(allPicks.map((p: any) => [p.id, p])).values()
      )
      
      console.log(`[Game Picks] Total unique picks found: ${uniquePicks.length}`)
      if (uniquePicks.length > 0) {
        console.log('[Game Picks] Pick titles:', uniquePicks.map((p: any) => p.bet_title))
      }
      
      const data = uniquePicks

      const picks = (data || []).map((p: any) => ({
        ...p,
        bettor_name: p.bettors?.name || 'Unknown',
        bettor_record: p.bettors?.record || '',
        bettor_win_streak: p.bettors?.win_streak || 0,
        bettor_profile_initials: p.bettors?.profile_initials || '??',
        bettor_profile_image: p.bettors?.profile_image || null,
        // Use gameData team logos if available
        away_team_image: gameData?.awayTeamLogo || p.away_team_image || null,
        home_team_image: gameData?.homeTeamLogo || p.home_team_image || null,
        prop_image: p.prop_image || null,
        game_title: gameData ? `${gameData.awayTeam} @ ${gameData.homeTeam}` : p.game_title || '',
        analysis: p.analysis || null,
      }))

      setGamePicks(picks)
    } catch (error) {
      console.error('Error fetching game picks:', error)
      setGamePicks([])
    } finally {
      setPicksLoading(false)
    }
  }
  
  // Fetch active pick counts
  const fetchPickCounts = async () => {
    if (!gameData) return
    
    setCountsLoading(true)
    try {
      const response = await fetch(
        `/api/picks/active-counts?gameId=${gameId}&sport=${gameData.sport.toLowerCase()}`
      )
      const data = await response.json()
      
      if (data.success) {
        setPickCounts({
          gamePickCount: data.gamePickCount,
          sportPickCount: data.sportPickCount,
          allPicksCount: data.allPicksCount,
        })
      }
    } catch (error) {
      console.error('Error fetching pick counts:', error)
    } finally {
      setCountsLoading(false)
    }
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
  
  const handleSubscribe = (type: 'picks' | 'publicBetting') => {
    if (!isSignedIn) {
      openSignUp({ redirectUrl: `/subscribe/${type}` })
    } else {
      router.push(`/subscribe/${type}`)
    }
  }
  
  const generateScript = async () => {
    if (!gameData) return
    
    setScriptLoading(true)
    setScriptError(null)
    
    try {
      const res = await fetch(
        `/api/game-scripts/free?gameId=${gameId}&sport=${gameData.sport}&homeTeam=${encodeURIComponent(gameData.homeTeam)}&awayTeam=${encodeURIComponent(gameData.awayTeam)}&gameTime=${encodeURIComponent(gameData.kickoff)}&force=true`
      )
      const data = await res.json()
      
      if (data.error) {
        setScriptError(data.error)
      } else if (data.script) {
        setScript(data.script)
      }
    } catch (error) {
      setScriptError('Failed to generate script. Please try again.')
    } finally {
      setScriptLoading(false)
    }
  }
  
  // Get sportsbook odds for table
  const getOddsForMarket = () => {
    if (!sportsbookOdds) return []
    
    let oddsData: { [key: string]: any } = {}
    if (marketType === 'spread') {
      oddsData = sportsbookOdds.spreads || {}
    } else if (marketType === 'total') {
      oddsData = sportsbookOdds.totals || {}
    } else {
      oddsData = sportsbookOdds.moneylines || {}
    }
    
    return Object.entries(oddsData).map(([book, value]) => ({
      book,
      value: typeof value === 'object' ? value : value
    })).slice(0, showAllOdds ? 20 : 5)
  }
  
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.loading}>Loading game details...</div>
      </div>
    )
  }
  
  if (!gameData) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.error}>
          <p>Game not found</p>
          <button onClick={() => router.push('/games')} className={styles.backBtn}>
            <FiChevronLeft /> Back to Games
          </button>
        </div>
      </div>
    )
  }
  
  const tabGradient = `linear-gradient(90deg, ${awayColor} 0%, ${homeColor} 100%)`
  // Full-page left-to-right gradient using team colors
  const pageGradient = `linear-gradient(90deg, ${awayColor}15 0%, ${awayColor}08 20%, transparent 50%, ${homeColor}08 80%, ${homeColor}15 100%)`
  
  return (
    <div className={styles.container} style={{ background: pageGradient }}>
      <div className={styles.headerSpacer} />
      
      {/* Back Button */}
      <button onClick={() => router.push('/games')} className={styles.backBtn}>
        <FiChevronLeft size={18} />
        All Games
      </button>
      
      {/* Header Section */}
      <div className={styles.headerSection}>
        {/* Matchup */}
        <div className={styles.matchup}>
          <div className={styles.teamSide}>
            {gameData.awayTeamLogo && (
              <img src={gameData.awayTeamLogo} alt={gameData.awayTeam} className={styles.teamLogo} />
            )}
          </div>
          <span className={styles.vsText}>@</span>
          <div className={styles.teamSide}>
            {gameData.homeTeamLogo && (
              <img src={gameData.homeTeamLogo} alt={gameData.homeTeam} className={styles.teamLogo} />
            )}
          </div>
        </div>
        
        {/* Team Names - Just team names, no @ */}
        <div className={styles.teamNames}>
          <span>{getTeamName(gameData.awayTeam)}</span>
          <span>vs</span>
          <span>{getTeamName(gameData.homeTeam)}</span>
        </div>
        
        {/* Odds Row - with thin separators */}
        <div className={styles.oddsRow}>
          <span className={styles.oddsValue}>{formatSpread(gameData.spread?.awayLine) || '-'}</span>
          <span className={styles.oddsSeparator}>|</span>
          <span className={styles.oddsValue}>{gameData.totals?.number || '-'}</span>
          <span className={styles.oddsSeparator}>|</span>
          <span className={styles.oddsValue}>{formatSpread(gameData.spread?.homeLine) || '-'}</span>
        </div>
        
        {/* Game Time */}
        <div className={styles.gameMeta}>
          <span>{formatGameTime(gameData.kickoffLabel)}</span>
        </div>
        
        {/* Tabs */}
        <div className={styles.tabsRow}>
          {(['script', 'odds', 'picks', 'betting'] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'script' && 'Script'}
              {tab === 'odds' && 'Odds'}
              {tab === 'picks' && 'Analyst Picks'}
              {tab === 'betting' && 'Public Betting'}
              {activeTab === tab && (
                <div className={styles.tabUnderline} style={{ background: tabGradient }} />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content Section */}
      <div className={styles.content}>
        
        {/* ========== SCRIPT TAB ========== */}
        {activeTab === 'script' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Game Preview & Analysis</h2>
            <p className={styles.sectionSubtitle}>Claude powered breakdown based on detailed team stats & rankings.</p>
            
            {scriptLoading ? (
              <div className={styles.scriptLoading}>
                <div className={styles.loadingSpinner}>
                  <FiRefreshCw size={24} className={styles.spinIcon} />
                </div>
                <p>Generating your game analysis...</p>
                <p className={styles.loadingSubtext}>This usually takes 10-15 seconds</p>
              </div>
            ) : script ? (
              <div className={styles.scriptContent}>
                {script.split('\n').map((paragraph, idx) => (
                  paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
                ))}
              </div>
            ) : (
              <div className={styles.generatePrompt}>
                <div className={styles.generateIcon}>
                  <IoSparkles size={32} />
                </div>
                <h3>Generate Game Analysis</h3>
                <p>Get an AI-powered preview of this matchup based on team statistics and rankings.</p>
                {scriptError && <p className={styles.scriptError}>{scriptError}</p>}
                <button 
                  className={styles.generateBtn}
                  onClick={generateScript}
                  disabled={scriptLoading}
                >
                  <IoSparkles size={16} />
                  Generate Free Analysis
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* ========== ODDS TAB ========== */}
        {activeTab === 'odds' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Odds & Line Movement</h2>
            <p className={styles.sectionSubtitle}>Current odds & history</p>
            
            {/* Line History Section */}
            <div 
              className={styles.lineHistorySection}
              style={{
                background: `linear-gradient(90deg, ${awayColor}15 0%, transparent 50%, ${homeColor}15 100%)`
              }}
            >
              <div className={styles.lineHistoryHeader}>
                <h3 className={styles.subsectionTitle}>Line History</h3>
                <div className={styles.marketTabs}>
                  {(['spread', 'total', 'ml'] as const).map(m => (
                    <button
                      key={m}
                      className={`${styles.marketTab} ${marketType === m ? styles.marketTabActive : ''}`}
                      onClick={() => setMarketType(m)}
                    >
                      {m === 'ml' ? 'ML' : m === 'total' ? 'O/U' : 'Spread'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Graph */}
              <div className={styles.graphContainer}>
                {timelineLoading ? (
                  <div className={styles.graphLoading}>Loading...</div>
                ) : timelineData.length === 0 ? (
                  <div className={styles.graphLoading}>No historical data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={timelineData} margin={{ top: 15, right: 20, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id={`areaGrad-${gameId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2A3442" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#0F1319" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8B9199', fontSize: 10 }} dy={5} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8B9199', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(val) => val > 0 ? `+${val}` : val} dx={-30} />
                      <Tooltip content={<CustomTooltip marketType={marketType} />} />
                      {marketType !== 'total' && <ReferenceLine y={0} stroke="#36383C" strokeDasharray="3 3" />}
                      <Area 
                        type="monotone" 
                        dataKey={marketType === 'spread' ? 'homeLine' : marketType === 'ml' ? 'mlHome' : 'total'} 
                        fill={`url(#areaGrad-${gameId})`} 
                        stroke="none" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey={marketType === 'spread' ? 'homeLine' : marketType === 'ml' ? 'mlHome' : 'total'} 
                        stroke={marketType === 'total' ? '#98ADD1' : homeColor} 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: marketType === 'total' ? '#98ADD1' : homeColor }} 
                        isAnimationActive={false} 
                      />
                      {marketType !== 'total' && (
                        <Line 
                          type="monotone" 
                          dataKey={marketType === 'spread' ? 'awayLine' : 'mlAway'} 
                          stroke={awayColor} 
                          strokeWidth={2} 
                          strokeDasharray="4 4" 
                          dot={{ r: 3, fill: awayColor }} 
                          isAnimationActive={false} 
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
                
                {/* Legend */}
                {timelineData.length > 0 && marketType !== 'total' && (
                  <div className={styles.graphLegend}>
                    <span className={styles.legendItem}>
                      <span className={styles.legendDash} style={{ background: `repeating-linear-gradient(90deg, ${awayColor}, ${awayColor} 3px, transparent 3px, transparent 5px)` }} />
                      {getTeamName(gameData.awayTeam)}
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendSolid} style={{ background: homeColor }} />
                      {getTeamName(gameData.homeTeam)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* All Available Odds */}
            <div className={styles.allOddsSection}>
              <button 
                className={styles.allOddsToggle}
                onClick={() => setShowAllOdds(!showAllOdds)}
              >
                <span>All Available {marketType === 'spread' ? 'Spread' : marketType === 'ml' ? 'ML' : 'Total'} Odds</span>
                {showAllOdds ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </button>
              
              {showAllOdds && (
                <div className={styles.oddsTable}>
                  <div className={styles.oddsTableHeader}>
                    <span>Sportsbook</span>
                    {marketType === 'total' ? (
                      <>
                        <span>Over</span>
                        <span>Under</span>
                      </>
                    ) : (
                      <>
                    <span>{gameData.awayTeamAbbr || 'Away'}</span>
                    <span>{gameData.homeTeamAbbr || 'Home'}</span>
                      </>
                    )}
                  </div>
                  {getOddsForMarket().length > 0 ? (
                    getOddsForMarket().map((odd, idx) => (
                      <div key={idx} className={styles.oddsTableRow}>
                        <span className={styles.bookName}>{odd.book}</span>
                        <span>{typeof odd.value === 'object' ? formatSpread(odd.value.away) : formatSpread(-odd.value)}</span>
                        <span>{typeof odd.value === 'object' ? formatSpread(odd.value.home) : formatSpread(odd.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noOdds}>No odds data available from sportsbooks</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* ========== PICKS TAB ========== */}
        {activeTab === 'picks' && (
          <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Analyst Picks</h2>
                <p className={styles.sectionSubtitle}>Expert picks for this game</p>
                
            {/* Show locked message below title if user doesn't have access */}
            {(!isSignedIn || !canViewPicks) && gamePicks.length > 0 && (
              <div className={styles.lockedSection} style={{ marginTop: '16px', marginBottom: '24px' }}>
                <div className={styles.lockedSectionContent}>
                  <GiSupersonicArrow className={styles.lockedIcon} />
                  <div className={styles.lockedText}>
                    <span className={styles.lockedTitle}>Unlock Analyst Picks</span>
                    <span className={styles.lockedDesc}>Get daily expert picks and analysis for this game and all upcoming matchups</span>
                  </div>
                </div>
                  <button 
                  className={styles.subscribeBtn}
                  onClick={() => handleSubscribe('picks')}
                  >
                  <GiSupersonicArrow size={14} />
                  Access Analyst Picks
                  </button>
                </div>
            )}
            
            {picksLoading ? (
              <div className={styles.loading}>Loading picks...</div>
            ) : gamePicks.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No picks available for this game yet.</p>
                {!countsLoading && (
                  <>
                    {pickCounts.sportPickCount > 0 ? (
                      <>
                        <p className={styles.pickCountSubtext}>
                          However, there {pickCounts.sportPickCount === 1 ? 'is' : 'are'}{' '}
                          <span className={styles.pickCountHighlight}>{pickCounts.sportPickCount}</span>{' '}
                          active {gameData?.sport.toUpperCase()} pick{pickCounts.sportPickCount !== 1 ? 's' : ''}
                        </p>
                  <button 
                          className={styles.viewPicksBtn}
                    onClick={() => router.push('/picks')}
                          style={{ marginTop: '12px' }}
                  >
                          View Now
                  </button>
                      </>
                    ) : pickCounts.allPicksCount > 0 ? (
                      <>
                        <p className={styles.pickCountSubtext}>
                          However, there {pickCounts.allPicksCount === 1 ? 'is' : 'are'}{' '}
                          <span className={styles.pickCountHighlight}>{pickCounts.allPicksCount}</span>{' '}
                          active pick{pickCounts.allPicksCount !== 1 ? 's' : ''} across all sports
                        </p>
                        <button 
                          className={styles.viewPicksBtn}
                          onClick={() => router.push('/picks')}
                          style={{ marginTop: '12px' }}
                        >
                          View Now
                        </button>
                      </>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className={`${styles.picksList} ${(!isSignedIn || !canViewPicks) ? styles.blurredContent : ''}`}>
                {gamePicks.map((pick: any) => {
                  const isExpanded = expandedPicks.has(pick.id)
                  return (
                    <div 
                      key={pick.id} 
                      className={styles.pickCard}
                    >
                      <div 
                        className={styles.pickCardMain}
                        onClick={() => {
                          if (canViewPicks) {
                            togglePickAnalysis(pick.id)
                          } else {
                            if (!isSignedIn) {
                              openSignUp({ redirectUrl: '/subscribe/picks' })
                            } else {
                              router.push('/subscribe/picks')
                            }
                          }
                        }}
                        style={(!isSignedIn || !canViewPicks) ? { cursor: 'pointer' } : {}}
                      >
                        <div className={styles.pickBodyLeft}>
                          {/* Line 1: Bet Title with Logo */}
                          <div className={styles.pickTitleRow}>
                            <BetLogo pick={pick} gameData={gameData} />
                            <span className={styles.pickTitle}>
                              {pick.bet_title || 'Pick'}
                            </span>
                          </div>
                          
                          {/* Line 2: Game Time Only */}
                          <div className={styles.pickGameTime}>
                            {new Date(pick.game_time).toLocaleString('en-US', {
                              timeZone: 'America/New_York',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                        <div className={styles.pickRightSide}>
                          <div className={styles.pickHeaderMeta}>
                            {pick.sportsbook && <span className={styles.sportsbookDesktopOnly}>{pick.sportsbook}</span>}{' '}
                            {pick.odds} | {(pick.units_at_risk || pick.units || 0).toFixed(1)}u
                          </div>
                          <div className={styles.pickExpandIconWrapper}>
                            <FiChevronDown className={`${styles.pickExpandIcon} ${isExpanded ? styles.expanded : ''}`} />
                          </div>
                        </div>
                      </div>
                      {pick.analysis && (
                        <>
                          {!isSignedIn || !canViewPicks ? (
                            <div
                              className={`${styles.pickAnalysisContent} ${isExpanded ? styles.expanded : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!isSignedIn) {
                                  openSignUp({ redirectUrl: '/subscribe/picks' })
                                } else if (!canViewPicks) {
                                  router.push('/subscribe/picks')
                                }
                              }}
                              style={{ 
                                cursor: 'pointer'
                              }}
                            >
                              {/* Capper Info Section */}
                              <div className={styles.pickCapperInfo}>
                                <span className={styles.pickCapperName}>{pick.bettor_name}</span>
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: pick.analysis }} />
                            </div>
                          ) : (
                            <div
                              className={`${styles.pickAnalysisContent} ${isExpanded ? styles.expanded : ''}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Capper Info Section */}
                              <div className={styles.pickCapperInfo}>
                                <span className={styles.pickCapperName}>{pick.bettor_name}</span>
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: pick.analysis }} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        
        {/* ========== PUBLIC BETTING TAB ========== */}
        {activeTab === 'betting' && (
          <div className={styles.section}>
            {canViewPublicBetting ? (
              <>
                <h2 className={styles.sectionTitle}>Public Betting Data</h2>
                <p className={styles.sectionSubtitle}>Betting splits and market indicators from 150+ sportsbooks</p>
                
                {gameData?.hasPublicBetting && gameData?.publicBetting ? (
                  <>
                    {/* Splits Title - OUTSIDE card */}
                    <h3 className={styles.splitsTitle}>Splits</h3>
                    
                    {/* Splits Card with team color gradient background */}
                    <div 
                      className={styles.splitsCard}
                      style={{
                        background: `linear-gradient(90deg, ${awayColor}15 0%, transparent 50%, ${homeColor}15 100%)`
                      }}
                    >
                      {/* Spread Section */}
                      <div className={styles.splitSection}>
                        <h4 className={styles.splitSectionTitle}>Spread</h4>
                        
                        {/* Bet % Bar */}
                        <div className={styles.splitRowWrapper}>
                          <div className={styles.splitRowLabel}>Bet %</div>
                          <div className={styles.splitRow}>
                            <span className={styles.splitLabel}>{gameData.awayTeamAbbr}</span>
                            <div className={styles.splitBarContainer}>
                              <div
                                className={styles.splitBarLeft}
                                style={{
                                  width: `${100 - (gameData.publicBetting.spreadHomeBetPct || 50)}%`,
                                  background: `linear-gradient(90deg, ${gameData.awayTeamColor}F0 0%, ${gameData.awayTeamColor}C0 50%, ${gameData.awayTeamColor}A0 100%)`,
                                }}
                              >
                                <span className={styles.splitBarText}>
                                  {Math.round(100 - (gameData.publicBetting.spreadHomeBetPct || 50))}%
                                </span>
                              </div>
                              <div
                                className={styles.splitBarRight}
                                style={{
                                  width: `${gameData.publicBetting.spreadHomeBetPct || 50}%`,
                                  background: `linear-gradient(90deg, ${gameData.homeTeamColor}A0 0%, ${gameData.homeTeamColor}C0 50%, ${gameData.homeTeamColor}F0 100%)`,
                                }}
                              >
                                <span className={styles.splitBarText}>
                                  {Math.round(gameData.publicBetting.spreadHomeBetPct || 50)}%
                                </span>
                              </div>
                            </div>
                            <span className={styles.splitLabel}>{gameData.homeTeamAbbr}</span>
                          </div>
                        </div>

                        {/* Money % Bar */}
                        <div className={styles.splitRowWrapper}>
                          <div className={styles.splitRowLabel}>Money %</div>
                          <div className={styles.splitRow}>
                            <span className={styles.splitLabel}>{gameData.awayTeamAbbr}</span>
                            <div className={styles.splitBarContainer}>
                              <div
                                className={styles.splitBarLeft}
                                style={{
                                  width: `${100 - (gameData.publicBetting.spreadHomeMoneyPct || 50)}%`,
                                  background: `linear-gradient(90deg, ${gameData.awayTeamColor}F0 0%, ${gameData.awayTeamColor}C0 50%, ${gameData.awayTeamColor}A0 100%)`,
                                }}
                              >
                                <span className={styles.splitBarText}>
                                  {Math.round(100 - (gameData.publicBetting.spreadHomeMoneyPct || 50))}%
                                </span>
                              </div>
                              <div
                                className={styles.splitBarRight}
                                style={{
                                  width: `${gameData.publicBetting.spreadHomeMoneyPct || 50}%`,
                                  background: `linear-gradient(90deg, ${gameData.homeTeamColor}A0 0%, ${gameData.homeTeamColor}C0 50%, ${gameData.homeTeamColor}F0 100%)`,
                                }}
                              >
                                <span className={styles.splitBarText}>
                                  {Math.round(gameData.publicBetting.spreadHomeMoneyPct || 50)}%
                                </span>
                              </div>
                            </div>
                            <span className={styles.splitLabel}>{gameData.homeTeamAbbr}</span>
                          </div>
                        </div>
                      </div>

                      {/* Moneyline Section */}
                      {gameData.publicBetting.mlHomeBetPct && (
                        <div className={styles.splitSection}>
                          <h4 className={styles.splitSectionTitle}>Moneyline</h4>
                          
                          {/* Bet % Bar */}
                          <div className={styles.splitRowWrapper}>
                            <div className={styles.splitRowLabel}>Bet %</div>
                            <div className={styles.splitRow}>
                              <span className={styles.splitLabel}>{gameData.awayTeamAbbr}</span>
                              <div className={styles.splitBarContainer}>
                                <div
                                  className={styles.splitBarLeft}
                                  style={{
                                    width: `${100 - (gameData.publicBetting.mlHomeBetPct || 50)}%`,
                                    background: `linear-gradient(90deg, ${gameData.awayTeamColor}F0 0%, ${gameData.awayTeamColor}C0 50%, ${gameData.awayTeamColor}A0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(100 - (gameData.publicBetting.mlHomeBetPct || 50))}%
                                  </span>
                                </div>
                                <div
                                  className={styles.splitBarRight}
                                  style={{
                                    width: `${gameData.publicBetting.mlHomeBetPct || 50}%`,
                                    background: `linear-gradient(90deg, ${gameData.homeTeamColor}A0 0%, ${gameData.homeTeamColor}C0 50%, ${gameData.homeTeamColor}F0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(gameData.publicBetting.mlHomeBetPct || 50)}%
                                  </span>
                                </div>
                              </div>
                              <span className={styles.splitLabel}>{gameData.homeTeamAbbr}</span>
                            </div>
                          </div>

                          {/* Money % Bar */}
                          <div className={styles.splitRowWrapper}>
                            <div className={styles.splitRowLabel}>Money %</div>
                            <div className={styles.splitRow}>
                              <span className={styles.splitLabel}>{gameData.awayTeamAbbr}</span>
                              <div className={styles.splitBarContainer}>
                                <div
                                  className={styles.splitBarLeft}
                                  style={{
                                    width: `${100 - (gameData.publicBetting.mlHomeMoneyPct || 50)}%`,
                                    background: `linear-gradient(90deg, ${gameData.awayTeamColor}F0 0%, ${gameData.awayTeamColor}C0 50%, ${gameData.awayTeamColor}A0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(100 - (gameData.publicBetting.mlHomeMoneyPct || 50))}%
                                  </span>
                                </div>
                                <div
                                  className={styles.splitBarRight}
                                  style={{
                                    width: `${gameData.publicBetting.mlHomeMoneyPct || 50}%`,
                                    background: `linear-gradient(90deg, ${gameData.homeTeamColor}A0 0%, ${gameData.homeTeamColor}C0 50%, ${gameData.homeTeamColor}F0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(gameData.publicBetting.mlHomeMoneyPct || 50)}%
                                  </span>
                                </div>
                              </div>
                              <span className={styles.splitLabel}>{gameData.homeTeamAbbr}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Total Section */}
                      {gameData.publicBetting.totalOverBetPct && (
                        <div className={styles.splitSection}>
                          <h4 className={styles.splitSectionTitle}>Total</h4>
                          
                          {/* Bet % Bar */}
                          <div className={styles.splitRowWrapper}>
                            <div className={styles.splitRowLabel}>Bet %</div>
                            <div className={styles.splitRow}>
                              <span className={styles.splitLabel}>UNDER</span>
                              <div className={styles.splitBarContainer}>
                                <div
                                  className={styles.splitBarLeft}
                                  style={{
                                    width: `${100 - (gameData.publicBetting.totalOverBetPct || 50)}%`,
                                    background: `linear-gradient(90deg, ${gameData.awayTeamColor}F0 0%, ${gameData.awayTeamColor}C0 50%, ${gameData.awayTeamColor}A0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(100 - (gameData.publicBetting.totalOverBetPct || 50))}%
                                  </span>
                                </div>
                                <div
                                  className={styles.splitBarRight}
                                  style={{
                                    width: `${gameData.publicBetting.totalOverBetPct || 50}%`,
                                    background: `linear-gradient(90deg, ${gameData.homeTeamColor}A0 0%, ${gameData.homeTeamColor}C0 50%, ${gameData.homeTeamColor}F0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(gameData.publicBetting.totalOverBetPct || 50)}%
                                  </span>
                                </div>
                              </div>
                              <span className={styles.splitLabel}>OVER</span>
                            </div>
                          </div>

                          {/* Money % Bar */}
                          <div className={styles.splitRowWrapper}>
                            <div className={styles.splitRowLabel}>Money %</div>
                            <div className={styles.splitRow}>
                              <span className={styles.splitLabel}>UNDER</span>
                              <div className={styles.splitBarContainer}>
                                <div
                                  className={styles.splitBarLeft}
                                  style={{
                                    width: `${100 - (gameData.publicBetting.totalOverMoneyPct || 50)}%`,
                                    background: `linear-gradient(90deg, ${gameData.awayTeamColor}F0 0%, ${gameData.awayTeamColor}C0 50%, ${gameData.awayTeamColor}A0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(100 - (gameData.publicBetting.totalOverMoneyPct || 50))}%
                                  </span>
                                </div>
                                <div
                                  className={styles.splitBarRight}
                                  style={{
                                    width: `${gameData.publicBetting.totalOverMoneyPct || 50}%`,
                                    background: `linear-gradient(90deg, ${gameData.homeTeamColor}A0 0%, ${gameData.homeTeamColor}C0 50%, ${gameData.homeTeamColor}F0 100%)`,
                                  }}
                                >
                                  <span className={styles.splitBarText}>
                                    {Math.round(gameData.publicBetting.totalOverMoneyPct || 50)}%
                                  </span>
                                </div>
                              </div>
                              <span className={styles.splitLabel}>OVER</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Signals Section - Generic, showing all signals */}
                    {gameData.signals && (() => {
                      // Collect all signals across all bet types
                      const allSignals: Array<{ team: string; betType: string; logo: string | null; signals: any }> = []
                      
                      // Spread signals
                      const spreadHomeSignals = gameData.signals.spread.home
                      const spreadAwaySignals = gameData.signals.spread.away
                      if (spreadHomeSignals.publicRespect > 0 || spreadHomeSignals.vegasBacked > 0 || spreadHomeSignals.whaleRespect > 0) {
                        allSignals.push({
                          team: gameData.homeTeamAbbr,
                          betType: 'Spread',
                          logo: gameData.homeTeamLogo,
                          signals: spreadHomeSignals,
                        })
                      }
                      if (spreadAwaySignals.publicRespect > 0 || spreadAwaySignals.vegasBacked > 0 || spreadAwaySignals.whaleRespect > 0) {
                        allSignals.push({
                          team: gameData.awayTeamAbbr,
                          betType: 'Spread',
                          logo: gameData.awayTeamLogo,
                          signals: spreadAwaySignals,
                        })
                      }

                      // ML signals
                      const mlHomeSignals = gameData.signals.ml.home
                      const mlAwaySignals = gameData.signals.ml.away
                      if (mlHomeSignals.publicRespect > 0 || mlHomeSignals.vegasBacked > 0 || mlHomeSignals.whaleRespect > 0) {
                        allSignals.push({
                          team: gameData.homeTeamAbbr,
                          betType: 'ML',
                          logo: gameData.homeTeamLogo,
                          signals: mlHomeSignals,
                        })
                      }
                      if (mlAwaySignals.publicRespect > 0 || mlAwaySignals.vegasBacked > 0 || mlAwaySignals.whaleRespect > 0) {
                        allSignals.push({
                          team: gameData.awayTeamAbbr,
                          betType: 'ML',
                          logo: gameData.awayTeamLogo,
                          signals: mlAwaySignals,
                        })
                      }

                      // Total signals
                      const totalOverSignals = gameData.signals.total.over
                      const totalUnderSignals = gameData.signals.total.under
                      if (totalOverSignals.publicRespect > 0 || totalOverSignals.vegasBacked > 0 || totalOverSignals.whaleRespect > 0) {
                        allSignals.push({
                          team: 'OVER',
                          betType: 'Total',
                          logo: null,
                          signals: totalOverSignals,
                        })
                      }
                      if (totalUnderSignals.publicRespect > 0 || totalUnderSignals.vegasBacked > 0 || totalUnderSignals.whaleRespect > 0) {
                        allSignals.push({
                          team: 'UNDER',
                          betType: 'Total',
                          logo: null,
                          signals: totalUnderSignals,
                        })
                      }

                      if (allSignals.length === 0) return null

                      return (
                        <>
                          {/* Signals Title - OUTSIDE card */}
                          <h3 className={styles.signalsTitle}>Signals</h3>
                          
                          {/* Signals Section with team color gradient */}
                          <div 
                            className={styles.signalsSection}
                            style={{
                              background: `linear-gradient(90deg, ${awayColor}15 0%, transparent 50%, ${homeColor}15 100%)`
                            }}
                          >
                            <div className={styles.signalsGrid}>
                              {allSignals.map((item, idx) => (
                                <div key={idx} className={styles.signalCard}>
                                  <div className={styles.signalCardHeader}>
                                    {item.logo && (
                                      <img
                                        src={item.logo}
                                        alt={item.team}
                                        className={styles.signalCardTeamLogo}
                                      />
                                    )}
                                    <span>{item.team} {item.betType}</span>
                                  </div>
                                  <div className={styles.signalBarsV2}>
                                    {item.signals.publicRespect > 0 && (
                                      <div className={styles.signalRowV2}>
                                        <div className={styles.signalRowHeaderV2}>
                                          <span className={styles.signalLabelV2}>Public Respect</span>
                                          <span className={`${styles.signalValueV2} ${styles.activePublic}`}>{item.signals.publicRespect}%</span>
                                        </div>
                                        {renderSegmentedBar(item.signals.publicRespect, 'public')}
                                      </div>
                                    )}
                                    {item.signals.vegasBacked > 0 && (
                                      <div className={styles.signalRowV2}>
                                        <div className={styles.signalRowHeaderV2}>
                                          <span className={styles.signalLabelV2}>Vegas Backed</span>
                                          <span className={`${styles.signalValueV2} ${styles.activeVegas}`}>{item.signals.vegasBacked}%</span>
                                        </div>
                                        {renderSegmentedBar(item.signals.vegasBacked, 'vegas')}
                                      </div>
                                    )}
                                    {item.signals.whaleRespect > 0 && (
                                      <div className={styles.signalRowV2}>
                                        <div className={styles.signalRowHeaderV2}>
                                          <span className={styles.signalLabelV2}>Whale Respect</span>
                                          <span className={`${styles.signalValueV2} ${styles.activeWhale}`}>{item.signals.whaleRespect}%</span>
                                        </div>
                                        {renderSegmentedBar(item.signals.whaleRespect, 'whale')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </>
                ) : (
                  <div className={styles.noDataCard}>
                    <GiCash size={40} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                    <h3>No data available for this game</h3>
                    <p>Click below to view more games with public betting data</p>
                    <button onClick={() => router.push('/public-betting')}>
                      Go to Public Betting
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.lockedSection}>
                <div className={styles.lockedSectionContent}>
                  <GiSupersonicArrow className={styles.lockedIcon} />
                  <div className={styles.lockedText}>
                    <span className={styles.lockedTitle}>Unlock Public Betting Data</span>
                    <span className={styles.lockedDesc}>Access betting splits, line movement, and market indicators from 150+ sportsbooks</span>
                </div>
                </div>
                <button 
                  className={styles.subscribeBtn}
                  onClick={() => handleSubscribe('publicBetting')}
                >
                  <GiSupersonicArrow size={14} />
                  Access Public Betting Data
                </button>
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  )
}

