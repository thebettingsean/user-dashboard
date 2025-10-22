'use client'

import Link from 'next/link'

export default function MaximizeProfitWidget() {
  return (
    <Link 
      href="/maximize-profit"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <img 
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f5587d5070371cf5332631_MAXIMIZE%20PROFIT!.svg" 
            style={{ width: '36px', height: '36px' }} 
            alt="Maximize Profit" 
          />
        </div>
        
        <h2 style={titleStyle}>
          Maximize Profit
        </h2>
        
        <p style={taglineStyle}>
          Learn how to win with our tools
        </p>

        <div style={usernameBoxStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Complete member profit guide
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between' }}>
          <div style={chaptersBoxStyle}>
            <h3 style={chaptersHeaderStyle}>Quick Chapters:</h3>
            <ol style={chaptersListStyle}>
              <li>Analyst Picks & Notifications</li>
              <li>Premium Data Suite</li>
              <li>Tools & Playbooks</li>
              <li>Best Practices & Routines</li>
            </ol>
          </div>

          <button style={viewButtonStyle}>
            View Full Guide
          </button>
        </div>
      </div>
    </Link>
  )
}

const widgetStyle = {
  // PROPER GLASSMORPHISM:
  background: 'rgba(255, 255, 255, 0.05)', // Only 5% fill opacity
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: 'none', // No border at all
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)', // Subtle shadow, no inset
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(0, 87, 45, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 87, 45, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(0, 87, 45, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  zIndex: 2
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '0.25rem',
  color: '#fff'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const usernameBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '0.5rem 0.75rem',
  background: 'rgba(0, 87, 45, 0.15)',
  borderRadius: '8px',
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.85rem',
  fontWeight: '500',
  marginBottom: '1rem',
  border: '1px solid rgba(0, 87, 45, 0.25)'
}

const chaptersBoxStyle = {
  background: 'rgba(0, 87, 45, 0.08)',
  borderRadius: '10px',
  padding: '1rem',
  border: '1px solid rgba(0, 87, 45, 0.2)',
  marginTop: '1rem'
}

const chaptersHeaderStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  color: 'rgba(255, 255, 255, 0.95)',
  marginBottom: '0.5rem',
  margin: '0 0 0.5rem 0'
}

const chaptersListStyle = {
  margin: '0',
  paddingLeft: '1.25rem',
  fontSize: '0.75rem',
  lineHeight: '1.6',
  color: 'rgba(255, 255, 255, 0.75)'
}

const viewButtonStyle = {
  background: 'rgba(0, 87, 45, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(0, 87, 45, 0.3)',
  borderRadius: '10px',
  padding: '0.875rem 1.5rem',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 8px rgba(0, 87, 45, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  textAlign: 'center' as const,
  width: '100%',
  marginTop: '1rem'
}

