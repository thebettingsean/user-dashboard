'use client'

import { useState, useEffect } from 'react'
import styles from './dashboard.module.css'

interface KPIs {
  totalSimulations: number
  uniqueSessions: number
  uniqueUsers: number
  anonymousCount: number
  signedInCount: number
}

interface SportBreakdown {
  sport: string
  count: number
  percentage: string
}

interface PopularMatchup {
  matchup: string
  count: number
  sport: string
  awayTeam: string
  homeTeam: string
}

interface TimelineDay {
  date: string
  count: number
  sports: Record<string, number>
}

interface TopUser {
  userId: string
  count: number
}

interface AvgScores {
  sport: string
  avgHomeScore: string
  avgAwayScore: string
  avgTotal: string
}

interface RawEvent {
  id: string
  user_id: string | null
  session_id: string
  user_type: string
  sport: string
  awayTeam: string
  homeTeam: string
  away_score: number
  home_score: number
  created_at: string
}

interface AnalyticsData {
  kpis: KPIs
  sportBreakdown: SportBreakdown[]
  popularMatchups: PopularMatchup[]
  timeline: TimelineDay[]
  hourlyDistribution: number[]
  topUsers: TopUser[]
  avgScoresBySport: AvgScores[]
  rawData: RawEvent[]
}

const sportColors: Record<string, string> = {
  'nfl': '#013369',
  'nba': '#C9082A',
  'college-basketball': '#FF6B00',
  'college-football': '#4A2C2A',
}

const sportLabels: Record<string, string> = {
  'nfl': 'NFL',
  'nba': 'NBA',
  'college-basketball': 'College Basketball',
  'college-football': 'College Football',
}

export default function CustomerSimulationsDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [filterSport, setFilterSport] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/company/simulation-analytics')
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

  if (loading || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading simulation analytics...</div>
      </div>
    )
  }

  // Filter raw data by sport
  const filteredData = filterSport === 'all' 
    ? data.rawData 
    : data.rawData.filter(d => d.sport === filterSport)

  const maxHourlyValue = Math.max(...data.hourlyDistribution)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🎮 Simulation Analytics</h1>
        <p className={styles.subtitle}>Customer simulation activity and engagement metrics</p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Simulations</div>
          <div className={styles.kpiValue}>{data.kpis.totalSimulations.toLocaleString()}</div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiLabel}>Unique Sessions</div>
          <div className={styles.kpiValue}>{data.kpis.uniqueSessions.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            {(data.kpis.totalSimulations / data.kpis.uniqueSessions).toFixed(1)} sims/session
          </div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiLabel}>Signed-In Users</div>
          <div className={styles.kpiValue}>{data.kpis.uniqueUsers.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            {data.kpis.signedInCount.toLocaleString()} sims
          </div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <div className={styles.kpiLabel}>Signed-In Sims</div>
          <div className={styles.kpiValue}>{data.kpis.signedInCount.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            {((data.kpis.signedInCount / data.kpis.totalSimulations) * 100).toFixed(1)}% of total
          </div>
        </div>
        
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Anonymous Sims</div>
          <div className={styles.kpiValue}>{data.kpis.anonymousCount.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            {((data.kpis.anonymousCount / data.kpis.totalSimulations) * 100).toFixed(1)}% of total
          </div>
        </div>
      </div>

      {/* Sport Breakdown */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Breakdown by Sport</h2>
        <div className={styles.sportGrid}>
          {data.sportBreakdown.map((item) => (
            <div 
              key={item.sport} 
              className={styles.sportCard}
              style={{ borderLeftColor: sportColors[item.sport] || '#60a5fa' }}
            >
              <div className={styles.sportName}>{sportLabels[item.sport] || item.sport}</div>
              <div className={styles.sportCount}>{item.count.toLocaleString()}</div>
              <div className={styles.sportPercentage}>{item.percentage}%</div>
              <div className={styles.sportBar}>
                <div 
                  className={styles.sportBarFill} 
                  style={{ 
                    width: `${item.percentage}%`,
                    backgroundColor: sportColors[item.sport] || '#60a5fa'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Average Scores by Sport */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🏆 Average Scores by Sport</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sport</th>
                <th>Avg Away Score</th>
                <th>Avg Home Score</th>
                <th>Avg Total</th>
              </tr>
            </thead>
            <tbody>
              {data.avgScoresBySport.map((item) => (
                <tr key={item.sport}>
                  <td><strong>{sportLabels[item.sport] || item.sport}</strong></td>
                  <td>{item.avgAwayScore}</td>
                  <td>{item.avgHomeScore}</td>
                  <td>
                    <span className={styles.badge}>{item.avgTotal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popular Matchups */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🔥 Most Simulated Matchups</h2>
        <div className={styles.matchupGrid}>
          {data.popularMatchups.slice(0, 12).map((item, idx) => (
            <div key={idx} className={styles.matchupCard}>
              <div className={styles.matchupRank}>#{idx + 1}</div>
              <div className={styles.matchupTeams}>
                <span className={styles.awayTeam}>{item.awayTeam}</span>
                <span className={styles.atSymbol}>@</span>
                <span className={styles.homeTeam}>{item.homeTeam}</span>
              </div>
              <div className={styles.matchupMeta}>
                <span 
                  className={styles.sportBadge}
                  style={{ backgroundColor: sportColors[item.sport] || '#60a5fa' }}
                >
                  {sportLabels[item.sport] || item.sport}
                </span>
                <span className={styles.matchupCount}>{item.count} sims</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⏰ Activity by Hour (UTC)</h2>
        <div className={styles.hourlyChart}>
          {data.hourlyDistribution.map((count, hour) => (
            <div key={hour} className={styles.hourBar}>
              <div 
                className={styles.hourBarFill}
                style={{ height: `${maxHourlyValue > 0 ? (count / maxHourlyValue) * 100 : 0}%` }}
              />
              <div className={styles.hourLabel}>{hour}</div>
              <div className={styles.hourCount}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Timeline */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📅 Daily Activity</h2>
        <div className={styles.timelineContainer}>
          {data.timeline.slice(-14).map((day) => (
            <div key={day.date} className={styles.timelineItem}>
              <div className={styles.timelineDate}>
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className={styles.timelineCount}>{day.count} sims</div>
              <div className={styles.timelineSports}>
                {Object.entries(day.sports).map(([sport, count]) => (
                  <span 
                    key={sport} 
                    className={styles.miniSportBadge}
                    style={{ backgroundColor: sportColors[sport] || '#60a5fa' }}
                  >
                    {sportLabels[sport]?.substring(0, 3).toUpperCase() || sport.substring(0, 3).toUpperCase()}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Users */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>👥 Top Users</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>User ID</th>
                <th>Simulations</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.map((user, idx) => (
                <tr key={user.userId}>
                  <td>
                    <span className={`${styles.rankBadge} ${idx < 3 ? styles.topRank : ''}`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className={styles.userIdCell}>{user.userId}</td>
                  <td>
                    <span className={styles.badge}>{user.count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Data Table */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📋 Recent Simulations</h2>
        
        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Sport:</label>
            <select 
              value={filterSport} 
              onChange={(e) => setFilterSport(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Sports</option>
              {data.sportBreakdown.map(s => (
                <option key={s.sport} value={s.sport}>
                  {sportLabels[s.sport] || s.sport}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterInfo}>
            Showing {filteredData.length} of {data.rawData.length} records
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Sport</th>
                <th>Matchup</th>
                <th>Score</th>
                <th>User Type</th>
                <th>User ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 100).map((event) => (
                <tr key={event.id}>
                  <td className={styles.dateCell}>
                    {new Date(event.created_at).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td>
                    <span 
                      className={styles.sportBadgeSmall}
                      style={{ backgroundColor: sportColors[event.sport] || '#60a5fa' }}
                    >
                      {sportLabels[event.sport]?.substring(0, 3).toUpperCase() || event.sport?.substring(0, 3).toUpperCase() || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.matchupText}>
                      {event.awayTeam} @ {event.homeTeam}
                    </span>
                  </td>
                  <td className={styles.scoreCell}>
                    {event.away_score} - {event.home_score}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${event.user_type === 'signed_in' ? styles.badgeSuccess : styles.badgeInfo}`}>
                      {event.user_type === 'signed_in' ? 'Signed In' : 'Anonymous'}
                    </span>
                  </td>
                  <td className={styles.userIdCellSmall}>
                    {event.user_id ? event.user_id.substring(0, 12) + '...' : 'Anonymous'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length > 100 && (
            <div className={styles.tableNote}>
              Showing first 100 records. Total: {filteredData.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

