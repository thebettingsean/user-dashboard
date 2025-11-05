import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

export async function GET(request: NextRequest) {
  try {
    // Check if user is logged in
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        hasAccess: false,
        scriptsUsed: 0,
        scriptsLimit: 3,
        isPremium: false,
        resetAt: null
      })
    }

    // Get user from Supabase directly
    console.log(`🔍 Looking up user ${userId} in Supabase...`)
    let { data: user, error } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    // If user doesn't exist, create them now
    if (error || !user) {
      console.log(`⚠️ User ${userId} not found in Supabase, creating now...`)
      
      // Get Clerk user info
      const { currentUser } = await import('@clerk/nextjs/server')
      const clerkUser = await currentUser()
      
      if (!clerkUser) {
        console.error(`Cannot create user - Clerk user not found`)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Determine premium status from Clerk metadata
      const publicMeta = clerkUser.publicMetadata || {}
      const privateMeta = clerkUser.privateMetadata || {}
      const stripeCustomerId = (publicMeta.stripeCustomerId || privateMeta.stripeCustomerId) as string | undefined
      const plan = (publicMeta.plan || privateMeta.plan) as string | undefined
      const fantasyPlan = (publicMeta.fantasyPlan || privateMeta.fantasyPlan) as string | undefined
      const isPremium = !!(plan || fantasyPlan || stripeCustomerId)

      // Create user in Supabase
      const { data: newUser, error: createError } = await supabaseUsers
        .from('users')
        .insert({
          clerk_user_id: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || null,
          stripe_customer_id: stripeCustomerId || null,
          is_premium: isPremium,
          access_level: isPremium ? 'full' : 'none',
          ai_scripts_used: 0,
          ai_scripts_limit: 3,
          ai_scripts_reset_at: getNextMonday(),
          purchased_credits: 0
        })
        .select()
        .single()

      if (createError || !newUser) {
        console.error(`Failed to create user in Supabase:`, createError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      user = newUser
      console.log(`✅ User created in Supabase with premium status: ${isPremium}`)
    }

    console.log(`✅ User ${userId} loaded (Premium: ${user.is_premium}, Access: ${user.access_level}, Purchased: ${user.purchased_credits})`)

    // Premium users (full subscription) have unlimited access
    if (user.is_premium || user.access_level === 'full') {
      return NextResponse.json({
        authenticated: true,
        hasAccess: true,
        creditsRemaining: 'unlimited',
        accessLevel: 'full',
        isPremium: true
      })
    }

    // Credit pack users or no purchase users
    // Total available credits = purchased credits (no free credits)
    const totalCredits = user.purchased_credits || 0
    const creditsUsed = user.ai_scripts_used || 0
    const creditsRemaining = Math.max(0, totalCredits - creditsUsed)
    const hasAccess = creditsRemaining > 0

    return NextResponse.json({
      authenticated: true,
      hasAccess,
      creditsRemaining,
      creditsUsed,
      totalCredits,
      accessLevel: user.access_level || 'none',
      isPremium: false
    })

  } catch (error) {
    console.error('Error checking AI credits:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Return a fallback response so the app still works
    return NextResponse.json({
      authenticated: false,
      hasAccess: true, // Allow access if credits system fails
      scriptsUsed: 0,
      scriptsLimit: 3,
      isPremium: false,
      resetAt: null
    })
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

