'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { GiSupersonicArrow, GiCash } from 'react-icons/gi'
import { FiCheck, FiArrowRight } from 'react-icons/fi'
import styles from './success.module.css'

function SubscriptionSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get the primary product that was purchased
  const product = searchParams.get('product') || 'picks'
  
  // Determine redirect based on product
  const redirectPath = product === 'publicBetting' ? '/public-betting' : '/picks'
  const ProductIcon = product === 'publicBetting' ? GiCash : GiSupersonicArrow
  
  // Features based on product
  const features = product === 'publicBetting' 
    ? [
        'Public betting splits from 150+ sportsbooks',
        'Line movement tracking',
        'Market indicators (Public/Vegas/Whale)',
        'All sports, all seasons'
      ]
    : [
        'Daily expert picks across all sports',
        'Detailed analysis and write-ups',
        'Full analyst history and stats',
        'Discord alerts for live picks'
      ]

  // Dynamic heading based on product
  const heading = product === 'publicBetting' 
    ? 'You now have access to public betting data'
    : 'You now have access to our best bets'

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      <div className={styles.content}>
        {/* Success Icon */}
        <div className={styles.successIcon}>
          <ProductIcon />
        </div>

        {/* Main Heading */}
        <h1 className={styles.title}>{heading}</h1>

        {/* Tagline */}
        <p className={styles.subtitle}>
          Your 3-day free trial has started
        </p>

        {/* Features Card */}
        <div className={styles.featuresCard}>
          <span className={styles.featuresLabel}>What's included:</span>
          
          <div className={styles.featuresList}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureItem}>
                <FiCheck className={styles.featureCheck} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Text */}
        <p className={styles.motivational}>
          You're about to make some serious profit.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => router.push(redirectPath)}
          className={styles.ctaButton}
        >
          {product === 'publicBetting' ? 'View Public Betting' : 'View Today\'s Picks'}
          <FiArrowRight className={styles.ctaIcon} />
        </button>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  )
}
