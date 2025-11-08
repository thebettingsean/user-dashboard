'use client'

import { useState } from 'react'
import { Sparkles, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { GiTwoCoins } from "react-icons/gi"

export default function PricingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  // Price IDs for checkout
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
  ]

  const isSubscriptionSelected = ['weekly', 'monthly', '6month'].includes(selectedPlan || '')

  const handleContinue = async () => {
    if (!selectedPlan) return

    setLoading(true)

    // Use Checkout Sessions for BOTH credits and subscriptions
    // This ensures metadata is passed and external webhook can process properly
    if (selectedPlan === 'credits') {
      router.push(`/checkout/${CREDIT_PACK_PRICE}`)
    } else {
      const plan = subscriptionPlans.find(p => p.id === selectedPlan)
      if (plan) {
        router.push(`/checkout/${plan.priceId}`)
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
      padding: '8rem 1rem 2rem',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Background orbs */}
      <div className="orb-3"></div>
      <div className="orb-4"></div>
      <div className="orb-5"></div>

      {/* Single glassmorphic container */}
      <div style={{
        maxWidth: '650px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '0.5rem',
            lineHeight: '1.2'
          }}>
            Get Credits or Subscribe
          </h1>
          <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.5)',
            margin: '0 auto'
          }}>
            Get instant access to AI scripts, expert picks, and advanced analytics
          </p>
        </div>

        {/* Plans */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            {/* One-time purchase card */}
            <button
              onClick={() => setSelectedPlan('credits')}
              style={{
                width: '100%',
                padding: '1rem',
                background: selectedPlan === 'credits' 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))'
                  : 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: selectedPlan === 'credits'
                  ? '2px solid rgba(59, 130, 246, 0.5)'
                  : '2px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
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
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    One Time Purchase
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    $10
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      / 15 Credits
                      <GiTwoCoins style={{ fontSize: '1rem', color: '#fbbf24' }} />
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                    Spend credits on scripts, picks & more!
                  </div>
                </div>
                {selectedPlan === 'credits' && (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Check size={14} style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Subscription card */}
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>
                Unlimited Credits & Full Access
              </div>
              {isSubscriptionSelected && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Check size={14} style={{ color: '#fff' }} />
                </div>
              )}
            </div>

            {/* Subscription options */}
            <div style={{ marginBottom: '0.75rem' }}>
              {subscriptionPlans.map((plan) => (
                <div key={plan.id} style={{ marginBottom: '0.4rem' }}>
                  <button
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: selectedPlan === plan.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
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
                        <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>{plan.price}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          / {plan.id === 'weekly' ? 'weekly' : plan.id === 'monthly' ? 'monthly' : '6-month'} - unlimited
                          <GiTwoCoins style={{ fontSize: '0.9rem', color: '#fbbf24' }} />
                        </span>
                        {plan.id === 'monthly' && (
                          <span style={{
                            marginLeft: '0.5rem',
                            padding: '0.15rem 0.5rem',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            TOP
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.3)' }}>›</span>
                    </div>
                  </button>
                  
                  {/* Features - shown directly under selected plan */}
                  {selectedPlan === plan.id && (
                    <div style={{
                      paddingLeft: '0.75rem',
                      paddingTop: '0.5rem',
                      display: 'grid',
                      gap: '0.4rem'
                    }}>
                      {['Unlimited Credits', 'Daily Insider Picks', 'All Premium Data'].map((feature) => (
                        <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <div style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: '#3b82f6'
                            }} />
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

          {/* CTA Button */}
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

          {/* Learn More Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginTop: '1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
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

          {/* Footer note */}
          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontSize: '0.7rem',
            color: 'rgba(255, 255, 255, 0.35)'
          }}>
            Secure payment • Cancel anytime • Instant access
          </div>
        </div>
      </div>

      {/* Learn More Info Modal */}
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
            {/* Close button */}
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

            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(251, 191, 36, 0.3)'
              }}>
                <GiTwoCoins size={32} style={{ color: '#fff' }} />
              </div>
            </div>

            {/* Main Tagline */}
            <p style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              marginBottom: '2rem',
              lineHeight: 1.5
            }}>
              Use credits to unlock picks & game scripts.
            </p>

            {/* Credit breakdown */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {/* Analyst Pick */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px'
              }}>
                <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500' }}>
                  1 Analyst pick
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fbbf24' }}>1</span>
                  <GiTwoCoins size={16} style={{ color: '#fbbf24' }} />
                </div>
              </div>

              {/* Day Pass */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px'
              }}>
                <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500' }}>
                  24 hour picks day pass
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fbbf24' }}>5</span>
                  <GiTwoCoins size={16} style={{ color: '#fbbf24' }} />
                </div>
              </div>

              {/* Game Script */}
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500' }}>
                    1 Game Script
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fbbf24' }}>1-3</span>
                    <GiTwoCoins size={16} style={{ color: '#fbbf24' }} />
                  </div>
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  margin: 0
                }}>
                  Depends on strength of data available.
                </p>
              </div>
            </div>

            {/* Subscription note */}
            <div style={{
              padding: '1.25rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: '#10b981',
                marginBottom: '0.5rem'
              }}>
                Got sub?
              </p>
              <p style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '0.25rem'
              }}>
                Enjoy unlimited everything.
              </p>
              <p style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: 0
              }}>
                Picks, scripts, premium data & more.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

