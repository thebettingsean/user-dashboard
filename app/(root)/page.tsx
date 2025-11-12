'use client'

import { useRouter } from 'next/navigation'
import styles from '../sportSelector.module.css'

export const metadata = {
  title: 'Select Your Sport | The Betting Insider',
  description: 'Access expert picks, AI game scripts, public betting data, and analytics for NFL, NBA, and more sports.'
}

export default function SportSelectorPage() {
  const router = useRouter()

  const sports = [
    {
      id: 'nfl',
      name: 'NFL',
      icon: '🏈',
      status: 'Live',
      enabled: true
    },
    {
      id: 'nba',
      name: 'NBA',
      icon: '🏀',
      status: 'Live',
      enabled: true
    },
    {
      id: 'nhl',
      name: 'NHL',
      icon: '🏒',
      status: 'Coming Soon',
      enabled: false
    },
    {
      id: 'mlb',
      name: 'MLB',
      icon: '⚾',
      status: 'Coming Soon',
      enabled: false
    },
    {
      id: 'ncaaf',
      name: 'College Football',
      icon: '🎓',
      status: 'Coming Soon',
      enabled: false
    },
    {
      id: 'ncaab',
      name: 'College Basketball',
      icon: '🎓',
      status: 'Coming Soon',
      enabled: false
    }
  ]

  const handleSportClick = (sportId: string, enabled: boolean) => {
    if (!enabled) return
    router.push(`/${sportId}/games`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Select Your Sport</h1>
        <p className={styles.subtitle}>
          Choose a sport to view games, picks, AI scripts, and betting data
        </p>
      </div>

      <div className={styles.sportGrid}>
        {sports.map((sport) => (
          <div
            key={sport.id}
            className={`${styles.sportCard} ${!sport.enabled ? styles.disabled : ''}`}
            onClick={() => handleSportClick(sport.id, sport.enabled)}
          >
            {!sport.enabled && (
              <div className={styles.comingSoonBadge}>Coming Soon</div>
            )}
            <span className={styles.sportIcon}>{sport.icon}</span>
            <h2 className={styles.sportName}>{sport.name}</h2>
            <p className={styles.sportStatus}>{sport.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

