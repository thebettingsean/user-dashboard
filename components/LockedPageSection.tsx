'use client'

interface LockedPageSectionProps {
  isLocked: boolean
  children: React.ReactNode
}

export default function LockedPageSection({ isLocked, children }: LockedPageSectionProps) {
  if (!isLocked) {
    return <>{children}</>
  }

  const handleSignUpClick = () => {
    window.location.href = 'https://www.thebettinginsider.com/pricing'
  }

  const handleBackClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = 'https://dashboard.thebettinginsider.com/prop-parlay-tool'
  }

  return (
    <>
      {/* Show preview content but make it non-interactive and blurred */}
      <div style={{ 
        pointerEvents: 'none', 
        userSelect: 'none',
        filter: 'blur(8px)',
        opacity: 0.3
      }}>
        {children}
      </div>
      
      {/* Lock overlay - FIXED position covers entire viewport */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          cursor: 'pointer',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '2rem',
          overflow: 'hidden'
        }}
        onClick={handleSignUpClick}
      >
        {/* Back button in top left */}
        <button
          onClick={handleBackClick}
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 10000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>←</span>
          Back
        </button>

        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e6b622181cbd67efdee7b9_LOCK%20SVG.svg"
          alt="Locked"
          style={{ width: '80px', height: '80px', opacity: 1 }}
        />
        <div style={{ 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <p style={{ 
            color: 'white', 
            fontSize: '1.5rem', 
            fontWeight: '700',
            margin: 0,
            lineHeight: 1.2
          }}>
            This tool is for Insiders only
          </p>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '1rem', 
            fontWeight: '500',
            margin: 0
          }}>
            Please sign-up to access
          </p>
        </div>
        <button 
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '2px solid rgba(59, 130, 246, 0.8)',
            color: 'white',
            padding: '1rem 2.5rem',
            borderRadius: '10px',
            fontSize: '1.05rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginTop: '0.5rem'
          }}
        >
          Sign Up Now
        </button>
      </div>
    </>
  )
}