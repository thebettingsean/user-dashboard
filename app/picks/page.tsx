'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { IoTicketOutline } from 'react-icons/io5'
import { FaLock, FaFireAlt } from 'react-icons/fa'
import { FiChevronDown } from 'react-icons/fi'
import styles from './picks.module.css'

type Pick = {
  id: string
  bet_title: string
  odds: string
  units: number
  game_time: string
  game_id: string
  result: string
  bettor_id: string
  bettor_name: string
  bettor_record: string
  bettor_win_streak: number
  bettor_profile_initials: string
  bettor_profile_image: string | null
  sport: string
  away_team: string | null
  home_team: string | null
  analysis: string
  date: string
}

// Bettor Profile Image Component
function BettorProfileImage({ imageUrl, initials, size = 36 }: { imageUrl: string | null; initials: string | null; size?: number }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Bettor"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(71, 85, 105, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.8)',
        flexShrink: 0
      }}
    >
      {initials || '?'}
    </div>
  )
}

export default function PicksPage() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { hasAccess } = useSubscription()
  
  const [allPicks, setAllPicks] = useState<Pick[]>([])
  const [isLoadingPicks, setIsLoadingPicks] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedPicks, setExpandedPicks] = useState<Set<string>>(new Set())
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({})
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  // Helper functions
  const formatDateString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // Calculate net win/loss from odds and result
  const calculateNetUnits = (units: number, odds: string, result: string): number => {
    if (!result || result === 'pending' || result === 'push') return 0
    
    const isWin = result === 'won' || result === 'win'
    const isLoss = result === 'lost' || result === 'loss'
    
    if (!isWin && !isLoss) return 0
    
    let oddsNumeric: number
    if (odds.startsWith('+')) {
      oddsNumeric = parseInt(odds.substring(1))
      return isWin ? parseFloat((units * (oddsNumeric / 100)).toFixed(2)) : -units
    } else if (odds.startsWith('-')) {
      oddsNumeric = parseInt(odds.substring(1))
      return isWin ? parseFloat((units * (100 / oddsNumeric)).toFixed(2)) : -units
    } else {
      // Default to -110 if no sign
      return isWin ? parseFloat((units * (100 / 110)).toFixed(2)) : -units
    }
  }

  // Check if date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }


  const togglePickAnalysis = (pickId: string) => {
    // Only allow expanding if user is signed in and has access
    if (!isSignedIn || !hasAccess) {
      if (!isSignedIn) {
        openSignUp()
      } else if (!hasAccess) {
        router.push('/pricing')
      }
      return
    }
    
    setExpandedPicks((prev) => {
      const next = new Set(prev)
      if (next.has(pickId)) {
        next.delete(pickId)
      } else {
        next.add(pickId)
      }
      return next
    })
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setDateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)
    
    if (dateToCheck.getTime() === today.getTime()) {
      return 'Today'
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateToCheck.getTime() === yesterday.getTime()) {
      return 'Yesterday'
    }
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateToCheck.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handleDateSelect = (day: number) => {
    // Block non-subscribed users from selecting dates
    if (!isSignedIn || !hasAccess) {
      if (!isSignedIn) {
        openSignUp()
      } else if (!hasAccess) {
        router.push('/pricing')
      }
      setDateDropdownOpen(false)
      return
    }
    
    const newDate = new Date(currentDate)
    newDate.setDate(day)
    setCurrentDate(newDate)
    setDateDropdownOpen(false)
  }

  const handlePrevMonth = () => {
    // Block non-subscribed users from navigating months
    if (!isSignedIn || !hasAccess) {
      if (!isSignedIn) {
        openSignUp()
      } else if (!hasAccess) {
        router.push('/pricing')
      }
      setDateDropdownOpen(false)
      return
    }
    
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const handleNextMonth = () => {
    // Block non-subscribed users from navigating months
    if (!isSignedIn || !hasAccess) {
      if (!isSignedIn) {
        openSignUp()
      } else if (!hasAccess) {
        router.push('/pricing')
      }
      setDateDropdownOpen(false)
      return
    }
    
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  const isSelected = (day: number) => {
    // Check if this day matches the selected date (currentDate)
    return day === currentDate.getDate()
  }

  // Fetch pick counts for the current month
  useEffect(() => {
    async function fetchMonthPickCounts() {
      try {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const start = new Date(year, month, 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(year, month + 1, 0)
        end.setHours(23, 59, 59, 999)
        
        const { data, error } = await supabase
          .from('picks')
          .select('game_time')
          .gte('game_time', start.toISOString())
          .lte('game_time', end.toISOString())

        if (error) throw error

        // Count picks per day
        const counts: Record<string, number> = {}
        if (data) {
          data.forEach(pick => {
            const pickDate = new Date(pick.game_time)
            const dateStr = formatDateString(pickDate)
            counts[dateStr] = (counts[dateStr] || 0) + 1
          })
        }
        
        setPickCounts(counts)
      } catch (error) {
        console.error('Error fetching month pick counts:', error)
        setPickCounts({})
      }
    }

    fetchMonthPickCounts()
  }, [currentDate.getFullYear(), currentDate.getMonth()])

  // Lock date to today for non-subscribed users
  useEffect(() => {
    if (!isSignedIn || !hasAccess) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const currentDateOnly = new Date(currentDate)
      currentDateOnly.setHours(0, 0, 0, 0)
      
      // If currentDate is not today, reset it to today
      if (currentDateOnly.getTime() !== today.getTime()) {
        setCurrentDate(today)
      }
    }
  }, [isSignedIn, hasAccess, currentDate])

  // Fetch picks data
  useEffect(() => {
    async function fetchPicks() {
      setIsLoadingPicks(true)
      try {
        const targetDate = currentDate
        const start = new Date(targetDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(targetDate)
        end.setHours(23, 59, 59, 999)
        
        const { data, error } = await supabase
          .from('picks')
          .select('*, bettors(name, record, win_streak, profile_initials, profile_image)')
          .gte('game_time', start.toISOString())
          .lte('game_time', end.toISOString())
          .order('game_time', { ascending: true })

        if (error) throw error

        const picks = (data || []).map(p => ({
          ...p,
          id: p.id,
          bet_title: p.bet_title || '',
          odds: p.odds || '',
          units: p.units || 0,
          game_time: p.game_time || '',
          game_id: p.game_id || '',
          result: p.result || 'pending',
          bettor_id: p.bettor_id || '',
          bettor_name: p.bettors?.name || 'Unknown',
          bettor_record: p.bettors?.record || '',
          bettor_win_streak: p.bettors?.win_streak || 0,
          bettor_profile_initials: p.bettors?.profile_initials || '??',
          bettor_profile_image: p.bettors?.profile_image || null,
          sport: p.sport || '',
          away_team: null,
          home_team: null,
          analysis: p.analysis || '',
          date: formatDateString(targetDate)
        }))

        // Sort by bettor name, then by game time
        picks.sort((a, b) => {
          if (a.bettor_name !== b.bettor_name) {
            return a.bettor_name.localeCompare(b.bettor_name)
          }
          return new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
        })

        setAllPicks(picks)
      } catch (error) {
        console.error('Error fetching picks:', error)
        setAllPicks([])
      } finally {
        setIsLoadingPicks(false)
      }
    }

    fetchPicks()
  }, [currentDate])


  // Filter picks by selected sport
  const filteredPicks = selectedSport === 'all' 
    ? allPicks 
    : allPicks.filter(pick => {
        const pickSport = pick.sport?.toLowerCase() || ''
        const selected = selectedSport.toLowerCase()
        
        // Handle sport name variations
        if (selected === 'cfb') {
          return pickSport === 'cfb' || pickSport === 'ncaaf'
        }
        if (selected === 'cbb') {
          return pickSport === 'cbb' || pickSport === 'ncaab'
        }
        
        return pickSport === selected
      })

  // Group picks by capper
  const picksByCapper = filteredPicks.reduce((acc, pick) => {
    const capperName = pick.bettor_name || 'Unknown'
    if (!acc[capperName]) {
      acc[capperName] = {
        name: capperName,
        record: pick.bettor_record || '',
        winStreak: pick.bettor_win_streak || 0,
        profileImage: pick.bettor_profile_image,
        profileInitials: pick.bettor_profile_initials,
        picks: []
      }
    }
    acc[capperName].picks.push(pick)
    return acc
  }, {} as Record<string, any>)

  // Sort cappers by win streak (descending), then by record win percentage
  const cappers = Object.values(picksByCapper).sort((a: any, b: any) => {
    // First sort by win streak
    if (b.winStreak !== a.winStreak) {
      return b.winStreak - a.winStreak
    }
    
    // Then by record (extract wins and calculate percentage)
    const parseRecord = (record: string) => {
      if (!record) return 0
      const match = record.match(/(\d+)-(\d+)/)
      if (!match) return 0
      const wins = parseInt(match[1])
      const losses = parseInt(match[2])
      const total = wins + losses
      return total > 0 ? wins / total : 0
    }
    
    return parseRecord(b.record) - parseRecord(a.record)
  })

  return (
    <div className={styles.container}>
      <div className={styles.headerSpacer} />
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Today's Picks</h1>
            </div>
            <p className={styles.subtitle}>Expert picks and analysis from our top analysts.</p>
          </div>
        </div>
        
        <div className={styles.filtersRow}>
          {/* Left side: Sport Filters */}
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
          
          {/* Right side: Date Dropdown */}
          <div className={styles.rightFilters}>
            <div className={styles.dateDropdown} ref={dateDropdownRef}>
              <button 
                className={styles.dateDropdownBtn}
                onClick={() => {
                  if (!isSignedIn || !hasAccess) {
                    if (!isSignedIn) {
                      openSignUp()
                    } else if (!hasAccess) {
                      router.push('/pricing')
                    }
                    return
                  }
                  setDateDropdownOpen(!dateDropdownOpen)
                }}
                style={!isSignedIn || !hasAccess ? { 
                  opacity: 0.6, 
                  cursor: 'not-allowed' 
                } : {}}
              >
                {formatDateDisplay(currentDate)}
                <FiChevronDown className={`${styles.dateDropdownIcon} ${dateDropdownOpen ? styles.rotated : ''}`} />
              </button>
              {dateDropdownOpen && (
                <div className={styles.dateDropdownMenu}>
                  <div className={styles.calendarHeader}>
                    <button 
                      className={styles.calendarNavBtn}
                      onClick={handlePrevMonth}
                    >
                      ←
                    </button>
                    <div className={styles.calendarMonthYear}>
                      {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <button 
                      className={styles.calendarNavBtn}
                      onClick={handleNextMonth}
                    >
                      →
                    </button>
                  </div>
                  <div className={styles.calendarWeekdays}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className={styles.calendarWeekday}>{day}</div>
                    ))}
                  </div>
                  <div className={styles.calendarGrid}>
                    {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                      <div key={`empty-${i}`} className={styles.calendarDayEmpty} />
                    ))}
                    {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1).map(day => {
                      const dateStr = formatDateString(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
                      const count = pickCounts[dateStr] || 0
                      return (
                        <button
                          key={day}
                          className={`${styles.calendarDay} ${isToday(day) ? styles.calendarDayToday : ''} ${isSelected(day) ? styles.calendarDaySelected : ''}`}
                          onClick={() => handleDateSelect(day)}
                        >
                          <span className={styles.calendarDayNumber}>{day}</span>
                          {count > 0 && (
                            <span className={styles.calendarDayCount}>{count}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Content Section - Similar to public-betting */}
      <div className={styles.contentSection}>
        {isLoadingPicks ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingText}>Loading picks...</div>
          </div>
        ) : (
          <>
            {/* All Picks in One Box - Grouped by Capper */}
            {cappers.length === 0 ? (
              <div className={styles.emptyState}>
                <IoTicketOutline className={styles.emptyIcon} />
                <div className={styles.emptyTitle}>No picks for today</div>
                <div className={styles.emptySubtitle}>Check back later for new picks</div>
              </div>
            ) : (
              <div className={styles.picksContainer}>
                {cappers.map((capper, capperIndex) => (
                  <div key={capper.name} className={styles.capperSection}>
                    {/* Capper Header */}
                    <div className={styles.capperSectionHeader}>
                      <div className={styles.capperSectionHeaderLeft}>
                        <BettorProfileImage 
                          imageUrl={capper.profileImage} 
                          initials={capper.profileInitials}
                          size={36}
                        />
                        <div className={styles.capperSectionInfo}>
                          <span className={styles.capperSectionName}>{capper.name}</span>
                          {capper.record && (
                            <span className={styles.capperSectionRecord}>{capper.record}</span>
                          )}
                        </div>
                        {capper.winStreak > 0 && (
                          <span className={styles.capperSectionStreak}>
                            <FaFireAlt className={styles.capperSectionStreakIcon} />
                            {capper.winStreak}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Capper's Picks */}
                    <div className={styles.capperPicksList}>
                      {capper.picks.map((pick: Pick) => {
                        const isExpanded = expandedPicks.has(pick.id)
                        return (
                          <div 
                            key={pick.id} 
                            className={styles.pickCard}
                          >
                            <div 
                              className={styles.pickCardMain}
                              onClick={() => togglePickAnalysis(pick.id)}
                            >
                              <div className={styles.pickBodyLeft}>
                                {(pick.away_team || pick.home_team) && (
                                  <div className={styles.pickMatchup}>
                                    {pick.away_team ?? 'Away'} @ {pick.home_team ?? 'Home'}
                                  </div>
                                )}
                                <div className={styles.pickTitleRow}>
                                  {!isSignedIn || !hasAccess ? (
                                    <div className={styles.pickAnalysisLocked}>
                                      <FaLock className={styles.lockIcon} />
                                      <p className={styles.pickTitle} style={{ filter: 'blur(6px)', userSelect: 'none' }}>
                                        {pick.bet_title}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className={styles.pickTitle}>
                                      {pick.bet_title}
                                    </p>
                                  )}
                                </div>
                                <div className={styles.pickFooter}>
                                  <span 
                                    className={styles.pickTime}
                                    style={!isSignedIn || !hasAccess ? { filter: 'blur(6px)', userSelect: 'none' } : {}}
                                  >
                                    {new Date(pick.game_time).toLocaleString('en-US', {
                                      timeZone: 'America/New_York',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.pickRightSide}>
                                {(() => {
                                  const isPast = isPastDate(new Date(pick.game_time))
                                  const hasResult = pick.result && pick.result !== 'pending'
                                  const netUnits = hasResult ? calculateNetUnits(pick.units, pick.odds, pick.result) : null
                                  const isWin = hasResult && (pick.result === 'won' || pick.result === 'win')
                                  const isLoss = hasResult && (pick.result === 'lost' || pick.result === 'loss')
                                  
                                  // For past dates with results, show odds and net win/loss
                                  if (isPast && hasResult && netUnits !== null) {
                                    return (
                                      <div 
                                        className={styles.pickHeaderMeta}
                                        style={isWin ? {
                                          background: 'rgba(34, 197, 94, 0.15)',
                                          borderColor: 'rgba(34, 197, 94, 0.3)',
                                          color: '#10b981'
                                        } : isLoss ? {
                                          background: 'rgba(248, 113, 113, 0.15)',
                                          borderColor: 'rgba(248, 113, 113, 0.3)',
                                          color: '#ef4444'
                                        } : {}}
                                      >
                                        {pick.odds} | {netUnits >= 0 ? '+' : ''}{netUnits.toFixed(2)}u
                                      </div>
                                    )
                                  }
                                  
                                  // For future/pending picks, show odds and units risked
                                  return (
                                    <div 
                                      className={styles.pickHeaderMeta}
                                      style={pick.units > 1.5 ? { 
                                        background: 'rgba(29, 37, 48, 0.5)', 
                                        borderColor: 'rgba(251, 146, 60, 0.3)',
                                        color: 'rgba(251, 146, 60, 0.9)'
                                      } : {}}
                                    >
                                      {pick.odds} | {pick.units.toFixed(1)}u
                                    </div>
                                  )
                                })()}
                                <div className={styles.pickExpandIconWrapper}>
                                  <FiChevronDown className={`${styles.pickExpandIcon} ${isExpanded ? styles.expanded : ''}`} />
                                </div>
                              </div>
                            </div>
                            {pick.analysis && (
                              <>
                                {!isSignedIn || !hasAccess ? (
                                  <div
                                    className={`${styles.pickAnalysisContent} ${isExpanded ? styles.expanded : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (!isSignedIn) {
                                        openSignUp()
                                      } else if (!hasAccess) {
                                        router.push('/pricing')
                                      }
                                    }}
                                    style={{ 
                                      filter: 'blur(6px)', 
                                      userSelect: 'none',
                                      cursor: 'pointer'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: pick.analysis }}
                                  />
                                ) : (
                                  <div
                                    className={`${styles.pickAnalysisContent} ${isExpanded ? styles.expanded : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                    dangerouslySetInnerHTML={{ __html: pick.analysis }}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Separator between cappers (except last) */}
                    {capperIndex < cappers.length - 1 && (
                      <div className={styles.capperSeparator} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
