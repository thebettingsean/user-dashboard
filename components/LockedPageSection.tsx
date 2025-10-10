'use client'

interface LockedPageSectionProps {
  isLocked: boolean
  children: React.ReactNode
}

export default function LockedPageSection({ isLocked, children }: LockedPageSectionProps) {
  if (!isLocked) {
    return <>{children}</>
  }

  const handleClick = () => {
    window.location.href = 'https://www.thebettinginsider.com/pricing'
  }

  return (
    <div style={{ position: 'relative', minHeight: '500px' }}>
      {/* Show preview content but make it non-interactive */}
      <div style={{ 
        pointerEvents: 'none', 
        userSelect: 'none',
        filter: 'blur(4px)',
        opacity: 0.5
      }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div 
        style={{
          position: 'absolute',
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
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.2)'
        }}
        onClick={handleClick}
      >
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e6b622181cbd67efdee7b9_LOCK%20SVG.svg"
          alt="Locked"
          style={{ width: '64px', height: '64px', opacity: 0.9 }}
        />
        <p style={{ 
          color: 'white', 
          fontSize: '1.25rem', 
          fontWeight: '700',
          textAlign: 'center',
          margin: 0,
          maxWidth: '400px',
          padding: '0 1rem'
        }}>
          You must be an Insider to use this
        </p>
        <button 
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '2px solid rgba(59, 130, 246, 0.8)',
            color: 'white',
            padding: '0.85rem 2rem',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Click here to sign up
        </button>
      </div>
    </div>
  )
}