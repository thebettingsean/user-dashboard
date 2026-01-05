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
 * - awayTeam: Optional. Away team name for team-based matching
 * - homeTeam: Optional. Home team name for team-based matching
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId')
  const sport = searchParams.get('sport')?.toLowerCase()
  const awayTeam = searchParams.get('awayTeam')
  const homeTeam = searchParams.get('homeTeam')
  
  try {
    // Get current time in EST
    const now = new Date()
    const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    
    // Count game-specific picks (if gameId or teams provided)
    let gamePickCount = 0
    if (gameId || (awayTeam && homeTeam && sport)) {
      // First try by game_id
      if (gameId) {
        const { count, error } = await supabase
          .from('picks')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId)
          .gte('game_time', estNow.toISOString())
        
        if (!error && count && count > 0) {
          gamePickCount = count
        }
      }
      
      // If no picks found by gameId, try matching by team names
      if (gamePickCount === 0 && awayTeam && homeTeam && sport) {
        const sportCodes = SPORT_MAP[sport] || [sport.toUpperCase()]
        
        // Fetch all picks for the sport
        const { data: sportPicks, error } = await supabase
          .from('picks')
          .select('*')
          .in('sport', sportCodes)
          .gte('game_time', estNow.toISOString())
        
        if (!error && sportPicks) {
          // Extract team mascots (last word) for better matching
          // "Arizona Cardinals" -> "cardinals", "Los Angeles Rams" -> "rams"
          const awayWords = awayTeam.toLowerCase().trim().split(/\s+/)
          const homeWords = homeTeam.toLowerCase().trim().split(/\s+/)
          const awayMascot = awayWords[awayWords.length - 1]
          const homeMascot = homeWords[homeWords.length - 1]
          
          console.log(`[Active Counts] Matching teams: ${awayTeam} (${awayMascot}) @ ${homeTeam} (${homeMascot})`)
          
          const matchingPicks = sportPicks.filter(pick => {
            if (!pick.game_title) return false
            const titleLower = pick.game_title.toLowerCase()
            
            // Try multiple matching strategies:
            // 1. Full team names
            if (titleLower.includes(awayTeam.toLowerCase()) && titleLower.includes(homeTeam.toLowerCase())) {
              return true
            }
            
            // 2. Team mascots (most common format in picks: "Cardinals @ Rams")
            if (titleLower.includes(awayMascot) && titleLower.includes(homeMascot)) {
              return true
            }
            
            return false
          })
          
          gamePickCount = matchingPicks.length
          if (gamePickCount > 0) {
            console.log(`[Active Counts] Found ${gamePickCount} picks for ${awayTeam} @ ${homeTeam}`)
          }
        }
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

