'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

// Map price IDs to Stripe Payment Links
const PAYMENT_LINKS: Record<string, string> = {
  // Weekly $29
  'price_1SIZoo07WIhZOuSIJB8OGgVU': 'https://buy.stripe.com/cNi14fbn1ghhbnR6zoenS0i',
  // Monthly $99
  'price_1SIZoN07WIhZOuSIm8hTDjy4': 'https://buy.stripe.com/bJeeV562H0ij1Nh5vkenS0h',
  // 6-Month $299
  'price_1SIZp507WIhZOuSIFMzU7Kkm': 'https://buy.stripe.com/9B66oz76Le999fJ3ncenS0j',
}

export default function SubscriptionCheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const priceId = params.priceId as string

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) return

    // Redirect to sign-in if not authenticated
    if (!isSignedIn) {
      router.push('/sign-in?redirect_url=' + encodeURIComponent(window.location.pathname))
      return
    }

    // Get the payment link
    const paymentLink = PAYMENT_LINKS[priceId]

    if (!paymentLink) {
      console.error('Invalid price ID:', priceId)
      router.push('/pricing?error=invalid_plan')
      return
    }

    // Redirect to Stripe Payment Link
    console.log('Redirecting to Stripe checkout:', paymentLink)
    window.location.href = paymentLink

  }, [isLoaded, isSignedIn, priceId, router])

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
        textAlign: 'center',
        color: 'white'
      }}>
        <Loader2 
          size={48} 
          style={{ 
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem',
            color: '#3b82f6'
          }} 
        />
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '0.5rem'
        }}>
          Redirecting to checkout...
        </h2>
        <p style={{
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          Please wait while we prepare your secure checkout
        </p>
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

