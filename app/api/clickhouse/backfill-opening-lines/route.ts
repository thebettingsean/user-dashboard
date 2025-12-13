import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Backfill TRUE opening lines using Odds API Historical endpoint
 * This fetches the earliest available odds for games
 * 
 * Historical endpoint: GET /v4/historical/sports/{sport}/odds/
 * Requires: date parameter (ISO format)
 * Cost: ~1 request per date checked
 */

const SPORTS_CONFIG = [
  { key: 'americanfootball_nfl', sport: 'nfl' },
  { key: 'basketball_nba', sport: 'nba' },
  { key: 'icehockey_nhl', sport: 'nhl' },
  { key: 'americanfootball_ncaaf', sport: 'cfb' },
]

// Calculate median
function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nfl'
  const daysBack = parseInt(searchParams.get('daysBack') || '3')
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }

  const sportConfig = SPORTS_CONFIG.find(s => s.sport === sport)
  if (!sportConfig) {
    return NextResponse.json({ error: `Unknown sport: ${sport}` }, { status: 400 })
  }

  try {
    const results: { date: string; gamesFound: number; newOpenings: number; updated: number }[] = []
    const forceUpdate = searchParams.get('force') === 'true'
    
    // Get games we've already seen with their first_seen_time
    const seenGamesResult = await clickhouseQuery<{ odds_api_game_id: string; first_seen_time: string }>(`
      SELECT odds_api_game_id, toString(first_seen_time) as first_seen_time 
      FROM game_first_seen WHERE sport = '${sport}'
    `)
    const seenGameIds = new Map((seenGamesResult.data || []).map(g => [g.odds_api_game_id, g.first_seen_time]))
    
    // Check historical odds for each day going back
    for (let i = daysBack; i >= 0; i--) {
      const checkDate = new Date()
      checkDate.setDate(checkDate.getDate() - i)
      // Format as YYYY-MM-DDT12:00:00Z (noon UTC for consistent results)
      const dateStr = checkDate.toISOString().split('T')[0] + 'T12:00:00Z'
      
      console.log(`[BACKFILL] Checking ${sport} odds for ${dateStr}...`)
      
      const historicalUrl = `https://api.the-odds-api.com/v4/historical/sports/${sportConfig.key}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american&date=${dateStr}`
      
      const response = await fetch(historicalUrl)
      
      if (!response.ok) {
        console.log(`[BACKFILL] Historical API error for ${dateStr}: ${response.status}`)
        results.push({ date: dateStr.split('T')[0], gamesFound: 0, newOpenings: 0, updated: 0 })
        continue
      }
      
      const data = await response.json()
      const games = data.data || []
      
      console.log(`[BACKFILL] Response for ${dateStr}:`, {
        hasData: !!data.data,
        dataLength: data.data?.length,
        timestamp: data.timestamp,
        keys: Object.keys(data)
      })
      console.log(`[BACKFILL] Found ${games.length} games for ${dateStr.split('T')[0]}`)
      
      let newOpenings = 0
      let updated = 0
      
      for (const game of games) {
        const existingTime = seenGameIds.get(game.id)
        const snapshotTime = data.timestamp || dateStr.replace('T', ' ').substring(0, 19)
        
        // Skip if we have an EARLIER opening already (unless force=true)
        if (existingTime && !forceUpdate) {
          const existingDate = new Date(existingTime)
          const newDate = new Date(snapshotTime)
          if (existingDate <= newDate) continue // Already have earlier data
        }
        
        if (!game.bookmakers || game.bookmakers.length === 0) continue
        
        // Calculate consensus from all bookmakers
        const spreads: number[] = []
        const totals: number[] = []
        const mlHomes: number[] = []
        const mlAways: number[] = []
        const allBooksSpreads: Record<string, number> = {}
        const allBooksTotals: Record<string, number> = {}
        const allBooksMl: Record<string, { home: number; away: number }> = {}
        
        for (const book of game.bookmakers) {
          let spread = 0, total = 0, mlHome = 0, mlAway = 0
          
          for (const market of book.markets) {
            if (market.key === 'spreads') {
              for (const outcome of market.outcomes) {
                if (outcome.name === game.home_team) {
                  spread = outcome.point || 0
                }
              }
            } else if (market.key === 'totals') {
              for (const outcome of market.outcomes) {
                if (outcome.name === 'Over') {
                  total = outcome.point || 0
                }
              }
            } else if (market.key === 'h2h') {
              for (const outcome of market.outcomes) {
                if (outcome.name === game.home_team) {
                  mlHome = outcome.price
                } else {
                  mlAway = outcome.price
                }
              }
            }
          }
          
          allBooksSpreads[book.key] = spread
          allBooksTotals[book.key] = total
          allBooksMl[book.key] = { home: mlHome, away: mlAway }
          
          if (spread !== 0) spreads.push(spread)
          if (total !== 0) totals.push(total)
          if (mlHome !== 0) mlHomes.push(mlHome)
          if (mlAway !== 0) mlAways.push(mlAway)
        }
        
        const consensusSpread = median(spreads)
        const consensusTotal = median(totals)
        const consensusMlHome = Math.round(median(mlHomes))
        const consensusMlAway = Math.round(median(mlAways))
        
        // Record as opening line
        const gameTime = game.commence_time.replace('T', ' ').replace('Z', '')
        const isUpdate = seenGameIds.has(game.id)
        
        // For ReplacingMergeTree, we can just INSERT and it will replace based on ORDER BY
        await clickhouseCommand(`
          INSERT INTO game_first_seen (
            odds_api_game_id, sport, first_seen_time, 
            opening_spread, opening_total, opening_ml_home, opening_ml_away, bookmaker_count
          ) VALUES (
            '${game.id}', '${sport}', '${snapshotTime}',
            ${consensusSpread}, ${consensusTotal}, ${consensusMlHome}, ${consensusMlAway}, ${game.bookmakers.length}
          )
        `)
        
        if (isUpdate) {
          updated++
        }
        
        // Also insert as opening snapshot
        await clickhouseCommand(`
          INSERT INTO live_odds_snapshots (
            odds_api_game_id, sportsdata_score_id, sport, snapshot_time,
            home_team, away_team, game_time,
            spread, spread_juice_home, spread_juice_away,
            total, total_juice_over, total_juice_under,
            ml_home, ml_away,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            sportsbook, is_opening, bookmaker_count,
            all_books_spreads, all_books_totals, all_books_ml
          ) VALUES (
            '${game.id}', 0, '${sport}', '${snapshotTime}',
            '${game.home_team.replace(/'/g, "''")}', '${game.away_team.replace(/'/g, "''")}', '${gameTime}',
            ${consensusSpread}, -110, -110,
            ${consensusTotal}, -110, -110,
            ${consensusMlHome}, ${consensusMlAway},
            50, 50, 50, 50, 50, 50,
            'consensus', 1, ${game.bookmakers.length},
            '${JSON.stringify(allBooksSpreads).replace(/'/g, "''")}', 
            '${JSON.stringify(allBooksTotals).replace(/'/g, "''")}', 
            '${JSON.stringify(allBooksMl).replace(/'/g, "''")}'
          )
        `)
        
        seenGameIds.set(game.id, snapshotTime)
        newOpenings++
        console.log(`[BACKFILL] ${isUpdate ? 'UPDATED' : 'NEW'} OPENING: ${game.away_team} @ ${game.home_team} - Spread: ${consensusSpread} @ ${snapshotTime}`)
      }
      
      results.push({ date: dateStr.split('T')[0], gamesFound: games.length, newOpenings, updated })
      
      // Rate limit: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return NextResponse.json({
      success: true,
      sport,
      daysBack,
      forceUpdate,
      existingGamesCount: seenGameIds.size,
      results,
      totalNewOpenings: results.reduce((sum, r) => sum + r.newOpenings, 0),
      totalUpdated: results.reduce((sum, r) => sum + (r.updated || 0), 0)
    })
    
  } catch (error: any) {
    console.error('[BACKFILL] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

