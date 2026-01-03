'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { supabase } from '@/lib/supabase'
import { FiChevronLeft, FiClock, FiChevronDown, FiChevronUp, FiRefreshCw, FiChevronRight } from 'react-icons/fi'
import { IoSparkles } from 'react-icons/io5'
import { GiSupersonicArrow, GiCash } from 'react-icons/gi'
import { MdLockOutline } from 'react-icons/md'
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
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
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
  
  // Access checks
  const canViewPicks = hasPicks || hasAny
  const canViewPublicBetting = hasPublicBetting || hasAny
  
  // Team colors for gradient
  const awayColor = gameData?.awayTeamColor || '#3b82f6'
  const homeColor = gameData?.homeTeamColor || '#6366f1'
  
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
        try {
          const scriptRes = await fetch(`/api/game-scripts/free?gameId=${gameId}&sport=${sport.toUpperCase()}`)
          const scriptData = await scriptRes.json()
          if (scriptData.script) {
            setScript(scriptData.script)
          }
        } catch (e) {
          console.log('No script available')
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
  
  // Fetch picks when picks tab is active
  useEffect(() => {
    if (activeTab === 'picks' && gameId && canViewPicks && gameData) {
      fetchGamePicks()
    }
  }, [activeTab, gameId, canViewPicks])
  
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

      // First try to match by game_id
      let { data, error } = await supabase
        .from('picks')
        .select('*, bettors(name, record, win_streak, profile_initials, profile_image)')
        .eq('game_id', gameId)
        .order('posted_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // If no picks found by game_id, try matching by game time (same day)
      if ((data || []).length === 0 && gameData.kickoff) {
        const gameTime = new Date(gameData.kickoff)
        const startTime = new Date(gameTime)
        startTime.setHours(0, 0, 0, 0)
        const endTime = new Date(gameTime)
        endTime.setHours(23, 59, 59, 999)

        const { data: timeData, error: timeError } = await supabase
          .from('picks')
          .select('*, bettors(name, record, win_streak, profile_initials, profile_image)')
          .gte('game_time', startTime.toISOString())
          .lte('game_time', endTime.toISOString())
          .order('posted_at', { ascending: false })

        if (!timeError && timeData && timeData.length > 0) {
          const awayTeamName = gameData.awayTeam.toLowerCase()
          const homeTeamName = gameData.homeTeam.toLowerCase()
          
          const filtered = timeData.filter((p: any) => {
            const title = (p.game_title || p.bet_title || '').toLowerCase()
            const hasAwayTeam = awayTeamName.split(' ').some(word => title.includes(word.toLowerCase()))
            const hasHomeTeam = homeTeamName.split(' ').some(word => title.includes(word.toLowerCase()))
            return hasAwayTeam || hasHomeTeam
          })
          
          data = filtered.length > 0 ? filtered : timeData
        }
      }

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
          <span>{formatGameTime(gameData.kickoff)}</span>
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
            <div className={styles.lineHistorySection}>
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
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8B9199', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8B9199', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(val) => val > 0 ? `+${val}` : val} />
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
                    <span>{gameData.awayTeamAbbr || 'Away'}</span>
                    <span>{gameData.homeTeamAbbr || 'Home'}</span>
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
            {canViewPicks ? (
              <>
                <h2 className={styles.sectionTitle}>Analyst Picks</h2>
                <p className={styles.sectionSubtitle}>Expert picks for this game</p>
                
                {picksLoading ? (
                  <div className={styles.loading}>Loading picks...</div>
                ) : gamePicks.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No picks available for this game yet.</p>
                    {!countsLoading && (
                      <>
                        {pickCounts.sportPickCount > 0 ? (
                          <p className={styles.pickCountSubtext}>
                            However, there {pickCounts.sportPickCount === 1 ? 'is' : 'are'}{' '}
                            <span className={styles.pickCountHighlight}>{pickCounts.sportPickCount}</span>{' '}
                            active {gameData?.sport.toUpperCase()} pick{pickCounts.sportPickCount !== 1 ? 's' : ''} today
                          </p>
                        ) : pickCounts.allPicksCount > 0 ? (
                          <p className={styles.pickCountSubtext}>
                            However, there {pickCounts.allPicksCount === 1 ? 'is' : 'are'}{' '}
                            <span className={styles.pickCountHighlight}>{pickCounts.allPicksCount}</span>{' '}
                            active pick{pickCounts.allPicksCount !== 1 ? 's' : ''} across all sports today
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : (
                  <div className={styles.picksList}>
                    {gamePicks.map((pick: any) => {
                      const isExpanded = expandedPicks.has(pick.id)
                      return (
                        <div 
                          key={pick.id} 
                          className={styles.pickCard}
                        >
                          <div 
                            className={styles.pickCardMain}
                            onClick={() => togglePickAnalysis(pick.id)}
                          >
                            <div className={styles.pickBodyLeft}>
                              {/* Line 1: Bet Title with Logo */}
                              <div className={styles.pickTitleRow}>
                                <div style={(!isSignedIn || !canViewPicks) ? { filter: 'blur(6px)', userSelect: 'none' } : {}}>
                                  <BetLogo pick={pick} gameData={gameData} />
                                </div>
                                <span 
                                  className={styles.pickTitle}
                                  style={(!isSignedIn || !canViewPicks) ? { filter: 'blur(6px)', userSelect: 'none' } : {}}
                                >
                                  {pick.bet_title || 'Pick'}
                                </span>
                              </div>
                              
                              {/* Line 2: Game Time Only */}
                              <div 
                                className={styles.pickGameTime}
                                style={(!isSignedIn || !canViewPicks) ? { filter: 'blur(6px)', userSelect: 'none' } : {}}
                              >
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
                                    filter: 'blur(6px)', 
                                    userSelect: 'none',
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
              </>
            ) : (
              <div className={styles.lockedSection}>
                <div className={styles.lockedIcon}>
                  <MdLockOutline size={32} />
                </div>
                <h3 className={styles.lockedTitle}>Unlock Analyst Picks</h3>
                <p className={styles.lockedDesc}>
                  Get daily expert picks and analysis for this game and all upcoming matchups.
                </p>
                {!countsLoading && (
                  <div className={styles.pickCountInfo}>
                    {pickCounts.gamePickCount > 0 ? (
                      <p className={styles.pickCountText}>
                        <span className={styles.pickCountNumber}>{pickCounts.gamePickCount}</span> active pick{pickCounts.gamePickCount !== 1 ? 's' : ''} for this game
                      </p>
                    ) : pickCounts.sportPickCount > 0 ? (
                      <p className={styles.pickCountText}>
                        <span className={styles.pickCountNumber}>{pickCounts.sportPickCount}</span> active {gameData?.sport.toUpperCase()} pick{pickCounts.sportPickCount !== 1 ? 's' : ''} today
                      </p>
                    ) : pickCounts.allPicksCount > 0 ? (
                      <p className={styles.pickCountText}>
                        <span className={styles.pickCountNumber}>{pickCounts.allPicksCount}</span> active pick{pickCounts.allPicksCount !== 1 ? 's' : ''} across all sports today
                      </p>
                    ) : null}
                  </div>
                )}
                <button 
                  className={styles.subscribeBtn}
                  onClick={() => handleSubscribe('picks')}
                >
                  <GiSupersonicArrow size={16} />
                  Subscribe to Analyst Picks
                </button>
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
                <p className={styles.sectionSubtitle}>Betting splits and market indicators</p>
                
                <div className={styles.viewFullCta}>
                  <GiCash size={24} />
                  <span>View full public betting dashboard with line movement</span>
                  <button 
                    className={styles.ctaBtn}
                    onClick={() => router.push('/public-betting')}
                  >
                    Go to Public Betting
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.lockedSection}>
                <div className={styles.lockedIcon}>
                  <MdLockOutline size={32} />
                </div>
                <h3 className={styles.lockedTitle}>Unlock Public Betting Data</h3>
                <p className={styles.lockedDesc}>
                  Access betting splits, line movement, and market indicators from 150+ sportsbooks.
                </p>
                <button 
                  className={styles.subscribeBtn}
                  onClick={() => handleSubscribe('publicBetting')}
                >
                  <GiCash size={16} />
                  Subscribe to Public Betting
                </button>
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  )
}
