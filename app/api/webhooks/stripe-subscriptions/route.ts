import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'
import Stripe from 'stripe'
import { getEntitlementsFromPriceIds, UserEntitlements, DEFAULT_ENTITLEMENTS } from '@/lib/config/subscriptions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS!

/**
 * Extract all price IDs from a subscription
 */
function getPriceIdsFromSubscription(subscription: Stripe.Subscription): string[] {
  return subscription.items.data.map(item => item.price.id)
}

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
      const priceIds = getPriceIdsFromSubscription(subscription)
      const entitlements = getEntitlementsFromPriceIds(priceIds)

      console.log(`🔔 Activating subscription for user ${clerkUserId}`, {
        subscription_id: subscription.id,
        price_ids: priceIds,
        entitlements,
        status: subscription.status
      })

      // Update Clerk metadata (fetch current user first to preserve other fields)
      const clerk = await clerkClient()
      const currentClerkUser = await clerk.users.getUser(clerkUserId)
      const existingPrivateMeta = currentClerkUser.privateMetadata || {}
      
      await clerk.users.updateUserMetadata(clerkUserId, {
        privateMetadata: {
          ...existingPrivateMeta, // Preserve existing fields
          stripeCustomerId: session.customer as string,
          plan: priceIds[0], // Keep for backward compat
          priceIds: priceIds, // NEW: Store all price IDs
          entitlements: entitlements, // NEW: Store entitlements object
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: (subscription as any).current_period_end,
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
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
            subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
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
      const priceIds = getPriceIdsFromSubscription(subscription)
      const entitlements = getEntitlementsFromPriceIds(priceIds)

      console.log(`🔔 Subscription created: ${subscription.id}`, {
        price_ids: priceIds,
        entitlements
      })

      // Find user by Stripe customer ID in Supabase
      const { data: user } = await supabaseUsers
        .from('users')
        .select('clerk_user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user?.clerk_user_id) {
        const clerk = await clerkClient()
        const currentClerkUser = await clerk.users.getUser(user.clerk_user_id)
        const existingPrivateMeta = currentClerkUser.privateMetadata || {}
        
        await clerk.users.updateUserMetadata(user.clerk_user_id, {
          privateMetadata: {
            ...existingPrivateMeta,
            stripeCustomerId: customerId,
            plan: priceIds[0], // Keep for backward compat
            priceIds: priceIds, // NEW
            entitlements: entitlements, // NEW
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: (subscription as any).current_period_end,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
          }
        })

        await supabaseUsers
          .from('users')
          .update({
            subscription_status: subscription.status,
            subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
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
      const priceIds = getPriceIdsFromSubscription(subscription)
      const entitlements = getEntitlementsFromPriceIds(priceIds)

      console.log(`🔄 Subscription updated: ${subscription.id}`, {
        status: subscription.status,
        price_ids: priceIds,
        entitlements,
        cancel_at_period_end: (subscription as any).cancel_at_period_end
      })

      // Find user by Stripe customer ID
      const { data: user } = await supabaseUsers
        .from('users')
        .select('clerk_user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user?.clerk_user_id) {
        const clerk = await clerkClient()
        const currentClerkUser = await clerk.users.getUser(user.clerk_user_id)
        const existingPrivateMeta = currentClerkUser.privateMetadata || {}
        
        // Update Clerk metadata
        await clerk.users.updateUserMetadata(user.clerk_user_id, {
          privateMetadata: {
            ...existingPrivateMeta,
            stripeCustomerId: customerId,
            plan: priceIds[0], // Keep for backward compat
            priceIds: priceIds, // NEW
            entitlements: entitlements, // NEW
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: (subscription as any).current_period_end,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
          }
        })

        // Update Supabase
        const isActive = subscription.status === 'active' || subscription.status === 'trialing'
        await supabaseUsers
          .from('users')
          .update({
            subscription_status: subscription.status,
            subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString(),
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
        const currentClerkUser = await clerk.users.getUser(user.clerk_user_id)
        const existingPrivateMeta = currentClerkUser.privateMetadata || {}
        
        // Clear subscription from Clerk metadata
        await clerk.users.updateUserMetadata(user.clerk_user_id, {
          privateMetadata: {
            ...existingPrivateMeta,
            stripeCustomerId: customerId,
            plan: null,
            priceIds: [], // NEW: Clear price IDs
            entitlements: DEFAULT_ENTITLEMENTS, // NEW: Reset entitlements
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
      if ((invoice as any).subscription) {
        console.log(`💰 Invoice paid for subscription ${(invoice as any).subscription}`)
        
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

