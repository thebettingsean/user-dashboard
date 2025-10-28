import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') // Format: YYYY-MM-DD
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }

    // Get start and end of day in UTC
    const startDate = new Date(date + 'T00:00:00Z')
    const endDate = new Date(date + 'T23:59:59Z')

    // Fetch picks for the date
    const { data: picks, error: picksError } = await supabase
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

