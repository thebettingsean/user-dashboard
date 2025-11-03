import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

export async function POST(request: NextRequest) {
  try {
    // Get Clerk user
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get subscription data from Clerk metadata (check both public and private)
    const publicMeta = user.publicMetadata || {}
    const privateMeta = user.privateMetadata || {}
    
    // Check both publicMetadata and privateMetadata for subscription fields
    const stripeCustomerId = (publicMeta.stripeCustomerId || privateMeta.stripeCustomerId) as string | undefined
    const plan = (publicMeta.plan || privateMeta.plan) as string | undefined
    const fantasyPlan = (publicMeta.fantasyPlan || privateMeta.fantasyPlan) as string | undefined
    const isPremium = !!(plan || fantasyPlan || stripeCustomerId)
    
    console.log(`📋 User ${userId} publicMetadata:`, JSON.stringify(publicMeta, null, 2))
    console.log(`🔐 User ${userId} privateMetadata:`, JSON.stringify(privateMeta, null, 2))
    console.log(`🔍 Subscription check:`, {
      plan,
      fantasyPlan,
      stripeCustomerId,
      isPremium
    })

    // Check if user exists in Supabase
    const { data: existingUser, error: fetchError } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError)
    }

    // User doesn't exist - create them
    if (!existingUser) {
      console.log(`Creating new user: ${userId} (Premium: ${isPremium})`)
      
      const { data: newUser, error: createError } = await supabaseUsers
        .from('users')
        .insert({
          clerk_user_id: userId,
          email: user.emailAddresses[0]?.emailAddress || null,
          stripe_customer_id: stripeCustomerId || null,
          is_premium: isPremium,
          ai_scripts_used: 0,
          ai_scripts_limit: 3,
          ai_scripts_reset_at: getNextMonday()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        user: newUser,
        created: true
      })
    }

    // User exists - update their premium status and last active
    console.log(`⚡ Updating existing user: ${userId}`)
    console.log(`   Current state: is_premium=${existingUser.is_premium}`)
    console.log(`   New state: is_premium=${isPremium}`)
    
    const updateData = {
      stripe_customer_id: stripeCustomerId || null,
      is_premium: isPremium,
      last_active_at: new Date().toISOString()
    }
    console.log(`   Update data:`, updateData)
    
    const { data: updatedUser, error: updateError } = await supabaseUsers
      .from('users')
      .update(updateData)
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user', details: updateError },
        { status: 500 }
      )
    }

    console.log(`✅ User updated successfully:`, {
      id: updatedUser.id,
      is_premium: updatedUser.is_premium,
      stripe_customer_id: updatedUser.stripe_customer_id
    })

    return NextResponse.json({
      user: updatedUser,
      created: false
    })

  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

