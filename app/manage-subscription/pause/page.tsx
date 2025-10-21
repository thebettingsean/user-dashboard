'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

      const data = await response.json()
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

  if (!isLoaded) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p style={{fontSize: '0.85rem'}}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (paused) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 style={styles.successTitle}>Subscription Paused</h1>
            <p style={styles.successMessage}>
              Your subscription has been paused. You will not be charged again until you resume.
            </p>
            <p style={styles.successSubMessage}>
              Please note: You've lost access to all premium features.
            </p>
            <p style={styles.successSubMessage}>
              You can resume your subscription anytime from your account settings.
            </p>
            <div style={styles.spinner}></div>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Redirecting to manage subscription...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Pause Your Subscription</h1>
          <p style={styles.subtitle}>Take a break, come back anytime</p>
        </header>

        <div style={styles.infoCard}>
          <h2 style={styles.infoTitle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem'}}>
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
            What happens when you pause?
          </h2>
          <ul style={styles.infoList}>
            <li>No more charges until you resume</li>
            <li>Immediate loss of access to all premium features</li>
            <li>Your account remains active but locked</li>
            <li>Resume anytime with one click</li>
            <li>All your data and preferences are saved</li>
          </ul>
        </div>

        <div style={styles.warningCard}>
          <div style={styles.warningIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p style={styles.warningText}>
            <strong>Important:</strong> Pausing will immediately revoke your access to:
          </p>
          <ul style={styles.warningList}>
            <li>Daily Analyst Picks</li>
            <li>Public Betting Data</li>
            <li>Matchup & Referee Insights</li>
            <li>Fantasy Football Tools</li>
            <li>Prop Parlay Optimizer</li>
            <li>All Premium Features</li>
          </ul>
        </div>

        <div style={styles.actionButtons}>
          <button
            style={pausing ? styles.pauseButtonDisabled : styles.pauseButton}
            onClick={handlePause}
            disabled={pausing}
          >
            {pausing ? 'Pausing...' : 'Pause My Subscription'}
          </button>
          <button
            style={styles.backButton}
            onClick={() => router.push('/manage-subscription')}
          >
            ← Back to Manage Subscription
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '10rem 1.5rem 3rem',
    background: 'transparent',
    color: '#ffffff'
  },
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    width: '100%'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  infoCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  infoTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '1rem',
    color: '#60a5fa'
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.6rem',
    fontSize: '0.85rem',
    lineHeight: '1.5'
  },
  warningCard: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '2px solid rgba(245, 158, 11, 0.4)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '2rem'
  },
  warningIcon: {
    marginBottom: '0.75rem',
    textAlign: 'center' as const
  },
  warningText: {
    fontSize: '0.9rem',
    marginBottom: '0.75rem',
    color: '#fbbf24',
    textAlign: 'center' as const
  },
  warningList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center' as const
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    alignItems: 'center'
  },
  pauseButton: {
    width: '100%',
    maxWidth: '400px',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff',
    border: 'none',
    padding: '0.85rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
  },
  pauseButtonDisabled: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    padding: '0.85rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'not-allowed'
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  successCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '2px solid rgba(34, 197, 94, 0.4)',
    borderRadius: '16px',
    padding: '2rem 1.5rem',
    textAlign: 'center' as const
  },
  successIcon: {
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'center'
  },
  successTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
    color: '#34d399'
  },
  successMessage: {
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '0.75rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  successSubMessage: {
    fontSize: '0.85rem',
    lineHeight: '1.5',
    marginBottom: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)'
  }
}
