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
  
  if (!hasAccess) {
    return (
      <GameLayout>
        <div className={styles.lockedContainer}>
          <FaLock className={styles.lockIcon} />
          <h3>AI Script Locked</h3>
          <p>
            {!isSignedIn
              ? 'Sign up to view AI-generated game script'
              : 'Get a subscription to view AI-generated game script'}
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
      <div className={styles.scriptContainer}>
        <div 
          className={styles.scriptContent}
          dangerouslySetInnerHTML={{ __html: formatScript(script) }}
        />
      </div>
    </GameLayout>
  )
}

