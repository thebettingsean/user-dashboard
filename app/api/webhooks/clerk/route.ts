import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseUsers } from '@/lib/supabase-users'

const MAILMODO_API_KEY = 'X52G8DM-H3V44NW-NYB7PZ1-XXCDNKS'
const MAILMODO_API_URL = 'https://api.mailmodo.com/api/v1/addToList'

export async function POST(req: Request) {
  // Get the webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to your .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, public_metadata, private_metadata } = evt.data

    const email = email_addresses?.[0]?.email_address

    if (!email) {
      console.log('❌ No email found for user:', id)
      return NextResponse.json({ success: true, message: 'No email to process' })
    }

    console.log('👤 New user created:', email)

    // 1️⃣ FIRST: Sync user to Supabase users table
    try {
      const stripeCustomerId = (public_metadata?.stripeCustomerId || private_metadata?.stripeCustomerId) as string | undefined
      const plan = (public_metadata?.plan || private_metadata?.plan) as string | undefined
      const fantasyPlan = (public_metadata?.fantasyPlan || private_metadata?.fantasyPlan) as string | undefined
      const isPremium = !!(plan || fantasyPlan || stripeCustomerId)

      console.log(`📊 Creating user in Supabase: ${id} (Premium: ${isPremium})`)

      const { error: supabaseError } = await supabaseUsers
        .from('users')
        .insert({
          clerk_user_id: id,
          email: email,
          stripe_customer_id: stripeCustomerId || null,
          is_premium: isPremium,
          access_level: isPremium ? 'full' : 'none',
          ai_scripts_used: 0,
          ai_scripts_limit: 3,
          ai_scripts_reset_at: getNextMonday(),
          purchased_credits: 1 // 🎁 1 free credit on sign-up!
        })

      if (supabaseError) {
        console.error('❌ Error creating user in Supabase:', supabaseError)
      } else {
        console.log('✅ User created in Supabase:', email)
      }
    } catch (error) {
      console.error('❌ Error syncing to Supabase:', error)
    }

    // 2️⃣ SECOND: Handle Mailmodo (if free user)
    const hasSubscription = 
      public_metadata?.plan || 
      private_metadata?.plan || 
      public_metadata?.fantasyPlan || 
      private_metadata?.fantasyPlan

    if (hasSubscription) {
      console.log('💳 User has subscription, skipping Mailmodo')
      return NextResponse.json({ success: true, message: 'User has subscription' })
    }

    // User is free - add to Mailmodo
    console.log('🆓 Free user detected, adding to Mailmodo...')

    try {
      const mailmodoResponse = await fetch(MAILMODO_API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'mmApiKey': MAILMODO_API_KEY
        },
        body: JSON.stringify({
          email: email,
          data: {
            first_name: first_name || '',
            last_name: last_name || '',
            name: [first_name, last_name].filter(Boolean).join(' ') || '',
            clerk_user_id: id
          },
          listName: 'Free Members'
        })
      })

      if (mailmodoResponse.ok) {
        console.log('✅ User added to Mailmodo Free Members list:', email)
      } else {
        const errorData = await mailmodoResponse.json()
        console.error('❌ Mailmodo API error:', errorData)
      }
    } catch (error) {
      console.error('❌ Error adding user to Mailmodo:', error)
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, public_metadata, private_metadata } = evt.data

    const email = email_addresses?.[0]?.email_address

    if (!email) {
      return NextResponse.json({ success: true, message: 'No email to process' })
    }

    // 1️⃣ FIRST: Update user in Supabase
    try {
      const stripeCustomerId = (public_metadata?.stripeCustomerId || private_metadata?.stripeCustomerId) as string | undefined
      const plan = (public_metadata?.plan || private_metadata?.plan) as string | undefined
      const fantasyPlan = (public_metadata?.fantasyPlan || private_metadata?.fantasyPlan) as string | undefined
      const isPremium = !!(plan || fantasyPlan || stripeCustomerId)

      console.log(`🔄 Updating user in Supabase: ${id} (Premium: ${isPremium})`)

      const { error: updateError } = await supabaseUsers
        .from('users')
        .update({
          email: email,
          stripe_customer_id: stripeCustomerId || null,
          is_premium: isPremium,
          access_level: isPremium ? 'full' : 'none',
          last_active_at: new Date().toISOString()
        })
        .eq('clerk_user_id', id)

      if (updateError) {
        console.error('❌ Error updating user in Supabase:', updateError)
      } else {
        console.log('✅ User updated in Supabase:', email)
      }
    } catch (error) {
      console.error('❌ Error syncing to Supabase:', error)
    }

    // 2️⃣ SECOND: Handle Mailmodo
    const hasSubscription = 
      public_metadata?.plan || 
      private_metadata?.plan || 
      public_metadata?.fantasyPlan || 
      private_metadata?.fantasyPlan

    if (hasSubscription) {
      console.log('💳 User upgraded to paid, should be removed from free list (manual removal)')
      // Note: You can add logic here to remove them from Mailmodo free list if needed
    }
  }

  return NextResponse.json({ success: true })
}

// Helper: Get next Monday at 00:00 UTC
function getNextMonday(): string {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  
  const nextMonday = new Date(now)
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday)
  nextMonday.setUTCHours(0, 0, 0, 0)
  
  return nextMonday.toISOString()
}

