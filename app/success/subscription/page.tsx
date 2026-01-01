'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { GiSupersonicArrow, GiCash } from 'react-icons/gi'

function SubscriptionSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get the primary product that was purchased
  const product = searchParams.get('product') || 'picks'
  
  // Determine redirect based on product
  const redirectPath = product === 'publicBetting' ? '/public-betting' : '/picks'
  const productName = product === 'publicBetting' ? 'Public Betting' : 'Analyst Picks'
  const ProductIcon = product === 'publicBetting' ? GiCash : GiSupersonicArrow

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
        maxWidth: '450px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Company Logo */}
        <div style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
            alt="The Betting Insider"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Main Heading */}
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#fff',
          marginBottom: '0.5rem',
          lineHeight: 1.2
        }}>
          Welcome to {productName}!
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.5)',
          marginBottom: '1.5rem'
        }}>
          Your 3-day free trial has started
        </p>

        {/* Product Access Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          textAlign: 'left'
        }}>
          <p style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center'
          }}>
            You Now Have Access To:
          </p>
          
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ProductIcon style={{ color: '#3b82f6', fontSize: '1.25rem' }} />
              <span style={{ fontSize: '1rem', color: '#fff', fontWeight: '600' }}>
                {productName}
              </span>
            </div>
            
            {product === 'picks' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem' }}>
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>✓</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Daily expert picks across all sports
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem' }}>
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>✓</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Detailed analysis and write-ups
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem' }}>
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>✓</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Full analyst history and stats
                  </span>
                </div>
              </>
            )}
            
            {product === 'publicBetting' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem' }}>
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>✓</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Public betting splits from 150+ sportsbooks
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem' }}>
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>✓</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Line movement tracking
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '2rem' }}>
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>✓</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Market indicators (Public/Vegas/Whale)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Motivational Text */}
        <p style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: '#fff',
          marginBottom: '1.25rem',
          lineHeight: 1.4
        }}>
          You're about to make some serious profit.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => router.push(redirectPath)}
          style={{
            width: '100%',
            padding: '0.875rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '700',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)'
          }}
        >
          <ProductIcon style={{ fontSize: '1.25rem' }} />
          Go to {productName}
        </button>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        Loading...
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  )
}
