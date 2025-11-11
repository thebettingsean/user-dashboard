'use client'

import React, { useEffect, useRef } from 'react'
import styles from './terms-of-service.module.css'

export default function TermsOfServicePage() {
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
              <span className={styles.heroTitleHighlight}>Terms of Service</span>
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
          Welcome to Insider Sports Inc. These Terms of Service ("Terms") govern your access to and use of our websites, applications, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms. If you do not agree, you may not access or use the Services.
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.2s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>1</span>
            <h2 className={styles.sectionTitle}>Services Provided</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>Insider Sports Inc provides digital products and services, including but not limited to:</p>
            <ul className={styles.policyList}>
              <li>Access to a proprietary Sports Data Suite (available at app.thebettinginsider.com)</li>
              <li>Expert sports betting insights, analysis, and projections</li>
              <li>Access to private online communities, including Discord channels</li>
            </ul>
            <p>Our Services are delivered online and require a stable internet connection. We reserve the right to modify, suspend, or discontinue any part of our Services at any time.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.3s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>2</span>
            <h2 className={styles.sectionTitle}>Account Registration and Responsibilities</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>You must create an account to access certain Services. By creating an account, you agree to:</p>
            <ul className={styles.policyList}>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your login credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p>Accounts are personal to the subscriber and may not be shared or transferred to others without our written consent.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.4s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>3</span>
            <h2 className={styles.sectionTitle}>Trial Period and Subscription Terms</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>We offer a trial period for all subscription products. By subscribing to our trial offer, you agree to the following terms:</p>
            
            <div className={styles.subSection}>
              <p className={styles.subSectionTitle}>Trial Period:</p>
              <p>All products include a 3-day trial period for $1.00. During this trial period, you will have full access to all features and services included in your selected subscription plan.</p>
            </div>

            <div className={styles.highlightBox}>
              <span className={styles.boldText}>Important Trial Terms:</span> After the full 3-day trial period ends, you will be automatically charged the full subscription price for your selected plan. This automatic billing will continue on a recurring basis (monthly or annually) until you cancel your subscription.
            </div>
            
            <div className={styles.subSection}>
              <p className={styles.subSectionTitle}>Recurring Billing:</p>
              <p>Following the trial period, subscription fees will be charged on a recurring basis (e.g., monthly or annually) as specified at checkout, until canceled.</p>
            </div>
            
            <div className={styles.subSection}>
              <p className={styles.subSectionTitle}>Automatic Renewal:</p>
              <p>Subscriptions automatically renew unless canceled prior to the end of the trial period or next billing cycle.</p>
            </div>
            
            <div className={styles.subSection}>
              <p className={styles.subSectionTitle}>Cancellation:</p>
              <p>You can cancel at any time during the trial period or thereafter through your account settings on thebettinginsider.com. Cancellations made during the trial period will prevent automatic billing. Cancellations made after the trial period will take effect at the end of the current billing period.</p>
            </div>
            
            <p>Failure to pay subscription fees may result in suspension or termination of your access to Services. <span className={styles.boldText}>We do not offer refunds for users who forget to cancel their subscription or who claim to be unaware of the automatic renewal terms, as these terms are clearly disclosed during the subscription process.</span></p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.5s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>4</span>
            <h2 className={styles.sectionTitle}>Refund Policy</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>All purchases are non-refundable once product access has been granted. Exceptions may be made solely at our discretion in cases where services were not properly delivered. Please review our Refund Policy for more details.</p>
            <p><span className={styles.boldText}>Trial Period Refunds:</span> Refunds will not be provided for users who forget to cancel during the trial period or claim to be unaware of the automatic renewal terms.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.6s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>5</span>
            <h2 className={styles.sectionTitle}>User Conduct</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>You agree not to:</p>
            <ul className={styles.policyList}>
              <li>Engage in any unauthorized resale, redistribution, or sharing of our Services</li>
              <li>Reverse engineer, decompile, or otherwise attempt to access or replicate our proprietary systems</li>
              <li>Upload, transmit, or distribute any malicious software or material that could harm our Services or other users</li>
              <li>Use the Services for any illegal or unauthorized purpose</li>
            </ul>
            <p>Violation of these rules may result in immediate suspension or termination of your account without refund.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.7s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>6</span>
            <h2 className={styles.sectionTitle}>Intellectual Property Rights</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>All content, materials, trademarks, and services provided through Insider Sports Inc are owned by or licensed to us and are protected by copyright, trademark, and other intellectual property laws.</p>
            <p>You may not use, reproduce, distribute, or create derivative works based on our content without our express prior written permission.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.8s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>7</span>
            <h2 className={styles.sectionTitle}>Third-Party Services and Integrations</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>Our Services may integrate with third-party platforms such as Stripe for payments and Discord for community access. We are not responsible for the practices, content, or availability of any third-party services. Your use of third-party platforms is subject to their separate terms and policies.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '0.9s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>8</span>
            <h2 className={styles.sectionTitle}>Disclaimers and Limitation of Liability</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>Our Services are provided on an "as-is" and "as-available" basis. We make no warranties regarding the accuracy, completeness, or reliability of any content. Insider Sports Inc shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use or inability to use the Services.</p>
            <div className={styles.highlightBox}>
              <span className={styles.boldText}>Important:</span> All sports betting involves risk, and our data and projections are informational only. Users are solely responsible for their betting decisions.
            </div>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '1.0s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>9</span>
            <h2 className={styles.sectionTitle}>Termination</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>We reserve the right to suspend or terminate your access to Services at any time, without notice, for conduct that we believe violates these Terms, applicable law, or is harmful to other users or the Company. Upon termination, your right to use the Services will immediately cease, and we may delete any information associated with your account.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '1.1s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>10</span>
            <h2 className={styles.sectionTitle}>Modifications to the Terms</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>We may update these Terms from time to time. When we do, we will revise the "Effective Date" at the top of this page. It is your responsibility to review the Terms periodically. Continued use of the Services after changes are posted constitutes acceptance of the updated Terms.</p>
          </div>
        </div>

        <div className={styles.policySection} style={{ animationDelay: '1.2s' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>11</span>
            <h2 className={styles.sectionTitle}>Governing Law</h2>
          </div>
          <div className={styles.sectionContent}>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, without regard to conflict of law principles.</p>
          </div>
        </div>

        <div className={styles.contactSection} style={{ animationDelay: '1.3s' }}>
          <h2 className={styles.sectionTitle}>Contact Information</h2>
          <div className={styles.contactContent}>
            <p>If you have any questions about these Terms or our Services, please contact us at:</p>
            <p style={{ marginTop: '0.5rem' }}>
              <a href="https://www.thebettinginsider.com/contact-us" className={styles.contactEmail}>
                home@thebettinginsider.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

