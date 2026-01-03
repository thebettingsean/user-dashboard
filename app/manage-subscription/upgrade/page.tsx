'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi'
import styles from '../shared.module.css'

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

  // Loading
  if (!isLoaded || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>Loading upgrade options...</div>
        </div>
      </div>
    )
  }

  // Error / No upgrades
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.innerContainer}>
          <div className={styles.cardError}>
            <div className={styles.iconContainer}>
              <FiAlertCircle className={`${styles.icon} ${styles.iconRed}`} />
            </div>
            <h1 className={styles.cardTitleRed}>{error}</h1>
            <p className={styles.cardText}>You're already on the best plan for your tier!</p>
            <button 
              className={styles.btnBack}
              onClick={() => router.push('/manage-subscription')}
              style={{ marginTop: 16 }}
            >
              <FiArrowLeft size={14} />
              Back to Manage Subscription
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      <div className={styles.innerContainer} style={{ maxWidth: '700px' }}>
        <header className={styles.header}>
          <h1 className={styles.title}>Upgrade Your Plan</h1>
          <p className={styles.subtitle}>Save money with longer billing cycles</p>
        </header>

        {/* Current Plan */}
        <div className={styles.cardHighlight}>
          <h3 className={styles.cardTitle}>Your Current Plan</h3>
          <div className={styles.currentPlanRow}>
            <div className={styles.currentPlanName}>
              {currentPlan?.name}
              {currentPlan?.isLegacy && (
                <span className={styles.legacyBadge}>⭐ Grandfathered</span>
              )}
            </div>
            <div className={styles.currentPlanPrice}>
              {currentPlan?.currency.toUpperCase()} ${currentPlan?.price.toFixed(2)}/
              {currentPlan?.interval === 'week' ? 'week' : 
               currentPlan?.interval === 'month' ? 'month' : '6 months'}
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        {upgrades.length > 0 && (
          <>
            <h3 className={styles.cardTitle} style={{ textAlign: 'center', marginBottom: 16 }}>
              Available Upgrades
            </h3>
            <div className={styles.upgradesGrid}>
              {upgrades.map((upgrade) => (
                <div key={upgrade.priceId} className={styles.upgradeCard}>
                  <div className={styles.upgradeHeader}>
                    <h3 className={styles.upgradeName}>{upgrade.name}</h3>
                    <span className={styles.savingsBadge}>{upgrade.savings}</span>
                  </div>
                  
                  <div className={styles.upgradePrice}>
                    {upgrade.currency.toUpperCase()} ${upgrade.price.toFixed(2)}
                    <span className={styles.upgradePeriod}>
                      /{upgrade.interval === 'month' ? 'month' : '6 months'}
                    </span>
                  </div>

                  <ul className={styles.list}>
                    <li className={styles.listItemCheck}>All features included</li>
                    <li className={styles.listItemCheck}>{currentPlan?.isLegacy ? 'Keeps All Access' : 'Full access'}</li>
                    <li className={styles.listItemCheck}>Better value per month</li>
                  </ul>

                  <button
                    className={styles.btnSuccess}
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
          <div className={styles.noticeBox}>
            <strong>Grandfathered Status:</strong> You're on a legacy plan with All Access benefits! 
            Upgrading will keep all your benefits while saving you money with longer billing.
          </div>
        )}

        <button 
          className={styles.btnBack}
          onClick={() => router.push('/manage-subscription')}
        >
          <FiArrowLeft size={14} />
          Back to Manage Subscription
        </button>
      </div>
    </div>
  )
}
