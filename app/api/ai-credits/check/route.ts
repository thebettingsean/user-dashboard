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

    // Always trigger sync first to ensure premium status is up-to-date
    console.log(`Syncing user ${userId} to ensure latest subscription status...`)
    const syncResponse = await fetch(`${request.nextUrl.origin}/api/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward Clerk session
        'Cookie': request.headers.get('cookie') || ''
      }
    })

    if (!syncResponse.ok) {
      console.warn('Sync failed, will use existing data if available')
    }

    // Get user from Supabase (should be fresh from sync)
    let { data: user, error } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    // User still doesn't exist after sync attempt
    if (error || !user) {
      console.error(`User ${userId} not found in Supabase even after sync attempt`)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
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

