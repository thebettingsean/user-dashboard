'use client'

import React, { useEffect, useRef } from 'react'
import styles from './refund-policy.module.css'

export default function RefundPolicyPage() {
  const sectionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.animate)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const sections = sectionsRef.current?.querySelectorAll(`.${styles.policySection}`)
    sections?.forEach((section) => {
      observer.observe(section)
    })

    const contactSection = sectionsRef.current?.querySelector(`.${styles.contactSection}`)
    if (contactSection) {
      observer.observe(contactSection)
    }

    return () => {
      sections?.forEach((section) => observer.unobserve(section))
      if (contactSection) observer.unobserve(contactSection)
    }
  }, [])

  return (
    <div className={styles.policyWrapper}>
      {/* Gradient Lines Background */}
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

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroHeader}>
            <span className={styles.heroLabel}>Legal Information</span>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleHighlight}>Refund Policy</span>
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
          At Insider Sports Inc, customer satisfaction and clarity are top priorities. This Refund Policy outlines the circumstances under which refunds may be issued for subscriptions and digital services purchased through our platform, including our trial period offerings.
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.2s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>1</span>
            <h2 className={styles.sectionTitle}>General Policy</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>All purchases made through Insider Sports Inc are for digital products and services that are <span className={styles.boldText}>delivered immediately</span> upon payment confirmation. Because access is granted instantly — including access to the Sports Data Suite, betting projections, and premium Discord content — <span className={styles.boldText}>all sales are final and non-refundable</span> once services are activated.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.3s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>2</span>
            <h2 className={styles.sectionTitle}>Trial Period Policy</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>We offer a 3-day trial period for $1.00 on all subscription products. The following terms apply to our trial period:</p>
            <ul className={styles.policyList}>
              <li>Trial subscriptions provide full access to all features and services for 3 complete days</li>
              <li>After the 3-day trial period ends, you will be automatically charged the full subscription price</li>
              <li>You must cancel before the trial period expires to avoid being charged the full subscription fee</li>
            </ul>
            <div className={styles.warningBox}>
              <span className={styles.boldText}>Important Notice:</span> We do NOT offer refunds for users who forget to cancel their subscription during the trial period or who claim to be unaware of the automatic renewal terms. These terms are clearly disclosed during the subscription process, and it is your responsibility to cancel before the trial period expires if you do not wish to continue.
            </div>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.4s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>3</span>
            <h2 className={styles.sectionTitle}>Exceptional Circumstances for Refunds</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>While all sales are final, we recognize that exceptional cases may occur. Refunds may be considered on a <span className={styles.boldText}>case-by-case basis</span> under the following conditions:</p>
            <ul className={styles.policyList}>
              <li>A customer did not receive access to the purchased service due to a confirmed technical issue on our end</li>
              <li>A double payment or duplicate subscription charge occurred due to a billing error</li>
              <li>Unauthorized charges proven to result from a Stripe processing error or platform glitch</li>
            </ul>
            <div className={styles.highlightBox}>
              <span className={styles.boldText}>Important:</span> Customers must submit refund requests in writing to <a href="https://www.thebettinginsider.com/contact-us" className={styles.contactEmail}>home@thebettinginsider.com</a> within 7 calendar days of the original purchase date. Requests submitted beyond 7 days will not be eligible for review.
            </div>
            <p>We reserve the right to deny refund requests that do not meet these criteria.</p>
            <p><span className={styles.boldText}>Trial Period Exclusions:</span> Refund requests based on forgetting to cancel during the trial period, being unaware of renewal terms, or similar circumstances will be automatically denied.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.5s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>4</span>
            <h2 className={styles.sectionTitle}>Technical Issues</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>In cases where technical issues prevent a customer from accessing purchased content:</p>
            <ul className={styles.policyList}>
              <li>Customers must first contact Insider Sports Inc support at <a href="https://www.thebettinginsider.com/contact-us" className={styles.contactEmail}>home@thebettinginsider.com</a> to allow reasonable opportunity to resolve the issue</li>
              <li>If the issue cannot be resolved within 5 business days, a partial or full refund may be offered at our discretion</li>
            </ul>
            <p><span className={styles.highlightText}>Note:</span> Failure to use provided services (e.g., failure to connect Discord, failure to open daily emails) does not constitute grounds for a refund if access was properly granted.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.6s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>5</span>
            <h2 className={styles.sectionTitle}>Subscription Cancellation Policy</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>Subscribers can cancel their plans at any time through their account management page at thebettinginsider.com.</p>
            <div className={styles.highlightBox}>
              <span className={styles.boldText}>Trial Period Cancellations:</span> Cancellations made during the 3-day trial period will prevent automatic billing of the full subscription price. Cancellations made after the trial period will apply to future billing cycles only and do not trigger refunds for the current billing cycle.
            </div>
            <p>It is the subscriber's responsibility to manage and cancel subscriptions in advance of renewal dates. We strongly recommend setting personal reminders if you wish to cancel during the trial period.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.7s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>6</span>
            <h2 className={styles.sectionTitle}>Chargebacks and Disputes</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>Filing a chargeback or dispute with your bank or credit card provider without first contacting Insider Sports Inc for resolution may result in immediate account suspension and denial of any refund eligibility.</p>
            <p>We encourage customers to work directly with our support team to resolve any concerns before initiating formal disputes.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.8s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>7</span>
            <h2 className={styles.sectionTitle}>Modification of this Policy</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>We reserve the right to amend this Refund Policy at any time. Updates will be posted on this page with a new effective date. Continued use of our services after changes are posted constitutes acceptance of the revised policy.</p>
          </div>
        </div>

        <div className={styles.contactSection} style={{ animationDelay: '0.9s' }}>
          <h2 className={styles.sectionTitle}>Contact Us</h2>
          <div className={styles.contactContent}>
            <p>For any questions regarding refunds, cancellations, or billing concerns, please contact us at:</p>
            <p style={{ marginTop: '0.5rem' }}>
              <a href="https://www.thebettinginsider.com/contact-us" className={styles.contactEmail}>
                support@thebettinginsider.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}







