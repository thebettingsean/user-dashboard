/**
 * Autopilot Backfill for NFL Prop Lines
 * POST /api/clickhouse/backfill-prop-lines
 * 
 * Processes all NFL game dates from May 2023 onwards
 * Tracks progress and can resume from where it left off
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 300 // 5 minutes max per request

const ODDS_API_KEY = process.env.ODDS_API_KEY

// All available NFL player prop markets
const PROP_MARKETS = [
  'player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 
  'player_pass_completions', 'player_pass_interceptions', 'player_pass_longest_completion',
  'player_rush_yds', 'player_rush_tds', 'player_rush_attempts', 'player_rush_longest',
  'player_reception_yds', 'player_receptions', 'player_reception_tds', 'player_reception_longest',
  'player_pass_rush_yds', 'player_rush_reception_yds', 'player_rush_reception_tds',
  'player_pass_rush_reception_yds', 'player_pass_rush_reception_tds',
  'player_anytime_td', 'player_1st_td', 'player_last_td',
  'player_sacks', 'player_tackles_assists', 'player_solo_tackles', 'player_defensive_interceptions',
  'player_field_goals', 'player_kicking_points', 'player_pats',
]

interface PropLine {
  game_id: string
  espn_game_id: number
  player_name: string
  espn_player_id: number
  prop_type: string
  line: number
  over_odds: number
  under_odds: number
  bookmaker: string
  snapshot_time: string
  game_time: string
  season: number
  week: number
  home_team: string
  away_team: string
}

// Generate all NFL game dates for a season
function getNFLGameDates(season: number): string[] {
  const dates: string[] = []
  
  // Regular season: Early September to early January
  // Week 1 typically starts first Thursday after Labor Day
  const seasonStart = new Date(season, 8, 1) // Sept 1
  const seasonEnd = new Date(season + 1, 1, 15) // Feb 15 (includes playoffs)
  
  // NFL games are typically Thu, Sun, Mon
  for (let d = new Date(seasonStart); d <= seasonEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    // Thursday (4), Saturday (6), Sunday (0), Monday (1)
    if (dayOfWeek === 4 || dayOfWeek === 6 || dayOfWeek === 0 || dayOfWeek === 1) {
      dates.push(d.toISOString().split('T')[0])
    }
  }
  
  return dates
}

// Get NFL week number from date
function getNFLWeek(date: Date, season: number): number {
  const seasonStart = new Date(season, 8, 5)
  const diff = date.getTime() - seasonStart.getTime()
  const daysDiff = diff / (1000 * 60 * 60 * 24)
  return Math.max(1, Math.min(22, Math.floor(daysDiff / 7) + 1))
}

// Check if we've already processed a date
async function isDateProcessed(gameDate: string): Promise<boolean> {
  try {
    const result = await clickhouseQuery(`
      SELECT count() as cnt FROM nfl_prop_lines 
      WHERE toDate(game_time) = '${gameDate}'
    `)
    return (result.data[0]?.cnt || 0) > 100 // Consider processed if >100 lines
  } catch {
    return false
  }
}

// Get historical events for a date
async function getHistoricalEvents(date: string): Promise<any[]> {
  const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}&date=${date}T12:00:00Z`
  
  const response = await fetch(url)
  if (!response.ok) return []
  
  const data = await response.json()
  return data.data || []
}

// Get historical prop odds for a specific event
async function getHistoricalEventOdds(eventId: string, date: string, markets: string[]): Promise<any> {
  const marketsParam = markets.join(',')
  const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/events/${eventId}/odds?apiKey=${ODDS_API_KEY}&date=${date}&regions=us&markets=${marketsParam}&oddsFormat=american`
  
  const response = await fetch(url)
  if (!response.ok) return null
  
  return response.json()
}

// Parse prop outcomes - ONLY get the MAIN line (not alternates)
function parseMainLine(outcomes: any[]): { line: number, over_odds: number, under_odds: number } | null {
  const lines: Map<number, { over_odds: number, under_odds: number }> = new Map()
  
  for (const outcome of outcomes) {
    const line = outcome.point
    if (line === undefined) continue
    
    if (!lines.has(line)) {
      lines.set(line, { over_odds: 0, under_odds: 0 })
    }
    
    const entry = lines.get(line)!
    if (outcome.name === 'Over') entry.over_odds = outcome.price
    else if (outcome.name === 'Under') entry.under_odds = outcome.price
  }
  
  if (lines.size === 0) return null
  
  // Find the main line - closest to -110/-110 (most balanced)
  let mainLine: number | null = null
  let bestScore = Infinity
  
  for (const [line, odds] of lines) {
    const score = Math.abs(odds.over_odds - (-110)) + Math.abs(odds.under_odds - (-110))
    if (score < bestScore) {
      bestScore = score
      mainLine = line
    }
  }
  
  if (mainLine === null) return null
  const mainOdds = lines.get(mainLine)!
  return { line: mainLine, over_odds: mainOdds.over_odds, under_odds: mainOdds.under_odds }
}

// Process a single game's prop lines
async function processGameProps(event: any, season: number): Promise<PropLine[]> {
  const propLines: PropLine[] = []
  
  const gameTime = new Date(event.commence_time)
  const closingTime = new Date(gameTime.getTime() - 30 * 60 * 1000)
  const closingDate = closingTime.toISOString().replace('.000', '')
  
  const BATCH_SIZE = 8
  for (let i = 0; i < PROP_MARKETS.length; i += BATCH_SIZE) {
    const marketBatch = PROP_MARKETS.slice(i, i + BATCH_SIZE)
    
    try {
      const oddsData = await getHistoricalEventOdds(event.id, closingDate, marketBatch)
      if (!oddsData || !oddsData.data) continue
      
      const eventData = oddsData.data
      const snapshotTime = oddsData.timestamp
      
      for (const bookmaker of eventData.bookmakers || []) {
        for (const market of bookmaker.markets || []) {
          const playerOutcomes: Map<string, any[]> = new Map()
          
          for (const outcome of market.outcomes || []) {
            const playerName = outcome.description
            if (!playerName) continue
            
            if (!playerOutcomes.has(playerName)) {
              playerOutcomes.set(playerName, [])
            }
            playerOutcomes.get(playerName)!.push(outcome)
          }
          
          // Only get MAIN line per player/prop (not alternates)
          for (const [playerName, outcomes] of playerOutcomes) {
            const mainLine = parseMainLine(outcomes)
            
            if (mainLine) {
              propLines.push({
                game_id: event.id,
                espn_game_id: 0,
                player_name: playerName,
                espn_player_id: 0,
                prop_type: market.key,
                line: mainLine.line,
                over_odds: mainLine.over_odds,
                under_odds: mainLine.under_odds,
                bookmaker: bookmaker.key,
                snapshot_time: snapshotTime,
                game_time: event.commence_time,
                season: season,
                week: getNFLWeek(gameTime, season),
                home_team: event.home_team,
                away_team: event.away_team
              })
            }
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err) {
      console.error(`Error fetching odds for ${event.id}:`, err)
    }
  }
  
  return propLines
}

// Insert prop lines into ClickHouse
async function insertPropLines(lines: PropLine[]): Promise<void> {
  if (lines.length === 0) return
  
  const values = lines.map(l => `(
    '${l.game_id}',
    ${l.espn_game_id},
    '${l.player_name.replace(/'/g, "''")}',
    ${l.espn_player_id},
    '${l.prop_type}',
    ${l.line},
    ${l.over_odds},
    ${l.under_odds},
    '${l.bookmaker}',
    parseDateTimeBestEffort('${l.snapshot_time}'),
    parseDateTimeBestEffort('${l.game_time}'),
    ${l.season},
    ${l.week},
    '${l.home_team.replace(/'/g, "''")}',
    '${l.away_team.replace(/'/g, "''")}'
  )`).join(',\n')
  
  const sql = `
    INSERT INTO nfl_prop_lines (
      game_id, espn_game_id, player_name, espn_player_id,
      prop_type, line, over_odds, under_odds,
      bookmaker, snapshot_time, game_time, season, week,
      home_team, away_team
    ) VALUES ${values}
  `
  
  await clickhouseCommand(sql)
}

// Process a single date
async function processDate(gameDate: string, season: number): Promise<{ games: number, lines: number }> {
  const events = await getHistoricalEvents(gameDate)
  if (events.length === 0) return { games: 0, lines: 0 }
  
  let totalLines = 0
  
  for (const event of events) {
    const lines = await processGameProps(event, season)
    if (lines.length > 0) {
      await insertPropLines(lines)
      totalLines += lines.length
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  return { games: events.length, lines: totalLines }
}

export async function POST(request: NextRequest) {
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }
  
  const { searchParams } = new URL(request.url)
  const season = parseInt(searchParams.get('season') || '2024')
  const maxDates = parseInt(searchParams.get('max_dates') || '5') // Process up to 5 dates per request
  const skipProcessed = searchParams.get('skip_processed') !== 'false'
  
  try {
    const allDates = getNFLGameDates(season)
    const results: any[] = []
    let processedCount = 0
    
    // Filter to dates after May 3, 2023 (when prop data became available)
    const propDataStart = new Date('2023-05-03')
    const validDates = allDates.filter(d => new Date(d) >= propDataStart && new Date(d) <= new Date())
    
    console.log(`[Backfill] Season ${season}: ${validDates.length} potential game dates`)
    
    for (const gameDate of validDates) {
      if (processedCount >= maxDates) break
      
      // Skip already processed dates
      if (skipProcessed) {
        const alreadyDone = await isDateProcessed(gameDate)
        if (alreadyDone) {
          console.log(`[Backfill] Skipping ${gameDate} - already processed`)
          continue
        }
      }
      
      console.log(`[Backfill] Processing ${gameDate}...`)
      const result = await processDate(gameDate, season)
      
      if (result.games > 0) {
        results.push({
          date: gameDate,
          games: result.games,
          lines: result.lines
        })
        processedCount++
      }
    }
    
    // Get current totals
    const totals = await clickhouseQuery(`
      SELECT 
        count() as total_lines,
        countDistinct(game_id) as total_games,
        countDistinct(player_name) as total_players,
        min(toDate(game_time)) as earliest_date,
        max(toDate(game_time)) as latest_date
      FROM nfl_prop_lines
    `)
    
    return NextResponse.json({
      success: true,
      season,
      dates_processed: processedCount,
      results,
      database_totals: totals.data[0],
      next_action: processedCount >= maxDates 
        ? `Call again to continue (processed ${processedCount} dates)` 
        : 'All available dates processed for this season'
    })
    
  } catch (error: any) {
    console.error('[Backfill] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get progress stats
    const stats = await clickhouseQuery(`
      SELECT 
        season,
        count() as lines,
        countDistinct(game_id) as games,
        countDistinct(toDate(game_time)) as dates,
        min(toDate(game_time)) as earliest,
        max(toDate(game_time)) as latest
      FROM nfl_prop_lines
      GROUP BY season
      ORDER BY season
    `)
    
    const totals = await clickhouseQuery(`
      SELECT 
        count() as total_lines,
        countDistinct(game_id) as total_games,
        countDistinct(player_name) as total_players
      FROM nfl_prop_lines
    `)
    
    return NextResponse.json({
      usage: {
        method: 'POST',
        params: {
          season: '2023 or 2024 (default: 2024)',
          max_dates: 'Number of dates to process per request (default: 5)',
          skip_processed: 'Skip already processed dates (default: true)'
        },
        example: '/api/clickhouse/backfill-prop-lines?season=2024&max_dates=10'
      },
      progress: {
        by_season: stats.data,
        totals: totals.data[0]
      },
      note: 'Prop data available from May 3, 2023 onwards. Call POST repeatedly to backfill all data.'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

