'use client'

import React, { useEffect, useRef } from 'react'
import styles from './privacy-policy.module.css'

export default function PrivacyPolicyPage() {
  const sectionsRef = useRef<HTMLDivElement>(null)

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

    const sections = sectionsRef.current?.querySelectorAll(`.${styles.policySection}`)
    sections?.forEach((section) => {
      observer.observe(section)
    })

    return () => {
      sections?.forEach((section) => observer.unobserve(section))
    }
  }, [])

  return (
    <div className={styles.policyWrapper}>
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
            <span className={styles.heroLabel}>Legal Information</span>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleHighlight}>Privacy Policy</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Effective Date: December 31st, 2024
            </p>
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <div ref={sectionsRef} className={styles.policyContainer}>
        <div className={styles.policyIntro}>
          <p className={styles.introContent}>
            Insider Sports Inc values your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you access our website, applications, and services.
          </p>
        </div>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>1.</span> Information We Collect
          </h2>
          <div className={styles.sectionContent}>
            <p>When you use our services, we may collect the following types of information:</p>
            <div className={styles.infoGroup}>
              <p className={styles.infoItem}>
                <strong className={styles.highlightText}>Personal Information:</strong> Name, email address, and billing information when you create an account or subscribe.
              </p>
              <p className={styles.infoItem}>
                <strong className={styles.highlightText}>Account Information:</strong> Username, password, and account preferences.
              </p>
              <p className={styles.infoItem}>
                <strong className={styles.highlightText}>Technical Information:</strong> IP address, browser type, device information, and usage data through cookies and analytics tools.
              </p>
              <p className={styles.infoItem}>
                <strong className={styles.highlightText}>Third-Party Integrations:</strong> If you choose to connect your Discord account, we collect limited information necessary to assign you access roles within our community.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>2.</span> How We Use Your Information
          </h2>
          <div className={styles.sectionContent}>
            <p>We use your information to:</p>
            <ul className={styles.policyList}>
              <li>Process transactions and manage subscriptions</li>
              <li>Provide access to purchased services and digital content</li>
              <li>Send transactional and service-related emails (such as access instructions, updates, and receipts)</li>
              <li>Improve our website, services, and customer experience</li>
              <li>Communicate with you about your account, subscriptions, or support inquiries</li>
            </ul>
          </div>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>3.</span> Sharing of Information
          </h2>
          <div className={styles.sectionContent}>
            <p>We do not sell, rent, or trade your personal information to third parties.</p>
            <p>We may share data with trusted service providers (such as Stripe for payment processing and Clerk for account management) solely for the purpose of delivering services and maintaining operations.</p>
          </div>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>4.</span> Data Security
          </h2>
          <div className={styles.sectionContent}>
            <p>We implement reasonable administrative, technical, and physical safeguards to protect your information. While we strive to protect your personal data, no method of transmission over the internet or electronic storage is 100% secure.</p>
          </div>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>5.</span> Cookies and Tracking Technologies
          </h2>
          <div className={styles.sectionContent}>
            <p>We use cookies and similar technologies to enhance user experience, understand website traffic, and improve our services. You can adjust your browser settings to refuse cookies, but some features of our services may not function properly without them.</p>
          </div>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>6.</span> Your Rights
          </h2>
          <div className={styles.sectionContent}>
            <p>Depending on your location, you may have rights regarding your personal information, including access, correction, deletion, and the ability to opt-out of certain communications.</p>
          </div>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>7.</span> Third-Party Links
          </h2>
          <div className={styles.sectionContent}>
            <p>Our services may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties.</p>
          </div>
        </section>

        <section className={styles.policySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionNumber}>8.</span> Changes to this Privacy Policy
          </h2>
          <div className={styles.sectionContent}>
            <p>We reserve the right to update or modify this Privacy Policy at any time. Changes will be posted on this page, and continued use of our services constitutes acceptance of the revised policy.</p>
          </div>
        </section>

        <section className={`${styles.policySection} ${styles.contactSection}`}>
          <h2 className={styles.sectionTitle}>Contact Us</h2>
          <div className={styles.contactContent}>
            <p>If you have any questions about this Privacy Policy or how your information is handled, please contact us at:</p>
            <p style={{ marginTop: '0.5rem' }}>
              <a href="https://www.thebettinginsider.com/contact" className={styles.contactEmail}>
                support@thebettinginsider.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

