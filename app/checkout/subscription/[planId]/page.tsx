'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

// Map plan IDs to Stripe Payment Links
const PAYMENT_LINKS: Record<string, string> = {
  'weekly': 'https://buy.stripe.com/cNi14fbn1ghhbnR6zoenS0i',
  'monthly': 'https://buy.stripe.com/bJeeV562H0ij1Nh5vkenS0h',
  '6month': 'https://buy.stripe.com/9B66oz76Le999fJ3ncenS0j',
}

export default function SubscriptionRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isSignedIn, isLoaded } = useUser()
  const planId = params.planId as string

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) return

    // Redirect to sign-in if not authenticated
    if (!isSignedIn || !user) {
      router.push('/sign-in?redirect_url=' + encodeURIComponent(window.location.pathname))
      return
    }

    // Get the payment link
    const paymentLink = PAYMENT_LINKS[planId]

    if (!paymentLink) {
      console.error('Invalid plan ID:', planId)
      router.push('/pricing?error=invalid_plan')
      return
    }

    // Get user's email from Clerk
    const userEmail = user.emailAddresses[0]?.emailAddress

    if (!userEmail) {
      console.error('No email found for user')
      router.push('/pricing?error=no_email')
      return
    }

    // Add prefilled_email parameter to Payment Link
    const checkoutUrl = `${paymentLink}?prefilled_email=${encodeURIComponent(userEmail)}`

    // Redirect to Stripe Payment Link with user's email
    console.log('Redirecting to Stripe checkout:', checkoutUrl)
    window.location.href = checkoutUrl

  }, [isLoaded, isSignedIn, user, planId, router])

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

