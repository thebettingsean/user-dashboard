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

    // Check if user exists in Supabase
    const { data: existingUser, error: fetchError } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    // Get Stripe customer ID from Clerk metadata
    const stripeCustomerId = user.publicMetadata?.stripeCustomerId as string | undefined
    
    // Check if user has any active subscription plans
    const plan = user.publicMetadata?.plan as string | undefined
    const fantasyPlan = user.publicMetadata?.fantasyPlan as string | undefined
    const isPremium = !!(plan || fantasyPlan || stripeCustomerId)
    
    console.log(`User ${userId} subscription check:`, {
      plan,
      fantasyPlan,
      stripeCustomerId,
      isPremium
    })

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
    console.log(`Updating existing user: ${userId} (Premium: ${isPremium})`)
    
    const { data: updatedUser, error: updateError } = await supabaseUsers
      .from('users')
      .update({
        stripe_customer_id: stripeCustomerId || null,
        is_premium: isPremium,
        last_active_at: new Date().toISOString()
      })
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

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

