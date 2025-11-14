'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { generateGameSlug } from '@/lib/utils/gameSlug'
import { formatScript } from '@/lib/utils/formatScript'
import styles from '../sportSelector.module.css'
import { GiTwoCoins } from 'react-icons/gi'

type GameScript = {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  scriptStrength: 'Minimal' | 'Above Avg' | 'Strong' | null
  creditsRequired: number | null
}

type SportScripts = {
  sport: string
  sportLabel: string
  sportLogo: string
  scripts: GameScript[]
}

const sportOptions = [
  { id: 'nfl', label: 'NFL', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg' },
  { id: 'nba', label: 'NBA', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg' },
  { id: 'nhl', label: 'NHL', logo: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg' }
]

export default function AllSportsScriptsPage() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed } = useSubscription()
  
  const [sportsScripts, setSportsScripts] = useState<SportScripts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set())
  const [loadingScripts, setLoadingScripts] = useState<Set<string>>(new Set())
  const [scriptContent, setScriptContent] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    async function fetchAllScripts() {
      setIsLoading(true)
      try {
        const promises = sportOptions.map(async (sport) => {
          try {
            const response = await fetch(`/api/dashboard/game-hub?sport=${sport.id}`, {
              cache: 'no-store'
            })
            
            if (!response.ok) throw new Error(`Failed to fetch ${sport.id}`)
            
            const data = await response.json()
            const games = data.games || []
            
            // Filter games with scripts and get top 3 by strength
            const scriptsAvailable = games
              .filter((g: any) => g.script?.strengthLabel)
              .sort((a: any, b: any) => {
                const strengthOrder = { 'Strong': 3, 'Above Avg': 2, 'Minimal': 1 }
                const aStrength = strengthOrder[a.script.strengthLabel as keyof typeof strengthOrder] || 0
                const bStrength = strengthOrder[b.script.strengthLabel as keyof typeof strengthOrder] || 0
                return bStrength - aStrength
              })
              .slice(0, 3)
              .map((g: any) => ({
                id: g.id,
                sport: sport.id,
                awayTeam: g.awayTeam,
                homeTeam: g.homeTeam,
                awayTeamLogo: g.awayTeamLogo,
                homeTeamLogo: g.homeTeamLogo,
                kickoff: g.kickoff,
                kickoffLabel: g.kickoffLabel,
                scriptStrength: g.script.strengthLabel,
                creditsRequired: g.script.creditsRequired
              }))
            
            return {
              sport: sport.id,
              sportLabel: sport.label,
              sportLogo: sport.logo,
              scripts: scriptsAvailable
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
        // Only show sports that have scripts
        setSportsScripts(results.filter(s => s.scripts.length > 0))
      } catch (error) {
        console.error('Error fetching all scripts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAllScripts()
  }, [])

  const handleGenerateScript = async (gameId: string, sport: string) => {
    // Check authentication first
    if (!isSignedIn) {
      openSignUp()
      return
    }
    
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
      const response = await fetch(`/api/scripts/${gameId}?sport=${sport}`, {
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

  const formatPublicCardDate = (isoString: string) => {
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

  return (
    <div className={`${styles.page} allSportsScriptsPage`}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => router.push('/sports')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Back to Sports
          </button>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: 0
          }}>
            AI Game Scripts
          </h1>
          <div style={{ width: '100px' }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 40px' }}>
        {isLoading ? (
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
        ) : sportsScripts.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '0.5rem' }}>
              No scripts available
            </div>
            <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Check back soon for upcoming game scripts
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
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

                {/* Scripts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sportData.scripts.map((game) => {
                    const strength = game.creditsRequired || 1
                    const isExpanded = expandedScripts.has(game.id)
                    const isLoadingScript = loadingScripts.has(game.id)
                    const content = scriptContent.get(game.id)
                    
                    return (
                      <div
                        key={game.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          background: 'rgba(17, 27, 45, 0.92)',
                          borderRadius: '16px',
                          padding: '14px 16px',
                          border: '1px solid rgba(148, 163, 184, 0.18)',
                          boxShadow: '0 14px 32px rgba(15, 23, 42, 0.35)'
                        }}
                      >
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
                          <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '3px' }}>
                            {[1, 2, 3].map((level) => (
                              <span
                                key={level}
                                style={{
                                  width: '6px',
                                  height: level === 1 ? '10px' : level === 2 ? '14px' : '17px',
                                  borderRadius: '2px',
                                  background: strength >= level 
                                    ? level === 1 ? '#f97316' 
                                    : level === 2 ? '#fbbf24' 
                                    : '#10b981'
                                    : 'rgba(148, 163, 184, 0.2)',
                                  boxShadow: strength >= level ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none'
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Row 2: Date/Time + Generate button */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between' 
                        }}>
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {formatPublicCardDate(game.kickoff)}
                          </span>
                          <button 
                            onClick={() => handleGenerateScript(game.id, game.sport)}
                            style={{
                              padding: '0.4rem 0.9rem',
                              fontSize: '0.85rem',
                              background: 'rgba(37, 99, 235, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              borderRadius: '6px',
                              color: 'rgba(96, 165, 250, 0.95)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 0 12px rgba(59, 130, 246, 0.2)'
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
                                {isSignedIn && !isSubscribed && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    ({strength} <GiTwoCoins style={{ fontSize: '0.8rem' }} />)
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        </div>

                        {/* Expanded Script Content */}
                        {isExpanded && (
                          <div style={{
                            marginTop: '12px',
                            paddingTop: '14px',
                            borderTop: '1px solid rgba(148, 163, 184, 0.15)'
                          }}>
                            {isLoadingScript ? (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '24px'
                              }}>
                                <span style={{ 
                                  width: '10px', 
                                  height: '10px', 
                                  background: 'rgba(99, 102, 241, 0.8)', 
                                  borderRadius: '50%',
                                  animation: 'dotPulse 1.4s infinite ease-in-out both',
                                  animationDelay: '-0.32s'
                                }} />
                                <span style={{ 
                                  width: '10px', 
                                  height: '10px', 
                                  background: 'rgba(99, 102, 241, 0.8)', 
                                  borderRadius: '50%',
                                  animation: 'dotPulse 1.4s infinite ease-in-out both',
                                  animationDelay: '-0.16s'
                                }} />
                                <span style={{ 
                                  width: '10px', 
                                  height: '10px', 
                                  background: 'rgba(99, 102, 241, 0.8)', 
                                  borderRadius: '50%',
                                  animation: 'dotPulse 1.4s infinite ease-in-out both'
                                }} />
                              </div>
                            ) : (
                              <div 
                                style={{
                                  color: 'rgba(226, 232, 240, 0.9)',
                                  fontSize: '13px',
                                  lineHeight: '1.6'
                                }}
                                dangerouslySetInnerHTML={{ __html: formatScript(content || '') }} 
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add animation keyframes */}
      <style jsx global>{`
        @keyframes dotPulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

