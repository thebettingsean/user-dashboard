import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = 'https://api.trendlinelabs.ai'
const API_KEY = process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'

/**
 * Quick data strength calculation without fetching full data
 * GET /api/game-intelligence/strength?gameId=xxx&league=nfl
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get('gameId')
    const league = searchParams.get('league')?.toLowerCase()

    if (!gameId || !league) {
      return NextResponse.json({ strength: 1 }, { status: 200 }) // Default to minimal
    }

    // Count individual data sources (not weighted)
    let otherDataCount = 0
    
    // Quick check for public money
    try {
      const pmRes = await fetch(`${API_BASE_URL}/api/${league}/games/${gameId}/public-money`, {
        headers: { 'insider-api-key': API_KEY },
        next: { revalidate: 3600 }
      })
      if (pmRes.ok) otherDataCount++
    } catch {}

    // Quick check for referee stats
    try {
      const refRes = await fetch(`${API_BASE_URL}/api/${league}/games/${gameId}/referee-stats`, {
        headers: { 'insider-api-key': API_KEY },
        next: { revalidate: 3600 }
      })
      if (refRes.ok) otherDataCount++
    } catch {}

    // Quick check for team stats (h2h data)
    try {
      const teamRes = await fetch(`${API_BASE_URL}/api/${league}/games/${gameId}`, {
        headers: { 'insider-api-key': API_KEY },
        next: { revalidate: 3600 }
      })
      if (teamRes.ok) {
        const data = await teamRes.json()
        if (data.h2h) otherDataCount++
      }
    } catch {}

    // Quick check for player props
    try {
      const propsRes = await fetch(`${API_BASE_URL}/api/${league}/games/${gameId}/player-props`, {
        headers: { 'insider-api-key': API_KEY },
        next: { revalidate: 3600 }
      })
      if (propsRes.ok) {
        const props = await propsRes.json()
        if (props && props.length > 0) otherDataCount++
      }
    } catch {}

    // Assume TeamRankings is always available for NFL/NBA/CFB
    const hasTeamRankings = ['nfl', 'nba', 'cfb'].includes(league)
    
    // Check for analyst picks tied to this game
    let hasAnalystPicks = false
    try {
      const supabaseUrl = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
      const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMzAwMDAsImV4cCI6MjA2MTgwNjAwMH0.gIsjMoK0-ItRhE8F8Fbupwd-U3D0WInwFjdTt9_Ztr0'
      
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/picks?game_id=eq.${gameId}&is_active=eq.true&select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      )
      if (checkRes.ok) {
        const picks = await checkRes.json()
        hasAnalystPicks = picks && picks.length > 0
      }
    } catch {
      // Silent fail - just assume no picks
    }

    // Calculate strength based on user's requirements:
    // - Team Rankings + 0-2 other things = Minimal
    // - Team Rankings + 3+ other things = Good
    // - Team Rankings + 3+ other things + analyst picks = Strong
    // - Team Rankings + 0-2 other things + analyst picks = Good
    let strength: 1 | 2 | 3
    
    if (hasTeamRankings && otherDataCount >= 3 && hasAnalystPicks) {
      strength = 3 // Strong
    } else if (hasTeamRankings && otherDataCount >= 3) {
      strength = 2 // Good (Above Avg)
    } else if (hasTeamRankings && otherDataCount <= 2 && hasAnalystPicks) {
      strength = 2 // Good (Above Avg)
    } else if (hasTeamRankings && otherDataCount <= 2) {
      strength = 1 // Minimal
    } else {
      strength = 1 // Minimal (no team rankings)
    }

    return NextResponse.json({ strength })
  } catch (error) {
    console.error('Error calculating data strength:', error)
    return NextResponse.json({ strength: 1 }, { status: 200 }) // Default to minimal on error
  }
}

export const dynamic = 'force-dynamic'

