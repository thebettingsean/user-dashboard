// lib/hooks/useEntitlements.ts
'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { UserEntitlements, DEFAULT_ENTITLEMENTS, Entitlement } from '../config/subscriptions'

interface EntitlementsResponse {
  hasAccess: boolean
  entitlements: UserEntitlements
  subscriptionStatus: string | null
  isTrialing: boolean
  currentPeriodEnd: number | null
  cancelAtPeriodEnd: boolean
}

interface UseEntitlementsReturn {
  isLoading: boolean
  entitlements: UserEntitlements
  subscriptionStatus: string | null
  isTrialing: boolean
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  // Convenience methods
  has: (entitlement: Entitlement) => boolean
  hasPicks: boolean
  hasPublicBetting: boolean
  hasBuilder: boolean
  hasAny: boolean
  hasAll: boolean
}

/**
 * Hook to check user entitlements
 * Use this for feature-gating instead of checking price IDs
 * 
 * Usage:
 * const { hasPicks, hasPublicBetting, has } = useEntitlements()
 * if (hasPicks) { ... }
 * if (has('builder')) { ... }
 */
export function useEntitlements(): UseEntitlementsReturn {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // In development, give full access
  const [devEntitlements] = useState<UserEntitlements>({
    picks: true,
    publicBetting: true,
    builder: true,
  })
  
  // In production, use Clerk
  const { user, isLoaded } = isDevelopment ? { user: null, isLoaded: true } : useUser()
  
  const [data, setData] = useState<EntitlementsResponse | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    async function checkEntitlements() {
      // Development mode - full access
      if (isDevelopment) {
        setData({
          hasAccess: true,
          entitlements: devEntitlements,
          subscriptionStatus: 'active',
          isTrialing: false,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        })
        return
      }

      // No user signed in
      if (isLoaded && !user) {
        setData({
          hasAccess: false,
          entitlements: DEFAULT_ENTITLEMENTS,
          subscriptionStatus: null,
          isTrialing: false,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        })
        return
      }

      if (!isLoaded || !user || isChecking) return

      setIsChecking(true)

      try {
        const response = await fetch('/api/subscription/check-entitlements')
        
        if (!response.ok) {
          console.error('[useEntitlements] Error:', response.status)
          setData({
            hasAccess: false,
            entitlements: DEFAULT_ENTITLEMENTS,
            subscriptionStatus: null,
            isTrialing: false,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          })
          return
        }

        const result = await response.json()
        console.log('[useEntitlements] Received:', result)
        setData(result)
      } catch (error) {
        console.error('[useEntitlements] Error:', error)
        setData({
          hasAccess: false,
          entitlements: DEFAULT_ENTITLEMENTS,
          subscriptionStatus: null,
          isTrialing: false,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        })
      } finally {
        setIsChecking(false)
      }
    }

    checkEntitlements()
  }, [user?.id, isLoaded, isDevelopment, devEntitlements])

  // Loading state
  if (!isLoaded || (!data && isChecking)) {
    return {
      isLoading: true,
      entitlements: DEFAULT_ENTITLEMENTS,
      subscriptionStatus: null,
      isTrialing: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      has: () => false,
      hasPicks: false,
      hasPublicBetting: false,
      hasBuilder: false,
      hasAny: false,
      hasAll: false,
    }
  }

  const entitlements = data?.entitlements || DEFAULT_ENTITLEMENTS
  
  return {
    isLoading: false,
    entitlements,
    subscriptionStatus: data?.subscriptionStatus || null,
    isTrialing: data?.isTrialing || false,
    currentPeriodEnd: data?.currentPeriodEnd ? new Date(data.currentPeriodEnd * 1000) : null,
    cancelAtPeriodEnd: data?.cancelAtPeriodEnd || false,
    // Convenience methods
    has: (entitlement: Entitlement) => entitlements[entitlement] || false,
    hasPicks: entitlements.picks,
    hasPublicBetting: entitlements.publicBetting,
    hasBuilder: entitlements.builder,
    hasAny: entitlements.picks || entitlements.publicBetting || entitlements.builder,
    hasAll: entitlements.picks && entitlements.publicBetting && entitlements.builder,
  }
}

export type { UseEntitlementsReturn, Entitlement }

