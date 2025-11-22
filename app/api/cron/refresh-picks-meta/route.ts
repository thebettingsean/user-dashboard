import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET

const MAIN_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const MAIN_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const mainClient = createClient(MAIN_URL, MAIN_KEY)

const SNAPSHOTS_URL = process.env.SNAPSHOTS_SUPABASE_URL || 'https://knccqavkxvezhdfoktay.supabase.co'
const SNAPSHOTS_KEY =
  process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M'

const snapshotsClient = createClient(SNAPSHOTS_URL, SNAPSHOTS_KEY)

/**
 * Manual cron to refresh picks_meta for all games with pending picks
 * Useful for fixing data inconsistencies
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting picks_meta refresh...')

    // Get all distinct game_ids and sports from pending picks
    const { data: picks, error: picksError } = await mainClient
      .from('picks')
      .select('game_id, sport')
      .eq('result', 'pending')
      .not('game_id', 'is', null)

    if (picksError) {
      console.error('❌ Error fetching picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    console.log(`📊 Found ${picks?.length || 0} pending picks`)

    // Group by game_id + sport
    const gameMap = new Map<string, { gameId: string; sport: string; count: number }>()
    for (const pick of picks || []) {
      if (!pick.game_id) continue
      const key = `${pick.game_id}-${pick.sport}`
      const existing = gameMap.get(key)
      if (existing) {
        existing.count++
      } else {
        gameMap.set(key, { gameId: pick.game_id, sport: pick.sport, count: 1 })
      }
    }

    console.log(`🎯 Updating picks_meta for ${gameMap.size} games...`)

    let updated = 0
    let failed = 0

    for (const [key, { gameId, sport, count }] of gameMap.entries()) {
      try {
        // Determine the correct table and sport values
        const sportLower = sport.toLowerCase()
        const isCollegeFootball = sportLower === 'cfb' || sportLower === 'ncaaf'
        const snapshotsTable = isCollegeFootball ? 'college_game_snapshots' : 'game_snapshots'
        const snapshotsSport = isCollegeFootball ? 'CFB' : sport.toUpperCase()

        const { error: updateError } = await snapshotsClient
          .from(snapshotsTable)
          .update({
            picks_meta: { pending_count: count },
            updated_at: new Date().toISOString()
          })
          .eq('game_id', gameId)
          .eq('sport', snapshotsSport)

        if (updateError) {
          console.error(`❌ Failed to update ${gameId} (${sport}):`, updateError)
          failed++
        } else {
          console.log(`✅ Updated ${gameId} (${sport}): ${count} picks`)
          updated++
        }
      } catch (error) {
        console.error(`❌ Error updating ${gameId}:`, error)
        failed++
      }
    }

    console.log(`✅ Picks meta refresh complete: ${updated} updated, ${failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} games, ${failed} failed`,
      totalGames: gameMap.size
    })
  } catch (error: any) {
    console.error('❌ Error in refresh-picks-meta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

