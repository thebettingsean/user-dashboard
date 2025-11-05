'use client'

import { GiTwoCoins } from 'react-icons/gi'
import { X } from 'lucide-react'

interface CreditConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  creditCost: 1 | 2 | 3
  dataStrength: 'Minimal' | 'Above Avg' | 'Strong'
  gameMatchup: string
  creditsRemaining: number | 'unlimited'
}

export default function CreditConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  creditCost,
  dataStrength,
  gameMatchup,
  creditsRemaining
}: CreditConfirmModalProps) {
  if (!isOpen) return null

  const strengthColors = {
    'Minimal': '#ef4444',
    'Above Avg': '#f59e0b',
    'Strong': '#10b981'
  }

  const strengthColor = strengthColors[dataStrength]
  const hasUnlimited = creditsRemaining === 'unlimited'
  const remainingAfter = hasUnlimited ? 'unlimited' : (creditsRemaining as number) - creditCost
  const canAfford = hasUnlimited || (creditsRemaining as number) >= creditCost

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }} onClick={onClose}>
      <div 
        style={{
          background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.95))',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '450px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <X size={18} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
        </button>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '2px solid rgba(251, 191, 36, 0.3)',
            marginBottom: '1rem'
          }}>
            <GiTwoCoins style={{ fontSize: '2rem', color: '#fbbf24' }} />
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '0.5rem'
          }}>
            Confirm AI Script Generation
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            {gameMatchup}
          </p>
        </div>

        {/* Script Info */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {/* Data Strength */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <span style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              Data Strength
            </span>
            <span style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: strengthColor
            }}>
              {dataStrength}
            </span>
          </div>

          {/* Credit Cost */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <span style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              Credit Cost
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <GiTwoCoins style={{ fontSize: '1.1rem', color: '#fbbf24' }} />
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#fbbf24'
              }}>
                {creditCost}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: canAfford ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${canAfford ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: '8px'
        }}>
          <span style={{
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            Current Balance
          </span>
          <span style={{
            fontSize: '0.95rem',
            fontWeight: '700',
            color: canAfford ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <GiTwoCoins style={{ fontSize: '1rem' }} />
            {hasUnlimited ? '∞' : creditsRemaining}
          </span>
        </div>

        {/* Warning for insufficient credits */}
        {!canAfford && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#ef4444',
            textAlign: 'center'
          }}>
            Insufficient credits. You need {creditCost - (creditsRemaining as number)} more credit{creditCost - (creditsRemaining as number) > 1 ? 's' : ''}.
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={canAfford ? onConfirm : () => window.location.href = '/pricing'}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: canAfford 
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            {canAfford ? `Use ${creditCost} Credit${creditCost > 1 ? 's' : ''}` : 'Get More Credits'}
          </button>
        </div>
      </div>
    </div>
  )
}

