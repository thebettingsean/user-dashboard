'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '../lib/supabase'

export default function DiscordWidget() {
  const { user, isLoaded } = useUser()
  const [isConnected, setIsConnected] = useState(false)
  const [discordUsername, setDiscordUsername] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  // Check Discord connection status on mount
  useEffect(() => {
    if (isLoaded && user) {
      checkDiscordConnection()
      
      // Check if we just returned from OAuth
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('discord') === 'success') {
        setShowSuccess(true)
        // Remove the query param from URL
        window.history.replaceState({}, '', window.location.pathname)
        // Re-check connection to get username
        setTimeout(() => checkDiscordConnection(), 500)
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000)
      }
    } else if (isLoaded && !user) {
      setIsLoading(false)
    }
  }, [isLoaded, user])

  const checkDiscordConnection = async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('discord_users')
        .select('discord_username')
        .eq('clerk_user_id', user.id)
        .single()

      if (data && data.discord_username) {
        setIsConnected(true)
        setDiscordUsername(data.discord_username)
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Error checking Discord connection:', error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    if (!user?.id) {
      alert('Please sign in to connect Discord')
      return
    }

    if (isConnected) {
      // Open Discord channel for managing notifications
      window.open('https://discord.com/channels/1417903312552067122/1418208877018910871', '_blank')
    } else {
      // Start OAuth flow
      const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname)
      const oauthUrl = `https://addtodiscord.vercel.app/api/discord-auth?clerk_user_id=${user.id}&redirect_uri=${redirectUri}`
      window.location.href = oauthUrl
    }
  }

  if (isLoading) {
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
          Loading...
        </p>

        <div style={{ flex: 1 }} />
      </div>
    )
  }

  return (
    <div style={widgetStyle}>
      {showSuccess && (
        <div style={successBannerStyle}>
          ✓ Discord Connected Successfully!
        </div>
      )}
      
      <div style={iconWrapper}>
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
          style={{ width: '36px', height: '36px' }} 
          alt="Discord" 
        />
      </div>
      
      <h2 style={titleStyle}>
        {isConnected ? 'Discord Connected' : 'Connect Discord'}
      </h2>
      
      <p style={taglineStyle}>
        {isConnected ? `You will receive live pick notifications` : 'Receive live pick alerts'}
      </p>

      {isConnected && discordUsername && (
        <div style={usernameStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          {discordUsername}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'flex-end' }}>
        {isConnected && (
          <div style={instructionsStyle}>
            <h3 style={instructionsTitleStyle}>Quick Directions:</h3>
            <ol style={instructionsListStyle}>
              <li>Visit the #get-notifications channel</li>
              <li>Select the Insider you'd like notifications for</li>
              <li>Relax knowing you'll get notified for our top picks immediately</li>
            </ol>
          </div>
        )}
        
        <button
          onClick={handleConnect}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isConnected ? 'rgba(88, 100, 241, 0.35)' : 'rgba(88, 100, 241, 0.35)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isConnected ? 'rgba(88, 100, 241, 0.3)' : 'rgba(88, 100, 241, 0.25)'
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
  // PROPER GLASSMORPHISM:
  background: 'rgba(255, 255, 255, 0.05)', // Only 5% fill opacity
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.18)', // Thin bright border
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: `
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
  `,
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

const successBannerStyle = {
  position: 'absolute' as const,
  top: '0.75rem',
  left: '0.75rem',
  right: '0.75rem',
  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))',
  color: '#ffffff',
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  fontSize: '0.85rem',
  fontWeight: '600',
  textAlign: 'center' as const,
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
  zIndex: 10,
  animation: 'slideDown 0.3s ease-out'
}

const usernameStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '0.5rem 0.75rem',
  background: 'rgba(88, 100, 241, 0.15)',
  borderRadius: '8px',
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.85rem',
  fontWeight: '500',
  marginBottom: '1rem',
  border: '1px solid rgba(88, 100, 241, 0.25)'
}

const instructionsStyle = {
  background: 'rgba(88, 100, 241, 0.08)',
  borderRadius: '10px',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid rgba(88, 100, 241, 0.2)'
}

const instructionsTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  color: 'rgba(255, 255, 255, 0.95)',
  marginBottom: '0.5rem'
}

const instructionsListStyle = {
  margin: '0',
  paddingLeft: '1.25rem',
  fontSize: '0.75rem',
  lineHeight: '1.6',
  color: 'rgba(255, 255, 255, 0.75)'
}

