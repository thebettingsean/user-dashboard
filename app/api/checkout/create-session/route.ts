import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover'
})

// Price ID configurations
const PRICE_CONFIGS: Record<string, {
  type: 'subscription' | 'credit_pack'
  credits?: number
}> = {
  // Credit pack
  'price_1SPoAC07WIhZOuSIkWA98Qwy': { type: 'credit_pack', credits: 15 },
  
  // Subscriptions (for future migration)
  'price_1SIZoo07WIhZOuSIJB8OGgVU': { type: 'subscription' }, // Weekly
  'price_1SIZoN07WIhZOuSIm8hTDjy4': { type: 'subscription' }, // Monthly
  'price_1SIZp507WIhZOuSIFMzU7Kkm': { type: 'subscription' }, // 6-month
}

/**
 * POST /api/checkout/create-session
 * Creates a Stripe Checkout session with proper metadata and customer info
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

    const { priceId } = await request.json()

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    const config = PRICE_CONFIGS[priceId]
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || 'https://dashboard.thebettinginsider.com'
    const userEmail = user.emailAddresses[0]?.emailAddress

    console.log(`🛒 Creating checkout for user ${user.id} (${userEmail}) - Price: ${priceId}`)

    // Build metadata
    const metadata: Record<string, string> = {
      clerk_user_id: user.id,
    }

    if (config.type === 'credit_pack') {
      metadata.product_type = 'credit_pack'
      metadata.credits_to_add = config.credits?.toString() || '15'
    }

    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: config.type === 'credit_pack' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/pricing?cancelled=true`,
      customer_email: userEmail,
      metadata,
    }

    // For subscriptions, add subscription data
    if (config.type === 'subscription') {
      sessionConfig.subscription_data = {
        metadata
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log(`✅ Checkout session created: ${session.id}`)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    })

  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

