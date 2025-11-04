import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

// Credit pack product ID from Stripe
const CREDIT_PACK_PRODUCT_ID = 'prod_TMXEu43ED8OpVx'
const CREDITS_PER_PACK = 15

/**
 * POST /api/ai-credits/purchase
 * Creates a Stripe Checkout session for purchasing AI credit packs
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from Supabase
    const { data: user, error } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          clerk_user_id: userId
        }
      })
      stripeCustomerId = customer.id

      // Save to Supabase
      await supabaseUsers
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('clerk_user_id', userId)
    }

    // Get the price for the credit pack product
    const prices = await stripe.prices.list({
      product: CREDIT_PACK_PRODUCT_ID,
      active: true,
      limit: 1
    })

    if (prices.data.length === 0) {
      console.error('No active price found for credit pack product')
      return NextResponse.json(
        { error: 'Credit pack not available' },
        { status: 500 }
      )
    }

    const priceId = prices.data[0].id

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment', // One-time payment
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${request.nextUrl.origin}/?purchase=success`,
      cancel_url: `${request.nextUrl.origin}/?purchase=canceled`,
      metadata: {
        clerk_user_id: userId,
        product_type: 'credit_pack',
        credits_to_add: CREDITS_PER_PACK.toString()
      }
    })

    console.log(`✅ Created checkout session for user ${userId}: ${session.id}`)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('Error creating credit pack checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

