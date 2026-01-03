'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  FiChevronRight,
  FiExternalLink 
} from 'react-icons/fi'
import { 
  IoCalculatorOutline, 
  IoBookOutline,
  IoWalletOutline,
  IoTrophyOutline
} from 'react-icons/io5'
import { GiAmericanFootballHelmet, GiAmericanFootballBall } from 'react-icons/gi'
import { BsBuildingCheck } from 'react-icons/bs'
import { TbTargetArrow } from 'react-icons/tb'
import styles from './tools.module.css'

type Tool = {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  href: string
  isExternal?: boolean
  badge?: string
}

// Tools by category
const ALL_TOOLS: Tool[] = [
  {
    id: 'sportsbooks',
    name: 'Top Sportsbooks',
    description: 'Compare and find the best sportsbook bonuses in your state',
    icon: <BsBuildingCheck size={22} />,
    href: '/sportsbooks'
  },
  {
    id: 'simulator',
    name: 'Parlay Simulator',
    description: 'Test your parlay strategies with historical data',
    icon: <TbTargetArrow size={22} />,
    href: '/simulator'
  },
  {
    id: 'roi-calculator',
    name: 'ROI Calculator',
    description: 'Calculate your return on investment for any bet',
    icon: <IoCalculatorOutline size={22} />,
    href: '/roi-calculator'
  },
  {
    id: 'betting-guide',
    name: 'Betting Guide',
    description: 'Learn betting strategies, terminology, and best practices',
    icon: <IoBookOutline size={22} />,
    href: '/faq'
  },
  {
    id: 'bankroll-builder',
    name: 'Bankroll Builder',
    description: 'Track and grow your bankroll with smart bet sizing',
    icon: <IoWalletOutline size={22} />,
    href: '/builder'
  }
]

const NFL_TOOLS: Tool[] = [
  {
    id: 'fantasy',
    name: 'Fantasy Football',
    description: 'Rankings, projections, and start/sit advice',
    icon: <IoTrophyOutline size={22} />,
    href: '/fantasy',
    badge: 'End of Season'
  },
  {
    id: 'anytime-tds',
    name: 'Anytime TD Scorer',
    description: 'Find the best anytime touchdown prop values',
    icon: <GiAmericanFootballBall size={22} />,
    href: '/anytime-tds'
  }
]

export default function ToolsPage() {
  const [selectedSport, setSelectedSport] = useState<string>('all')

  const getToolsForSport = (): Tool[] => {
    switch (selectedSport) {
      case 'all':
        return ALL_TOOLS
      case 'nfl':
        return NFL_TOOLS
      default:
        return []
    }
  }

  const tools = getToolsForSport()
  const showComingSoon = ['nba', 'nhl', 'cfb', 'cbb'].includes(selectedSport)

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Free Tools</h1>
            </div>
            <p className={styles.subtitle}>
              Calculators, guides, and resources to help you bet smarter.
            </p>
          </div>
        </div>
        
        {/* Filters Row */}
        <div className={styles.filtersRow}>
          <div className={styles.leftFilters}>
            <div className={styles.sportFilters}>
              {['all', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'].map(sport => (
                <button
                  key={sport}
                  className={`${styles.filterBtn} ${selectedSport === sport ? styles.active : ''}`}
                  onClick={() => setSelectedSport(sport)}
                >
                  {sport === 'all' ? 'All' : sport.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      
      {/* Content Section */}
      <div className={styles.contentSection}>
        {/* Tools Grid */}
        {!showComingSoon && tools.length > 0 && (
          <div className={styles.toolsGrid}>
            {tools.map(tool => (
              <Link 
                key={tool.id} 
                href={tool.href}
                className={styles.toolCard}
                {...(tool.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <div className={styles.toolIconWrapper}>
                  {tool.icon}
                </div>
                <div className={styles.toolContent}>
                  <div className={styles.toolHeader}>
                    <h3 className={styles.toolName}>{tool.name}</h3>
                    {tool.badge && (
                      <span className={styles.toolBadge}>{tool.badge}</span>
                    )}
                  </div>
                  <p className={styles.toolDescription}>{tool.description}</p>
                </div>
                <div className={styles.toolArrow}>
                  {tool.isExternal ? <FiExternalLink size={16} /> : <FiChevronRight size={18} />}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Coming Soon State */}
        {showComingSoon && (
          <div className={styles.comingSoonCard}>
            <div className={styles.comingSoonIcon}>
              <GiAmericanFootballHelmet size={40} />
            </div>
            <h3 className={styles.comingSoonTitle}>More tools coming soon</h3>
            <p className={styles.comingSoonSubtitle}>
              Check out our other pages for {selectedSport.toUpperCase()}-specific data
            </p>
            <div className={styles.comingSoonLinks}>
              <Link href="/games" className={styles.comingSoonLink}>
                View Games <FiChevronRight size={14} />
              </Link>
              <Link href="/picks" className={styles.comingSoonLink}>
                View Picks <FiChevronRight size={14} />
              </Link>
              <Link href="/public-betting" className={styles.comingSoonLink}>
                View Public Betting <FiChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

