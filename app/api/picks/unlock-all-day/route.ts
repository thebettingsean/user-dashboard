import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Main Supabase project (where picks and unlocked_picks live)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

// Users Supabase project (for credit deduction)
const supabaseUsers = createClient(
  process.env.SUPABASE_USERS_URL || 'https://pkmqhozyorpmteytizut.supabase.co',
  process.env.SUPABASE_USERS_SERVICE_KEY || ''
)

/**
 * POST /api/picks/unlock-all-day
 * Unlocks ALL picks for 24 hours for 5 credits
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has credits
    const { data: dbUser } = await supabaseUsers
      .from('users')
      .select('*')
      .eq('clerk_user_id', user.id)
      .single()

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const isPremium = dbUser.is_premium || dbUser.access_level === 'full'
    
    // Premium users don't need to unlock
    if (isPremium) {
      return NextResponse.json({
        success: true,
        message: 'Premium user - no unlock needed'
      })
    }

    // Check if user already has an active all-day unlock (from USERS Supabase project)
    const { data: existingUnlock } = await supabaseUsers
      .from('unlocked_picks')
      .select('*')
      .eq('clerk_user_id', user.id)
      .eq('unlock_type', 'all_day')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single()

    if (existingUnlock) {
      return NextResponse.json({
        success: true,
        message: 'All picks already unlocked',
        expiresAt: existingUnlock.expires_at
      })
    }

    // Check credits (purchased_credits - ai_scripts_used)
    const creditsRemaining = (dbUser.purchased_credits || 0) - (dbUser.ai_scripts_used || 0)
    
    if (creditsRemaining < 5) {
      return NextResponse.json(
        { error: 'Insufficient credits - need 5 credits' },
        { status: 403 }
      )
    }

    // Deduct 5 credits
    const { error: deductError } = await supabaseUsers
      .from('users')
      .update({ 
        ai_scripts_used: (dbUser.ai_scripts_used || 0) + 5,
        last_active_at: new Date().toISOString()
      })
      .eq('clerk_user_id', user.id)

    if (deductError) {
      console.error('Failed to deduct credits:', deductError)
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      )
    }

    // Create 24-hour unlock (in USERS Supabase project)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    
    const { error: unlockError } = await supabaseUsers
      .from('unlocked_picks')
      .insert({
        clerk_user_id: user.id,
        pick_id: null, // null = all picks
        unlock_type: 'all_day',
        unlocked_at: new Date().toISOString(),
        expires_at: expiresAt
      })

    if (unlockError) {
      console.error('Failed to unlock all picks:', unlockError)
      // Try to refund the credits
      await supabaseUsers
        .from('users')
        .update({ 
          ai_scripts_used: (dbUser.ai_scripts_used || 0)
        })
        .eq('clerk_user_id', user.id)
      
      return NextResponse.json(
        { error: 'Failed to unlock picks' },
        { status: 500 }
      )
    }

    console.log(`✅ All picks unlocked for user ${user.id} until ${expiresAt}. Credits remaining: ${creditsRemaining - 5}`)

    return NextResponse.json({
      success: true,
      message: 'All picks unlocked for 24 hours',
      expiresAt,
      creditsRemaining: creditsRemaining - 5
    })

  } catch (error) {
    console.error('Error unlocking all picks:', error)
    return NextResponse.json(
      { error: 'Failed to unlock picks' },
      { status: 500 }
    )
  }
}

