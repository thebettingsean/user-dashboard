'use client'

import React, { useEffect, useRef } from 'react'
import styles from './contact.module.css'

export default function ContactPage() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const supportInfoRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add(styles.animate)
              observer.unobserve(entry.target)
            }, index * 100)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const cards = cardRefs.current.filter(Boolean)
    cards.forEach((card) => {
      if (card) observer.observe(card)
    })

    if (supportInfoRef.current) observer.observe(supportInfoRef.current)

    return () => {
      cards.forEach((card) => {
        if (card) observer.unobserve(card)
      })
      if (supportInfoRef.current) observer.unobserve(supportInfoRef.current)
    }
  }, [])

  return (
    <div className={styles.contactWrapper}>
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
            <span className={styles.heroLabel}>Get in Touch</span>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleHighlight}>Contact Us</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Have questions about our picks or interested in partnering with us? We&apos;re here to help. Our team typically responds within 24 hours during business days.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Cards Section */}
      <div className={styles.contactGrid}>
        <div 
          ref={(el) => { cardRefs.current[0] = el }}
          className={styles.contactCard}
        >
          <div className={styles.cardIcon}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22,6 12,13 2,6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h2 className={styles.cardTitle}>General Support</h2>
          
          <a href="mailto:support@thebettinginsider.com" className={styles.emailAddress}>
            support@thebettinginsider.com
          </a>
          
          <p className={styles.cardDescription}>
            Questions about our picks, subscription issues, or need technical support? We&apos;re here to help.
          </p>
        </div>

        <div 
          ref={(el) => { cardRefs.current[1] = el }}
          className={styles.contactCard}
        >
          <div className={`${styles.cardIcon} ${styles.partnersIcon}`}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h2 className={styles.cardTitle}>Partnership Inquiries</h2>
          
          <a href="mailto:partners@thebettinginsider.com" className={`${styles.emailAddress} ${styles.partnersEmail}`}>
            partners@thebettinginsider.com
          </a>
          
          <p className={styles.cardDescription}>
            Interested in collaborating? Looking to partner with us? Let&apos;s discuss how we can work together.
          </p>
        </div>
      </div>

      {/* Support Info Section */}
      <section ref={supportInfoRef} className={styles.supportSection}>
        <div className={styles.supportCard}>
          <h3 className={styles.supportTitle}>Response Time</h3>
          <div className={styles.responseTime}>
            <span className={styles.responseTimeLabel}>Average response time:</span>
            <span className={styles.responseTimeValue}>12-24 hours</span>
          </div>
          <p className={styles.supportText}>
            We typically respond within 24 hours during business days. For urgent matters, please indicate &quot;URGENT&quot; in your subject line.
          </p>
        </div>
      </section>
    </div>
  )
}

