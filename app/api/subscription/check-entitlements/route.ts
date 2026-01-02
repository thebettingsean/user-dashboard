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
    // User has access if:
    // - Status is trialing and period is valid
    // - Status is active and period is valid  
    // - Status is active but cancel_at_period_end is true (scheduled to cancel, but still has access)
    // - Status is canceled but period is still valid (rare edge case)
    const isTrialing = subscriptionStatus === 'trialing' && isPeriodValid
    const isActive = subscriptionStatus === 'active' && isPeriodValid
    const isScheduledToCancel = subscriptionStatus === 'active' && cancelAtPeriodEnd && isPeriodValid
    const isCanceledButStillValid = subscriptionStatus === 'canceled' && isPeriodValid

    // Get entitlements
    let entitlements: UserEntitlements = DEFAULT_ENTITLEMENTS
    let isLegacyUser = false

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
      // Check if any priceId is legacy
      isLegacyUser = (privateMeta.priceIds as string[]).some(id => LEGACY_PRICE_IDS.includes(id))
      console.log(`[check-entitlements] Calculated from priceIds:`, entitlements, `isLegacy: ${isLegacyUser}`)
    }
    // Fall back to single plan (backward compat)
    else if (privateMeta.plan && typeof privateMeta.plan === 'string') {
      const planId = (privateMeta.plan as string).trim()
      if (isValidPriceId(planId)) {
        entitlements = getEntitlementsFromPriceIds([planId])
        // Check if this is a legacy price ID
        isLegacyUser = LEGACY_PRICE_IDS.includes(planId)
        console.log(`[check-entitlements] Calculated from legacy plan:`, entitlements, `isLegacy: ${isLegacyUser}`)
      }
    }

    // Legacy users with a subscription ID get access regardless of new subscription status fields
    // They don't have the new status fields in their metadata
    const hasStripeSubscription = Boolean(privateMeta.stripeSubscriptionId || privateMeta.subscriptionId)
    const legacyUserHasAccess = isLegacyUser && hasStripeSubscription

    // For new users, check subscription status
    const hasValidSubscription = isTrialing || isActive || isScheduledToCancel || isCanceledButStillValid || legacyUserHasAccess
    
    if (!hasValidSubscription) {
      entitlements = DEFAULT_ENTITLEMENTS
    }
    
    console.log(`[check-entitlements] Subscription check:`, {
      isLegacyUser,
      hasStripeSubscription,
      legacyUserHasAccess,
      hasValidSubscription,
    })

    const hasAnyAccess = entitlements.picks || entitlements.publicBetting || entitlements.builder

    console.log(`[check-entitlements] Final result for ${user.id}:`, {
      hasAccess: hasAnyAccess,
      entitlements,
      subscriptionStatus,
      isTrialing,
      isScheduledToCancel,
      cancelAtPeriodEnd,
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

