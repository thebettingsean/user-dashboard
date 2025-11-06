import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Main Supabase (for blueprints)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

// Users Supabase (for credits)
const supabaseUsers = createClient(
  process.env.SUPABASE_USERS_URL!,
  process.env.SUPABASE_USERS_SERVICE_KEY!
)

const BLUEPRINT_COST = 5 // 5 credits per blueprint

/**
 * Unlock a blueprint for a user (24-hour pass)
 * Deducts 5 credits from user's balance
 * Creates unlock record with 24-hour expiration
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
          success: false, 
          error: 'Blueprint not found or expired'
        },
        { status: 404 }
      )
    }

    // 2. Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from('unlocked_blueprints')
      .select('*')
      .eq('user_id', userId)
      .eq('blueprint_id', blueprint.id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingUnlock) {
      console.log(`ℹ️  Blueprint already unlocked: ${userId} - ${sport} ${periodId}`)
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
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

    // 3. Get user's credit balance
    const { data: user, error: userError } = await supabaseUsers
      .from('users')
      .select('ai_credits')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.ai_credits < BLUEPRINT_COST) {
      console.log(`❌ Insufficient credits: ${userId} has ${user.ai_credits}, needs ${BLUEPRINT_COST}`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient credits',
          currentBalance: user.ai_credits,
          required: BLUEPRINT_COST
        },
        { status: 402 } // Payment Required
      )
    }

    // 4. Deduct credits
    const newBalance = user.ai_credits - BLUEPRINT_COST
    const { error: creditError } = await supabaseUsers
      .from('users')
      .update({ 
        ai_credits: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('clerk_user_id', userId)

    if (creditError) {
      console.error('Error deducting credits:', creditError)
      return NextResponse.json(
        { success: false, error: 'Failed to deduct credits' },
        { status: 500 }
      )
    }

    // 5. Create unlock record (24-hour pass)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24 hours

    const { error: unlockError } = await supabase
      .from('unlocked_blueprints')
      .insert({
        user_id: userId,
        blueprint_id: blueprint.id,
        credits_spent: BLUEPRINT_COST,
        expires_at: expiresAt.toISOString()
      })

    if (unlockError) {
      console.error('Error creating unlock record:', unlockError)
      
      // Rollback: refund credits
      await supabaseUsers
        .from('users')
        .update({ 
          ai_credits: user.ai_credits, // Restore original balance
          updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
      
      return NextResponse.json(
        { success: false, error: 'Failed to unlock blueprint' },
        { status: 500 }
      )
    }

    console.log(`✅ Blueprint unlocked: ${userId} - ${sport} ${periodId} - ${BLUEPRINT_COST} credits spent`)

    // 6. Return success with blueprint content
    return NextResponse.json({
      success: true,
      newBalance,
      creditsSpent: BLUEPRINT_COST,
      expiresAt: expiresAt.toISOString(),
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

  } catch (error: any) {
    console.error('❌ Blueprint unlock error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

