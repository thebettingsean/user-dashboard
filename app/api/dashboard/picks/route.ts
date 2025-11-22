import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const SNAPSHOTS_SUPABASE_URL = process.env.SNAPSHOTS_SUPABASE_URL || SUPABASE_URL
const SNAPSHOTS_SUPABASE_SERVICE_KEY = process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY

const snapshotsClient = createClient(SNAPSHOTS_SUPABASE_URL, SNAPSHOTS_SUPABASE_SERVICE_KEY)

const SUPPORTED_SPORTS = ['nfl', 'nba', 'nhl', 'cfb'] as const
const SUPPORTED_FILTERS = ['upcoming', 'byCapper', 'topProps', 'results'] as const

type SupportedSport = (typeof SUPPORTED_SPORTS)[number]
type SupportedFilter = (typeof SUPPORTED_FILTERS)[number]

type DashboardPick = {
  id: string
  sport: string
  bettorName: string
  bettorProfileImage: string | null
  bettorProfileInitials: string | null
  betTitle: string
  units: number
  odds: string
  result: string
  gameTime: string
  gameTimeLabel: string
  gameId: string | null
  kickoffUtc: string | null
  awayTeam: string | null
  homeTeam: string | null
  matchup: string
  analysis: string
  bettorRecord: string | null
  bettorWinStreak: number | null
}

function getTimeWindows(filter: SupportedFilter) {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  switch (filter) {
    case 'upcoming':
    case 'byCapper':
    case 'topProps':
      end.setDate(end.getDate() + 7)
      return { start, end }
    case 'results':
      start.setDate(start.getDate() - 7)
      end.setHours(end.getHours())
      return { start, end }
    default:
      end.setDate(end.getDate() + 7)
      return { start, end }
  }
}

function cleanRichTextHTML(html: string): string {
  if (!html) return ''

  let cleaned = html
  cleaned = cleaned.replace(/<span[^>]*style="[^>]*background-color:[^;>]*;?[^>]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
  cleaned = cleaned.replace(/<span[^>]*style="[^>]*font-family:[^;>]*;?[^>]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
  cleaned = cleaned.replace(/style="[^">]*"/gi, (match) => {
    const fontWeight = match.match(/font-weight:\s*(\d+|bold|bolder)/i)
    const textDecoration = match.match(/text-decoration[^;]*/i)
    const keepStyles: string[] = []
    if (fontWeight) keepStyles.push(fontWeight[0])
    if (textDecoration) keepStyles.push(textDecoration[0])
    return keepStyles.length > 0 ? `style="${keepStyles.join('; ')}"` : ''
  })
  cleaned = cleaned.replace(/<p[^>]*>/gi, '<p>')
  cleaned = cleaned.replace(/<\/p>/gi, '</p>')
  cleaned = cleaned.replace(/<a([^>]*)style="[^\"]*text-decoration:\s*none[^\"]*"([^>]*)>/gi, '<a$1$2>')
  cleaned = cleaned.replace(/\s+style=""\s*/gi, ' ')
  cleaned = cleaned.replace(/<([a-z]+)\s+>/gi, '<$1>')
  return cleaned
}

function formatEstTimeLabel(dateInput: string) {
  if (!dateInput) return 'TBD'
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return 'TBD'

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  }).format(date)
}

function getTeamNickname(name: string | null) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  return parts[parts.length - 1] || name
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let sportParam = (searchParams.get('sport') || 'nfl').toLowerCase()
    const filterParam = (searchParams.get('filter') || 'upcoming') as SupportedFilter

    // Map college-football to cfb for backend consistency
    if (sportParam === 'college-football') {
      sportParam = 'cfb'
    }

    if (!SUPPORTED_SPORTS.includes(sportParam as SupportedSport)) {
      return NextResponse.json(
        { error: 'Unsupported sport. Use nfl, nba, nhl, or cfb.' },
        { status: 400 }
      )
    }

    if (!SUPPORTED_FILTERS.includes(filterParam)) {
      return NextResponse.json(
        { error: 'Unsupported filter.' },
        { status: 400 }
      )
    }

    const sport = sportParam as SupportedSport
    const filter = filterParam

    const { start, end } = getTimeWindows(filter)

    // Map sport to database format (picks table uses 'NCAAF' instead of 'CFB')
    const dbSport = sport === 'cfb' ? 'NCAAF' : sport.toUpperCase()

    const baseQuery = supabase
      .from('picks')
      .select('id, sport, bet_title, units, odds, game_time, result, game_id, analysis, bettors(name, record, win_streak, profile_image, profile_initials)')
      .eq('sport', dbSport)

    if (filter === 'results') {
      baseQuery.neq('result', 'pending').gte('game_time', start.toISOString()).lte('game_time', end.toISOString()).order('game_time', { ascending: false })
    } else if (filter === 'topProps') {
      baseQuery.eq('result', 'pending').gte('game_time', new Date().toISOString()).order('units', { ascending: false })
    } else {
      baseQuery.eq('result', 'pending').gte('game_time', start.toISOString()).lte('game_time', end.toISOString()).order('game_time', { ascending: true })
    }

    baseQuery.limit(30)

    const { data: rows, error } = await baseQuery

    if (error) {
      console.error('Failed to fetch picks:', error)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    const gameIds = Array.from(
      new Set(
        (rows || [])
          .map((row) => row.game_id)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    )

    const snapshotMap = new Map<string, { away_team: string; home_team: string; start_time_label: string; start_time_utc: string }>()

    if (gameIds.length > 0) {
      // Query appropriate table based on sport (college_game_snapshots for CFB, game_snapshots for others)
      const tableName = sport === 'cfb' ? 'college_game_snapshots' : 'game_snapshots'
      const { data: snapshotRows, error: snapshotError } = await snapshotsClient
        .from(tableName)
        .select('game_id, away_team, home_team, start_time_label, start_time_utc')
        .in('game_id', gameIds)

      if (snapshotError) {
        console.error('Failed to load snapshot metadata for picks:', snapshotError)
      }

      for (const row of snapshotRows ?? []) {
        snapshotMap.set(row.game_id, {
          away_team: row.away_team,
          home_team: row.home_team,
          start_time_label: row.start_time_label,
          start_time_utc: row.start_time_utc
        })
      }
    }

    const picks: DashboardPick[] = (rows || []).map((row) => {
      const rawStreak = (row.bettors as any)?.win_streak
      const parsedStreak =
        typeof rawStreak === 'number'
          ? rawStreak
          : typeof rawStreak === 'string' && rawStreak.trim().length > 0
          ? Number(rawStreak)
          : null
      const bettorWinStreak = typeof parsedStreak === 'number' && !Number.isNaN(parsedStreak) ? parsedStreak : null

      const snapshot = row.game_id ? snapshotMap.get(row.game_id) : undefined
      const awayTeam = snapshot?.away_team ?? null
      const homeTeam = snapshot?.home_team ?? null
      const kickoffUtc = snapshot?.start_time_utc ?? row.game_time
      const gameTimeLabel = snapshot?.start_time_label ?? `${formatEstTimeLabel(row.game_time)} ET`
      const matchup = snapshot
        ? `${getTeamNickname(awayTeam ?? '')} @ ${getTeamNickname(homeTeam ?? '')}`
        : row.bet_title || row.game_id || 'Matchup'

      return {
        id: row.id,
        sport: row.sport,
        bettorName: (row.bettors as any)?.name || 'Insider',
        bettorProfileImage: (row.bettors as any)?.profile_image || null,
        bettorProfileInitials: (row.bettors as any)?.profile_initials || null,
        betTitle: row.bet_title || 'Wager',
        units: typeof row.units === 'number' ? row.units : parseFloat(row.units) || 0,
        odds: row.odds || 'N/A',
        result: row.result || 'pending',
        gameTime: row.game_time,
        gameTimeLabel,
        gameId: row.game_id || null,
        kickoffUtc,
        awayTeam,
        homeTeam,
        matchup,
        analysis: cleanRichTextHTML(row.analysis || ''),
        bettorRecord: (row.bettors as any)?.record || null,
        bettorWinStreak
      }
    })

    picks.sort((a, b) => b.units - a.units)

    const response = NextResponse.json({ sport: sport.toUpperCase(), filter, picks })
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Unexpected error fetching dashboard picks:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
