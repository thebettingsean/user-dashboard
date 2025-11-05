'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { HiOutlineTrophy } from "react-icons/hi2"
import { GiTwoCoins } from "react-icons/gi"
import { TiMinusOutline } from 'react-icons/ti'
import { GoPlusCircle } from 'react-icons/go'
import { ChevronDown, ChevronRight, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMzAwMDAsImV4cCI6MjA2MTgwNjAwMH0.0zvZH_7Xd1TXwXxhxqw_Q7YcVV3JE5nYIHSN7wfD8lo'
)

interface Pick {
  id: string
  sport: string
  pick_title: string
  units_at_risk: number
  odds: string
  bettor_name: string
  write_up: string
  game_time: string
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
      const estOffset = -5 * 60 // EST is UTC-5
      const estNow = new Date(now.getTime() + estOffset * 60 * 1000)
      
      let formattedPicks: Pick[] = []
      
      // Try to get picks for today first, then next 2 days if none available
      for (let daysAhead = 0; daysAhead <= 2; daysAhead++) {
        const targetDate = new Date(estNow)
        targetDate.setDate(targetDate.getDate() + daysAhead)
        const startOfDay = new Date(targetDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)

        console.log(`📅 Searching picks for day +${daysAhead}: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

        const { data, error } = await supabase
          .from('picks')
          .select('*, bettors(name)')
          .gte('game_time', startOfDay.toISOString())
          .lte('game_time', endOfDay.toISOString())
          .is('recap', null) // Only get active/un-recapped picks
          .order('units_at_risk', { ascending: false })

        if (error) {
          console.error(`❌ Error fetching picks for day +${daysAhead}:`, error)
          throw error
        }

        console.log(`📊 Found ${data?.length || 0} picks for day +${daysAhead}`)

        if (data && data.length > 0) {
          formattedPicks = data.map(p => ({
            id: p.id,
            sport: p.sport || 'N/A',
            pick_title: p.pick_title || '',
            units_at_risk: p.units_at_risk || 0,
            odds: p.odds || '',
            bettor_name: p.bettors?.name || 'Unknown',
            write_up: p.write_up || '',
            game_time: p.game_time
          }))
          console.log(`✅ Using ${formattedPicks.length} picks from day +${daysAhead}`)
          break // Found picks, stop searching
        }
      }

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
      const pickIds = picks.map(p => p.id).join(',')
      const response = await fetch(`/api/picks/check-access?pickIds=${pickIds}`)
      const data = await response.json()

      setIsPremium(data.isPremium || false)
      setHasAllDayAccess(data.hasAllDayAccess || false)
      setUnlockedPicks(data.unlockedPicks || [])
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
          <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
            {/* "All Picks" button for non-premium users */}
            {!isPremium && !hasAllDayAccess && isSignedIn && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <button
                  onClick={handleUnlockAll}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '6px',
                    color: '#fbbf24',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <GiTwoCoins style={{ fontSize: '0.85rem' }} />
                  <span style={{ color: '#fbbf24', fontWeight: '700' }}>5</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>All Picks</span>
                </button>
              </div>
            )}
          {picks.map((pick) => {
            const unlocked = isPickUnlocked(pick.id)
            const writeupExpanded = expandedWriteups.has(pick.id)
            const isUnlocking = unlocking === pick.id

            return (
              <div
                key={pick.id}
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    {/* Units */}
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#fbbf24',
                      minWidth: '3rem'
                    }}>
                      [{pick.units_at_risk.toFixed(1)}u]
                    </span>

                    {/* Pick Title - blur if signed in but not unlocked */}
                    <div style={{ flex: 1 }}>
                      {isSignedIn && !unlocked ? (
                        <span style={{
                          filter: 'blur(6px)',
                          userSelect: 'none',
                          fontSize: '0.95rem',
                          color: '#fff',
                          fontWeight: '600'
                        }}>
                          {pick.pick_title}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.95rem',
                          color: '#fff',
                          fontWeight: '600'
                        }}>
                          {pick.pick_title}
                        </span>
                      )}
                      
                      {/* Sport & Odds */}
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                        {pick.sport} | {pick.odds}
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
                  {unlocked && pick.write_up && (
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
                {unlocked && writeupExpanded && pick.write_up && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.5'
                  }}>
                    {pick.write_up}
                  </div>
                )}
              </div>
            )
          })}
          </div>
        )
      )}
    </div>
  )
}

