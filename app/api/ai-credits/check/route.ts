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

    // Get user from Supabase
    let { data: user, error } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    // User doesn't exist yet - trigger sync
    if (error || !user) {
      console.log(`User ${userId} not found in Supabase - triggering sync...`)
      
      // Call sync endpoint to create user
      const syncResponse = await fetch(`${request.nextUrl.origin}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward Clerk session
          'Cookie': request.headers.get('cookie') || ''
        }
      })

      if (!syncResponse.ok) {
        console.error('Failed to sync user')
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      // Fetch user again after sync
      const { data: newUser } = await supabaseUsers
        .from('users')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

      if (!newUser) {
        return NextResponse.json(
          { error: 'User creation failed' },
          { status: 500 }
        )
      }

      user = newUser
      console.log(`✅ User ${userId} synced successfully`)
    }

    // Premium users have unlimited access
    if (user.is_premium) {
      return NextResponse.json({
        authenticated: true,
        hasAccess: true,
        scriptsUsed: 0,
        scriptsLimit: 'unlimited',
        isPremium: true,
        resetAt: null
      })
    }

    // Check if free user needs a reset
    const now = new Date()
    const resetAt = new Date(user.ai_scripts_reset_at)
    
    if (now >= resetAt) {
      // Reset credits
      const { data: resetUser, error: resetError } = await supabaseUsers
        .from('users')
        .update({
          ai_scripts_used: 0,
          ai_scripts_reset_at: getNextMonday()
        })
        .eq('clerk_user_id', userId)
        .select()
        .single()

      if (resetError) {
        console.error('Error resetting credits:', resetError)
      } else {
        console.log(`Reset credits for user ${userId}`)
        return NextResponse.json({
          authenticated: true,
          hasAccess: true,
          scriptsUsed: 0,
          scriptsLimit: 3,
          isPremium: false,
          resetAt: resetUser.ai_scripts_reset_at
        })
      }
    }

    // Free user - check if they have credits remaining
    const hasAccess = user.ai_scripts_used < user.ai_scripts_limit

    return NextResponse.json({
      authenticated: true,
      hasAccess,
      scriptsUsed: user.ai_scripts_used,
      scriptsLimit: user.ai_scripts_limit,
      isPremium: false,
      resetAt: user.ai_scripts_reset_at
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

