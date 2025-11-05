import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

/**
 * Admin endpoint to sync ALL Clerk users to Supabase
 * This is a one-time operation to catch up existing users
 * 
 * Usage: GET /api/admin/sync-all-users?secret=YOUR_ADMIN_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Simple auth check (you should use a real admin secret)
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting bulk user sync...')

    // Fetch all users from Clerk
    const { data: clerkUsers } = await clerkClient.users.getUserList({
      limit: 500 // Adjust if you have more users
    })

    console.log(`📊 Found ${clerkUsers.length} users in Clerk`)

    let created = 0
    let updated = 0
    let errors = 0

    for (const user of clerkUsers) {
      try {
        const email = user.emailAddresses?.[0]?.emailAddress
        if (!email) {
          console.log(`⚠️ Skipping user ${user.id} - no email`)
          continue
        }

        // Check metadata for premium status
        const publicMeta = user.publicMetadata || {}
        const privateMeta = user.privateMetadata || {}
        const stripeCustomerId = (publicMeta.stripeCustomerId || privateMeta.stripeCustomerId) as string | undefined
        const plan = (publicMeta.plan || privateMeta.plan) as string | undefined
        const fantasyPlan = (publicMeta.fantasyPlan || privateMeta.fantasyPlan) as string | undefined
        const isPremium = !!(plan || fantasyPlan || stripeCustomerId)

        // Check if user exists in Supabase
        const { data: existingUser } = await supabaseUsers
          .from('users')
          .select('id')
          .eq('clerk_user_id', user.id)
          .single()

        if (existingUser) {
          // Update existing user
          const { error: updateError } = await supabaseUsers
            .from('users')
            .update({
              email: email,
              stripe_customer_id: stripeCustomerId || null,
              is_premium: isPremium,
              access_level: isPremium ? 'full' : 'none',
              last_active_at: new Date().toISOString()
            })
            .eq('clerk_user_id', user.id)

          if (updateError) {
            console.error(`❌ Error updating user ${email}:`, updateError)
            errors++
          } else {
            console.log(`✅ Updated user ${email} (Premium: ${isPremium})`)
            updated++
          }
        } else {
          // Create new user
          const { error: insertError } = await supabaseUsers
            .from('users')
            .insert({
              clerk_user_id: user.id,
              email: email,
              stripe_customer_id: stripeCustomerId || null,
              is_premium: isPremium,
              access_level: isPremium ? 'full' : 'none',
              ai_scripts_used: 0,
              ai_scripts_limit: 3,
              ai_scripts_reset_at: getNextMonday(),
              purchased_credits: 0
            })

          if (insertError) {
            console.error(`❌ Error creating user ${email}:`, insertError)
            errors++
          } else {
            console.log(`✅ Created user ${email} (Premium: ${isPremium})`)
            created++
          }
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError)
        errors++
      }
    }

    console.log(`\n📊 Sync complete:`)
    console.log(`  ✅ Created: ${created}`)
    console.log(`  🔄 Updated: ${updated}`)
    console.log(`  ❌ Errors: ${errors}`)

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      total: clerkUsers.length
    })

  } catch (error) {
    console.error('Error syncing users:', error)
    return NextResponse.json(
      { error: 'Failed to sync users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
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

