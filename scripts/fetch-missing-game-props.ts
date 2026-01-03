/**
 * Fetch props from Odds API for games that are missing props
 * No matching - just fetch and insert with espn_game_id = 0
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        value = value.replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  })
}

const ODDS_API_KEY = process.env.ODDS_API_KEY

const PROP_MARKETS = [
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_steals',
  'player_blocks',
  'player_turnovers',
]

const BOOKMAKER_PRIORITY = [
  'fanduel', 'draftkings', 'betmgm', 'williamhill_us', 'betrivers',
  'fanatics', 'bovada', 'pointsbetus', 'barstool', 'betonlineag', 'unibet_us'
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

// Get games missing props
async function getMissingGames(): Promise<any[]> {
  const { clickhouseQuery } = await import('../lib/clickhouse')
  
  const result = await clickhouseQuery(`
    SELECT 
      g.season,
      toString(g.espn_game_id) as espn_game_id,
      toDate(g.game_time) as game_date,
      g.game_time,
      ht.name as home_team,
      at.name as away_team
    FROM nba_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nba'
    LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nba'
    WHERE g.season IN (2025, 2026)
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 
        FROM nba_prop_lines p 
        WHERE toString(g.espn_game_id) = toString(p.espn_game_id) 
          AND p.espn_game_id > 0
      )
    ORDER BY g.game_time
  `)
  
  return result.data || []
}

// Get historical events for a date (±1 day)
async function getHistoricalEventsForDate(date: string): Promise<any[]> {
  const dates = [
    new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date,
    new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  ]
  
  const allEvents: any[] = []
  
  for (const d of dates) {
    const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events?apiKey=${ODDS_API_KEY}&date=${d}T12:00:00Z`
    
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      
      const data = await response.json()
      const events = data.data || []
      
      // Filter to events within ±2 days of the date
      const dateTime = new Date(date).getTime()
      const filtered = events.filter((event: any) => {
        const eventTime = new Date(event.commence_time).getTime()
        const diffDays = Math.abs(eventTime - dateTime) / (1000 * 60 * 60 * 24)
        return diffDays <= 2
      })
      
      allEvents.push(...filtered)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err) {
      console.error(`  Error fetching ${d}:`, err)
    }
  }
  
  return allEvents
}

// Find matching Odds API event for a game (simple team name matching)
function findMatchingEvent(game: any, events: any[]): any | null {
  const normalizeTeam = (name: string) => {
    return name.toLowerCase()
      .replace(/los angeles|l\.?a\.?/g, '')
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  const gameHome = normalizeTeam(game.home_team || '')
  const gameAway = normalizeTeam(game.away_team || '')
  
  for (const event of events) {
    const eventHome = normalizeTeam(event.home_team || '')
    const eventAway = normalizeTeam(event.away_team || '')
    
    // Check if teams match (either direction)
    const teamsMatch = (
      (gameHome.includes(eventHome) || eventHome.includes(gameHome)) &&
      (gameAway.includes(eventAway) || eventAway.includes(gameAway))
    ) || (
      (gameHome.includes(eventAway) || eventAway.includes(gameHome)) &&
      (gameAway.includes(eventHome) || eventHome.includes(gameAway))
    )
    
    if (teamsMatch) {
      // Check time is close (within 6 hours)
      const gameTime = new Date(game.game_time).getTime()
      const eventTime = new Date(event.commence_time).getTime()
      const timeDiff = Math.abs(gameTime - eventTime)
      
      if (timeDiff < 6 * 60 * 60 * 1000) {
        return event
      }
    }
  }
  
  return null
}

// Parse main line
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

// Get historical prop odds for an event
async function getHistoricalEventOdds(eventId: string, date: string, markets: string[]): Promise<any> {
  const marketsParam = markets.join(',')
  const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events/${eventId}/odds?apiKey=${ODDS_API_KEY}&date=${date}&regions=us&markets=${marketsParam}&oddsFormat=american`
  
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    
    return response.json()
  } catch (err) {
    return null
  }
}

// Process props for an event
async function processEventProps(event: any, season: number): Promise<PropLine[]> {
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
      
      // Filter to priority bookmakers, use first one only
      const bookmakers = (eventData.bookmakers || [])
        .filter((bm: any) => BOOKMAKER_PRIORITY.includes(bm.key?.toLowerCase()))
        .sort((a: any, b: any) => {
          const aIdx = BOOKMAKER_PRIORITY.indexOf(a.key?.toLowerCase() || '')
          const bIdx = BOOKMAKER_PRIORITY.indexOf(b.key?.toLowerCase() || '')
          return aIdx - bIdx
        })
      
      if (bookmakers.length === 0) continue
      const bookmaker = bookmakers[0]
      
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
        
        for (const [playerName, outcomes] of playerOutcomes) {
          const mainLine = parseMainLine(outcomes)
          
          if (mainLine) {
            propLines.push({
              game_id: event.id,
              espn_game_id: 0, // Will match later
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
              week: 0,
              home_team: event.home_team,
              away_team: event.away_team
            })
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err) {
      console.error(`    Error processing props:`, err)
    }
  }
  
  return propLines
}

// Insert prop lines
async function insertPropLines(lines: PropLine[]): Promise<void> {
  if (lines.length === 0) return
  
  const { clickhouseCommand } = await import('../lib/clickhouse')
  
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
    INSERT INTO nba_prop_lines (
      game_id, espn_game_id, player_name, espn_player_id,
      prop_type, line, over_odds, under_odds,
      bookmaker, snapshot_time, game_time, season, week,
      home_team, away_team
    ) VALUES ${values}
  `
  
  await clickhouseCommand(sql)
}

async function main() {
  if (!ODDS_API_KEY) {
    console.error('❌ ODDS_API_KEY not set')
    process.exit(1)
  }

  console.log('=== Fetching Props for Missing Games ===\n')

  const missingGames = await getMissingGames()
  console.log(`📋 Found ${missingGames.length} games missing props\n`)

  let gamesProcessed = 0
  let eventsFound = 0
  let propsInserted = 0
  let gamesWithProps = 0

  // Process unique dates only (avoid duplicate API calls)
  const uniqueDates = [...new Set(missingGames.map(g => g.game_date))].sort()
  
  for (const gameDate of uniqueDates) {
    console.log(`Processing date: ${gameDate}`)
    
    // Get all events for this date
    const events = await getHistoricalEventsForDate(gameDate)
    
    if (events.length === 0) {
      console.log(`  ⚠️  No Odds API events found for ${gameDate}`)
      continue
    }
    
    console.log(`  ✅ Found ${events.length} events`)
    eventsFound += events.length
    
    // Get season for this date
    const gameForDate = missingGames.find(g => g.game_date === gameDate)
    const season = gameForDate?.season || 2025
    
    // Process props for ALL events on this date
    for (const event of events) {
      gamesProcessed++
      
      // Check if we already have props for this event
      const { clickhouseQuery } = await import('../lib/clickhouse')
      const existing = await clickhouseQuery(`
        SELECT count() as cnt
        FROM nba_prop_lines
        WHERE game_id = '${event.id}'
      `)
      
      if (existing.data[0]?.cnt > 0) {
        console.log(`  ⏭️  Event ${event.id}: Already have ${existing.data[0].cnt} props`)
        continue
      }
      
      // Fetch props for this event
      const props = await processEventProps(event, season)
      
      if (props.length > 0) {
        await insertPropLines(props)
        propsInserted += props.length
        gamesWithProps++
        console.log(`  ✅ Event ${event.id} (${event.away_team} @ ${event.home_team}): Inserted ${props.length} props`)
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    console.log()
    
    // Rate limit between dates
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n✅ Complete!')
  console.log(`  Games processed: ${gamesProcessed}`)
  console.log(`  Events found: ${eventsFound}`)
  console.log(`  Games with props: ${gamesWithProps}`)
  console.log(`  Total props inserted: ${propsInserted}`)
}

main().catch(console.error)

