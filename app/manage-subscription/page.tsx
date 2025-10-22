'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriptionData {
  id: string
  product_name: string
  price: string
  price_amount: number
  tier: string
  type: string
  status: string
  current_period_end: number
  is_legacy: boolean
  cancel_at_period_end: boolean
  price_id: string
}

export default function ManageSubscriptionPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('https://www.thebettinginsider.com')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      loadSubscriptions()
    }
  }, [user])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription/get-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user?.primaryEmailAddress?.emailAddress,
          userId: user?.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load subscriptions')
      }

      const data = await response.json()
      
      if (data.subscriptions && data.subscriptions.length > 0) {
        setSubscriptions(data.subscriptions)
        // Auto-expand first subscription if only one
        if (data.subscriptions.length === 1) {
          setExpandedId(data.subscriptions[0].id)
        }
      } else {
        setError('No active subscriptions found')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getStatusColor = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) return '#ef4444' // red
    if (status === 'active' || status === 'trialing') return '#10b981' // green
    return '#f59e0b' // orange
  }

  if (!isLoaded || loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p style={{fontSize: '0.85rem'}}>Loading your subscriptions...</p>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{margin: '0 auto 1rem'}}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h1 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>{error}</h1>
            <p style={{fontSize: '0.85rem'}}>If you believe this is an error, please contact support.</p>
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
          <h1 style={styles.title}>Manage Subscriptions</h1>
          <p style={styles.subtitle}>Upgrade, pause, or manage your plans</p>
        </header>

        {/* Subscription Cards */}
        <div style={styles.subscriptionsContainer}>
          {subscriptions.map((sub) => {
            const isExpanded = expandedId === sub.id
            const statusColor = getStatusColor(sub.status, sub.cancel_at_period_end)
            
            return (
              <div key={sub.id} style={styles.subCard}>
                {/* Header - Always Visible */}
                <div 
                  style={{...styles.subHeader, cursor: 'pointer'}}
                  onClick={() => toggleExpand(sub.id)}
                >
                  <div style={styles.subHeaderLeft}>
                    <div style={{...styles.statusDot, background: statusColor}} />
                    <span style={styles.subName}>{sub.product_name}</span>
                    {sub.is_legacy && (
                      <span style={styles.legacyBadge}>Grandfathered</span>
                    )}
                  </div>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{
                      transition: 'transform 0.3s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={styles.subDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Plan:</span>
                      <span style={styles.detailValue}>{sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Price:</span>
                      <span style={styles.detailValue}>{sub.price}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Renews:</span>
                      <span style={styles.detailValue}>
                        {sub.current_period_end ? 
                          new Date(sub.current_period_end * 1000).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          }) : 'N/A'}
                      </span>
                    </div>
                    {sub.cancel_at_period_end && (
                      <div style={styles.cancelNotice}>
                        Your subscription is scheduled to cancel at the end of this period
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div style={styles.quickActions}>
                      <button
                        style={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/manage-subscription/upgrade?sub=${sub.id}`)
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                        Upgrade
                      </button>
                      <button
                        style={{...styles.actionBtn, ...styles.actionBtnCancel}}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/manage-subscription/cancel?sub=${sub.id}`)
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        Cancel
                      </button>
                      <button
                        style={{...styles.actionBtn, ...styles.actionBtnPause}}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/manage-subscription/pause?sub=${sub.id}`)
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="6" y="4" width="4" height="16"/>
                          <rect x="14" y="4" width="4" height="16"/>
                        </svg>
                        Pause
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
  error: {
    textAlign: 'center' as const,
    padding: '2rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2.5rem'
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
  subscriptionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    marginBottom: '2.5rem'
  },
  subCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  subHeader: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background 0.2s'
  },
  subHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap' as const
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0
  },
  subName: {
    fontSize: '1rem',
    fontWeight: '700'
  },
  legacyBadge: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600'
  },
  subDetails: {
    padding: '0 1.5rem 1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.75rem',
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
    padding: '0.75rem',
    borderRadius: '6px',
    textAlign: 'center' as const,
    color: '#fca5a5',
    fontWeight: '600',
    fontSize: '0.8rem'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  actionBtn: {
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    color: '#60a5fa',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem'
  },
  actionBtnCancel: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#f87171'
  },
  actionBtnPause: {
    background: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#fbbf24'
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'block',
    margin: '0 auto',
    width: 'fit-content'
  }
}
