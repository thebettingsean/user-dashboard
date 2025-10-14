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
  // Determine which sport to show
  const { primary, fallbacks } = getSportPriority()
  
  // Try primary sport first, then fallbacks
  const leagues = [primary, ...fallbacks]
  
  for (const league of leagues) {
    try {
      const { from, to } = getDateRangeForSport(league)
      const games = await fetchGames(league, from, to)
      
      if (games.length === 0) continue
      
      // Get public money data for the first few games
      const gamesWithData = []
      for (const game of games.slice(0, 5)) {
        const publicMoney = await fetchPublicMoney(league, game.game_id)
        if (publicMoney) {
          gamesWithData.push({ game, publicMoney })
        }
      }
      
      if (gamesWithData.length === 0) continue
      
      // Analyze all games to find most public bets across all games
      let allMostPublic: MostPublicBet[] = []
      let allTrends: TopTrend[] = []
      
      for (const { game, publicMoney } of gamesWithData) {
        const mostPublic = findMostPublicBets(game, publicMoney)
        const trends = findTopTrends(game, publicMoney)
        allMostPublic = [...allMostPublic, ...mostPublic]
        allTrends = [...allTrends, ...trends]
      }
      
      // Sort and get top 2 most public bets
      const topMostPublic = allMostPublic
        .sort((a, b) => b.betsPct - a.betsPct)
        .slice(0, 2)
      
      // Get top 2 trends
      const topTrends = allTrends.slice(0, 2)
      
      return {
        mostPublic: topMostPublic,
        topTrends,
        league: league.toUpperCase()
      }
    } catch (error) {
      console.error(`Error fetching data for ${league}:`, error)
      continue
    }
  }
  
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
  // Determine which sport to show
  const { primary, fallbacks } = getSportPriority()
  
  // Try primary sport first, then fallbacks
  const leagues = [primary, ...fallbacks]
  
  for (const league of leagues) {
    try {
      const { from, to } = getDateRangeForSport(league)
      const games = await fetchGames(league, from, to)
      
      if (games.length === 0) continue
      
      // Get referee stats for games that have referees assigned
      const gamesWithRefs = []
      for (const game of games.slice(0, 5)) {
        if (game.referee_id) {
          const refereeStats = await fetchRefereeStats(league, game.game_id)
          if (refereeStats) {
            gamesWithRefs.push({ game, refereeStats })
          }
        }
      }
      
      if (gamesWithRefs.length === 0) continue
      
      // Find top referee trends
      const refereeTrends = findTopRefereeTrends(gamesWithRefs)
      
      // Placeholder team trends
      const teamTrends = [
        { description: 'Eagles rush offense', matchup: '#1 vs #28 defense' },
        { description: 'Ravens home favorite', matchup: '9-1 ATS L10' }
      ]
      
      return {
        refereeTrends,
        teamTrends,
        league: league.toUpperCase()
      }
    } catch (error) {
      console.error(`Error fetching matchup data for ${league}:`, error)
      continue
    }
  }
  
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
