'use client'

import Link from 'next/link'
import { FiMessageCircle, FiHelpCircle, FiUsers, FiZap } from 'react-icons/fi'
import { IoPhonePortraitOutline } from 'react-icons/io5'
import styles from './contact.module.css'

const PHONE_NUMBER = '(470) 751-8564'

export default function ContactPage() {
  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Contact Us</h1>
            </div>
            <p className={styles.subtitle}>
              Have questions or feedback? Text us directly - we typically respond within a few hours.
            </p>
          </div>
        </div>
      </header>

      {/* Contact Cards */}
      <div className={styles.cardsContainer}>
        
        {/* Support */}
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>
            <FiHelpCircle size={22} />
          </div>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>Support</h2>
            <p className={styles.cardDescription}>
              Product questions, subscription help, or technical issues.
            </p>
            <div className={styles.textAction}>
              <span className={styles.textLabel}>Text "Support" to:</span>
              <a href={`sms:+14707518564?body=Support`} className={styles.phoneLink}>
                <IoPhonePortraitOutline size={16} />
                {PHONE_NUMBER}
              </a>
            </div>
          </div>
        </div>

        {/* Partner */}
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>
            <FiUsers size={22} />
          </div>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>Partner</h2>
            <p className={styles.cardDescription}>
              Interested in collaborating? Let us know if you want to work together!
            </p>
            <div className={styles.textAction}>
              <span className={styles.textLabel}>Text "Partner" to:</span>
              <a href={`sms:+14707518564?body=Partner`} className={styles.phoneLink}>
                <IoPhonePortraitOutline size={16} />
                {PHONE_NUMBER}
              </a>
            </div>
          </div>
        </div>

        {/* Ideas */}
        <div className={styles.contactCard}>
          <div className={styles.cardIcon}>
            <FiZap size={22} />
          </div>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>Ideas</h2>
            <p className={styles.cardDescription}>
              Help us build cool stuff! Share feature requests or suggestions.
            </p>
            <div className={styles.textAction}>
              <span className={styles.textLabel}>Text "Ideas" to:</span>
              <a href={`sms:+14707518564?body=Ideas`} className={styles.phoneLink}>
                <IoPhonePortraitOutline size={16} />
                {PHONE_NUMBER}
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Response Info */}
      <div className={styles.infoSection}>
        <div className={styles.infoBox}>
          <FiMessageCircle size={18} />
          <div className={styles.infoContent}>
            <span className={styles.infoTitle}>Quick Response</span>
            <span className={styles.infoText}>We typically respond within a few hours during business days.</span>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <Link href="/" className={styles.backButton}>
        ← Back to Dashboard
      </Link>
    </div>
  )
}
