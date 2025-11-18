import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseFunnel } from '@/lib/supabase-funnel'

// Validate Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables!')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const PROMO_50_OFF = process.env.STRIPE_PROMO_50_OFF!

console.log('Cancel Route Config:', {
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) + '...',
  hasPromoCode: !!PROMO_50_OFF
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action, offerType, offerDays, reasons, otherText, targetPriceId } = body

    console.log('Cancel API called:', { userId, action })

    if (!userId) {
      console.error('No userId provided')
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user email from Clerk
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user?.emailAddresses?.[0]?.emailAddress

    console.log('Clerk user found:', { userId, email })

    if (!email) {
      console.error('No email found for user:', userId)
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: email, limit: 1 })
    const customer = customers.data[0]

    console.log('Stripe customer lookup:', { 
      email, 
      found: !!customer,
      customerId: customer?.id 
    })

    if (!customer) {
      console.error('No Stripe customer found for email:', email)
      return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 })
    }

    // List active subscriptions (excluding canceled ones)
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    })

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      limit: 10,
    })

    // Combine and find the first active or trialing subscription
    const allActiveSubscriptions = [...subscriptions.data, ...trialingSubscriptions.data]
    const subscription = allActiveSubscriptions[0]

    console.log('Found subscriptions:', {
      activeCount: subscriptions.data.length,
      trialingCount: trialingSubscriptions.data.length,
      selectedSubscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end
      } : null
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
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

  // Calculate new renewal date
  let newRenewalDate = ''
  if (offerDays > 0) {
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
      // Log trial/time extension acceptance
      // Note: Manual fulfillment required - extend via Stripe dashboard
      console.log('Trial/time extension accepted (manual fulfillment required):', {
        subscriptionId: subscription.id,
        offerType,
        offerDays,
        userId,
        email
      })

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
      })

      return NextResponse.json({
        success: true,
        message: `Great! We'll extend your subscription by ${offerDays} days. Please allow 24 hours for this to be applied.`,
        requiresManualFulfillment: true
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

    console.log('Submitting cancellation reasons:', {
      userId,
      email,
      subscriptionId: subscription.id,
      reasons,
      otherText
    })

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
      console.error('Select error details:', JSON.stringify(selectError))
    }

    if (existingFeedback) {
      console.log('Updating existing feedback:', existingFeedback.id)
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
        console.error('Update error details:', JSON.stringify(updateError))
        throw new Error(`Failed to save cancellation reasons: ${updateError.message}`)
      }
    } else {
      console.log('Creating new feedback entry')
      const { data: insertData, error: insertError } = await supabaseFunnel.from('cancellation_feedback').insert({
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
      }).select()

      if (insertError) {
        console.error('Error inserting feedback:', insertError)
        console.error('Insert error details:', JSON.stringify(insertError))
        throw new Error(`Failed to save cancellation reasons: ${insertError.message}`)
      }
      console.log('Successfully created feedback:', insertData)
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
    console.log('Attempting to cancel subscription:', {
      subscriptionId: subscription.id,
      userId,
      email,
      currentStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    })

    // Check if already canceled or canceling
    if (subscription.status === 'canceled') {
      return NextResponse.json({ 
        error: 'This subscription is already canceled' 
      }, { status: 400 })
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json({ 
        error: 'This subscription is already scheduled for cancellation' 
      }, { status: 400 })
    }

    // Handle trials differently - cancel immediately
    let canceledSubscription: Stripe.Subscription
    if (subscription.status === 'trialing') {
      console.log('Canceling trial subscription immediately')
      canceledSubscription = await stripe.subscriptions.cancel(subscription.id)
    } else {
      console.log('Scheduling paid subscription to cancel at period end')
      canceledSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      })
    }

    console.log('Stripe cancellation successful:', {
      subscriptionId: canceledSubscription.id,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      currentPeriodEnd: (canceledSubscription as any).current_period_end
    })

    // Update Supabase
    const { data: existingFeedback, error: selectError } = await supabaseFunnel
      .from('cancellation_feedback')
      .select('id')
      .eq('user_id', userId)
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error fetching feedback for cancel update:', selectError)
    }

    if (existingFeedback) {
      const { error: updateError } = await supabaseFunnel
        .from('cancellation_feedback')
        .update({
          final_offer_accepted: false,
          final_offer_declined_at: new Date().toISOString(),
          cancellation_completed: true,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', existingFeedback.id)
      
      if (updateError) {
        console.error('Error updating feedback with cancellation:', updateError)
      }
    }

    // Format cancellation date
    let cancelsOn = ''
    if (subscription.status === 'trialing') {
      cancelsOn = 'immediately'
    } else if ((canceledSubscription as any).current_period_end) {
      cancelsOn = new Date((canceledSubscription as any).current_period_end * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      cancelsOn
    })
  } catch (error: any) {
    console.error('Confirm cancel error:', error)
    console.error('Stripe error details:', {
      type: error.type,
      code: error.code,
      message: error.message,
      raw: error.raw
    })
    return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 })
  }
}

