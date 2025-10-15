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
      
      // Get public money data for the first few games
      const gamesWithData = []
      for (const game of games.slice(0, 5)) {
        console.log(`Fetching public money for: ${game.name}`)
        const publicMoney = await fetchPublicMoney(league, game.game_id)
        if (publicMoney) {
          // Add the odds data from the game to the public money data
          publicMoney.away_team_ml = game.odds?.away_team_odds?.moneyline || 0
          publicMoney.home_team_ml = game.odds?.home_team_odds?.moneyline || 0
          // Handle null spreads gracefully
          publicMoney.away_team_point_spread = game.odds?.spread ? -game.odds.spread : 0
          publicMoney.home_team_point_spread = game.odds?.spread || 0
          
          console.log(`✓ Got public money data for ${game.name}`)
          gamesWithData.push({ game, publicMoney })
        } else {
          console.log(`✗ No public money data for ${game.name}`)
        }
      }
      
      console.log(`Total games with public money data: ${gamesWithData.length}`)
      
      if (gamesWithData.length === 0) {
        console.log(`No public money data for ${league}, moving to next league`)
        continue
      }
      
      // Analyze all games to find most public bets across all games
      let allMostPublic: MostPublicBet[] = []
      let allTrends: TopTrend[] = []
      
      for (const { game, publicMoney } of gamesWithData) {
        const mostPublic = findMostPublicBets(game, publicMoney)
        const trends = findTopTrends(game, publicMoney)
        console.log(`Analysis for ${game.name}: ${mostPublic.length} public bets, ${trends.length} trends`)
        allMostPublic = [...allMostPublic, ...mostPublic]
        allTrends = [...allTrends, ...trends]
      }
      
      console.log(`Total most public bets found: ${allMostPublic.length}`)
      console.log(`Total trends found: ${allTrends.length}`)
      
      // We need at least 1 most public bet to show meaningful data
      // Preseason/early games may only have trends but no public betting
      if (allMostPublic.length === 0) {
        console.log(`No 'Most Public' bets for ${league} (may be preseason), moving to next league`)
        continue
      }
      
      // Sort and get top 2 most public bets
      const topMostPublic = allMostPublic
        .sort((a, b) => b.betsPct - a.betsPct)
        .slice(0, 2)
      
      // Get top 2 trends
      const topTrends = allTrends.slice(0, 2)
      
      console.log(`SUCCESS: Returning ${league.toUpperCase()} data`)
      console.log('=== STATS WIDGET DEBUG END ===\n')
      
      return {
        mostPublic: topMostPublic,
        topTrends,
        league: league.toUpperCase()
      }
    } catch (error) {
      console.error(`ERROR in ${league}:`, error)
      continue
    }
  }
  
  console.log('WARNING: All leagues failed, returning sample data')
  console.log('=== STATS WIDGET DEBUG END ===\n')
  
  // Fallback to sample data if no league has data
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