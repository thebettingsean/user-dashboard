/**
 * Fetch markets (spreads, moneylines, totals) for a specific game
 * Used after analyst selects a game
 */

import { NextRequest, NextResponse } from 'next/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY

const SPORT_MAP: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  cfb: 'americanfootball_ncaaf',
  cbb: 'basketball_ncaab',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const oddsApiId = searchParams.get('oddsApiId')
    const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'

    if (!oddsApiId) {
      return NextResponse.json({
        success: false,
        error: 'oddsApiId parameter required'
      }, { status: 400 })
    }

    if (!SPORT_MAP[sport]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sport. Must be: nfl, nba, cfb, or cbb'
      }, { status: 400 })
    }

    if (!ODDS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured'
      }, { status: 500 })
    }

    // Fetch odds for this specific game
    const oddsApiSport = SPORT_MAP[sport]
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events/${oddsApiId}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
    
    const oddsResponse = await fetch(oddsUrl)
    if (!oddsResponse.ok) {
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }

    const gameData = await oddsResponse.json()

    // Organize markets by book
    const bookmakers = gameData.bookmakers || []
    
    // Extract all available books and their odds
    const spreadsByBook: any[] = []
    const moneylinesByBook: any[] = []
    const totalsByBook: any[] = []

    bookmakers.forEach((book: any) => {
      const bookName = book.title

      // Spreads
      const spreadMarket = book.markets?.find((m: any) => m.key === 'spreads')
      if (spreadMarket) {
        spreadMarket.outcomes.forEach((outcome: any) => {
          spreadsByBook.push({
            book: bookName,
            team: outcome.name,
            point: outcome.point,
            odds: outcome.price,
            side: outcome.name === gameData.home_team ? 'home' : 'away'
          })
        })
      }

      // Moneylines
      const h2hMarket = book.markets?.find((m: any) => m.key === 'h2h')
      if (h2hMarket) {
        h2hMarket.outcomes.forEach((outcome: any) => {
          moneylinesByBook.push({
            book: bookName,
            team: outcome.name,
            odds: outcome.price,
            side: outcome.name === gameData.home_team ? 'home' : 'away'
          })
        })
      }

      // Totals
      const totalsMarket = book.markets?.find((m: any) => m.key === 'totals')
      if (totalsMarket) {
        totalsMarket.outcomes.forEach((outcome: any) => {
          totalsByBook.push({
            book: bookName,
            type: outcome.name.toLowerCase(), // 'over' or 'under'
            point: outcome.point,
            odds: outcome.price
          })
        })
      }
    })

    // Group by unique lines (not by book)
    const groupByLine = (markets: any[], keyFn: (m: any) => string) => {
      const grouped = new Map()
      markets.forEach(market => {
        const key = keyFn(market)
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        grouped.get(key).push(market)
      })
      return Array.from(grouped.values())
    }

    // Group spreads by team + point
    const homeSpreadGroups = groupByLine(
      spreadsByBook.filter(s => s.side === 'home'),
      s => `${s.team}|${s.point}`
    )
    const awaySpreadGroups = groupByLine(
      spreadsByBook.filter(s => s.side === 'away'),
      s => `${s.team}|${s.point}`
    )

    // Group moneylines by team
    const homeMLGroups = groupByLine(
      moneylinesByBook.filter(m => m.side === 'home'),
      m => m.team
    )
    const awayMLGroups = groupByLine(
      moneylinesByBook.filter(m => m.side === 'away'),
      m => m.team
    )

    // Group totals by type + point
    const overGroups = groupByLine(
      totalsByBook.filter(t => t.type === 'over'),
      t => `over|${t.point}`
    )
    const underGroups = groupByLine(
      totalsByBook.filter(t => t.type === 'under'),
      t => `under|${t.point}`
    )

    return NextResponse.json({
      success: true,
      game: {
        home_team: gameData.home_team,
        away_team: gameData.away_team,
        commence_time: gameData.commence_time
      },
      markets: {
        spreads: {
          home: homeSpreadGroups,
          away: awaySpreadGroups
        },
        moneylines: {
          home: homeMLGroups,
          away: awayMLGroups
        },
        totals: {
          over: overGroups,
          under: underGroups
        }
      },
      available_books: [...new Set(bookmakers.map((b: any) => b.title))]
    })

  } catch (error: any) {
    console.error('[ANALYST PICKS] Error fetching game markets:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

