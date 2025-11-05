'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '../lib/supabase'
import { HiOutlineTrophy } from "react-icons/hi2"
import { GiTwoCoins } from "react-icons/gi"
import { TiMinusOutline } from 'react-icons/ti'
import { GoPlusCircle } from 'react-icons/go'
import { ChevronDown, ChevronRight, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Pick {
  id: string
  sport: string
  bet_title: string
  units: number
  odds: string
  bettor_id: string
  bettor_name?: string
  analysis: string
  game_time: string
  result: string
}

interface TopInsiderPicksProps {
  isCollapsible?: boolean
  defaultExpanded?: boolean
}

export default function TopInsiderPicks({ isCollapsible = true, defaultExpanded = true }: TopInsiderPicksProps) {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [expandedWriteups, setExpandedWriteups] = useState<Set<string>>(new Set())
  const [unlockedPicks, setUnlockedPicks] = useState<string[]>([])
  const [hasAllDayAccess, setHasAllDayAccess] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [unlocking, setUnlocking] = useState<string | null>(null)

  useEffect(() => {
    fetchPicks()
  }, [])

  useEffect(() => {
    if (isSignedIn && picks.length > 0) {
      checkAccess()
    }
  }, [isSignedIn, picks])

  async function fetchPicks() {
    try {
      console.log('🎯 [TopInsiderPicks] Fetching picks...')
      const now = new Date()
      
      // Get all active picks (result = 'pending')
      const { data, error } = await supabase
        .from('picks')
        .select('*, bettors(name)')
        .eq('result', 'pending')
        .gte('game_time', now.toISOString()) // Only future games
        .order('game_time', { ascending: true }) // Soonest first
        .limit(7) // Max 7 picks

      if (error) {
        console.error(`❌ Error fetching picks:`, error)
        throw error
      }

      console.log(`📊 Found ${data?.length || 0} pending picks`)

      const formattedPicks = (data || []).map(p => ({
        id: p.id,
        sport: p.sport || 'N/A',
        bet_title: p.bet_title || '',
        units: parseFloat(p.units) || 0,
        odds: p.odds || '',
        bettor_id: p.bettor_id || '',
        bettor_name: p.bettors?.name || 'Unknown',
        analysis: p.analysis || '',
        game_time: p.game_time,
        result: p.result
      }))

      // Sort by units (highest first)
      formattedPicks.sort((a, b) => b.units - a.units)

      console.log(`🏁 Final pick count: ${formattedPicks.length}`)
      setPicks(formattedPicks)
    } catch (error) {
      console.error('❌ [TopInsiderPicks] Error fetching picks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function checkAccess() {
    try {
      // First check for all-day access or premium status
      const response = await fetch('/api/picks/check-access')
      const data = await response.json()

      if (data.hasAccess) {
        if (data.reason === 'premium') {
          setIsPremium(true)
          setUnlockedPicks(picks.map(p => p.id))
          return
        } else if (data.reason === 'all_day_unlocked') {
          setHasAllDayAccess(true)
          setUnlockedPicks(picks.map(p => p.id))
          return
        }
      }

      // Check individual pick unlocks
      const unlockedIds: string[] = []
      
      for (const pick of picks) {
        const pickResponse = await fetch(`/api/picks/check-access?pickId=${pick.id}`)
        const pickData = await pickResponse.json()
        
        if (pickData.hasAccess && pickData.reason === 'single_unlocked') {
          unlockedIds.push(pick.id)
        }
      }

      setUnlockedPicks(unlockedIds)
    } catch (error) {
      console.error('Error checking access:', error)
    }
  }

  async function handleUnlockSingle(pickId: string) {
    if (unlocking) return
    
    setUnlocking(pickId)
    
    try {
      const response = await fetch('/api/picks/unlock-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickId })
      })

      const data = await response.json()

      if (response.ok) {
        setUnlockedPicks([...unlockedPicks, pickId])
        // Refresh credit display
        if ((window as any).refreshAICredits) {
          (window as any).refreshAICredits()
        }
      } else if (response.status === 403) {
        // Insufficient credits - redirect to pricing
        router.push('/pricing')
      } else {
        alert(data.error || 'Failed to unlock pick')
      }
    } catch (error) {
      console.error('Error unlocking pick:', error)
      alert('Failed to unlock pick')
    } finally {
      setUnlocking(null)
    }
  }

  function handleUnlockAll() {
    // Redirect to pricing page for now - will add confirmation modal later
    router.push('/pricing?unlock=all-picks')
  }

  function toggleWriteup(pickId: string) {
    const newExpanded = new Set(expandedWriteups)
    if (newExpanded.has(pickId)) {
      newExpanded.delete(pickId)
    } else {
      newExpanded.add(pickId)
    }
    setExpandedWriteups(newExpanded)
  }

  function isPickUnlocked(pickId: string) {
    return isPremium || hasAllDayAccess || unlockedPicks.includes(pickId)
  }

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Header */}
      <h3 
        onClick={() => isCollapsible && setExpanded(!expanded)}
        style={{ 
          fontSize: '1.2rem', 
          marginBottom: '0.5rem', 
          opacity: 0.9, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#fff',
          cursor: isCollapsible ? 'pointer' : 'default'
        }}
      >
        <HiOutlineTrophy size={16} style={{ color: '#ffffff' }} />
        Top Insider Picks
        <span style={{
          fontSize: '0.6rem',
          fontWeight: '600',
          color: '#f97316',
          background: 'rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          borderRadius: '4px',
          padding: '2px 6px',
          marginLeft: '0.25rem'
        }}>
          HOT
        </span>
        {isCollapsible && (
          <span style={{ marginLeft: 'auto' }}>
            {expanded ? <TiMinusOutline size={24} /> : <GoPlusCircle size={24} />}
          </span>
        )}
      </h3>

      {/* Picks List */}
      {expanded && (
        loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            Loading picks...
          </div>
        ) : picks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
            No picks available today
          </div>
        ) : (
          <>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          {picks.map((pick) => {
            const unlocked = isPickUnlocked(pick.id)
            const writeupExpanded = expandedWriteups.has(pick.id)
            const isUnlocking = unlocking === pick.id

            return (
              <div
                key={pick.id}
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  position: 'relative'
                }}
              >
                {/* Not signed in - blur everything */}
                {!isSignedIn && (
                  <div
                    onClick={() => router.push('/sign-in')}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                  >
                    <div style={{ textAlign: 'center', color: '#fff' }}>
                      <Lock size={24} style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Sign in to view</div>
                    </div>
                  </div>
                )}

                {/* Pick content */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    {/* Units Badge */}
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: '600',
                      color: '#fbbf24',
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      flexShrink: 0
                    }}>
                      {pick.units.toFixed(1)}u
                    </span>

                    {/* Pick Title - blur if signed in but not unlocked */}
                    <div style={{ flex: 1 }}>
                      {isSignedIn && !unlocked ? (
                        <span style={{
                          filter: 'blur(6px)',
                          userSelect: 'none',
                          fontSize: '0.75rem',
                          color: '#fff',
                          fontWeight: '600',
                          lineHeight: '1.2'
                        }}>
                          {pick.bet_title}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#fff',
                          fontWeight: '600',
                          lineHeight: '1.2'
                        }}>
                          {pick.bet_title}
                        </span>
                      )}
                      
                      {/* Sport, Game Time & Odds */}
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                        {pick.sport}, {(() => {
                          const gameDate = new Date(pick.game_time)
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                          const month = monthNames[gameDate.getUTCMonth()]
                          const day = gameDate.getUTCDate()
                          const hours = gameDate.getUTCHours()
                          const minutes = gameDate.getUTCMinutes()
                          const ampm = hours >= 12 ? 'PM' : 'AM'
                          const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
                          const displayMinutes = minutes.toString().padStart(2, '0')
                          return `${month} ${day} ${displayHour}:${displayMinutes}${ampm} EST`
                        })()} | {pick.odds}
                      </div>
                    </div>
                  </div>

                  {/* Unlock button for signed-in non-premium users */}
                  {isSignedIn && !unlocked && (
                    <button
                      onClick={() => handleUnlockSingle(pick.id)}
                      disabled={isUnlocking}
                      style={{
                        padding: '0.4rem 0.75rem',
                        background: isUnlocking ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        borderRadius: '6px',
                        color: '#fbbf24',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: isUnlocking ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                    >
                      <GiTwoCoins style={{ fontSize: '0.9rem' }} />
                      {isUnlocking ? '...' : '1'}
                    </button>
                  )}
                </div>

                {/* Bettor name with dropdown for write-up */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Bettor: {pick.bettor_name}
                  </div>

                  {/* Show write-up dropdown only if unlocked */}
                  {unlocked && pick.analysis && (
                    <button
                      onClick={() => toggleWriteup(pick.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem'
                      }}
                    >
                      {writeupExpanded ? 'Hide Write-up' : 'Show Write-up'}
                      {writeupExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                </div>

                {/* Write-up expansion */}
                {unlocked && writeupExpanded && pick.analysis && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.5'
                  }}>
                    {pick.analysis}
                  </div>
                )}
              </div>
            )
          })}
          </div>

          {/* Bottom Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '0.75rem',
            marginTop: '0.5rem'
          }}>
            {/* 5 Day Pass Button - only show for non-premium users */}
            {!isPremium && !hasAllDayAccess && isSignedIn && (
              <button
                onClick={handleUnlockAll}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s',
                  flex: 1,
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)'
                }}
              >
                <GiTwoCoins style={{ fontSize: '0.85rem' }} />
                <span style={{ fontWeight: '700' }}>5</span>
                <span>Day Pass</span>
              </button>
            )}

            {/* View All Button */}
            <button
              onClick={() => router.push('/analyst-picks')}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: '#3b82f6',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
                flex: 1,
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
              }}
            >
              View All →
            </button>
          </div>
          </>
        )
      )}
    </div>
  )
}

