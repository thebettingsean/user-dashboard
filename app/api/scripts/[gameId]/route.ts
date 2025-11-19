import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const searchParams = request.nextUrl.searchParams
    let sportParam = (searchParams.get('sport') || 'nfl').toLowerCase()
    
    // Map URL slugs to database sport codes
    if (sportParam === 'college-football') {
      sportParam = 'cfb'
    }
    
    const sport = sportParam.toUpperCase()

    console.log(`📜 Fetching script for gameId=${gameId}, sport=${sport}`)

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
    }

    // Fetch the script from the game_scripts table
    const { data, error } = await supabase
      .from('game_scripts')
      .select('game_id, sport, script_content, data_strength, generated_at')
      .eq('game_id', gameId)
      .eq('sport', sport)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
    
    console.log(`📜 Script query result:`, { 
      found: !!data, 
      error: error?.message,
      gameId,
      sport 
    })

    if (error) {
      console.error('Error fetching script:', error)
      return NextResponse.json(
        { error: 'Script not found', script: 'No script available for this game yet.' },
        { status: 404 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Script not found', script: 'No script available for this game yet.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      script: data.script_content || 'Script content not available',
      strength: data.data_strength,
      generatedAt: data.generated_at
    })
  } catch (error) {
    console.error('Unexpected error fetching script:', error)
    return NextResponse.json(
      { error: 'Internal server error', script: 'Unable to load script. Please try again.' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

