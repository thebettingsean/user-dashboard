import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { kv } from '@vercel/kv'
import type { GameIntelligenceData } from '../data/route'
import { TEAM_STATS_GUIDE } from '@/lib/ai/teamrankings-guide'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Cache TTL: 4 hours (14,400 seconds)
const CACHE_TTL = 4 * 60 * 60 // 4 hours in seconds

interface GeneratedScript {
  gameId: string
  script: string
  dataStrength: number
  generatedAt: string
  cached: boolean
}

/**
 * Generates an AI-powered game script based on aggregated data
 * POST /api/game-intelligence/generate
 * Body: { gameId, league, data: GameIntelligenceData }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI service not configured. Please add OPENAI_API_KEY to environment variables.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { gameId, league, data } = body as {
      gameId: string
      league: string
      data: GameIntelligenceData
    }

    if (!gameId || !league || !data) {
      return NextResponse.json(
        { error: 'gameId, league, and data are required' },
        { status: 400 }
      )
    }

    console.log(`\n=== GENERATING AI SCRIPT FOR GAME ${gameId} ===`)
    console.log(`League: ${league}, Data Strength: ${data.dataStrength}`)

    // Get today's date for cache key (ensures fresh cache daily)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const cacheKey = `game-script:${league}:${gameId}:${today}`

    // Check Vercel KV cache first (if configured)
    try {
      const cached = await kv.get<string>(cacheKey)
      if (cached) {
        console.log('✅ Script found in cache - adding 5s delay for UX')
        
        // Artificial 5-second delay so user feels like script is being generated
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        return NextResponse.json({
          gameId,
          script: cached,
          dataStrength: data.dataStrength,
          generatedAt: new Date().toISOString(),
          cached: true
        } as GeneratedScript)
      }
    } catch (kvError) {
      console.warn('⚠️ Cache check failed (KV not configured):', kvError instanceof Error ? kvError.message : 'Unknown error')
      // Continue without cache
    }

    if (!data.game) {
      return NextResponse.json(
        { error: 'Game data not found' },
        { status: 404 }
      )
    }

    // Build the AI prompt based on available data (async now)
    const origin = request.nextUrl.origin
    const prompt = await buildGameScriptPrompt(data, league, origin)

    console.log('Sending request to OpenAI with GPT-4o...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional sports data analyst providing educational content about sports statistics and trends for informational purposes only. Your analysis helps users understand betting markets, player performance data, and game trends. This is for educational and entertainment purposes.

WRITING STYLE - DATA-DENSE NARRATIVE:
1. EVERY SENTENCE must contain at least ONE specific stat (ranking, percentage, exact number)
2. NO FLUFF - if a sentence doesn't have data, delete it
3. Conversational but PACKED: "Ben Johnson is 7-0 ATS after a loss. Road teams off a loss hit 57% ATS with 11% ROI over 3 seasons. The Bengals allow 31.6 PPG (#32) and 143.3 rush yards/game (#27). Bears rank 15th at 24 PPG but 7th in yards/play (5.8). This is a pace and efficiency mismatch."
4. Bold bets inline: "The **Bears -2.5 (Invisible Insider, -112)** capitalizes on..."
5. Connect multiple stats per paragraph: Team Rankings + Referee + Public betting + Props all in one flow
6. Use EXACT numbers from analyst pick: If they say "roadstreaking teams 57% ATS, 11% ROI" → YOU MUST USE THOSE EXACT NUMBERS
7. Props emerge with supporting data: "Brown averages 4.2 YPC against defenses ranked 20-32. Bengals are 27th. **OVER 50.5 rush yards (-110)**"

⚠️ WHEN ANALYST PICKS ARE PROVIDED:
- Seamlessly integrate their insights into YOUR narrative (don't say "the analyst says")
- Format picks naturally: **Bears -2.5 (Invisible Insider, -112)** or **Chase OVER 1.5 TDs (ClaytonW, +185)**
- Use their stats to build YOUR story: "Road teams off a loss are 57% ATS with 11% ROI - that's not noise"
- Extract their key data points and connect them to Team Rankings, props, referee trends
- The analysis should feel like YOU did all the research, with picks credited inline
- Find 3-5 ADDITIONAL plays beyond analyst picks based on the game script you're building

DISCLAIMER: All analysis is for educational and entertainment purposes only. This is not financial or gambling advice.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const script = completion.choices[0]?.message?.content || 'Unable to generate script'
    console.log('✅ Script generated successfully')

    // Cache the result in Vercel KV for 4 hours (if configured)
    try {
      await kv.set(cacheKey, script, { ex: CACHE_TTL })
      console.log(`📦 Script cached for 4 hours with key: ${cacheKey}`)
    } catch (kvError) {
      console.warn('⚠️ Cache write failed (KV not configured):', kvError instanceof Error ? kvError.message : 'Unknown error')
      // Continue without caching
    }

    console.log('=== SCRIPT GENERATION COMPLETE ===\n')

    return NextResponse.json({
      gameId,
      script,
      dataStrength: data.dataStrength,
      generatedAt: new Date().toISOString(),
      cached: false
    } as GeneratedScript)

  } catch (error) {
    console.error('Error generating game script:', error)
    return NextResponse.json(
      { error: 'Failed to generate game script', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Builds a comprehensive prompt for OpenAI based on available data
 */
async function buildGameScriptPrompt(data: GameIntelligenceData, league: string, origin: string): Promise<string> {
  const { game, publicMoney, refereeStats, teamStats, teamRankings, playerProps, propParlayRecs, anytimeTDRecs, fantasyProjections } = data

  if (!game) return ''
  
  // FETCH ANALYST PICKS FOR THIS GAME
  let analystPicks: any[] = []
  try {
    const picksRes = await fetch(`${origin}/api/analyst-library?gameId=${game.game_id}`)
    if (picksRes.ok) {
      const picksData = await picksRes.json()
      analystPicks = picksData.picks || []
      console.log(`✅ Found ${analystPicks.length} analyst picks for this game`)
    }
  } catch (error) {
    console.log('⚠️ Could not fetch analyst picks:', error)
  }

  let prompt = `Analyze this ${league.toUpperCase()} game and provide a comprehensive betting script:\n\n`
  
  // ═══════════════════════════════════════════════════════════════════
  // IN-HOUSE ANALYST PICKS - USE EVERY SPECIFIC DATA POINT
  // ═══════════════════════════════════════════════════════════════════
  if (analystPicks && analystPicks.length > 0) {
    prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    prompt += `📊 IN-HOUSE ANALYST PICKS & DETAILED ANALYSIS:\n`
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    
    analystPicks.forEach((pick: any, index: number) => {
      const analystName = pick.bettor?.name || 'Anonymous'
      prompt += `**ANALYST:** @${analystName}\n`
      prompt += `**PICK:** ${pick.bet_title} (${pick.odds}) via ${pick.sportsbook}\n`
      prompt += `**UNITS:** ${pick.units}\n\n`
      prompt += `**FULL ANALYSIS WITH ALL DATA POINTS:**\n\n`
      prompt += `${pick.analysis}\n\n`
      prompt += `${'-'.repeat(60)}\n\n`
    })
    
    prompt += `🎯 **HOW TO WRITE THIS:**\n\n`
    prompt += `Write one data-dense narrative (1000+ words) where EVERY paragraph has 5-10 specific stats.\n\n`
    
    prompt += `❌ **BAD (FLUFFY) PARAGRAPH:**\n`
    prompt += `"The Bears have a slight edge in this matchup. Their offense has shown the ability to move the ball, while the Bengals' defense has struggled throughout the season. This creates an interesting dynamic that could favor Chicago."\n`
    prompt += `→ NO SPECIFIC DATA. WORTHLESS.\n\n`
    
    prompt += `✅ **GOOD (DATA-DENSE) PARAGRAPH:**\n`
    prompt += `"The **Bears -2.5 (Invisible Insider, -112)** capitalizes on a massive defensive mismatch. Cincinnati allows 31.6 PPG (#32), 143.3 rush yards/game (#27), and ranks 29th in 3rd down defense (44.2%). The Bears score 24 PPG (#15), but their 5.8 yards/play (#7) suggests efficiency that exceeds their scoring rank. Ben Johnson is 7-0 ATS as an OC after a loss. Road teams off a loss hit 57% ATS with 11% ROI over the last three seasons. Public is on Cincinnati (58% of bets, 57% of money) despite the statistical mismatch."\n`
    prompt += `→ 10+ SPECIFIC STATS IN ONE PARAGRAPH. THIS IS WHAT WE NEED.\n\n`
    
    prompt += `**EVERY PARAGRAPH SHOULD LOOK LIKE THE GOOD EXAMPLE.**\n\n`
    prompt += `- Extract EVERY stat from analyst analysis (exact ATS records, ROI, weather, trends)\n`
    prompt += `- Use EVERY Team Rankings stat provided (PPG, yards/play, 3rd down %, red zone %, passing/rushing ranks)\n`
    prompt += `- Include referee O/U record, spread tendencies if available\n`
    prompt += `- Cite public betting %s, RLM, sharp action\n`
    prompt += `- Support every prop with 3-4 stats minimum\n\n`
    prompt += `**NO SECTION HEADERS. NO FLUFF. JUST DATA-PACKED NARRATIVE.**\n\n`
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  }
  
  // First, inject the team statistics interpretation guide
  prompt += TEAM_STATS_GUIDE
  prompt += `\n\n═══════════════════════════════════════════════════════════════════════════════\n\n`
  
  // Fetch analyst write-ups from the library (30 examples for comprehensive training)
  try {
    const analystResponse = await fetch(
      `${origin}/api/analyst-library?sport=${league.toUpperCase()}&limit=30`,
      { cache: 'no-store' }
    )
    
    if (analystResponse.ok) {
      const { writeups } = await analystResponse.json()
      
      if (writeups && writeups.length > 0) {
        prompt += `**📚 LEARN FROM THESE ${writeups.length} WINNING ANALYST WRITE-UPS:**\n\n`
        prompt += `Study how these analysts connect data points to create actionable insights. Notice:\n`
        prompt += `- How they cite specific stats with context AND ranks (e.g., "Cardinals rank 20th in dropback EPA")\n`
        prompt += `- How they explain WHY a stat matters with causal logic (e.g., "No Fred Warner (#1 LB coverage) → TEs see softer coverage → TE receiving yards OVER")\n`
        prompt += `- How they connect multiple data points into a cohesive narrative\n`
        prompt += `- How they use historical trends and systems to support their thesis\n`
        prompt += `- How they identify exploitable mismatches (Top 5 offense vs Bottom 10 defense)\n\n`
        
        // Show first 5 in detail, then summarize the rest
        const detailedExamples = writeups.slice(0, 5)
        detailedExamples.forEach((writeup: any, index: number) => {
          prompt += `**Example ${index + 1}: ${writeup.bet_title} (${writeup.bet_type}) - WON**\n`
          prompt += `${writeup.analysis}\n\n`
        })
        
        if (writeups.length > 5) {
          prompt += `\n**[${writeups.length - 5} additional winning examples available for pattern recognition]**\n\n`
        }
        
        prompt += `---\n\n`
        prompt += `**NOW ANALYZE THE CURRENT GAME USING THESE SAME TECHNIQUES:**\n\n`
        prompt += `🚨 CRITICAL REQUIREMENTS (MUST FOLLOW):\n\n`
        prompt += `1. **NO FLUFF INTROS**: Skip "In this NFL showdown" or "A deep dive into". START with the best data point immediately.\n`
        prompt += `2. **NEVER MENTION "TEAMRANKINGS" OR "TEAM RANKINGS"**: Say "Statistical analysis", "Team ranks", or just cite the stat directly\n`
        prompt += `3. **NEVER INVENT PLAYER PROPS**: ONLY suggest props that exist in playerProps, propParlayRecs, or anytimeTDRecs data below\n`
        prompt += `4. **CONNECT MULTIPLE DATA POINTS**: Always link spread → game script → team stats → props\n`
        prompt += `   Example: "Rams -6.5 + elite rushing offense (128 YPG, #8) → early lead → run-heavy 2nd half → Stafford UNDER pass attempts"\n`
        prompt += `5. **USE SPREAD TO EXPLAIN GAME SCRIPT**: If a team is -7 or more, explain early lead implications\n`
        prompt += `6. **Cite specific ranks**: "Patriots rank 28th in yards/play (4.9)" not "Patriots have a weak offense"\n`
        prompt += `7. **Explain causal chains**: Low 3rd down % → stalled drives → fewer possessions → UNDER total\n`
        prompt += `8. **Identify exploitable mismatches**: When Top 10 meets Bottom 10, THIS IS WHERE VALUE EXISTS\n`
        prompt += `9. **Bold all specific plays/bets**: Any prop, spread, or total you're highlighting (but ONLY if it exists in the data)\n`
        prompt += `10. **MINIMUM 400 WORDS**: Deep, data-packed analysis. Every sentence has a specific stat.\n`
        prompt += `11. **Write like a sharp texting a friend**: Direct, confident, data-heavy. Not an AI essay.\n`
        prompt += `12. **CITE EXACT NUMBERS**: Never say "strong" or "high-scoring" - say "28.4 PPG (#3 in NFL)" or "67% ATS"\n\n`
        prompt += `⚠️ IF NO GOOD PROPS EXIST IN THE DATA: Focus on spreads, totals, or general matchup analysis. DO NOT make up props!\n\n`
      }
    }
  } catch (error) {
    console.log('⚠️ Could not fetch analyst write-ups, proceeding without examples')
  }
  
  // Game basics
  prompt += `**GAME:** ${game.away_team} @ ${game.home_team}\n`
  prompt += `**TIME:** ${new Date(game.game_date).toLocaleString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })}\n\n`
  
  // NARRATIVE FLOW - NO SEPARATE INTRO
  prompt += `**🎯 START YOUR NARRATIVE:**\n`
  prompt += `Begin naturally by setting context - what's the spread, why is this game interesting, what immediately jumps out from the data?\n`
  prompt += `Then flow into your analysis, introducing plays as they emerge from the story you're telling.\n\n`
  prompt += `Example opening: "The Bears are 2.5-point favorites visiting Cincinnati, and this line feels tight until you see the defensive numbers. The Bengals are allowing 31.6 PPG (#32 in the league) while Chicago, despite being middle-of-the-pack at 24 PPG (#15), has shown the ability to exploit weak defenses..."\n\n`

  // Odds (with null checks)
  if (game.odds && game.odds.spread !== undefined) {
    prompt += `**CURRENT ODDS:**\n`
    prompt += `- Spread: ${game.home_team} ${game.odds.spread > 0 ? '+' : ''}${game.odds.spread}\n`
    prompt += `- Over/Under: ${game.odds.over_under}\n`
    if (game.odds.away_team_odds && game.odds.home_team_odds) {
      prompt += `- Moneyline: ${game.away_team} ${game.odds.away_team_odds.moneyline > 0 ? '+' : ''}${game.odds.away_team_odds.moneyline} | ${game.home_team} ${game.odds.home_team_odds.moneyline > 0 ? '+' : ''}${game.odds.home_team_odds.moneyline}\n`
    }
    prompt += `\n`
  }

  // Public money data
  if (publicMoney) {
    prompt += `**PUBLIC MONEY TRENDS:**\n`
    prompt += `Moneyline:\n`
    prompt += `- ${game.away_team}: ${publicMoney.public_money_ml_away_bets_pct}% of bets, ${publicMoney.public_money_ml_away_stake_pct}% of money\n`
    prompt += `- ${game.home_team}: ${publicMoney.public_money_ml_home_bets_pct}% of bets, ${publicMoney.public_money_ml_home_stake_pct}% of money\n`
    prompt += `\nSpread:\n`
    prompt += `- ${game.away_team}: ${publicMoney.public_money_spread_away_bets_pct}% of bets, ${publicMoney.public_money_spread_away_stake_pct}% of money\n`
    prompt += `- ${game.home_team}: ${publicMoney.public_money_spread_home_bets_pct}% of bets, ${publicMoney.public_money_spread_home_stake_pct}% of money\n`
    prompt += `\nOver/Under:\n`
    prompt += `- Over: ${publicMoney.public_money_over_bets_pct}% of bets, ${publicMoney.public_money_over_stake_pct}% of money\n`
    prompt += `- Under: ${publicMoney.public_money_under_bets_pct}% of bets, ${publicMoney.public_money_under_stake_pct}% of money\n\n`

    // Sharp money indicators
    if (publicMoney.sharp_money_stats && publicMoney.sharp_money_stats.length > 0) {
      prompt += `**SHARP MONEY:**\n`
      publicMoney.sharp_money_stats.slice(0, 3).forEach(sharp => {
        prompt += `- ${sharp.bet_type}: ${sharp.sharpness_level} sharp action detected\n`
      })
      prompt += `\n`
    }

    // RLM indicators
    if (publicMoney.rlm_stats && publicMoney.rlm_stats.length > 0) {
      prompt += `**REVERSE LINE MOVEMENT:**\n`
      publicMoney.rlm_stats.slice(0, 2).forEach(rlm => {
        prompt += `- ${rlm.bet_type}: Line moved ${rlm.line_movement > 0 ? 'up' : 'down'} despite ${rlm.percentage}% public backing\n`
      })
      prompt += `\n`
    }
  }

  // Referee stats
  if (refereeStats && game.referee_name) {
    prompt += `**REFEREE: ${game.referee_name}**\n`
    if (refereeStats.over_under_trends) {
      const ouTrend = refereeStats.over_under_trends
      prompt += `- O/U Trend: ${ouTrend.over_record} (${ouTrend.over_percentage}%) | ${ouTrend.under_record} (${ouTrend.under_percentage}%)\n`
    }
    if (refereeStats.spread_trends) {
      const spreadTrend = refereeStats.spread_trends
      prompt += `- Spread: Home ${spreadTrend.home_cover_percentage}% ATS | Away ${spreadTrend.away_cover_percentage}% ATS\n`
    }
    prompt += `\n`
  }

  // Team stats (historical performance) - ATS ONLY (O/U is unreliable)
  if (teamStats) {
    prompt += `**TEAM TRENDS:**\n`
    const { homeTeam, awayTeam } = teamStats
    
    // Home team stats
    prompt += `${homeTeam.name} (Home):\n`
    const homeML = homeTeam.asHome.moneyline
    const homeSpread = homeTeam.asHome.spread
    prompt += `- Moneyline at home: ${homeML.wins}-${homeML.losses} (${homeML.roi.toFixed(1)}% ROI)\n`
    prompt += `- ATS at home: ${homeSpread.wins}-${homeSpread.losses} (${homeSpread.roi.toFixed(1)}% ROI)\n`
    
    // Away team stats
    prompt += `${awayTeam.name} (Away):\n`
    const awayML = awayTeam.asAway.moneyline
    const awaySpread = awayTeam.asAway.spread
    prompt += `- Moneyline on road: ${awayML.wins}-${awayML.losses} (${awayML.roi.toFixed(1)}% ROI)\n`
    prompt += `- ATS on road: ${awaySpread.wins}-${awaySpread.losses} (${awaySpread.roi.toFixed(1)}% ROI)\n\n`
  }

  // Detailed team stats (matchup analysis) - THIS IS CRITICAL DATA
  if (teamRankings && teamRankings.home && teamRankings.away) {
    prompt += `**🔥 STATISTICAL MATCHUP ANALYSIS (CRITICAL FOR PROPS & TOTALS):**\n`
    const homeRank = teamRankings.home
    const awayRank = teamRankings.away
    
    // NFL-specific key stats - EXPANDED for deeper analysis
    if (league.toLowerCase() === 'nfl') {
      prompt += `\n**${game.home_team} OFFENSE vs ${game.away_team} DEFENSE:**\n`
      if (homeRank.offense['points_game']) {
        prompt += `- ${game.home_team} scores ${homeRank.offense['points_game'].value} PPG (Rank: #${homeRank.offense['points_game'].rank})\n`
      }
      if (awayRank.defense['opp_points_game']) {
        prompt += `- ${game.away_team} allows ${awayRank.defense['opp_points_game'].value} PPG (Rank: #${awayRank.defense['opp_points_game'].rank})\n`
      }
      if (homeRank.offense['yards_play']) {
        prompt += `- ${game.home_team} Yards/Play: ${homeRank.offense['yards_play'].value} (Rank: #${homeRank.offense['yards_play'].rank})\n`
      }
      if (awayRank.defense['opp_yards_play']) {
        prompt += `- ${game.away_team} Opp Yards/Play: ${awayRank.defense['opp_yards_play'].value} (Rank: #${awayRank.defense['opp_yards_play'].rank})\n`
      }
      if (homeRank.offense['3d_conversion']) {
        prompt += `- ${game.home_team} 3rd Down %: ${homeRank.offense['3d_conversion'].value}% (Rank: #${homeRank.offense['3d_conversion'].rank})\n`
      }
      if (awayRank.defense['opp_3d_conv']) {
        prompt += `- ${game.away_team} Opp 3rd Down %: ${awayRank.defense['opp_3d_conv'].value}% (Rank: #${awayRank.defense['opp_3d_conv'].rank})\n`
      }
      if (homeRank.offense['rz_scoring_td']) {
        prompt += `- ${game.home_team} Red Zone TD %: ${homeRank.offense['rz_scoring_td'].value}% (Rank: #${homeRank.offense['rz_scoring_td'].rank})\n`
      }
      if (awayRank.defense['opp_rz_scoring_td']) {
        prompt += `- ${game.away_team} Opp Red Zone TD %: ${awayRank.defense['opp_rz_scoring_td'].value}% (Rank: #${awayRank.defense['opp_rz_scoring_td'].rank})\n`
      }
      
      // Passing game matchup
      prompt += `\n**PASSING GAME MATCHUP:**\n`
      if (homeRank.offense['pass_yards_game']) {
        prompt += `- ${game.home_team} Pass Yards/Game: ${homeRank.offense['pass_yards_game'].value} (Rank: #${homeRank.offense['pass_yards_game'].rank})\n`
      }
      if (awayRank.defense['opp_pass_yards_game']) {
        prompt += `- ${game.away_team} Opp Pass Yards/Game: ${awayRank.defense['opp_pass_yards_game'].value} (Rank: #${awayRank.defense['opp_pass_yards_game'].rank})\n`
      }
      if (homeRank.offense['yards_pass']) {
        prompt += `- ${game.home_team} Yards/Pass: ${homeRank.offense['yards_pass'].value} (Rank: #${homeRank.offense['yards_pass'].rank})\n`
      }
      if (awayRank.defense['opp_yards_pass']) {
        prompt += `- ${game.away_team} Opp Yards/Pass: ${awayRank.defense['opp_yards_pass'].value} (Rank: #${awayRank.defense['opp_yards_pass'].rank})\n`
      }
      if (awayRank.defense['sack']) {
        prompt += `- ${game.away_team} Sack %: ${awayRank.defense['sack'].value}% (Rank: #${awayRank.defense['sack'].rank}) **[Key for QB props]**\n`
      }
      if (homeRank.offense['qb_sacked']) {
        prompt += `- ${game.home_team} QB Sacked %: ${homeRank.offense['qb_sacked'].value}% (Rank: #${homeRank.offense['qb_sacked'].rank}) **[Key for QB props]**\n`
      }
      
      // Rushing game matchup
      prompt += `\n**RUSHING GAME MATCHUP:**\n`
      if (homeRank.offense['rush_yards_game']) {
        prompt += `- ${game.home_team} Rush Yards/Game: ${homeRank.offense['rush_yards_game'].value} (Rank: #${homeRank.offense['rush_yards_game'].rank})\n`
      }
      if (awayRank.defense['opp_rush_yards_game']) {
        prompt += `- ${game.away_team} Opp Rush Yards/Game: ${awayRank.defense['opp_rush_yards_game'].value} (Rank: #${awayRank.defense['opp_rush_yards_game'].rank})\n`
      }
      if (homeRank.offense['yards_rush']) {
        prompt += `- ${game.home_team} Yards/Rush: ${homeRank.offense['yards_rush'].value} (Rank: #${homeRank.offense['yards_rush'].rank})\n`
      }
      if (awayRank.defense['opp_yards_rush']) {
        prompt += `- ${game.away_team} Opp Yards/Rush: ${awayRank.defense['opp_yards_rush'].value} (Rank: #${awayRank.defense['opp_yards_rush'].rank})\n`
      }
      
      // Away team offense vs Home team defense
      prompt += `\n**${game.away_team} OFFENSE vs ${game.home_team} DEFENSE:**\n`
      if (awayRank.offense['points_game']) {
        prompt += `- ${game.away_team} scores ${awayRank.offense['points_game'].value} PPG (Rank: #${awayRank.offense['points_game'].rank})\n`
      }
      if (homeRank.defense['opp_points_game']) {
        prompt += `- ${game.home_team} allows ${homeRank.defense['opp_points_game'].value} PPG (Rank: #${homeRank.defense['opp_points_game'].rank})\n`
      }
      if (awayRank.offense['3d_conversion']) {
        prompt += `- ${game.away_team} 3rd Down %: ${awayRank.offense['3d_conversion'].value}% (Rank: #${awayRank.offense['3d_conversion'].rank})\n`
      }
      if (homeRank.defense['opp_3d_conv']) {
        prompt += `- ${game.home_team} Opp 3rd Down %: ${homeRank.defense['opp_3d_conv'].value}% (Rank: #${homeRank.defense['opp_3d_conv'].rank})\n`
      }
    }
    
    // NBA-specific key stats - EXPANDED for deeper analysis
    if (league.toLowerCase() === 'nba') {
      prompt += `\n**${game.home_team} OFFENSE vs ${game.away_team} DEFENSE:**\n`
      if (homeRank.offense['points_game']) {
        prompt += `- ${game.home_team} scores ${homeRank.offense['points_game'].value} PPG (Rank: #${homeRank.offense['points_game'].rank})\n`
      }
      if (awayRank.defense['opp_points_game']) {
        prompt += `- ${game.away_team} allows ${awayRank.defense['opp_points_game'].value} PPG (Rank: #${awayRank.defense['opp_points_game'].rank})\n`
      }
      if (homeRank.offense['effective_fg_pct']) {
        prompt += `- ${game.home_team} eFG%: ${homeRank.offense['effective_fg_pct'].value}% (Rank: #${homeRank.offense['effective_fg_pct'].rank})\n`
      }
      if (awayRank.defense['opp_effective_fg_pct']) {
        prompt += `- ${game.away_team} Opp eFG%: ${awayRank.defense['opp_effective_fg_pct'].value}% (Rank: #${awayRank.defense['opp_effective_fg_pct'].rank})\n`
      }
      
      prompt += `\n**SCORING BREAKDOWN:**\n`
      if (homeRank.offense['points_in_paint_game']) {
        prompt += `- ${game.home_team} Points in Paint/Game: ${homeRank.offense['points_in_paint_game'].value} (Rank: #${homeRank.offense['points_in_paint_game'].rank})\n`
      }
      if (awayRank.defense['opp_points_in_paint_game']) {
        prompt += `- ${game.away_team} Opp Points in Paint/Game: ${awayRank.defense['opp_points_in_paint_game'].value} (Rank: #${awayRank.defense['opp_points_in_paint_game'].rank})\n`
      }
      if (homeRank.offense['fastbreak_points_game']) {
        prompt += `- ${game.home_team} Fastbreak Pts/Game: ${homeRank.offense['fastbreak_points_game'].value} (Rank: #${homeRank.offense['fastbreak_points_game'].rank}) **[Key for pace]**\n`
      }
      if (homeRank.offense['three_pm_game']) {
        prompt += `- ${game.home_team} 3PM/Game: ${homeRank.offense['three_pm_game'].value} (Rank: #${homeRank.offense['three_pm_game'].rank})\n`
      }
      if (awayRank.defense['opp_three_pm_game']) {
        prompt += `- ${game.away_team} Opp 3PM/Game: ${awayRank.defense['opp_three_pm_game'].value} (Rank: #${awayRank.defense['opp_three_pm_game'].rank})\n`
      }
      if (homeRank.offense['three_point_pct']) {
        prompt += `- ${game.home_team} 3PT%: ${homeRank.offense['three_point_pct'].value}% (Rank: #${homeRank.offense['three_point_pct'].rank})\n`
      }
      
      prompt += `\n**ASSISTS & BALL MOVEMENT:**\n`
      if (homeRank.offense['assists_game']) {
        prompt += `- ${game.home_team} Assists/Game: ${homeRank.offense['assists_game'].value} (Rank: #${homeRank.offense['assists_game'].rank}) **[Key for ball movement]**\n`
      }
      if (awayRank.defense['opp_assists_game']) {
        prompt += `- ${game.away_team} Opp Assists/Game: ${awayRank.defense['opp_assists_game'].value} (Rank: #${awayRank.defense['opp_assists_game'].rank})\n`
      }
      if (homeRank.offense['assists_turnover']) {
        prompt += `- ${game.home_team} Ast/TO Ratio: ${homeRank.offense['assists_turnover'].value} (Rank: #${homeRank.offense['assists_turnover'].rank})\n`
      }
      
      prompt += `\n**REBOUNDING MATCHUP:**\n`
      if (homeRank.offense['total_rebounds_game']) {
        prompt += `- ${game.home_team} Total Reb/Game: ${homeRank.offense['total_rebounds_game'].value} (Rank: #${homeRank.offense['total_rebounds_game'].rank})\n`
      }
      if (awayRank.defense['opp_total_rebounds_game']) {
        prompt += `- ${game.away_team} Opp Total Reb/Game: ${awayRank.defense['opp_total_rebounds_game'].value} (Rank: #${awayRank.defense['opp_total_rebounds_game'].rank})\n`
      }
      if (homeRank.offense['offensive_rebound_pct']) {
        prompt += `- ${game.home_team} Off Reb %: ${homeRank.offense['offensive_rebound_pct'].value}% (Rank: #${homeRank.offense['offensive_rebound_pct'].rank}) **[Key for 2nd chance pts]**\n`
      }
      
      prompt += `\n**${game.away_team} OFFENSE vs ${game.home_team} DEFENSE:**\n`
      if (awayRank.offense['points_game']) {
        prompt += `- ${game.away_team} scores ${awayRank.offense['points_game'].value} PPG (Rank: #${awayRank.offense['points_game'].rank})\n`
      }
      if (homeRank.defense['opp_points_game']) {
        prompt += `- ${game.home_team} allows ${homeRank.defense['opp_points_game'].value} PPG (Rank: #${homeRank.defense['opp_points_game'].rank})\n`
      }
      if (awayRank.offense['three_pm_game']) {
        prompt += `- ${game.away_team} 3PM/Game: ${awayRank.offense['three_pm_game'].value} (Rank: #${awayRank.offense['three_pm_game'].rank})\n`
      }
      if (homeRank.defense['opp_three_pm_game']) {
        prompt += `- ${game.home_team} Opp 3PM/Game: ${homeRank.defense['opp_three_pm_game'].value} (Rank: #${homeRank.defense['opp_three_pm_game'].rank})\n`
      }
    }
    
    // Add ATS results for situational context
    if (homeRank.atsResults && homeRank.atsResults.length > 0) {
      prompt += `\n**📊 ${game.home_team.toUpperCase()} RECENT ATS RESULTS (GAME-BY-GAME CONTEXT):**\n`
      homeRank.atsResults.slice(0, 5).forEach((game: any) => {
        const coverEmoji = game.covered ? '✅' : '❌'
        prompt += `${coverEmoji} ${game.date} | ${game.location} vs ${game.opponent} (Rank #${game.opponent_rank || 'N/A'}) | Line: ${game.team_line} | ${game.result} | ATS Diff: ${game.ats_diff}\n`
      })
      prompt += `\n`
    }
    
    if (awayRank.atsResults && awayRank.atsResults.length > 0) {
      prompt += `**📊 ${game.away_team.toUpperCase()} RECENT ATS RESULTS (GAME-BY-GAME CONTEXT):**\n`
      awayRank.atsResults.slice(0, 5).forEach((atsGame: any) => {
        const coverEmoji = atsGame.covered ? '✅' : '❌'
        prompt += `${coverEmoji} ${atsGame.date} | ${atsGame.location} vs ${atsGame.opponent} (Rank #${atsGame.opponent_rank || 'N/A'}) | Line: ${atsGame.team_line} | ${atsGame.result} | ATS Diff: ${atsGame.ats_diff}\n`
      })
      prompt += `\n`
    }
    
    prompt += `\n`
  }

  // Player props - PRIORITIZE QB/RB/WR, show kickers last
  if (playerProps && playerProps.length > 0) {
    // Separate skill position props from kicking props
    const skillPositionProps = playerProps.filter(cat => 
      !cat.title.toLowerCase().includes('kick') && 
      !cat.title.toLowerCase().includes('field goal')
    )
    const kickingProps = playerProps.filter(cat => 
      cat.title.toLowerCase().includes('kick') || 
      cat.title.toLowerCase().includes('field goal')
    )

    // Show skill position props first (QB, RB, WR, TE)
    if (skillPositionProps.length > 0) {
      prompt += `**🎯 TOP SKILL POSITION PROPS (QB/RB/WR/TE):**\n`
      skillPositionProps.slice(0, 8).forEach(category => { // Show more categories
        const topPlayers = category.players.slice(0, 4) // Show more players per category
        if (topPlayers.length > 0) {
          prompt += `\n**${category.title}:**\n`
          topPlayers.forEach(player => {
            const hitRate = ((player.record.hit / player.record.total) * 100).toFixed(1)
            const odds = player.best_line?.opening_odds || 'N/A'
            const formattedOdds = odds !== 'N/A' ? (odds > 0 ? `+${odds}` : `${odds}`) : 'N/A'
            prompt += `- ${player.player_name}: ${player.prop_type} ${player.opening_line} (${formattedOdds}) | Hit Rate: ${hitRate}% (${player.record.hit}-${player.record.miss})\n`
          })
        }
      })
      prompt += `\n`
    }

    // Show kicking props at the end (lower priority)
    if (kickingProps.length > 0) {
      prompt += `**⚽ KICKING PROPS (SECONDARY PLAYS):**\n`
      kickingProps.forEach(category => {
        const topPlayers = category.players.slice(0, 2)
        if (topPlayers.length > 0) {
          prompt += `${category.title}:\n`
          topPlayers.forEach(player => {
            const hitRate = ((player.record.hit / player.record.total) * 100).toFixed(1)
            const odds = player.best_line?.opening_odds || 'N/A'
            const formattedOdds = odds !== 'N/A' ? (odds > 0 ? `+${odds}` : `${odds}`) : 'N/A'
            prompt += `- ${player.player_name}: ${player.prop_type} ${player.opening_line} (${formattedOdds}) | Hit Rate: ${hitRate}% (${player.record.hit}-${player.record.miss})\n`
          })
        }
      })
      prompt += `\n`
    }
  }

  // PROPRIETARY TOOL DATA (Highest priority - this is OUR edge)
  if (propParlayRecs && propParlayRecs.length > 0) {
    // Separate ultra-safe props (90%+) from regular props
    const safetyParlay = propParlayRecs.filter(rec => {
      if (!rec.record) return false
      const hitRate = (rec.record.hit / rec.record.total) * 100
      return hitRate >= 90 && rec.record.total >= 10 // 90%+ with 10+ games
    })
    
    const regularProps = propParlayRecs.filter(rec => {
      if (!rec.record) return true
      const hitRate = (rec.record.hit / rec.record.total) * 100
      return hitRate < 90 || rec.record.total < 10
    })

    // Show safety parlay first (ultra-high confidence)
    if (safetyParlay.length > 0) {
      prompt += `**🛡️ SAFETY PARLAY (90%+ HIT RATE - ELITE PROPS):**\n`
      prompt += `These props have exceptional historical performance and can be parlayed for a safe, high-confidence play:\n\n`
      safetyParlay.slice(0, 4).forEach((rec, idx) => {
        const hitRate = rec.record ? ((rec.record.hit / rec.record.total) * 100).toFixed(1) : 'N/A'
        const record = rec.record ? `${rec.record.hit}-${rec.record.miss}` : 'N/A'
        const odds = rec.best_line?.opening_odds || 'N/A'
        const formattedOdds = odds !== 'N/A' ? (odds > 0 ? `+${odds}` : `${odds}`) : 'N/A'
        prompt += `${idx + 1}. ${rec.player_name} - ${rec.prop_type} ${rec.opening_line || 'TBD'} (${formattedOdds})\n`
        prompt += `   🔥 Hit Rate: ${hitRate}% | Record: ${record} | Games: ${rec.record.total}\n`
      })
      
      // Calculate parlay odds if we have 2+ props
      if (safetyParlay.length >= 2) {
        const parlayHitRate = safetyParlay.slice(0, 4).reduce((acc, rec) => {
          const hitRate = rec.record ? (rec.record.hit / rec.record.total) : 0.5
          return acc * hitRate
        }, 1) * 100
        prompt += `\n💎 **PARLAY THESE TOGETHER**: ${parlayHitRate.toFixed(1)}% combined hit rate (based on historical independence)\n`
      }
      prompt += `\n`
    }

    // Show regular prop recommendations
    if (regularProps.length > 0) {
      prompt += `**🔥 ADDITIONAL PROP RECOMMENDATIONS:**\n`
      prompt += `High-value plays with strong historical performance:\n`
      regularProps.slice(0, 5).forEach((rec, idx) => {
        const hitRate = rec.record ? ((rec.record.hit / rec.record.total) * 100).toFixed(1) : 'N/A'
        const record = rec.record ? `${rec.record.hit}-${rec.record.miss}` : 'N/A'
        const odds = rec.best_line?.opening_odds || 'N/A'
        const formattedOdds = odds !== 'N/A' ? (odds > 0 ? `+${odds}` : `${odds}`) : 'N/A'
        prompt += `${idx + 1}. ${rec.player_name} (${rec.team_id || 'Team TBD'}) - ${rec.prop_type} ${rec.opening_line || 'TBD'} (${formattedOdds})\n`
        prompt += `   Hit Rate: ${hitRate}% | Record: ${record}\n`
      })
      prompt += `\n`
    }
  }

  if (anytimeTDRecs && anytimeTDRecs.length > 0) {
    prompt += `**🏈 ANYTIME TD TOOL RECOMMENDATIONS (PROPRIETARY):**\n`
    prompt += `Our anytime TD tool has flagged these touchdown opportunities:\n`
    anytimeTDRecs.slice(0, 5).forEach((rec, idx) => {
      const hitRate = rec.historical_data?.hit_rate ? (rec.historical_data.hit_rate * 100).toFixed(1) : 'N/A'
      const gamesPlayed = rec.historical_data?.games_played || 'N/A'
      prompt += `${idx + 1}. ${rec.player_name} (${rec.team || 'Team TBD'}) - ${rec.position || 'N/A'}\n`
      prompt += `   TD Hit Rate: ${hitRate}% over ${gamesPlayed} games | Odds: ${rec.odds || 'TBD'}\n`
    })
    prompt += `\n`
  }

  if (fantasyProjections && fantasyProjections.length > 0) {
    prompt += `**📊 FANTASY PROJECTIONS (Supporting Context):**\n`
    prompt += `Top projected performers for this game:\n`
    fantasyProjections.slice(0, 5).forEach((proj, idx) => {
      prompt += `${idx + 1}. ${proj.player_name} (${proj.team || 'Team TBD'}) - ${proj.position || 'N/A'}\n`
      prompt += `   Projected Points: ${proj.projected_pts || 'N/A'} | Historical Avg: ${proj.avg_pts_above_projected || 'N/A'}\n`
    })
    prompt += `\n`
  }

  // CRITICAL: Extract actual player names from the data to prevent hallucinations
  const actualPlayers = new Set<string>()
  
  // Collect all real player names from the data
  if (playerProps && playerProps.length > 0) {
    playerProps.forEach(category => {
      category.players.forEach(player => {
        actualPlayers.add(player.player_name)
      })
    })
  }
  if (propParlayRecs && propParlayRecs.length > 0) {
    propParlayRecs.forEach(rec => {
      if (rec.player_name) actualPlayers.add(rec.player_name)
    })
  }
  if (anytimeTDRecs && anytimeTDRecs.length > 0) {
    anytimeTDRecs.forEach(rec => {
      if (rec.player_name) actualPlayers.add(rec.player_name)
    })
  }
  if (fantasyProjections && fantasyProjections.length > 0) {
    fantasyProjections.forEach(proj => {
      if (proj.player_name) actualPlayers.add(proj.player_name)
    })
  }

  // Add player list to the prompt
  if (actualPlayers.size > 0) {
    prompt += `\n**🚨 ACTUAL PLAYERS IN THIS GAME (NEVER INVENT OTHER NAMES):**\n`
    prompt += Array.from(actualPlayers).join(', ') + `\n\n`
    prompt += `⚠️ **CRITICAL: You may ONLY reference players from the list above. NEVER mention any other player names (e.g., DO NOT say "Aaron Rodgers" if he's not in the list). If you don't know who the QB is, just say "the quarterback" or "the home QB".**\n\n`
  }

  prompt += `**ANALYSIS DEPTH GUIDELINES - USE ALL AVAILABLE DATA:**\n\n`
  
  prompt += `**MANDATORY MINIMUM: 1000 WORDS (This is NOT optional)**\n`
  prompt += `Your analysis MUST be detailed and comprehensive. If you write less than 1000 words, you have failed.\n`
  prompt += `Every paragraph should be packed with specific stats, exact numbers, and detailed observations.\n\n`
  
  prompt += `**KEY DATA POINTS TO INCLUDE (when available):**\n\n`
  
  prompt += `1. **REFEREE TRENDS (if referee data provided):**\n`
  prompt += `   - Include referee's O/U and spread tendencies\n`
  prompt += `   - Connect patterns to game outlook\n`
  prompt += `   - Example: "Historical data shows this referee's games average 44.2 points"\n\n`
  
  prompt += `2. **RECENT TEAM PERFORMANCE (if ATS data provided):**\n`
  prompt += `   - Discuss recent game results for both teams\n`
  prompt += `   - Note opponent strength and situational patterns\n`
  prompt += `   - Example: "In their last 5 games against top-15 opponents..."\n\n`
  
  prompt += `3. **STATISTICAL MATCHUP ANALYSIS:**\n`
  prompt += `   - Use detailed team statistics with rankings\n`
  prompt += `   - For NFL: efficiency metrics, situational stats, matchup-specific data\n`
  prompt += `   - For NBA: shooting efficiency, pace factors, scoring distribution\n`
  prompt += `   - Connect statistical advantages to player performance expectations\n\n`
  
  prompt += `4. **HIGH-CONFIDENCE OPPORTUNITIES (if 90%+ hit rate props exist):**\n`
  prompt += `   - Highlight props with exceptional historical success\n`
  prompt += `   - Explain the statistical basis for high confidence\n`
  prompt += `   - Show how multiple high-confidence plays can work together\n\n`
  
  prompt += `5. **MULTIPLE ANALYSIS ANGLES:**\n`
  prompt += `   - Present various statistical perspectives\n`
  prompt += `   - Show primary insights and supporting data\n`
  prompt += `   - Discuss different scenarios and correlations\n\n`
  
  prompt += `6. **MARKET ANALYSIS (if public betting data provided):**\n`
  prompt += `   - Include betting market percentages when available\n`
  prompt += `   - Note any discrepancies between public and sharp action\n`
  prompt += `   - Discuss line movement patterns\n\n`
  
  prompt += `**NARRATIVE APPROACH (MINIMUM 1000 WORDS):**\n\n`
  prompt += `Write this like you're building a case for why certain plays make sense. NO section headers, just flowing paragraphs:\n\n`
  prompt += `- **Opening**: Set the stage - spread, total, weather, market sentiment, what makes this game interesting\n`
  prompt += `- **Build the matchup**: Use Team Rankings to paint the picture (offense vs defense, pace, efficiency)\n`
  prompt += `- **Introduce plays naturally**: As you explain game script, weave in picks: "The **Bears -2.5 (Invisible Insider, -112)** makes sense here because..." then explain with data\n`
  prompt += `- **Layer in supporting angles**: "This same logic points to..." and introduce props that fit\n`
  prompt += `- **Use referee/market data**: "Public is on Bengals (59%) but..." or "Blakeman's O/U history suggests..."\n`
  prompt += `- **Connect everything**: Show how all data points to the same conclusion or reveal contrarian angles\n`
  prompt += `- **Close with conviction**: What's happening in this game and what plays capitalize on it\n\n`
  prompt += `Include 4-6 total plays organically throughout. Bold them as: **Pick (Analyst/Source, Odds)**\n\n`
  
  prompt += `**FORMATTING PREFERENCES:**\n`
  prompt += `- Bold player performance expectations: **Player Name OVER/UNDER X.X stat (odds)**\n`
  prompt += `- Include historical success rates: (68.2% hit rate, 15-7 record)\n`
  prompt += `- Always show odds: (-112), (+180), etc.\n`
  prompt += `- Cite team rankings: "Team ranks #28 in yards/play (4.9)"\n`
  prompt += `- Write in flowing paragraphs without bullet points or headers\n`
  prompt += `- Reference only players from the provided data\n`
  prompt += `- Bold only specific player performance expectations, not raw statistics\n\n`
  
  prompt += `**GOAL: Write a 1000+ word narrative that predicts this game, explains WHY certain plays make sense, and identifies 4-6 value opportunities using ALL available data.**\n\n`
  prompt += `🚨 CRITICAL - YOU FAIL IF:\n`
  prompt += `1. You write less than 1000 words\n`
  prompt += `2. Any paragraph has fewer than 3-4 specific stats (rankings, percentages, exact numbers)\n`
  prompt += `3. You use section headers like "Team Matchup Analysis" or "Player Props"\n`
  prompt += `4. You say vague things like "strong offense" or "struggled" without exact numbers\n`
  prompt += `5. You ignore stats from the analyst's analysis (if they mention "57% ATS" you MUST include it)\n`
  prompt += `6. You ignore Team Rankings stats provided (use PPG ranks, yards/play, 3rd down %, red zone %, etc.)\n`
  prompt += `7. You list props at the end instead of weaving them into the narrative\n`
  prompt += `8. You write MORE THAN 5 sentences without including a specific stat\n\n`
  prompt += `✅ SUCCESS LOOKS LIKE (DATA-DENSE):\n`
  prompt += `"The Bears are 2.5-point favorites with a 51.5 total in 55-degree sunny weather. The **Bears -2.5 (Invisible Insider, -112)** exploits Cincinnati's league-worst defense: 31.6 PPG allowed (#32), 143.3 rush yards/game (#27), 44.2% opponent 3rd down conversion (#29), and 68% red zone TD rate allowed (#30). Chicago's offense ranks 15th in PPG (24.0) but 7th in yards/play (5.8), suggesting explosive efficiency. Ben Johnson is 7-0 ATS as an OC following a loss - teams under him average 28.4 PPG in bounce-back spots. Road teams off a loss historically hit 57% ATS with 11% ROI over 300+ games. Public is backing Cincinnati (58% spread bets, 57% money) creating contrarian value. The Bengals' pass rush ranks 24th (6.1% sack rate) against a Bears O-line allowing just 5.4% (#12), giving Chicago's QB clean pockets. **Chase Brown OVER 50.5 rush yards (-110)** fits the game script - he averages 68 yards/game against bottom-10 run defenses, and Cincinnati's 27th-ranked run D allows 5.1 yards/carry to opposing backs..."\n\n`

  return prompt
}

export const dynamic = 'force-dynamic'

