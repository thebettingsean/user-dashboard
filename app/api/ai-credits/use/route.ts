import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

export async function POST(request: NextRequest) {
  try {
    // Check if user is logged in
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from Supabase
    const { data: user, error } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !user) {
      console.error('Error fetching user:', error)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Premium users (full subscription) don't need credit tracking
    if (user.is_premium || user.access_level === 'full') {
      return NextResponse.json({
        success: true,
        isPremium: true,
        creditsRemaining: 'unlimited',
        accessLevel: 'full'
      })
    }

    // Increment credit usage for credit pack users
    const newUsage = (user.ai_scripts_used || 0) + 1
    const totalCredits = user.purchased_credits || 0
    const remaining = Math.max(0, totalCredits - newUsage)

    const { data: updatedUser, error: updateError } = await supabaseUsers
      .from('users')
      .update({
        ai_scripts_used: newUsage,
        last_active_at: new Date().toISOString()
      })
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user credits:', updateError)
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      )
    }

    console.log(`User ${userId} used credit: ${newUsage}/${totalCredits} (${remaining} remaining)`)

    return NextResponse.json({
      success: true,
      isPremium: false,
      creditsUsed: newUsage,
      creditsRemaining: remaining,
      totalCredits,
      accessLevel: user.access_level
    })

  } catch (error) {
    console.error('Error using AI credit:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    
    // Return success fallback so app still works
    return NextResponse.json({
      success: true,
      isPremium: false,
      scriptsUsed: 0,
      scriptsLimit: 3
    })
  }
}

