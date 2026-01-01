import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { isValidPriceId, getEntitlementsFromPriceIds } from '@/lib/config/subscriptions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
})

/**
 * POST /api/checkout/create-subscription
 * Creates a Stripe Checkout session with multiple line items (for bundles)
 * Supports 3-day free trial
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in first' },
        { status: 401 }
      )
    }

    const { priceIds } = await request.json()

    // Validate input
    if (!priceIds || !Array.isArray(priceIds) || priceIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one price ID is required' },
        { status: 400 }
      )
    }

    // Validate all price IDs
    for (const priceId of priceIds) {
      if (!isValidPriceId(priceId)) {
        return NextResponse.json(
          { error: `Invalid price ID: ${priceId}` },
          { status: 400 }
        )
      }
    }

    const origin = request.headers.get('origin') || 'https://dashboard.thebettinginsider.com'
    const userEmail = user.emailAddresses[0]?.emailAddress

    // Calculate what entitlements they'll get (for logging)
    const entitlements = getEntitlementsFromPriceIds(priceIds)
    
    console.log(`🛒 Creating subscription checkout:`)
    console.log(`   User: ${user.id} (${userEmail})`)
    console.log(`   Price IDs: ${priceIds.join(', ')}`)
    console.log(`   Entitlements: ${JSON.stringify(entitlements)}`)

    // Build line items - one for each price
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceIds.map(
      (priceId: string) => ({
        price: priceId,
        quantity: 1,
      })
    )

    // Create checkout session with subscription mode
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${origin}/success/subscription`,
      cancel_url: `${origin}/pricing?cancelled=true`,
      customer_email: userEmail,
      metadata: {
        clerk_user_id: user.id,
        price_ids: priceIds.join(','), // Store for webhook reference
      },
      subscription_data: {
        trial_period_days: 3, // 3-day free trial
        metadata: {
          clerk_user_id: user.id,
          price_ids: priceIds.join(','),
        },
      },
      // Allow promo codes
      allow_promotion_codes: true,
    })

    console.log(`✅ Subscription checkout created: ${session.id}`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })

  } catch (error: any) {
    console.error('❌ Error creating subscription checkout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

