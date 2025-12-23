'use client'

import styles from './games.module.css'

export default function GamesPage() {
  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Games</h1>
            </div>
            <p className={styles.subtitle}>Live games, odds, and betting data across all sports.</p>
          </div>
        </div>
      </header>
      
      {/* Content will go here */}
    </div>
  )
}

