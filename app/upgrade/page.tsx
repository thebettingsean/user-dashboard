'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Check, Zap, TrendingUp, BarChart3 } from 'lucide-react'
import { FaWandMagicSparkles } from 'react-icons/fa6'

export default function UpgradePage() {
  const { isSignedIn } = useUser()
  const [loading, setLoading] = useState<string | null>(null)

  const handleCreditPackPurchase = async () => {
    if (!isSignedIn) {
      alert('Please sign in first to purchase credits.')
      return
    }

    setLoading('credits')
    try {
      const response = await fetch('/api/ai-credits/purchase', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error purchasing credits:', error)
      alert('Failed to start purchase. Please try again.')
      setLoading(null)
    }
  }

  const handleSubscriptionRedirect = (checkoutUrl: string) => {
    window.location.href = checkoutUrl
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
      padding: '4rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'fixed',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        top: '-200px',
        left: '-200px',
        filter: 'blur(60px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        bottom: '-150px',
        right: '-150px',
        filter: 'blur(60px)',
        zIndex: 0
      }} />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <FaWandMagicSparkles size={32} style={{ color: '#8b5cf6' }} />
          </div>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            Unlock AI Game Scripts
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Get instant access to AI-powered game scripts with insider picks, public betting data, and historical trends.
          </p>
        </div>

        {/* Pricing Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '4rem'
        }}>
          {/* Credit Pack */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            transition: 'all 0.3s',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={handleCreditPackPurchase}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)'
            e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.4)'
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(139, 92, 246, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem' }}>
                One-Time Purchase
              </div>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: '#fff' }}>
                $10
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#8b5cf6', marginTop: '0.5rem' }}>
                15 AI Scripts
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Check size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>15 AI game script generations</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Check size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Credits never expire</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'line-through' }}>
                <Check size={20} style={{ color: 'rgba(255, 255, 255, 0.2)', flexShrink: 0 }} />
                <span>No other access</span>
              </li>
            </ul>
            <button style={{
              width: '100%',
              padding: '1rem',
              background: loading === 'credits' ? 'rgba(139, 92, 246, 0.5)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading === 'credits' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            disabled={loading === 'credits'}>
              {loading === 'credits' ? 'Processing...' : 'Buy Now'}
            </button>
          </div>

          {/* Weekly Subscription */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(167, 139, 250, 0.08))',
            backdropFilter: 'blur(40px)',
            border: '2px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            transition: 'all 0.3s',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={() => handleSubscriptionRedirect('https://stripe.thebettinginsider.com/checkout/price_1SIZoo07WIhZOuSIJB8OGgVU')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)'
            e.currentTarget.style.border = '2px solid rgba(139, 92, 246, 0.6)'
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(139, 92, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.border = '2px solid rgba(139, 92, 246, 0.3)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              background: '#10b981',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              letterSpacing: '0.5px'
            }}>
              MOST POPULAR
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
                Weekly Subscription
              </div>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: '#fff' }}>
                $29
                <span style={{ fontSize: '1rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.5)' }}>/week</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#10b981', marginTop: '0.5rem' }}>
                Unlimited Everything
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#fff', fontWeight: '600' }}>
                <Zap size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Unlimited AI game scripts</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                <TrendingUp size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Public betting data (all sports)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                <BarChart3 size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Historical betting trends</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                <Check size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Insider analyst picks</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                <Check size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>All premium prop tools</span>
              </li>
            </ul>
            <button style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
            }}>
              Subscribe Weekly
            </button>
          </div>

          {/* Monthly Subscription */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            transition: 'all 0.3s',
            cursor: 'pointer'
          }}
          onClick={() => handleSubscriptionRedirect('https://stripe.thebettinginsider.com/checkout/price_1SIZoN07WIhZOuSIm8hTDjy4')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)'
            e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.4)'
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(139, 92, 246, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              background: '#3b82f6',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              letterSpacing: '0.5px'
            }}>
              SAVE 15%
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem' }}>
                Monthly Subscription
              </div>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: '#fff' }}>
                $99
                <span style={{ fontSize: '1rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.5)' }}>/month</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#3b82f6', marginTop: '0.5rem' }}>
                Unlimited Everything
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Zap size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Unlimited AI game scripts</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <TrendingUp size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Public betting data (all sports)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <BarChart3 size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Historical betting trends</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Check size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Insider analyst picks</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Check size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>All premium prop tools</span>
              </li>
            </ul>
            <button style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              Subscribe Monthly
            </button>
          </div>

          {/* 6-Month Subscription */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            transition: 'all 0.3s',
            cursor: 'pointer'
          }}
          onClick={() => handleSubscriptionRedirect('https://stripe.thebettinginsider.com/checkout/price_1SIZp507WIhZOuSIFMzU7Kkm')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)'
            e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.4)'
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(139, 92, 246, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              background: '#f59e0b',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              letterSpacing: '0.5px'
            }}>
              SAVE 35%
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem' }}>
                6-Month Subscription
              </div>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: '#fff' }}>
                $299
                <span style={{ fontSize: '1rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.5)' }}>/6mo</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f59e0b', marginTop: '0.5rem' }}>
                Unlimited Everything
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Zap size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Unlimited AI game scripts</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <TrendingUp size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Public betting data (all sports)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <BarChart3 size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Historical betting trends</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Check size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>Insider analyst picks</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <Check size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span>All premium prop tools</span>
              </li>
            </ul>
            <button style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              Subscribe 6 Months
            </button>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.75rem 2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '1rem',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
            }}
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

