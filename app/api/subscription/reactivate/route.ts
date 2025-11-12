import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, subscriptionId } = body

    if (!userId || !subscriptionId) {
      return NextResponse.json({ error: 'User ID and Subscription ID are required' }, { status: 400 })
    }

    // Get user email from Clerk
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user?.emailAddresses?.[0]?.emailAddress

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Reactivate by removing cancel_at_period_end flag
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully!',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancel_at_period_end: (updatedSubscription as any).cancel_at_period_end,
      }
    })
  } catch (error: any) {
    console.error('Stripe Reactivate API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

