'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '../lib/supabase'
import { useEntitlements } from '../lib/hooks/useEntitlements'
import { MdLockOutline } from 'react-icons/md'
import styles from './DiscordWidget.module.css'

export default function DiscordWidget({ compact = false }: { compact?: boolean }) {
  // Development mode bypass
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  let user = null
  let isLoaded = true
  
  if (!isDevelopment) {
    const clerkUser = useUser()
    user = clerkUser.user
    isLoaded = clerkUser.isLoaded
  } else {
    // Simulate a logged-in user in development
    user = { id: 'dev-user-123' } as any
    isLoaded = true
  }

  const { hasPicks, hasAll, isLoading: entitlementsLoading } = useEntitlements()
  
  // User can access Discord if they have picks OR all entitlements (legacy)
  const canAccessDiscord = hasPicks || hasAll

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

  // Loading state
  if (isLoading || entitlementsLoading) {
    return (
      <div className={compact ? styles.compactWrapper : styles.widgetWrapper}>
        <div className={styles.headerRow}>
          <div className={styles.discordIcon}>
            <img 
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
              width={20} 
              height={20}
              alt="Discord" 
            />
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.title}>Connect Discord</h3>
            <p className={styles.subtitle}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // User doesn't have access (public betting only)
  if (!canAccessDiscord) {
    return (
      <div className={compact ? styles.compactWrapper : styles.widgetWrapper}>
        <div className={styles.lockedNotice}>
          <div className={styles.lockedIcon}>
            <MdLockOutline size={20} />
          </div>
          <div className={styles.lockedText}>
            <span className={styles.lockedTitle}>Picks Subscription Required</span>
            <span className={styles.lockedDesc}>Discord notifications are available with the Analyst Picks package.</span>
          </div>
        </div>
        
        <a href="/subscribe/picks" className={styles.upgradeButton}>
          Upgrade to Analyst Picks
        </a>
      </div>
    )
  }

  // Has access - show full widget
  return (
    <div className={compact ? styles.compactWrapper : styles.widgetWrapper}>
      {showSuccess && (
        <div className={styles.successBanner}>
          ✓ Discord Connected Successfully!
        </div>
      )}
      
      <div className={styles.headerRow}>
        <div className={`${styles.discordIcon} ${isConnected ? styles.discordIconConnected : ''}`}>
          <img 
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e56d751135b7de32426_9.svg" 
            width={20} 
            height={20}
            alt="Discord" 
          />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>
            {isConnected ? 'Discord Connected' : 'Connect Discord'}
          </h3>
          <p className={styles.subtitle}>
            {isConnected ? 'You will receive live pick notifications' : 'Receive live pick alerts'}
          </p>
        </div>
      </div>

      {isConnected && discordUsername && (
        <div className={styles.usernameBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span>{discordUsername}</span>
        </div>
      )}

      {isConnected && (
        <div className={styles.instructionsBox}>
          <h4 className={styles.instructionsTitle}>Quick Directions:</h4>
          <ol className={styles.instructionsList}>
            <li>Visit the #get-notifications channel</li>
            <li>Select the Insider you'd like notifications for</li>
            <li>Relax knowing you'll get notified for our top picks immediately</li>
          </ol>
        </div>
      )}
      
      <button
        onClick={handleConnect}
        className={`${styles.connectButton} ${isConnected ? styles.connectButtonConnected : ''}`}
      >
        {isConnected ? 'Manage Notifications' : 'Connect Discord'}
      </button>
    </div>
  )
}
