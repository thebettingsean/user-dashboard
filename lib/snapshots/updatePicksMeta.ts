import { createClient } from '@supabase/supabase-js'

const SNAPSHOTS_URL = process.env.NEXT_PUBLIC_SNAPSHOTS_URL || 'https://knccqavkxvezhdfoktay.supabase.co'
const SNAPSHOTS_KEY =
  process.env.NEXT_PUBLIC_SNAPSHOTS_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M'

const snapshotsClient = createClient(SNAPSHOTS_URL, SNAPSHOTS_KEY)

const MAIN_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const MAIN_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const mainClient = createClient(MAIN_URL, MAIN_KEY)

/**
 * Updates the picks_meta in game_snapshots for a specific game
 * Call this after inserting/updating/deleting picks
 */
export async function updatePicksMetaForGame(gameId: string, sport: string) {
  try {
    console.log(`🔄 Updating picks_meta for ${gameId}...`)

    // Count pending picks for this game_id
    const { data, error } = await mainClient
      .from('picks')
      .select('id', { count: 'exact' })
      .eq('game_id', gameId)
      .eq('sport', sport.toUpperCase())
      .eq('result', 'pending')

    if (error) {
      console.error('❌ Error counting picks:', error)
      return
    }

    const pendingCount = data?.length || 0
    console.log(`📊 Found ${pendingCount} pending picks for ${gameId}`)

    // Update the game_snapshots picks_meta
    const { error: updateError } = await snapshotsClient
      .from('game_snapshots')
      .update({
        picks_meta: { pending_count: pendingCount },
        updated_at: new Date().toISOString()
      })
      .eq('game_id', gameId)
      .eq('sport', sport.toUpperCase())

    if (updateError) {
      console.error('❌ Error updating game_snapshots picks_meta:', updateError)
      return
    }

    console.log(`✅ Successfully updated picks_meta for ${gameId}: ${pendingCount} pending picks`)
  } catch (error) {
    console.error('❌ Unexpected error updating picks_meta:', error)
  }
}

/**
 * Updates picks_meta for multiple games at once
 */
export async function updatePicksMetaForGames(gameIds: string[], sport: string) {
  await Promise.all(gameIds.map((gameId) => updatePicksMetaForGame(gameId, sport)))
}

