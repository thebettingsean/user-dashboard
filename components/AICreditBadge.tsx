'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Infinity } from 'lucide-react'
import { GiTwoCoins } from 'react-icons/gi'
import { FaWandMagicSparkles } from 'react-icons/fa6'

interface CreditStatus {
  authenticated: boolean
  hasAccess: boolean
  creditsRemaining: number | 'unlimited'
  creditsUsed?: number
  totalCredits?: number
  accessLevel: 'none' | 'ai_only' | 'full'
  isPremium: boolean
}

interface AICreditBadgeProps {
  onShowModal?: () => void
}

export default function AICreditBadge({ onShowModal }: AICreditBadgeProps = {}) {
  const { isSignedIn } = useUser()
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCredits = async () => {
    try {
      console.log('🔍 AICreditBadge: Fetching credit status...')
      const response = await fetch('/api/ai-credits/check')
      console.log('📡 AICreditBadge: Response status:', response.status)
      const data = await response.json()
      console.log('📊 AICreditBadge: Received data:', JSON.stringify(data, null, 2))
      setCreditStatus(data)
    } catch (error) {
      console.error('❌ AICreditBadge: Error fetching credits:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredits()
  }, [isSignedIn])

  // Expose refresh method globally so GameScriptModal can update it
  useEffect(() => {
    ;(window as any).refreshAICredits = fetchCredits
    return () => {
      delete (window as any).refreshAICredits
    }
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: 'rgba(255, 255, 255, 0.4)'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        Loading...
      </div>
    )
  }

  if (!creditStatus) return null

  // Not logged in - prompt to sign up (clickable, triggers Clerk modal)
  if (!creditStatus.authenticated) {
    return (
      <button
        onClick={() => {
          // Trigger Clerk sign-in modal
          const signInBtn = document.querySelector('[data-clerk-trigger]') as HTMLElement
          if (signInBtn) {
            signInBtn.click()
          } else {
            // Fallback: use window location to redirect to sign-in
            window.location.href = '/sign-in'
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.6)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
          e.currentTarget.style.color = '#8b5cf6'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
        }}
      >
        <GiTwoCoins size={16} style={{ color: '#8b5cf6', opacity: 0.6 }} />
        Sign up to get credits →
      </button>
    )
  }

  // Premium user (unlimited)
  if (creditStatus.isPremium || creditStatus.accessLevel === 'full') {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(167, 139, 250, 0.08))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#a78bfa'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          Credit Balance: <Infinity size={16} style={{ color: '#8b5cf6' }} />
        </span>
      </div>
    )
  }

  // Signed in but no credits/subscription - Calculate remaining credits from purchased_credits
  const remaining = typeof creditStatus.creditsRemaining === 'number' ? creditStatus.creditsRemaining : 0
  const hasCredits = remaining > 0

  if (!hasCredits) {
    // No credits - show "Get More Credits" link that triggers purchase modal
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        fontWeight: '600'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
          Credit Balance: 0
        </div>
        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>|</span>
        <button
          onClick={() => {
            console.log('🔘 Get More Credits (0 balance) clicked!')
            if (onShowModal) {
              console.log('✅ Calling onShowModal prop')
              onShowModal()
            } else {
              console.log('⚠️ No onShowModal prop, trying window.showUnlockModal')
              if ((window as any).showUnlockModal) {
                ;(window as any).showUnlockModal()
              }
            }
          }}
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            transition: 'color 0.2s',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: 'none',
            border: 'none',
            padding: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#8b5cf6'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
        >
          Get More Credits →
        </button>
      </div>
    )
  }

  // Has credits - show remaining (from purchased_credits)
  const isLow = remaining <= 3

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 1rem',
      background: isLow 
        ? 'rgba(239, 68, 68, 0.1)' 
        : 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(20px)',
      border: isLow
        ? '1px solid rgba(239, 68, 68, 0.3)'
        : '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      fontSize: '0.85rem',
      fontWeight: '600'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isLow ? '#ef4444' : 'rgba(255, 255, 255, 0.8)' }}>
        Credit Balance: {remaining}
      </div>
      <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>|</span>
      <button
        onClick={() => {
          console.log('🔘 Get More Credits (with balance) clicked!')
          if (onShowModal) {
            console.log('✅ Calling onShowModal prop')
            onShowModal()
          } else {
            console.log('⚠️ No onShowModal prop, trying window.showUnlockModal')
            if ((window as any).showUnlockModal) {
              ;(window as any).showUnlockModal()
            }
          }
        }}
        style={{
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.5)',
          textDecoration: 'none',
          transition: 'color 0.2s',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          background: 'none',
          border: 'none',
          padding: 0
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#8b5cf6'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
      >
        Get More Credits →
      </button>
    </div>
  )
}

