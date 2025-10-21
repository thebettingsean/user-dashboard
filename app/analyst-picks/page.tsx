'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '../../lib/supabase'
import { useSubscription } from '../../lib/hooks/useSubscription'

// Types
interface Bettor {
  name: string
  record: string
  win_streak: number
  profile_initials: string
}

interface Pick {
  id: string
  bet_title: string
  odds: string
  sportsbook: string
  units: number
  analysis: string
  sport: string
  sport_emoji: string
  game_time: string
  posted_at: string
  is_free: boolean
  is_consensus: boolean
  result: 'won' | 'lost' | 'push' | 'pending' | null
  bet_type: string
  bettor_name: string
  bettor_record: string
  bettor_win_streak: number
  bettor_initials: string
  bettors?: Bettor
}

interface ConsensusPick {
  id: string
  bet_title: string
  odds: string
  sportsbook: string
  total_units: number
  sport: string
  sport_emoji: string
  game_time: string
  created_at: string
  result: 'won' | 'lost' | 'push' | 'pending' | null
  bettors: Array<{ bettor_name: string; units: number }> | string
  consensus_win_streak: number
}

type FilterMode = 'cappers' | 'consensus' | 'free'
type ConsensusSportFilter = string
type ConsensusTimeFilter = 'all_time' | 'yesterday' | 'L3' | 'L7' | 'L30'

const ALL_SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'CFL', 'NCAAF', 'NCAAB', 'WNBA', 'Soccer', 'UFC', 'Tennis', 'Golf']

export default function AnalystPicksPage() {
  const { isSignedIn } = useUser()
  const { hasAccess: userHasAccess, isLoading: subLoading } = useSubscription()

  // State
  const [allPicks, setAllPicks] = useState<Pick[]>([])
  const [consensusPicks, setConsensusPicks] = useState<ConsensusPick[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [filterMode, setFilterMode] = useState<FilterMode>('cappers')
  const [sportFilters, setSportFilters] = useState<string[]>([])
  const [expandedPicks, setExpandedPicks] = useState<Set<string>>(new Set())
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({})
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false)

  // Consensus modal state
  const [consensusModalOpen, setConsensusModalOpen] = useState(false)
  const [allConsensusPicks, setAllConsensusPicks] = useState<ConsensusPick[]>([])
  const [consensusSportFilter, setConsensusSportFilter] = useState<ConsensusSportFilter>('All Sports')
  const [consensusTimeFilter, setConsensusTimeFilter] = useState<ConsensusTimeFilter>('all_time')
  const [consensusSportDropdownOpen, setConsensusSportDropdownOpen] = useState(false)
  const [consensusTimeDropdownOpen, setConsensusTimeDropdownOpen] = useState(false)

  const hasAccess = typeof userHasAccess === 'function' ? userHasAccess() : userHasAccess

  // Load picks for the selected date
  useEffect(() => {
    loadPicks()
    const interval = setInterval(loadPicks, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [currentDate, selectedDate])

  // Generate date bar
  useEffect(() => {
    fetchPickCounts()
  }, [])

  const loadPicks = async () => {
    try {
      const targetDate = selectedDate || new Date()
      const dateRange = getDateRange(targetDate)

      const { data, error } = await supabase
        .from('picks')
        .select('*, bettors(name, record, win_streak, profile_initials)')
        .gte('game_time', dateRange.start)
        .lte('game_time', dateRange.end)
        .order('game_time', { ascending: true })

      if (error) throw error

      const picks = (data || []).map(p => ({
        ...p,
        bettor_name: p.bettors?.name || 'Unknown',
        bettor_record: p.bettors?.record || '',
        bettor_win_streak: p.bettors?.win_streak || 0,
        bettor_initials: p.bettors?.profile_initials || '??'
      }))

      // Sort by bettor name, then by game time
      picks.sort((a, b) => {
        if (a.bettor_name !== b.bettor_name) {
          return a.bettor_name.localeCompare(b.bettor_name)
        }
        return new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
      })

      setAllPicks(picks)

      // Load consensus picks
      const { data: consensusData, error: consensusError } = await supabase
        .from('consensus_picks')
        .select('*')
        .gte('game_time', dateRange.start)
        .lte('game_time', dateRange.end)
        .order('game_time', { ascending: true })

      if (consensusError) throw consensusError

      setConsensusPicks(consensusData || [])
      setLoading(false)
    } catch (err) {
      console.error('Error loading picks:', err)
      setLoading(false)
    }
  }

  const fetchPickCounts = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const dates = []
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        dates.push(date)
      }

      const startDate = dates[0]
      const endDate = new Date(dates[dates.length - 1])
      endDate.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('picks')
        .select('game_time')
        .gte('game_time', startDate.toISOString())
        .lte('game_time', endDate.toISOString())

      if (error) throw error

      const counts: Record<string, number> = {}
      
      ;(data || []).forEach(pick => {
        const gameTimeUTC = new Date(pick.game_time)
        const gameTimeEST = new Date(gameTimeUTC.toLocaleString("en-US", {timeZone: "America/New_York"}))
        const estDateStr = `${gameTimeEST.getFullYear()}-${String(gameTimeEST.getMonth() + 1).padStart(2, '0')}-${String(gameTimeEST.getDate()).padStart(2, '0')}`
        
        counts[estDateStr] = (counts[estDateStr] || 0) + 1
      })

      setPickCounts(counts)
    } catch (err) {
      console.error('Error fetching pick counts:', err)
    }
  }

  const getDateRange = (date: Date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.toDateString() === d2.toDateString()
  }

  const formatGameTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const timeAgo = (dateStr: string) => {
    const now = Date.now()
    const posted = new Date(dateStr)
    const minutes = Math.floor((now - posted.getTime()) / 60000)
    
    if (minutes < 60) return `${minutes} minutes ago`
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      return `${hours} hour${hours >= 2 ? 's' : ''} ago`
    }
    const days = Math.floor(minutes / 1440)
    return `${days} day${days >= 2 ? 's' : ''} ago`
  }

  const togglePick = (id: string) => {
    setExpandedPicks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    setCurrentDate(date)
    setSelectedDate(isSameDay(date, new Date()) ? null : date)
  }

  const filteredPicks = useMemo(() => {
    let picks: Pick[] = []

    switch (filterMode) {
      case 'cappers':
        picks = allPicks.filter(p => p.bet_type !== 'Futures')
        break
      case 'consensus':
        return consensusPicks
      case 'free':
        picks = allPicks.filter(p => p.is_free === true && p.bet_type !== 'Futures')
        break
    }

    if (sportFilters.length > 0) {
      picks = picks.filter(p => sportFilters.includes(p.sport))
    }

    return picks
  }, [allPicks, consensusPicks, filterMode, sportFilters])

  // Load all consensus picks for modal
  const loadAllConsensusPicks = async () => {
    try {
      const { data, error } = await supabase
        .from('consensus_picks')
        .select('*')
        .neq('result', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllConsensusPicks(data || [])
    } catch (err) {
      console.error('Error loading all consensus picks:', err)
    }
  }

  const openConsensusModal = () => {
    setConsensusModalOpen(true)
    loadAllConsensusPicks()
  }

  const closeConsensusModal = () => {
    setConsensusModalOpen(false)
  }

  const filteredConsensusPicks = useMemo(() => {
    let picks = [...allConsensusPicks]

    if (consensusSportFilter !== 'All Sports') {
      picks = picks.filter(p => p.sport === consensusSportFilter)
    }

    const now = new Date()
    const filterFunctions: Record<ConsensusTimeFilter, (p: ConsensusPick) => boolean> = {
      yesterday: (p) => {
        const start = new Date(now)
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(now)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        const created = new Date(p.created_at)
        return created >= start && created <= end
      },
      L3: (p) => {
        const start = new Date(now)
        start.setDate(start.getDate() - 3)
        return new Date(p.created_at) >= start
      },
      L7: (p) => {
        const start = new Date(now)
        start.setDate(start.getDate() - 7)
        return new Date(p.created_at) >= start
      },
      L30: (p) => {
        const start = new Date(now)
        start.setDate(start.getDate() - 30)
        return new Date(p.created_at) >= start
      },
      all_time: () => true
    }

    const filterFn = filterFunctions[consensusTimeFilter]
    if (filterFn) {
      picks = picks.filter(filterFn)
    }

    return picks
  }, [allConsensusPicks, consensusSportFilter, consensusTimeFilter])

  const consensusStats = useMemo(() => {
    const stats = {
      wins: 0,
      losses: 0,
      pushes: 0,
      netUnits: 0,
      winRate: 0
    }

    filteredConsensusPicks.forEach(p => {
      if (p.result === 'won') stats.wins++
      else if (p.result === 'lost') stats.losses++
      else if (p.result === 'push') stats.pushes++
      
      // You might need to add a units_result field to consensus_picks table
      // For now, we'll calculate basic stats
    })

    const total = stats.wins + stats.losses
    stats.winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0

    return stats
  }, [filteredConsensusPicks])

  if (loading && allPicks.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading today's expert sports betting picks...</p>
        </div>
      </div>
    )
  }

  // Render date bar
  const renderDateBar = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dates = []
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date)
    }

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

    return (
      <div style={styles.dateBar} className="analyst-picks-date-bar">
        <div style={styles.monthLabel} className="analyst-picks-month-label">{months[today.getMonth()]}</div>
        <div style={styles.datesContainer}>
          <div style={styles.dateScrollWrapper}>
            {dates.map((date, index) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              const count = pickCounts[dateStr] || 0
              const isToday = index === 0
              const isSelected = isSameDay(date, currentDate)

              return (
                <div
                  key={dateStr}
                  style={{
                    ...styles.dateItem,
                    ...(isToday ? styles.dateItemToday : {}),
                    ...(isSelected ? styles.dateItemSelected : {})
                  }}
                  onClick={() => selectDate(dateStr)}
                >
                  {count > 0 && (
                    <div style={styles.pickCount}>{count}</div>
                  )}
                  <div style={{
                    ...styles.dateNumber,
                    ...(isToday ? styles.dateNumberToday : {}),
                    ...(isSelected ? styles.dateNumberSelected : {})
                  }}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Render pick card
  const renderPick = (pick: Pick, showBettorName = false) => {
    const pickId = `p-${pick.id}`
    const isPremium = pick.is_free !== true
    const hasAccessToPick = !isPremium || hasAccess
    const isExpanded = expandedPicks.has(pickId)

    const truncatedTitle = hasAccessToPick 
      ? (pick.bet_title.length > 35 ? pick.bet_title.substring(0, 35) + '...' : pick.bet_title)
      : 'Premium Pick'

    const fullTitle = hasAccessToPick ? pick.bet_title : '🔒 Premium Pick - Subscribe to View'

    let resultBadge = null
    let pickClass = styles.pickCard

    if (selectedDate && selectedDate < new Date() && pick.result) {
      if (pick.result === 'won') {
        pickClass = { ...styles.pickCard, ...styles.pickCardWin }
        resultBadge = <span style={styles.resultBadgeWin}>WIN</span>
      } else if (pick.result === 'lost') {
        pickClass = { ...styles.pickCard, ...styles.pickCardLoss }
        resultBadge = <span style={styles.resultBadgeLoss}>LOSS</span>
      } else if (pick.result === 'push') {
        resultBadge = <span style={styles.resultBadgePending}>PUSH</span>
      } else {
        resultBadge = <span style={styles.resultBadgePending}>Not recapped</span>
      }
    }

    const tags = []
    if (pick.is_free) tags.push(<span key="free" style={styles.freeBadge}>FREE</span>)
    if (pick.is_consensus) tags.push(<span key="consensus" style={styles.consensusBadge}>CONSENSUS</span>)

    return (
      <div key={pickId} style={pickClass}>
        <div style={styles.pickMain} className="analyst-picks-pick-main" onClick={() => togglePick(pickId)}>
          <div style={styles.pickTitleInfo} className="analyst-picks-pick-title-info">
            <span style={styles.unitBadge} className="analyst-picks-unit-badge">{pick.units}u</span>
            <span style={hasAccessToPick ? styles.pickTitle : styles.pickTitleLocked} className="analyst-picks-pick-title">
              {truncatedTitle}
              {!hasAccessToPick && (
                <svg style={styles.lockIcon} viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" fill="#f59e0b"/>
                </svg>
              )}
            </span>
          </div>
          <div style={styles.pickOddsRow} className="analyst-picks-pick-odds-row">
            <span style={styles.oddsText} className="analyst-picks-odds-text">{pick.odds} • {pick.sportsbook}</span>
            {resultBadge}
            <div style={{ ...styles.dropdownArrow, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div style={styles.pickDropdown}>
            <div style={styles.pickDropdownContent} className="analyst-picks-pick-dropdown-content">
              <div style={styles.pickTitleFull}>{fullTitle}</div>
              {tags.length > 0 && (
                <div style={styles.pickTags}>{tags}</div>
              )}
              <div style={styles.divider} />
              
              {hasAccessToPick ? (
                <div style={styles.analysisText} className="analyst-picks-analysis-text">{pick.analysis}</div>
              ) : (
                <div style={styles.analysisLocked}>
                  <svg style={styles.lockIconLarge} viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" fill="#f59e0b"/>
                  </svg>
                  <span>🔒 Premium Analysis Locked</span>
                  <button style={styles.unlockButton} className="analyst-picks-unlock-button" onClick={(e) => { e.stopPropagation(); window.open('https://thebettinginsider.com/pricing', '_blank') }}>
                    Unlock Now
                  </button>
                </div>
              )}

              {showBettorName && (
                <div style={styles.bettorAttribution}>— {pick.bettor_name}</div>
              )}

              <div style={styles.pickMeta} className="analyst-picks-pick-meta">
                <div style={styles.metaItem}>Posted {timeAgo(pick.posted_at)}</div>
                <div style={styles.metaItem}>Goes live at {formatGameTime(pick.game_time)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render consensus pick card
  const renderConsensusPick = (pick: ConsensusPick) => {
    const pickId = `c-${pick.id}`
    const hasAccessToPick = hasAccess
    const isExpanded = expandedPicks.has(pickId)

    const truncatedTitle = hasAccessToPick 
      ? (pick.bet_title.length > 35 ? pick.bet_title.substring(0, 35) + '...' : pick.bet_title)
      : 'Premium Consensus'

    const fullTitle = hasAccessToPick ? pick.bet_title : '🔒 Premium Consensus Pick - Subscribe to View'

    let bettors = pick.bettors
    if (typeof bettors === 'string') {
      try {
        bettors = JSON.parse(bettors)
      } catch {
        bettors = []
      }
    }

    return (
      <div key={pickId} style={styles.pickCard}>
        <div style={styles.pickMain} onClick={() => togglePick(pickId)}>
          <div style={styles.pickTitleInfo}>
            <span style={styles.unitBadge}>{pick.total_units}u</span>
            <span style={hasAccessToPick ? styles.pickTitle : styles.pickTitleLocked}>
              {truncatedTitle}
              {!hasAccessToPick && (
                <svg style={styles.lockIcon} viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" fill="#f59e0b"/>
                </svg>
              )}
            </span>
          </div>
          <div style={styles.pickOddsRow}>
            <span style={styles.oddsText}>{pick.odds} • {pick.sportsbook}</span>
            <div style={{ ...styles.dropdownArrow, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div style={styles.pickDropdown}>
            <div style={styles.pickDropdownContent}>
              <div style={styles.pickTitleFull}>{fullTitle}</div>
              <div style={styles.pickTags}>
                <span style={styles.consensusBadge}>CONSENSUS</span>
              </div>
              <div style={styles.divider} />
              
              {hasAccessToPick ? (
                <div style={styles.analysisText}>
                  {Array.isArray(bettors) && bettors.length > 0 ? (
                    bettors.map((b, i) => (
                      <div key={i} style={{ marginBottom: '0.5rem' }}>
                        <strong>{b.units}u - {b.bettor_name}</strong>
                      </div>
                    ))
                  ) : (
                    <div>No bettor details available</div>
                  )}
                </div>
              ) : (
                <div style={styles.analysisLocked}>
                  <svg style={styles.lockIconLarge} viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" fill="#f59e0b"/>
                  </svg>
                  <span>🔒 Premium Consensus Analysis Locked</span>
                  <button style={styles.unlockButton} onClick={(e) => { e.stopPropagation(); window.open('https://thebettinginsider.com/pricing', '_blank') }}>
                    Unlock Now
                  </button>
                </div>
              )}

              <div style={styles.pickMeta}>
                <div style={styles.metaItem}>Posted {timeAgo(pick.created_at)}</div>
                <div style={styles.metaItem}>Goes live at {formatGameTime(pick.game_time)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render main content based on filter mode
  const renderContent = () => {
    if (filterMode === 'cappers') {
      const picks = filteredPicks as Pick[]
      if (picks.length === 0) {
        return <div style={styles.noResults}>No picks match your filters</div>
      }

      // Group by bettor
      const bettorGroups: Record<string, { picks: Pick[], name: string, record: string, winStreak: number, hasPremium: boolean, dailyWins: number, dailyLosses: number, dailyPushes: number }> = {}

      picks.forEach(pick => {
        if (!bettorGroups[pick.bettor_name]) {
          bettorGroups[pick.bettor_name] = {
            name: pick.bettor_name,
            record: pick.bettor_record,
            winStreak: pick.bettor_win_streak,
            picks: [],
            hasPremium: false,
            dailyWins: 0,
            dailyLosses: 0,
            dailyPushes: 0
          }
        }

        bettorGroups[pick.bettor_name].picks.push(pick)
        
        if (pick.is_free !== true) {
          bettorGroups[pick.bettor_name].hasPremium = true
        }

        if (selectedDate && selectedDate < new Date()) {
          if (pick.result === 'won') bettorGroups[pick.bettor_name].dailyWins++
          else if (pick.result === 'lost') bettorGroups[pick.bettor_name].dailyLosses++
          else if (pick.result === 'push') bettorGroups[pick.bettor_name].dailyPushes++
        }
      })

      // Sort bettors by win streak
      const sortedBettors = Object.values(bettorGroups).sort((a, b) => b.winStreak - a.winStreak)

      return sortedBettors.map(bettor => {
        // Group picks by sport
        const sportGroups: Record<string, Pick[]> = {}
        bettor.picks.forEach(pick => {
          if (!sportGroups[pick.sport]) {
            sportGroups[pick.sport] = []
          }
          sportGroups[pick.sport].push(pick)
        })

        return (
          <div key={bettor.name} style={styles.bettorSection} className="analyst-picks-bettor-section">
            {bettor.winStreak > 0 && (!selectedDate || isSameDay(selectedDate, new Date())) && (
              <div style={styles.winStreakBadge}>
                🔥 {bettor.winStreak}
                <span style={styles.winStreakTooltip}>Win streak</span>
              </div>
            )}

            {bettor.hasPremium && !hasAccess && (
              <a 
                href="https://thebettinginsider.com/pricing" 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.unlockWidgetButton}
              >
                🔒 Unlock
              </a>
            )}

            <div style={styles.bettorHeader}>
              <div style={styles.bettorInfo}>
                <div style={styles.bettorName} className="analyst-picks-bettor-name">{bettor.name}</div>
                {(!selectedDate || isSameDay(selectedDate, new Date())) && (
                  <div style={styles.bettorRecord}>{bettor.record}</div>
                )}
                {selectedDate && selectedDate < new Date() && (bettor.dailyWins > 0 || bettor.dailyLosses > 0) && (
                  <div style={styles.bettorRecord}>
                    <span style={{ color: '#10b981' }}>{bettor.dailyWins}W</span>
                    {' - '}
                    <span style={{ color: '#ef4444' }}>{bettor.dailyLosses}L</span>
                    {bettor.dailyPushes > 0 && ` - ${bettor.dailyPushes}P`}
                  </div>
                )}
              </div>
            </div>

            {Object.entries(sportGroups).map(([sport, sportPicks]) => {
              // Sort picks chronologically
              const sortedPicks = [...sportPicks].sort((a, b) => {
                const now = new Date()
                const aTime = new Date(a.game_time)
                const bTime = new Date(b.game_time)
                const aStarted = aTime < now
                const bStarted = bTime < now
                
                if (!aStarted && bStarted) return -1
                if (aStarted && !bStarted) return 1
                return aTime.getTime() - bTime.getTime()
              })

              return (
                <div key={sport}>
                  <div style={styles.sportBadge}>
                    {sportPicks[0].sport_emoji || ''} {sport}
                  </div>
                  {sortedPicks.map(pick => renderPick(pick, false))}
                </div>
              )
            })}
          </div>
        )
      })
    } else if (filterMode === 'consensus') {
      const picks = filteredPicks as ConsensusPick[]
      if (picks.length === 0) {
        return <div style={styles.noResults}>No consensus picks match your filters</div>
      }

      // Group by sport
      const sportGroups: Record<string, ConsensusPick[]> = {}
      picks.forEach(pick => {
        if (!sportGroups[pick.sport]) {
          sportGroups[pick.sport] = []
        }
        sportGroups[pick.sport].push(pick)
      })

      // Sort picks chronologically
      Object.keys(sportGroups).forEach(sport => {
        sportGroups[sport].sort((a, b) => {
          const now = new Date()
          const aTime = new Date(a.game_time)
          const bTime = new Date(b.game_time)
          const aStarted = aTime < now
          const bStarted = bTime < now
          
          if (!aStarted && bStarted) return -1
          if (aStarted && !bStarted) return 1
          return aTime.getTime() - bTime.getTime()
        })
      })

      return (
        <div style={styles.bettorSection}>
          {consensusPicks[0]?.consensus_win_streak > 0 && (
            <div style={styles.winStreakBadge}>
              🔥 {consensusPicks[0].consensus_win_streak}
              <span style={styles.winStreakTooltip}>Win streak</span>
            </div>
          )}

          <div style={styles.bettorHeader}>
            <div style={styles.bettorInfo}>
              <div style={styles.bettorName}>🤝 Consensus Picks</div>
              <div 
                style={{ ...styles.bettorRecord, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={openConsensusModal}
              >
                View Record
              </div>
            </div>
          </div>

          {Object.entries(sportGroups).map(([sport, sportPicks]) => (
            <div key={sport}>
              <div style={styles.sportBadge}>
                {sportPicks[0].sport_emoji || ''} {sport}
              </div>
              {sportPicks.map(pick => renderConsensusPick(pick))}
            </div>
          ))}
        </div>
      )
    } else if (filterMode === 'free') {
      const picks = filteredPicks as Pick[]
      if (picks.length === 0) {
        return <div style={styles.noResults}>No free picks match your filters</div>
      }

      // Sort chronologically
      const sortedPicks = [...picks].sort((a, b) => {
        const now = new Date()
        const aTime = new Date(a.game_time)
        const bTime = new Date(b.game_time)
        const aStarted = aTime < now
        const bStarted = bTime < now
        
        if (!aStarted && bStarted) return -1
        if (aStarted && !bStarted) return 1
        return aTime.getTime() - bTime.getTime()
      })

      return (
        <>
          {sortedPicks.map(pick => renderPick(pick, true))}
          
          <div style={styles.ctaCard} className="analyst-picks-cta-card">
            <h3 style={styles.ctaTitle} className="analyst-picks-cta-title">Want the rest of our best bets today?</h3>
            <p style={styles.ctaSubtitle}>Sign up now and get daily picks + analysis for just $1</p>
            <p style={styles.ctaText}>Just click below</p>
            <div style={styles.ctaArrow}>↓</div>
            <a 
              href="https://thebettinginsider.com/pricing" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.ctaButton}
            >
              Start for $1
            </a>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <>
      <style jsx>{`
        @media (max-width: 768px) {
          :global(.analyst-picks-page) {
            padding: 8rem 1rem 2rem !important;
          }
          :global(.analyst-picks-container) {
            padding: 0 !important;
            max-width: 100% !important;
          }
          :global(.analyst-picks-title) {
            font-size: 1.5rem !important;
          }
          :global(.analyst-picks-subtitle) {
            font-size: 0.8rem !important;
          }
          :global(.analyst-picks-filters) {
            gap: 0.5rem !important;
            flex-direction: column !important;
            width: 100% !important;
            padding: 0 !important;
          }
          :global(.analyst-picks-filter-dropdown) {
            width: 100% !important;
            max-width: 300px !important;
            margin: 0 auto !important;
          }
          :global(.analyst-picks-filter-button) {
            padding: 0.5rem 0.75rem !important;
            font-size: 0.8rem !important;
          }
          :global(.analyst-picks-date-bar) {
            padding: 0.4rem !important;
            margin-bottom: 1rem !important;
          }
          :global(.analyst-picks-month-label) {
            padding: 0.4rem 0.6rem !important;
            font-size: 0.75rem !important;
          }
          :global(.analyst-picks-bettor-section) {
            padding: 1rem !important;
            margin-bottom: 1.5rem !important;
          }
          :global(.analyst-picks-bettor-name) {
            font-size: 0.9rem !important;
          }
          :global(.analyst-picks-bettor-record) {
            font-size: 0.65rem !important;
          }
          :global(.analyst-picks-pick-title) {
            font-size: 0.75rem !important;
          }
          :global(.analyst-picks-unit-badge) {
            padding: 0.2rem 0.4rem !important;
            font-size: 0.7rem !important;
          }
          :global(.analyst-picks-odds-text) {
            font-size: 0.7rem !important;
          }
          :global(.analyst-picks-pick-main) {
            padding: 0.6rem 0 !important;
          }
          :global(.analyst-picks-pick-title-info) {
            gap: 0.3rem !important;
          }
          :global(.analyst-picks-pick-odds-row) {
            gap: 0.5rem !important;
          }
          :global(.analyst-picks-pick-dropdown-content) {
            padding: 0.75rem 0.25rem !important;
          }
          :global(.analyst-picks-pick-meta) {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          :global(.analyst-picks-analysis-text) {
            font-size: 0.75rem !important;
            line-height: 1.4 !important;
            max-height: 150px !important;
          }
          :global(.analyst-picks-unlock-button) {
            width: 100% !important;
            justify-content: center !important;
          }
          :global(.analyst-picks-cta-card) {
            padding: 1.5rem 1rem !important;
            margin: 2rem 0 !important;
          }
          :global(.analyst-picks-cta-title) {
            font-size: 1.1rem !important;
          }
          :global(.analyst-picks-cta-subtitle) {
            font-size: 0.85rem !important;
          }
          :global(.analyst-picks-footer) {
            padding: 0 !important;
            margin-top: 2rem !important;
          }
          :global(.analyst-picks-footer-title) {
            font-size: 0.85rem !important;
          }
          :global(.analyst-picks-footer-text) {
            font-size: 0.75rem !important;
            line-height: 1.4 !important;
          }
          :global(.analyst-picks-modal-content) {
            padding: 1.5rem !important;
            margin: 1rem !important;
          }
          :global(.analyst-picks-modal-title) {
            font-size: 1.3rem !important;
          }
          :global(.analyst-picks-modal-subtitle) {
            font-size: 0.85rem !important;
          }
          :global(.analyst-picks-consensus-filters) {
            flex-direction: column !important;
            width: 100% !important;
          }
          :global(.analyst-picks-consensus-filter-button) {
            width: 100% !important;
          }
          :global(.analyst-picks-consensus-stats) {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
        }
      `}</style>
      <div style={styles.page} className="analyst-picks-page">
        <div style={styles.container} className="analyst-picks-container">
        <header style={styles.header}>
          <h1 style={styles.title} className="analyst-picks-title">Today's Best Bets</h1>
          <p style={styles.subtitle} className="analyst-picks-subtitle">Updated live throughout the day</p>
        </header>

        {/* Filters */}
        <section style={styles.filters} className="analyst-picks-filters">
          <div style={styles.filterDropdown} className="analyst-picks-filter-dropdown">
            <button 
              style={styles.filterButton}
              className="analyst-picks-filter-button"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            >
              <span>{filterMode === 'cappers' ? 'Cappers' : filterMode === 'consensus' ? 'Consensus' : 'Free'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            {filterDropdownOpen && (
              <div style={styles.filterMenu}>
                <div 
                  style={{ ...styles.filterOption, ...(filterMode === 'cappers' ? styles.filterOptionSelected : {}) }}
                  onClick={() => { setFilterMode('cappers'); setFilterDropdownOpen(false) }}
                >
                  <input type="radio" checked={filterMode === 'cappers'} readOnly />
                  <label>Cappers</label>
                </div>
                <div 
                  style={{ ...styles.filterOption, ...(filterMode === 'consensus' ? styles.filterOptionSelected : {}) }}
                  onClick={() => { setFilterMode('consensus'); setFilterDropdownOpen(false) }}
                >
                  <input type="radio" checked={filterMode === 'consensus'} readOnly />
                  <label>Consensus</label>
                </div>
                <div 
                  style={{ ...styles.filterOption, ...(filterMode === 'free' ? styles.filterOptionSelected : {}) }}
                  onClick={() => { setFilterMode('free'); setFilterDropdownOpen(false) }}
                >
                  <input type="radio" checked={filterMode === 'free'} readOnly />
                  <label>Free</label>
                </div>
              </div>
            )}
          </div>

          <div style={styles.filterDropdown} className="analyst-picks-filter-dropdown">
            <button 
              style={styles.filterButton}
              className="analyst-picks-filter-button"
              onClick={() => setSportDropdownOpen(!sportDropdownOpen)}
            >
              <span>
                {sportFilters.length === 0 ? 'Sports' : sportFilters.length === 1 ? sportFilters[0] : `${sportFilters.length} sports`}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            {sportDropdownOpen && (
              <div style={styles.sportMenu}>
                {ALL_SPORTS.map(sport => (
                  <div 
                    key={sport}
                    style={styles.sportOption}
                    onClick={() => {
                      setSportFilters(prev => 
                        prev.includes(sport) 
                          ? prev.filter(s => s !== sport) 
                          : [...prev, sport]
                      )
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={sportFilters.includes(sport)} 
                      readOnly
                    />
                    <label>{sport}</label>
                  </div>
                ))}
                <button 
                  style={styles.clearButton}
                  onClick={() => { setSportFilters([]); setSportDropdownOpen(false) }}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Date Bar */}
        {renderDateBar()}

        {/* Main Content */}
        <main style={styles.main}>
          {renderContent()}
        </main>

        {/* Footer */}
        <footer style={styles.footer} className="analyst-picks-footer">
          <section style={styles.disclaimerSection}>
            <h3 style={styles.footerTitle} className="analyst-picks-footer-title">Sports Betting Disclaimer</h3>
            <p style={styles.footerText} className="analyst-picks-footer-text">
              All sports betting picks and predictions provided by our analysts reflect real wagers placed with their own money. 
              Please remember that betting carries inherent risk, and you should only wager what you can afford to lose. 
              Bet responsibly, and if you or someone you know is struggling with a gambling problem, seek help from a qualified professional or support service.
            </p>
          </section>

          <section style={styles.aboutSection}>
            <h3 style={styles.footerTitle} className="analyst-picks-footer-title">About Our Expert Picks</h3>
            <p style={styles.footerText} className="analyst-picks-footer-text">
              Our expert cappers break down every pick using detailed team, game, and player stats—factoring in injuries, weather, and matchup history. 
              Each play includes the units at risk and is fully tracked with a recap for full transparency. 
              Many picks are backed by long-term betting systems we've built and refined over thousands of games, identifying trends the market often misses. 
              Others come from sharp instinct—that's the edge you're paying for.
            </p>
          </section>
        </footer>
      </div>

      {/* Consensus Modal */}
      {consensusModalOpen && (
        <div style={styles.modal} onClick={closeConsensusModal}>
          <div style={styles.modalContent} className="analyst-picks-modal-content" onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={closeConsensusModal}>×</button>
            
            <h2 style={styles.modalTitle} className="analyst-picks-modal-title">🤝 Consensus Picks Performance</h2>

            <div style={styles.consensusFilters} className="analyst-picks-consensus-filters">
              <div style={{ position: 'relative' }}>
                <button 
                  style={styles.consensusFilterButton}
                  className="analyst-picks-consensus-filter-button"
                  onClick={() => setConsensusSportDropdownOpen(!consensusSportDropdownOpen)}
                >
                  <span>{consensusSportFilter}</span>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
                    <path d="M1 1l5 5 5-5"/>
                  </svg>
                </button>
                {consensusSportDropdownOpen && (
                  <div style={styles.consensusFilterMenu}>
                    {['All Sports', ...ALL_SPORTS].map(sport => (
                      <div
                        key={sport}
                        style={{
                          ...styles.consensusFilterOption,
                          ...(consensusSportFilter === sport ? styles.consensusFilterOptionSelected : {})
                        }}
                        onClick={() => {
                          setConsensusSportFilter(sport)
                          setConsensusSportDropdownOpen(false)
                        }}
                      >
                        {sport}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <button 
                  style={styles.consensusFilterButton}
                  className="analyst-picks-consensus-filter-button"
                  onClick={() => setConsensusTimeDropdownOpen(!consensusTimeDropdownOpen)}
                >
                  <span>
                    {consensusTimeFilter === 'all_time' ? 'All Time' :
                     consensusTimeFilter === 'yesterday' ? 'Yesterday' :
                     consensusTimeFilter === 'L3' ? 'Last 3 Days' :
                     consensusTimeFilter === 'L7' ? 'Last 7 Days' :
                     'Last 30 Days'}
                  </span>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
                    <path d="M1 1l5 5 5-5"/>
                  </svg>
                </button>
                {consensusTimeDropdownOpen && (
                  <div style={styles.consensusFilterMenu}>
                    {[
                      { value: 'all_time', label: 'All Time' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'L3', label: 'Last 3 Days' },
                      { value: 'L7', label: 'Last 7 Days' },
                      { value: 'L30', label: 'Last 30 Days' }
                    ].map(option => (
                      <div
                        key={option.value}
                        style={{
                          ...styles.consensusFilterOption,
                          ...(consensusTimeFilter === option.value ? styles.consensusFilterOptionSelected : {})
                        }}
                        onClick={() => {
                          setConsensusTimeFilter(option.value as ConsensusTimeFilter)
                          setConsensusTimeDropdownOpen(false)
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.consensusStats} className="analyst-picks-consensus-stats">
              <div style={styles.consensusStatItem}>
                <div style={styles.consensusStatNumber}>
                  {consensusStats.wins}-{consensusStats.losses}{consensusStats.pushes > 0 ? `-${consensusStats.pushes}` : ''}
                </div>
                <div style={styles.consensusStatLabel}>Record</div>
              </div>
              <div style={styles.consensusStatItem}>
                <div style={{
                  ...styles.consensusStatNumber,
                  color: consensusStats.winRate >= 60 ? '#34d399' : consensusStats.winRate < 50 ? '#f87171' : '#fff'
                }}>
                  {consensusStats.winRate}%
                </div>
                <div style={styles.consensusStatLabel}>Win Rate</div>
              </div>
              <div style={styles.consensusStatItem}>
                <div style={{
                  ...styles.consensusStatNumber,
                  color: consensusStats.netUnits >= 0 ? '#34d399' : '#f87171'
                }}>
                  {consensusStats.netUnits >= 0 ? '+' : ''}{consensusStats.netUnits.toFixed(1)}u
                </div>
                <div style={styles.consensusStatLabel}>Net Units</div>
              </div>
            </div>

            <div style={styles.consensusPicksList}>
              <h3 style={styles.consensusPicksListTitle}>Past Picks</h3>
              {filteredConsensusPicks.length === 0 ? (
                <div style={styles.noResults}>No consensus picks found for selected filters</div>
              ) : (
                filteredConsensusPicks.map(pick => {
                  let bettors = pick.bettors
                  if (typeof bettors === 'string') {
                    try {
                      bettors = JSON.parse(bettors)
                    } catch {
                      bettors = []
                    }
                  }

                  const bettorText = Array.isArray(bettors) && bettors.length > 0
                    ? bettors.map(b => `${b.bettor_name} (${b.units}u)`).join(', ')
                    : 'No bettor details'

                  const date = new Date(pick.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })

                  let cardClass = styles.consensusPickCard
                  let resultBadge = null

                  if (pick.result === 'won') {
                    cardClass = { ...styles.consensusPickCard, ...styles.consensusPickCardWin }
                    resultBadge = <span style={styles.resultBadgeWin}>WIN</span>
                  } else if (pick.result === 'lost') {
                    cardClass = { ...styles.consensusPickCard, ...styles.consensusPickCardLoss }
                    resultBadge = <span style={styles.resultBadgeLoss}>LOSS</span>
                  } else if (pick.result === 'push') {
                    resultBadge = <span style={styles.resultBadgePending}>PUSH</span>
                  }

                  return (
                    <div key={pick.id} style={cardClass}>
                      <div style={styles.consensusPickCardHeader}>
                        <div style={styles.consensusPickCardInfo}>
                          <div style={styles.consensusPickCardTitle}>
                            {pick.sport_emoji || ''} {pick.bet_title}
                          </div>
                          <div style={styles.consensusPickCardMeta}>
                            <span>{pick.total_units}u</span>
                            <span>{pick.odds}</span>
                            <span>{pick.sportsbook}</span>
                            <span>{date}</span>
                          </div>
                        </div>
                        {resultBadge}
                      </div>
                      <div style={styles.consensusPickCardDetails}>
                        Backed by: {bettorText}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '10rem 1rem 2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#ffffff',
    width: '100%',
    background: 'transparent'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '0 0.5rem'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '800',
    lineHeight: 1,
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic'
  },
  filters: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap' as const
  },
  filterDropdown: {
    position: 'relative' as const,
    width: '180px'
  },
  filterButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #1e2a47, #3b4a72)',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    transition: 'all 0.3s'
  },
  filterMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '0.5rem',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    padding: '0.5rem',
    zIndex: 100,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
  },
  filterOption: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: '0.2s',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    gap: '0.5rem',
    fontSize: '0.8rem'
  },
  filterOptionSelected: {
    background: '#3b82f6',
    color: '#fff'
  },
  sportMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '0.5rem',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    padding: '0.5rem',
    zIndex: 100,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    maxHeight: '400px',
    overflowY: 'auto' as const
  },
  sportOption: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: '0.2s',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    gap: '0.5rem',
    fontSize: '0.8rem'
  },
  clearButton: {
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.75rem',
    transition: '0.3s'
  },
  dateBar: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    overflow: 'hidden'
  },
  monthLabel: {
    background: '#334155',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.85rem',
    flexShrink: 0,
    marginTop: '20px'
  },
  datesContainer: {
    flex: 1,
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
    WebkitOverflowScrolling: 'touch' as const,
    scrollbarWidth: 'none' as const
  },
  dateScrollWrapper: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.25rem 0'
  },
  dateItem: {
    position: 'relative' as const,
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
    paddingTop: '15px',
    marginTop: '5px'
  },
  dateItemToday: {},
  dateItemSelected: {},
  pickCount: {
    position: 'absolute' as const,
    top: '-5px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#10b981',
    color: '#fff',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    fontWeight: '700',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  dateNumber: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.8)',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '600',
    minWidth: '35px',
    transition: 'all 0.2s'
  },
  dateNumberToday: {
    background: '#3b82f6',
    color: '#fff'
  },
  dateNumberSelected: {
    background: '#60a5fa',
    color: '#fff'
  },
  main: {
    marginBottom: '2rem'
  },
  bettorSection: {
    marginBottom: '2rem',
    position: 'relative' as const,
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '1.5rem',
    borderRadius: '12px'
  },
  winStreakBadge: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    background: 'linear-gradient(135deg, #c2410c, #d97706)',
    color: '#fff',
    padding: '0.3rem 0.5rem',
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: '700',
    boxShadow: '0 2px 6px rgba(194, 65, 12, 0.3)',
    cursor: 'pointer',
    transition: '0.3s'
  },
  winStreakTooltip: {
    display: 'none'
  },
  unlockWidgetButton: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    transition: '0.3s'
  },
  bettorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
  },
  bettorInfo: {
    flex: 1
  },
  bettorName: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '0.25rem'
  },
  bettorRecord: {
    fontSize: '0.65rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500'
  },
  sportBadge: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  pickCard: {
    marginBottom: '0.75rem',
    position: 'relative' as const,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    transition: '0.3s'
  },
  pickCardWin: {
    opacity: 0.8,
    background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.05))'
  },
  pickCardLoss: {
    opacity: 0.8,
    background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.05))'
  },
  pickMain: {
    padding: '0.75rem 0',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem'
  },
  pickTitleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1,
    minWidth: 0
  },
  unitBadge: {
    background: '#10b981',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '700',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0
  },
  pickTitle: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  pickTitleLocked: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#fbbf24',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem'
  },
  lockIcon: {
    width: '14px',
    height: '14px'
  },
  pickOddsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexShrink: 0
  },
  oddsText: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    whiteSpace: 'nowrap' as const
  },
  resultBadgeWin: {
    background: '#10b981',
    color: '#fff',
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700'
  },
  resultBadgeLoss: {
    background: '#ef4444',
    color: '#fff',
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700'
  },
  resultBadgePending: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.9)',
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700'
  },
  dropdownArrow: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: '0.3s'
  },
  pickDropdown: {
    overflow: 'hidden',
    transition: '0.4s'
  },
  pickDropdownContent: {
    padding: '1rem 0.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
    marginTop: '0.5rem'
  },
  pickTitleFull: {
    fontSize: '0.85rem',
    color: '#fff',
    fontWeight: '600',
    marginBottom: '0.75rem',
    lineHeight: 1.2
  },
  pickTags: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.75rem'
  },
  freeBadge: {
    background: '#10b981',
    color: '#fff',
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },
  consensusBadge: {
    background: '#8b5cf6',
    color: '#fff',
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },
  divider: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    marginBottom: '0.75rem'
  },
  analysisText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.8rem',
    lineHeight: 1.4,
    marginBottom: '0.75rem',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
    maxHeight: '200px',
    overflowY: 'auto' as const,
    paddingRight: '0.5rem'
  },
  analysisLocked: {
    color: '#fbbf24',
    fontSize: '0.8rem',
    textAlign: 'center' as const,
    padding: '1.5rem',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px dashed rgba(245, 158, 11, 0.3)',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem'
  },
  lockIconLarge: {
    width: '28px',
    height: '28px'
  },
  unlockButton: {
    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    transition: '0.3s'
  },
  bettorAttribution: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem',
    fontStyle: 'italic'
  },
  pickMeta: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)',
    flexWrap: 'wrap' as const
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem'
  },
  noResults: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem'
  },
  ctaCard: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.1))',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '16px',
    padding: '2rem',
    margin: '2.5rem 0',
    textAlign: 'center' as const,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)'
  },
  ctaTitle: {
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#60a5fa',
    marginBottom: '0.5rem'
  },
  ctaSubtitle: {
    fontSize: '0.9rem',
    lineHeight: 1.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '1.5rem'
  },
  ctaText: {
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '1rem',
    fontWeight: '500'
  },
  ctaArrow: {
    fontSize: '1.2rem',
    color: '#60a5fa',
    marginBottom: '1rem'
  },
  ctaButton: {
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: '#fff',
    padding: '0.8rem 2rem',
    borderRadius: '12px',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
    transition: '0.3s'
  },
  footer: {
    marginTop: '3rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.15)'
  },
  disclaimerSection: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  aboutSection: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '10px',
    padding: '1rem'
  },
  footerTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: '0.5rem'
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 1.5,
    fontSize: '0.8rem'
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  },
  modalContent: {
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    border: '2px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '20px',
    padding: '2rem',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    position: 'relative' as const,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
  },
  modalClose: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    textAlign: 'center' as const,
    marginBottom: '0.5rem',
    color: '#a78bfa'
  },
  consensusFilters: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap' as const
  },
  consensusFilterButton: {
    background: 'linear-gradient(135deg, #1e2a47, #3b4a72)',
    color: '#fff',
    padding: '0.5rem 0.8rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: '0.3s'
  },
  consensusFilterMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '0.5rem',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '0.5rem',
    minWidth: '160px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    zIndex: 10
  },
  consensusFilterOption: {
    padding: '0.4rem 0.6rem',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: '0.2s',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.75rem'
  },
  consensusFilterOptionSelected: {
    background: '#8b5cf6',
    color: '#fff'
  },
  consensusStats: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.1))',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '10px',
    padding: '0.8rem',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap' as const
  },
  consensusStatItem: {
    textAlign: 'center' as const
  },
  consensusStatNumber: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#fff'
  },
  consensusStatLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: '0.25rem'
  },
  consensusPicksList: {
    paddingRight: '0.5rem'
  },
  consensusPicksListTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center' as const,
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    marginBottom: '1rem',
    paddingBottom: '0.5rem'
  },
  consensusPickCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    transition: '0.3s'
  },
  consensusPickCardWin: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))'
  },
  consensusPickCardLoss: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(248, 113, 113, 0.05))'
  },
  consensusPickCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  consensusPickCardInfo: {
    flex: 1
  },
  consensusPickCardTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '0.25rem'
  },
  consensusPickCardMeta: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const
  },
  consensusPickCardDetails: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: '0.5rem',
    fontStyle: 'italic'
  }
}

