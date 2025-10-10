'use client'

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

  // Locked state - unified message for both scenarios
  const message = 'You must sign-up to view'
  const pricingUrl = 'https://www.thebettinginsider.com/pricing'

  const handleClick = () => {
    window.location.href = pricingUrl
  }

  // For locked state, we'll show a preview with blur on lower portion
  return (
    <div 
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={handleClick}
    >
      {/* Show the full widget but make it non-interactive */}
      <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Blur overlay - positioned to cover everything except top ~100px */}
      <div 
        style={{
          position: 'absolute',
          top: '100px', // Start blur below the header area
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