'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriptionData {
  id: string
  product_name: string
  price: string
  tier: string  // 'weekly', 'monthly', '6-month'
  type: string  // 'bets', 'stats', 'advantage', 'fantasy'
  status: string
  current_period_end: number
  is_legacy: boolean
  cancel_at_period_end: boolean
}

export default function ManageSubscriptionPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('https://www.thebettinginsider.com')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      loadSubscription()
    }
  }, [user])

  const loadSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user?.primaryEmailAddress?.emailAddress 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load subscription')
      }

      const data = await response.json()
      
      if (data.subscription) {
        setSubscription(data.subscription)
      } else {
        setError('No active subscription found')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading subscription')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading your subscription...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>
            <h1>⚠️ {error}</h1>
            <p>If you believe this is an error, please contact support.</p>
            <button 
              style={styles.backButton}
              onClick={() => router.push('https://dashboard.thebettinginsider.com')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Manage Subscription</h1>
          <p style={styles.subtitle}>Upgrade, pause, or manage your plan</p>
        </header>

        {/* Current Subscription Card */}
        <div style={styles.currentSubCard}>
          <div style={styles.currentSubHeader}>
            <h2 style={styles.currentSubTitle}>Current Plan</h2>
            {subscription?.is_legacy && (
              <span style={styles.legacyBadge}>
                ⭐ Grandfathered - All Access
              </span>
            )}
          </div>
          <div style={styles.currentSubDetails}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Plan:</span>
              <span style={styles.detailValue}>{subscription?.product_name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Price:</span>
              <span style={styles.detailValue}>{subscription?.price}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Billing:</span>
              <span style={styles.detailValue}>
                {subscription?.tier === 'weekly' ? 'Weekly' : 
                 subscription?.tier === 'monthly' ? 'Monthly' : '6-Month'}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Renews:</span>
              <span style={styles.detailValue}>
                {subscription?.current_period_end ? 
                  new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'N/A'}
              </span>
            </div>
            {subscription?.cancel_at_period_end && (
              <div style={styles.cancelNotice}>
                ⚠️ Your subscription is scheduled to cancel at the end of this period
              </div>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div style={styles.actionsGrid}>
          {/* Upgrade Card */}
          <button 
            style={styles.actionCard}
            onClick={() => router.push('/manage-subscription/upgrade')}
          >
            <div style={styles.actionIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>Upgrade Plan</h3>
            <p style={styles.actionDescription}>
              Save money with longer billing cycles
            </p>
          </button>

          {/* Cancel Card */}
          <button 
            style={styles.actionCard}
            onClick={() => router.push('/manage-subscription/cancel')}
          >
            <div style={styles.actionIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>Cancel Subscription</h3>
            <p style={styles.actionDescription}>
              End your subscription (we'll make you an offer)
            </p>
          </button>

          {/* Pause Card */}
          <button 
            style={styles.actionCard}
            onClick={() => router.push('/manage-subscription/pause')}
          >
            <div style={styles.actionIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>Pause Subscription</h3>
            <p style={styles.actionDescription}>
              Take a break, come back anytime
            </p>
          </button>
        </div>

        {/* Back to Dashboard */}
        <button 
          style={styles.backButton}
          onClick={() => router.push('https://dashboard.thebettinginsider.com')}
        >
          ← Back to Dashboard
        </button>
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
    maxWidth: '1000px',
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
  error: {
    textAlign: 'center' as const,
    padding: '3rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  currentSubCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '3rem'
  },
  currentSubHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap' as const,
    gap: '1rem'
  },
  currentSubTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    margin: 0
  },
  legacyBadge: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  currentSubDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  detailLabel: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '0.85rem',
    color: '#fff',
    fontWeight: '600'
  },
  cancelNotice: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center' as const,
    color: '#fca5a5',
    fontWeight: '600'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem'
  },
  actionCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: '#fff'
  },
  actionIcon: {
    marginBottom: '0.75rem',
    color: '#60a5fa'
  },
  actionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  actionDescription: {
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: '1.4'
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
    transition: 'all 0.3s ease',
    display: 'block',
    margin: '0 auto',
    width: 'fit-content'
  }
}

