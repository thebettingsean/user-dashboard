'use client'

import { useState } from 'react'
import { FaChevronDown, FaChevronUp, FaLock } from 'react-icons/fa'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '../../../../../../lib/hooks/useSubscription'
import GameLayout from '../components/GameLayout'
import styles from './dataTab.module.css'

export default function DataTabPage() {
  const { isSignedIn } = useUser()
  const { isSubscribed } = useSubscription()
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  
  const hasAccess = isSubscribed
  
  const toggleSection = (section: string) => {
    if (!hasAccess) return
    setExpandedSection(expandedSection === section ? null : section)
  }
  
  const sections = [
    {
      id: 'referee',
      title: 'Head official (Referee Name)',
      hasData: true
    },
    {
      id: 'teamBetting',
      title: 'Team Betting Data',
      hasData: true
    },
    {
      id: 'teamStats',
      title: 'Team Stats',
      hasData: true
    },
    {
      id: 'topProps',
      title: 'Top Player Props',
      hasData: true
    }
  ]
  
  return (
    <GameLayout>
      <div className={styles.dataContainer}>
        {sections.map((section) => (
          <div key={section.id} className={styles.section}>
            <button
              className={`${styles.sectionHeader} ${expandedSection === section.id ? styles.sectionHeaderActive : ''}`}
              onClick={() => toggleSection(section.id)}
              disabled={!hasAccess}
            >
              <span>{section.title}</span>
              <div className={styles.sectionHeaderRight}>
                {!hasAccess && <FaLock className={styles.lockIcon} />}
                {hasAccess && (expandedSection === section.id ? <FaChevronUp /> : <FaChevronDown />)}
              </div>
            </button>
            
            {hasAccess && expandedSection === section.id && (
              <div className={styles.sectionContent}>
                <p>Content for {section.title}</p>
                <p className={styles.placeholder}>
                  (We'll populate this with real data shortly)
                </p>
              </div>
            )}
            
            {!hasAccess && (
              <div className={styles.lockedOverlay}>
                <FaLock className={styles.lockIconLarge} />
                <p className={styles.lockMessage}>
                  {!isSignedIn ? 'Sign up to view' : 'Get subscription to view'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </GameLayout>
  )
}

