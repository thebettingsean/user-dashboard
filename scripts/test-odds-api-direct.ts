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
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
      }
    }
  })
}

const ODDS_API_KEY = process.env.ODDS_API_KEY

async function getOddsEvents(date: string): Promise<any[]> {
  const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events?apiKey=${ODDS_API_KEY}&date=${date}T12:00:00Z`
  const res = await fetch(url)
  const data = await res.json()
  return data.data || []
}

async function checkEventProps(eventId: string, date: string): Promise<boolean> {
  const markets = ['player_points', 'player_rebounds', 'player_assists']
  const url = `https://api.the-odds-api.com/v4/historical/sports/basketball_nba/events/${eventId}/odds?apiKey=${ODDS_API_KEY}&date=${date}&regions=us&markets=${markets.join(',')}&oddsFormat=american`
  const res = await fetch(url)
  const data = await res.json()
  const bookmakers = data.data?.bookmakers || []
  return bookmakers.some(b => (b.markets || []).some(m => m.key?.startsWith('player_')))
}

async function main() {
  const { clickhouseQuery } = await import('../lib/clickhouse')
  
  console.log('=== Testing Odds API for Missing Games ===\n')
  
  // Get a sample of missing games from Nov 29 (the date with 11 missing games)
  const missing = await clickhouseQuery(`
    SELECT 
      g.game_id,
      toString(toDate(g.game_time)) as game_date,
      ht.name as home_team,
      at.name as away_team
    FROM nba_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nba'
    LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nba'
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND toDate(g.game_time) = '2025-11-29'
      AND NOT EXISTS (
        SELECT 1 FROM nba_prop_lines p
        WHERE g.game_id = toUInt32(p.espn_game_id)
        AND p.season = 2026
        AND p.espn_game_id > 0
      )
    LIMIT 5
  `)
  
  console.log(`Testing Nov 29, 2025 (${missing.data?.length || 0} missing games)\n`)
  
  // Query Odds API for this date
  const oddsEvents = await getOddsEvents('2025-11-29')
  console.log(`Odds API events for 2025-11-29: ${oddsEvents.length}`)
  
  if (oddsEvents.length === 0) {
    // Try previous day (late night games)
    const prevEvents = await getOddsEvents('2025-11-28')
    const eventsOn29 = prevEvents.filter(e => {
      const eventDate = new Date(e.commence_time).toISOString().split('T')[0]
      return eventDate === '2025-11-29'
    })
    console.log(`Events on 2025-11-28 that are actually on 2025-11-29: ${eventsOn29.length}`)
    if (eventsOn29.length > 0) {
      oddsEvents.push(...eventsOn29)
    }
  }
  
  // Check each missing game against Odds API events
  for (const game of missing.data || []) {
    console.log(`\n--- ${game.away_team} @ ${game.home_team} ---`)
    
    // Simple team name matching
    const gameHomeLast = game.home_team.split(' ').pop()?.toLowerCase() || ''
    const gameAwayLast = game.away_team.split(' ').pop()?.toLowerCase() || ''
    
    const matching = oddsEvents.filter(e => {
      const eHome = e.home_team.toLowerCase()
      const eAway = e.away_team.toLowerCase()
      return (
        (eHome.includes(gameHomeLast) && eAway.includes(gameAwayLast)) ||
        (eHome.includes(gameAwayLast) && eAway.includes(gameHomeLast))
      )
    })
    
    if (matching.length > 0) {
      console.log(`  ✅ Found ${matching.length} matching Odds API event(s)`)
      for (const event of matching) {
        const eventDate = new Date(event.commence_time).toISOString().split('T')[0]
        console.log(`     ${event.away_team} @ ${event.home_team} (Event ID: ${event.id}, Date: ${eventDate})`)
        
        // Check if it has props
        const hasProps = await checkEventProps(event.id, eventDate)
        console.log(`     Player props: ${hasProps ? '✅ YES' : '❌ NO'}`)
        
        await new Promise(r => setTimeout(r, 600))
      }
    } else {
      console.log(`  ❌ No matching Odds API event found`)
    }
  }
}

main().catch(console.error)


