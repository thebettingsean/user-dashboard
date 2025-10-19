'use client'

import { useState } from 'react'

export default function DiscordWidget() {
  const [isConnected, setIsConnected] = useState(false)

  const handleConnect = () => {
    // TODO: Implement Discord OAuth logic
    setIsConnected(!isConnected)
  }

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
          style={{ width: '36px', height: '36px' }} 
          alt="Discord" 
        />
      </div>
      
      <h2 style={titleStyle}>
        Connect Discord
      </h2>
      
      <p style={taglineStyle}>
        Receive live pick alerts
      </p>

      <div style={{ flex: 1 }}>
        <button
          onClick={handleConnect}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(88, 100, 241, 0.35)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(88, 100, 241, 0.25)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {isConnected ? 'Manage Notifications' : 'Connect Discord'}
        </button>
      </div>
    </div>
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
  border: '1.5px solid rgba(88, 100, 241, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(88, 100, 241, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(88, 100, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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

const buttonStyle = {
  background: 'rgba(88, 100, 241, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(88, 100, 241, 0.3)',
  borderRadius: '10px',
  padding: '0.875rem 1.5rem',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 8px rgba(88, 100, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  textAlign: 'center' as const,
  width: '100%',
  marginTop: 'auto'
}

