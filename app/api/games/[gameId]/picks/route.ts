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

    // First try without the relationship to debug
    const { data, error } = await supabase
      .from('picks')
      .select('id, bet_title, odds, units, game_time, analysis, bettor_id')
      .eq('game_id', gameId)
      .eq('result', 'pending')
      .order('units', { ascending: false })

    if (error) {
      console.error('[Picks API] Error fetching picks:', error)
      return NextResponse.json({ error: 'Failed to fetch picks', details: error }, { status: 500 })
    }

    console.log('[Picks API] Found picks:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('[Picks API] First pick:', data[0])
    }

    // Now fetch bettor info separately
    const bettorIds = Array.from(new Set(data?.map((p: any) => p.bettor_id).filter(Boolean) || []))
    console.log('[Picks API] Fetching bettors for IDs:', bettorIds)
    
    let bettorsMap: Record<string, any> = {}
    if (bettorIds.length > 0) {
      const { data: bettorsData, error: bettorsError } = await supabase
        .from('bettors')
        .select('id, name, profile_image, profile_initials')
        .in('id', bettorIds)
      
      if (bettorsError) {
        console.error('[Picks API] Error fetching bettors:', bettorsError)
      } else {
        bettorsMap = (bettorsData || []).reduce((acc: any, b: any) => {
          acc[b.id] = b
          return acc
        }, {})
        console.log('[Picks API] Bettors map:', bettorsMap)
      }
    }

    const picks = (data || []).map((pick: any) => {
      const bettor = bettorsMap[pick.bettor_id]
      return {
        id: pick.id,
        bettorName: bettor?.name || 'Unknown',
        bettorProfileImage: bettor?.profile_image || null,
        bettorProfileInitials: bettor?.profile_initials || null,
        betTitle: pick.bet_title,
        odds: pick.odds,
        units: pick.units,
        analysis: pick.analysis,
        gameTimeLabel: pick.game_time || '',
        awayTeam: null,
        homeTeam: null
      }
    })

    return NextResponse.json({ picks })
  } catch (error) {
    console.error('Error in picks API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

