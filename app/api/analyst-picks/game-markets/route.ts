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

    // Organize by side for easy UI display
    const homeSpreads = spreadsByBook.filter(s => s.side === 'home')
    const awaySpreads = spreadsByBook.filter(s => s.side === 'away')
    const homeMoneylines = moneylinesByBook.filter(m => m.side === 'home')
    const awayMoneylines = moneylinesByBook.filter(m => m.side === 'away')
    const overs = totalsByBook.filter(t => t.type === 'over')
    const unders = totalsByBook.filter(t => t.type === 'under')

    return NextResponse.json({
      success: true,
      game: {
        home_team: gameData.home_team,
        away_team: gameData.away_team,
        commence_time: gameData.commence_time
      },
      markets: {
        spreads: {
          home: homeSpreads,
          away: awaySpreads
        },
        moneylines: {
          home: homeMoneylines,
          away: awayMoneylines
        },
        totals: {
          over: overs,
          under: unders
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

