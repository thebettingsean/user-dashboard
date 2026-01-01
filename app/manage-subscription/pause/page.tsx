'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPause, FiAlertTriangle, FiCheck, FiArrowLeft } from 'react-icons/fi'
import styles from '../shared.module.css'

export default function PausePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [pausing, setPausing] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('https://www.thebettinginsider.com')
    }
  }, [isLoaded, user, router])

  const handlePause = async () => {
    if (!confirm('Are you sure you want to pause your subscription? You will lose access to all premium features immediately.')) {
      return
    }

    setPausing(true)
    try {
      const response = await fetch('/api/subscription/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })

      if (!response.ok) {
        throw new Error('Failed to pause subscription')
      }

      setPaused(true)
      
      setTimeout(() => {
        router.push('/manage-subscription')
      }, 3000)
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to pause subscription'}`)
    } finally {
      setPausing(false)
    }
  }

  // Loading
  if (!isLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    )
  }

  // Success state
  if (paused) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.innerContainer}>
          <div className={styles.cardSuccess}>
            <div className={styles.iconContainer}>
              <FiCheck className={`${styles.icon} ${styles.iconGreen}`} />
            </div>
            <h1 className={styles.cardTitleGreen}>Subscription Paused</h1>
            <p className={styles.cardTextStrong}>
              Your subscription has been paused. You will not be charged again until you resume.
            </p>
            <p className={styles.cardText}>
              Please note: You've lost access to all premium features.
              You can resume your subscription anytime from your account settings.
            </p>
            <div className={styles.loadingSpinner} style={{ margin: '16px auto 0' }} />
            <p className={styles.cardText} style={{ marginTop: '12px', marginBottom: 0 }}>
              Redirecting to manage subscription...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      <div className={styles.innerContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>Pause Your Subscription</h1>
          <p className={styles.subtitle}>Take a break, come back anytime</p>
        </header>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <FiPause size={18} />
            What happens when you pause?
          </h3>
          <ul className={styles.list}>
            <li className={styles.listItemCheck}>No more charges until you resume</li>
            <li className={styles.listItemCheck}>Your account remains active but locked</li>
            <li className={styles.listItemCheck}>Resume anytime with one click</li>
            <li className={styles.listItemCheck}>All your data and preferences are saved</li>
          </ul>
        </div>

        <div className={styles.cardWarning}>
          <div className={styles.iconContainer}>
            <FiAlertTriangle className={`${styles.icon} ${styles.iconOrange}`} />
          </div>
          <p className={styles.cardText} style={{ color: '#fbbf24', textAlign: 'center', marginBottom: '12px' }}>
            <strong>Important:</strong> Pausing will immediately revoke your access to:
          </p>
          <ul className={styles.list} style={{ textAlign: 'center' }}>
            <li className={styles.listItemWarning}>Daily Analyst Picks</li>
            <li className={styles.listItemWarning}>Public Betting Data</li>
            <li className={styles.listItemWarning}>Matchup & Referee Insights</li>
            <li className={styles.listItemWarning}>All Premium Features</li>
          </ul>
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.btnWarning}
            onClick={handlePause}
            disabled={pausing}
          >
            {pausing ? 'Pausing...' : 'Pause My Subscription'}
          </button>
          <button
            className={styles.btnBack}
            onClick={() => router.push('/manage-subscription')}
            style={{ marginTop: 0 }}
          >
            <FiArrowLeft size={14} />
            Back to Manage Subscription
          </button>
        </div>
      </div>
    </div>
  )
}
