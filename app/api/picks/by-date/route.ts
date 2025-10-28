import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') // Format: YYYY-MM-DD
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }

    // We need to fetch a wider range since EST dates don't align with UTC dates
    // Fetch the previous day through next day to ensure we catch all EST picks for this date
    const targetDate = new Date(date + 'T00:00:00')
    const startDate = new Date(targetDate)
    startDate.setDate(startDate.getDate() - 1)
    const endDate = new Date(targetDate)
    endDate.setDate(endDate.getDate() + 2)

    // Fetch picks for the wider date range
    const { data: allPicks, error: picksError } = await supabase
      .from('picks')
      .select(`
        *,
        pick_outcomes (
          result,
          units_result,
          recapped_at
        )
      `)
      .gte('game_time', startDate.toISOString())
      .lte('game_time', endDate.toISOString())
      .order('game_time', { ascending: true })
    
    if (picksError) {
      console.error('Error fetching picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    // Filter to only picks whose game_time in EST matches the target date
    const picks = (allPicks || []).filter((pick: any) => {
      const gameTimeUTC = new Date(pick.game_time)
      const gameTimeEST = new Date(
        gameTimeUTC.toLocaleString("en-US", { timeZone: "America/New_York" })
      )
      const estDateStr = `${gameTimeEST.getFullYear()}-${String(gameTimeEST.getMonth() + 1).padStart(2, '0')}-${String(gameTimeEST.getDate()).padStart(2, '0')}`
      return estDateStr === date
    })

    // Calculate total units for the day
    let totalUnits = 0
    const picksWithResults = (picks || []).map(pick => {
      const outcome = pick.pick_outcomes?.[0]
      const unitsResult = outcome ? parseFloat(outcome.units_result) : 0
      totalUnits += unitsResult
      
      return {
        ...pick,
        result: outcome?.result || pick.result || 'pending',
        units_result: unitsResult
      }
    })

    return NextResponse.json({
      date,
      picks: picksWithResults,
      totalUnits: Math.round(totalUnits * 100) / 100,
      pickCount: picksWithResults.length
    })

  } catch (error) {
    console.error('Error in picks by date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

