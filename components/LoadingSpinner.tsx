'use client'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge'
  color?: string
  text?: string
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = '#a78bfa',
  text
}: LoadingSpinnerProps) {
  
  const dotSize = size === 'small' ? '6px' : size === 'large' ? '10px' : size === 'xlarge' ? '12px' : '8px'
  const gap = size === 'small' ? '4px' : size === 'large' ? '8px' : size === 'xlarge' ? '10px' : '6px'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem'
    }}>
      {/* Three dots wave */}
      <div style={{
        display: 'flex',
        gap: gap,
        alignItems: 'center'
      }}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              background: color,
              animation: `wave 1.4s ease-in-out infinite`,
              animationDelay: `${index * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Optional loading text */}
      {text && (
        <p style={{
          margin: 0,
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: size === 'small' ? '0.85rem' : size === 'large' || size === 'xlarge' ? '1.1rem' : '0.95rem',
          fontWeight: '500'
        }}>
          {text}
        </p>
      )}

      <style jsx>{`
        @keyframes wave {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          30% {
            transform: translateY(-15px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

// Inline loading component for widgets and smaller areas
export function InlineLoadingSpinner({ color = '#a78bfa' }: { color?: string }) {
  return (
    <div style={{
      display: 'inline-block',
      position: 'relative',
      width: '16px',
      height: '16px'
    }}>
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        border: `2px solid ${color}30`,
        borderTopColor: color,
        animation: 'spin-inline 0.8s linear infinite'
      }} />
      
      <style jsx>{`
        @keyframes spin-inline {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

