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

    // Calculate best lines for each market
    // Determine who's the favorite by checking spread values (negative = favorite)
    const homeSpreads = spreadsByBook.filter(s => s.side === 'home')
    const awaySpreads = spreadsByBook.filter(s => s.side === 'away')
    
    // Check first spread to determine favorite/underdog
    const homeIsFavorite = homeSpreads.length > 0 && homeSpreads[0].point < 0
    const awayIsFavorite = awaySpreads.length > 0 && awaySpreads[0].point < 0
    
    const bestHomeSpread = getBestSpread(homeSpreads, homeIsFavorite ? 'favorite' : 'underdog')
    const bestAwaySpread = getBestSpread(awaySpreads, awayIsFavorite ? 'favorite' : 'underdog')
    const bestHomeML = getBestMoneyline(moneylinesByBook.filter(m => m.side === 'home'))
    const bestAwayML = getBestMoneyline(moneylinesByBook.filter(m => m.side === 'away'))
    const bestOver = getBestTotal(totalsByBook.filter(t => t.type === 'over'), 'over')
    const bestUnder = getBestTotal(totalsByBook.filter(t => t.type === 'under'), 'under')

    return NextResponse.json({
      success: true,
      game: {
        home_team: gameData.home_team,
        away_team: gameData.away_team,
        commence_time: gameData.commence_time
      },
      best_lines: {
        spreads: {
          home: bestHomeSpread,
          away: bestAwaySpread
        },
        moneylines: {
          home: bestHomeML,
          away: bestAwayML
        },
        totals: {
          over: bestOver,
          under: bestUnder
        }
      },
      all_lines: {
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

// Helper: Get best spread (prioritize line value, then juice)
function getBestSpread(spreads: any[], type: 'favorite' | 'underdog') {
  if (!spreads || spreads.length === 0) return null

  return spreads.reduce((best, current) => {
    if (!best) return current

    const bestPoint = Math.abs(best.point)
    const currentPoint = Math.abs(current.point)

    if (type === 'favorite') {
      // For favorites, want smallest spread (e.g., -2.5 > -3)
      if (currentPoint < bestPoint) return current
      if (currentPoint === bestPoint && current.odds > best.odds) return current // Better juice
    } else {
      // For underdogs, want largest spread (e.g., +3.5 > +3)
      if (currentPoint > bestPoint) return current
      if (currentPoint === bestPoint && current.odds > best.odds) return current // Better juice
    }

    return best
  }, null)
}

// Helper: Get best moneyline (prioritize line value)
function getBestMoneyline(moneylines: any[]) {
  if (!moneylines || moneylines.length === 0) return null

  return moneylines.reduce((best, current) => {
    if (!best) return current

    // If favorite (negative odds), want closest to even (smallest negative, e.g., -140 > -150)
    if (current.odds < 0 && best.odds < 0) {
      return current.odds > best.odds ? current : best
    }

    // If underdog (positive odds), want highest positive (e.g., +160 > +150)
    if (current.odds > 0 && best.odds > 0) {
      return current.odds > best.odds ? current : best
    }

    // Mixed case: prefer underdog (positive odds)
    return current.odds > 0 ? current : best
  }, null)
}

// Helper: Get best total (prioritize line value, then juice)
function getBestTotal(totals: any[], type: 'over' | 'under') {
  if (!totals || totals.length === 0) return null

  return totals.reduce((best, current) => {
    if (!best) return current

    if (type === 'over') {
      // For overs, want lower number (e.g., 47.5 < 48.5)
      if (current.point < best.point) return current
      if (current.point === best.point && current.odds > best.odds) return current // Better juice
    } else {
      // For unders, want higher number (e.g., 48.5 > 47.5)
      if (current.point > best.point) return current
      if (current.point === best.point && current.odds > best.odds) return current // Better juice
    }

    return best
  }, null)
}

