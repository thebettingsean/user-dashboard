import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

type League = 'nfl' | 'nba'

type SnapshotPayload = {
  game_id: string
  sport: string
  season: number | null
  week: number | null
  status: string | null
  start_time_utc: string
  start_time_label: string
  home_team: string
  away_team: string
  venue: string | null
  spread: Record<string, unknown> | null
  moneyline: Record<string, unknown> | null
  totals: Record<string, unknown> | null
  public_money: Record<string, unknown> | null
  referee: Record<string, unknown> | null
  team_stats: Record<string, unknown> | null
  props: unknown
  script_meta: Record<string, unknown> | null
  picks_meta: Record<string, unknown>
  raw_payload: unknown
  updated_at: string
}

const SUPPORTED_SPORTS: League[] = ['nfl', 'nba']

const FETCH_TIMEOUT_MS = Number(Deno.env.get('TRENDLINE_TIMEOUT_MS') ?? '30000')
const FETCH_RETRIES = Number(Deno.env.get('TRENDLINE_RETRIES') ?? '2')

const API_BASE_URL = Deno.env.get('INSIDER_API_URL') ?? 'https://api.trendlinelabs.ai'
const API_KEY = Deno.env.get('INSIDER_API_KEY') ?? ''

const PRIMARY_SUPABASE_URL = Deno.env.get('PRIMARY_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')
const PRIMARY_SUPABASE_SERVICE_KEY =
  Deno.env.get('PRIMARY_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const SNAPSHOT_SUPABASE_URL = Deno.env.get('SNAPSHOTS_SUPABASE_URL') ?? PRIMARY_SUPABASE_URL
const SNAPSHOT_SUPABASE_SERVICE_KEY =
  Deno.env.get('SNAPSHOTS_SUPABASE_SERVICE_KEY') ?? PRIMARY_SUPABASE_SERVICE_KEY

if (!PRIMARY_SUPABASE_URL || !PRIMARY_SUPABASE_SERVICE_KEY) {
  console.warn('[refresh-game-snapshots] Missing primary Supabase credentials')
}

if (!SNAPSHOT_SUPABASE_URL || !SNAPSHOT_SUPABASE_SERVICE_KEY) {
  console.warn('[refresh-game-snapshots] Missing snapshot Supabase credentials')
}

const primaryClient = PRIMARY_SUPABASE_URL && PRIMARY_SUPABASE_SERVICE_KEY
  ? createClient(PRIMARY_SUPABASE_URL, PRIMARY_SUPABASE_SERVICE_KEY)
  : null

const snapshotClient = SNAPSHOT_SUPABASE_URL && SNAPSHOT_SUPABASE_SERVICE_KEY
  ? createClient(SNAPSHOT_SUPABASE_URL, SNAPSHOT_SUPABASE_SERVICE_KEY)
  : null

if (!API_KEY) {
  console.warn('[refresh-game-snapshots] Missing INSIDER_API_KEY – Trendline calls will likely fail')
}

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

function getTimezoneOffsetInMinutes(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = f.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0')
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (asUtc - date.getTime()) / 60000
}

function toUtcFromTrendline(gameDate: string): string {
  if (!gameDate) return new Date().toISOString()
  const sanitized = gameDate.replace('Z', '')
  const [datePart, timePartWithMs = '00:00:00'] = sanitized.split('T')
  const [timePart] = timePartWithMs.split('.')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number)

  const estInstant = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const offsetMinutes = getTimezoneOffsetInMinutes(estInstant, 'America/New_York')
  const utcMillis = estInstant.getTime() - offsetMinutes * 60_000
  return new Date(utcMillis).toISOString()
}

function normalizeTrendlineDate(gameDate: string) {
  const utc = toUtcFromTrendline(gameDate)
  const kickoff = new Date(utc)

  const estFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })

  return {
    utc,
    label: `${estFormatter.format(kickoff)} ET`
  }
}

function getTeamNickname(name: string) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  return parts[parts.length - 1] || name
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchGames(sport: League, from: string, to: string) {
  const url = `${API_BASE_URL}/api/${sport}/games?from=${from}&to=${to}`
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      console.log(`[games] Fetching (${attempt}/${FETCH_RETRIES}): ${url}`)
      const response = await fetchWithTimeout(url, {
        headers: { 'insider-api-key': API_KEY },
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error(`[games] HTTP ${response.status}`)
        if (attempt === FETCH_RETRIES) {
          return []
        }
        continue
      }

      const data = await response.json()
      return data.games ?? []
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.error(`[games] Timeout for ${sport} (attempt ${attempt})`)
      } else {
        console.error(`[games] Error for ${sport} (attempt ${attempt})`, error)
      }
      if (attempt === FETCH_RETRIES) {
        return []
      }
    }
  }

  return []
}

async function fetchPublicMoney(sport: League, gameId: string, game: any) {
  const url = `${API_BASE_URL}/api/${sport}/games/${gameId}/public-money`

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      console.log(`[public-money] Fetching ${gameId} (${attempt}/${FETCH_RETRIES})`)
      const response = await fetchWithTimeout(url, {
        headers: { 'insider-api-key': API_KEY },
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error(`[public-money] HTTP ${response.status} for ${gameId}`)
        if (attempt === FETCH_RETRIES) return null
        continue
      }

      const payload = await response.json()

      const sanitized: Record<string, unknown> = {
        public_money_ml_away_bets_pct: payload.public_money_ml_away_bets_pct,
        public_money_ml_away_stake_pct: payload.public_money_ml_away_stake_pct,
        public_money_ml_home_bets_pct: payload.public_money_ml_home_bets_pct,
        public_money_ml_home_stake_pct: payload.public_money_ml_home_stake_pct,
        public_money_spread_away_bets_pct: payload.public_money_spread_away_bets_pct,
        public_money_spread_away_stake_pct: payload.public_money_spread_away_stake_pct,
        public_money_spread_home_bets_pct: payload.public_money_spread_home_bets_pct,
        public_money_spread_home_stake_pct: payload.public_money_spread_home_stake_pct,
        public_money_over_bets_pct: payload.public_money_over_bets_pct,
        public_money_over_stake_pct: payload.public_money_over_stake_pct,
        public_money_under_bets_pct: payload.public_money_under_bets_pct,
        public_money_under_stake_pct: payload.public_money_under_stake_pct,
        sharp_money_stats: Array.isArray(payload.sharp_money_stats)
          ? payload.sharp_money_stats.slice(0, 5)
          : [],
        rlm_stats: Array.isArray(payload.rlm_stats) ? payload.rlm_stats.slice(0, 5) : []
      }

      if (Array.isArray(payload.pregame_odds) && payload.pregame_odds.length > 0) {
        sanitized.pregame_odds = payload.pregame_odds.slice(-3).map((entry: any) => ({
          bettingId: entry.bettingId,
          away_team_ml: entry.away_team_ml,
          home_team_ml: entry.home_team_ml,
          game_ou: entry.game_ou,
          game_over_odds: entry.game_over_odds,
          game_under_odds: entry.game_under_odds,
          home_team_point_spread: entry.home_team_point_spread,
          away_team_point_spread: entry.away_team_point_spread,
          public_money_ml_away_bets_pct: entry.public_money_ml_away_bets_pct,
          public_money_ml_home_bets_pct: entry.public_money_ml_home_bets_pct,
          public_money_spread_away_bets_pct: entry.public_money_spread_away_bets_pct,
          public_money_spread_home_bets_pct: entry.public_money_spread_home_bets_pct,
          public_money_over_bets_pct: entry.public_money_over_bets_pct,
          public_money_under_bets_pct: entry.public_money_under_bets_pct,
          updated_at: entry.updated_at
        }))
      }

      if (game?.odds) {
        sanitized.away_team_ml = game.odds.away_team_odds?.moneyline ?? null
        sanitized.home_team_ml = game.odds.home_team_odds?.moneyline ?? null
        sanitized.away_team_point_spread = game.odds.away_team_odds?.current_point_spread ?? null
        sanitized.home_team_point_spread = game.odds.home_team_odds?.current_point_spread ?? null
      }

      return sanitized
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.error(`[public-money] Timeout for ${gameId} (attempt ${attempt})`)
      } else {
        console.error(`[public-money] Error for ${gameId} (attempt ${attempt})`, error)
      }

      if (attempt === FETCH_RETRIES) {
        return null
      }
    }
  }

  return null
}

async function fetchGameDetails(sport: League, gameId: string) {
  const url = `${API_BASE_URL}/api/${sport}/games/${gameId}`

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      console.log(`[game-details] Fetching ${gameId} (${attempt}/${FETCH_RETRIES})`)
      const response = await fetchWithTimeout(url, {
        headers: { 'insider-api-key': API_KEY },
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error(`[game-details] HTTP ${response.status} for ${gameId}`)
        if (attempt === FETCH_RETRIES) return null
        continue
      }

      const details = await response.json()
      return {
        h2h_3year: details.h2h_3year ?? null
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.error(`[game-details] Timeout for ${gameId} (attempt ${attempt})`)
      } else {
        console.error(`[game-details] Error for ${gameId} (attempt ${attempt})`, error)
      }

      if (attempt === FETCH_RETRIES) {
        return null
      }
    }
  }

  return null
}

async function fetchRefereeStats(sport: League, gameId: string) {
  const url = `${API_BASE_URL}/api/${sport}/games/${gameId}/referee-stats`

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: { 'insider-api-key': API_KEY },
        cache: 'no-store'
      })

      if (!response.ok) {
        if (attempt === FETCH_RETRIES) return null
        continue
      }

      return await response.json()
    } catch (error) {
      if (attempt === FETCH_RETRIES) {
        return null
      }
    }
  }

  return null
}

async function fetchPlayerProps(sport: League, gameId: string) {
  const url = `${API_BASE_URL}/api/${sport}/games/${gameId}/player-props`

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'insider-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        if (attempt === FETCH_RETRIES) return []
        continue
      }

      const data = await response.json()
      if (!Array.isArray(data)) {
        return []
      }

      return data
    } catch (error) {
      if (attempt === FETCH_RETRIES) {
        return []
      }
    }
  }

  return []
}

async function loadScriptMeta(gameIds: string[], sport: League) {
  const result = new Map<string, Record<string, unknown>>()
  if (!primaryClient || gameIds.length === 0) return result

  const { data, error } = await primaryClient
    .from('game_scripts')
    .select('game_id, sport, data_strength, generated_at')
    .in('game_id', gameIds)
    .eq('sport', sport.toUpperCase())
    .order('generated_at', { ascending: false })

  if (error) {
    console.error('[script-meta] Failed to load', error)
    return result
  }

  for (const row of data ?? []) {
    if (result.has(row.game_id)) continue

    let strengthLabel: string | null = null
    switch (row.data_strength) {
      case 3:
        strengthLabel = 'Strong'
        break
      case 2:
        strengthLabel = 'Above Avg'
        break
      case 1:
        strengthLabel = 'Minimal'
        break
      default:
        strengthLabel = null
    }

    result.set(row.game_id, {
      strength_label: strengthLabel,
      strength_value: row.data_strength ?? null,
      credits_required: row.data_strength ?? null,
      generated_at: row.generated_at ?? null
    })
  }

  return result
}

async function loadPickMeta(gameIds: string[], sport: League) {
  const result = new Map<string, { pending_count: number }>()
  if (!primaryClient || gameIds.length === 0) return result

  const { data, error } = await primaryClient
    .from('picks')
    .select('game_id')
    .in('game_id', gameIds)
    .eq('sport', sport.toUpperCase())
    .eq('result', 'pending')

  if (error) {
    console.error('[pick-meta] Failed to load', error)
    return result
  }

  for (const row of data ?? []) {
    const current = result.get(row.game_id)?.pending_count ?? 0
    result.set(row.game_id, { pending_count: current + 1 })
  }

  return result
}

async function buildSnapshotPayload(game: any, sport: League, scriptMeta: Map<string, Record<string, unknown>>, pickMeta: Map<string, { pending_count: number }>): Promise<SnapshotPayload> {
  const schedule = normalizeTrendlineDate(game.game_date)

  const [publicMoney, refereeStats, playerProps, gameDetails] = await Promise.all([
    fetchPublicMoney(sport, game.game_id, game),
    game.referee_id ? fetchRefereeStats(sport, game.game_id) : Promise.resolve(null),
    fetchPlayerProps(sport, game.game_id),
    fetchGameDetails(sport, game.game_id)
  ])

  const spread = game.odds
    ? {
        current: game.odds.spread ?? null,
        home_line: game.odds.home_team_odds?.current_point_spread ?? null,
        home_odds: game.odds.home_team_odds?.spread_odds ?? null,
        away_line: game.odds.away_team_odds?.current_point_spread ?? null,
        away_odds: game.odds.away_team_odds?.spread_odds ?? null
      }
    : null

  const totals = game.odds
    ? {
        number: game.odds.over_under ?? null,
        over_odds: game.odds.over_odds ?? null,
        under_odds: game.odds.under_odds ?? null
      }
    : null

  const moneyline = game.odds
    ? {
        home: game.odds.home_team_odds?.moneyline ?? null,
        away: game.odds.away_team_odds?.moneyline ?? null
      }
    : null

  const script = scriptMeta.get(game.game_id) ?? null
  const picks = pickMeta.get(game.game_id) ?? { pending_count: 0 }

  return {
    game_id: game.game_id,
    sport: sport.toUpperCase(),
    season: game.season ?? null,
    week: game.week ?? null,
    status: game.game_status?.game_status ?? 'scheduled',
    start_time_utc: schedule.utc,
    start_time_label: schedule.label,
    home_team: getTeamNickname(game.home_team),
    away_team: getTeamNickname(game.away_team),
    venue: game.game_location ?? null,
    spread,
    moneyline,
    totals,
    public_money: publicMoney,
    referee: refereeStats,
    team_stats: gameDetails,
    props: Array.isArray(playerProps) && playerProps.length > 0 ? playerProps : null,
    script_meta: script,
    picks_meta: picks,
    raw_payload: game,
    updated_at: new Date().toISOString()
  }
}

async function refreshSnapshotsForSport(sport: League) {
  if (!snapshotClient) {
    throw new Error('Snapshot Supabase client is not configured')
  }

  const { from, to } = getDateRangeForSport(sport)
  const games = await fetchGames(sport, from, to)

  if (!games || games.length === 0) {
    console.warn(`[refresh] No games found for ${sport} in range ${from} → ${to}`)
    return { sport, count: 0 }
  }

  const gameIds = games.map((g: any) => g.game_id)
  const [scriptMeta, pickMeta] = await Promise.all([
    loadScriptMeta(gameIds, sport),
    loadPickMeta(gameIds, sport)
  ])

  const payloads: SnapshotPayload[] = []

  for (const game of games) {
    try {
      const payload = await buildSnapshotPayload(game, sport, scriptMeta, pickMeta)
      payloads.push(payload)
      console.log('[refresh] payload summary', {
        gameId: game.game_id,
        sport,
        publicMoneyPresent: Boolean(payload.public_money),
        teamStatsPresent: Boolean(payload.team_stats),
        propsCount: Array.isArray(payload.props) ? payload.props.length : 0
      })
    } catch (error) {
      console.error('[refresh] Failed to build payload', game.game_id, error)
    }
  }

  if (payloads.length === 0) {
    return { sport, count: 0 }
  }

  const { error } = await snapshotClient
    .from('game_snapshots')
    .upsert(payloads, { onConflict: 'sport,game_id' })

  if (error) {
    console.error('[refresh] Upsert failed', error)
    throw error
  }

  return { sport, count: payloads.length }
}

serve(async (request) => {
  try {
    const url = new URL(request.url)
    const sportParam = url.searchParams.get('sport')?.toLowerCase()

    const sportsToProcess: League[] = sportParam
      ? SUPPORTED_SPORTS.filter((s) => s === sportParam)
      : SUPPORTED_SPORTS

    if (sportsToProcess.length === 0) {
      return new Response(JSON.stringify({ error: 'Unsupported sport' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const results = []
    for (const sport of sportsToProcess) {
      const result = await refreshSnapshotsForSport(sport)
      results.push(result)
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[refresh-game-snapshots] Unexpected error', error)
    return new Response(JSON.stringify({ error: 'Unexpected error', details: `${error}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
