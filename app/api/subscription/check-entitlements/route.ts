import { NextRequest, NextResponse } from 'next/server'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { 
  UserEntitlements, 
  DEFAULT_ENTITLEMENTS, 
  getEntitlementsFromPriceIds,
  LEGACY_PRICE_IDS,
  isValidPriceId
} from '@/lib/config/subscriptions'

/**
 * GET /api/subscription/check-entitlements
 * Returns the user's entitlements based on their subscription
 * This is the NEW entitlement-based access check
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({
        hasAccess: false,
        entitlements: DEFAULT_ENTITLEMENTS,
        subscriptionStatus: null,
        isTrialing: false,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
    }

    // Fetch fresh user data from Clerk API
    const clerk = await clerkClient()
    const freshUser = await clerk.users.getUser(user.id)
    const privateMeta = freshUser.privateMetadata || {}

    // Extract subscription info
    const subscriptionStatus = privateMeta.subscriptionStatus 
      ? String(privateMeta.subscriptionStatus).trim() 
      : null
    const cancelAtPeriodEnd = Boolean(privateMeta.cancelAtPeriodEnd)
    const currentPeriodEnd = privateMeta.currentPeriodEnd 
      ? Number(privateMeta.currentPeriodEnd) 
      : null

    // Check if subscription is still valid (not expired)
    const now = Math.floor(Date.now() / 1000)
    const isPeriodValid = !currentPeriodEnd || currentPeriodEnd > now

    // Determine subscription validity
    const isTrialing = subscriptionStatus === 'trialing' && isPeriodValid
    const isActive = subscriptionStatus === 'active' && isPeriodValid
    const isCanceledButStillValid = subscriptionStatus === 'canceled' && !cancelAtPeriodEnd && isPeriodValid

    // Get entitlements
    let entitlements: UserEntitlements = DEFAULT_ENTITLEMENTS

    // First, check for the new entitlements object in metadata
    if (privateMeta.entitlements && typeof privateMeta.entitlements === 'object') {
      // Use stored entitlements directly
      const storedEntitlements = privateMeta.entitlements as Record<string, boolean>
      entitlements = {
        picks: Boolean(storedEntitlements.picks),
        publicBetting: Boolean(storedEntitlements.publicBetting),
        builder: Boolean(storedEntitlements.builder),
      }
      console.log(`[check-entitlements] Using stored entitlements:`, entitlements)
    } 
    // Fall back to priceIds array
    else if (privateMeta.priceIds && Array.isArray(privateMeta.priceIds)) {
      entitlements = getEntitlementsFromPriceIds(privateMeta.priceIds as string[])
      console.log(`[check-entitlements] Calculated from priceIds:`, entitlements)
    }
    // Fall back to single plan (backward compat)
    else if (privateMeta.plan && typeof privateMeta.plan === 'string') {
      const planId = (privateMeta.plan as string).trim()
      if (isValidPriceId(planId)) {
        entitlements = getEntitlementsFromPriceIds([planId])
        console.log(`[check-entitlements] Calculated from legacy plan:`, entitlements)
      }
    }

    // If user has a valid subscription status, they get their entitlements
    // If not, they get nothing
    const hasValidSubscription = isTrialing || isActive || isCanceledButStillValid
    
    if (!hasValidSubscription) {
      entitlements = DEFAULT_ENTITLEMENTS
    }

    const hasAnyAccess = entitlements.picks || entitlements.publicBetting || entitlements.builder

    console.log(`[check-entitlements] Final result for ${user.id}:`, {
      hasAccess: hasAnyAccess,
      entitlements,
      subscriptionStatus,
      isTrialing,
      hasValidSubscription,
    })

    return NextResponse.json({
      hasAccess: hasAnyAccess,
      entitlements,
      subscriptionStatus,
      isTrialing,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    })

  } catch (error) {
    console.error('[check-entitlements] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check entitlements' },
      { status: 500 }
    )
  }
}

