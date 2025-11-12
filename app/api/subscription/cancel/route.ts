import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseFunnel } from '@/lib/supabase-funnel'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const PROMO_50_OFF = process.env.STRIPE_PROMO_50_OFF!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action, offerType, offerDays, reasons, otherText, targetPriceId } = body

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
      status: 'all',
      limit: 1,
    })

    const subscription = subscriptions.data[0]

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Handle different actions
    switch (action) {
      case 'getOffer':
        return await handleGetOffer(subscription, userId, email)
      
      case 'acceptFirstOffer':
        return await handleAcceptFirstOffer(subscription, userId, email, offerType, offerDays)
      
      case 'declineFirstOffer':
        return await handleDeclineFirstOffer(userId, email, subscription)
      
      case 'submitReasons':
        return await handleSubmitReasons(userId, email, subscription, reasons, otherText)
      
      case 'acceptFinalOffer':
        return await handleAcceptFinalOffer(subscription, userId, email)
      
      case 'confirmCancel':
        return await handleConfirmCancel(subscription, userId, email)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Stripe Cancel API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

async function handleGetOffer(subscription: Stripe.Subscription, userId: string, email: string) {
  const isTrial = subscription.status === 'trialing'
  const startDate = subscription.start_date
  const currentDate = Math.floor(Date.now() / 1000)
  const tenureDays = Math.floor((currentDate - startDate) / 86400)

  let offerType = ''
  let offerDays = 0
  let offerMessage = ''

  if (isTrial) {
    // User is on trial
    offerType = 'trial_extension'
    offerDays = 7
    offerMessage = "We feel like you haven't had the full experience yet. Let us extend your trial by +7 days!"
  } else if (tenureDays < 7) {
    // Real sub 0-6 days after trial
    offerType = 'free_week'
    offerDays = 7
    offerMessage = "You just started! Let us give you a free 1 week extension to experience the full value."
  } else if (tenureDays >= 7 && tenureDays <= 21) {
    // Real sub 7-21 days after trial
    offerType = 'free_two_weeks'
    offerDays = 14
    offerMessage = "We appreciate your time with us! Here's a free 2 week extension on us."
  } else {
    // Real sub 22+ days after trial
    offerType = 'free_month'
    offerDays = 30
    offerMessage = "Thank you for your loyalty! Here's a FREE MONTH on us to continue enjoying our premium features."
  }

  // Calculate new renewal date if applicable
  let newRenewalDate = ''
  if (offerDays > 0 && 'current_period_end' in subscription) {
    const currentPeriodEnd = (subscription as any).current_period_end as number
    const newEndDate = new Date((currentPeriodEnd + (offerDays * 86400)) * 1000)
    newRenewalDate = newEndDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return NextResponse.json({
    offerType,
    offerDays,
    offerMessage,
    newRenewalDate,
    tenureDays,
    isTrial
  })
}

async function handleAcceptFirstOffer(
  subscription: Stripe.Subscription,
  userId: string,
  email: string,
  offerType: string,
  offerDays: number
) {
  try {
    if (offerType === 'discount_50') {
      // Apply 50% off promo code
      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        discounts: [{
          promotion_code: PROMO_50_OFF,
        }],
      })

      // Log to Supabase
      await supabaseFunnel.from('cancellation_feedback').insert({
        user_id: userId,
        user_email: email,
        clerk_user_id: userId,
        subscription_id: subscription.id,
        subscription_tenure_days: Math.floor((Date.now() / 1000 - subscription.start_date) / 86400),
        is_legacy_user: false, // We can enhance this later
        was_on_trial: subscription.status === 'trialing',
        first_offer_type: offerType,
        first_offer_days: offerDays,
        first_offer_accepted: true,
        final_offer_shown: false,
        cancellation_completed: false,
        new_subscription_id: updatedSubscription.id,
      })

      return NextResponse.json({
        success: true,
        message: '50% off for life applied successfully!',
        newSubscription: {
          id: updatedSubscription.id,
          discount: '50% OFF',
        }
      })
    } else {
      // Add free trial days
      const currentPeriodEnd = (subscription as any).current_period_end as number
      const newPeriodEnd = currentPeriodEnd + (offerDays * 86400)

      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        trial_end: newPeriodEnd,
      })

      // Log to Supabase
      await supabaseFunnel.from('cancellation_feedback').insert({
        user_id: userId,
        user_email: email,
        clerk_user_id: userId,
        subscription_id: subscription.id,
        subscription_tenure_days: Math.floor((Date.now() / 1000 - subscription.start_date) / 86400),
        is_legacy_user: false,
        was_on_trial: subscription.status === 'trialing',
        first_offer_type: offerType,
        first_offer_days: offerDays,
        first_offer_accepted: true,
        final_offer_shown: false,
        cancellation_completed: false,
        new_subscription_id: updatedSubscription.id,
      })

      return NextResponse.json({
        success: true,
        message: `${offerDays} days added to your subscription!`,
        newRenewalDate: new Date(newPeriodEnd * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      })
    }
  } catch (error: any) {
    console.error('Accept offer error:', error)
    return NextResponse.json({ error: error.message || 'Failed to apply offer' }, { status: 500 })
  }
}

async function handleDeclineFirstOffer(userId: string, email: string, subscription: Stripe.Subscription) {
  // Log decline to Supabase
  await supabaseFunnel.from('cancellation_feedback').insert({
    user_id: userId,
    user_email: email,
    clerk_user_id: userId,
    subscription_id: subscription.id,
    subscription_tenure_days: Math.floor((Date.now() / 1000 - subscription.start_date) / 86400),
    is_legacy_user: false,
    was_on_trial: subscription.status === 'trialing',
    first_offer_accepted: false,
    first_offer_declined_at: new Date().toISOString(),
    final_offer_shown: false,
    cancellation_completed: false,
  })

  return NextResponse.json({
    success: true,
    message: 'Proceeding to cancellation reasons'
  })
}

async function handleSubmitReasons(
  userId: string,
  email: string,
  subscription: Stripe.Subscription,
  reasons: string[],
  otherText: string
) {
  try {
    const startDate = (subscription as any).start_date || Math.floor(Date.now() / 1000)
    const tenureDays = Math.floor((Date.now() / 1000 - startDate) / 86400)

    // Update Supabase with reasons
    const { data: existingFeedback, error: selectError } = await supabaseFunnel
      .from('cancellation_feedback')
      .select('id')
      .eq('user_id', userId)
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error fetching existing feedback:', selectError)
    }

    if (existingFeedback) {
      const { error: updateError } = await supabaseFunnel
        .from('cancellation_feedback')
        .update({
          reason_codes: reasons,
          reason_other_text: otherText || null,
          final_offer_shown: true,
        })
        .eq('id', existingFeedback.id)
      
      if (updateError) {
        console.error('Error updating feedback:', updateError)
        throw new Error('Failed to save cancellation reasons')
      }
    } else {
      const { error: insertError } = await supabaseFunnel.from('cancellation_feedback').insert({
        user_id: userId,
        user_email: email,
        clerk_user_id: userId,
        subscription_id: subscription.id,
        subscription_tenure_days: tenureDays,
        is_legacy_user: false,
        was_on_trial: subscription.status === 'trialing',
        reason_codes: reasons,
        reason_other_text: otherText || null,
        first_offer_accepted: false,
        final_offer_shown: true,
        cancellation_completed: false,
      })

      if (insertError) {
        console.error('Error inserting feedback:', insertError)
        throw new Error('Failed to save cancellation reasons')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reasons submitted'
    })
  } catch (error: any) {
    console.error('Submit reasons error:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit reasons' }, { status: 500 })
  }
}

async function handleAcceptFinalOffer(
  subscription: Stripe.Subscription,
  userId: string,
  email: string
) {
  try {
    // Apply 50% off promo code
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      discounts: [{
        promotion_code: PROMO_50_OFF,
      }],
    })

    // Update Supabase
    const { data: existingFeedback } = await supabaseFunnel
      .from('cancellation_feedback')
      .select('id')
      .eq('user_id', userId)
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingFeedback) {
      await supabaseFunnel
        .from('cancellation_feedback')
        .update({
          final_offer_accepted: true,
          cancellation_completed: false,
          new_subscription_id: updatedSubscription.id,
        })
        .eq('id', existingFeedback.id)
    }

    return NextResponse.json({
      success: true,
      message: '50% off for life applied successfully!'
    })
  } catch (error: any) {
    console.error('Final offer error:', error)
    return NextResponse.json({ error: error.message || 'Failed to apply discount' }, { status: 500 })
  }
}

async function handleConfirmCancel(
  subscription: Stripe.Subscription,
  userId: string,
  email: string
) {
  try {
    // Cancel subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    })

    // Update Supabase
    const { data: existingFeedback } = await supabaseFunnel
      .from('cancellation_feedback')
      .select('id')
      .eq('user_id', userId)
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingFeedback) {
      await supabaseFunnel
        .from('cancellation_feedback')
        .update({
          final_offer_accepted: false,
          final_offer_declined_at: new Date().toISOString(),
          cancellation_completed: true,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', existingFeedback.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      cancelsOn: new Date((canceledSubscription as any).current_period_end * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    })
  } catch (error: any) {
    console.error('Confirm cancel error:', error)
    return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 })
  }
}

