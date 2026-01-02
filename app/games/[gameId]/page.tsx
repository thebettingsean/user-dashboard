'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { FiChevronLeft, FiClock, FiChevronDown, FiChevronUp, FiRefreshCw } from 'react-icons/fi'
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
        
        {/* Team Names */}
        <div className={styles.teamNames}>
          <span>{gameData.awayTeam}</span>
          <span className={styles.teamNamesAt}>@</span>
          <span>{gameData.homeTeam}</span>
        </div>
        
        {/* Odds Row */}
        <div className={styles.oddsRow}>
          <div className={styles.oddsItem}>
            <span className={styles.oddsValue}>{formatSpread(gameData.spread?.awayLine)}</span>
          </div>
          <div className={styles.oddsItem}>
            <span className={styles.oddsLabel}>O/U</span>
            <span className={styles.oddsValue}>{gameData.totals?.number || '-'}</span>
          </div>
          <div className={styles.oddsItem}>
            <span className={styles.oddsValue}>{formatSpread(gameData.spread?.homeLine)}</span>
          </div>
        </div>
        
        {/* Game Time */}
        <div className={styles.gameMeta}>
          <FiClock size={14} />
          <span>{formatGameTime(gameData.kickoff)}</span>
          <span className={styles.sportBadge}>{gameData.sport}</span>
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
              {tab === 'picks' && (
                <>
                  Analyst Picks
                  {!canViewPicks && <MdLockOutline size={12} className={styles.lockIcon} />}
                </>
              )}
              {tab === 'betting' && (
                <>
                  Public Betting
                  {!canViewPublicBetting && <MdLockOutline size={12} className={styles.lockIcon} />}
                </>
              )}
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
                <button 
                  className={styles.regenerateBtn}
                  onClick={generateScript}
                  disabled={scriptLoading}
                >
                  <FiRefreshCw size={14} />
                  Regenerate Analysis
                </button>
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
                      {gameData.awayTeam}
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendSolid} style={{ background: homeColor }} />
                      {gameData.homeTeam}
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
                <span>All Available Odds</span>
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
                
                <div className={styles.viewFullCta}>
                  <GiSupersonicArrow size={24} />
                  <span>View picks for this game on the Picks page</span>
                  <button 
                    className={styles.ctaBtn}
                    onClick={() => router.push('/picks')}
                  >
                    Go to Picks
                  </button>
                </div>
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
