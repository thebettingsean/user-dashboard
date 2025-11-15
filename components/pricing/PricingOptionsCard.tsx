'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { GiTwoCoins } from 'react-icons/gi'

const CREDIT_PACK_PRICE = 'price_1SPoAC07WIhZOuSIkWA98Qwy'

const subscriptionPlans = [
  {
    id: 'weekly',
    price: '$29',
    period: 'Weekly Sub',
    priceId: 'price_1SIZoo07WIhZOuSIJB8OGgVU',
    paymentLink: 'https://buy.stripe.com/cNi14fbn1ghhbnR6zoenS0i'
  },
  {
    id: 'monthly',
    price: '$99',
    period: 'Monthly Sub',
    priceId: 'price_1SIZoN07WIhZOuSIm8hTDjy4',
    paymentLink: 'https://buy.stripe.com/bJeeV562H0ij1Nh5vkenS0h'
  },
  {
    id: '6month',
    price: '$299',
    period: '6-Month Sub',
    priceId: 'price_1SIZp507WIhZOuSIFMzU7Kkm',
    paymentLink: 'https://buy.stripe.com/9B66oz76Le999fJ3ncenS0j'
  }
] as const

type PricingOptionsCardProps = {
  variant?: 'default' | 'compact'
}

export default function PricingOptionsCard({ variant = 'default' }: PricingOptionsCardProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const isSubscriptionSelected = ['weekly', 'monthly', '6month'].includes(selectedPlan || '')

  const handleContinue = async () => {
    if (!selectedPlan) return

    setLoading(true)
    const plan = subscriptionPlans.find((p) => p.id === selectedPlan)
    if (plan && plan.paymentLink) {
      // Redirect directly to Stripe Checkout link with FREE trial
      window.location.href = plan.paymentLink
    }
  }

  const cardPadding = variant === 'compact' ? '2rem' : '2.5rem'

  return (
    <>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: cardPadding,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: variant === 'compact' ? '560px' : '650px'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'inline-block'
            }}
          >
            3-Day FREE Trial Included
          </div>
          <h2
            style={{
              fontSize: variant === 'compact' ? '1.6rem' : '1.75rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '0.5rem',
              lineHeight: 1.2
            }}
          >
            Start F*cking Winning
          </h2>
        </div>

        <div>
          <div
            style={{
              padding: '1rem',
              background: isSubscriptionSelected
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))'
                : 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: isSubscriptionSelected
                ? '2px solid rgba(59, 130, 246, 0.5)'
                : '2px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              marginBottom: '1rem',
              boxShadow: isSubscriptionSelected ? '0 8px 32px rgba(59, 130, 246, 0.2)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                Full Access - Try FREE for 3 Days
              </div>
              {isSubscriptionSelected && (
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Check size={14} style={{ color: '#fff' }} />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              {subscriptionPlans.map((plan) => (
                <div key={plan.id} style={{ marginBottom: '0.4rem' }}>
                  <button
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background:
                        selectedPlan === plan.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      position: 'relative'
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
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                          {plan.price}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          / {plan.id === 'weekly' ? 'weekly' : plan.id === 'monthly' ? 'monthly' : '6-month'}
                        </span>
                      </div>
                      <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.3)' }}>›</span>
                    </div>
                  </button>

                  {selectedPlan === plan.id && (
                    <div
                      style={{
                        paddingLeft: '0.75rem',
                        paddingTop: '0.5rem',
                        display: 'grid',
                        gap: '0.4rem'
                      }}
                    >
                      {['Unlimited Everything', 'Daily Insider Picks', 'All Premium Data', 'AI Scripts & Tools'].map((feature) => (
                        <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              background: 'rgba(59, 130, 246, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <div
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#3b82f6'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)' }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={!selectedPlan || loading}
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: '1rem',
              background: selectedPlan
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 700,
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
            {loading
              ? 'Processing...'
              : selectedPlan === 'weekly'
              ? 'Start FREE Trial (Then $29/week)'
              : selectedPlan === 'monthly'
              ? 'Start FREE Trial (Then $99/month)'
              : selectedPlan === '6month'
              ? 'Start FREE Trial (Then $299/6-months)'
              : 'Select a Plan'}
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
              }}
            >
              Home
            </button>
            <button
              onClick={() => setShowInfoModal(true)}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
              }}
            >
              Learn More
            </button>
          </div>

          <div
            style={{
              marginTop: '1rem',
              textAlign: 'center',
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.35)'
            }}
          >
            3-Day FREE Trial • Cancel anytime • Instant access
          </div>
        </div>
      </div>

      {showInfoModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            style={{
              background: 'rgba(26, 26, 46, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInfoModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <X size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 30px rgba(251, 191, 36, 0.3)'
                }}
              >
                <GiTwoCoins size={32} style={{ color: '#fff' }} />
              </div>
            </div>

            <p
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                marginBottom: '2rem',
                lineHeight: 1.5
              }}
            >
              Use credits to unlock picks & game scripts.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginBottom: '2rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px'
                }}
              >
                <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
                  1 Analyst pick
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>1</span>
                  <GiTwoCoins size={16} style={{ color: '#fbbf24' }} />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px'
                }}
              >
                <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
                  24 hour picks day pass
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>5</span>
                  <GiTwoCoins size={16} style={{ color: '#fbbf24' }} />
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
                    1 Game Script
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>1-3</span>
                    <GiTwoCoins size={16} style={{ color: '#fbbf24' }} />
                  </div>
                </div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    margin: 0
                  }}
                >
                  Depends on strength of data available.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              <p
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#10b981',
                  marginBottom: '0.5rem'
                }}
              >
                Got sub?
              </p>
              <p
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '0.25rem'
                }}
              >
                Enjoy unlimited everything.
              </p>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: 0
                }}
              >
                Picks, scripts, premium data & more.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

