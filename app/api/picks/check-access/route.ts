import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Main Supabase project (where picks and unlocked_picks live)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

// Users Supabase project (for checking premium status)
const supabaseUsers = createClient(
  process.env.SUPABASE_USERS_URL || 'https://pkmqhozyorpmteytizut.supabase.co',
  process.env.SUPABASE_USERS_SERVICE_KEY || ''
)

/**
 * GET /api/picks/check-access?pickIds=id1,id2,id3
 * Returns which picks the user has access to
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user || !user.id) {
      return NextResponse.json({ 
        authenticated: false,
        isPremium: false,
        unlockedPicks: [],
        hasAllDayAccess: false
      })
    }

    const searchParams = request.nextUrl.searchParams
    const pickIdsParam = searchParams.get('pickIds')
    const pickIds = pickIdsParam ? pickIdsParam.split(',') : []

    // Check if user is premium
    const { data: dbUser } = await supabaseUsers
      .from('users')
      .select('is_premium, access_level')
      .eq('clerk_user_id', user.id)
      .single()

    const isPremium = dbUser?.is_premium || dbUser?.access_level === 'full'

    // If premium, they have access to everything
    if (isPremium) {
      return NextResponse.json({
        authenticated: true,
        isPremium: true,
        unlockedPicks: pickIds, // All picks
        hasAllDayAccess: true
      })
    }

    // Check for "all day" unlock (not expired) - from USERS Supabase project
    const { data: allDayUnlock } = await supabaseUsers
      .from('unlocked_picks')
      .select('*')
      .eq('clerk_user_id', user.id)
      .eq('unlock_type', 'all_day')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single()

    const hasAllDayAccess = !!allDayUnlock

    if (hasAllDayAccess) {
      return NextResponse.json({
        authenticated: true,
        isPremium: false,
        unlockedPicks: pickIds, // All picks for 24 hours
        hasAllDayAccess: true,
        allDayExpiresAt: allDayUnlock.expires_at
      })
    }

    // Check individual pick unlocks - from USERS Supabase project
    const { data: unlockedPicks } = await supabaseUsers
      .from('unlocked_picks')
      .select('pick_id')
      .eq('clerk_user_id', user.id)
      .eq('unlock_type', 'single')
      .in('pick_id', pickIds)

    const unlockedPickIds = unlockedPicks?.map(p => p.pick_id) || []

    return NextResponse.json({
      authenticated: true,
      isPremium: false,
      unlockedPicks: unlockedPickIds,
      hasAllDayAccess: false
    })

  } catch (error) {
    console.error('Error checking pick access:', error)
    return NextResponse.json(
      { error: 'Failed to check access' },
      { status: 500 }
    )
  }
}

