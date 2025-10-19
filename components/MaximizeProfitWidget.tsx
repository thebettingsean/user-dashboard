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
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f52280504a85f461104f88_NEW%20WIDGET%20SVG%27S-5.svg" 
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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between' }}>
          <div style={contentBoxStyle}>
            <p style={guideTextStyle}>
              📚 Complete member profit guide
            </p>
            <p style={guideDescStyle}>
              Step-by-step playbooks, best practices, and daily routines to maximize your edge
            </p>
          </div>

          <div style={chaptersBoxStyle}>
            <h3 style={chaptersHeaderStyle}>Quick Chapters:</h3>
            <ol style={chaptersListStyle}>
              <li>Analyst Picks & Notifications</li>
              <li>Premium Data Suite</li>
              <li>Tools & Playbooks</li>
              <li>Weekly Report Strategy</li>
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
  background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(50px) saturate(180%)',
  WebkitBackdropFilter: 'blur(50px) saturate(180%)',
  borderRadius: '20px',
  padding: '1.5rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  minHeight: '320px',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
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

const contentBoxStyle = {
  padding: '1rem',
  background: 'rgba(0, 87, 45, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '10px',
  border: '1px solid rgba(0, 87, 45, 0.3)',
  textAlign: 'center' as const,
  boxShadow: '0 2px 8px rgba(0, 87, 45, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
}

const guideTextStyle = {
  fontSize: '0.9rem', 
  fontWeight: '700',
  margin: '0 0 0.5rem 0',
  color: '#fff'
}

const guideDescStyle = {
  fontSize: '0.75rem',
  lineHeight: '1.4',
  opacity: 0.75,
  margin: 0,
  color: '#fff'
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

