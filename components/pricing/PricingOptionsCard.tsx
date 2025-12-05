'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { GiTwoCoins } from 'react-icons/gi'

const CREDIT_PACK_PRICE = 'price_1SPoAC07WIhZOuSIkWA98Qwy'

const subscriptionPlans = [
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
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  const isSubscriptionSelected = ['monthly', '6month'].includes(selectedPlan || '')

  const handleContinue = async () => {
    if (!selectedPlan) return

    setLoading(true)
    try {
      const plan = subscriptionPlans.find((p) => p.id === selectedPlan)
      if (!plan) return

      // Call API to create checkout session with user metadata
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to create checkout session:', data.error)
        alert('Failed to start checkout. Please try again.')
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('An error occurred. Please try again.')
      setLoading(false)
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
          maxWidth: variant === 'compact' ? '560px' : '650px',
          margin: '0 auto'
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
            $1 3-Day Trial
          </div>
          <h2
            style={{
              fontSize: variant === 'compact' ? '1.6rem' : '1.75rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '1.5rem',
              lineHeight: 1.2
            }}
          >
            Unlock Instant Access to Our:
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
              alignItems: 'flex-start',
              marginTop: '0.5rem',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'inline-block'
              }}
              onMouseEnter={() => setHoveredFeature('picks')}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  background: hoveredFeature === 'picks' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: hoveredFeature === 'picks'
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Daily Insider Picks
              </div>
              {hoveredFeature === 'picks' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    minWidth: '220px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                    animation: 'fadeInUp 0.3s ease-out',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                    Get unlimited access to every single pick from our expert analysts with instant notifications pushed right to your phone.
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                position: 'relative',
                display: 'inline-block'
              }}
              onMouseEnter={() => setHoveredFeature('data')}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  background: hoveredFeature === 'data' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: hoveredFeature === 'data'
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                All Premium Data
              </div>
              {hoveredFeature === 'data' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    minWidth: '220px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                    animation: 'fadeInUp 0.3s ease-out',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                    All matchup analytics, betting splits, and referee trends—fully accessible on our stats dashboard the moment you need them.
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                position: 'relative',
                display: 'inline-block'
              }}
              onMouseEnter={() => setHoveredFeature('tools')}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  background: hoveredFeature === 'tools' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: hoveredFeature === 'tools'
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                AI Scripts & Tools
              </div>
              {hoveredFeature === 'tools' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    minWidth: '220px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                    animation: 'fadeInUp 0.3s ease-out',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                    Full access to the prop engine, perfect parlay builder, Vegas-backed fantasy optimizer, and AI script writer.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}
          >
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '1.25rem',
                textAlign: 'center'
              }}
            >
              Select Your Plan
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {subscriptionPlans.map((plan) => (
                <div key={plan.id} style={{ position: 'relative' }}>
                  {(plan.id === 'monthly' || plan.id === '6month') && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '8px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        zIndex: 10,
                        background: plan.id === 'monthly' 
                          ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                          : 'linear-gradient(135deg, #10b981, #34d399)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {plan.id === 'monthly' ? 'Most Popular' : 'Best Value'}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: selectedPlan === plan.id 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'transparent',
                      border: selectedPlan === plan.id
                        ? '2px solid rgba(59, 130, 246, 0.5)'
                        : '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPlan !== plan.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPlan !== plan.id) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flex: 1 }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                        {plan.price}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255, 255, 255, 0.5)'
                        }}
                      >
                        / {plan.id === 'monthly' ? 'monthly' : '6-month'}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: selectedPlan === plan.id 
                          ? '2px solid #3b82f6' 
                          : '2px solid rgba(255, 255, 255, 0.3)',
                        background: selectedPlan === plan.id 
                          ? '#3b82f6' 
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s'
                      }}
                    >
                      {selectedPlan === plan.id && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#fff'
                          }}
                        />
                      )}
                    </div>
                  </button>
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
              boxShadow: selectedPlan ? '0 8px 24px rgba(59, 130, 246, 0.3)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem'
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
            {loading ? (
              'Processing...'
            ) : selectedPlan ? (
              <>
                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  $1 FOR 3 DAYS
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 400 }}>
                  (then {selectedPlan === 'monthly' 
                    ? '$99/month' 
                    : '$299/6-months'})
                </span>
              </>
            ) : (
              'Select a Plan'
            )}
          </button>

          <div
            style={{
              marginTop: '1rem',
              textAlign: 'center',
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.35)'
            }}
          >
            $1 Trial • Cancel anytime • Instant access
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

