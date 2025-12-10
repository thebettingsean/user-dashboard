'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import styles from './my-builds.module.css'
import { FiTrash2, FiPlay, FiCalendar, FiClock, FiChevronRight } from 'react-icons/fi'
import { IoMdTrendingUp } from 'react-icons/io'
import { PiFootballHelmetDuotone } from 'react-icons/pi'
import { GiWhistle } from 'react-icons/gi'
import { TbTargetArrow } from 'react-icons/tb'

interface LastResultSummary {
  hits: number
  misses: number
  hit_rate: number
  total_games: number
  roi?: number
}

interface SavedQuery {
  id: string
  name: string
  description?: string
  query_config: any
  created_at: string
  updated_at?: string
  sport: string
  last_result_summary?: LastResultSummary
  run_count?: number
}

export default function MyBuildsPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [builds, setBuilds] = useState<SavedQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      fetchBuilds()
    } else if (isLoaded && !user) {
      setLoading(false)
    }
  }, [isLoaded, user])

  const fetchBuilds = async () => {
    try {
      const response = await fetch('/api/saved-queries')
      if (response.ok) {
        const data = await response.json()
        setBuilds(data.queries || [])
      }
    } catch (error) {
      console.error('Failed to fetch builds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this build?')) return
    
    setDeleting(id)
    try {
      const response = await fetch(`/api/saved-queries?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setBuilds(builds.filter(b => b.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete build:', error)
    } finally {
      setDeleting(null)
    }
  }

  const handleLoadBuild = (build: SavedQuery) => {
    // Navigate to builder with the saved query config
    const params = new URLSearchParams()
    const config = build.query_config
    
    if (config.queryType) params.set('type', config.queryType)
    if (config.betType) params.set('bet', config.betType)
    if (config.side) params.set('side', config.side)
    if (config.timePeriod) params.set('time', config.timePeriod)
    if (config.location) params.set('loc', config.location)
    if (config.division) params.set('div', config.division)
    if (config.conference) params.set('conf', config.conference)
    if (config.favorite) params.set('fav', config.favorite)
    if (config.playoff) params.set('playoff', config.playoff)
    if (config.teamId) params.set('team', config.teamId)
    if (config.refereeId) params.set('ref', config.refereeId)
    if (config.propStat) params.set('stat', config.propStat)
    if (config.propLine) params.set('line', config.propLine)
    if (config.propPlayer) params.set('player', config.propPlayer)
    
    const queryType = config.queryType || 'trend'
    const basePath = queryType === 'trend' ? '/builder' : `/builder/${queryType === 'team' ? 'teams' : queryType === 'referee' ? 'referees' : 'props'}`
    
    router.push(`${basePath}?${params.toString()}`)
  }

  const getQueryTypeIcon = (config: any) => {
    const type = config?.queryType || 'trend'
    switch (type) {
      case 'team': return <PiFootballHelmetDuotone />
      case 'referee': return <GiWhistle />
      case 'prop': return <TbTargetArrow />
      default: return <IoMdTrendingUp />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Format query config into readable tags
  const getConfigTags = (config: any): string[] => {
    const tags: string[] = []
    
    if (config.betType) {
      const betLabels: Record<string, string> = {
        'spread': 'Spread',
        'total': 'Total O/U',
        'moneyline': 'Moneyline'
      }
      tags.push(betLabels[config.betType] || config.betType)
    }
    
    if (config.side) {
      const sideLabels: Record<string, string> = {
        'over': 'Over',
        'under': 'Under',
        'home': 'Home',
        'away': 'Away',
        'favorite': 'Favorite',
        'underdog': 'Underdog'
      }
      tags.push(sideLabels[config.side] || config.side)
    }
    
    if (config.timePeriod) {
      const timeLabels: Record<string, string> = {
        'since_2023': 'Since 2023',
        'since_2022': 'Since 2022',
        'L2years': 'Last 2 Years',
        'L3years': 'Last 3 Years',
        'season': 'This Season'
      }
      tags.push(timeLabels[config.timePeriod] || config.timePeriod)
    }
    
    if (config.location && config.location !== 'any') {
      tags.push(config.location === 'home' ? 'Home' : 'Away')
    }
    
    if (config.division && config.division !== 'any') {
      tags.push(config.division === 'yes' ? 'Division' : 'Non-Division')
    }
    
    if (config.conference && config.conference !== 'any') {
      tags.push(config.conference === 'conference' ? 'Conference' : 'Non-Conference')
    }
    
    if (config.favorite && config.favorite !== 'any') {
      tags.push(config.favorite === 'favorite' ? 'Favorite' : 'Underdog')
    }
    
    // Props specific
    if (config.propStat) {
      const statLabels: Record<string, string> = {
        'receiving_yards': 'Rec Yards',
        'receptions': 'Receptions',
        'pass_yards': 'Pass Yards',
        'rush_yards': 'Rush Yards',
        'pass_tds': 'Pass TDs'
      }
      tags.push(statLabels[config.propStat] || config.propStat)
    }
    
    if (config.position) {
      tags.push(config.position.toUpperCase())
    }
    
    if (config.propLineMin || config.propLineMax) {
      const min = config.propLineMin || '0'
      const max = config.propLineMax || '∞'
      tags.push(`Line: ${min}-${max}`)
    }
    
    return tags.slice(0, 5) // Limit to 5 tags for display
  }

  if (!isLoaded || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your builds...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.authMessage}>
          <h2>Sign in to view your builds</h2>
          <p>Create an account to save and manage your custom builds.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>My Builds</h1>
          <span className={styles.buildCount}>{builds.length} saved</span>
        </div>
        <button 
          className={styles.newBuildButton}
          onClick={() => router.push('/builder')}
        >
          + New Build
        </button>
      </header>

      {builds.length === 0 ? (
        <div className={styles.emptyState}>
          <IoMdTrendingUp className={styles.emptyIcon} />
          <h3>No saved builds yet</h3>
          <p>Create your first build to start tracking trends and systems.</p>
          <button 
            className={styles.createButton}
            onClick={() => router.push('/builder')}
          >
            Create Your First Build
          </button>
        </div>
      ) : (
        <div className={styles.buildsList}>
          {builds.map((build) => {
            const configTags = getConfigTags(build.query_config)
            const summary = build.last_result_summary
            
            return (
              <div key={build.id} className={styles.buildCard}>
                <div className={styles.buildCardHeader}>
                  <div className={styles.buildIcon}>
                    {getQueryTypeIcon(build.query_config)}
                  </div>
                  <div className={styles.buildTitleSection}>
                    <h3 className={styles.buildName}>{build.name}</h3>
                    {build.description && (
                      <p className={styles.buildDescription}>{build.description}</p>
                    )}
                  </div>
                  <div className={styles.buildActions}>
                    <button 
                      className={styles.runButton}
                      onClick={() => handleLoadBuild(build)}
                    >
                      <FiPlay />
                      Run
                    </button>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDelete(build.id)}
                      disabled={deleting === build.id}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                
                {/* Config Tags */}
                {configTags.length > 0 && (
                  <div className={styles.configTags}>
                    {configTags.map((tag, i) => (
                      <span key={i} className={styles.configTag}>{tag}</span>
                    ))}
                  </div>
                )}
                
                {/* Results Summary */}
                {summary && (
                  <div className={styles.resultsSummary}>
                    <div className={styles.statBox}>
                      <span className={styles.statValue}>{summary.hits}-{summary.misses}</span>
                      <span className={styles.statLabel}>Record</span>
                    </div>
                    <div className={styles.statBox}>
                      <span className={`${styles.statValue} ${summary.hit_rate >= 52 ? styles.positive : summary.hit_rate < 48 ? styles.negative : ''}`}>
                        {summary.hit_rate.toFixed(1)}%
                      </span>
                      <span className={styles.statLabel}>Hit Rate</span>
                    </div>
                    <div className={styles.statBox}>
                      <span className={styles.statValue}>{summary.total_games}</span>
                      <span className={styles.statLabel}>Games</span>
                    </div>
                    {summary.roi !== undefined && (
                      <div className={styles.statBox}>
                        <span className={`${styles.statValue} ${summary.roi >= 0 ? styles.positive : styles.negative}`}>
                          {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
                        </span>
                        <span className={styles.statLabel}>ROI</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Footer Meta */}
                <div className={styles.buildMeta}>
                  <span className={styles.metaItem}>
                    <FiCalendar />
                    {formatDate(build.created_at)}
                  </span>
                  <span className={styles.metaItem}>
                    {build.sport?.toUpperCase() || 'NFL'}
                  </span>
                  {build.run_count && build.run_count > 0 && (
                    <span className={styles.metaItem}>
                      Run {build.run_count}x
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


