'use client'

import { useState } from 'react'

export default function DiscordWidget() {
  const [isConnected, setIsConnected] = useState(false)

  const widgetStyle = {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    color: '#ffffff',
    paddingBottom: '1rem'
  }

  const iconWrapper = {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'rgba(88, 100, 241, 0.12)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(88, 100, 241, 0.4)',
    boxShadow: '0 4px 12px rgba(88, 100, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem'
  }

  const buttonStyle = {
    background: 'linear-gradient(135deg, rgba(88, 100, 241, 0.2) 0%, rgba(88, 100, 241, 0.1) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(88, 100, 241, 0.4)',
    borderRadius: '12px',
    padding: '0.875rem 1.5rem',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(88, 100, 241, 0.2)',
    marginTop: 'auto',
    textAlign: 'center' as const
  }

  const handleConnect = () => {
    // TODO: Implement Discord OAuth logic
    setIsConnected(!isConnected)
  }

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
          style={{ width: '32px', height: '32px' }} 
          alt="Discord" 
        />
      </div>
      
      <h3 style={{ 
        fontSize: '1.2rem', 
        fontWeight: '700', 
        marginBottom: '0.5rem',
        color: '#ffffff'
      }}>
        Connect Discord
      </h3>
      
      <p style={{ 
        fontSize: '0.85rem', 
        opacity: 0.7, 
        marginBottom: '1.5rem',
        color: '#ffffff'
      }}>
        Receive live pick alerts
      </p>

      <button
        onClick={handleConnect}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(88, 100, 241, 0.3) 0%, rgba(88, 100, 241, 0.2) 100%)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(88, 100, 241, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(88, 100, 241, 0.2) 0%, rgba(88, 100, 241, 0.1) 100%)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(88, 100, 241, 0.2)'
        }}
      >
        {isConnected ? 'Manage Notifications' : 'Connect Discord'}
      </button>
    </div>
  )
}

