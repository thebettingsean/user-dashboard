import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { scrapeTeamRankings, TeamRankingsData } from '@/lib/team-rankings-scraper'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Supabase client for storing generated scripts (main project)
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
 * FREE Game Script Generation - 100% INDEPENDENT
 * 
 * NO TRENDLINE LABS DEPENDENCY - Uses:
 * 1. Odds API for game data (passed via query params)
 * 2. TeamRankings.com scraper for team stats
 * 3. Claude for script generation
 * 4. Supabase for storage
 * 
 * GET /api/game-scripts/free?gameId=xxx&sport=nfl&homeTeam=Chiefs&awayTeam=Bills
 * 
 * For cron jobs, all params are passed. For individual lookups, uses cached script.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get('gameId')
    const sport = searchParams.get('sport')?.toLowerCase()
    const homeTeam = searchParams.get('homeTeam')
    const awayTeam = searchParams.get('awayTeam')
    const gameTime = searchParams.get('gameTime')
    const forceRegenerate = searchParams.get('force') === 'true'

    if (!gameId || !sport) {
      return NextResponse.json(
        { error: 'gameId and sport are required' },
        { status: 400 }
      )
    }

    console.log(`\n=== FREE GAME SCRIPT: ${gameId} (${sport.toUpperCase()}) ===`)

    // 1. Check for cached script first (unless force regenerate)
    if (!forceRegenerate) {
      try {
        const { data: cachedScript, error: cacheError } = await supabaseMain
          .from('free_game_scripts')
          .select('*')
          .eq('game_id', gameId)
          .eq('sport', sport.toUpperCase())
          .single()

        if (!cacheError && cachedScript && cachedScript.script_content) {
          // Check if script is still valid (less than 12 hours old)
          const generatedAt = new Date(cachedScript.generated_at)
          const hoursSinceGeneration = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceGeneration < 12) {
            console.log(`✅ Using cached script (${hoursSinceGeneration.toFixed(1)}h old)`)
            return NextResponse.json({
              gameId,
              sport: sport.toUpperCase(),
              homeTeam: cachedScript.home_team,
              awayTeam: cachedScript.away_team,
              script: cachedScript.script_content,
              generatedAt: cachedScript.generated_at,
              cached: true
            } as FreeScriptResponse)
          }
          console.log(`⚠️ Cached script expired (${hoursSinceGeneration.toFixed(1)}h old) - regenerating`)
        }
      } catch (cacheErr) {
        console.log('📝 No cached script found - generating new one')
      }
    }

    // 2. For generation, we need team names
    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'homeTeam and awayTeam are required for script generation (no cached script found)' },
        { status: 400 }
      )
    }

    console.log(`📊 Scraping TeamRankings for: ${awayTeam} @ ${homeTeam}`)

    // 3. Scrape TeamRankings.com directly for both teams
    const [homeRankings, awayRankings] = await Promise.all([
      scrapeTeamRankings(sport, homeTeam),
      scrapeTeamRankings(sport, awayTeam)
    ])

    if (!homeRankings || !awayRankings) {
      console.log(`⚠️ TeamRankings scrape incomplete - home: ${!!homeRankings}, away: ${!!awayRankings}`)
      
      // If we can't scrape both, try to return a basic script
      if (!homeRankings && !awayRankings) {
        return NextResponse.json(
          { error: 'Unable to scrape TeamRankings data for either team' },
          { status: 404 }
        )
      }
    }

    console.log(`✅ TeamRankings scraped - Home: ${Object.keys(homeRankings?.offense || {}).length} stats, Away: ${Object.keys(awayRankings?.offense || {}).length} stats`)

    // 4. Build the prompt using scraped data
    const prompt = buildFreeScriptPrompt(
      sport.toUpperCase(),
      homeTeam,
      awayTeam,
      homeRankings,
      awayRankings,
      gameTime || new Date().toISOString()
    )

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

    // 5. Save to database
    const now = new Date().toISOString()
    try {
      const { error: saveError } = await supabaseMain
        .from('free_game_scripts')
        .upsert({
          game_id: gameId,
          sport: sport.toUpperCase(),
          home_team: homeTeam,
          away_team: awayTeam,
          game_time: gameTime || now,
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
    } catch (saveErr) {
      console.error('⚠️ Database save error:', saveErr)
    }

    return NextResponse.json({
      gameId,
      sport: sport.toUpperCase(),
      homeTeam,
      awayTeam,
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
 * Build the prompt using scraped TeamRankings data
 */
function buildFreeScriptPrompt(
  sport: string,
  homeTeam: string,
  awayTeam: string,
  homeRankings: TeamRankingsData | null,
  awayRankings: TeamRankingsData | null,
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

  // Add team stats based on sport
  if (sport === 'NFL' || sport === 'CFB') {
    prompt += buildFootballStats(homeTeam, awayTeam, homeRankings, awayRankings)
  } else if (sport === 'NBA' || sport === 'CBB') {
    prompt += buildBasketballStats(homeTeam, awayTeam, homeRankings, awayRankings)
  } else if (sport === 'NHL') {
    prompt += buildHockeyStats(homeTeam, awayTeam, homeRankings, awayRankings)
  } else {
    // Generic fallback
    prompt += buildGenericStats(homeTeam, awayTeam, homeRankings, awayRankings)
  }

  prompt += `\n\n---\n\n`
  prompt += `Remember: This is a game preview for fans, NOT betting analysis. Focus on the matchup storylines and what makes this game interesting to watch.`

  return prompt
}

function buildFootballStats(homeTeam: string, awayTeam: string, homeRankings: TeamRankingsData | null, awayRankings: TeamRankingsData | null): string {
  let stats = ''
  
  // Home team
  stats += `## ${homeTeam.toUpperCase()} (HOME)\n\n`
  if (homeRankings) {
    stats += `**OFFENSE:**\n`
    stats += formatStatFromRankings(homeRankings.offense, 'points_game', 'Points/Game')
    stats += formatStatFromRankings(homeRankings.offense, 'yards_play', 'Yards/Play')
    stats += formatStatFromRankings(homeRankings.offense, 'rush_yards_game', 'Rush Yards/Game')
    stats += formatStatFromRankings(homeRankings.offense, 'pass_yards_game', 'Pass Yards/Game')
    stats += formatStatFromRankings(homeRankings.offense, '3rd_down_conversion', '3rd Down %')
    stats += formatStatFromRankings(homeRankings.offense, 'red_zone_scoring', 'Red Zone %')
    
    stats += `\n**DEFENSE:**\n`
    stats += formatStatFromRankings(homeRankings.defense, 'opp_points_game', 'Points Allowed/Game')
    stats += formatStatFromRankings(homeRankings.defense, 'opp_yards_play', 'Yards Allowed/Play')
    stats += formatStatFromRankings(homeRankings.defense, 'opp_rush_yards_game', 'Rush Yards Allowed/Game')
    stats += formatStatFromRankings(homeRankings.defense, 'opp_pass_yards_game', 'Pass Yards Allowed/Game')
    stats += formatStatFromRankings(homeRankings.defense, 'sacks_game', 'Sacks/Game')
    stats += formatStatFromRankings(homeRankings.defense, 'takeaways_game', 'Takeaways/Game')
  } else {
    stats += `(No stats available)\n`
  }
  
  // Away team  
  stats += `\n---\n\n## ${awayTeam.toUpperCase()} (AWAY)\n\n`
  if (awayRankings) {
    stats += `**OFFENSE:**\n`
    stats += formatStatFromRankings(awayRankings.offense, 'points_game', 'Points/Game')
    stats += formatStatFromRankings(awayRankings.offense, 'yards_play', 'Yards/Play')
    stats += formatStatFromRankings(awayRankings.offense, 'rush_yards_game', 'Rush Yards/Game')
    stats += formatStatFromRankings(awayRankings.offense, 'pass_yards_game', 'Pass Yards/Game')
    stats += formatStatFromRankings(awayRankings.offense, '3rd_down_conversion', '3rd Down %')
    stats += formatStatFromRankings(awayRankings.offense, 'red_zone_scoring', 'Red Zone %')
    
    stats += `\n**DEFENSE:**\n`
    stats += formatStatFromRankings(awayRankings.defense, 'opp_points_game', 'Points Allowed/Game')
    stats += formatStatFromRankings(awayRankings.defense, 'opp_yards_play', 'Yards Allowed/Play')
    stats += formatStatFromRankings(awayRankings.defense, 'opp_rush_yards_game', 'Rush Yards Allowed/Game')
    stats += formatStatFromRankings(awayRankings.defense, 'opp_pass_yards_game', 'Pass Yards Allowed/Game')
    stats += formatStatFromRankings(awayRankings.defense, 'sacks_game', 'Sacks/Game')
    stats += formatStatFromRankings(awayRankings.defense, 'takeaways_game', 'Takeaways/Game')
  } else {
    stats += `(No stats available)\n`
  }
  
  // Key matchups
  stats += `\n---\n\n## KEY MATCHUPS TO ANALYZE:\n\n`
  stats += `1. **${awayTeam} Offense vs ${homeTeam} Defense** - Where can they exploit weaknesses?\n`
  stats += `2. **${homeTeam} Offense vs ${awayTeam} Defense** - What's the home team's path to success?\n`
  stats += `3. **Third Down Battle** - Who sustains drives better?\n`
  stats += `4. **Turnover Potential** - Which team is more likely to create turnovers?\n`

  return stats
}

function buildBasketballStats(homeTeam: string, awayTeam: string, homeRankings: TeamRankingsData | null, awayRankings: TeamRankingsData | null): string {
  let stats = ''
  
  stats += `## ${homeTeam.toUpperCase()} (HOME)\n\n`
  if (homeRankings) {
    stats += `**OFFENSE:**\n`
    stats += formatStatFromRankings(homeRankings.offense, 'points_game', 'Points/Game')
    stats += formatStatFromRankings(homeRankings.offense, 'effective_fg_pct', 'Effective FG%')
    stats += formatStatFromRankings(homeRankings.offense, 'three_point_pct', '3PT%')
    stats += formatStatFromRankings(homeRankings.offense, 'assists_game', 'Assists/Game')
    stats += formatStatFromRankings(homeRankings.offense, 'turnovers_game', 'Turnovers/Game')
    
    stats += `\n**DEFENSE:**\n`
    stats += formatStatFromRankings(homeRankings.defense, 'opp_points_game', 'Points Allowed/Game')
    stats += formatStatFromRankings(homeRankings.defense, 'opp_effective_fg_pct', 'Opp Effective FG%')
    stats += formatStatFromRankings(homeRankings.defense, 'steals_game', 'Steals/Game')
    stats += formatStatFromRankings(homeRankings.defense, 'blocks_game', 'Blocks/Game')
  } else {
    stats += `(No stats available)\n`
  }
  
  stats += `\n---\n\n## ${awayTeam.toUpperCase()} (AWAY)\n\n`
  if (awayRankings) {
    stats += `**OFFENSE:**\n`
    stats += formatStatFromRankings(awayRankings.offense, 'points_game', 'Points/Game')
    stats += formatStatFromRankings(awayRankings.offense, 'effective_fg_pct', 'Effective FG%')
    stats += formatStatFromRankings(awayRankings.offense, 'three_point_pct', '3PT%')
    stats += formatStatFromRankings(awayRankings.offense, 'assists_game', 'Assists/Game')
    stats += formatStatFromRankings(awayRankings.offense, 'turnovers_game', 'Turnovers/Game')
    
    stats += `\n**DEFENSE:**\n`
    stats += formatStatFromRankings(awayRankings.defense, 'opp_points_game', 'Points Allowed/Game')
    stats += formatStatFromRankings(awayRankings.defense, 'opp_effective_fg_pct', 'Opp Effective FG%')
    stats += formatStatFromRankings(awayRankings.defense, 'steals_game', 'Steals/Game')
    stats += formatStatFromRankings(awayRankings.defense, 'blocks_game', 'Blocks/Game')
  } else {
    stats += `(No stats available)\n`
  }
  
  stats += `\n---\n\n## KEY MATCHUPS TO ANALYZE:\n\n`
  stats += `1. **Perimeter Shooting** - 3PT shooting vs perimeter defense\n`
  stats += `2. **Pace and Tempo** - How will game flow affect each team?\n`
  stats += `3. **Ball Security** - Turnover margin and steal potential\n`
  stats += `4. **Interior Play** - Paint scoring and rim protection\n`

  return stats
}

function buildHockeyStats(homeTeam: string, awayTeam: string, homeRankings: TeamRankingsData | null, awayRankings: TeamRankingsData | null): string {
  let stats = ''
  
  stats += `## ${homeTeam.toUpperCase()} (HOME)\n\n`
  if (homeRankings) {
    stats += `**OFFENSE:**\n`
    stats += formatStatFromRankings(homeRankings.offense, 'goals_game', 'Goals/Game')
    stats += formatStatFromRankings(homeRankings.offense, 'shots_game', 'Shots/Game')
    stats += formatStatFromRankings(homeRankings.offense, 'shooting_pct', 'Shooting %')
    stats += formatStatFromRankings(homeRankings.offense, 'power_play_pct', 'Power Play %')
    
    stats += `\n**DEFENSE:**\n`
    stats += formatStatFromRankings(homeRankings.defense, 'goals_against_game', 'Goals Against/Game')
    stats += formatStatFromRankings(homeRankings.defense, 'save_pct', 'Save %')
    stats += formatStatFromRankings(homeRankings.defense, 'penalty_kill_pct', 'Penalty Kill %')
  } else {
    stats += `(No stats available)\n`
  }
  
  stats += `\n---\n\n## ${awayTeam.toUpperCase()} (AWAY)\n\n`
  if (awayRankings) {
    stats += `**OFFENSE:**\n`
    stats += formatStatFromRankings(awayRankings.offense, 'goals_game', 'Goals/Game')
    stats += formatStatFromRankings(awayRankings.offense, 'shots_game', 'Shots/Game')
    stats += formatStatFromRankings(awayRankings.offense, 'shooting_pct', 'Shooting %')
    stats += formatStatFromRankings(awayRankings.offense, 'power_play_pct', 'Power Play %')
    
    stats += `\n**DEFENSE:**\n`
    stats += formatStatFromRankings(awayRankings.defense, 'goals_against_game', 'Goals Against/Game')
    stats += formatStatFromRankings(awayRankings.defense, 'save_pct', 'Save %')
    stats += formatStatFromRankings(awayRankings.defense, 'penalty_kill_pct', 'Penalty Kill %')
  } else {
    stats += `(No stats available)\n`
  }
  
  stats += `\n---\n\n## KEY MATCHUPS TO ANALYZE:\n\n`
  stats += `1. **Goaltending Duel** - Save percentages and hot streaks\n`
  stats += `2. **Special Teams** - Power play vs penalty kill\n`
  stats += `3. **Shot Generation** - Volume and quality\n`
  stats += `4. **5v5 Play** - Even strength effectiveness\n`

  return stats
}

function buildGenericStats(homeTeam: string, awayTeam: string, homeRankings: TeamRankingsData | null, awayRankings: TeamRankingsData | null): string {
  let stats = ''
  
  stats += `## ${homeTeam.toUpperCase()} (HOME)\n\n`
  if (homeRankings) {
    stats += `**OFFENSE:**\n`
    Object.entries(homeRankings.offense).slice(0, 8).forEach(([key, val]) => {
      if (val.rank < 999) {
        stats += `- ${key.replace(/_/g, ' ')}: ${val.value} (#${val.rank})\n`
      }
    })
    stats += `\n**DEFENSE:**\n`
    Object.entries(homeRankings.defense).slice(0, 6).forEach(([key, val]) => {
      if (val.rank < 999) {
        stats += `- ${key.replace(/_/g, ' ')}: ${val.value} (#${val.rank})\n`
      }
    })
  }
  
  stats += `\n---\n\n## ${awayTeam.toUpperCase()} (AWAY)\n\n`
  if (awayRankings) {
    stats += `**OFFENSE:**\n`
    Object.entries(awayRankings.offense).slice(0, 8).forEach(([key, val]) => {
      if (val.rank < 999) {
        stats += `- ${key.replace(/_/g, ' ')}: ${val.value} (#${val.rank})\n`
      }
    })
    stats += `\n**DEFENSE:**\n`
    Object.entries(awayRankings.defense).slice(0, 6).forEach(([key, val]) => {
      if (val.rank < 999) {
        stats += `- ${key.replace(/_/g, ' ')}: ${val.value} (#${val.rank})\n`
      }
    })
  }

  return stats
}

function formatStatFromRankings(
  stats: Record<string, { value: number; rank: number }> | undefined,
  key: string,
  label: string
): string {
  if (!stats) return ''
  
  // Try multiple key variations (TeamRankings format varies)
  const variations = [
    key,
    key.replace(/_/g, ''),
    key.replace(/game/g, 'per_game'),
    key.replace(/per_game/g, 'game')
  ]
  
  for (const k of variations) {
    const stat = stats[k]
    if (stat && stat.rank < 999) {
      const value = typeof stat.value === 'number' ? stat.value.toFixed(1) : stat.value
      return `- ${label}: ${value} (#${stat.rank})\n`
    }
  }
  
  // Try to find any stat that contains the key
  for (const [statKey, stat] of Object.entries(stats)) {
    if (statKey.includes(key.split('_')[0]) && stat.rank < 999) {
      const value = typeof stat.value === 'number' ? stat.value.toFixed(1) : stat.value
      return `- ${label}: ${value} (#${stat.rank})\n`
    }
  }
  
  return ''
}

export const dynamic = 'force-dynamic'
