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
  const sport = params.sport as string
  const gameSlug = params.gameSlug as string
  
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
  
  // Then fetch script for that game
  useEffect(() => {
    if (!gameId) return
    
    const fetchScript = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/scripts/${gameId}?sport=${sport}`)
        const data = await res.json()
        
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
  }, [gameId, sport])
  
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

