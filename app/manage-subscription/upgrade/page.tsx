'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UpgradeOption {
  type: 'monthly' | 'sixMonth'
  priceId: string
  name: string
  price: number
  currency: string
  savings: string
  interval: string
}

interface CurrentPlan {
  name: string
  price: number
  currency: string
  interval: string
  isLegacy: boolean
}

export default function UpgradePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null)
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('https://www.thebettinginsider.com')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (user?.id) {
      checkUpgrades()
    }
  }, [user])

  const checkUpgrades = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'checkUpgrades'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load upgrade options')
      }

      const data = await response.json()
      setCurrentPlan(data.currentPlan)
      setUpgrades(data.availableUpgrades || [])
      
      if (!data.hasUpgrades) {
        setError('No upgrade options available for your current plan')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading upgrades')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (priceId: string) => {
    if (!confirm('Are you sure you want to upgrade? This will take effect immediately and you\'ll be charged a prorated amount.')) {
      return
    }

    try {
      setUpgrading(true)
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          action: 'applyUpgrade',
          targetPriceId: priceId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to apply upgrade')
      }

      const data = await response.json()
      
      if (data.success) {
        alert('Upgrade successful! Your subscription has been updated.')
        router.push('/manage-subscription')
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to upgrade'}`)
    } finally {
      setUpgrading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p style={{fontSize: '0.85rem'}}>Loading upgrade options...</p>
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
            <p style={{fontSize: '0.85rem'}}>You're already on the best plan for your tier!</p>
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

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Upgrade Your Plan</h1>
          <p style={styles.subtitle}>Save money with longer billing cycles</p>
        </header>

        {/* Current Plan */}
        <div style={styles.currentPlanCard}>
          <h3 style={styles.cardTitle}>Your Current Plan</h3>
          <div style={styles.planInfo}>
            <div style={styles.planName}>
              {currentPlan?.name}
              {currentPlan?.isLegacy && (
                <span style={styles.legacyBadge}>
                  ⭐ Grandfathered - All Access
                </span>
              )}
            </div>
            <div style={styles.planPrice}>
              {currentPlan?.currency.toUpperCase()} ${currentPlan?.price.toFixed(2)}/
              {currentPlan?.interval === 'week' ? 'week' : 
               currentPlan?.interval === 'month' ? 'month' : '6 months'}
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        {upgrades.length > 0 && (
          <>
            <h2 style={styles.sectionTitle}>Available Upgrades</h2>
            <div style={styles.upgradesGrid}>
              {upgrades.map((upgrade) => (
                <div key={upgrade.priceId} style={styles.upgradeCard}>
                  <div style={styles.upgradeHeader}>
                    <h3 style={styles.upgradeName}>{upgrade.name}</h3>
                    <div style={styles.savingsBadge}>{upgrade.savings}</div>
                  </div>
                  
                  <div style={styles.upgradePrice}>
                    {upgrade.currency.toUpperCase()} ${upgrade.price.toFixed(2)}
                    <span style={styles.upgradePeriod}>
                      /{upgrade.interval === 'month' ? 'month' : '6 months'}
                    </span>
                  </div>

                  <ul style={styles.benefitsList}>
                    <li>✓ All features included</li>
                    <li>✓ {currentPlan?.isLegacy ? 'Keeps All Access benefits' : 'Full Advantage access'}</li>
                    <li>✓ Better value per month</li>
                    <li>✓ Hassle-free renewal</li>
                  </ul>

                  <button
                    style={upgrading ? styles.upgradeButtonDisabled : styles.upgradeButton}
                    onClick={() => handleUpgrade(upgrade.priceId)}
                    disabled={upgrading}
                  >
                    {upgrading ? 'Processing...' : 'Upgrade Now'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {currentPlan?.isLegacy && (
          <div style={styles.legacyNotice}>
            <strong>Grandfathered Status:</strong> You're on a legacy plan with All Access benefits! 
            Upgrading will keep all your benefits while saving you money with longer billing.
          </div>
        )}

        <button 
          style={styles.backButton}
          onClick={() => router.push('/manage-subscription')}
        >
          ← Back to Manage Subscription
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
  currentPlanCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '2.5rem'
  },
  cardTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: 'rgba(255, 255, 255, 0.8)'
  },
  planInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '1rem'
  },
  planName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap' as const
  },
  legacyBadge: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '600'
  },
  planPrice: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#60a5fa'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    textAlign: 'center' as const
  },
  upgradesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  upgradeCard: {
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
    border: '2px solid rgba(34, 197, 94, 0.4)',
    borderRadius: '16px',
    padding: '1.5rem',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(30px)'
  },
  upgradeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    flexWrap: 'wrap' as const,
    gap: '0.5rem'
  },
  upgradeName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    margin: 0,
    color: '#10b981'
  },
  savingsBadge: {
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: '#fff',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700'
  },
  upgradePrice: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '1rem'
  },
  upgradePeriod: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  benefitsList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.5rem 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    fontSize: '0.85rem'
  },
  upgradeButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
  },
  upgradeButtonDisabled: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'not-allowed'
  },
  legacyNotice: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    textAlign: 'center' as const,
    color: '#fbbf24',
    lineHeight: '1.6',
    fontSize: '0.85rem'
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
