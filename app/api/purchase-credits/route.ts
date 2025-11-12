import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
})

const CREDIT_PACK_PRICE_ID = 'price_1SPoAC07WIhZOuSIkWA98Qwy' // $10 for 15 credits

/**
 * POST /api/purchase-credits
 * Creates a Stripe Checkout session for one-time credit purchase
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the origin for success/cancel URLs
    const origin = request.headers.get('origin') || 'https://dashboard.thebettinginsider.com'

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: CREDIT_PACK_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=cancelled`,
      metadata: {
        clerk_user_id: userId,
        product_type: 'credit_pack',
        credits_to_add: '15'
      }
    })

    return NextResponse.json({
      url: session.url
    })

  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

