import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface DailySummary {
  count: number
  units: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    
    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month required' }, { status: 400 })
    }

    const yearNum = parseInt(year, 10)
    const monthNum = parseInt(month, 10)

    // Get first and last day of month
    const firstDay = new Date(yearNum, monthNum, 1)
    const lastDay = new Date(yearNum, monthNum + 1, 0, 23, 59, 59)

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
    const dailySummary: Record<string, DailySummary> = {}
    let total = 0.0

    if (picks) {
      picks.forEach((pick: any) => {
        const gameDate = new Date(pick.game_time)
        const dateKey = gameDate.toISOString().split('T')[0]
        
        if (!dailySummary[dateKey]) {
          dailySummary[dateKey] = { count: 0, units: 0.0 }
        }
        
        dailySummary[dateKey].count = dailySummary[dateKey].count + 1
        
        const outcome = pick.pick_outcomes?.[0]
        if (outcome && outcome.units_result) {
          const unitsValue = parseFloat(outcome.units_result)
          dailySummary[dateKey].units = dailySummary[dateKey].units + unitsValue
          total = total + unitsValue
        }
      })
    }

    // Round all units
    Object.keys(dailySummary).forEach(date => {
      const currentUnits = dailySummary[date].units
      dailySummary[date].units = Math.round(currentUnits * 100) / 100
    })

    const roundedTotal = Math.round(total * 100) / 100

    return NextResponse.json({
      year: yearNum,
      month: monthNum,
      dailySummary,
      monthTotal: roundedTotal
    })

  } catch (error) {
    console.error('Error in month summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
