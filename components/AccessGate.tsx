'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEntitlements, Entitlement } from '@/lib/hooks/useEntitlements'
import { Loader2, Lock } from 'lucide-react'

interface AccessGateProps {
  /** Which entitlement is required to view this content */
  requires: Entitlement
  /** Content to show when user has access */
  children: React.ReactNode
  /** Optional: Show loading state while checking (default: true) */
  showLoading?: boolean
  /** Optional: Custom fallback when access is denied */
  fallback?: React.ReactNode
}

/**
 * Access Gate Component
 * 
 * Wraps content that requires a specific entitlement.
 * Shows loading state while checking, then either shows content or redirects.
 * 
 * Usage:
 * <AccessGate requires="picks">
 *   <PicksContent />
 * </AccessGate>
 */
export function AccessGate({ 
  requires, 
  children, 
  showLoading = true,
  fallback 
}: AccessGateProps) {
  const router = useRouter()
  const { isSignedIn, isLoaded: clerkLoaded } = useUser()
  const { openSignIn } = useClerk()
  const { isLoading, has, entitlements } = useEntitlements()

  const hasAccess = has(requires)

  useEffect(() => {
    // Wait for everything to load
    if (!clerkLoaded || isLoading) return

    // If not signed in, prompt to sign in
    if (!isSignedIn) {
      openSignIn({
        redirectUrl: window.location.pathname,
      })
      return
    }

    // If signed in but no access, redirect to appropriate page
    if (isSignedIn && !hasAccess) {
      // Redirect to subscribe page for this product
      const productMap: Record<Entitlement, string> = {
        picks: 'picks',
        publicBetting: 'publicBetting',
        builder: 'builder',
      }
      router.push(`/subscribe/${productMap[requires]}`)
    }
  }, [clerkLoaded, isLoading, isSignedIn, hasAccess, requires, router, openSignIn])

  // Show loading while checking
  if (!clerkLoaded || isLoading) {
    if (!showLoading) return null
    
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #030712 0%, #0a0f1a 50%, #111827 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
          color: '#fff',
        }}>
          <Loader2 
            style={{ 
              width: 48, 
              height: 48, 
              color: '#8b5cf6',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }} 
          />
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            Checking access...
          </p>
        </div>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Show custom fallback if provided and no access
  if (!hasAccess && fallback) {
    return <>{fallback}</>
  }

  // Show nothing if no access (will redirect)
  if (!hasAccess) {
    return null
  }

  // User has access - render children
  return <>{children}</>
}

/**
 * Hook to check a specific entitlement
 * Useful for conditional rendering within a component
 * 
 * Usage:
 * const canSeePicks = useHasEntitlement('picks')
 * if (canSeePicks) { ... }
 */
export function useHasEntitlement(entitlement: Entitlement): boolean {
  const { has } = useEntitlements()
  return has(entitlement)
}

/**
 * Simple lock icon component for showing locked content
 */
export function LockedContent({ 
  message = 'Subscribe to unlock',
  entitlement,
}: { 
  message?: string 
  entitlement: Entitlement
}) {
  const router = useRouter()
  
  const productMap: Record<Entitlement, string> = {
    picks: 'picks',
    publicBetting: 'publicBetting',
    builder: 'builder',
  }

  return (
    <div 
      onClick={() => router.push(`/subscribe/${productMap[entitlement]}`)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed rgba(255,255,255,0.15)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <Lock size={24} style={{ color: 'rgba(255,255,255,0.4)' }} />
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
        {message}
      </span>
    </div>
  )
}

