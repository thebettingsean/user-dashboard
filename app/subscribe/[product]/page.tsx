'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { FiChevronRight, FiCheck } from 'react-icons/fi'
import { IoShieldCheckmark } from 'react-icons/io5'
import { GiSupersonicArrow } from 'react-icons/gi'
import { VscGraphLeft } from 'react-icons/vsc'
import { PRODUCTS, getUpsellForProduct, calculateTotal } from '@/lib/config/subscriptions'
import styles from './subscribe.module.css'

export default function SubscribePage() {
  const router = useRouter()
  const params = useParams()
  const { isSignedIn, user, isLoaded } = useUser()
  const { openSignIn } = useClerk()
  
  const productId = params.product as string
  const product = PRODUCTS[productId]
  const upsell = getUpsellForProduct(productId)
  
  const [includeUpsell, setIncludeUpsell] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Calculate pricing
  const { items, total } = calculateTotal(productId, includeUpsell)
  const savings = upsell ? (upsell.standalone.price - upsell.addon.price).toFixed(2) : '0'
  
  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      openSignIn({ redirectUrl: `/subscribe/${productId}` })
    }
  }, [isLoaded, isSignedIn, productId, openSignIn])
  
  // Invalid product
  if (!product) {
    return (
      <div className={styles.container}>
        <div className={styles.headerSpacer} />
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Product Not Found</div>
          <div className={styles.emptySubtitle}>The requested product doesn&apos;t exist.</div>
          <button onClick={() => router.push('/pricing')} className={styles.primaryBtn}>
            View Pricing
          </button>
        </div>
      </div>
    )
  }
  
  const handleSubscribe = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const priceIds = items.map(item => item.priceId)
      
      const response = await fetch('/api/checkout/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceIds,
          clerkUserId: user?.id,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create checkout')
      }
      
      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }
  
  // Loading state
  if (!isLoaded || !isSignedIn) {
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
  
  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Complete Your Subscription</h1>
            </div>
            <p className={styles.subtitle}>
              Start your 3-day free trial. Cancel anytime before it ends.
            </p>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <div className={styles.contentSection}>
        <div className={styles.checkoutGrid}>
          {/* Left Column - Plan Selection */}
          <div className={styles.planCard}>
            <div className={styles.planCardHeader}>
              <span className={styles.planCardLabel}>Your Plan</span>
            </div>
            
            {/* Primary Product */}
            <div className={styles.productItem}>
              <div className={styles.productItemLeft}>
                <div className={styles.productIcon}>
                  {productId === 'picks' ? <GiSupersonicArrow /> : <VscGraphLeft />}
                </div>
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{product.name}</span>
                  <span className={styles.productDesc}>{product.description}</span>
                </div>
              </div>
              <div className={styles.productPrice}>
                <span className={styles.priceAmount}>${product.standalone.price.toFixed(2)}</span>
                <span className={styles.pricePeriod}>/mo</span>
              </div>
            </div>
            
            {/* Features List */}
            <div className={styles.featuresList}>
              {product.features.map((feature, i) => (
                <div key={i} className={styles.featureItem}>
                  <FiCheck className={styles.featureCheck} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            
            {/* Upsell Option */}
            {upsell && (
              <div 
                className={`${styles.upsellCard} ${includeUpsell ? styles.upsellActive : ''}`}
                onClick={() => setIncludeUpsell(!includeUpsell)}
              >
                <div className={styles.upsellCheckbox}>
                  {includeUpsell && <FiCheck size={14} />}
                </div>
                <div className={styles.upsellContent}>
                  <div className={styles.upsellHeader}>
                    <span className={styles.upsellName}>Add {upsell.name}</span>
                    <span className={styles.upsellSavings}>Save ${savings}</span>
                  </div>
                  <span className={styles.upsellDesc}>{upsell.description}</span>
                  <div className={styles.upsellPricing}>
                    <span className={styles.upsellOriginal}>${upsell.standalone.price.toFixed(2)}</span>
                    <FiChevronRight size={12} className={styles.upsellArrow} />
                    <span className={styles.upsellDiscounted}>${upsell.addon.price.toFixed(2)}/mo</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Summary & Checkout */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardHeader}>
              <span className={styles.summaryCardLabel}>Order Summary</span>
            </div>
            
            {/* Line Items */}
            <div className={styles.summaryItems}>
              {items.map((item, i) => (
                <div key={i} className={styles.summaryItem}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>${item.price.toFixed(2)}/mo</span>
                </div>
              ))}
            </div>
            
            <div className={styles.summaryDivider} />
            
            {/* Trial Info */}
            <div className={styles.trialBox}>
              <div className={styles.trialRow}>
                <span>Card verification</span>
                <span className={styles.trialFree}>$1.00</span>
              </div>
              <div className={styles.trialRowMain}>
                <span>After 3-day trial</span>
                <span className={styles.trialAmount}>${total.toFixed(2)}/mo</span>
              </div>
            </div>
            
            {/* Trust Badge */}
            <div className={styles.trustBadge}>
              <IoShieldCheckmark className={styles.trustIcon} />
              <span>Card charged ${total.toFixed(2)} on day 4 unless cancelled</span>
            </div>
            
            {/* Error */}
            {error && (
              <div className={styles.errorBox}>
                {error}
              </div>
            )}
            
            {/* CTA Button */}
            <button 
              className={styles.ctaButton}
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className={styles.btnSpinner} />
                  Creating checkout...
                </>
              ) : (
                <>
                  Start 3 Day Free Trial
                  <FiChevronRight size={18} />
                </>
              )}
            </button>
            
            <p className={styles.ctaNote}>
              Cancel anytime • No hidden fees • Secure checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
