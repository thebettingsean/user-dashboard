import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Supabase client for game_snapshots (TeamRankings data)
const supabaseSnapshots = createClient(
  process.env.SNAPSHOTS_SUPABASE_URL || '',
  process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY || ''
)

// Supabase client for storing generated scripts
const supabaseMain = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
)

interface FreeScriptResponse {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  script: string
  generatedAt: string
  cached: boolean
}

/**
 * FREE Game Script Generation
 * Uses ONLY TeamRankings data - no betting picks, no props
 * 
 * GET /api/game-scripts/free?gameId=xxx&sport=NFL
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get('gameId')
    const sport = searchParams.get('sport')?.toUpperCase()
    const forceRegenerate = searchParams.get('force') === 'true'

    if (!gameId || !sport) {
      return NextResponse.json(
        { error: 'gameId and sport are required' },
        { status: 400 }
      )
    }

    console.log(`\n=== FREE GAME SCRIPT: ${gameId} (${sport}) ===`)

    // Check for cached script first (unless force regenerate)
    if (!forceRegenerate) {
      const { data: cachedScript } = await supabaseMain
        .from('free_game_scripts')
        .select('*')
        .eq('game_id', gameId)
        .eq('sport', sport)
        .single()

      if (cachedScript && cachedScript.script_content) {
        // Check if script is still valid (less than 6 hours old)
        const generatedAt = new Date(cachedScript.generated_at)
        const hoursSinceGeneration = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceGeneration < 6) {
          console.log(`✅ Using cached script (${hoursSinceGeneration.toFixed(1)}h old)`)
          return NextResponse.json({
            gameId,
            sport,
            homeTeam: cachedScript.home_team,
            awayTeam: cachedScript.away_team,
            script: cachedScript.script_content,
            generatedAt: cachedScript.generated_at,
            cached: true
          } as FreeScriptResponse)
        }
      }
    }

    // Fetch TeamRankings data from game_snapshots
    // CFB and CBB use college tables, NFL/NBA/NHL use regular game_snapshots
    const tableName = (sport === 'CFB' || sport === 'CBB') ? 'college_game_snapshots' : 'game_snapshots'
    const { data: snapshot, error: snapshotError } = await supabaseSnapshots
      .from(tableName)
      .select('game_id, sport, home_team, away_team, start_time_utc, team_rankings')
      .eq('game_id', gameId)
      .single()

    if (snapshotError || !snapshot) {
      console.log(`❌ Game snapshot not found: ${snapshotError?.message}`)
      return NextResponse.json(
        { error: 'Game not found or TeamRankings data not available' },
        { status: 404 }
      )
    }

    if (!snapshot.team_rankings) {
      console.log(`❌ No TeamRankings data for ${gameId}`)
      return NextResponse.json(
        { error: 'TeamRankings data not yet scraped for this game' },
        { status: 404 }
      )
    }

    const { home_team, away_team, team_rankings, start_time_utc } = snapshot
    const homeRankings = team_rankings.home_team
    const awayRankings = team_rankings.away_team

    if (!homeRankings || !awayRankings) {
      return NextResponse.json(
        { error: 'Incomplete team rankings data' },
        { status: 404 }
      )
    }

    console.log(`📊 TeamRankings data found for: ${away_team} @ ${home_team}`)

    // Build the prompt using ONLY TeamRankings data
    const prompt = buildFreeScriptPrompt(sport, home_team, away_team, homeRankings, awayRankings, start_time_utc)

    console.log('🤖 Generating FREE game script with Claude...')
    
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.7,
      system: FREE_SCRIPT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    })

    const firstContent = completion.content[0]
    const script = firstContent && 'text' in firstContent ? firstContent.text : 'Unable to generate script'
    
    console.log(`✅ Script generated (${script.length} characters)`)

    // Save to database
    const now = new Date().toISOString()
    const { error: saveError } = await supabaseMain
      .from('free_game_scripts')
      .upsert({
        game_id: gameId,
        sport,
        home_team,
        away_team,
        game_time: start_time_utc,
        script_content: script,
        generated_at: now,
        updated_at: now
      }, {
        onConflict: 'game_id,sport'
      })

    if (saveError) {
      console.error('⚠️ Failed to save script:', saveError)
    } else {
      console.log('💾 Script saved to database')
    }

    return NextResponse.json({
      gameId,
      sport,
      homeTeam: home_team,
      awayTeam: away_team,
      script,
      generatedAt: now,
      cached: false
    } as FreeScriptResponse)

  } catch (error) {
    console.error('❌ Error generating free script:', error)
    return NextResponse.json(
      { error: 'Failed to generate game script', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * System prompt for FREE game scripts - team analysis only, NO betting recommendations
 */
const FREE_SCRIPT_SYSTEM_PROMPT = `You are an expert sports analyst providing comprehensive game previews. Your role is to break down matchups using team statistics to help fans understand what to watch for in the game.

## YOUR PERSONALITY
You're a knowledgeable analyst who brings games to life through data. You explain WHY matchups matter, not just what the numbers are. You're engaging, insightful, and help fans appreciate the strategic elements of the game.

## CRITICAL RULES - WHAT YOU MUST NOT DO
🚫 **NEVER mention betting, spreads, lines, odds, picks, or gambling**
🚫 **NEVER suggest who will win or by how much**
🚫 **NEVER mention ATS (against the spread), overs, unders, or totals**
🚫 **NEVER reference sportsbooks, Vegas, or betting markets**
🚫 **NEVER use phrases like "lean", "play", "edge", "value", "hammer it"**

## WHAT YOU SHOULD DO
✅ Analyze offensive vs defensive matchups
✅ Identify key statistical advantages and disadvantages
✅ Explain what makes this game interesting
✅ Highlight specific matchups to watch (e.g., "Their elite passing attack vs a struggling secondary")
✅ Use stats with context (e.g., "#3 in rushing yards per game" not just "good at rushing")
✅ Tell a story about how the game might unfold based on team strengths

## STAT CITATION FORMAT
Always cite stats with rank AND value:
✅ "Chiefs rank #3 in passing yards per game (285.4)"
✅ "Bears defense allows just 17.2 PPG (#5 in the league)"
❌ "Chiefs have a good passing game"
❌ "Bears have a top defense"

## OUTPUT FORMAT
Write 400-500 words in 4-5 flowing paragraphs. No section headers - just natural, engaging analysis that reads like a professional game preview.

Start with the most compelling storyline of the matchup, then dig into the statistical breakdown, and close with what fans should watch for.`

/**
 * Build the prompt using TeamRankings data
 */
function buildFreeScriptPrompt(
  sport: string,
  homeTeam: string,
  awayTeam: string,
  homeRankings: any,
  awayRankings: any,
  gameTime: string
): string {
  const gameTimeFormatted = new Date(gameTime).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  })

  let prompt = `Write a comprehensive game preview for:\n\n`
  prompt += `**${awayTeam} @ ${homeTeam}**\n`
  prompt += `**${gameTimeFormatted} ET**\n\n`
  prompt += `Use the following team statistics to create an engaging matchup analysis:\n\n`

  // Add sport-specific stats
  if (sport === 'NFL' || sport === 'CFB') {
    prompt += buildFootballPrompt(homeTeam, awayTeam, homeRankings, awayRankings)
  } else if (sport === 'NBA' || sport === 'CBB') {
    prompt += buildBasketballPrompt(homeTeam, awayTeam, homeRankings, awayRankings)
  } else if (sport === 'NHL') {
    prompt += buildHockeyPrompt(homeTeam, awayTeam, homeRankings, awayRankings)
  }

  prompt += `\n\n---\n\n`
  prompt += `Remember: This is a game preview for fans, NOT betting analysis. Focus on the matchup storylines and what makes this game interesting to watch.`

  return prompt
}

function buildFootballPrompt(homeTeam: string, awayTeam: string, homeRankings: any, awayRankings: any): string {
  let prompt = `## ${homeTeam.toUpperCase()} (HOME)\n\n`
  prompt += `**OFFENSE:**\n`
  prompt += formatStat('Points/Game', homeRankings.offense?.['points_game'])
  prompt += formatStat('Yards/Play', homeRankings.offense?.['yards_play'])
  prompt += formatStat('Rush Yards/Game', homeRankings.offense?.['rush_yards_game'])
  prompt += formatStat('Pass Yards/Game', homeRankings.offense?.['pass_yards_game'])
  prompt += formatStat('3rd Down %', homeRankings.offense?.['3d_conversion'])
  prompt += formatStat('Red Zone TD %', homeRankings.offense?.['rz_scoring_td'])
  prompt += formatStat('Yards/Rush', homeRankings.offense?.['yards_rush'])
  prompt += formatStat('Yards/Pass', homeRankings.offense?.['yards_pass'])
  prompt += formatStat('Turnover Margin', homeRankings.offense?.['to_margin_per_game'])

  prompt += `\n**DEFENSE:**\n`
  prompt += formatStat('Points Allowed/Game', homeRankings.defense?.['opp_points_game'])
  prompt += formatStat('Yards Allowed/Play', homeRankings.defense?.['opp_yards_play'])
  prompt += formatStat('Rush Yards Allowed/Game', homeRankings.defense?.['opp_rush_yards_game'])
  prompt += formatStat('Pass Yards Allowed/Game', homeRankings.defense?.['opp_pass_yards_game'])
  prompt += formatStat('Opp 3rd Down %', homeRankings.defense?.['opp_3d_conv'])
  prompt += formatStat('Sack %', homeRankings.defense?.['sack'])

  prompt += `\n---\n\n## ${awayTeam.toUpperCase()} (AWAY)\n\n`
  prompt += `**OFFENSE:**\n`
  prompt += formatStat('Points/Game', awayRankings.offense?.['points_game'])
  prompt += formatStat('Yards/Play', awayRankings.offense?.['yards_play'])
  prompt += formatStat('Rush Yards/Game', awayRankings.offense?.['rush_yards_game'])
  prompt += formatStat('Pass Yards/Game', awayRankings.offense?.['pass_yards_game'])
  prompt += formatStat('3rd Down %', awayRankings.offense?.['3d_conversion'])
  prompt += formatStat('Red Zone TD %', awayRankings.offense?.['rz_scoring_td'])
  prompt += formatStat('Yards/Rush', awayRankings.offense?.['yards_rush'])
  prompt += formatStat('Yards/Pass', awayRankings.offense?.['yards_pass'])
  prompt += formatStat('Turnover Margin', awayRankings.offense?.['to_margin_per_game'])

  prompt += `\n**DEFENSE:**\n`
  prompt += formatStat('Points Allowed/Game', awayRankings.defense?.['opp_points_game'])
  prompt += formatStat('Yards Allowed/Play', awayRankings.defense?.['opp_yards_play'])
  prompt += formatStat('Rush Yards Allowed/Game', awayRankings.defense?.['opp_rush_yards_game'])
  prompt += formatStat('Pass Yards Allowed/Game', awayRankings.defense?.['opp_pass_yards_game'])
  prompt += formatStat('Opp 3rd Down %', awayRankings.defense?.['opp_3d_conv'])
  prompt += formatStat('Sack %', awayRankings.defense?.['sack'])

  // Add matchup analysis section
  prompt += `\n---\n\n## KEY MATCHUPS TO ANALYZE:\n\n`
  prompt += `1. **${awayTeam} Offense vs ${homeTeam} Defense**\n`
  prompt += `   - Compare their offensive strengths against the defensive weaknesses\n`
  prompt += `2. **${homeTeam} Offense vs ${awayTeam} Defense**\n`
  prompt += `   - Identify where each team can exploit the other\n`
  prompt += `3. **Efficiency Battle**\n`
  prompt += `   - Compare yards/play, 3rd down conversion rates, red zone efficiency\n`
  prompt += `4. **Turnover Implications**\n`
  prompt += `   - Which team protects the ball better?\n`

  return prompt
}

function buildBasketballPrompt(homeTeam: string, awayTeam: string, homeRankings: any, awayRankings: any): string {
  let prompt = `## ${homeTeam.toUpperCase()} (HOME)\n\n`
  prompt += `**OFFENSE:**\n`
  prompt += formatStat('Points/Game', homeRankings.offense?.['points_game'])
  prompt += formatStat('Effective FG%', homeRankings.offense?.['effective_fg_pct'])
  prompt += formatStat('3PT%', homeRankings.offense?.['three_point_pct'])
  prompt += formatStat('3PM/Game', homeRankings.offense?.['three_pm_game'])
  prompt += formatStat('Points in Paint/Game', homeRankings.offense?.['points_in_paint_game'])
  prompt += formatStat('Assists/Game', homeRankings.offense?.['assists_game'])
  prompt += formatStat('Fastbreak Pts/Game', homeRankings.offense?.['fastbreak_points_game'])
  prompt += formatStat('Offensive Reb %', homeRankings.offense?.['offensive_rebound_pct'])
  prompt += formatStat('Turnovers/Game', homeRankings.offense?.['turnovers_game'])

  prompt += `\n**DEFENSE:**\n`
  prompt += formatStat('Points Allowed/Game', homeRankings.defense?.['opp_points_game'])
  prompt += formatStat('Opp Effective FG%', homeRankings.defense?.['opp_effective_fg_pct'])
  prompt += formatStat('Opp 3PT%', homeRankings.defense?.['opp_three_point_pct'])
  prompt += formatStat('Opp 3PM/Game', homeRankings.defense?.['opp_three_pm_game'])
  prompt += formatStat('Opp Points in Paint/Game', homeRankings.defense?.['opp_points_in_paint_game'])
  prompt += formatStat('Steals/Game', homeRankings.defense?.['steals_game'])
  prompt += formatStat('Blocks/Game', homeRankings.defense?.['blocks_game'])

  prompt += `\n---\n\n## ${awayTeam.toUpperCase()} (AWAY)\n\n`
  prompt += `**OFFENSE:**\n`
  prompt += formatStat('Points/Game', awayRankings.offense?.['points_game'])
  prompt += formatStat('Effective FG%', awayRankings.offense?.['effective_fg_pct'])
  prompt += formatStat('3PT%', awayRankings.offense?.['three_point_pct'])
  prompt += formatStat('3PM/Game', awayRankings.offense?.['three_pm_game'])
  prompt += formatStat('Points in Paint/Game', awayRankings.offense?.['points_in_paint_game'])
  prompt += formatStat('Assists/Game', awayRankings.offense?.['assists_game'])
  prompt += formatStat('Fastbreak Pts/Game', awayRankings.offense?.['fastbreak_points_game'])
  prompt += formatStat('Offensive Reb %', awayRankings.offense?.['offensive_rebound_pct'])
  prompt += formatStat('Turnovers/Game', awayRankings.offense?.['turnovers_game'])

  prompt += `\n**DEFENSE:**\n`
  prompt += formatStat('Points Allowed/Game', awayRankings.defense?.['opp_points_game'])
  prompt += formatStat('Opp Effective FG%', awayRankings.defense?.['opp_effective_fg_pct'])
  prompt += formatStat('Opp 3PT%', awayRankings.defense?.['opp_three_point_pct'])
  prompt += formatStat('Opp 3PM/Game', awayRankings.defense?.['opp_three_pm_game'])
  prompt += formatStat('Opp Points in Paint/Game', awayRankings.defense?.['opp_points_in_paint_game'])
  prompt += formatStat('Steals/Game', awayRankings.defense?.['steals_game'])
  prompt += formatStat('Blocks/Game', awayRankings.defense?.['blocks_game'])

  prompt += `\n---\n\n## KEY MATCHUPS TO ANALYZE:\n\n`
  prompt += `1. **Perimeter Battle** - Compare 3PT shooting vs perimeter defense\n`
  prompt += `2. **Paint Presence** - Points in paint vs interior defense\n`
  prompt += `3. **Pace & Style** - Fastbreak points, turnovers, overall tempo\n`
  prompt += `4. **Ball Movement** - Assists, sharing, offensive efficiency\n`

  return prompt
}

function buildHockeyPrompt(homeTeam: string, awayTeam: string, homeRankings: any, awayRankings: any): string {
  // For NHL we use MoneyPuck data which has different structure
  let prompt = `## ${homeTeam.toUpperCase()} (HOME)\n\n`
  prompt += `**OFFENSE:**\n`
  prompt += formatStat('Goals/Game', homeRankings.offense?.['goals_game'])
  prompt += formatStat('Shots/Game', homeRankings.offense?.['shots_game'])
  prompt += formatStat('Shooting %', homeRankings.offense?.['shooting_pct'])
  prompt += formatStat('Power Play %', homeRankings.offense?.['power_play_pct'])
  prompt += formatStat('xGoals/60', homeRankings.offense?.['xgoals_60'])

  prompt += `\n**DEFENSE:**\n`
  prompt += formatStat('Goals Allowed/Game', homeRankings.defense?.['goals_against_game'])
  prompt += formatStat('Shots Allowed/Game', homeRankings.defense?.['shots_against_game'])
  prompt += formatStat('Save %', homeRankings.defense?.['save_pct'])
  prompt += formatStat('Penalty Kill %', homeRankings.defense?.['penalty_kill_pct'])

  prompt += `\n---\n\n## ${awayTeam.toUpperCase()} (AWAY)\n\n`
  prompt += `**OFFENSE:**\n`
  prompt += formatStat('Goals/Game', awayRankings.offense?.['goals_game'])
  prompt += formatStat('Shots/Game', awayRankings.offense?.['shots_game'])
  prompt += formatStat('Shooting %', awayRankings.offense?.['shooting_pct'])
  prompt += formatStat('Power Play %', awayRankings.offense?.['power_play_pct'])
  prompt += formatStat('xGoals/60', awayRankings.offense?.['xgoals_60'])

  prompt += `\n**DEFENSE:**\n`
  prompt += formatStat('Goals Allowed/Game', awayRankings.defense?.['goals_against_game'])
  prompt += formatStat('Shots Allowed/Game', awayRankings.defense?.['shots_against_game'])
  prompt += formatStat('Save %', awayRankings.defense?.['save_pct'])
  prompt += formatStat('Penalty Kill %', awayRankings.defense?.['penalty_kill_pct'])

  prompt += `\n---\n\n## KEY MATCHUPS TO ANALYZE:\n\n`
  prompt += `1. **Goaltending** - Compare save percentages and goals allowed\n`
  prompt += `2. **Special Teams** - Power play vs penalty kill matchups\n`
  prompt += `3. **Shot Volume** - Who generates more chances?\n`
  prompt += `4. **Expected Goals** - Which team creates quality opportunities?\n`

  return prompt
}

function formatStat(label: string, stat: { value: number; rank: number } | undefined): string {
  if (!stat || stat.rank === 999) return ''
  const value = typeof stat.value === 'number' ? stat.value.toFixed(1) : stat.value
  return `- ${label}: ${value} (#${stat.rank})\n`
}

export const dynamic = 'force-dynamic'

