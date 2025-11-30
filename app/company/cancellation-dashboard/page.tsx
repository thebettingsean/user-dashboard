'use client'

import { useState, useEffect } from 'react'
import styles from './dashboard.module.css'

interface KPIs {
  total: number
  completed: number
  saved: number
  saveRate: string
  firstOfferWinRate: string
  finalOfferWinRate: string
}

interface Segmentation {
  trial: { count: number; saveRate: string }
  paid: { count: number; saveRate: string }
}

interface TenureData {
  bucket: string
  count: number
  saveRate: string
}

interface ReasonData {
  reason: string
  count: number
  saved: number
  saveRate: string
}

interface OfferData {
  offer: string
  count: number
  accepted: number
  acceptanceRate: string
}

interface TimelineData {
  date: string
  attempts: number
  saves: number
  completed: number
}

interface OtherReason {
  email: string
  text: string
  date: string
}

interface CancellationData {
  id: string
  user_email: string
  subscription_tenure_days: number
  was_on_trial: boolean
  reason_codes: string[] | null
  reason_other_text: string | null
  first_offer_type: string | null
  first_offer_accepted: boolean
  cancellation_completed: boolean
  created_at: string
}

interface AnalyticsData {
  kpis: KPIs
  segmentation: Segmentation
  tenureAnalysis: TenureData[]
  reasonAnalysis: ReasonData[]
  offerPerformance: OfferData[]
  timeline: TimelineData[]
  otherReasons: OtherReason[]
  rawData: CancellationData[]
}

export default function CancellationDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [filterTrial, setFilterTrial] = useState<'all' | 'trial' | 'paid'>('all')
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'saved'>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/company/cancellation-analytics')
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
        <div className={styles.loading}>Loading analytics...</div>
      </div>
    )
  }

  // Filter raw data
  let filteredData = data.rawData
  if (filterTrial === 'trial') {
    filteredData = filteredData.filter(d => d.was_on_trial)
  } else if (filterTrial === 'paid') {
    filteredData = filteredData.filter(d => !d.was_on_trial)
  }
  
  if (filterCompleted === 'completed') {
    filteredData = filteredData.filter(d => d.cancellation_completed)
  } else if (filterCompleted === 'saved') {
    filteredData = filteredData.filter(d => !d.cancellation_completed)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cancellation Analytics Dashboard</h1>
        <p className={styles.subtitle}>Comprehensive analysis of cancellation flow performance</p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Attempts</div>
          <div className={styles.kpiValue}>{data.kpis.total.toLocaleString()}</div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiLabel}>Save Rate</div>
          <div className={styles.kpiValue}>{data.kpis.saveRate}%</div>
          <div className={styles.kpiSubtext}>{data.kpis.saved} saved</div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          <div className={styles.kpiLabel}>Completed Cancellations</div>
          <div className={styles.kpiValue}>{data.kpis.completed.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            {data.kpis.total > 0 ? ((data.kpis.completed / data.kpis.total) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiLabel}>First Offer Win Rate</div>
          <div className={styles.kpiValue}>{data.kpis.firstOfferWinRate}%</div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiLabel}>Final Offer Win Rate</div>
          <div className={styles.kpiValue}>{data.kpis.finalOfferWinRate}%</div>
        </div>
      </div>

      {/* Segmentation Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Segmentation Analysis</h2>
        <div className={styles.segmentGrid}>
          <div className={styles.segmentCard}>
            <div className={styles.segmentLabel}>Trial Users</div>
            <div className={styles.segmentValue}>{data.segmentation.trial.count}</div>
            <div className={styles.segmentRate}>Save Rate: {data.segmentation.trial.saveRate}%</div>
          </div>
          
          <div className={styles.segmentCard}>
            <div className={styles.segmentLabel}>Paid Users</div>
            <div className={styles.segmentValue}>{data.segmentation.paid.count}</div>
            <div className={styles.segmentRate}>Save Rate: {data.segmentation.paid.saveRate}%</div>
          </div>
        </div>
      </div>

      {/* Tenure Analysis */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tenure Analysis</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tenure Bucket</th>
                <th>Count</th>
                <th>Save Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.tenureAnalysis.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.bucket}</td>
                  <td>{item.count}</td>
                  <td>
                    <span className={styles.badge}>{item.saveRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reason Analysis */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Cancellation Reasons</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reason</th>
                <th>Count</th>
                <th>Saved</th>
                <th>Save Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.reasonAnalysis.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.reason}</strong></td>
                  <td>{item.count}</td>
                  <td>{item.saved}</td>
                  <td>
                    <span className={styles.badge}>{item.saveRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Other Reasons Detail */}
      {data.otherReasons.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Other Cancellation Reasons (Verbatim)</h2>
          <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
            {data.otherReasons.length} user{data.otherReasons.length !== 1 ? 's' : ''} selected "Other" and provided custom feedback
          </p>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Email</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {data.otherReasons.map((reason, idx) => (
                  <tr key={idx}>
                    <td>{reason.date}</td>
                    <td className={styles.emailCell}>{reason.email}</td>
                    <td style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.9)' }}>
                      "{reason.text}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offer Performance */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Offer Performance</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Offer Type</th>
                <th>Times Offered</th>
                <th>Accepted</th>
                <th>Acceptance Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.offerPerformance.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.offer}</strong></td>
                  <td>{item.count}</td>
                  <td>{item.accepted}</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                      {item.acceptanceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline Chart (Simple text version for now) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Timeline (Last 30 Days)</h2>
        <div className={styles.timelineContainer}>
          {data.timeline.slice(-30).map((item, idx) => (
            <div key={idx} className={styles.timelineItem}>
              <div className={styles.timelineDate}>{item.date}</div>
              <div className={styles.timelineStats}>
                <span className={styles.timelineStat}>
                  Attempts: <strong>{item.attempts}</strong>
                </span>
                <span className={`${styles.timelineStat} ${styles.success}`}>
                  Saves: <strong>{item.saves}</strong>
                </span>
                <span className={`${styles.timelineStat} ${styles.danger}`}>
                  Completed: <strong>{item.completed}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Data Table */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Detailed Records</h2>
        
        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>User Type:</label>
            <select 
              value={filterTrial} 
              onChange={(e) => setFilterTrial(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All</option>
              <option value="trial">Trial Only</option>
              <option value="paid">Paid Only</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Status:</label>
            <select 
              value={filterCompleted} 
              onChange={(e) => setFilterCompleted(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All</option>
              <option value="saved">Saved Only</option>
              <option value="completed">Completed Only</option>
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
                <th>Date</th>
                <th>Email</th>
                <th>Type</th>
                <th>Tenure</th>
                <th>Reasons</th>
                <th>Offer</th>
                <th>Accepted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 100).map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className={styles.emailCell}>{item.user_email}</td>
                  <td>
                    <span className={`${styles.badge} ${item.was_on_trial ? styles.badgeWarning : styles.badgeInfo}`}>
                      {item.was_on_trial ? 'Trial' : 'Paid'}
                    </span>
                  </td>
                  <td>{item.subscription_tenure_days}d</td>
                  <td>
                    {item.reason_codes?.join(', ') || '-'}
                    {item.reason_codes?.includes('H') && item.reason_other_text && (
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px', fontStyle: 'italic' }}>
                        "{item.reason_other_text}"
                      </div>
                    )}
                  </td>
                  <td>{item.first_offer_type || '-'}</td>
                  <td>
                    {item.first_offer_accepted ? (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>Yes</span>
                    ) : (
                      <span className={styles.badge}>No</span>
                    )}
                  </td>
                  <td>
                    {item.cancellation_completed ? (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>Cancelled</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>Saved</span>
                    )}
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

