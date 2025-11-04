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

export default function AICreditBadge() {
  const { isSignedIn } = useUser()
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/ai-credits/check')
      const data = await response.json()
      setCreditStatus(data)
    } catch (error) {
      console.error('Error fetching credits:', error)
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

  // Not logged in - prompt to sign up
  if (!creditStatus.authenticated) {
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
        color: 'rgba(255, 255, 255, 0.6)'
      }}>
        <GiTwoCoins size={16} style={{ color: '#8b5cf6', opacity: 0.6 }} />
        Sign up to get scripts
      </div>
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
        <Infinity size={16} style={{ color: '#8b5cf6' }} />
        Unlimited Scripts
      </div>
    )
  }

  // Signed in but no credits (show purchase options)
  const remaining = typeof creditStatus.creditsRemaining === 'number' ? creditStatus.creditsRemaining : 0
  const hasCredits = remaining > 0

  if (!hasCredits) {
    // No credits - show upgrade options
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        background: 'rgba(239, 68, 68, 0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        fontWeight: '600'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
          <GiTwoCoins size={16} style={{ color: '#ef4444' }} />
          0 credits remaining
        </div>
        <a
          href="https://www.thebettinginsider.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            transition: 'color 0.2s',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#8b5cf6'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
        >
          buy more credits →
        </a>
      </div>
    )
  }

  // Has credits - show remaining
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
        <GiTwoCoins size={16} style={{ color: isLow ? '#ef4444' : '#8b5cf6' }} />
        {remaining} {remaining === 1 ? 'credit' : 'credits'} left
      </div>
      {creditStatus.accessLevel === 'ai_only' && (
        <a
          href="https://www.thebettinginsider.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            transition: 'color 0.2s',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#8b5cf6'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
        >
          upgrade for unlimited →
        </a>
      )}
    </div>
  )
}

