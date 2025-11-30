'use client'

import { useState, useEffect } from 'react'
import styles from './dashboard.module.css'

interface Bettor {
  id: string
  name: string
  profile_image: string | null
  profile_initials: string
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

interface Pick {
  id: string
  bettor_id: string
  sport: string
  bet_title: string
  units: string
  odds: string
  sportsbook: string
  game_time: string
  result: 'won' | 'lost'
  units_result: string
}

interface AnalyticsData {
  bettors: Bettor[]
  collective: BettorStat
  bettorStats: Record<string, BettorStat>
  selectedDates: string[]
  availableDates: string[]
  picks: Pick[]
}

type QuickPeriod = 3 | 5 | 7 | 14 | 30 | 60 | 90 | 180 | 365

export default function AnalystPicksDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  
  // Filters
  const [selectedBettor, setSelectedBettor] = useState('collective')
  const [selectedSport, setSelectedSport] = useState('all')
  
  // Date selection
  const [dateMode, setDateMode] = useState<'quick' | 'custom'>('quick')
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>(3)
  const [customDates, setCustomDates] = useState<string[]>([])
  
  // View mode
  const [viewMode, setViewMode] = useState<'calendar' | 'details'>('calendar')

  useEffect(() => {
    fetchData()
  }, [selectedBettor, selectedSport, dateMode, quickPeriod, customDates])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      let url = `/api/company/analyst-picks-analytics?sport=${selectedSport}`
      
      if (selectedBettor !== 'collective') {
        url += `&bettor_id=${selectedBettor}`
      }
      
      if (dateMode === 'quick') {
        url += `&days=${quickPeriod}`
      } else if (customDates.length > 0) {
        url += `&dates=${customDates.join(',')}`
      } else {
        url += `&days=3` // Default if no custom dates selected
      }
      
      const response = await fetch(url)
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

  const handleQuickPeriod = (period: QuickPeriod) => {
    setDateMode('quick')
    setQuickPeriod(period)
    setCustomDates([])
  }

  const toggleCustomDate = (date: string) => {
    setDateMode('custom')
    setCustomDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date)
      } else {
        return [...prev, date].sort((a, b) => b.localeCompare(a))
      }
    })
  }

  const formatDateLabel = (dates: string[]) => {
    if (dates.length === 0) return ''
    if (dates.length === 1) return formatDate(dates[0])
    
    // Check if consecutive
    const sortedDates = [...dates].sort((a, b) => a.localeCompare(b))
    const firstDate = new Date(sortedDates[0])
    const lastDate = new Date(sortedDates[sortedDates.length - 1])
    
    const daysDiff = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff + 1 === dates.length) {
      // Consecutive dates
      return `${formatDate(sortedDates[0])} - ${formatDate(sortedDates[sortedDates.length - 1])}`
    } else {
      // Non-consecutive
      return dates.map(d => formatDate(d)).join(', ')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading analyst picks analytics...</div>
      </div>
    )
  }

  const currentStats = selectedBettor === 'collective' ? data.collective : data.bettorStats[selectedBettor]
  const currentBettor = data.bettors.find(b => b.id === selectedBettor)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analyst Picks Analytics</h1>
        <p className={styles.subtitle}>Marketing-ready performance cards & detailed pick breakdowns</p>
      </div>

      {/* Row 1: Bettor & Sport Filters */}
      <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Analyst</label>
          <select 
            value={selectedBettor} 
            onChange={(e) => setSelectedBettor(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="collective">Collective (All Analysts)</option>
            {data.bettors.map(bettor => (
              <option key={bettor.id} value={bettor.id}>{bettor.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sport</label>
          <select 
            value={selectedSport} 
            onChange={(e) => setSelectedSport(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Sports</option>
            <option value="nfl">NFL</option>
            <option value="nba">NBA</option>
            <option value="nhl">NHL</option>
            <option value="ncaaf">NCAAF</option>
          </select>
        </div>
      </div>

      {/* Row 2: Quick Periods */}
      <div className={styles.periodSection}>
        <label className={styles.sectionLabel}>Quick Periods</label>
        <div className={styles.quickPeriods}>
          {[3, 5, 7, 14, 30, 60, 90, 180, 365].map(period => (
            <button
              key={period}
              onClick={() => handleQuickPeriod(period as QuickPeriod)}
              className={dateMode === 'quick' && quickPeriod === period ? styles.periodButtonActive : styles.periodButton}
            >
              L{period === 365 ? 'Year' : period}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2b: OR divider */}
      <div className={styles.orDivider}>
        <span>OR</span>
      </div>

      {/* Row 3: Custom Date Picker */}
      <div className={styles.datePickerSection}>
        <label className={styles.sectionLabel}>Select Specific Days</label>
        <div className={styles.dateGrid}>
          {data.availableDates.slice(0, 30).map(date => (
            <button
              key={date}
              onClick={() => toggleCustomDate(date)}
              className={customDates.includes(date) ? styles.dateButtonActive : styles.dateButton}
            >
              {formatDate(date)}
            </button>
          ))}
        </div>
        {customDates.length > 0 && (
          <div className={styles.selectedDatesInfo}>
            Selected: {formatDateLabel(customDates)}
          </div>
        )}
      </div>

      {/* Row 4: View Mode Toggle */}
      <div className={styles.viewModeSection}>
        <button
          onClick={() => setViewMode('calendar')}
          className={viewMode === 'calendar' ? styles.viewButtonActive : styles.viewButton}
        >
          📅 Calendar View
        </button>
        <button
          onClick={() => setViewMode('details')}
          className={viewMode === 'details' ? styles.viewButtonActive : styles.viewButton}
        >
          📋 Details View
        </button>
      </div>

      {/* Display Area */}
      {viewMode === 'calendar' ? (
        <div className={styles.calendarViewContainer}>
          {currentStats && (
            <div className={styles.marketingCard}>
              <div className={styles.cardHeader}>
                {selectedBettor !== 'collective' && currentBettor?.profile_image && (
                  <img src={currentBettor.profile_image} alt={currentBettor.name} className={styles.cardImage} />
                )}
                <h2 className={styles.cardName}>
                  {selectedBettor === 'collective' ? 'Collective' : currentBettor?.name}
                </h2>
              </div>
              
              <div className={styles.cardMainStat}>
                {selectedSport === 'all' ? 'All Sports' : selectedSport.toUpperCase()}, L{dateMode === 'quick' ? quickPeriod : customDates.length}: <span className={styles.recordHighlight}>{currentStats.overall.wins}-{currentStats.overall.losses} ({currentStats.overall.winRate}%)</span>, <span className={parseFloat(currentStats.overall.roi) >= 0 ? styles.roiGood : styles.roiBad}>ROI: {currentStats.overall.roi}%</span>
              </div>

              <div className={styles.cardDaysGrid}>
                {currentStats.days.map((day, idx) => (
                  <div key={idx} className={styles.cardDay}>
                    <div className={styles.cardDayDate}>{formatDate(day.date)}</div>
                    <div className={styles.cardDayRecord}>{day.wins}-{day.losses}</div>
                    <div className={parseFloat(day.roi) >= 0 ? styles.cardDayRoiGood : styles.cardDayRoiBad}>
                      {day.roi}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.detailsViewContainer}>
          {currentStats && currentStats.days.map((day, idx) => {
            const dayPicks = data.picks.filter(p => {
              const gameTime = new Date(p.game_time)
              const estDate = new Date(gameTime.getTime() - (5 * 60 * 60 * 1000))
              return estDate.toISOString().split('T')[0] === day.date
            })

            if (dayPicks.length === 0) return null

            return (
              <div key={idx} className={styles.daySection}>
                <div className={styles.daySectionHeader}>
                  <h3 className={styles.daySectionTitle}>{formatDate(day.date)}</h3>
                  <div className={styles.daySectionStats}>
                    <span className={day.wins > day.losses ? styles.recordGood : styles.recordBad}>
                      {day.wins}-{day.losses} ({day.winRate}%)
                    </span>
                    <span className={styles.divider}>•</span>
                    <span className={parseFloat(day.roi) >= 0 ? styles.roiGood : styles.roiBad}>
                      ROI: {day.roi}%
                    </span>
                    <span className={styles.divider}>•</span>
                    <span className={parseFloat(day.unitsWon) >= 0 ? styles.unitsGood : styles.unitsBad}>
                      {parseFloat(day.unitsWon) > 0 ? '+' : ''}{day.unitsWon}u
                    </span>
                  </div>
                </div>

                <div className={styles.picksGrid}>
                  {dayPicks.map(pick => (
                    <div key={pick.id} className={styles.pickCard}>
                      <div className={styles.pickHeader}>
                        <span className={pick.result === 'won' ? styles.resultWon : styles.resultLost}>
                          {pick.result === 'won' ? '✓ WON' : '✗ LOST'}
                        </span>
                        <span className={styles.pickSport}>{pick.sport}</span>
                      </div>
                      <div className={styles.pickTitle}>{pick.bet_title}</div>
                      <div className={styles.pickDetails}>
                        <span>{pick.odds} • {pick.sportsbook}</span>
                        <span className={styles.pickUnits}>{pick.units}u risked</span>
                      </div>
                      <div className={styles.pickResult}>
                        Result: <span className={parseFloat(pick.units_result) >= 0 ? styles.unitsGood : styles.unitsBad}>
                          {parseFloat(pick.units_result) > 0 ? '+' : ''}{pick.units_result}u
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
