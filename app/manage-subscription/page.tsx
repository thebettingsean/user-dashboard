'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FiChevronDown, FiArrowUp, FiX, FiPause, FiPlay, FiRefreshCw, FiAlertCircle,
  FiGift, FiTrendingUp, FiBell, FiCreditCard, FiHelpCircle, FiUsers, FiBook, 
  FiDollarSign, FiMessageCircle, FiMail, FiExternalLink, FiShare2
} from 'react-icons/fi'
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

type SectionId = 'free-access' | 'maximize-profit' | 'notifications' | 'subscription' | 'help'

export default function ManageSubscriptionPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [expandedSections, setExpandedSections] = useState<SectionId[]>(['subscription'])
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null)
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
        if (data.subscriptions.length === 1) {
          setExpandedSubId(data.subscriptions[0].id)
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

  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const toggleSubExpand = (id: string) => {
    setExpandedSubId(expandedSubId === id ? null : id)
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

  const getRenewalInfo = (sub: SubscriptionData) => {
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

      {/* Sections */}
      <div className={styles.sectionsContainer}>
        
        {/* 1. FREE ACCESS */}
        <div className={styles.section}>
          <div 
            className={styles.sectionHeader}
            onClick={() => toggleSection('free-access')}
          >
            <div className={styles.sectionHeaderLeft}>
              <div className={`${styles.sectionIcon} ${styles.sectionIconGreen}`}>
                <FiGift size={18} />
              </div>
              <div className={styles.sectionInfo}>
                <span className={styles.sectionName}>Free Access</span>
                <span className={styles.sectionDesc}>Earn free months by referring friends</span>
              </div>
            </div>
            <FiChevronDown 
              className={`${styles.expandIcon} ${expandedSections.includes('free-access') ? styles.expandIconRotated : ''}`}
              size={18}
            />
          </div>
          
          {expandedSections.includes('free-access') && (
            <div className={styles.sectionContent}>
              <div className={styles.infoBox}>
                <FiGift size={16} />
                <span>Join a top rated book and get 1 month free!</span>
              </div>
              <div className={styles.linksList}>
                <a href="/sportsbooks" className={styles.linkItem}>
                  <FiDollarSign size={16} />
                  <span>View Books & Bonuses</span>
                  <FiChevronDown size={14} className={styles.linkArrow} style={{ transform: 'rotate(-90deg)' }} />
                </a>
                <div className={styles.linkItemDisabled}>
                  <FiUsers size={16} />
                  <span>Refer a friend and get 1 free month</span>
                  <span className={styles.comingSoonBadge}>Coming Soon</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. MAXIMIZE PROFIT */}
        <div className={styles.section}>
          <div 
            className={styles.sectionHeader}
            onClick={() => toggleSection('maximize-profit')}
          >
            <div className={styles.sectionHeaderLeft}>
              <div className={`${styles.sectionIcon} ${styles.sectionIconBlue}`}>
                <FiTrendingUp size={18} />
              </div>
              <div className={styles.sectionInfo}>
                <span className={styles.sectionName}>Maximize Profit</span>
                <span className={styles.sectionDesc}>Guides to improve your betting strategy</span>
              </div>
            </div>
            <FiChevronDown 
              className={`${styles.expandIcon} ${expandedSections.includes('maximize-profit') ? styles.expandIconRotated : ''}`}
              size={18}
            />
          </div>
          
          {expandedSections.includes('maximize-profit') && (
            <div className={styles.sectionContent}>
              <div className={styles.linksList}>
                <a href="/simulator" className={styles.linkItem}>
                  <FiTrendingUp size={16} />
                  <span>Simulator</span>
                  <FiChevronDown size={14} className={styles.linkArrow} style={{ transform: 'rotate(-90deg)' }} />
                </a>
                <a href="/betting-guide" className={styles.linkItem}>
                  <FiBook size={16} />
                  <span>Betting Guide</span>
                  <FiChevronDown size={14} className={styles.linkArrow} style={{ transform: 'rotate(-90deg)' }} />
                </a>
                <a href="/bankroll-builder" className={styles.linkItem}>
                  <FiDollarSign size={16} />
                  <span>Bankroll Builder</span>
                  <FiChevronDown size={14} className={styles.linkArrow} style={{ transform: 'rotate(-90deg)' }} />
                </a>
                <a href="/roi-calculator" className={styles.linkItem}>
                  <FiTrendingUp size={16} />
                  <span>ROI Calculator</span>
                  <FiChevronDown size={14} className={styles.linkArrow} style={{ transform: 'rotate(-90deg)' }} />
                </a>
                <a href="https://www.thebettinginsider.com/profit-guide" target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  <FiBook size={16} />
                  <span>Profit Guide</span>
                  <FiExternalLink size={14} className={styles.linkExternal} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 3. MANAGE NOTIFICATIONS */}
        <div className={styles.section}>
          <div 
            className={styles.sectionHeader}
            onClick={() => toggleSection('notifications')}
          >
            <div className={styles.sectionHeaderLeft}>
              <div className={`${styles.sectionIcon} ${styles.sectionIconPurple}`}>
                <FiBell size={18} />
              </div>
              <div className={styles.sectionInfo}>
                <span className={styles.sectionName}>Manage Notifications</span>
                <span className={styles.sectionDesc}>Discord alerts & notification preferences</span>
              </div>
            </div>
            <FiChevronDown 
              className={`${styles.expandIcon} ${expandedSections.includes('notifications') ? styles.expandIconRotated : ''}`}
              size={18}
            />
          </div>
          
          {expandedSections.includes('notifications') && (
            <div className={styles.sectionContent}>
              <div className={styles.infoBox}>
                <FiMessageCircle size={16} />
                <span>Get instant alerts when new picks are posted!</span>
              </div>
              <div className={styles.linksList}>
                <a href="https://discord.gg/thebettinginsider" target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  <FiMessageCircle size={16} />
                  <span>Join Discord Server</span>
                  <FiExternalLink size={14} className={styles.linkExternal} />
                </a>
                <a href="/sports" className={styles.linkItem}>
                  <FiBell size={16} />
                  <span>Notification Settings</span>
                  <FiChevronDown size={14} className={styles.linkArrow} style={{ transform: 'rotate(-90deg)' }} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 4. MANAGE SUBSCRIPTION */}
        <div className={styles.section}>
          <div 
            className={styles.sectionHeader}
            onClick={() => toggleSection('subscription')}
          >
            <div className={styles.sectionHeaderLeft}>
              <div className={`${styles.sectionIcon} ${styles.sectionIconYellow}`}>
                <FiCreditCard size={18} />
              </div>
              <div className={styles.sectionInfo}>
                <span className={styles.sectionName}>Manage Subscription</span>
                <span className={styles.sectionDesc}>
                  {subscriptions.length > 0 
                    ? `${subscriptions.length} active plan${subscriptions.length > 1 ? 's' : ''}`
                    : 'View and manage your plans'
                  }
                </span>
              </div>
            </div>
            <FiChevronDown 
              className={`${styles.expandIcon} ${expandedSections.includes('subscription') ? styles.expandIconRotated : ''}`}
              size={18}
            />
          </div>
          
          {expandedSections.includes('subscription') && (
            <div className={styles.sectionContent}>
              {error ? (
                <div className={styles.errorNotice}>
                  <FiAlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ) : (
                <div className={styles.subscriptionsGrid}>
                  {subscriptions.map((sub) => {
                    const isExpanded = expandedSubId === sub.id
                    const statusDotClass = getStatusDotClass(sub.status, sub.cancel_at_period_end, sub.is_paused)
                    const statusBadgeClass = getStatusBadgeClass(sub.status, sub.cancel_at_period_end, sub.is_paused)
                    const statusLabel = getStatusLabel(sub.status, sub.cancel_at_period_end, sub.is_paused, sub.cancel_at)
                    const renewalInfo = getRenewalInfo(sub)
                    
                    return (
                      <div key={sub.id} className={styles.subCard}>
                        <div 
                          className={styles.subHeader}
                          onClick={() => toggleSubExpand(sub.id)}
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
                            size={16}
                          />
                        </div>

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

                            <div className={styles.quickActions}>
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
              )}
            </div>
          )}
        </div>

        {/* 5. GET HELP */}
        <div className={styles.section}>
          <div 
            className={styles.sectionHeader}
            onClick={() => toggleSection('help')}
          >
            <div className={styles.sectionHeaderLeft}>
              <div className={`${styles.sectionIcon} ${styles.sectionIconRed}`}>
                <FiHelpCircle size={18} />
              </div>
              <div className={styles.sectionInfo}>
                <span className={styles.sectionName}>Get Help</span>
                <span className={styles.sectionDesc}>Contact support & find answers</span>
              </div>
            </div>
            <FiChevronDown 
              className={`${styles.expandIcon} ${expandedSections.includes('help') ? styles.expandIconRotated : ''}`}
              size={18}
            />
          </div>
          
          {expandedSections.includes('help') && (
            <div className={styles.sectionContent}>
              <div className={styles.linksList}>
                <a href="/faq" className={styles.linkItem}>
                  <FiHelpCircle size={16} />
                  <span>FAQ</span>
                  <FiChevronDown size={14} className={styles.linkArrow} style={{ transform: 'rotate(-90deg)' }} />
                </a>
                <a href="https://www.thebettinginsider.com/contact" target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  <FiMail size={16} />
                  <span>Contact Support</span>
                  <FiExternalLink size={14} className={styles.linkExternal} />
                </a>
                <a href="https://discord.gg/thebettinginsider" target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  <FiMessageCircle size={16} />
                  <span>Discord Community</span>
                  <FiExternalLink size={14} className={styles.linkExternal} />
                </a>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Back to Dashboard */}
      <button 
        className={styles.backButton}
        onClick={() => router.push('/')}
      >
        ← Back to Dashboard
      </button>
    </div>
  )
}
