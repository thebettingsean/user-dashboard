'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { FiChevronLeft, FiClock, FiChevronRight, FiRefreshCw } from 'react-icons/fi'
import { IoSparkles } from 'react-icons/io5'
import { GiSupersonicArrow, GiCash } from 'react-icons/gi'
import { MdLockOutline } from 'react-icons/md'
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
  hasPublicBetting: boolean
}

function formatGameTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatSpread(spread: number | null | undefined): string {
  if (spread === null || spread === undefined) return 'N/A'
  return spread > 0 ? `+${spread}` : `${spread}`
}

function formatML(ml: number | null | undefined): string {
  if (ml === null || ml === undefined) return 'N/A'
  return ml > 0 ? `+${ml}` : `${ml}`
}

// Team gradient for full page background
function getPageGradient(awayColor: string | null, homeColor: string | null): string {
  const away = awayColor || '#3b82f6'
  const home = homeColor || '#6366f1'
  return `linear-gradient(180deg, ${away}12 0%, ${away}06 15%, transparent 35%, transparent 65%, ${home}06 85%, ${home}12 100%)`
}

export default function GameDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { hasPicks, hasPublicBetting, hasAny, isLoading: entitlementsLoading } = useEntitlements()
  
  const gameId = params.gameId as string
  const sport = searchParams.get('sport') || 'nfl'
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [script, setScript] = useState<string | null>(null)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'script' | 'odds' | 'picks' | 'betting'>('script')
  
  // Access checks
  const canViewPicks = hasPicks || hasAny
  const canViewPublicBetting = hasPublicBetting || hasAny
  
  useEffect(() => {
    async function fetchGameData() {
      try {
        setIsLoading(true)
        
        // Fetch game data from unified games API
        const gamesRes = await fetch(`/api/games/upcoming?sport=${sport}`)
        const gamesData = await gamesRes.json()
        
        if (gamesData.success && gamesData.games) {
          const game = gamesData.games.find((g: GameData) => g.id === gameId)
          if (game) {
            setGameData(game)
          }
        }
        
        // Fetch FREE script for this game (if available)
        try {
          const scriptRes = await fetch(`/api/game-scripts/free?gameId=${gameId}&sport=${sport.toUpperCase()}`)
          const scriptData = await scriptRes.json()
          if (scriptData.script) {
            setScript(scriptData.script)
          }
        } catch (e) {
          console.log('No script available for this game')
        }
        
      } catch (error) {
        console.error('Error fetching game data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchGameData()
  }, [gameId, sport])
  
  const handleSubscribe = (type: 'picks' | 'publicBetting') => {
    if (!isSignedIn) {
      openSignUp({ redirectUrl: `/subscribe/${type}` })
    } else {
      router.push(`/subscribe/${type}`)
    }
  }
  
  // Generate FREE script on demand
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
  
  const pageGradient = getPageGradient(gameData.awayTeamColor, gameData.homeTeamColor)
  
  return (
    <div className={styles.container} style={{ background: pageGradient }}>
      <div className={styles.headerSpacer} />
      
      {/* Back Button */}
      <button onClick={() => router.push('/games')} className={styles.backBtn}>
        <FiChevronLeft size={18} />
        All Games
      </button>
      
      {/* Game Header - Seamless with page */}
      <div className={styles.gameHeader}>
        <div className={styles.matchup}>
          <div className={styles.teamSide}>
            {gameData.awayTeamLogo && (
              <img src={gameData.awayTeamLogo} alt={gameData.awayTeam} className={styles.teamLogoLarge} />
            )}
            <span className={styles.teamNameLarge}>{gameData.awayTeam}</span>
          </div>
          <span className={styles.vsText}>@</span>
          <div className={styles.teamSide}>
            {gameData.homeTeamLogo && (
              <img src={gameData.homeTeamLogo} alt={gameData.homeTeam} className={styles.teamLogoLarge} />
            )}
            <span className={styles.teamNameLarge}>{gameData.homeTeam}</span>
          </div>
        </div>
        
        <div className={styles.gameMetaRow}>
          <div className={styles.gameMeta}>
            <FiClock size={14} />
            <span>{formatGameTime(gameData.kickoff)}</span>
          </div>
          <span className={styles.sportBadge}>{gameData.sport}</span>
        </div>
      </div>
      
      {/* Content Tabs - Pill Style */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'script' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('script')}
          >
            Script
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'odds' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('odds')}
          >
            Odds
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'picks' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('picks')}
          >
            Analyst Picks
            {!canViewPicks && <MdLockOutline size={12} className={styles.lockIcon} />}
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'betting' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('betting')}
          >
            Public Betting
            {!canViewPublicBetting && <MdLockOutline size={12} className={styles.lockIcon} />}
          </button>
        </div>
      </div>
      
      {/* Tab Content - Free Flowing */}
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
            
            {/* Best Lines Table */}
            <div className={styles.bestLinesCard}>
              <h3 className={styles.cardLabel}>Best Lines</h3>
              <div className={styles.bestLinesGrid}>
                <div className={styles.bestLineItem}>
                  <span className={styles.bestLineLabel}>Spread</span>
                  <span className={styles.bestLineValue}>
                    {formatSpread(gameData.spread?.awayLine)} / {formatSpread(gameData.spread?.homeLine)}
                  </span>
                </div>
                <div className={styles.bestLineItem}>
                  <span className={styles.bestLineLabel}>ML's</span>
                  <span className={styles.bestLineValue}>
                    {formatML(gameData.moneyline?.away)} / {formatML(gameData.moneyline?.home)}
                  </span>
                </div>
                <div className={styles.bestLineItem}>
                  <span className={styles.bestLineLabel}>Total</span>
                  <span className={styles.bestLineValue}>
                    {gameData.totals?.number ? `O/U ${gameData.totals.number}` : 'N/A'}
                  </span>
                </div>
              </div>
              {gameData.sportsbook && (
                <p className={styles.sportsbookNote}>via {gameData.sportsbook}</p>
              )}
            </div>
            
            {/* Expandable Links */}
            <button className={styles.expandLink} onClick={() => router.push('/public-betting')}>
              <span>More available odds</span>
              <FiChevronRight size={16} />
            </button>
            
            <button className={styles.expandLink} onClick={() => router.push('/public-betting')}>
              <span>Line history</span>
              <FiChevronRight size={16} />
            </button>
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
                    <FiChevronRight size={14} />
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
                    <FiChevronRight size={14} />
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
