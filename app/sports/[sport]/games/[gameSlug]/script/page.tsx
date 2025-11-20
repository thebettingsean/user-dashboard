'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '../../../../../../lib/hooks/useSubscription'
import { FaLock } from 'react-icons/fa'
import GameLayout from '../components/GameLayout'
import styles from './scriptTab.module.css'
import { formatScript } from '../../../../../../lib/utils/formatScript'

export default function ScriptTabPage() {
  const params = useParams()
  const sportSlug = params.sport as string
  const gameSlug = params.gameSlug as string
  
  // Map URL slug to API sport code (college-football → cfb)
  const apiSport = sportSlug === 'college-football' ? 'cfb' : sportSlug
  
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed } = useSubscription()
  
  const [script, setScript] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gameId, setGameId] = useState<string | null>(null)
  
  const hasAccess = isSubscribed
  
  // First, get the game ID from the slug
  useEffect(() => {
    const fetchGameId = async () => {
      try {
        console.log(`🔍 Fetching game ID for sport=${apiSport}, slug=${gameSlug}`)
        const res = await fetch(`/api/dashboard/game-hub?sport=${apiSport}`)
        const data = await res.json()
        
        const game = data.games?.find((g: any) => {
          const slug = `${g.awayTeam.toLowerCase().replace(/\s+/g, '-')}-at-${g.homeTeam.toLowerCase().replace(/\s+/g, '-')}`
          return gameSlug.startsWith(slug)
        })
        
        if (game) {
          console.log(`✅ Found game ID: ${game.id}`)
          setGameId(game.id)
        } else {
          console.warn(`⚠️ No game found for slug: ${gameSlug}`)
        }
      } catch (error) {
        console.error('Failed to fetch game ID:', error)
      }
    }
    
    fetchGameId()
  }, [apiSport, gameSlug])
  
  // Then fetch script for that game
  useEffect(() => {
    if (!gameId) return
    
    const fetchScript = async () => {
      try {
        setIsLoading(true)
        console.log(`📜 Fetching script for gameId=${gameId}, sport=${apiSport}`)
        const res = await fetch(`/api/scripts/${gameId}?sport=${apiSport}`)
        const data = await res.json()
        
        console.log(`📜 Script response:`, { hasScript: !!data.script, error: data.error })
        
        if (data.script) {
          setScript(data.script)
        }
      } catch (error) {
        console.error('Failed to fetch script:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchScript()
  }, [gameId, apiSport])
  
  if (isLoading) {
    return (
      <GameLayout>
        <div className={styles.loading}>Loading script...</div>
      </GameLayout>
    )
  }
  
  if (!script) {
    return (
      <GameLayout>
        <div className={styles.noScript}>
          <p>No AI script available for this game yet.</p>
        </div>
      </GameLayout>
    )
  }
  
  return (
    <GameLayout>
      <div style={{ position: 'relative' }}>
        {/* Blur + Overlay for non-subscribed users */}
        {!hasAccess && (
          <>
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                background: 'rgba(0, 0, 0, 0.6)',
                gap: '1.5rem',
                padding: '2rem'
              }}
            >
              <FaLock style={{ fontSize: '3rem', color: 'rgba(255, 255, 255, 0.9)' }} />
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600, 
                margin: 0,
                color: 'white',
                textAlign: 'center'
              }}>
                Unlock AI Script
              </h3>
              <p style={{ 
                fontSize: '1rem', 
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0,
                textAlign: 'center',
                maxWidth: '400px'
              }}>
                {!isSignedIn
                  ? 'Sign up to view our AI-generated game analysis and betting insights'
                  : 'Get a subscription to view our AI-generated game analysis and betting insights'}
              </p>
              <button
                onClick={() => isSignedIn ? window.location.href = '/pricing' : openSignUp()}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(234, 88, 12, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {!isSignedIn ? 'Sign Up Free' : 'View Plans'}
              </button>
            </div>
          </>
        )}
        
        {/* Actual Script Content (shown but blurred if !hasAccess) */}
        <div className={styles.scriptContainer}>
          <div 
            className={styles.scriptContent}
            dangerouslySetInnerHTML={{ __html: formatScript(script) }}
          />
        </div>
      </div>
    </GameLayout>
  )
}

