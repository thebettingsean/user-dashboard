'use client'

import { useRouter } from 'next/navigation'
import { Infinity } from 'lucide-react'
import { FaWandMagicSparkles } from 'react-icons/fa6'
import { HiOutlineTrophy } from 'react-icons/hi2'
import { TbLayoutGridFilled } from 'react-icons/tb'
import { BiStats } from 'react-icons/bi'

export default function SubscriptionSuccessPage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background orbs */}
      <div className="orb-3"></div>
      <div className="orb-4"></div>
      <div className="orb-5"></div>

      <div style={{
        maxWidth: '550px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Success Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)'
        }}>
          <Infinity style={{ fontSize: '2.5rem', color: '#fff', strokeWidth: 3 }} />
        </div>

        {/* Main Heading */}
        <h1 style={{
          fontSize: '1.85rem',
          fontWeight: '700',
          color: '#fff',
          marginBottom: '0.5rem',
          lineHeight: 1.2
        }}>
          You Now Have Unlimited Credits<br />& Unlimited Access!
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '0.95rem',
          color: 'rgba(255, 255, 255, 0.5)',
          marginBottom: '2rem'
        }}>
          Thank you for your purchase
        </p>

        {/* Features List */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <p style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            You Now Have Full Access To:
          </p>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FaWandMagicSparkles style={{ fontSize: '1rem', color: '#8b5cf6' }} />
              </div>
              <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '500' }}>
                Game Scripts
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <TbLayoutGridFilled style={{ fontSize: '1rem', color: '#8b5cf6' }} />
              </div>
              <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '500' }}>
                Blueprints
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <HiOutlineTrophy style={{ fontSize: '1rem', color: '#8b5cf6' }} />
              </div>
              <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '500' }}>
                Insider Picks
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <BiStats style={{ fontSize: '1rem', color: '#8b5cf6' }} />
              </div>
              <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '500' }}>
                Premium Data
              </span>
            </div>
          </div>
        </div>

        {/* Motivational Text */}
        <p style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          color: '#fff',
          marginBottom: '1.5rem',
          lineHeight: 1.4
        }}>
          You're about to make some serious profit.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => router.push('/sports')}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: '700',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.3)'
          }}
        >
          Start Winning
        </button>
      </div>
    </div>
  )
}

