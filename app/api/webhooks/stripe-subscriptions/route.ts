import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS!

/**
 * POST /api/webhooks/stripe-subscriptions
 * Handles Stripe webhooks for subscription purchases ONLY
 * Updates Clerk metadata and Supabase for subscription management
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

    console.log(`📥 Subscription webhook received: ${event.type}`)

    // Handle checkout.session.completed (subscription purchase)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Only process subscription sessions
      if (session.mode !== 'subscription') {
        console.log('⏭️  Skipping non-subscription session')
        return NextResponse.json({ received: true })
      }

      console.log(`💳 Subscription checkout completed:`, {
        customer_email: session.customer_details?.email,
        customer_id: session.customer,
        metadata: session.metadata,
        subscription_id: session.subscription
      })

      // Get Clerk user ID from metadata
      const clerkUserId = session.metadata?.clerk_user_id

      if (!clerkUserId) {
        console.error('❌ No clerk_user_id in session metadata')
        return NextResponse.json(
          { error: 'No clerk_user_id found' },
          { status: 400 }
        )
      }

      // Fetch the subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = subscription.items.data[0].price.id

      console.log(`🔔 Activating subscription for user ${clerkUserId}`, {
        subscription_id: subscription.id,
        price_id: priceId,
        status: subscription.status
      })

      // Update Clerk metadata
      const clerk = await clerkClient()
      await clerk.users.updateUserMetadata(clerkUserId, {
        privateMetadata: {
          stripeCustomerId: session.customer as string,
          plan: priceId,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      })

      console.log(`✅ Clerk metadata updated for user ${clerkUserId}`)

      // Update Supabase for tracking
      const { data: existingUser } = await supabaseUsers
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (existingUser) {
        await supabaseUsers
          .from('users')
          .update({
            stripe_customer_id: session.customer as string,
            access_level: 'full',
            subscription_status: subscription.status,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            is_premium: true
          })
          .eq('clerk_user_id', clerkUserId)

        console.log(`✅ Supabase updated for user ${clerkUserId}`)
      }

      console.log(`🎉 Subscription activated successfully for ${clerkUserId}`)
    }

    // Handle subscription created
    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const priceId = subscription.items.data[0].price.id

      console.log(`🔔 Subscription created: ${subscription.id}`)

      // Find user by Stripe customer ID in Supabase
      const { data: user } = await supabaseUsers
        .from('users')
        .select('clerk_user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user?.clerk_user_id) {
        const clerk = await clerkClient()
        await clerk.users.updateUserMetadata(user.clerk_user_id, {
          privateMetadata: {
            stripeCustomerId: customerId,
            plan: priceId,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          }
        })

        await supabaseUsers
          .from('users')
          .update({
            subscription_status: subscription.status,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            is_premium: true,
            access_level: 'full'
          })
          .eq('clerk_user_id', user.clerk_user_id)

        console.log(`✅ Subscription created and metadata updated: ${user.clerk_user_id}`)
      } else {
        console.warn(`⚠️  No user found for customer ${customerId}`)
      }
    }

    // Handle subscription updated (cancellations, plan changes, renewals)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const priceId = subscription.items.data[0].price.id

      console.log(`🔄 Subscription updated: ${subscription.id}`, {
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end
      })

      // Find user by Stripe customer ID
      const { data: user } = await supabaseUsers
        .from('users')
        .select('clerk_user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user?.clerk_user_id) {
        const clerk = await clerkClient()
        
        // Update Clerk metadata
        await clerk.users.updateUserMetadata(user.clerk_user_id, {
          privateMetadata: {
            stripeCustomerId: customerId,
            plan: priceId,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          }
        })

        // Update Supabase
        const isActive = subscription.status === 'active'
        await supabaseUsers
          .from('users')
          .update({
            subscription_status: subscription.status,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            is_premium: isActive,
            access_level: isActive ? 'full' : (subscription.status === 'canceled' ? 'none' : 'full')
          })
          .eq('clerk_user_id', user.clerk_user_id)

        console.log(`✅ Subscription updated for user: ${user.clerk_user_id}`)
      } else {
        console.warn(`⚠️  No user found for customer ${customerId}`)
      }
    }

    // Handle subscription deleted (immediate cancellation or end of period)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      console.log(`🗑️  Subscription deleted: ${subscription.id}`)

      // Find user by Stripe customer ID
      const { data: user } = await supabaseUsers
        .from('users')
        .select('clerk_user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user?.clerk_user_id) {
        const clerk = await clerkClient()
        
        // Clear subscription from Clerk metadata
        await clerk.users.updateUserMetadata(user.clerk_user_id, {
          privateMetadata: {
            stripeCustomerId: customerId,
            plan: null,
            subscriptionId: null,
            subscriptionStatus: 'canceled',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false
          }
        })

        // Update Supabase - revoke access
        await supabaseUsers
          .from('users')
          .update({
            subscription_status: 'canceled',
            subscription_end_date: null,
            is_premium: false,
            access_level: 'none'
          })
          .eq('clerk_user_id', user.clerk_user_id)

        console.log(`✅ Subscription deleted and access revoked: ${user.clerk_user_id}`)
      } else {
        console.warn(`⚠️  No user found for customer ${customerId}`)
      }
    }

    // Handle invoice payment succeeded (recurring payments)
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice
      
      // Only process subscription invoices
      if (invoice.subscription) {
        console.log(`💰 Invoice paid for subscription ${invoice.subscription}`)
        
        // Subscription renewal was successful - metadata should already be updated
        // by customer.subscription.updated event, but we can log it
        console.log(`✅ Recurring payment successful`)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Error processing subscription webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

