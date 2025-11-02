import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMzAwMDAsImV4cCI6MjA2MTgwNjAwMH0.gIsjMoK0-ItRhE8F8Fbupwd-U3D0WInwFjdTt9_Ztr0'

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Fetch analyst picks by game_id
 * GET /api/analyst-library?gameId=NFL-20251102-CAR-GB
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json(
        { error: 'gameId is required' },
        { status: 400 }
      )
    }

    console.log(`\n=== FETCHING ANALYST PICKS FOR GAME ${gameId} ===`)

    // Fetch picks from Supabase where game_id matches
    const { data: picks, error } = await supabase
      .from('picks')
      .select(`
        *,
        bettor:bettor_id (
          id,
          name
        )
      `)
      .eq('game_id', gameId)
      .eq('is_active', true)
      .order('posted_at', { ascending: false })

    if (error) {
      console.error('Error fetching picks from Supabase:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analyst picks' },
        { status: 500 }
      )
    }

    console.log(`✅ Found ${picks?.length || 0} picks for game ${gameId}`)

    return NextResponse.json({
      gameId,
      picks: picks || []
    })

  } catch (error) {
    console.error('Error in analyst-library route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
