'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { HiOutlineTrophy } from 'react-icons/hi2'
import { FaWandMagicSparkles } from 'react-icons/fa6'
import { GiTwoCoins } from 'react-icons/gi'

export default function AboutPage() {
  const router = useRouter()
  const [showCards, setShowCards] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)

  // Scroll observer for cards animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowCards(true)
          }
        })
      },
      { threshold: 0.3 }
    )

    if (cardsRef.current) {
      observer.observe(cardsRef.current)
    }

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
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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

        {/* Cards Section - Triggered on Scroll */}
        <div
          ref={cardsRef}
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div style={{
            maxWidth: '1200px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            
            {/* Card 1 - Daily Expert Picks (Slide from right) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              opacity: showCards ? 1 : 0,
              transform: showCards ? 'translateX(0)' : 'translateX(100px)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: '0s'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 30px rgba(251, 191, 36, 0.3)'
              }}>
                <HiOutlineTrophy size={36} style={{ color: '#fff' }} />
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                marginBottom: '1rem',
                color: '#fff'
              }}>
                Daily Expert Picks
              </h3>
              <p style={{
                fontSize: '2rem',
                fontWeight: '800',
                color: '#10b981',
                marginBottom: '0.5rem'
              }}>
                60%+ Win Rate
              </p>
              <p style={{
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.6
              }}>
                Curated plays from professional analysts with detailed reasoning
              </p>
            </div>

            {/* Card 2 - Game Scripts (Slide from left) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              opacity: showCards ? 1 : 0,
              transform: showCards ? 'translateX(0)' : 'translateX(-100px)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: '0.2s'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 30px rgba(167, 139, 250, 0.3)'
              }}>
                <FaWandMagicSparkles size={32} style={{ color: '#fff' }} />
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                marginBottom: '1rem',
                color: '#fff'
              }}>
                Game Scripts
              </h3>
              <p style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '0.5rem'
              }}>
                Everything you need to know about a game
              </p>
              <p style={{
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.6
              }}>
                AI-powered narratives analyzing 20+ data sources
              </p>
            </div>

            {/* Card 3 - Get Credits (Slide from bottom) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              opacity: showCards ? 1 : 0,
              transform: showCards ? 'translateY(0)' : 'translateY(100px)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: '0.4s'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)'
              }}>
                <GiTwoCoins size={36} style={{ color: '#fff' }} />
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                marginBottom: '1rem',
                color: '#fff'
              }}>
                Get Credits
              </h3>
              <p style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '1.5rem'
              }}>
                Unlock picks, scripts & more
              </p>
              <button
                onClick={() => router.push('/pricing')}
                style={{
                  width: '100%',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s',
                  marginTop: '1rem'
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
                Start Now
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
