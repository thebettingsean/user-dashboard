import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params
    
    console.log('[Picks API] Fetching picks for gameId:', gameId)

    const { data, error } = await supabase
      .from('picks')
      .select('id, bet_title, odds, units, game_time, analysis, away_team, home_team, bettors(name, profile_image, profile_initials)')
      .eq('game_id', gameId)
      .eq('result', 'pending')
      .order('units', { ascending: false })

    if (error) {
      console.error('[Picks API] Error fetching picks:', error)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    console.log('[Picks API] Found picks:', data?.length || 0)

    const picks = (data || []).map((pick: any) => ({
      id: pick.id,
      bettorName: pick.bettors?.name || 'Unknown',
      bettorProfileImage: pick.bettors?.profile_image || null,
      bettorProfileInitials: pick.bettors?.profile_initials || null,
      betTitle: pick.bet_title,
      odds: pick.odds,
      units: pick.units,
      analysis: pick.analysis,
      gameTimeLabel: pick.game_time || '',
      awayTeam: pick.away_team,
      homeTeam: pick.home_team
    }))

    return NextResponse.json({ picks })
  } catch (error) {
    console.error('Error in picks API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

