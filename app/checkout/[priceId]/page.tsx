'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    // Redirect to sign in if not authenticated
    if (!isSignedIn) {
      router.push('/sign-in?redirect_url=' + encodeURIComponent(window.location.pathname))
      return
    }

    // Create checkout session
    const createCheckoutSession = async () => {
      try {
        const priceId = params.priceId as string
        
        console.log('🔵 Creating checkout session for:', priceId)

        const response = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId })
        })

        const data = await response.json()

        if (response.ok && data.url) {
          console.log('✅ Redirecting to Stripe Checkout')
          window.location.href = data.url
        } else {
          console.error('❌ Failed to create session:', data.error)
          setError(data.error || 'Failed to create checkout session')
          setLoading(false)
        }
      } catch (err) {
        console.error('❌ Error:', err)
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }

    createCheckoutSession()
  }, [isLoaded, isSignedIn, params.priceId, router])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        {loading ? (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              margin: '0 auto 1.5rem',
              animation: 'spin 1s linear infinite'
            }} />
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '0.5rem'
            }}>
              Preparing your checkout...
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              You'll be redirected to Stripe in a moment
            </p>
          </>
        ) : error ? (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.5rem',
              color: '#ef4444'
            }}>
              ✕
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '0.5rem'
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '1.5rem'
            }}>
              {error}
            </p>
            <button
              onClick={() => router.push('/pricing')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Back to Pricing
            </button>
          </>
        ) : null}
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

