'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '../../../../../../lib/hooks/useSubscription'
import { FaLock } from 'react-icons/fa'
import GameLayout from '../components/GameLayout'
import styles from './picksTab.module.css'

interface Pick {
  id: string
  bettor_name: string
  bettor_profile_image: string | null
  bettor_profile_initials: string | null
  bet_title: string
  odds: string
  unit_size: number
  analysis: string | null
  game_time: string
}

export default function PicksTabPage() {
  const params = useParams()
  const gameSlug = params.gameSlug as string
  
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed } = useSubscription()
  
  const [picks, setPicks] = useState<Pick[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const hasAccess = isSubscribed
  
  useEffect(() => {
    // TODO: Fetch picks for this specific game
    // For now, showing placeholder
    setIsLoading(false)
  }, [gameSlug])
  
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
  
  return (
    <GameLayout>
      <div className={styles.picksContainer}>
        {/* We'll populate with actual pick cards here */}
        <p className={styles.placeholder}>Picks will display here (reusing existing pick card components)</p>
      </div>
    </GameLayout>
  )
}

