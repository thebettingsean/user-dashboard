'use client'

import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useRouter } from 'next/navigation'
import styles from '../sportSelector.module.css'

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
}

export default function AllSportsPicksPage() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const { openSignUp } = useClerk()
  const { hasAccess } = useSubscription()

  const [allPicks, setAllPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({})
  const [expandedPicks, setExpandedPicks] = useState<Set<string>>(new Set())

  // Helper: Format date
  const formatDateString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // Helper: Check if same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  // Fetch picks for current date
  useEffect(() => {
    async function fetchPicks() {
      setLoading(true)
      try {
        const dateStr = formatDateString(currentDate)
        
        // Fetch picks from all sports
        const { data, error } = await supabase
          .from('analyst_picks')
          .select('*')
          .eq('date', dateStr)
          .order('created_at', { ascending: false })

        if (error) throw error

        setAllPicks(data || [])
      } catch (error) {
        console.error('Error fetching picks:', error)
        setAllPicks([])
      } finally {
        setLoading(false)
      }
    }

    fetchPicks()
  }, [currentDate])

  // Fetch pick counts for calendar
  useEffect(() => {
    async function fetchPickCounts() {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const dates: string[] = []
        for (let i = 0; i < 30; i++) {
          const date = new Date(today)
          date.setDate(today.getDate() + i)
          dates.push(formatDateString(date))
        }

        const { data, error } = await supabase
          .from('analyst_picks')
          .select('date')
          .in('date', dates)

        if (error) throw error

        const counts: Record<string, number> = {}
        data?.forEach((pick: any) => {
          counts[pick.date] = (counts[pick.date] || 0) + 1
        })

        setPickCounts(counts)
      } catch (error) {
        console.error('Error fetching pick counts:', error)
      }
    }

    fetchPickCounts()
  }, [])

  const selectDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(year, month - 1, day))
  }

  const togglePickAnalysis = (pickId: string) => {
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

  // Group picks by capper
  const picksByCapper = allPicks.reduce((acc, pick) => {
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

  const capperGroups = Object.values(picksByCapper).sort((a: any, b: any) => {
    // Sort by win streak, then by number of picks
    if (b.winStreak !== a.winStreak) return b.winStreak - a.winStreak
    return b.picks.length - a.picks.length
  })

  // Render calendar
  const renderCalendar = () => {
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
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        overflow: 'hidden'
      }}>
        <button 
          style={{
            background: '#334155',
            color: '#fff',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '0.85rem',
            flexShrink: 0,
            marginTop: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {months[today.getMonth()]}
        </button>
        <div style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}>
          <div style={{
            display: 'flex',
            gap: '0.3rem',
            padding: '0.25rem 0'
          }}>
            {dates.map((date, index) => {
              const dateStr = formatDateString(date)
              const count = pickCounts[dateStr] || 0
              const isToday = index === 0
              const isSelected = isSameDay(date, currentDate)

              return (
                <div
                  key={dateStr}
                  onClick={() => selectDate(dateStr)}
                  style={{
                    position: 'relative',
                    flexShrink: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    paddingTop: '15px',
                    marginTop: '5px'
                  }}
                >
                  {count > 0 && (
                    <div style={{
                      position: 'absolute',
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
                    }}>
                      {count}
                    </div>
                  )}
                  <div style={{
                    background: isSelected ? '#60a5fa' : isToday ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                    color: isSelected || isToday ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    minWidth: '35px',
                    transition: 'all 0.2s'
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

  return (
    <div className={`${styles.page} allSportsPicksPage`}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => router.push('/sports')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Back to Sports
          </button>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: 0
          }}>
            All Sports Picks
          </h1>
          <div style={{ width: '100px' }} />
        </div>

        {/* Calendar */}
        {renderCalendar()}
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 40px' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem'
          }}>
            Loading picks...
          </div>
        ) : capperGroups.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginBottom: '0.5rem' }}>
              No picks for this date
            </div>
            <div style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Try selecting a different date
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {capperGroups.map((capper: any) => (
              <div
                key={capper.name}
                style={{
                  background: 'rgba(17, 27, 45, 0.92)',
                  borderRadius: '18px',
                  padding: '16px 18px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  boxShadow: '0 16px 36px rgba(3, 7, 18, 0.35)'
                }}
              >
                {/* Capper Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Profile Image/Initials */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {capper.profileInitials || '?'}
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#ffffff'
                    }}>
                      {capper.name}
                    </span>
                  </div>
                  
                  {capper.winStreak > 0 && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#fb923c',
                      background: 'rgba(251, 146, 60, 0.16)',
                      border: '1px solid rgba(251, 146, 60, 0.35)',
                      borderRadius: '999px',
                      padding: '4px 10px'
                    }}>
                      🔥 {capper.winStreak}
                    </span>
                  )}
                </div>
                
                {capper.record && (
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'rgba(226, 232, 240, 0.85)',
                    marginBottom: '10px'
                  }}>
                    {capper.record}
                  </div>
                )}

                {/* Picks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {capper.picks.map((pick: Pick) => {
                    const isExpanded = expandedPicks.has(pick.id)
                    
                    return (
                      <div
                        key={pick.id}
                        style={{
                          borderRadius: '14px',
                          border: '1px solid rgba(148, 163, 184, 0.18)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '12px 14px'
                        }}
                      >
                        {/* Pick Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: 'rgba(226, 232, 240, 0.9)',
                            background: pick.units > 1.5 ? 'rgba(234, 88, 12, 0.25)' : 'rgba(99, 102, 241, 0.18)',
                            border: `1px solid ${pick.units > 1.5 ? 'rgba(251, 146, 60, 0.5)' : 'rgba(129, 140, 248, 0.35)'}`,
                            borderRadius: '999px',
                            padding: '3px 12px',
                            fontWeight: '600',
                            color: pick.units > 1.5 ? 'rgba(251, 146, 60, 0.95)' : 'rgba(226, 232, 240, 0.9)'
                          }}>
                            {pick.odds} | {pick.units.toFixed(1)}u
                          </div>
                        </div>

                        {/* Matchup */}
                        {(pick.away_team || pick.home_team) && (
                          <div style={{
                            fontSize: '11px',
                            color: 'rgba(226, 232, 240, 0.65)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            marginBottom: '8px'
                          }}>
                            {pick.away_team} @ {pick.home_team}
                          </div>
                        )}

                        {/* Bet Title */}
                        <p style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          fontWeight: '700',
                          lineHeight: '1.4',
                          color: hasAccess ? '#f8fafc' : 'transparent',
                          filter: hasAccess ? 'none' : 'blur(6px)',
                          userSelect: hasAccess ? 'auto' : 'none'
                        }}>
                          {pick.bet_title}
                        </p>

                        {/* Footer */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          color: 'rgba(203, 213, 225, 0.7)'
                        }}>
                          {hasAccess ? (
                            <>
                              <button
                                onClick={() => togglePickAnalysis(pick.id)}
                                style={{
                                  fontWeight: '600',
                                  color: '#8b5cf6',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  padding: 0
                                }}
                              >
                                Analysis {isExpanded ? '▲' : '▼'}
                              </button>
                              <span>{pick.game_time}</span>
                            </>
                          ) : (
                            <>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                filter: 'blur(6px)',
                                userSelect: 'none'
                              }}>
                                🔒 <span style={{ fontSize: '0.875rem' }}>Analysis</span>
                              </div>
                              <span 
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  cursor: !isSignedIn ? 'pointer' : 'default'
                                }}
                                onClick={() => !isSignedIn && openSignUp()}
                              >
                                {!isSignedIn ? 'Sign up to view' : 'Get sub to view'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Analysis */}
                        {hasAccess && isExpanded && pick.analysis && (
                          <div
                            style={{
                              marginTop: '10px',
                              paddingTop: '10px',
                              borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                              color: '#ffffff',
                              fontSize: '12px',
                              lineHeight: '1.5'
                            }}
                            dangerouslySetInnerHTML={{ __html: pick.analysis }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

