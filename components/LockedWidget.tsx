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

  // Locked state - but we need to separate header from content
  // This is tricky because we're wrapping already-rendered components
  // We'll just blur everything and overlay the lock
  const message = !isLoggedIn ? 'Please login to view' : 'Subscribe to view'
  const checkoutUrl = 'https://stripe.thebettinginsider.com/checkout/price_1QuJos07WIhZOuSIc3iG0Nsi?trial=true'

  const handleClick = () => {
    if (!isLoggedIn) {
      // Will be handled by SignInButton wrapper
      return
    } else {
      window.location.href = checkoutUrl
    }
  }

  // For locked state, we'll show a preview with blur on lower portion
  return (
    <div style={{ position: 'relative' }}>
      {/* Show the full widget but make it non-interactive */}
      <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Blur overlay - positioned to cover everything except top ~100px */}
      <div 
        style={{
          position: 'absolute',
          top: '100px', // Start blur below the header area
          left: 0,
          right: 0,
          bottom: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '0 0 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          cursor: 'pointer',
          zIndex: 10
        }}
        onClick={handleClick}
      >
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