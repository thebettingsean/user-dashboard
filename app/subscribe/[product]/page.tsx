'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Loader2, Check, ChevronRight, Sparkles, Shield, Zap } from 'lucide-react'
import { PRODUCTS, getUpsellForProduct, calculateTotal, ProductConfig } from '@/lib/config/subscriptions'
import styles from './subscribe.module.css'

export default function SubscribePage() {
  const router = useRouter()
  const params = useParams()
  const { isSignedIn, user, isLoaded } = useUser()
  
  const productId = params.product as string
  const product = PRODUCTS[productId]
  const upsell = getUpsellForProduct(productId)
  
  const [includeUpsell, setIncludeUpsell] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Calculate pricing
  const { items, total } = calculateTotal(productId, includeUpsell)
  const savings = upsell ? (upsell.standalone.price - upsell.addon.price).toFixed(2) : '0'
  
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(`/sign-in?redirect_url=/subscribe/${productId}`)
    }
  }, [isLoaded, isSignedIn, productId, router])
  
  // Invalid product
  if (!product) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>!</div>
          <h2 className={styles.title}>Product Not Found</h2>
          <p className={styles.subtitle}>The requested product doesn&apos;t exist.</p>
          <button onClick={() => router.push('/pricing')} className={styles.primaryButton}>
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
  
  if (!isLoaded || !isSignedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 className={styles.spinner} />
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={styles.container}>
      {/* Background elements */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />
      <div className={styles.bgGrid} />
      
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Sparkles size={14} />
            <span>3-Day Free Trial</span>
          </div>
          <h1 className={styles.mainTitle}>Complete Your Subscription</h1>
          <p className={styles.mainSubtitle}>
            Cancel anytime during your trial. No charge until day 4.
          </p>
        </div>
        
        <div className={styles.grid}>
          {/* Left: Product Selection */}
          <div className={styles.selectionCard}>
            <h2 className={styles.sectionTitle}>Your Plan</h2>
            
            {/* Primary Product */}
            <div className={styles.productCard}>
              <div className={styles.productHeader}>
                <div className={styles.productIcon}>
                  {productId === 'picks' ? <Zap size={24} /> : <Shield size={24} />}
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <p className={styles.productDesc}>{product.description}</p>
                </div>
                <div className={styles.productPrice}>
                  <span className={styles.priceAmount}>${product.standalone.price.toFixed(2)}</span>
                  <span className={styles.pricePeriod}>/month</span>
                </div>
              </div>
              
              <ul className={styles.featureList}>
                {product.features.map((feature, i) => (
                  <li key={i} className={styles.featureItem}>
                    <Check size={16} className={styles.featureCheck} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Upsell */}
            {upsell && (
              <div 
                className={`${styles.upsellCard} ${includeUpsell ? styles.upsellActive : ''}`}
                onClick={() => setIncludeUpsell(!includeUpsell)}
              >
                <div className={styles.upsellCheckbox}>
                  {includeUpsell && <Check size={16} />}
                </div>
                
                <div className={styles.upsellContent}>
                  <div className={styles.upsellHeader}>
                    <h4 className={styles.upsellName}>
                      Add {upsell.name}
                    </h4>
                    <div className={styles.upsellSavings}>
                      Save ${savings}
                    </div>
                  </div>
                  <p className={styles.upsellDesc}>{upsell.description}</p>
                  
                  <div className={styles.upsellPricing}>
                    <span className={styles.upsellOriginal}>
                      ${upsell.standalone.price.toFixed(2)}
                    </span>
                    <ChevronRight size={14} className={styles.upsellArrow} />
                    <span className={styles.upsellDiscounted}>
                      ${upsell.addon.price.toFixed(2)}/mo
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right: Summary & Checkout */}
          <div className={styles.summaryCard}>
            <h2 className={styles.sectionTitle}>Order Summary</h2>
            
            <div className={styles.summaryItems}>
              {items.map((item, i) => (
                <div key={i} className={styles.summaryItem}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className={styles.summaryDivider} />
            
            <div className={styles.summaryTotal}>
              <div className={styles.totalRow}>
                <span>Due today</span>
                <span className={styles.freeText}>$0.00</span>
              </div>
              <div className={styles.totalRowMain}>
                <span>After trial</span>
                <span className={styles.totalAmount}>${total.toFixed(2)}/mo</span>
              </div>
            </div>
            
            <div className={styles.trialNote}>
              <Shield size={16} />
              <span>Your card will be charged ${total.toFixed(2)} on day 4 unless you cancel</span>
            </div>
            
            {error && (
              <div className={styles.errorBox}>
                {error}
              </div>
            )}
            
            <button 
              className={styles.checkoutButton}
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className={styles.btnSpinner} />
                  Creating checkout...
                </>
              ) : (
                <>
                  Start Free Trial
                  <ChevronRight size={20} />
                </>
              )}
            </button>
            
            <p className={styles.guarantee}>
              Cancel anytime • No hidden fees • Secure checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

