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

const SPORT: League = 'nba'

function getDateRangeForSport() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 2) // NBA games are frequent

  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0]
  }
}

async function loadScriptMeta(gameIds: string[]) {
  const meta = new Map<string, { strength_label: string | null; strength_value: number | null; credits_required: number | null; generated_at: string | null }>()
  if (gameIds.length === 0) return meta

  const { data, error} = await primarySupabase
    .from('game_scripts')
    .select('game_id, sport, generated_at')
    .in('game_id', gameIds)
    .eq('sport', SPORT.toUpperCase())
    .order('generated_at', { ascending: false })

  if (error) {
    console.error('[NBA snapshot-refresh] Failed to load script meta', error)
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

async function loadPickMeta(gameIds: string[]) {
  const meta = new Map<string, { pending_count: number }>()
  if (gameIds.length === 0) return meta

  const { data, error } = await primarySupabase
    .from('picks')
    .select('game_id')
    .in('game_id', gameIds)
    .eq('sport', SPORT.toUpperCase())
    .eq('result', 'pending')

  if (error) {
    console.error('[NBA snapshot-refresh] Failed to load pick meta', error)
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
 * GET /api/cron/refresh-nba-snapshots
 * Automated cron job to refresh NBA game snapshots
 * Runs every 30 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('\n🏀 ========== NBA SNAPSHOTS REFRESH START ==========')
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`)

    const { from, to } = getDateRangeForSport()
    console.log(`📅 Date range: ${from} to ${to}`)

    // Fetch games from Trendline API
    const games = await fetchGames(SPORT, from, to)
    console.log(`📊 Found ${games.length} NBA games`)

    if (games.length === 0) {
      console.log(`⏭️  No NBA games to process`)
      return NextResponse.json({
        success: true,
        sport: 'NBA',
        count: 0,
        timestamp: new Date().toISOString()
      })
    }

    const gameIds = games.map((g: any) => g.game_id)

    // Load metadata in parallel
    const [scriptMeta, pickMeta] = await Promise.all([
      loadScriptMeta(gameIds),
      loadPickMeta(gameIds)
    ])

    // Build payloads for all games
    const payloads = await Promise.all(
      games.map(async (game) => {
        const schedule = mapScheduleFromTrendline(game, SPORT.toUpperCase())

        // Fetch enriched data for each game
        const [publicMoney, refereeStats, playerProps, gameDetails] = await Promise.all([
          fetchPublicMoney(SPORT, game.game_id).catch(err => {
            console.error(`❌ Failed to fetch public money for ${game.game_id}:`, err.message)
            return null
          }),
          fetchRefereeStats(SPORT, game.game_id).catch(err => {
            console.error(`❌ Failed to fetch referee stats for ${game.game_id}:`, err.message)
            return null
          }),
          fetchPlayerProps(SPORT, game.game_id).catch(err => {
            console.error(`❌ Failed to fetch player props for ${game.game_id}:`, err.message)
            return null
          }),
          fetchGameDetails(SPORT, game.game_id).catch(err => {
            console.error(`❌ Failed to fetch game details for ${game.game_id}:`, err.message)
            return null
          })
        ])

        console.log(`📊 Game ${game.game_id} data: PublicMoney=${!!publicMoney}, Referee=${!!refereeStats}, Props=${!!playerProps}, Details=${!!gameDetails}`)

        // Extract team stats (includes 3-year betting data)
        const teamStats = gameDetails ? {
          h2h_3year: gameDetails.h2h_3year || (gameDetails.h2h ? {
            competitors: gameDetails.h2h.competitors || null
          } : null),
          season_avg: gameDetails.season_avg || null,
          team_form: gameDetails.team_form || null
        } : null

        // Calculate script strength dynamically based on available data
        const hasProps = Array.isArray(playerProps) && playerProps.length > 0
        const hasPicks = (pickMeta.get(game.game_id)?.pending_count || 0) > 0
        
        let strengthLabel: string | null = null
        let strengthValue: number | null = null
        let creditsRequired: number | null = null
        
        const scriptMetaForGame = scriptMeta.get(game.game_id)
        if (scriptMetaForGame) {
          if (!hasProps && !hasPicks) {
            strengthLabel = 'Minimal'
            strengthValue = 1
            creditsRequired = 1
          } else if (hasProps && !hasPicks) {
            strengthLabel = 'Above Avg'
            strengthValue = 2
            creditsRequired = 2
          } else {
            strengthLabel = 'Strong'
            strengthValue = 3
            creditsRequired = 3
          }
        }

        const finalScriptMeta = scriptMetaForGame
          ? {
              exists: true,
              generated_at: scriptMetaForGame.generated_at,
              strength_label: strengthLabel,
              strength_value: strengthValue,
              credits_required: creditsRequired
            }
          : null

        // Extract odds from Trendline API structure
        const spread = game.odds?.spread !== undefined && game.odds.spread !== null
          ? {
              home: game.odds.spread,
              away: -game.odds.spread,
              home_odds: game.odds.home_team_odds?.spread_odds ?? null,
              away_odds: game.odds.away_team_odds?.spread_odds ?? null
            }
          : null

        const totals = game.odds?.over_under
          ? {
              over: game.odds.over_under,
              under: game.odds.over_under
            }
          : null

        const moneyline = game.odds
          ? {
              home: game.odds.home_team_odds?.moneyline ?? null,
              away: game.odds.away_team_odds?.moneyline ?? null
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

    console.log(`📝 Upserting ${payloads.length} NBA game snapshots to game_snapshots...`)

    // Upsert to game_snapshots table
    const { error } = await snapshotsClient
      .from('game_snapshots')
      .upsert(payloads, { onConflict: 'sport,game_id' })

    if (error) {
      console.error(`❌ Failed to upsert NBA snapshots:`, error)
      return NextResponse.json(
        { error: error.message, sport: 'NBA' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully refreshed ${payloads.length} NBA game snapshots`)
    console.log('🏀 ========== NBA SNAPSHOTS REFRESH COMPLETE ==========\n')

    return NextResponse.json({
      success: true,
      sport: 'NBA',
      count: payloads.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Unexpected error in NBA cron job:', error)
    return NextResponse.json(
      { error: error.message || 'Unexpected error', sport: 'NBA' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

