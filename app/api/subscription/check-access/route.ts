import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

/**
 * GET /api/subscription/check-access
 * Checks if the current user has an active subscription
 * Returns subscription status from Clerk privateMetadata
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

    // Check privateMetadata for subscription info (set by our webhook)
    const privateMeta = user.privateMetadata || {}
    const plan = (privateMeta.plan as string) || null
    const subscriptionStatus = (privateMeta.subscriptionStatus as string) || null

    const hasAccess = !!plan && subscriptionStatus === 'active'

    console.log(`🔍 Subscription check for ${user.id}:`, {
      plan,
      subscriptionStatus,
      hasAccess
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

