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
import PickUnlockModal from './PickUnlockModal'
import LockedWidget from './LockedWidget'

// Inject CSS for rich text analysis
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .top-picks-analysis-text p {
      margin: 0 0 0.5rem 0;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
    }
    
    .top-picks-analysis-text p:last-child {
      margin-bottom: 0;
    }
    
    .top-picks-analysis-text strong,
    .top-picks-analysis-text b,
    .top-picks-analysis-text span[style*="font-weight: 700"],
    .top-picks-analysis-text span[style*="font-weight: bold"] {
      font-weight: 700;
      color: #ffffff;
    }
    
    .top-picks-analysis-text a {
      color: #60a5fa !important;
      text-decoration: underline;
      transition: color 0.2s;
    }
    
    .top-picks-analysis-text a:hover {
      color: #93c5fd !important;
    }
    
    .top-picks-analysis-text br {
      display: block;
      content: "";
      margin: 0.25rem 0;
    }
    
    .top-picks-analysis-text span {
      color: inherit;
    }
  `
  document.head.appendChild(style)
}

// Clean rich text HTML (same as analyst-picks page)
function cleanRichTextHTML(html: string): string {
  if (!html) return ''
  
  // Remove Google Docs wrapper spans and IDs
  let cleaned = html.replace(/<span[^>]*id="docs-internal-guid[^>]*>/gi, '')
  cleaned = cleaned.replace(/<\/span>$/gi, '')
  
  // Remove inline styles we don't want (keep font-weight for bold, text-decoration for links)
  cleaned = cleaned.replace(/style="[^"]*"/gi, (match) => {
    // Keep only font-weight (bold) and text-decoration (underline)
    const fontWeight = match.match(/font-weight:\s*(\d+|bold|bolder)/i)
    const textDecoration = match.match(/text-decoration[^;]*/i)
    
    let keepStyles = []
    if (fontWeight) keepStyles.push(fontWeight[0])
    if (textDecoration) keepStyles.push(textDecoration[0])
    
    return keepStyles.length > 0 ? `style="${keepStyles.join('; ')}"` : ''
  })
  
  // Convert <p> tags to have proper spacing
  cleaned = cleaned.replace(/<p[^>]*>/gi, '<p>')
  cleaned = cleaned.replace(/<\/p>/gi, '</p>')
  
  // Clean up links - remove text-decoration: none
  cleaned = cleaned.replace(/<a([^>]*)style="[^"]*text-decoration:\s*none[^"]*"([^>]*)>/gi, '<a$1$2>')
  
  // Remove empty attributes
  cleaned = cleaned.replace(/\s+style=""\s*/gi, ' ')
  cleaned = cleaned.replace(/<([a-z]+)\s+>/gi, '<$1>')
  
  return cleaned
}

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

export default function TopInsiderPicks({ isCollapsible = true, defaultExpanded = false }: TopInsiderPicksProps) {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [expandedWriteups, setExpandedWriteups] = useState<Set<string>>(new Set())
  const [unlockedPicks, setUnlockedPicks] = useState<string[]>([])
  const [hasAllDayAccess, setHasAllDayAccess] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState<number | 'unlimited'>(0)
  
  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [pendingUnlock, setPendingUnlock] = useState<{
    type: 'single' | 'all_day',
    pickId?: string,
    pickTitle?: string
  } | null>(null)

  useEffect(() => {
    fetchPicks()
  }, [])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('🔍 [TopInsiderPicks] Fetching credits...')
      fetchCredits()
    } else if (isLoaded && !isSignedIn) {
      console.log('⚠️ [TopInsiderPicks] User not signed in, skipping credit fetch')
      setCreditsRemaining(0)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    if (isSignedIn && picks.length > 0) {
      checkAccess()
    }
  }, [isSignedIn, picks])

  async function fetchCredits() {
    try {
      console.log('💳 [TopInsiderPicks] Calling /api/ai-credits/check')
      const response = await fetch('/api/ai-credits/check')
      
      if (!response.ok) {
        console.error('❌ [TopInsiderPicks] Credits API returned error:', response.status)
        return
      }
      
      const data = await response.json()
      console.log('💳 [TopInsiderPicks] Credits API response:', data)
      
      // Use the SAME logic as AICreditBadge
      if (data.isPremium || data.accessLevel === 'full') {
        console.log('✨ [TopInsiderPicks] User is premium, setting unlimited credits')
        setCreditsRemaining('unlimited')
        setIsPremium(true)
      } else {
        // Use creditsRemaining directly from API response (same as AICreditBadge)
        const remaining = typeof data.creditsRemaining === 'number' ? data.creditsRemaining : 0
        console.log(`💰 [TopInsiderPicks] User has ${remaining} credits remaining`)
        setCreditsRemaining(remaining)
      }
    } catch (error) {
      console.error('❌ [TopInsiderPicks] Error fetching credits:', error)
    }
  }

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

  function handleUnlockSingle(pickId: string, pickTitle: string) {
    setPendingUnlock({ type: 'single', pickId, pickTitle })
    setConfirmModalOpen(true)
  }

  function handleUnlockAll() {
    setPendingUnlock({ type: 'all_day' })
    setConfirmModalOpen(true)
  }

  async function confirmUnlock() {
    if (!pendingUnlock) return

    setConfirmModalOpen(false)
    
    if (pendingUnlock.type === 'single' && pendingUnlock.pickId) {
      setUnlocking(pendingUnlock.pickId)
      try {
        const response = await fetch('/api/picks/unlock-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickId: pendingUnlock.pickId })
        })

        const data = await response.json()

        if (response.ok) {
          setUnlockedPicks([...unlockedPicks, pendingUnlock.pickId!])
          await fetchCredits() // Refresh credits
          alert('✅ Pick unlocked successfully!')
        } else {
          if (response.status === 403) {
            window.location.href = '/pricing'
          } else {
            alert(data.error || 'Failed to unlock pick')
          }
        }
      } catch (error) {
        console.error('Error unlocking pick:', error)
        alert('Error unlocking pick. Please try again.')
      } finally {
        setUnlocking(null)
        setPendingUnlock(null)
      }
    } else if (pendingUnlock.type === 'all_day') {
      setUnlocking('all')
      try {
        const response = await fetch('/api/picks/unlock-all-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()

        if (response.ok) {
          setHasAllDayAccess(true)
          setUnlockedPicks(picks.map(p => p.id))
          await fetchCredits() // Refresh credits
          alert('✅ All picks unlocked for 24 hours!')
        } else {
          if (response.status === 403) {
            window.location.href = '/pricing'
          } else {
            alert(data.error || 'Failed to unlock all picks')
          }
        }
      } catch (error) {
        console.error('Error unlocking all picks:', error)
        alert('Error unlocking picks. Please try again.')
      } finally {
        setUnlocking(null)
        setPendingUnlock(null)
      }
    }
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
    <>
      <PickUnlockModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false)
          setPendingUnlock(null)
        }}
        onConfirm={confirmUnlock}
        unlockType={pendingUnlock?.type || 'single'}
        pickTitle={pendingUnlock?.pickTitle}
        creditsRemaining={creditsRemaining}
      />

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

            // Pick content JSX
            const pickContent = (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

                    {/* Pick Title - blur if NOT unlocked (signed in OR not signed in) */}
                    <div style={{ flex: 1 }}>
                      {!unlocked || !isSignedIn ? (
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
                          const month = monthNames[gameDate.getMonth()]
                          const day = gameDate.getDate()
                          const timeStr = gameDate.toLocaleString('en-US', {
                            timeZone: 'America/New_York',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                          return `${month} ${day} ${timeStr} EST`
                        })()} | {pick.odds}
                      </div>
                    </div>
                  </div>

                  {/* Unlock button for signed-in non-premium users */}
                  {isSignedIn && !unlocked && !isPremium && (
                    <button
                      onClick={() => handleUnlockSingle(pick.id, pick.bet_title)}
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

                  {/* Sign up button for non-signed-in users */}
                  {!isSignedIn && (
                    <button
                      onClick={() => router.push('/sign-in')}
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: '6px',
                        color: '#a78bfa',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'
                      }}
                    >
                      Sign up to view
                    </button>
                  )}
                </div>

                {/* Write-up expansion */}
                {unlocked && writeupExpanded && pick.analysis && (
                  <div 
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: '1.5'
                    }}
                    className="top-picks-analysis-text"
                    dangerouslySetInnerHTML={{ __html: cleanRichTextHTML(pick.analysis) }}
                  />
                )}
              </div>
            )

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
                {/* Just show pickContent - bet title blur is handled inside */}
                {pickContent}
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
                <span>- Day Pass</span>
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
    </>
  )
}

