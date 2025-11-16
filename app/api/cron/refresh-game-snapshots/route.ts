import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchGames,
  fetchPublicMoney,
  fetchRefereeStats,
  fetchPlayerProps,
  fetchGameDetails,
  type League
} from '@/lib/api/sportsData'
import { mapScheduleFromTrendline } from '@/lib/snapshots/normalize'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const SNAPSHOTS_SUPABASE_URL = process.env.SNAPSHOTS_SUPABASE_URL || 'https://knccqavkxvezhdfoktay.supabase.co'
const SNAPSHOTS_SUPABASE_SERVICE_KEY =
  process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M'

const primarySupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const snapshotsClient = createClient(SNAPSHOTS_SUPABASE_URL, SNAPSHOTS_SUPABASE_SERVICE_KEY)

const SUPPORTED_SPORTS = ['nfl', 'nba'] as const

function getDateRangeForSport(sport: League) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  if (sport === 'nfl') {
    end.setDate(end.getDate() + 7)
  } else {
    end.setDate(end.getDate() + 2)
  }

  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0]
  }
}

async function loadScriptMeta(gameIds: string[], sport: League) {
  const meta = new Map<string, { strength_label: string | null; strength_value: number | null; credits_required: number | null; generated_at: string | null }>()

  if (gameIds.length === 0) return meta

  const { data, error} = await primarySupabase
    .from('game_scripts')
    .select('game_id, sport, generated_at')
    .in('game_id', gameIds)
    .eq('sport', sport.toUpperCase())
    .order('generated_at', { ascending: false })

  if (error) {
    console.error('[snapshot-refresh] Failed to load script meta', error)
    return meta
  }

  for (const row of data || []) {
    if (meta.has(row.game_id)) continue

    meta.set(row.game_id, {
      strength_label: null,
      strength_value: null,
      credits_required: null,
      generated_at: row.generated_at ?? null
    })
  }

  return meta
}

async function loadPickMeta(gameIds: string[], sport: League) {
  const meta = new Map<string, { pending_count: number }>()

  if (gameIds.length === 0) return meta

  const { data, error } = await primarySupabase
    .from('picks')
    .select('game_id')
    .in('game_id', gameIds)
    .eq('sport', sport.toUpperCase())
    .eq('result', 'pending')

  if (error) {
    console.error('[snapshot-refresh] Failed to load pick meta', error)
    return meta
  }

  for (const row of data || []) {
    meta.set(row.game_id, {
      pending_count: (meta.get(row.game_id)?.pending_count || 0) + 1
    })
  }

  return meta
}

/**
 * POST /api/cron/refresh-game-snapshots
 * Automated cron job to refresh game snapshots for NFL and NBA
 * Runs every 6 hours to keep data fresh
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('\n🔄 ========== GAME SNAPSHOTS REFRESH CRON START ==========')
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`)

    const results = {
      nfl: { success: false, count: 0, error: null as string | null },
      nba: { success: false, count: 0, error: null as string | null }
    }

    // Refresh snapshots for both sports
    for (const sport of SUPPORTED_SPORTS) {
      try {
        console.log(`\n🏈 Refreshing ${sport.toUpperCase()} game snapshots...`)
        
        const { from, to } = getDateRangeForSport(sport)
        console.log(`📅 Date range: ${from} to ${to}`)

        // Fetch games from Trendline API
        const games = await fetchGames(sport, from, to)
        console.log(`📊 Found ${games.length} ${sport.toUpperCase()} games`)

        if (games.length === 0) {
          console.log(`⏭️  No ${sport.toUpperCase()} games to process`)
          results[sport].success = true
          results[sport].count = 0
          continue
        }

        const gameIds = games.map((g: any) => g.game_id)

        // Load metadata in parallel
        const [scriptMeta, pickMeta] = await Promise.all([
          loadScriptMeta(gameIds, sport),
          loadPickMeta(gameIds, sport)
        ])

        // Build payloads for all games
        const payloads = await Promise.all(
          games.map(async (game) => {
            const schedule = mapScheduleFromTrendline(game, sport.toUpperCase())

            // Fetch enriched data for each game
            const [publicMoney, refereeStats, playerProps, gameDetails] = await Promise.all([
              fetchPublicMoney(sport, game.game_id).catch(err => {
                console.error(`❌ Failed to fetch public money for ${game.game_id}:`, err.message)
                return null
              }),
              fetchRefereeStats(sport, game.game_id).catch(err => {
                console.error(`❌ Failed to fetch referee stats for ${game.game_id}:`, err.message)
                return null
              }),
              fetchPlayerProps(sport, game.game_id).catch(err => {
                console.error(`❌ Failed to fetch player props for ${game.game_id}:`, err.message)
                return null
              }),
              fetchGameDetails(sport, game.game_id).catch(err => {
                console.error(`❌ Failed to fetch game details for ${game.game_id}:`, err.message)
                return null
              })
            ])

            // Log what data we successfully fetched for this game
            console.log(`📊 Game ${game.game_id} data: PublicMoney=${!!publicMoney}, Referee=${!!refereeStats}, Props=${!!playerProps}, Details=${!!gameDetails}`)

            // Extract team stats (includes 3-year betting data)
            const teamStats = gameDetails?.trends ? {
              home: gameDetails.trends.home_team_trends || null,
              away: gameDetails.trends.away_team_trends || null
            } : null

            // Get script meta if exists
            const scriptMetaForGame = scriptMeta.get(game.game_id)
            const finalScriptMeta = scriptMetaForGame
              ? {
                  exists: true,
                  generated_at: scriptMetaForGame.generated_at,
                  strength_label: scriptMetaForGame.strength_label,
                  strength_value: scriptMetaForGame.strength_value,
                  credits_required: scriptMetaForGame.credits_required
                }
              : null

            // Extract odds
            const spread = game.odds
              ? {
                  home: (game.odds.home_team_odds as any)?.spread ?? null,
                  away: (game.odds.away_team_odds as any)?.spread ?? null
                }
              : null

            const totals = game.odds
              ? {
                  over: (game.odds.home_team_odds as any)?.total ?? (game.odds.away_team_odds as any)?.total ?? null,
                  under: (game.odds.home_team_odds as any)?.total ?? (game.odds.away_team_odds as any)?.total ?? null
                }
              : null

            const moneyline = game.odds
              ? {
                  home: (game.odds.home_team_odds as any)?.moneyline ?? null,
                  away: (game.odds.away_team_odds as any)?.moneyline ?? null
                }
              : null

            return {
              game_id: schedule.gameId,
              sport: schedule.sport,
              season: (game as any).season ?? null,
              week: (game as any).week ?? null,
              status: schedule.status,
              start_time_utc: schedule.startTimeUtc,
              start_time_label: schedule.startTimeLabel,
              home_team: schedule.homeTeam,
              away_team: schedule.awayTeam,
              venue: schedule.venue ?? null,
              spread,
              moneyline,
              totals,
              public_money: publicMoney,
              referee: refereeStats,
              team_stats: teamStats,
              props: playerProps && playerProps.length > 0 ? playerProps : null,
              script_meta: finalScriptMeta,
              picks_meta: pickMeta.get(game.game_id) ?? { pending_count: 0 },
              raw_payload: game,
              updated_at: new Date().toISOString()
            }
          })
        )

        console.log(`📝 Upserting ${payloads.length} ${sport.toUpperCase()} game snapshots...`)

        // Upsert to game_snapshots table
        const { error } = await snapshotsClient
          .from('game_snapshots')
          .upsert(payloads, { onConflict: 'sport,game_id' })

        if (error) {
          console.error(`❌ Failed to upsert ${sport.toUpperCase()} snapshots:`, error)
          results[sport].success = false
          results[sport].error = error.message
        } else {
          console.log(`✅ Successfully refreshed ${payloads.length} ${sport.toUpperCase()} game snapshots`)
          results[sport].success = true
          results[sport].count = payloads.length
        }

      } catch (error: any) {
        console.error(`❌ Error refreshing ${sport.toUpperCase()} snapshots:`, error)
        results[sport].success = false
        results[sport].error = error.message || 'Unknown error'
      }
    }

    console.log('\n✅ ========== GAME SNAPSHOTS REFRESH CRON COMPLETE ==========')
    console.log('Results:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error: any) {
    console.error('❌ Unexpected error in cron job:', error)
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}

