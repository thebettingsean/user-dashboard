'use client'

import React from 'react'
import styles from './roi-calculator.module.css'
import ROICalculator from './ROICalculator'

export default function ROICalculatorPage() {
  return (
    <div className={styles.calculatorWrapper}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div 
          className={styles.heroGradientLine} 
          data-direction="left" 
          data-position="high"
          style={{ 
            animationDelay: '0s, 0s, 0s',
            animationDuration: '3s, 25s, 25s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="right" 
          data-position="high"
          style={{ 
            animationDelay: '15s, 15s, 15s',
            animationDuration: '3s, 28s, 28s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="left" 
          data-position="mid"
          style={{ 
            animationDelay: '8s, 8s, 8s',
            animationDuration: '3s, 30s, 30s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="right" 
          data-position="mid"
          style={{ 
            animationDelay: '22s, 22s, 22s',
            animationDuration: '3s, 27s, 27s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="left" 
          data-position="low"
          style={{ 
            animationDelay: '12s, 12s, 12s',
            animationDuration: '3s, 26s, 26s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="right" 
          data-position="low"
          style={{ 
            animationDelay: '18s, 18s, 18s',
            animationDuration: '3s, 29s, 29s'
          } as React.CSSProperties}
        ></div>
        <div className={styles.heroContainer}>
          <div className={styles.heroHeader}>
            <span className={styles.heroLabel}>the betting insiders</span>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleHighlight}>ROI Calculator</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Calculate your potential returns with compound growth. See how disciplined bankroll management can turn consistent wins into significant profits.
            </p>
            <div className={styles.bankrollBuilderCta}>
              <p className={styles.ctaText}>Don't have a bankroll?</p>
              <a href="https://www.thebettinginsider.com/tools/bankroll-builder" className={styles.ctaButton}>
                Take our Bankroll Builder!
              </a>
            </div>
          </div>
        </div>
      </section>

      <ROICalculator />
    </div>
  )
}

