'use client'

import { useState } from 'react'
import { Sparkles, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { GiTwoCoins } from "react-icons/gi"

export default function PricingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Price IDs for checkout
  const CREDIT_PACK_PRICE = 'price_1SPoAC07WIhZOuSIkWA98Qwy'

  const subscriptionPlans = [
    { 
      id: 'weekly', 
      price: '$29', 
      period: 'Weekly Sub',
      priceId: 'price_1SIZoo07WIhZOuSIJB8OGgVU',
      // Keep old checkout URL as fallback for now
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoo07WIhZOuSIJB8OGgVU'
    },
    { 
      id: 'monthly', 
      price: '$99', 
      period: 'Monthly Sub',
      priceId: 'price_1SIZoN07WIhZOuSIm8hTDjy4',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZoN07WIhZOuSIm8hTDjy4'
    },
    { 
      id: '6month', 
      price: '$299', 
      period: '6-Month Sub',
      priceId: 'price_1SIZp507WIhZOuSIFMzU7Kkm',
      checkoutUrl: 'https://stripe.thebettinginsider.com/checkout/price_1SIZp507WIhZOuSIFMzU7Kkm'
    }
  ]

  const isSubscriptionSelected = ['weekly', 'monthly', '6month'].includes(selectedPlan || '')

  const handleContinue = async () => {
    if (!selectedPlan) return

    setLoading(true)

    if (selectedPlan === 'credits') {
      // Redirect to our custom checkout handler for credit pack
      router.push(`/checkout/${CREDIT_PACK_PRICE}`)
    } else {
      // For subscriptions, still use old checkout URL (will migrate later)
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
                          / Unlimited
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
                            Popular
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
                      {['Unlimited Credits', 'Daily Insider Picks', 'All Premium Data', plan.period].map((feature) => (
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
    </div>
  )
}

