import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') || 'all'
    const days = parseInt(searchParams.get('days') || '3')
    const bettorId = searchParams.get('bettor_id') // Optional: for specific bettor

    console.log('[Analyst Picks Analytics] Fetching data:', { sport, days, bettorId })
    console.log('[Analyst Picks Analytics] Using Supabase URL:', SUPABASE_URL)

    // Fetch all active bettors
    const { data: bettors, error: bettorsError } = await supabase
      .from('bettors')
      .select('id, name, profile_image, profile_initials, is_active')
      .eq('is_active', true)
      .order('name')

    if (bettorsError) {
      console.error('[Analyst Picks Analytics] Bettors error:', JSON.stringify(bettorsError, null, 2))
      return NextResponse.json({ 
        error: 'Failed to fetch bettors',
        details: bettorsError.message,
        code: bettorsError.code,
        hint: bettorsError.hint,
        supabaseUrl: SUPABASE_URL
      }, { status: 500 })
    }
    
    console.log('[Analyst Picks Analytics] Fetched', bettors?.length || 0, 'bettors')

    // Build picks query
    let picksQuery = supabase
      .from('picks')
      .select('*')
      .in('result', ['won', 'lost']) // Only recapped picks
      .eq('is_active', true)
      .order('game_time', { ascending: false })

    // Filter by sport if not "all"
    if (sport !== 'all') {
      picksQuery = picksQuery.eq('sport', sport.toUpperCase())
    }

    // Filter by bettor if specified
    if (bettorId) {
      picksQuery = picksQuery.eq('bettor_id', bettorId)
    }

    const { data: picks, error: picksError } = await picksQuery

    if (picksError) {
      console.error('[Analyst Picks Analytics] Picks error:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    console.log('[Analyst Picks Analytics] Fetched', picks?.length || 0, 'recapped picks')

    if (!picks || picks.length === 0) {
      return NextResponse.json({
        success: true,
        bettors: bettors || [],
        collective: { days: [], overall: { wins: 0, losses: 0, winRate: '0.0', roi: '0.0', unitsWon: '0.00', unitsRisked: '0.00' } },
        bettorStats: {}
      })
    }

    // Get unique game dates (EST timezone) - these are the "days with picks"
    const gameDates = [...new Set(picks.map(p => {
      const gameTime = new Date(p.game_time)
      // Convert to EST (UTC-5)
      const estDate = new Date(gameTime.getTime() - (5 * 60 * 60 * 1000))
      return estDate.toISOString().split('T')[0]
    }))].sort((a, b) => b.localeCompare(a)) // Most recent first

    // Get the last X days with recapped picks
    const recentDates = gameDates.slice(0, days)

    console.log('[Analyst Picks Analytics] Recent dates:', recentDates)

    // Filter picks to only include recent dates
    const recentPicks = picks.filter(p => {
      const gameTime = new Date(p.game_time)
      const estDate = new Date(gameTime.getTime() - (5 * 60 * 60 * 1000))
      const dateStr = estDate.toISOString().split('T')[0]
      return recentDates.includes(dateStr)
    })

    // Calculate collective stats
    const collectiveStats = calculateStats(recentPicks, recentDates)

    // Calculate per-bettor stats
    const bettorStats: Record<string, any> = {}
    bettors.forEach(bettor => {
      const bettorPicks = recentPicks.filter(p => p.bettor_id === bettor.id)
      if (bettorPicks.length > 0) {
        bettorStats[bettor.id] = calculateStats(bettorPicks, recentDates)
      }
    })

    return NextResponse.json({
      success: true,
      bettors,
      collective: collectiveStats,
      bettorStats,
      recentDates
    })
  } catch (error) {
    console.error('[Analyst Picks Analytics] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function calculateStats(picks: any[], dates: string[]) {
  // Overall stats
  const wins = picks.filter(p => p.result === 'won').length
  const losses = picks.filter(p => p.result === 'lost').length
  const total = wins + losses
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
  
  const unitsRisked = picks.reduce((sum, p) => sum + parseFloat(p.units || 0), 0)
  const unitsWon = picks.reduce((sum, p) => sum + parseFloat(p.units_result || 0), 0)
  const roi = unitsRisked > 0 ? ((unitsWon / unitsRisked) * 100).toFixed(1) : '0.0'

  // Day-by-day breakdown
  const dayStats = dates.map(date => {
    const dayPicks = picks.filter(p => {
      const gameTime = new Date(p.game_time)
      const estDate = new Date(gameTime.getTime() - (5 * 60 * 60 * 1000))
      return estDate.toISOString().split('T')[0] === date
    })

    const dayWins = dayPicks.filter(p => p.result === 'won').length
    const dayLosses = dayPicks.filter(p => p.result === 'lost').length
    const dayTotal = dayWins + dayLosses
    const dayWinRate = dayTotal > 0 ? ((dayWins / dayTotal) * 100).toFixed(1) : '0.0'
    
    const dayUnitsRisked = dayPicks.reduce((sum, p) => sum + parseFloat(p.units || 0), 0)
    const dayUnitsWon = dayPicks.reduce((sum, p) => sum + parseFloat(p.units_result || 0), 0)
    const dayRoi = dayUnitsRisked > 0 ? ((dayUnitsWon / dayUnitsRisked) * 100).toFixed(1) : '0.0'

    return {
      date,
      wins: dayWins,
      losses: dayLosses,
      winRate: dayWinRate,
      roi: dayRoi,
      unitsWon: dayUnitsWon.toFixed(2),
      unitsRisked: dayUnitsRisked.toFixed(2)
    }
  })

  return {
    overall: {
      wins,
      losses,
      winRate,
      roi,
      unitsWon: unitsWon.toFixed(2),
      unitsRisked: unitsRisked.toFixed(2)
    },
    days: dayStats
  }
}

export const dynamic = 'force-dynamic'

