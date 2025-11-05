'use client'

import { useUser, SignInButton } from '@clerk/nextjs'

interface LockedWidgetProps {
  isLoggedIn: boolean
  hasSubscription: boolean
  children: React.ReactNode
}

export default function LockedWidget({ isLoggedIn, hasSubscription, children }: LockedWidgetProps) {
  const { isSignedIn } = useUser()

  // If they have access, just show the content
  if (isLoggedIn && hasSubscription) {
    return <>{children}</>
  }

  // Determine message and action based on sign-in status
  const message = isSignedIn ? 'Upgrade to view' : 'Sign in to view'
  
  const handleClick = () => {
    if (isSignedIn) {
      // Signed in but no subscription → show unlock modal
      console.log('🔒 Locked widget clicked - triggering modal')
      if ((window as any).showUnlockModal) {
        ;(window as any).showUnlockModal()
      } else {
        // Fallback to /upgrade redirect if modal not available
        window.location.href = '/upgrade'
      }
    }
    // If not signed in, do nothing (SignInButton will handle it)
  }

  // For locked state, we'll show a preview with blur on lower portion
  // If not signed in, wrap in SignInButton
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          {/* Show the full widget but make it non-interactive */}
          <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {children}
          </div>

          {/* Blur overlay */}
          <div 
            style={{
              position: 'absolute',
              top: '100px',
              left: '12px',
              right: '12px',
              bottom: '12px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              zIndex: 10
            }}
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
      </SignInButton>
    )
  }

  // Signed in but no subscription → redirect to /upgrade
  return (
    <div 
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={handleClick}
    >
      {/* Show the full widget but make it non-interactive */}
      <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Blur overlay */}
      <div 
        style={{
          position: 'absolute',
          top: '100px',
          left: '12px',
          right: '12px',
          bottom: '12px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 10
        }}
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