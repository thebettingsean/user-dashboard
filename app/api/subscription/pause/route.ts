import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user email from Clerk
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user?.emailAddresses?.[0]?.emailAddress

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: email, limit: 1 })
    const customer = customers.data[0]

    if (!customer) {
      return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 })
    }

    // List active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    const subscription = subscriptions.data[0]

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Pause subscription by pausing collection
    // This keeps the subscription but stops billing
    const pausedSubscription = await stripe.subscriptions.update(subscription.id, {
      pause_collection: {
        behavior: 'void', // Voids invoices while paused
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription paused successfully',
      pausedSubscription: {
        id: pausedSubscription.id,
        status: pausedSubscription.status,
        pausedAt: new Date().toISOString(),
      }
    })
  } catch (error: any) {
    console.error('Stripe Pause API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

