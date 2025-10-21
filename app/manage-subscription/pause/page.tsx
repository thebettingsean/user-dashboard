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
      
      // Show success message
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
            <p>Loading...</p>
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
            <div style={styles.successIcon}>✅</div>
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
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
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
          <h2 style={styles.infoTitle}>⏸️ What happens when you pause?</h2>
          <ul style={styles.infoList}>
            <li>✅ No more charges until you resume</li>
            <li>⚠️ Immediate loss of access to all premium features</li>
            <li>🔒 Your account remains active but locked</li>
            <li>🔄 Resume anytime with one click</li>
            <li>💾 All your data and preferences are saved</li>
          </ul>
        </div>

        <div style={styles.warningCard}>
          <div style={styles.warningIcon}>⚠️</div>
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
            {pausing ? 'Pausing...' : '⏸️ Pause My Subscription'}
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
    padding: '10rem 2rem 4rem',
    background: 'transparent',
    color: '#ffffff'
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1.5rem'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  infoCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem'
  },
  infoTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    color: '#60a5fa'
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    fontSize: '1rem',
    lineHeight: '1.6'
  },
  warningCard: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '2px solid rgba(245, 158, 11, 0.4)',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '3rem'
  },
  warningIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    textAlign: 'center' as const
  },
  warningText: {
    fontSize: '1rem',
    marginBottom: '1rem',
    color: '#fbbf24',
    textAlign: 'center' as const
  },
  warningList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center' as const
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    alignItems: 'center'
  },
  pauseButton: {
    width: '100%',
    maxWidth: '400px',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
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
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'not-allowed'
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  successCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '2px solid rgba(34, 197, 94, 0.4)',
    borderRadius: '16px',
    padding: '3rem 2rem',
    textAlign: 'center' as const
  },
  successIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  successTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem',
    color: '#34d399'
  },
  successMessage: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '1rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  successSubMessage: {
    fontSize: '1rem',
    lineHeight: '1.6',
    marginBottom: '1rem',
    color: 'rgba(255, 255, 255, 0.7)'
  }
}

