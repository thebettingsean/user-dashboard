/**
 * NFL Props Lifecycle Manager
 * 
 * Handles the complete lifecycle of prop lines:
 * 1. OPENING: When prop first appears (days before game)
 * 2. CURRENT: Track line movements throughout the week
 * 3. CLOSING: Capture final line 30 min before game
 * 4. ARCHIVE: After game, move to history with actual results
 * 
 * Flow:
 * current_props (live tracking) → nfl_prop_lines (historical archive)
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 300

const ODDS_API_KEY = process.env.ODDS_API_KEY

const BOOKMAKER_PRIORITY: Record<string, number> = {
  'fanduel': 1, 'draftkings': 2, 'betmgm': 3, 'williamhill_us': 4,
  'betrivers': 5, 'fanatics': 6, 'bovada': 7, 'pointsbetus': 8,
  'barstool': 9, 'betonlineag': 10, 'unibet_us': 11,
}

const PROP_MARKETS = [
  'player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 
  'player_pass_completions', 'player_pass_interceptions', 'player_pass_longest_completion',
  'player_rush_yds', 'player_rush_tds', 'player_rush_attempts', 'player_rush_longest',
  'player_reception_yds', 'player_receptions', 'player_reception_tds', 'player_reception_longest',
  'player_pass_rush_yds', 'player_rush_reception_yds',
]

// ============================================
// 1. FETCH OPENING LINES (for games 2-7 days out)
// ============================================
async function fetchOpeningLines(): Promise<{ inserted: number; updated: number }> {
  if (!ODDS_API_KEY) throw new Error('ODDS_API_KEY not configured')
  
  const eventsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}`
  const eventsRes = await fetch(eventsUrl)
  if (!eventsRes.ok) throw new Error('Failed to fetch events')
  
  const events = await eventsRes.json()
  const now = new Date()
  
  // Games 2-7 days out (opening lines territory)
  const futureGames = events.filter((e: any) => {
    const gameTime = new Date(e.commence_time)
    const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntil > 48 && hoursUntil < 168 // 2-7 days
  })
  
  let inserted = 0
  let updated = 0
  
  for (const event of futureGames.slice(0, 3)) { // Limit per run
    const marketsParam = PROP_MARKETS.slice(0, 8).join(',') // First 8 markets per request
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${event.id}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${marketsParam}&oddsFormat=american`
    
    try {
      const oddsRes = await fetch(oddsUrl)
      if (!oddsRes.ok) continue
      
      const oddsData = await oddsRes.json()
      const result = await processPropsFromOddsData(oddsData, event, true)
      inserted += result.inserted
      updated += result.updated
    } catch (e) {
      console.error(`Error fetching props for ${event.id}:`, e)
    }
    
    await new Promise(r => setTimeout(r, 300))
  }
  
  return { inserted, updated }
}

// ============================================
// 2. UPDATE CURRENT LINES (for games 0-48 hours out)
// ============================================
async function updateCurrentLines(): Promise<{ updated: number }> {
  if (!ODDS_API_KEY) throw new Error('ODDS_API_KEY not configured')
  
  const eventsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}`
  const eventsRes = await fetch(eventsUrl)
  if (!eventsRes.ok) throw new Error('Failed to fetch events')
  
  const events = await eventsRes.json()
  const now = new Date()
  
  // Games 30min - 48 hours out
  const soonGames = events.filter((e: any) => {
    const gameTime = new Date(e.commence_time)
    const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntil > 0.5 && hoursUntil <= 48
  })
  
  let updated = 0
  
  for (const event of soonGames.slice(0, 5)) {
    const marketsParam = PROP_MARKETS.join(',')
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${event.id}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${marketsParam}&oddsFormat=american`
    
    try {
      const oddsRes = await fetch(oddsUrl)
      if (!oddsRes.ok) continue
      
      const oddsData = await oddsRes.json()
      const result = await processPropsFromOddsData(oddsData, event, false)
      updated += result.updated
    } catch (e) {
      console.error(`Error updating props for ${event.id}:`, e)
    }
    
    await new Promise(r => setTimeout(r, 300))
  }
  
  return { updated }
}

// ============================================
// 3. CAPTURE CLOSING LINES (games starting within 30 min)
// ============================================
async function captureClosingLines(): Promise<{ captured: number }> {
  if (!ODDS_API_KEY) throw new Error('ODDS_API_KEY not configured')
  
  const eventsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}`
  const eventsRes = await fetch(eventsUrl)
  if (!eventsRes.ok) throw new Error('Failed to fetch events')
  
  const events = await eventsRes.json()
  const now = new Date()
  
  // Games starting in next 30 minutes
  const imminentGames = events.filter((e: any) => {
    const gameTime = new Date(e.commence_time)
    const minutesUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60)
    return minutesUntil > 0 && minutesUntil <= 30
  })
  
  let captured = 0
  
  for (const event of imminentGames) {
    const marketsParam = PROP_MARKETS.join(',')
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${event.id}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${marketsParam}&oddsFormat=american`
    
    try {
      const oddsRes = await fetch(oddsUrl)
      if (!oddsRes.ok) continue
      
      const oddsData = await oddsRes.json()
      
      // Mark these as closing lines
      for (const bookmaker of oddsData.bookmakers || []) {
        for (const market of bookmaker.markets || []) {
          const playerOutcomes: Map<string, any[]> = new Map()
          
          for (const outcome of market.outcomes || []) {
            const playerName = outcome.description
            if (!playerName) continue
            if (!playerOutcomes.has(playerName)) playerOutcomes.set(playerName, [])
            playerOutcomes.get(playerName)!.push(outcome)
          }
          
          for (const [playerName, outcomes] of playerOutcomes) {
            const overOutcome = outcomes.find(o => o.name === 'Over' && o.point !== undefined)
            if (!overOutcome) continue
            
            const propId = `${event.id}_${playerName}_${market.key}`.replace(/[^a-zA-Z0-9_]/g, '_')
            const closingLine = overOutcome.point
            const closingOdds = overOutcome.price
            
            // Update with closing values
            await clickhouseCommand(`
              ALTER TABLE current_props UPDATE
                line = ${closingLine},
                odds = ${closingOdds},
                last_updated_at = now(),
                fetched_at = now()
              WHERE prop_id = '${propId}'
            `)
            captured++
          }
        }
      }
    } catch (e) {
      console.error(`Error capturing closing lines for ${event.id}:`, e)
    }
  }
  
  return { captured }
}

// ============================================
// 4. ARCHIVE COMPLETED PROPS TO HISTORY
// ============================================
async function archiveCompletedProps(): Promise<{ archived: number }> {
  // Find props for games that have completed
  const completedProps = await clickhouseQuery(`
    SELECT * FROM current_props 
    WHERE fetched_at < now() - INTERVAL 4 HOUR
    LIMIT 100
  `)
  
  let archived = 0
  
  for (const prop of completedProps.data) {
    try {
      // Insert into historical table
      await clickhouseCommand(`
        INSERT INTO nfl_prop_lines (
          game_id, espn_game_id, player_name, espn_player_id,
          prop_type, line, over_odds, under_odds,
          bookmaker, snapshot_time, game_time, season, week,
          home_team, away_team
        ) VALUES (
          '${prop.prop_id.split('_')[0]}', 0, 
          '${prop.prop_id.split('_').slice(1, -1).join('_')}', 0,
          '${prop.stat_type}', ${prop.line}, ${prop.odds}, 0,
          '${prop.bookmaker}', now(), now(), 2025, 0,
          '', ''
        )
      `)
      
      // Delete from current
      await clickhouseCommand(`
        ALTER TABLE current_props DELETE WHERE prop_id = '${prop.prop_id}'
      `)
      
      archived++
    } catch (e) {
      console.error(`Error archiving prop ${prop.prop_id}:`, e)
    }
  }
  
  return { archived }
}

// ============================================
// Helper: Process props from Odds API response
// ============================================
async function processPropsFromOddsData(
  oddsData: any, 
  event: any, 
  isOpening: boolean
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0
  
  // Find best bookmaker for each player/market combo
  const bestProps: Map<string, any> = new Map()
  
  for (const bookmaker of oddsData.bookmakers || []) {
    const priority = BOOKMAKER_PRIORITY[bookmaker.key] || 99
    
    for (const market of bookmaker.markets || []) {
      const playerOutcomes: Map<string, any[]> = new Map()
      
      for (const outcome of market.outcomes || []) {
        const playerName = outcome.description
        if (!playerName) continue
        if (!playerOutcomes.has(playerName)) playerOutcomes.set(playerName, [])
        playerOutcomes.get(playerName)!.push(outcome)
      }
      
      for (const [playerName, outcomes] of playerOutcomes) {
        const overOutcome = outcomes.find(o => o.name === 'Over' && o.point !== undefined)
        if (!overOutcome) continue
        
        const key = `${event.id}_${playerName}_${market.key}`
        const existing = bestProps.get(key)
        
        if (!existing || priority < existing.priority) {
          bestProps.set(key, {
            propId: key.replace(/[^a-zA-Z0-9_]/g, '_'),
            playerName,
            statType: market.key,
            line: overOutcome.point,
            odds: overOutcome.price,
            bookmaker: bookmaker.key,
            priority,
            gameTime: event.commence_time,
            homeTeam: event.home_team,
            awayTeam: event.away_team
          })
        }
      }
    }
  }
  
  // Insert/update props
  for (const [key, prop] of bestProps) {
    const existing = await clickhouseQuery(`
      SELECT prop_id, opening_line FROM current_props 
      WHERE prop_id = '${prop.propId}' LIMIT 1
    `)
    
    if (existing.data.length === 0) {
      // New prop
      await clickhouseCommand(`
        INSERT INTO current_props (
          prop_id, player_id, game_id, sport, stat_type, line, odds,
          bookmaker, is_alternate, opening_line, opening_odds,
          line_movement, odds_movement, first_seen_at, last_updated_at, fetched_at
        ) VALUES (
          '${prop.propId}', 0, 0, 'nfl', '${prop.statType}', ${prop.line}, ${prop.odds},
          '${prop.bookmaker}', 0, ${prop.line}, ${prop.odds},
          0, 0, now(), now(), now()
        )
      `)
      inserted++
    } else if (!isOpening) {
      // Update existing
      const openingLine = existing.data[0].opening_line
      const lineMovement = prop.line - openingLine
      
      await clickhouseCommand(`
        ALTER TABLE current_props UPDATE
          line = ${prop.line},
          odds = ${prop.odds},
          bookmaker = '${prop.bookmaker}',
          line_movement = ${lineMovement},
          last_updated_at = now(),
          fetched_at = now()
        WHERE prop_id = '${prop.propId}'
      `)
      updated++
    }
  }
  
  return { inserted, updated }
}

// ============================================
// MAIN HANDLER
// ============================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage') || 'auto'
  
  const results: Record<string, any> = {}
  const startTime = Date.now()
  
  try {
    // Auto-detect what needs to run based on time
    if (stage === 'auto' || stage === 'opening') {
      results.opening = await fetchOpeningLines()
    }
    
    if (stage === 'auto' || stage === 'current') {
      results.current = await updateCurrentLines()
    }
    
    if (stage === 'auto' || stage === 'closing') {
      results.closing = await captureClosingLines()
    }
    
    if (stage === 'auto' || stage === 'archive') {
      results.archive = await archiveCompletedProps()
    }
    
    // Get current stats
    const stats = await clickhouseQuery(`
      SELECT count() as total_current FROM current_props
    `)
    
    return NextResponse.json({
      success: true,
      elapsed_ms: Date.now() - startTime,
      results,
      current_props_count: stats.data[0]?.total_current || 0
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

