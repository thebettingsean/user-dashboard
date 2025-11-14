'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BsClipboard2Data } from "react-icons/bs"
import { IoTicketOutline } from "react-icons/io5"
import { GiSelect } from "react-icons/gi"
import styles from './sportSelector.module.css'

type TabKey = 'games' | 'picks' | 'scripts' | 'public'
type SubFilterKey = 'scriptsAbout' | 'publicAbout'

const tabLabels: Record<TabKey, string> = {
  games: 'Games',
  picks: 'Picks',
  scripts: 'Scripts',
  public: 'Public'
}

const subFilters: Record<TabKey, SubFilterKey[]> = {
  games: [],
  picks: [],
  scripts: ['scriptsAbout'],
  public: ['publicAbout']
}

const sportOptions = [
  { id: 'nfl', label: 'NFL', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png', status: 'active' },
  { id: 'nba', label: 'NBA', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png', status: 'active' },
  { id: 'nhl', label: 'NHL', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png', status: 'inactive' },
  { id: 'mlb', label: 'MLB', logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png', status: 'inactive' }
]

export default function SportsSelectorPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('games')
  const [activeFilter, setActiveFilter] = useState<SubFilterKey | undefined>(undefined)
  const [isSportMenuOpen, setIsSportMenuOpen] = useState(false)
  const sportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sportMenuRef.current && !sportMenuRef.current.contains(event.target as Node)) {
        setIsSportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTabSelect = (tab: TabKey) => {
    setActiveTab(tab)
    const filters = subFilters[tab]
    if (filters.length > 0) {
      setActiveFilter(filters[0])
    } else {
      setActiveFilter(undefined)
    }
  }

  const handleSportSelect = (sportId: string) => {
    const tabRoutes: Record<TabKey, string> = {
      games: 'games',
      picks: 'picks',
      scripts: 'ai-scripts',
      public: 'public-betting'
    }
    const route = tabRoutes[activeTab]
    router.push(`/sports/${sportId}/${route}`)
  }

  const renderAboutScripts = () => {
    return (
      <div className={styles.aboutInline}>
        <div className={styles.aboutInlineHeader}>About AI Game Scripts</div>
        <div className={styles.aboutInlineContent}>
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            Our AI-powered game scripts combine multiple data sources into comprehensive game analysis:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem', lineHeight: '1.8' }}>
            <li><strong>Analyst data:</strong> Narratives and picks from our top analysts</li>
            <li><strong>Detailed team stats:</strong> Key offensive and defensive metrics</li>
            <li><strong>Public betting trends:</strong> Where the money is flowing</li>
            <li><strong>Historical matchups:</strong> Head-to-head performance data</li>
          </ul>
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            Powered by <strong>Claude</strong>, best at math and reasoning, our scripts analyze all available data 
            to generate actionable insights you won't find anywhere else.
          </p>
          <p style={{ lineHeight: '1.6' }}>
            <strong>Script Strength</strong> indicates how confident our AI is based on data quality, analyst 
            consensus, and statistical edges. Higher strength means more compelling betting angles have been identified.
          </p>
        </div>
      </div>
    )
  }

  const renderAboutPublic = () => {
    return (
      <div className={styles.aboutInline}>
        <div className={styles.aboutInlineHeader}>About Public Betting Data</div>
        <div className={styles.aboutInlineContent}>
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            Track where recreational and sharp bettors are placing their money:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem', lineHeight: '1.8' }}>
            <li><strong>Most Public:</strong> Games with the highest public betting percentages</li>
            <li><strong>Vegas Backed:</strong> Lines the sportsbooks are most confident in</li>
            <li><strong>Big Money:</strong> Games with significant differences between bet count and money percentages (sharp action)</li>
          </ul>
          <p style={{ lineHeight: '1.6' }}>
            Understanding public betting patterns helps you identify value and avoid popular traps. When money 
            percentage significantly exceeds bet percentage, it indicates larger bets from sharper bettors.
          </p>
        </div>
      </div>
    )
  }

  const renderSelectSportMessage = (message: string, icon: React.ReactNode) => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1.5rem',
          color: 'rgba(255, 255, 255, 0.3)'
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: '1.25rem',
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: 600,
          marginBottom: '0.5rem'
        }}>
          {message}
        </div>
        <div style={{
          fontSize: '1rem',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          Select a sport from the dropdown above
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (activeFilter === 'scriptsAbout') {
      return renderAboutScripts()
    }
    if (activeFilter === 'publicAbout') {
      return renderAboutPublic()
    }

    const messages: Record<TabKey, string> = {
      games: 'Select a sport to get game data for today',
      picks: 'Select a sport to get picks for today',
      scripts: 'Select a sport to get game scripts for today',
      public: 'Select a sport to get public betting data for today'
    }

    const icons: Record<TabKey, React.ReactNode> = {
      games: <BsClipboard2Data />,
      picks: <IoTicketOutline />,
      scripts: <BsClipboard2Data />,
      public: <BsClipboard2Data />
    }

    return renderSelectSportMessage(messages[activeTab], icons[activeTab])
  }

  const availableFilters = subFilters[activeTab] ?? []
  const filterLabels: Record<SubFilterKey, string> = {
    scriptsAbout: 'About',
    publicAbout: 'About'
  }

  return (
    <div className={`${styles.page} sportsSelectorPage`}>
      <div className={styles.topBar}>
        <div className={styles.sportPicker} ref={sportMenuRef}>
          <button
            type="button"
            className={styles.sportChip}
            onClick={() => setIsSportMenuOpen((prev) => !prev)}
          >
            <GiSelect style={{ color: 'white', fontSize: '1.25rem' }} />
          </button>
          {isSportMenuOpen && (
            <div className={styles.sportDropdown}>
              {sportOptions.map((option) => {
                const isDisabled = option.status !== 'active'
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.sportOption} ${isDisabled ? styles.sportOptionDisabled : ''}`}
                    onClick={() => {
                      if (isDisabled) return
                      handleSportSelect(option.id)
                      setIsSportMenuOpen(false)
                    }}
                    disabled={isDisabled}
                  >
                    <img src={option.logo} alt={option.label} className={styles.sportOptionLogo} />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className={styles.creditPill}>Credits: 12</div>
      </div>

      <nav className={styles.tabBar}>
        {Object.entries(tabLabels).map(([key, label]) => {
          const typedKey = key as TabKey
          return (
            <button
              key={key}
              className={`${styles.tabButton} ${activeTab === typedKey ? styles.tabButtonActive : ''}`}
              onClick={() => handleTabSelect(typedKey)}
            >
              {label.toUpperCase()}
            </button>
          )
        })}
      </nav>

      {availableFilters.length > 0 && (
        <div className={styles.subFilterBar}>
          {availableFilters.map((filter) => (
            <button
              key={filter}
              className={`${styles.subFilterButton} ${activeFilter === filter ? styles.subFilterButtonActive : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
      )}

      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  )
}

