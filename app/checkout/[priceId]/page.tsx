'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const params = useParams()
  const { isSignedIn, user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const priceId = params.priceId as string

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      // Redirect to sign-in
      router.push('/sign-in')
      return
    }

    // Create checkout session
    createCheckoutSession()
  }, [isSignedIn, isLoaded, user])

  const createCheckoutSession = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          clerkUserId: user?.id,
          email: user?.primaryEmailAddress?.emailAddress,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout URL directly
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      {/* Background orbs */}
      <div className="orb-3"></div>
      <div className="orb-4"></div>
      <div className="orb-5"></div>

      <div style={{
        maxWidth: '500px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '3rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {loading && (
          <>
            <Loader2 style={{
              width: '48px',
              height: '48px',
              color: '#8b5cf6',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }} />
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'inline-block'
            }}>
              3-Day FREE Trial
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '0.5rem'
            }}>
              Starting Your FREE Trial...
            </h2>
            <p style={{
              fontSize: '0.95rem',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              Try everything free for 3 days. Cancel anytime.
            </p>
          </>
        )}

        {error && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#ef4444',
              fontSize: '1.5rem',
              fontWeight: '700'
            }}>
              !
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
              fontSize: '0.95rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '1.5rem'
            }}>
              {error}
            </p>
            <button
              onClick={() => router.push('/pricing')}
              style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Back to Pricing
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
