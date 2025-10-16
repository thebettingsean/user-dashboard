// lib/api/widgetData.ts
import { fetchGames, fetchPublicMoney, fetchRefereeStats } from './sportsData'
import { getSportPriority, getDateRangeForSport } from '../utils/sportSelector'
import {
  findMostPublicBets,
  findTopTrends,
  findTopRefereeTrends,
  MostPublicBet,
  TopTrend,
  RefereeTrend
} from '../utils/dataAnalyzer'

type League = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'cfb'

export interface StatsWidgetData {
  mostPublic: MostPublicBet[]
  topTrends: TopTrend[]
  league: string
}

export interface MatchupWidgetData {
  refereeTrends: RefereeTrend[]
  teamTrends: Array<{ description: string; matchup: string }>
  league: string
}

// Helper: Fetch public money for multiple games in parallel
async function fetchPublicMoneyParallel(league: League, games: any[]) {
  const promises = games.map(async (game) => {
    const publicMoney = await fetchPublicMoney(league, game.game_id)
    if (publicMoney) {
      // Add odds data
      publicMoney.away_team_ml = game.odds?.away_team_odds?.moneyline || 0
      publicMoney.home_team_ml = game.odds?.home_team_odds?.moneyline || 0
      publicMoney.away_team_point_spread = game.odds?.spread ? -game.odds.spread : 0
      publicMoney.home_team_point_spread = game.odds?.spread || 0
      return { game, publicMoney }
    }
    return null
  })
  
  const results = await Promise.all(promises)
  return results.filter(r => r !== null) as Array<{ game: any, publicMoney: any }>
}

// Get data for the Public Betting widget
export async function getStatsWidgetData(): Promise<StatsWidgetData> {
  const dayOfWeek = new Date().getDay()
  console.log('\n=== STATS WIDGET DEBUG START ===')
  console.log('Current time:', new Date().toISOString())
  console.log('Day of week:', dayOfWeek, '(0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)')
  
  const { primary, fallbacks } = getSportPriority()
  console.log('Primary sport:', primary)
  console.log('Fallback sports:', fallbacks)
  
  const leagues = [primary, ...fallbacks]
  console.log('Will try leagues in order:', leagues)
  
  // OPTIMIZATION: Cache games and public money data across both phases
  const gamesCache = new Map<League, any[]>()
  const publicMoneyCache = new Map<League, Array<{ game: any, publicMoney: any }>>()
  
  // Helper to get or fetch games with public money
  async function getGamesWithData(league: League): Promise<Array<{ game: any, publicMoney: any }>> {
    if (publicMoneyCache.has(league)) {
      return publicMoneyCache.get(league)!
    }
    
    // Fetch games if not cached
    if (!gamesCache.has(league)) {
      const { from, to } = getDateRangeForSport(league)
      const games = await fetchGames(league, from, to)
      gamesCache.set(league, games)
    }
    
    const games = gamesCache.get(league)!
    if (games.length === 0) {
      return []
    }
    
    // OPTIMIZATION: Only fetch 3 games instead of 5, and do it in parallel
    const gamesWithData = await fetchPublicMoneyParallel(league, games.slice(0, 3))
    publicMoneyCache.set(league, gamesWithData)
    
    return gamesWithData
  }
  
  // PHASE 1: Find "Most Public" bets
  let topMostPublic: MostPublicBet[] = []
  let mostPublicLeague = ''
  
  console.log('\n🎯 PHASE 1: Finding Most Public Bets')
  for (const league of leagues) {
    console.log(`\n--- Checking ${league.toUpperCase()} for public bets ---`)
    try {
      const gamesWithData = await getGamesWithData(league)
      
      if (gamesWithData.length === 0) {
        console.log(`No games/data for ${league}`)
        continue
      }
      
      let allMostPublic: MostPublicBet[] = []
      for (const { game, publicMoney } of gamesWithData) {
        const mostPublic = findMostPublicBets(game, publicMoney)
        allMostPublic = [...allMostPublic, ...mostPublic]
      }
      
      if (allMostPublic.length > 0) {
        topMostPublic = allMostPublic.sort((a, b) => b.betsPct - a.betsPct).slice(0, 2)
        mostPublicLeague = league.toUpperCase()
        console.log(`✅ Found ${allMostPublic.length} public bets in ${league.toUpperCase()}`)
        break
      } else {
        console.log(`No public bets for ${league}, trying next sport`)
      }
    } catch (error) {
      console.error(`ERROR in ${league}:`, error)
    }
  }
  
  // PHASE 2: Find trends/indicators (reuses cached data!)
  let topTrends: TopTrend[] = []
  let trendsLeague = ''
  
  console.log('\n📊 PHASE 2: Finding Trends/Indicators')
  for (const league of leagues) {
    console.log(`\n--- Checking ${league.toUpperCase()} for indicators ---`)
    try {
      const gamesWithData = await getGamesWithData(league) // Uses cache!
      
      if (gamesWithData.length === 0) {
        console.log(`No games/data for ${league}`)
        continue
      }
      
      let allTrends: TopTrend[] = []
      for (const { game, publicMoney } of gamesWithData) {
        const trends = findTopTrends(game, publicMoney)
        allTrends = [...allTrends, ...trends]
      }
      
      if (allTrends.length > 0) {
        topTrends = allTrends.slice(0, 2)
        trendsLeague = league.toUpperCase()
        console.log(`✅ Found ${allTrends.length} indicators in ${league.toUpperCase()}`)
        break
      } else {
        console.log(`No indicators for ${league}, trying next sport`)
      }
    } catch (error) {
      console.error(`ERROR in ${league}:`, error)
    }
  }
  
  // If we have either most public OR trends, return it
  if (topMostPublic.length > 0 || topTrends.length > 0) {
    const displayLeague = mostPublicLeague || trendsLeague
    console.log(`\n✅ SUCCESS: Returning data`)
    console.log(`  Most Public from: ${mostPublicLeague || 'None'}`)
    console.log(`  Trends from: ${trendsLeague || 'None'}`)
    console.log('=== STATS WIDGET DEBUG END ===\n')
    
    return {
      mostPublic: topMostPublic.length > 0 ? topMostPublic : [],
      topTrends: topTrends.length > 0 ? topTrends : [],
      league: displayLeague
    }
  }
  
  console.log('WARNING: No data found, returning sample data')
  console.log('=== STATS WIDGET DEBUG END ===\n')
  
  // Fallback to sample data if nothing found
  return {
    mostPublic: [
      { label: 'Cowboys ML', betsPct: 75, dollarsPct: 80 },
      { label: 'Bills -7.5', betsPct: 80, dollarsPct: 90 }
    ],
    topTrends: [
      { type: 'vegas-backed', label: 'Jets +3.5', value: '80% value' },
      { type: 'sharp-money', label: 'Giants ML', value: '+65% difference' }
    ],
    league: 'NFL'
  }
}

// Get data for the Matchup Data widget
export async function getMatchupWidgetData(): Promise<MatchupWidgetData> {
  const dayOfWeek = new Date().getDay()
  console.log('\n=== MATCHUP WIDGET DEBUG START ===')
  console.log('Current time:', new Date().toISOString())
  console.log('Day of week:', dayOfWeek, '(0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)')
  
  const { primary, fallbacks } = getSportPriority()
  console.log('Primary sport:', primary)
  console.log('Fallback sports:', fallbacks)
  
  const leagues = [primary, ...fallbacks]
  console.log('Will try leagues in order:', leagues)
  
  for (const league of leagues) {
    console.log(`\n--- Trying league: ${league.toUpperCase()} ---`)
    try {
      const { from, to } = getDateRangeForSport(league)
      console.log(`Date range: ${from} to ${to}`)
      
      const games = await fetchGames(league, from, to)
      console.log(`Found ${games.length} games for ${league}`)
      
      if (games.length === 0) {
        console.log(`No games for ${league}, moving to next league`)
        continue
      }
      
      console.log(`First game: ${games[0]?.name || 'N/A'}`)
      
      // Get referee stats for games that have referees assigned
      const gamesWithRefs = []
      for (const game of games.slice(0, 5)) {
        if (game.referee_id) {
          console.log(`Fetching referee stats for: ${game.name} (Ref ID: ${game.referee_id})`)
          try {
            const refereeStats = await fetchRefereeStats(league, game.game_id)
            if (refereeStats && refereeStats.over_under) {
              console.log(`✓ Got referee stats for ${game.name}`)
              gamesWithRefs.push({ game, refereeStats })
            } else {
              console.log(`✗ Referee stats missing over_under data for ${game.name}`)
            }
          } catch (error) {
            console.error(`✗ Error fetching referee stats for ${game.game_id}:`, error)
            continue
          }
        } else {
          console.log(`Skipping ${game.name} - no referee assigned yet`)
        }
      }
      
      console.log(`Total games with referee stats: ${gamesWithRefs.length}`)
      
      if (gamesWithRefs.length === 0) {
        console.log(`No referee stats for ${league}, moving to next league`)
        continue
      }
      
      // Find top referee trends
      const refereeTrends = findTopRefereeTrends(gamesWithRefs)
      console.log(`Found ${refereeTrends.length} referee trends`)
      
      // Placeholder team trends
      const teamTrends = [
        { description: 'Eagles rush offense', matchup: '#1 vs #28 defense' },
        { description: 'Ravens home favorite', matchup: '9-1 ATS L10' }
      ]
      
      console.log(`SUCCESS: Returning ${league.toUpperCase()} data`)
      console.log('=== MATCHUP WIDGET DEBUG END ===\n')
      
      return {
        refereeTrends,
        teamTrends,
        league: league.toUpperCase()
      }
    } catch (error) {
      console.error(`ERROR in ${league}:`, error)
      continue
    }
  }
  
  console.log('WARNING: All leagues failed, returning sample data')
  console.log('=== MATCHUP WIDGET DEBUG END ===\n')
  
  // Fallback to sample data if no league has data
  return {
    refereeTrends: [
      { game: 'LAR/SEA', referee: 'Johnson', trend: 'Under 8-2 L10', percentage: 80 },
      { game: 'KC/BUF', referee: 'Smith', trend: 'Over 7-3 L10', percentage: 70 }
    ],
    teamTrends: [
      { description: 'Eagles rush offense', matchup: '#1 vs #28 defense' },
      { description: 'Ravens home favorite', matchup: '9-1 ATS L10' }
    ],
    league: 'NFL'
  }
}