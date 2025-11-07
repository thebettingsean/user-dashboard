import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

// All valid subscription price IDs (new + legacy grandfathered)
const VALID_SUBSCRIPTION_PRICE_IDS = [
  // NEW price IDs
  'price_1SIZoo07WIhZOuSIJB8OGgVU', // Weekly
  'price_1SIZoN07WIhZOuSIm8hTDjy4', // Monthly
  'price_1SIZp507WIhZOuSIFMzU7Kkm', // 6-Month
  
  // LEGACY Advantage (grandfathered - full access)
  'price_1QuJos07WIhZOuSIc3iG0Nsi', // Old advantage monthly
  'price_1Qw8iY07WIhZOuSIC48z9vlc', // Old advantage weekly
  'price_1RdJwP07WIhZOuSIgQKcur3e', // Old advantage 6-month
  
  // LEGACY Bets (grandfathered - full access)
  'price_1QuJnw07WIhZOuSIMflqulXj', // Old bets monthly
  'price_1R600p07WIhZOuSIrNk4pLau', // Old bets monthly 2
  'price_1R5zzf07WIhZOuSIy0Wn2aZF', // Old bets weekly
  'price_1RdJuK07WIhZOuSIn3UxIt4V', // Old bets 6-month
  
  // LEGACY Stats (grandfathered - full access)
  'price_1QuJoM07WIhZOuSIERC3Dces', // Old stats monthly
  'price_1Qw8ha07WIhZOuSI0fVoF8Am', // Old stats weekly
  'price_1RdJoT07WIhZOuSIvK6yHiOK', // Old stats 6-month
]

/**
 * GET /api/subscription/check-access
 * Checks if the current user has an active subscription
 * Returns subscription status from Clerk privateMetadata
 * Supports both new and legacy (grandfathered) price IDs
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({
        hasAccess: false,
        plan: null,
        subscriptionStatus: null
      })
    }

    // Check privateMetadata for subscription info (set by webhook or legacy system)
    const privateMeta = user.privateMetadata || {}
    const plan = (privateMeta.plan as string) || null
    const subscriptionStatus = (privateMeta.subscriptionStatus as string) || null
    const cancelAtPeriodEnd = (privateMeta.cancelAtPeriodEnd as boolean) || false

    // User has access if:
    // 1. They have a valid plan in our price IDs list (includes legacy)
    // 2. AND one of these conditions:
    //    a) subscriptionStatus is 'active' (new webhook system)
    //    b) subscriptionStatus is null/undefined (legacy users who never had status tracked)
    //       BUT they must have a plan set (old system only set 'plan')
    const hasValidPlan = plan && VALID_SUBSCRIPTION_PRICE_IDS.includes(plan)
    const hasActiveSub = subscriptionStatus === 'active'
    const isLegacyWithPlan = !subscriptionStatus && !!plan // Legacy user with plan but no status
    
    // Grant access if they have a valid plan AND (active status OR legacy user)
    const hasAccess = hasValidPlan && (hasActiveSub || isLegacyWithPlan)

    console.log(`🔍 Subscription check for ${user.id}:`, {
      plan,
      subscriptionStatus,
      cancelAtPeriodEnd,
      hasValidPlan,
      hasActiveSub,
      isLegacyWithPlan,
      hasAccess,
      isLegacyPriceId: plan && !['price_1SIZoo07WIhZOuSIJB8OGgVU', 'price_1SIZoN07WIhZOuSIm8hTDjy4', 'price_1SIZp507WIhZOuSIFMzU7Kkm'].includes(plan)
    })

    return NextResponse.json({
      hasAccess,
      plan,
      subscriptionStatus,
      firstName: user.firstName
    })

  } catch (error) {
    console.error('Error checking subscription access:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    )
  }
}

