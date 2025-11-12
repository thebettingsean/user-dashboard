import { NextRequest, NextResponse } from 'next/server'
import { supabaseUsers } from '@/lib/supabase-users'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CREDITS!

/**
 * POST /api/webhooks/stripe-credits
 * Handles Stripe webhooks for credit pack purchases
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ No Stripe signature found')
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`📥 Stripe webhook received: ${event.type}`)

    // Handle checkout.session.completed (payment successful)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log(`💳 Checkout session completed:`, {
        customer_email: session.customer_details?.email,
        customer_id: session.customer,
        metadata: session.metadata,
        mode: session.mode
      })

      // For Payment Links: identify user by email
      // For API-created sessions: use metadata clerk_user_id
      let clerkUserId = session.metadata?.clerk_user_id
      const customerEmail = session.customer_details?.email

      // If no clerk_user_id in metadata, try to find user by email
      if (!clerkUserId && customerEmail) {
        console.log(`🔍 Looking up user by email: ${customerEmail}`)
        const { data: userByEmail } = await supabaseUsers
          .from('users')
          .select('clerk_user_id')
          .eq('email', customerEmail)
          .single()

        if (userByEmail) {
          clerkUserId = userByEmail.clerk_user_id
          console.log(`✅ Found user by email: ${clerkUserId}`)
        }
      }

      if (!clerkUserId) {
        console.error('❌ Could not identify user from session')
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Determine if this is a credit pack purchase
      const isOneTimePayment = session.mode === 'payment'
      const isCreditPack = session.metadata?.product_type === 'credit_pack' || isOneTimePayment

      if (isCreditPack) {
        const creditsToAdd = parseInt(session.metadata?.credits_to_add || '15')

        console.log(`💳 Credit pack purchased by user ${clerkUserId}`)

        // Get current user
        const { data: user, error: fetchError } = await supabaseUsers
          .from('users')
          .select('*')
          .eq('clerk_user_id', clerkUserId)
          .single()

        if (fetchError || !user) {
          console.error('❌ User not found:', fetchError)
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        // Add credits and set access level
        const newCreditTotal = (user.purchased_credits || 0) + creditsToAdd

        const { error: updateError } = await supabaseUsers
          .from('users')
          .update({
            purchased_credits: newCreditTotal,
            access_level: 'ai_only', // Credit pack users only get AI access
            stripe_customer_id: session.customer as string
          })
          .eq('clerk_user_id', clerkUserId)

        if (updateError) {
          console.error('❌ Failed to update user credits:', updateError)
          return NextResponse.json(
            { error: 'Failed to update credits' },
            { status: 500 }
          )
        }

        console.log(`✅ Added ${creditsToAdd} credits to user ${clerkUserId} (Total: ${newCreditTotal})`)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing Stripe webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

