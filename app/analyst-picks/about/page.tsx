'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { HiOutlineTrophy } from 'react-icons/hi2'
import { FaWandMagicSparkles } from 'react-icons/fa6'
import { GiTwoCoins } from 'react-icons/gi'

export default function AboutPage() {
  const router = useRouter()
  const [visibleCards, setVisibleCards] = useState<number[]>([])
  const card1Ref = useRef<HTMLDivElement>(null)
  const card2Ref = useRef<HTMLDivElement>(null)
  const card3Ref = useRef<HTMLDivElement>(null)

  // Scroll observer for individual card animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardIndex = parseInt(entry.target.getAttribute('data-card-index') || '0')
            setVisibleCards(prev => [...new Set([...prev, cardIndex])])
          }
        })
      },
      { threshold: 0.3 }
    )

    if (card1Ref.current) observer.observe(card1Ref.current)
    if (card2Ref.current) observer.observe(card2Ref.current)
    if (card3Ref.current) observer.observe(card3Ref.current)

    return () => observer.disconnect()
  }, [])

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
        background: `
          radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        animation: 'pulse 8s ease-in-out infinite'
      }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Hero Section - Full Screen */}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 10vw, 5rem)',
              fontWeight: '900',
              lineHeight: 1.1,
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.9) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em'
            }}>
              We ❤️ the Sportsbooks
            </h1>
            
            <h2 style={{
              fontSize: 'clamp(1.75rem, 6vw, 3.5rem)',
              fontWeight: '800',
              lineHeight: 1.2,
              color: 'rgba(255, 255, 255, 0.95)',
              letterSpacing: '-0.02em'
            }}>
              Because we have the picks<br />that beat them
            </h2>
          </div>
        </div>

        {/* Cards Section - Vertical Stack */}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          gap: '2rem',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          
          {/* Card 1 - Daily Insider Picks (Slide from LEFT) */}
          <div
            ref={card1Ref}
            data-card-index="1"
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              opacity: visibleCards.includes(1) ? 1 : 0,
              transform: visibleCards.includes(1) ? 'translateX(0)' : 'translateX(-100px)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 30px rgba(251, 191, 36, 0.3)'
            }}>
              <HiOutlineTrophy size={36} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: '#fff',
                  margin: 0
                }}>
                  Daily Insider Picks
                </h3>
                <span style={{
                  padding: '0.3rem 0.75rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: '#10b981'
                }}>
                  60%+
                </span>
              </div>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.5,
                margin: 0
              }}>
                Curated plays from professional analysts with detailed reasoning
              </p>
            </div>
          </div>

          {/* Card 2 - Game Scripts (Slide from RIGHT) */}
          <div
            ref={card2Ref}
            data-card-index="2"
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              opacity: visibleCards.includes(2) ? 1 : 0,
              transform: visibleCards.includes(2) ? 'translateX(0)' : 'translateX(100px)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: '0.2s',
              flexWrap: 'wrap'
            }}
          >
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 30px rgba(167, 139, 250, 0.3)'
            }}>
              <FaWandMagicSparkles size={32} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: '#fff',
                  margin: 0
                }}>
                  Game Scripts
                </h3>
                <span style={{
                  padding: '0.3rem 0.75rem',
                  background: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: '#a78bfa'
                }}>
                  30+ data points
                </span>
              </div>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.5,
                margin: 0
              }}>
                Everything you need to know about any game you're interested in
              </p>
            </div>
          </div>

          {/* Card 3 - Sign Up CTA (Slide from BOTTOM) */}
          <div
            ref={card3Ref}
            data-card-index="3"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              opacity: visibleCards.includes(3) ? 1 : 0,
              transform: visibleCards.includes(3) ? 'translateY(0)' : 'translateY(100px)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: '0.4s',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)'
            }}>
              <GiTwoCoins size={42} style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 style={{
                fontSize: '2rem',
                fontWeight: '900',
                marginBottom: '0.75rem',
                color: '#fff'
              }}>
                Start Earning ASAP
              </h3>
              <p style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0
              }}>
                Unlock picks, scripts & more
              </p>
            </div>
            <button
              onClick={() => router.push('/pricing')}
              style={{
                padding: '1.1rem 3rem',
                fontSize: '1.2rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s',
                marginTop: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 30px rgba(16, 185, 129, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              Sign Up Now
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
