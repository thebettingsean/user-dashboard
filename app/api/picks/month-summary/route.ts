import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month') // 0-11 (JavaScript month)
    
    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month required' }, { status: 400 })
    }

    // Get first and last day of month
    const firstDay = new Date(parseInt(year), parseInt(month), 1)
    const lastDay = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59)

    // Fetch all picks for the month with outcomes
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        game_time,
        pick_outcomes (
          result,
          units_result
        )
      `)
      .gte('game_time', firstDay.toISOString())
      .lte('game_time', lastDay.toISOString())

    if (picksError) {
      console.error('Error fetching month picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    // Group by date and calculate units per day
    const dailySummary: { [key: string]: { count: number; units: number } } = {}
    let monthTotal: number = 0

    (picks || []).forEach(pick => {
      const gameDate = new Date(pick.game_time)
      const dateKey = gameDate.toISOString().split('T')[0] // YYYY-MM-DD
      
      if (!dailySummary[dateKey]) {
        dailySummary[dateKey] = { count: 0, units: 0 }
      }
      
      dailySummary[dateKey].count++
      
      const outcome = pick.pick_outcomes?.[0]
      if (outcome) {
        const units = parseFloat(outcome.units_result)
        dailySummary[dateKey].units += units
        monthTotal += units
      }
    })

    // Round all units
    Object.keys(dailySummary).forEach(date => {
      dailySummary[date].units = Math.round(dailySummary[date].units * 100) / 100
    })

    return NextResponse.json({
      year: parseInt(year),
      month: parseInt(month),
      dailySummary,
      monthTotal: Math.round(monthTotal * 100) / 100
    })

  } catch (error) {
    console.error('Error in month summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

