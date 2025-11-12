'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useSubscription } from '../../../../../../lib/hooks/useSubscription'
import { FaLock } from 'react-icons/fa'
import GameLayout from '../components/GameLayout'
import styles from '../picks/picksTab.module.css'

export default function PublicBettingTabPage() {
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { isSubscribed } = useSubscription()
  
  const hasAccess = isSubscribed
  
  if (!hasAccess) {
    return (
      <GameLayout>
        <div className={styles.lockedContainer}>
          <FaLock className={styles.lockIcon} />
          <h3>Public Betting Data Locked</h3>
          <p>
            {!isSignedIn
              ? 'Sign up to view public betting trends for this game'
              : 'Get a subscription to view public betting trends for this game'}
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
  
  return (
    <GameLayout>
      <div style={{ padding: '2rem', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', textAlign: 'center' }}>
        Public betting data will display here (all splits, RLM, big money, etc.)
      </div>
    </GameLayout>
  )
}

