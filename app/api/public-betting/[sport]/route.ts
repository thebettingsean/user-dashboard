// app/api/public-betting/[sport]/route.ts
import { NextResponse } from 'next/server'
import { fetchGames, fetchPublicMoney } from '@/lib/api/sportsData'
import { getDateRangeForSport } from '@/lib/utils/sportSelector'
import { findMostPublicBets, findTopTrends } from '@/lib/utils/dataAnalyzer'

type League = 'nfl' | 'nba' | 'nhl' | 'cfb' | 'cbb'

// Cache per sport with 30-minute TTL
const cache = new Map<League, { data: any, timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sport: string }> }
) {
  try {
    const { sport: sportParam } = await params
    const sport = sportParam.toLowerCase() as League
    
    // Validate sport
    if (!['nfl', 'nba', 'nhl', 'cfb', 'cbb'].includes(sport)) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }

    const now = Date.now()
    
    // Check cache
    const cached = cache.get(sport)
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 Returning cached ${sport.toUpperCase()} public betting data`)
      return NextResponse.json(cached.data)
    }

    console.log(`🔄 Fetching fresh ${sport.toUpperCase()} public betting data...`)

    // Get date range for this sport
    const { from, to } = getDateRangeForSport(sport)
    console.log(`📅 Date range: ${from} to ${to}`)

    // Fetch ALL games for this sport
    const games = await fetchGames(sport, from, to)
    console.log(`🎮 Found ${games.length} games`)

    if (games.length === 0) {
      return NextResponse.json({
        mostPublic: [],
        topTrends: [],
        sport: sport.toUpperCase()
      })
    }

    // Sort games by date (earliest first)
    const sortedGames = [...games].sort((a, b) => {
      const dateA = new Date(a.game_date).getTime()
      const dateB = new Date(b.game_date).getTime()
      return dateA - dateB
    })

    // Fetch public money for all games in parallel
    const publicMoneyPromises = sortedGames.map(async (game) => {
      try {
        const publicMoney = await fetchPublicMoney(sport, game.game_id)
        if (publicMoney) {
          // Add odds data to public money
          publicMoney.away_team_ml = game.odds?.away_team_odds?.moneyline || 0
          publicMoney.home_team_ml = game.odds?.home_team_odds?.moneyline || 0
          publicMoney.away_team_point_spread = game.odds?.spread ? -game.odds.spread : 0
          publicMoney.home_team_point_spread = game.odds?.spread || 0
          return { game, publicMoney }
        }
        return null
      } catch (error) {
        console.error(`Error fetching public money for game ${game.game_id}:`, error)
        return null
      }
    })

    const results = await Promise.all(publicMoneyPromises)
    const gamesWithData = results.filter(r => r !== null) as Array<{ game: any, publicMoney: any }>

    console.log(`💰 Successfully fetched public money for ${gamesWithData.length} games`)

    // Extract all most public bets
    let allMostPublic: any[] = []
    for (const { game, publicMoney } of gamesWithData) {
      const mostPublic = findMostPublicBets(game, publicMoney)
      allMostPublic = [...allMostPublic, ...mostPublic]
    }

    // Extract all trends
    let allTrends: any[] = []
    for (const { game, publicMoney } of gamesWithData) {
      const trends = findTopTrends(game, publicMoney)
      allTrends = [...allTrends, ...trends]
    }

    // Sort and limit
    const topMostPublic = allMostPublic
      .sort((a, b) => b.betsPct - a.betsPct)
      .slice(0, 20) // Top 20

    const sharpMoneyBets = allTrends
      .filter(t => t.type === 'sharp-money')
      .slice(0, 20)

    const vegasBackedBets = allTrends
      .filter(t => t.type === 'vegas-backed')
      .slice(0, 20)

    const responseData = {
      mostPublic: topMostPublic,
      sharpMoney: sharpMoneyBets,
      vegasBacked: vegasBackedBets,
      sport: sport.toUpperCase(),
      totalGames: gamesWithData.length,
      dateRange: { from, to }
    }

    // Cache the data
    cache.set(sport, { data: responseData, timestamp: now })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error(`Error fetching public betting data:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch public betting data' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

