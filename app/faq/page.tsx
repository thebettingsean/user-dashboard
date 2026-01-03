'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft } from 'react-icons/fa'
import styles from './faq.module.css'
import FAQ from './FAQ'

export default function FAQPage() {
  const router = useRouter()
  
  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Back Button */}
      <button onClick={() => router.push('/')} className={styles.backButton}>
        <FaArrowLeft /> Back to Dashboard
      </button>
      
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.badge}>Support</span>
        <h1 className={styles.title}>Frequently Asked Questions</h1>
        <p className={styles.subtitle}>
          Everything you need to know about our packages and how we help you win
        </p>
      </header>

      <FAQ />
    </div>
  )
}
