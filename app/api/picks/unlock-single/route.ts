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
 * POST /api/picks/unlock-single
 * Unlocks a single pick for 1 credit
 * Body: { pickId: string }
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

    const { pickId } = await request.json()

    if (!pickId) {
      return NextResponse.json(
        { error: 'pickId is required' },
        { status: 400 }
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

    // Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from('unlocked_picks')
      .select('*')
      .eq('clerk_user_id', user.id)
      .eq('pick_id', pickId)
      .eq('unlock_type', 'single')
      .single()

    if (existingUnlock) {
      return NextResponse.json({
        success: true,
        message: 'Pick already unlocked'
      })
    }

    // Check credits (purchased_credits - ai_scripts_used)
    const creditsRemaining = (dbUser.purchased_credits || 0) - (dbUser.ai_scripts_used || 0)
    
    if (creditsRemaining < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 403 }
      )
    }

    // Deduct 1 credit
    const { error: deductError } = await supabaseUsers
      .from('users')
      .update({ 
        ai_scripts_used: (dbUser.ai_scripts_used || 0) + 1,
        last_active_at: new Date().toISOString()
      })
      .eq('clerk_user_id', user.id)

    if (deductError) {
      console.error('Failed to deduct credit:', deductError)
      return NextResponse.json(
        { error: 'Failed to deduct credit' },
        { status: 500 }
      )
    }

    // Unlock the pick
    const { error: unlockError } = await supabase
      .from('unlocked_picks')
      .insert({
        clerk_user_id: user.id,
        pick_id: pickId,
        unlock_type: 'single',
        unlocked_at: new Date().toISOString()
      })

    if (unlockError) {
      console.error('Failed to unlock pick:', unlockError)
      // Try to refund the credit
      await supabaseUsers
        .from('users')
        .update({ 
          ai_scripts_used: (dbUser.ai_scripts_used || 0)
        })
        .eq('clerk_user_id', user.id)
      
      return NextResponse.json(
        { error: 'Failed to unlock pick' },
        { status: 500 }
      )
    }

    console.log(`✅ Pick ${pickId} unlocked for user ${user.id}. Credits remaining: ${creditsRemaining - 1}`)

    return NextResponse.json({
      success: true,
      message: 'Pick unlocked successfully',
      creditsRemaining: creditsRemaining - 1
    })

  } catch (error) {
    console.error('Error unlocking pick:', error)
    return NextResponse.json(
      { error: 'Failed to unlock pick' },
      { status: 500 }
    )
  }
}

