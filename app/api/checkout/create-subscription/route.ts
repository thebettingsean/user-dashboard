import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { isValidPriceId, getEntitlementsFromPriceIds } from '@/lib/config/subscriptions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
})

// $1.00 card verification charge price ID
const VERIFICATION_PRICE_ID = 'price_1SksvQ07WIhZOuSIETT6jXhg'

/**
 * POST /api/checkout/create-subscription
 * Creates a Stripe Checkout session that:
 * 1. Charges $0.01 IMMEDIATELY for card verification
 * 2. Saves card for future subscription charges
 * 3. Passes subscription price IDs in metadata for webhook to create subscription with trial
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

    // Use PAYMENT mode to charge $0.01 immediately
    // Save card for future subscription charges
    // Subscription will be created in webhook after payment succeeds
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: VERIFICATION_PRICE_ID, // $0.01 verification charge
          quantity: 1,
        }
      ],
      // Save the payment method for future subscription charges
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: {
          clerk_user_id: user.id,
          subscription_price_ids: priceIds.join(','), // Subscription prices to create after payment
          is_subscription_setup: 'true',
        },
      },
      success_url: `${origin}/success/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?cancelled=true`,
      customer_email: userEmail,
      metadata: {
        clerk_user_id: user.id,
        subscription_price_ids: priceIds.join(','), // Subscription prices to create after payment
        is_subscription_setup: 'true',
      },
      // Allow promo codes
      allow_promotion_codes: true,
    })

    console.log(`✅ Verification checkout created: ${session.id}`)
    console.log(`   After payment, webhook will create subscription with trial`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })

  } catch (error: any) {
    console.error('❌ Error creating checkout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
