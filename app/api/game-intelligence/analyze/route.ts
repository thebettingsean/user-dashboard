import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { 
  fetchGames, 
  fetchPublicMoney, 
  fetchRefereeStats,
  fetchPlayerProps,
  type League 
} from '@/lib/api/sportsData'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { gameId } = await request.json()
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'gameId is required' },
        { status: 400 }
      )
    }
    
    console.log(`\n=== GENERATING GAME SCRIPT FOR ${gameId} ===`)
    
    // Extract sport from gameId (e.g., "NBA-20251024-LAL-GSW" -> "nba")
    const sport = gameId.split('-')[0].toLowerCase() as League
    
    // Fetch all data for this game
    console.log('Fetching game data...')
    const games = await fetchGames(sport, '2025-10-24', '2025-10-27')
    const game = games.find(g => g.game_id === gameId)
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    console.log('Fetching public money data...')
    const publicMoney = await fetchPublicMoney(sport, gameId)
    
    console.log('Fetching referee stats...')
    const refereeStats = await fetchRefereeStats(sport, gameId)
    
    console.log('Fetching player props...')
    const playerProps = await fetchPlayerProps(sport, gameId)
    
    // Build context for AI
    const context = buildGameContext(game, publicMoney, refereeStats, playerProps)
    
    console.log('Generating AI analysis...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert sports betting analyst. Analyze the provided game data and create a comprehensive "game script" that tells bettors exactly what to bet and why.

Your analysis should:
1. Start with a clear recommendation (e.g., "Lakers -3.5")
2. Assign a confidence score (0-100%)
3. Explain WHY this bet wins using the data provided
4. Highlight any risks or concerns
5. Be conversational but authoritative
6. Use specific numbers and percentages from the data

Format your response as JSON with this structure:
{
  "recommendation": "Team Name Spread/ML/Total",
  "confidence": 89,
  "expectedValue": 12.4,
  "script": "Full analysis text here...",
  "risks": ["Risk 1", "Risk 2"],
  "edgeBreakdown": {
    "sharpMoney": 4.2,
    "refereeTrend": 3.8,
    "propCorrelation": 2.9,
    "analystConsensus": 1.5
  }
}`
        },
        {
          role: "user",
          content: context
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
    
    const analysis = JSON.parse(completion.choices[0].message.content || '{}')
    
    console.log('AI analysis complete!')
    console.log(`Recommendation: ${analysis.recommendation}`)
    console.log(`Confidence: ${analysis.confidence}%`)
    console.log('=== GAME SCRIPT GENERATION COMPLETE ===\n')
    
    return NextResponse.json({
      gameId,
      game: {
        awayTeam: game.away_team,
        homeTeam: game.home_team,
        gameTime: game.game_date,
        sport: sport.toUpperCase()
      },
      analysis
    })
    
  } catch (error) {
    console.error('Error generating game script:', error)
    return NextResponse.json(
      { error: 'Failed to generate game script' },
      { status: 500 }
    )
  }
}

function buildGameContext(
  game: any,
  publicMoney: any,
  refereeStats: any,
  playerProps: any
): string {
  let context = `Game: ${game.away_team} @ ${game.home_team}\n`
  context += `Time: ${game.game_date}\n`
  context += `Odds: ${game.away_team} ${game.odds?.away_team_odds?.moneyline}, ${game.home_team} ${game.odds?.home_team_odds?.moneyline}\n`
  context += `Spread: ${game.odds?.spread}\n`
  context += `Over/Under: ${game.odds?.over_under}\n\n`
  
  // Public Money Data
  if (publicMoney) {
    context += `PUBLIC MONEY:\n`
    context += `Moneyline - Away: ${publicMoney.public_money_ml_away_bets_pct}% of bets, ${publicMoney.public_money_ml_away_stake_pct}% of dollars\n`
    context += `Moneyline - Home: ${publicMoney.public_money_ml_home_bets_pct}% of bets, ${publicMoney.public_money_ml_home_stake_pct}% of dollars\n`
    context += `Spread - Away: ${publicMoney.public_money_spread_away_bets_pct}% of bets, ${publicMoney.public_money_spread_away_stake_pct}% of dollars\n`
    context += `Over: ${publicMoney.public_money_over_bets_pct}% of bets, ${publicMoney.public_money_over_stake_pct}% of dollars\n`
    
    if (publicMoney.sharp_money_stats && publicMoney.sharp_money_stats.length > 0) {
      context += `\nSHARP MONEY:\n`
      publicMoney.sharp_money_stats.slice(0, 3).forEach((sharp: any) => {
        context += `${sharp.bet_type}: ${sharp.sharpness_level} (${sharp.stake_pct}% of big money)\n`
      })
    }
    
    if (publicMoney.rlm_stats && publicMoney.rlm_stats.length > 0) {
      context += `\nREVERSE LINE MOVEMENT:\n`
      publicMoney.rlm_stats.slice(0, 2).forEach((rlm: any) => {
        context += `${rlm.bet_type}: Line moved ${rlm.line_movement}, ${rlm.rlm_percentage}% RLM\n`
      })
    }
    context += `\n`
  }
  
  // Referee Stats
  if (refereeStats && game.referee_name) {
    context += `REFEREE: ${game.referee_name}\n`
    if (refereeStats.moneyline) {
      context += `Moneyline trends: Home ${refereeStats.moneyline.home_win_rate}%, Away ${refereeStats.moneyline.away_win_rate}%\n`
    }
    if (refereeStats.spread) {
      context += `ATS trends: Home ${refereeStats.spread.home_cover_rate}%, Away ${refereeStats.spread.away_cover_rate}%\n`
    }
    if (refereeStats.over_under) {
      context += `O/U trends: Over ${refereeStats.over_under.over_hit_rate}%, Under ${refereeStats.over_under.under_hit_rate}%\n`
    }
    context += `\n`
  }
  
  // Player Props
  if (playerProps && playerProps.length > 0) {
    context += `TOP PLAYER PROPS (65%+ hit rate):\n`
    playerProps.slice(0, 5).forEach((category: any) => {
      category.players.slice(0, 2).forEach((player: any) => {
        const hitRate = (player.record.hit / player.record.total * 100).toFixed(1)
        if (parseFloat(hitRate) >= 65) {
          context += `${player.player_name} ${player.prop_type} ${player.opening_line} ${category.title}: ${hitRate}% (${player.record.hit}-${player.record.miss})\n`
        }
      })
    })
  }
  
  return context
}

export const dynamic = 'force-dynamic'

