import { NextResponse } from 'next/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY!

const PROP_MARKETS = [
  'player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 'player_pass_completions',
  'player_rush_yds', 'player_rush_attempts', 'player_rush_tds',
  'player_receptions', 'player_reception_yds', 'player_reception_tds',
  'player_pass_rush_yds', 'player_rush_reception_yds'
]

export async function GET() {
  try {
    const results: any = {}
    
    // 1. Get upcoming events
    const eventsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events?apiKey=${ODDS_API_KEY}`
    const eventsRes = await fetch(eventsUrl)
    
    if (!eventsRes.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch events', 
        status: eventsRes.status,
        text: await eventsRes.text()
      })
    }
    
    const events = await eventsRes.json()
    results.total_events = events.length
    results.first_events = events.slice(0, 3).map((e: any) => ({
      id: e.id,
      home: e.home_team,
      away: e.away_team,
      commence_time: e.commence_time
    }))
    
    // 2. For first event, get all props
    if (events.length > 0) {
      const firstEvent = events[0]
      const marketsParam = PROP_MARKETS.join(',')
      const propsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${firstEvent.id}/odds?apiKey=${ODDS_API_KEY}&regions=us,us2&markets=${marketsParam}&oddsFormat=american`
      
      console.log('Fetching props from:', propsUrl)
      
      const propsRes = await fetch(propsUrl)
      const propsHeaders = {
        remaining: propsRes.headers.get('x-requests-remaining'),
        used: propsRes.headers.get('x-requests-used')
      }
      
      results.api_quota = propsHeaders
      
      if (!propsRes.ok) {
        results.props_error = {
          status: propsRes.status,
          text: await propsRes.text()
        }
      } else {
        const propsData = await propsRes.json()
        
        // Analyze what markets are available
        const marketsFound: Record<string, number> = {}
        const playersByMarket: Record<string, string[]> = {}
        
        for (const bookmaker of propsData.bookmakers || []) {
          for (const market of bookmaker.markets || []) {
            marketsFound[market.key] = (marketsFound[market.key] || 0) + 1
            
            if (!playersByMarket[market.key]) {
              playersByMarket[market.key] = []
            }
            
            for (const outcome of market.outcomes || []) {
              if (outcome.description && !playersByMarket[market.key].includes(outcome.description)) {
                playersByMarket[market.key].push(outcome.description)
              }
            }
          }
        }
        
        results.game_analyzed = {
          id: firstEvent.id,
          matchup: `${firstEvent.away_team} @ ${firstEvent.home_team}`,
          time: firstEvent.commence_time
        }
        
        results.bookmakers_count = propsData.bookmakers?.length || 0
        results.markets_found = marketsFound
        results.players_per_market = Object.fromEntries(
          Object.entries(playersByMarket).map(([k, v]) => [k, { count: v.length, sample: v.slice(0, 5) }])
        )
        
        // Specifically check for receiving props
        results.has_receiving_yards = marketsFound['player_reception_yds'] > 0
        results.has_rush_yards = marketsFound['player_rush_yds'] > 0
        results.has_receptions = marketsFound['player_receptions'] > 0
      }
    }
    
    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

