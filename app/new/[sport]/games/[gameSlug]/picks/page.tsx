'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '../../../../../../lib/hooks/useSubscription'
import { FaLock } from 'react-icons/fa'
import GameLayout from '../components/GameLayout'
import { BettorProfileImage } from '../components/BettorProfileImage'
import styles from './picksTab.module.css'

interface Pick {
  id: string
  bettorName: string
  bettorProfileImage: string | null
  bettorProfileInitials: string | null
  betTitle: string
  odds: string
  units: number
  analysis: string | null
  gameTimeLabel: string
  awayTeam: string | null
  homeTeam: string | null
}

export default function PicksTabPage() {
  const params = useParams()
  const sport = params.sport as string
  const gameSlug = params.gameSlug as string
  
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed } = useSubscription()
  
  const [picks, setPicks] = useState<Pick[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(new Set())
  const [gameId, setGameId] = useState<string | null>(null)
  
  const hasAccess = isSubscribed
  
  // First, get the game ID from the slug
  useEffect(() => {
    const fetchGameId = async () => {
      try {
        const res = await fetch(`/api/dashboard/game-hub?sport=${sport}`)
        const data = await res.json()
        
        const game = data.games?.find((g: any) => {
          const slug = `${g.awayTeam.toLowerCase().replace(/\s+/g, '-')}-at-${g.homeTeam.toLowerCase().replace(/\s+/g, '-')}`
          return gameSlug.startsWith(slug)
        })
        
        if (game) {
          setGameId(game.id)
        }
      } catch (error) {
        console.error('Failed to fetch game ID:', error)
      }
    }
    
    fetchGameId()
  }, [sport, gameSlug])
  
  // Then fetch picks for that game
  useEffect(() => {
    if (!gameId) return
    
    const fetchPicks = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/games/${gameId}/picks`)
        const data = await res.json()
        
        if (data.picks) {
          setPicks(data.picks)
        }
      } catch (error) {
        console.error('Failed to fetch picks:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPicks()
  }, [gameId])
  
  if (!hasAccess) {
    return (
      <GameLayout>
        <div className={styles.lockedContainer}>
          <FaLock className={styles.lockIcon} />
          <h3>Analyst Picks Locked</h3>
          <p>
            {!isSignedIn
              ? 'Sign up to view expert picks for this game'
              : 'Get a subscription to view expert picks for this game'}
          </p>
          <button
            className={styles.unlockButton}
            onClick={() => isSignedIn ? window.location.href = '/pricing' : openSignUp()}
          >
            {!isSignedIn ? 'Sign Up' : 'Get Subscription'}
          </button>
        </div>
      </GameLayout>
    )
  }
  
  if (isLoading) {
    return (
      <GameLayout>
        <div className={styles.loading}>Loading picks...</div>
      </GameLayout>
    )
  }
  
  if (picks.length === 0) {
    return (
      <GameLayout>
        <div className={styles.noPicks}>
          <p>No analyst picks available for this game yet.</p>
        </div>
      </GameLayout>
    )
  }
  
  const formatOddsUnits = (odds: string, units: number) => {
    return `(${odds} | ${units}u)`
  }
  
  return (
    <GameLayout>
      <div className={styles.picksContainer}>
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
                <div className={styles.pickHeaderMeta}>{formatOddsUnits(pick.odds, pick.units)}</div>
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
    </GameLayout>
  )
}

