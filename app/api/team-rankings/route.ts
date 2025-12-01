import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.SNAPSHOTS_SUPABASE_URL || 'https://knccqavkxvezhdfoktay.supabase.co'
  const supabaseServiceKey = process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M'
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * GET /api/team-rankings?gameId=NFL-20241229-NYG-NE-401671802
 * Fetches team rankings data for a specific game
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json(
        { error: 'gameId is required' },
        { status: 400 }
      )
    }

    console.log(`[Team Rankings] Fetching for gameId: ${gameId}`)

    // Determine sport from gameId
    const sport = gameId.split('-')[0].toUpperCase()
    const tableName = sport === 'CFB' ? 'college_game_snapshots' : 'game_snapshots'

    const supabase = getSupabaseClient()
    
    console.log(`[Team Rankings] Querying table: ${tableName}`)
    console.log(`[Team Rankings] Looking for gameId: ${gameId}`)
    
    const { data, error } = await supabase
      .from(tableName)
      .select('game_id, home_team, away_team, team_rankings, start_time_utc')
      .eq('game_id', gameId)
      .single()

    if (error) {
      console.error('[Team Rankings] Supabase error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch team rankings',
          details: error.message,
          table: tableName,
          gameId 
        },
        { status: 500 }
      )
    }

    if (!data) {
      console.log('[Team Rankings] No data found for gameId:', gameId)
      return NextResponse.json(
        { 
          error: 'Game not found',
          gameId,
          table: tableName
        },
        { status: 404 }
      )
    }

    if (!data.team_rankings) {
      console.log('[Team Rankings] Game found but no team_rankings data yet')
      return NextResponse.json(
        {
          error: 'Team rankings not available yet for this game',
          gameId: data.game_id,
          homeTeam: data.home_team,
          awayTeam: data.away_team,
          hasData: false
        },
        { status: 404 }
      )
    }

    console.log(`[Team Rankings] Found data for ${gameId}`)

    return NextResponse.json({
      gameId: data.game_id,
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      gameTime: data.start_time_utc,
      teamRankings: data.team_rankings,
      hasData: !!data.team_rankings
    })

  } catch (error: any) {
    console.error('[Team Rankings] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

