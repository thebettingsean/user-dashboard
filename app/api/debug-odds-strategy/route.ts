import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl'

const NFL_TEAMS: Record<number, string> = {
  1: 'Atlanta Falcons', 2: 'Buffalo Bills', 3: 'Chicago Bears', 4: 'Cincinnati Bengals',
  5: 'Cleveland Browns', 6: 'Dallas Cowboys', 7: 'Denver Broncos', 8: 'Detroit Lions',
  9: 'Green Bay Packers', 10: 'Tennessee Titans', 11: 'Indianapolis Colts', 12: 'Kansas City Chiefs',
  13: 'Las Vegas Raiders', 14: 'Los Angeles Rams', 15: 'Miami Dolphins', 16: 'Minnesota Vikings',
  17: 'New England Patriots', 18: 'New Orleans Saints', 19: 'New York Giants', 20: 'New York Jets',
  21: 'Philadelphia Eagles', 22: 'Arizona Cardinals', 23: 'Pittsburgh Steelers', 24: 'Los Angeles Chargers',
  25: 'San Francisco 49ers', 26: 'Seattle Seahawks', 27: 'Tampa Bay Buccaneers', 28: 'Washington Commanders',
  29: 'Carolina Panthers', 30: 'Jacksonville Jaguars', 33: 'Baltimore Ravens', 34: 'Houston Texans'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = parseInt(searchParams.get('season') || '2024')
  const limit = parseInt(searchParams.get('limit') || '10')
  
  try {
    // Get sample games
    const result = await clickhouseQuery(`
      SELECT game_id, game_date, game_time, week, home_team_id, away_team_id
      FROM nfl_games
      WHERE season = ${season}
      ORDER BY game_date
      LIMIT ${limit}
    `)
    
    const debugResults: any[] = []
    
    for (const game of result.data || []) {
      const homeTeam = NFL_TEAMS[game.home_team_id]
      const awayTeam = NFL_TEAMS[game.away_team_id]
      const gameTime = new Date(game.game_time)
      const gameDate = new Date(game.game_date)
      
      const gameDebug: any = {
        game_id: game.game_id,
        matchup: `${awayTeam} @ ${homeTeam}`,
        week: game.week,
        game_date: game.game_date,
        game_time: game.game_time,
        game_time_parsed: gameTime.toISOString(),
        opening_query: {},
        closing_query: {}
      }
      
      // ============ OPENING LINE STRATEGY ============
      // Tuesday 12pm EST (5pm UTC) of the game week
      const dayOfWeek = gameDate.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 5 : dayOfWeek === 6 ? 4 : dayOfWeek - 2
      const tuesday = new Date(gameDate)
      tuesday.setDate(tuesday.getDate() - Math.max(0, daysToSubtract))
      tuesday.setUTCHours(17, 0, 0, 0) // 5pm UTC = 12pm EST
      const openingDateParam = tuesday.toISOString().replace(/\.\d{3}Z$/, 'Z')
      
      gameDebug.opening_query = {
        strategy: 'Tuesday 12pm EST of game week',
        query_time: openingDateParam,
        calculation: {
          game_date: game.game_date,
          day_of_week: dayOfWeek,
          days_subtracted: daysToSubtract
        }
      }
      
      try {
        const openingUrl = `${ODDS_API_BASE}/odds?apiKey=${ODDS_API_KEY}&date=${openingDateParam}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
        const openingRes = await fetch(openingUrl)
        const openingData = await openingRes.json()
        
        const matchingGame = openingData.data?.find((event: any) => 
          event.home_team === homeTeam && event.away_team === awayTeam
        )
        
        gameDebug.opening_query.api_response = {
          snapshot_time: openingData.timestamp,
          total_events: openingData.data?.length || 0,
          game_found: !!matchingGame,
          bookmakers_count: matchingGame?.bookmakers?.length || 0,
          all_bookmakers: matchingGame?.bookmakers?.map((bm: any) => ({
            name: bm.title,
            markets: bm.markets?.map((m: any) => ({
              key: m.key,
              outcomes_count: m.outcomes?.length || 0
            })),
            has_spreads: bm.markets?.some((m: any) => m.key === 'spreads'),
            has_totals: bm.markets?.some((m: any) => m.key === 'totals'),
            has_h2h: bm.markets?.some((m: any) => m.key === 'h2h'),
            sample_spread: bm.markets?.find((m: any) => m.key === 'spreads')?.outcomes?.find((o: any) => o.name === homeTeam)?.point
          })) || []
        }
        
        gameDebug.opening_query.result = matchingGame ? 
          (matchingGame.bookmakers?.some((b: any) => b.markets?.some((m: any) => m.key === 'spreads')) ? '✅ FOUND SPREAD' : '❌ No spread data') :
          '❌ GAME NOT IN SNAPSHOT'
          
      } catch (err: any) {
        gameDebug.opening_query.error = err.message
      }
      
      await new Promise(r => setTimeout(r, 600))
      
      // ============ CLOSING LINE STRATEGY ============
      // 1 hour before game time, rounded to 5 min
      const oneHourBefore = new Date(gameTime.getTime() - 1 * 60 * 60 * 1000)
      const minutes = oneHourBefore.getMinutes()
      const roundedMinutes = Math.floor(minutes / 5) * 5
      oneHourBefore.setMinutes(roundedMinutes, 0, 0)
      const closingDateParam = oneHourBefore.toISOString().replace(/\.\d{3}Z$/, 'Z')
      
      gameDebug.closing_query = {
        strategy: '1 hour before game time, rounded to 5 min',
        query_time: closingDateParam,
        calculation: {
          game_time: gameTime.toISOString(),
          one_hour_before: new Date(gameTime.getTime() - 60*60*1000).toISOString(),
          rounded_to: closingDateParam
        }
      }
      
      try {
        const closingUrl = `${ODDS_API_BASE}/odds?apiKey=${ODDS_API_KEY}&date=${closingDateParam}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
        const closingRes = await fetch(closingUrl)
        const closingData = await closingRes.json()
        
        const matchingGame = closingData.data?.find((event: any) => {
          const eventDate = new Date(event.commence_time)
          const timeDiff = Math.abs(eventDate.getTime() - gameTime.getTime())
          return event.home_team === homeTeam && 
                 event.away_team === awayTeam && 
                 timeDiff < 4 * 60 * 60 * 1000
        })
        
        gameDebug.closing_query.api_response = {
          snapshot_time: closingData.timestamp,
          total_events: closingData.data?.length || 0,
          game_found: !!matchingGame,
          bookmakers_count: matchingGame?.bookmakers?.length || 0,
          all_bookmakers: matchingGame?.bookmakers?.map((bm: any) => ({
            name: bm.title,
            markets: bm.markets?.map((m: any) => ({
              key: m.key,
              outcomes_count: m.outcomes?.length || 0
            })),
            has_spreads: bm.markets?.some((m: any) => m.key === 'spreads'),
            has_totals: bm.markets?.some((m: any) => m.key === 'totals'),
            has_h2h: bm.markets?.some((m: any) => m.key === 'h2h'),
            sample_spread: bm.markets?.find((m: any) => m.key === 'spreads')?.outcomes?.find((o: any) => o.name === homeTeam)?.point
          })) || []
        }
        
        gameDebug.closing_query.result = matchingGame ? 
          (matchingGame.bookmakers?.some((b: any) => b.markets?.some((m: any) => m.key === 'spreads')) ? '✅ FOUND SPREAD' : '❌ No spread data') :
          '❌ GAME NOT IN SNAPSHOT'
          
      } catch (err: any) {
        gameDebug.closing_query.error = err.message
      }
      
      debugResults.push(gameDebug)
      await new Promise(r => setTimeout(r, 600))
    }
    
    // Summary
    const openingFound = debugResults.filter(g => g.opening_query.result?.includes('✅')).length
    const closingFound = debugResults.filter(g => g.closing_query.result?.includes('✅')).length
    
    return NextResponse.json({
      summary: {
        games_tested: debugResults.length,
        opening_lines_found: openingFound,
        closing_lines_found: closingFound,
        opening_pct: Math.round(openingFound / debugResults.length * 100),
        closing_pct: Math.round(closingFound / debugResults.length * 100)
      },
      games: debugResults
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

