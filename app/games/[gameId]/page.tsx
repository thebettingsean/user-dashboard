'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { FiChevronLeft, FiClock, FiTrendingUp, FiArrowRight, FiExternalLink, FiRefreshCw } from 'react-icons/fi'
import { IoSparkles } from 'react-icons/io5'
import { GiSupersonicArrow, GiCash } from 'react-icons/gi'
import { MdLockOutline } from 'react-icons/md'
import styles from './gameDetail.module.css'

interface GameData {
  id: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
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
      const res = await fetch(`/api/game-scripts/free?gameId=${gameId}&sport=${gameData.sport}&force=true`)
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
  
  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Back Button */}
      <button onClick={() => router.push('/games')} className={styles.backBtn}>
        <FiChevronLeft size={18} />
        All Games
      </button>
      
      {/* Game Header */}
      <div className={styles.gameHeader}>
        <div className={styles.matchup}>
          <div className={styles.teamSide}>
            {gameData.awayTeamLogo && (
              <img src={gameData.awayTeamLogo} alt={gameData.awayTeam} className={styles.teamLogoLarge} />
            )}
            <span className={styles.teamNameLarge}>{gameData.awayTeam}</span>
            {gameData.spread?.awayLine && (
              <span className={styles.teamSpreadLarge}>{formatSpread(gameData.spread.awayLine)}</span>
            )}
          </div>
          <span className={styles.vsText}>@</span>
          <div className={styles.teamSide}>
            {gameData.homeTeamLogo && (
              <img src={gameData.homeTeamLogo} alt={gameData.homeTeam} className={styles.teamLogoLarge} />
            )}
            <span className={styles.teamNameLarge}>{gameData.homeTeam}</span>
            {gameData.spread?.homeLine && (
              <span className={styles.teamSpreadLarge}>{formatSpread(gameData.spread.homeLine)}</span>
            )}
          </div>
        </div>
        
        <div className={styles.gameMetaRow}>
          <div className={styles.gameMeta}>
            <FiClock size={14} />
            <span>{formatGameTime(gameData.kickoff)}</span>
          </div>
          <span className={styles.sportBadge}>{gameData.sport}</span>
        </div>
        
        {/* Odds Summary */}
        <div className={styles.oddsRow}>
          <div className={styles.oddsItem}>
            <span className={styles.oddsLabel}>Spread</span>
            <span className={styles.oddsValue}>{formatSpread(gameData.spread?.homeLine)}</span>
          </div>
          {gameData.totals?.number && (
            <div className={styles.oddsItem}>
              <span className={styles.oddsLabel}>Total</span>
              <span className={styles.oddsValue}>O/U {gameData.totals.number}</span>
            </div>
          )}
          {gameData.moneyline && (
            <div className={styles.oddsItem}>
              <span className={styles.oddsLabel}>ML</span>
              <span className={styles.oddsValue}>
                {gameData.moneyline.away && (gameData.moneyline.away > 0 ? `+${gameData.moneyline.away}` : gameData.moneyline.away)} / {gameData.moneyline.home && (gameData.moneyline.home > 0 ? `+${gameData.moneyline.home}` : gameData.moneyline.home)}
              </span>
            </div>
          )}
        </div>
        
        {gameData.sportsbook && (
          <div className={styles.sportsbookLabel}>
            Odds via {gameData.sportsbook}
          </div>
        )}
      </div>
      
      {/* Content Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'script' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('script')}
        >
          Game Script
          <span className={styles.freeBadge}>Free</span>
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'odds' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('odds')}
        >
          Odds & Lines
          <span className={styles.freeBadge}>Free</span>
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'picks' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('picks')}
        >
          <GiSupersonicArrow size={14} />
          Picks
          {!canViewPicks && <MdLockOutline size={14} className={styles.lockIcon} />}
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'betting' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('betting')}
        >
          <GiCash size={14} />
          Public Betting
          {!canViewPublicBetting && <MdLockOutline size={14} className={styles.lockIcon} />}
        </button>
      </div>
      
      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Game Script Tab (FREE) */}
        {activeTab === 'script' && (
          <div className={styles.scriptSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Game Preview & Analysis</h2>
              <p className={styles.sectionSubtitle}>AI-powered breakdown based on team stats & rankings</p>
            </div>
            
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
                <div className={styles.scriptText}>
                  {script.split('\n').map((paragraph, idx) => (
                    paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
                  ))}
                </div>
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
                {scriptError && (
                  <p className={styles.scriptError}>{scriptError}</p>
                )}
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
        
        {/* Odds Tab (FREE) */}
        {activeTab === 'odds' && (
          <div className={styles.oddsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Odds & Line Movement</h2>
              <p className={styles.sectionSubtitle}>Current odds from {gameData.sportsbook || 'top sportsbooks'}</p>
            </div>
            
            <div className={styles.oddsCards}>
              {/* Current Odds */}
              <div className={styles.oddsCard}>
                <h3 className={styles.cardTitle}>Current Lines</h3>
                <div className={styles.oddsGrid}>
                  <div className={styles.oddsGridItem}>
                    <span className={styles.oddsGridLabel}>Spread</span>
                    <span className={styles.oddsGridValue}>
                      {gameData.spread?.homeLine ? (
                        `${gameData.homeTeam.split(' ').pop()} ${formatSpread(gameData.spread.homeLine)}`
                      ) : 'N/A'}
                    </span>
                  </div>
                  <div className={styles.oddsGridItem}>
                    <span className={styles.oddsGridLabel}>Total</span>
                    <span className={styles.oddsGridValue}>
                      {gameData.totals?.number ? `O/U ${gameData.totals.number}` : 'N/A'}
                    </span>
                  </div>
                  <div className={styles.oddsGridItem}>
                    <span className={styles.oddsGridLabel}>Away ML</span>
                    <span className={styles.oddsGridValue}>
                      {gameData.moneyline?.away ? (gameData.moneyline.away > 0 ? `+${gameData.moneyline.away}` : gameData.moneyline.away) : 'N/A'}
                    </span>
                  </div>
                  <div className={styles.oddsGridItem}>
                    <span className={styles.oddsGridLabel}>Home ML</span>
                    <span className={styles.oddsGridValue}>
                      {gameData.moneyline?.home ? (gameData.moneyline.home > 0 ? `+${gameData.moneyline.home}` : gameData.moneyline.home) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* View Full History CTA */}
              <div className={styles.ctaCard}>
                <FiTrendingUp size={24} />
                <h3>View Line Movement History</h3>
                <p>Track how lines have moved across all sportsbooks</p>
                <button 
                  className={styles.ctaBtn}
                  onClick={() => router.push(`/public-betting?game=${gameId}`)}
                >
                  View on Public Betting
                  <FiExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Picks Tab (PAID) */}
        {activeTab === 'picks' && (
          <div className={styles.picksSection}>
            {canViewPicks ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Analyst Picks</h2>
                  <p className={styles.sectionSubtitle}>Expert picks for this game</p>
                </div>
                <div className={styles.viewFullCta}>
                  <GiSupersonicArrow size={20} />
                  <span>View picks for this game on the Picks page</span>
                  <button 
                    className={styles.viewFullBtn}
                    onClick={() => router.push('/picks')}
                  >
                    Go to Picks
                    <FiArrowRight size={14} />
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
        
        {/* Public Betting Tab (PAID) */}
        {activeTab === 'betting' && (
          <div className={styles.bettingSection}>
            {canViewPublicBetting ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Public Betting Data</h2>
                  <p className={styles.sectionSubtitle}>Betting splits and market indicators from SportsDataIO</p>
                </div>
                
                {gameData.hasPublicBetting && gameData.publicBetting ? (
                  <div className={styles.publicBettingGrid}>
                    <div className={styles.bettingCard}>
                      <h4>Spread</h4>
                      <div className={styles.bettingRow}>
                        <span>Home Bet %</span>
                        <span className={styles.bettingValue}>{gameData.publicBetting.spreadHomeBetPct ?? 'N/A'}%</span>
                      </div>
                      <div className={styles.bettingRow}>
                        <span>Home Money %</span>
                        <span className={styles.bettingValue}>{gameData.publicBetting.spreadHomeMoneyPct ?? 'N/A'}%</span>
                      </div>
                    </div>
                    <div className={styles.bettingCard}>
                      <h4>Moneyline</h4>
                      <div className={styles.bettingRow}>
                        <span>Home Bet %</span>
                        <span className={styles.bettingValue}>{gameData.publicBetting.mlHomeBetPct ?? 'N/A'}%</span>
                      </div>
                      <div className={styles.bettingRow}>
                        <span>Home Money %</span>
                        <span className={styles.bettingValue}>{gameData.publicBetting.mlHomeMoneyPct ?? 'N/A'}%</span>
                      </div>
                    </div>
                    <div className={styles.bettingCard}>
                      <h4>Total</h4>
                      <div className={styles.bettingRow}>
                        <span>Over Bet %</span>
                        <span className={styles.bettingValue}>{gameData.publicBetting.totalOverBetPct ?? 'N/A'}%</span>
                      </div>
                      <div className={styles.bettingRow}>
                        <span>Over Money %</span>
                        <span className={styles.bettingValue}>{gameData.publicBetting.totalOverMoneyPct ?? 'N/A'}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.noContent}>
                    <p>Public betting data not yet available for this game.</p>
                    <p className={styles.noContentSub}>Check back closer to game time!</p>
                  </div>
                )}
                
                <div className={styles.viewFullCta}>
                  <GiCash size={20} />
                  <span>View full public betting dashboard with line movement</span>
                  <button 
                    className={styles.viewFullBtn}
                    onClick={() => router.push(`/public-betting`)}
                  >
                    Go to Public Betting
                    <FiArrowRight size={14} />
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
