'use client'

import { useState, useEffect } from 'react'
import styles from './dashboard.module.css'

interface Bettor {
  id: string
  name: string
  image_url: string | null
}

interface DayStats {
  date: string
  wins: number
  losses: number
  winRate: string
  roi: string
  unitsWon: string
  unitsRisked: string
}

interface OverallStats {
  wins: number
  losses: number
  winRate: string
  roi: string
  unitsWon: string
  unitsRisked: string
}

interface BettorStat {
  overall: OverallStats
  days: DayStats[]
}

interface AnalyticsData {
  bettors: Bettor[]
  collective: BettorStat
  bettorStats: Record<string, BettorStat>
  recentDates: string[]
}

export default function AnalystPicksDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [sport, setSport] = useState('all')
  const [days, setDays] = useState(3)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['collective']))

  useEffect(() => {
    fetchData()
  }, [sport, days])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/company/analyst-picks-analytics?sport=${sport}&days=${days}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const dateOnly = dateStr
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    if (dateOnly === todayStr) return 'Today'
    if (dateOnly === yesterdayStr) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading analyst picks analytics...</div>
      </div>
    )
  }

  const renderStatsCard = (id: string, title: string, stats: BettorStat, imageUrl?: string | null) => {
    const isExpanded = expandedSections.has(id)
    const { overall, days: dayStats } = stats

    if (overall.wins === 0 && overall.losses === 0) return null

    return (
      <div key={id} className={styles.statsCard}>
        <div className={styles.statsHeader} onClick={() => toggleSection(id)}>
          <div className={styles.statsHeaderLeft}>
            {imageUrl && (
              <img src={imageUrl} alt={title} className={styles.bettorImage} />
            )}
            <div>
              <h3 className={styles.statsTitle}>{title}</h3>
              <div className={styles.statsOverview}>
                <span className={styles.sport}>{sport === 'all' ? 'All Sports' : sport.toUpperCase()}</span>
                <span className={styles.divider}>•</span>
                <span className={styles.period}>L{days}</span>
                <span className={styles.divider}>•</span>
                <span className={overall.wins > overall.losses ? styles.recordGood : styles.recordBad}>
                  {overall.wins}-{overall.losses} ({overall.winRate}%)
                </span>
                <span className={styles.divider}>•</span>
                <span className={parseFloat(overall.roi) >= 0 ? styles.roiGood : styles.roiBad}>
                  ROI: {overall.roi}%
                </span>
              </div>
            </div>
          </div>
          <div className={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>

        {isExpanded && (
          <div className={styles.statsContent}>
            <div className={styles.dayBreakdown}>
              {dayStats.map((day, idx) => (
                <div key={idx} className={styles.dayCard}>
                  <div className={styles.dayDate}>{formatDate(day.date)}</div>
                  <div className={styles.dayStats}>
                    <div className={styles.dayStat}>
                      <span className={styles.dayStatLabel}>Record:</span>
                      <span className={day.wins > day.losses ? styles.recordGood : styles.recordBad}>
                        {day.wins}-{day.losses} ({day.winRate}%)
                      </span>
                    </div>
                    <div className={styles.dayStat}>
                      <span className={styles.dayStatLabel}>ROI:</span>
                      <span className={parseFloat(day.roi) >= 0 ? styles.roiGood : styles.roiBad}>
                        {day.roi}%
                      </span>
                    </div>
                    <div className={styles.dayStat}>
                      <span className={styles.dayStatLabel}>Units:</span>
                      <span className={parseFloat(day.unitsWon) >= 0 ? styles.unitsGood : styles.unitsBad}>
                        {day.unitsWon > 0 ? '+' : ''}{day.unitsWon}u
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.overallSummary}>
              <h4 className={styles.summaryTitle}>Overall Summary</h4>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Record</span>
                  <span className={styles.summaryValue}>
                    {overall.wins}-{overall.losses} ({overall.winRate}%)
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>ROI</span>
                  <span className={parseFloat(overall.roi) >= 0 ? styles.summaryValueGood : styles.summaryValueBad}>
                    {overall.roi}%
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Units Won</span>
                  <span className={parseFloat(overall.unitsWon) >= 0 ? styles.summaryValueGood : styles.summaryValueBad}>
                    {overall.unitsWon > 0 ? '+' : ''}{overall.unitsWon}u
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Units Risked</span>
                  <span className={styles.summaryValue}>{overall.unitsRisked}u</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analyst Picks Analytics</h1>
        <p className={styles.subtitle}>Performance tracking for marketing & internal review</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sport</label>
          <select 
            value={sport} 
            onChange={(e) => setSport(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Sports</option>
            <option value="nfl">NFL</option>
            <option value="nba">NBA</option>
            <option value="nhl">NHL</option>
            <option value="ncaaf">NCAAF</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Time Period</label>
          <select 
            value={days} 
            onChange={(e) => setDays(parseInt(e.target.value))}
            className={styles.filterSelect}
          >
            <option value={3}>Last 3 Days</option>
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className={styles.statsContainer}>
        {/* Collective Stats */}
        {renderStatsCard('collective', 'Collective (All Analysts)', data.collective)}

        {/* Individual Bettor Stats */}
        {data.bettors.map(bettor => {
          const stats = data.bettorStats[bettor.id]
          if (!stats) return null
          return renderStatsCard(bettor.id, bettor.name, stats, bettor.image_url)
        })}
      </div>
    </div>
  )
}

