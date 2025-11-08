'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { FaWandMagicSparkles, FaChartLine, FaTrophy, FaLock, FaUnlock } from 'react-icons/fa6'
import { HiOutlineTrophy } from 'react-icons/hi2'
import { GiTwoCoins } from 'react-icons/gi'
import { IoSparkles, IoCheckmarkCircle } from 'react-icons/io5'
import { PiMoneyWavy } from 'react-icons/pi'

export default function AboutPage() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const handleCTA = () => {
    if (isSignedIn) {
      router.push('/pricing')
    } else {
      // Trigger Clerk sign-up modal
      const signUpButton = document.querySelector('[data-clerk-sign-up]') as HTMLButtonElement
      if (signUpButton) signUpButton.click()
    }
  }

  const features = [
    {
      icon: <FaWandMagicSparkles size={24} />,
      title: 'AI Game Scripts',
      description: 'Deep-dive narratives powered by AI analyzing team stats, trends, and expert picks',
      color: '#a78bfa'
    },
    {
      icon: <HiOutlineTrophy size={24} />,
      title: 'Insider Picks',
      description: 'Curated plays from our top analysts with detailed write-ups and reasoning',
      color: '#fbbf24'
    },
    {
      icon: <FaChartLine size={24} />,
      title: 'Premium Data',
      description: 'Public betting trends, sharp money indicators, referee stats, and more',
      color: '#10b981'
    }
  ]

  const howItWorks = [
    { step: '1', title: 'Sign Up Free', description: 'Get 2 free credits instantly' },
    { step: '2', title: 'Browse & Unlock', description: 'Use credits on scripts & picks' },
    { step: '3', title: 'Win More', description: 'Place smarter, data-driven bets' }
  ]

  const faqs = [
    {
      question: 'How does the credit system work?',
      answer: 'Credits are used to unlock AI scripts (1-3 credits) and insider picks (1 credit each). You get 2 free credits on sign-up. Purchase more credits or subscribe for unlimited access.'
    },
    {
      question: 'Can I really start for free?',
      answer: 'Yes! Every new user gets 2 free credits to try our AI scripts and insider picks. No credit card required to sign up.'
    },
    {
      question: 'What makes your picks different?',
      answer: 'Our picks combine AI analysis of 20+ data sources with human expertise from professional analysts. We don\'t just guess - we analyze trends, sharp money, public betting, and team dynamics.'
    },
    {
      question: 'How accurate are the picks?',
      answer: 'Our top analysts maintain a 60%+ win rate over the season. We track all picks transparently with full performance history available on the dashboard.'
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '24px',
            padding: '0.4rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#a78bfa'
          }}>
            <IoSparkles size={16} />
            AI-Powered Sports Betting Intelligence
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 8vw, 3.5rem)',
            fontWeight: '800',
            lineHeight: 1.1,
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            We ❤️ the Sportsbooks
          </h1>
          
          <h2 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
            fontWeight: '700',
            lineHeight: 1.2,
            marginBottom: '1.5rem',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            Because we have the picks that beat them
          </h2>

          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem'
          }}>
            Join thousands of winning bettors using AI-powered game scripts and expert analyst picks to dominate the sportsbooks
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button
              onClick={handleCTA}
              style={{
                padding: '0.9rem 2rem',
                fontSize: '1rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <GiTwoCoins size={20} />
              Start Free - Get 2 Credits
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding: '0.9rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              See How It Works
            </button>
          </div>

          {/* Trust Indicators */}
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IoCheckmarkCircle size={18} style={{ color: '#10b981' }} />
              No Credit Card Required
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IoCheckmarkCircle size={18} style={{ color: '#10b981' }} />
              2 Free Credits on Sign Up
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IoCheckmarkCircle size={18} style={{ color: '#10b981' }} />
              Cancel Anytime
            </div>
          </div>
        </div>

        {/* Social Proof Bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '4rem',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981', marginBottom: '0.25rem' }}>60%+</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>Win Rate</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#a78bfa', marginBottom: '0.25rem' }}>10K+</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>Active Users</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24', marginBottom: '0.25rem' }}>50K+</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>Picks Analyzed</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '3rem',
            color: '#fff'
          }}>
            How You Actually Make Money
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {howItWorks.map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#fff'
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#fff' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '3rem',
            color: '#fff'
          }}>
            Everything You Need to Win
          </h2>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {features.map((feature, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem',
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  minWidth: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: `${feature.color}20`,
                  border: `1px solid ${feature.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feature.color
                }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.75rem', color: '#fff' }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.6 }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '20px',
          padding: '3rem 2rem',
          textAlign: 'center',
          marginBottom: '4rem'
        }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            marginBottom: '1rem',
            color: '#fff'
          }}>
            Ready to Beat the Sportsbooks?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem'
          }}>
            Join the winning side. Start with 2 free credits - no credit card required.
          </p>
          <button
            onClick={handleCTA}
            style={{
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <GiTwoCoins size={24} />
            Get Started Free
          </button>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '2rem',
            color: '#fff'
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                marginBottom: '1rem',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1.25rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {faq.question}
                  <span style={{ fontSize: '1.5rem', transition: 'transform 0.2s', transform: expandedFaq === idx ? 'rotate(45deg)' : 'none' }}>
                    +
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div style={{
                    padding: '0 1.25rem 1.25rem',
                    fontSize: '0.95rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.6
                  }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{ textAlign: 'center', paddingBottom: '3rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2rem' }}>
            Start winning today. It's free to try.
          </p>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: '0.8rem 2rem',
              fontSize: '0.95rem',
              fontWeight: '600',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            View Pricing →
          </button>
        </div>

      </div>
    </div>
  )
}

