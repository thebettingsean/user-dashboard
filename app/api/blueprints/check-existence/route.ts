import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (main project)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

/**
 * Check if a blueprint exists for a given sport and period
 * Used by front-end to show/hide blueprint cards
 * 
 * Query params:
 * - sport: 'nfl' or 'nba'
 * - date: (optional for NBA) YYYY-MM-DD format, defaults to today
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sport = searchParams.get('sport')?.toLowerCase()

    if (!sport || !['nfl', 'nba'].includes(sport)) {
      return NextResponse.json(
        { error: 'Invalid sport parameter. Must be "nfl" or "nba"' },
        { status: 400 }
      )
    }

    let periodIdentifier: string

    if (sport === 'nfl') {
      // Get current NFL week
      periodIdentifier = getCurrentNFLWeek()
    } else {
      // NBA: Use provided date or today
      const date = searchParams.get('date')
      if (date) {
        periodIdentifier = date
      } else {
        // Get today's date in EST
        const estDate = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
        periodIdentifier = new Date(estDate).toISOString().split('T')[0]
      }
    }

    // Query Supabase for the blueprint
    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .select('id, game_count, created_at, updated_at')
      .eq('sport', sport)
      .eq('period_identifier', periodIdentifier)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching blueprint:', error)
      return NextResponse.json(
        { error: 'Failed to check blueprint existence' },
        { status: 500 }
      )
    }

    if (!blueprint) {
      // No blueprint exists
      return NextResponse.json({
        exists: false,
        sport,
        periodIdentifier,
        reason: sport === 'nba' ? 'Less than 4 games or not yet generated' : 'Not yet generated'
      })
    }

    // Blueprint exists
    return NextResponse.json({
      exists: true,
      sport,
      periodIdentifier,
      gameCount: blueprint.game_count,
      lastUpdated: blueprint.updated_at
    })

  } catch (error: any) {
    console.error('Blueprint existence check error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Helper: Get current NFL week number
 * Based on the 2024-2025 season calendar
 */
function getCurrentNFLWeek(): string {
  const now = new Date()
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  
  // NFL 2024-2025 season start: Week 1 begins Sep 5, 2024
  const seasonStart = new Date('2024-09-05T00:00:00-04:00')
  
  // Calculate weeks since season start
  const diffTime = estDate.getTime() - seasonStart.getTime()
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
  
  // Week 1-18, then playoffs
  let weekNumber = diffWeeks + 1
  
  // Cap at Week 18 (regular season)
  if (weekNumber > 18) {
    weekNumber = 18 // For now, keep showing Week 18 during playoffs
  }
  if (weekNumber < 1) {
    weekNumber = 1 // Preseason fallback
  }
  
  return `Week ${weekNumber}`
}

