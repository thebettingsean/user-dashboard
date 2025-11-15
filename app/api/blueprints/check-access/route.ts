import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Main Supabase (for blueprints)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

// Users Supabase (for subscription check)
const supabaseUsers = createClient(
  process.env.SUPABASE_USERS_URL || 'https://pkmqhozyorpmteytizut.supabase.co',
  process.env.SUPABASE_USERS_SERVICE_KEY || ''
)

/**
 * Check if a user has access to a blueprint
 * Returns the blueprint content if they have access
 * 
 * Access conditions:
 * 1. Active subscription (unlimited access)
 * 2. Valid unlock (24-hour pass)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sport, periodId } = await request.json()

    if (!sport || !periodId) {
      return NextResponse.json(
        { error: 'Missing sport or periodId' },
        { status: 400 }
      )
    }

    // 1. Get the blueprint
    const { data: blueprint, error: blueprintError } = await supabase
      .from('blueprints')
      .select('*')
      .eq('sport', sport)
      .eq('period_identifier', periodId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (blueprintError || !blueprint) {
      return NextResponse.json(
        { 
          hasAccess: false, 
          error: 'Blueprint not found or expired',
          reason: 'not_found'
        },
        { status: 404 }
      )
    }

    // 2. Check if user has active subscription (infinite access)
    const { data: userData } = await supabaseUsers
      .from('users')
      .select('subscription_status, subscription_end_date')
      .eq('clerk_user_id', userId)
      .single()

    const now = new Date()
    const isSubscribed = (userData?.subscription_status === 'active' || userData?.subscription_status === 'trialing') && 
                        (!userData.subscription_end_date || new Date(userData.subscription_end_date) > now)

    if (isSubscribed) {
      console.log(`✅ Blueprint access granted via subscription: ${userId} - ${sport} ${periodId}`)
      return NextResponse.json({
        hasAccess: true,
        reason: 'subscription',
        blueprint: {
          id: blueprint.id,
          sport: blueprint.sport,
          periodIdentifier: blueprint.period_identifier,
          gameCount: blueprint.game_count,
          content: blueprint.content,
          updatedAt: blueprint.updated_at,
          version: blueprint.version
        }
      })
    }

    // 3. Check if user has unlocked this blueprint (24-hour pass)
    const { data: unlock, error: unlockError } = await supabase
      .from('unlocked_blueprints')
      .select('*')
      .eq('user_id', userId)
      .eq('blueprint_id', blueprint.id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (unlock && !unlockError) {
      console.log(`✅ Blueprint access granted via unlock: ${userId} - ${sport} ${periodId}`)
      return NextResponse.json({
        hasAccess: true,
        reason: 'unlocked',
        expiresAt: unlock.expires_at,
        blueprint: {
          id: blueprint.id,
          sport: blueprint.sport,
          periodIdentifier: blueprint.period_identifier,
          gameCount: blueprint.game_count,
          content: blueprint.content,
          updatedAt: blueprint.updated_at,
          version: blueprint.version
        }
      })
    }

    // 4. No access
    console.log(`❌ Blueprint access denied: ${userId} - ${sport} ${periodId}`)
    return NextResponse.json({
      hasAccess: false,
      reason: 'not_unlocked',
      blueprint: {
        id: blueprint.id,
        sport: blueprint.sport,
        periodIdentifier: blueprint.period_identifier,
        gameCount: blueprint.game_count,
        updatedAt: blueprint.updated_at
      }
    })

  } catch (error: any) {
    console.error('❌ Blueprint check-access error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

