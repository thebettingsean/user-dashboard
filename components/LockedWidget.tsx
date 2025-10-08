'use client'

import { SignInButton } from '@clerk/nextjs'

interface LockedWidgetProps {
  isLoggedIn: boolean
  hasSubscription: boolean
  children: React.ReactNode
}

export default function LockedWidget({ isLoggedIn, hasSubscription, children }: LockedWidgetProps) {
  // If they have access, just show the content
  if (isLoggedIn && hasSubscription) {
    return <>{children}</>
  }

  // Locked state
  const message = !isLoggedIn ? 'Please login to view' : 'Subscribe to view'
  const checkoutUrl = 'https://stripe.thebettinginsider.com/checkout/price_1QuJos07WIhZOuSIc3iG0Nsi?trial=true'

  const handleClick = () => {
    if (!isLoggedIn) {
      // Clerk's SignInButton will handle this
      return
    } else {
      // Redirect to checkout
      window.location.href = checkoutUrl
    }
  }

  return (
    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleClick}>
      {/* Blurred content preview */}
      <div style={{ 
        filter: 'blur(8px)', 
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        borderRadius: '12px',
        gap: '1rem',
        zIndex: 10
      }}>
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e6b622181cbd67efdee7b9_LOCK%20SVG.svg"
          alt="Locked"
          style={{ width: '48px', height: '48px', opacity: 0.9 }}
        />
        <p style={{ 
          color: 'white', 
          fontSize: '0.95rem', 
          fontWeight: '600',
          textAlign: 'center',
          margin: 0
        }}>
          {message}
        </p>
      </div>
    </div>
  )
}