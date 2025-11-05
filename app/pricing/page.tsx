'use client'

import { useState } from 'react'
import { Sparkles, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const subscriptionPlans = [
    { 
      id: 'weekly', 
      price: '$29', 
      period: '/week',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoo07WIhZOuSIJB8OGgVU'
    },
    { 
      id: 'monthly', 
      price: '$99', 
      period: '/month',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoN07WIhZOuSIm8hTDjy4'
    },
    { 
      id: '6month', 
      price: '$299', 
      period: '/6 months',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZp507WIhZOuSIFMzU7Kkm'
    }
  ]

  const isSubscriptionSelected = ['weekly', 'monthly', '6month'].includes(selectedPlan || '')

  const handleContinue = async () => {
    if (!selectedPlan) return

    setLoading(true)

    if (selectedPlan === 'credits') {
      // One-time credit purchase via API
      try {
        const response = await fetch('/api/purchase-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await response.json()

        if (response.ok && data.url) {
          window.location.href = data.url
        } else {
          console.error('Failed to create checkout session:', data.error)
          alert('Failed to start checkout. Please try again.')
          setLoading(false)
        }
      } catch (error) {
        console.error('Error creating checkout session:', error)
        alert('Failed to start checkout. Please try again.')
        setLoading(false)
      }
    } else {
      // Navigate to subscription checkout
      const plan = subscriptionPlans.find(p => p.id === selectedPlan)
      if (plan) {
        window.location.href = plan.checkoutUrl
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background orbs */}
      <div className="orb-3"></div>
      <div className="orb-4"></div>
      <div className="orb-5"></div>

      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          style={{
            marginBottom: '2rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.9rem',
            cursor: 'pointer',
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
        </button>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            marginBottom: '1.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
          }}>
            <Sparkles size={32} style={{ color: '#fff' }} />
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            Unlock Premium Access
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Get instant access to AI scripts, expert picks, and advanced analytics
          </p>
        </div>

        {/* Plans */}
        <div style={{
          maxWidth: '700px',
          margin: '0 auto'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            {/* One-time purchase card */}
            <button
              onClick={() => setSelectedPlan('credits')}
              style={{
                width: '100%',
                padding: '1.5rem',
                background: selectedPlan === 'credits' 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))'
                  : 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: selectedPlan === 'credits'
                  ? '2px solid rgba(59, 130, 246, 0.5)'
                  : '2px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                boxShadow: selectedPlan === 'credits' ? '0 8px 32px rgba(59, 130, 246, 0.2)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (selectedPlan !== 'credits') {
                  e.currentTarget.style.border = '2px solid rgba(255, 255, 255, 0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPlan !== 'credits') {
                  e.currentTarget.style.border = '2px solid rgba(255, 255, 255, 0.08)'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    15 AI Credits - One Time Purchase
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
                    $10
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Spend credits on AI scripts & more
                  </div>
                </div>
                {selectedPlan === 'credits' && (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Check size={18} style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Subscription card */}
          <div
            style={{
              padding: '1.5rem',
              background: isSubscriptionSelected
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))'
                : 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: isSubscriptionSelected
                ? '2px solid rgba(59, 130, 246, 0.5)'
                : '2px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              marginBottom: '1.5rem',
              boxShadow: isSubscriptionSelected ? '0 8px 32px rgba(59, 130, 246, 0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
                Unlimited Credits & Full Access
              </div>
              {isSubscriptionSelected && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={18} style={{ color: '#fff' }} />
                </div>
              )}
            </div>

            {/* Subscription options */}
            <div style={{ marginBottom: '1rem' }}>
              {subscriptionPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: selectedPlan === plan.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    marginBottom: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPlan !== plan.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPlan !== plan.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>{plan.price}</span>
                      <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)' }}>{plan.period}</span>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.3)' }}>›</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Features - only shown when subscription selected */}
            {isSubscriptionSelected && (
              <div style={{
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'grid',
                gap: '0.75rem'
              }}>
                {['Unlimited AI Scripts', 'Daily Insider Picks', 'All Premium Data', 'Public Betting Splits', 'Historical Trends'].map((feature) => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Button */}
          <button
            disabled={!selectedPlan || loading}
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: selectedPlan
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '700',
              color: '#fff',
              cursor: selectedPlan && !loading ? 'pointer' : 'not-allowed',
              opacity: selectedPlan && !loading ? 1 : 0.5,
              transition: 'all 0.2s',
              boxShadow: selectedPlan ? '0 8px 24px rgba(59, 130, 246, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (selectedPlan && !loading) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPlan && !loading) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)'
              }
            }}
          >
            {loading ? 'Processing...' : 
             selectedPlan === 'credits' ? 'Continue for $10' :
             selectedPlan === 'weekly' ? 'Continue for $29' :
             selectedPlan === 'monthly' ? 'Continue for $99' :
             selectedPlan === '6month' ? 'Continue for $299' :
             'Select a Plan'}
          </button>

          {/* Footer note */}
          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.4)'
          }}>
            Secure payment • Cancel anytime • Instant access
          </div>
        </div>
      </div>
    </div>
  )
}

