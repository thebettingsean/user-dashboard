'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiChevronDown, FiArrowUp, FiX, FiPause, FiPlay, FiRefreshCw, FiAlertCircle } from 'react-icons/fi'
import styles from './manage-subscription.module.css'

interface SubscriptionData {
  id: string
  product_name: string
  price: string
  price_amount: number
  tier: string
  type: string
  status: string
  current_period_end: number
  cancel_at: number | null
  is_legacy: boolean
  cancel_at_period_end: boolean
  is_paused: boolean
  price_id: string
  trial_end?: number | null
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

  const getStatusDotClass = (status: string, cancelAtPeriodEnd: boolean, isPaused: boolean) => {
    if (cancelAtPeriodEnd) return styles.statusDotCanceling
    if (isPaused) return styles.statusDotPaused
    if (status === 'trialing') return styles.statusDotTrialing
    if (status === 'active') return styles.statusDotActive
    return styles.statusDotPaused
  }

  const getStatusBadgeClass = (status: string, cancelAtPeriodEnd: boolean, isPaused: boolean) => {
    if (cancelAtPeriodEnd) return styles.statusBadgeCanceling
    if (isPaused) return styles.statusBadgePaused
    if (status === 'trialing') return styles.statusBadgeTrialing
    if (status === 'active') return styles.statusBadgeActive
    return styles.statusBadgePaused
  }

  const getStatusLabel = (status: string, cancelAtPeriodEnd: boolean, isPaused: boolean, cancelAt: number | null) => {
    if (isPaused) return 'Paused'
    if (cancelAtPeriodEnd && cancelAt) {
      const cancelDate = new Date(cancelAt * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
      return `Cancels ${cancelDate}`
    }
    if (status === 'active') return 'Active'
    if (status === 'trialing') return 'Trial'
    return status
  }

  // Get renewal label and date based on status
  const getRenewalInfo = (sub: SubscriptionData) => {
    // If on trial, show trial end date
    if (sub.status === 'trialing' && sub.trial_end) {
      return {
        label: 'Trial Ends',
        date: new Date(sub.trial_end * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      }
    }
    
    // If trialing without trial_end, use current_period_end
    if (sub.status === 'trialing') {
      return {
        label: 'Trial Ends',
        date: sub.current_period_end ? 
          new Date(sub.current_period_end * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }) : 'N/A'
      }
    }
    
    // Active subscription shows renewal
    return {
      label: 'Renewal',
      date: sub.current_period_end ? 
        new Date(sub.current_period_end * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }) : 'N/A'
    }
  }

  const handleReactivate = async (subId: string) => {
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          subscriptionId: subId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription')
      }

      await loadSubscriptions()
      alert('✅ Subscription reactivated successfully!')
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to reactivate subscription'}`)
    }
  }

  const handleUnpause = async (subId: string) => {
    try {
      const response = await fetch('/api/subscription/unpause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          subscriptionId: subId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to unpause subscription')
      }

      await loadSubscriptions()
      alert('✅ Subscription resumed successfully!')
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to unpause subscription'}`)
    }
  }

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>Loading your account...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.emptyState}>
          <FiAlertCircle className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>No Subscriptions Found</div>
          <div className={styles.emptySubtitle}>
            If you believe this is an error, please contact support.
          </div>
          <button 
            className={styles.primaryBtn}
            onClick={() => window.location.href = 'https://www.thebettinginsider.com/contact'}
          >
            Contact Support
          </button>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>My Account</h1>
            </div>
            <p className={styles.subtitle}>Manage your subscriptions, preferences & settings</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={styles.contentSection}>
        {/* Subscriptions Section */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Subscriptions</h2>
        </div>
        
        <div className={styles.subscriptionsGrid}>
          {subscriptions.map((sub) => {
            const isExpanded = expandedId === sub.id
            const statusDotClass = getStatusDotClass(sub.status, sub.cancel_at_period_end, sub.is_paused)
            const statusBadgeClass = getStatusBadgeClass(sub.status, sub.cancel_at_period_end, sub.is_paused)
            const statusLabel = getStatusLabel(sub.status, sub.cancel_at_period_end, sub.is_paused, sub.cancel_at)
            const renewalInfo = getRenewalInfo(sub)
            
            return (
              <div key={sub.id} className={styles.subCard}>
                {/* Header - Always Visible */}
                <div 
                  className={styles.subHeader}
                  onClick={() => toggleExpand(sub.id)}
                >
                  <div className={styles.subHeaderLeft}>
                    <div className={`${styles.statusDot} ${statusDotClass}`} />
                    <span className={styles.subName}>{sub.product_name}</span>
                    <span className={`${styles.statusBadge} ${statusBadgeClass}`}>
                      {statusLabel}
                    </span>
                    {sub.is_legacy && (
                      <span className={styles.legacyBadge}>Grandfathered</span>
                    )}
                  </div>
                  <FiChevronDown 
                    className={`${styles.expandIcon} ${isExpanded ? styles.expandIconRotated : ''}`}
                    size={18}
                  />
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className={styles.subDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Plan</span>
                      <span className={styles.detailValue}>
                        {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Price</span>
                      <span className={styles.detailValue}>{sub.price}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>{renewalInfo.label}</span>
                      <span className={styles.detailValue}>{renewalInfo.date}</span>
                    </div>

                    {/* Quick Actions - Conditional based on state */}
                    <div className={styles.quickActions}>
                      {/* CANCELING STATE: Show Reactivate Only */}
                      {sub.cancel_at_period_end && !sub.is_paused && (
                        <>
                          <div className={styles.cancelNotice}>
                            Your subscription will expire on {sub.cancel_at ? 
                              new Date(sub.cancel_at * 1000).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              }) : 'N/A'}
                          </div>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnReactivate}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReactivate(sub.id)
                            }}
                          >
                            <FiRefreshCw size={14} />
                            Reactivate Subscription
                          </button>
                        </>
                      )}

                      {/* PAUSED STATE: Show Unpause Only */}
                      {sub.is_paused && (
                        <>
                          <div className={styles.pauseNotice}>
                            Your subscription is currently paused
                          </div>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnReactivate}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUnpause(sub.id)
                            }}
                          >
                            <FiPlay size={14} />
                            Resume Subscription
                          </button>
                        </>
                      )}

                      {/* ACTIVE STATE: Show All Options */}
                      {!sub.cancel_at_period_end && !sub.is_paused && (
                        <div className={styles.quickActionsRow}>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnUpgrade}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/manage-subscription/upgrade?sub=${sub.id}`)
                            }}
                          >
                            <FiArrowUp size={14} />
                            Upgrade
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnCancel}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/manage-subscription/cancel?sub=${sub.id}`)
                            }}
                          >
                            <FiX size={14} />
                            Cancel
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnPause}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/manage-subscription/pause?sub=${sub.id}`)
                            }}
                          >
                            <FiPause size={14} />
                            Pause
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Back to Dashboard */}
        <button 
          className={styles.backButton}
          onClick={() => router.push('/')}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  )
}
