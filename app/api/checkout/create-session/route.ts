import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
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

    // Determine success URL based on product type
    const successUrl = config.type === 'credit_pack' 
      ? `${origin}/success/credit-purchase`
      : `${origin}/success/subscription`

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
      success_url: successUrl,
      cancel_url: `${origin}/pricing?cancelled=true`,
      customer_email: userEmail,
      metadata,
    }

    // For subscriptions, add subscription data with 3-day trial + $1 upfront charge
    if (config.type === 'subscription') {
      sessionConfig.subscription_data = {
        metadata,
        trial_period_days: 3  // 3-day trial
      }
      
      // Add $1 one-time charge at checkout (reduces 60% failure rate by validating payment upfront)
      sessionConfig.add_invoice_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '3-Day Trial Access',
            description: 'One-time verification charge for trial access'
          },
          unit_amount: 100 // $1.00
        },
        quantity: 1
      }]
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

