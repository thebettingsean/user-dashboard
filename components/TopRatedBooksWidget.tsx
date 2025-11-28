'use client'

import Link from 'next/link'
import { IoBookSharp } from 'react-icons/io5'

export default function TopRatedBooksWidget({ compact = false }: { compact?: boolean }) {
  const content = (
    <>
      {!compact && (
        <div style={iconWrapper}>
          <IoBookSharp size={28} />
        </div>
      )}
      
      {!compact && (
        <>
          <h2 style={titleStyle}>Top Rated Books</h2>
          <p style={taglineStyle}>Our favorite sportsbooks</p>
        </>
      )}

      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.9)' }}>
        Get exclusive offers from top-rated sportsbooks.<br />
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
          Plus 30 days free when you sign up!
        </span>
      </p>

      <Link href="/sportsbooks" style={{ textDecoration: 'none' }}>
        <button 
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(234, 179, 8, 0.35)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(234, 179, 8, 0.25)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          View Offers
        </button>
      </Link>
    </>
  )

  if (compact) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{content}</div>
  }

  return (
    <>
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <IoBookSharp size={28} />
        </div>
        
        <h2 style={titleStyle}>Top Rated Books</h2>
        <p style={taglineStyle}>Our favorite sportsbooks</p>

        <div style={infoBoxStyle}>
          <p style={{ margin: '0', fontSize: '0.85rem', lineHeight: '1.5', textAlign: 'center' }}>
            Get exclusive offers from top-rated sportsbooks.<br />
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              Plus 30 days free when you sign up!
            </span>
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <Link href="/sportsbooks" style={{ textDecoration: 'none' }}>
          <button 
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(234, 179, 8, 0.35)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(234, 179, 8, 0.25)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            View Offers
          </button>
        </Link>
      </div>
    </>
  )
}

// STYLES - MATCH OTHER WIDGETS EXACTLY
const widgetStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '0.5px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(234, 179, 8, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(234, 179, 8, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(234, 179, 8, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  zIndex: 2,
  color: '#eab308'
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '0.25rem',
  color: '#fff',
  paddingRight: '60px'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const infoBoxStyle = {
  background: 'rgba(234, 179, 8, 0.08)',
  borderRadius: '10px',
  padding: '1rem',
  border: '1px solid rgba(234, 179, 8, 0.2)',
  marginBottom: '1rem',
  color: 'rgba(255, 255, 255, 0.9)'
}

const buttonStyle = {
  width: '100%',
  background: 'rgba(234, 179, 8, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(234, 179, 8, 0.3)',
  borderRadius: '10px',
  padding: '0.875rem 1.5rem',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(234, 179, 8, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  textAlign: 'center' as const,
  marginTop: 'auto'
}

