import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Map frontend sport names to picks table sport codes
const SPORT_MAP: Record<string, string[]> = {
  'nfl': ['NFL'],
  'nba': ['NBA'],
  'nhl': ['NHL'],
  'mlb': ['MLB'],
  'cfb': ['NCAAF', 'CFB'],
  'ncaaf': ['NCAAF', 'CFB'],
  'cbb': ['NCAAB', 'CBB'],
  'ncaab': ['NCAAB', 'CBB'],
}

/**
 * GET /api/picks/active-counts
 * Returns counts of active picks for a game, sport, and all sports
 * 
 * Query params:
 * - gameId: Optional. The game ID to check for game-specific picks
 * - sport: Optional. The sport to check for sport-specific picks
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId')
  const sport = searchParams.get('sport')?.toLowerCase()
  
  try {
    // Get current time in EST
    const now = new Date()
    const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    
    // Count game-specific picks (if gameId provided)
    let gamePickCount = 0
    if (gameId) {
      const { count, error } = await supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId)
        .gte('game_time', estNow.toISOString())
      
      if (error) {
        console.error('[Active Counts] Error counting game picks:', error)
      } else {
        gamePickCount = count || 0
      }
    }
    
    // Count sport-specific picks (if sport provided)
    let sportPickCount = 0
    if (sport) {
      const sportCodes = SPORT_MAP[sport] || [sport.toUpperCase()]
      
      const { count, error } = await supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .in('sport', sportCodes)
        .gte('game_time', estNow.toISOString())
      
      if (error) {
        console.error('[Active Counts] Error counting sport picks:', error)
      } else {
        sportPickCount = count || 0
      }
    }
    
    // Count all active picks across all sports
    const { count: allPicksCount, error: allError } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })
      .gte('game_time', estNow.toISOString())
    
    if (allError) {
      console.error('[Active Counts] Error counting all picks:', error)
    }
    
    return NextResponse.json({
      success: true,
      gamePickCount,
      sportPickCount,
      allPicksCount: allPicksCount || 0,
      sport: sport || null,
      gameId: gameId || null,
    })
    
  } catch (error: any) {
    console.error('[Active Counts] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        gamePickCount: 0,
        sportPickCount: 0,
        allPicksCount: 0,
      },
      { status: 500 }
    )
  }
}

