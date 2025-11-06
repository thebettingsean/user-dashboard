import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Supabase clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

// Anthropic AI
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

/**
 * NFL Blueprint Generation Cron Job
 * Runs: Wed-Sun at 11:40 PM EST (5 times per week)
 * Generates a comprehensive weekly blueprint covering all NFL games
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🏈 === NFL BLUEPRINT GENERATION STARTED ===')
    const startTime = Date.now()

    // 1. Determine current NFL week
    const currentWeek = getCurrentNFLWeek()
    const periodId = `Week ${currentWeek}`
    console.log(`📅 Generating blueprint for ${periodId}`)

    // 2. Fetch all NFL games for this week
    const games = await fetchNFLGamesForWeek(currentWeek)
    
    if (!games || games.length === 0) {
      console.log('⚠️  No NFL games found for this week')
      return NextResponse.json({ 
        success: true, 
        skipped: true,
        reason: 'No games found',
        week: currentWeek
      })
    }

    console.log(`✅ Found ${games.length} NFL games for ${periodId}`)

    // 3. Compile lightweight data for each game
    const blueprintData = await compileNFLBlueprintData(games)

    // 4. Generate AI blueprint
    console.log('🤖 Generating AI blueprint with Claude Sonnet 4.5...')
    const content = await generateNFLBlueprint(blueprintData, periodId)

    // 5. Calculate expiration (Sunday night at 11:59 PM EST)
    const expiresAt = getWeekEndDate(currentWeek)

    // 6. Upsert to database (overwrite existing)
    const { data, error } = await supabase
      .from('blueprints')
      .upsert({
        sport: 'nfl',
        period_identifier: periodId,
        game_count: games.length,
        content,
        updated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'sport,period_identifier'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error upserting blueprint:', error)
      throw error
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ NFL Blueprint generated successfully in ${duration}s`)
    console.log(`📊 Week: ${currentWeek}, Games: ${games.length}, Content length: ${content.length} chars`)

    return NextResponse.json({
      success: true,
      week: currentWeek,
      gameCount: games.length,
      contentLength: content.length,
      duration: `${duration}s`,
      blueprintId: data.id
    })

  } catch (error: any) {
    console.error('❌ NFL Blueprint generation failed:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get current NFL week number
 */
function getCurrentNFLWeek(): number {
  const now = new Date()
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  
  // NFL 2024-2025 season: Week 1 starts Sep 5, 2024
  const seasonStart = new Date('2024-09-05T00:00:00-04:00')
  
  const diffTime = estDate.getTime() - seasonStart.getTime()
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
  
  let weekNumber = diffWeeks + 1
  
  // Cap at Week 18
  if (weekNumber > 18) weekNumber = 18
  if (weekNumber < 1) weekNumber = 1
  
  return weekNumber
}

/**
 * Fetch all NFL games for a specific week
 */
async function fetchNFLGamesForWeek(week: number) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/games/today`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Will fetch current week's games
    })
    
    const data = await response.json()
    
    // Filter for NFL games only
    const nflGames = data.games?.filter((g: any) => g.sport === 'NFL') || []
    
    return nflGames
  } catch (error) {
    console.error('Error fetching NFL games:', error)
    return []
  }
}

/**
 * Compile lightweight data for blueprint generation
 */
async function compileNFLBlueprintData(games: any[]) {
  console.log(`📊 Compiling data for ${games.length} games...`)
  
  const compiledData = await Promise.all(games.map(async (game) => {
    try {
      // Fetch only essential data (lightweight)
      const [rankings, analystPicks] = await Promise.all([
        fetchTeamRankings(game.awayTeam, game.homeTeam),
        fetchTopAnalystPicks(game.gameId)
      ])

      return {
        gameId: game.gameId,
        matchup: `${game.awayTeam} @ ${game.homeTeam}`,
        gameTime: game.gameTime,
        rankings,
        analystPicks: analystPicks.slice(0, 2) // Max 2 picks per game
      }
    } catch (error) {
      console.error(`Error compiling data for ${game.gameId}:`, error)
      return {
        gameId: game.gameId,
        matchup: `${game.awayTeam} @ ${game.homeTeam}`,
        gameTime: game.gameTime,
        rankings: null,
        analystPicks: []
      }
    }
  }))

  return compiledData
}

/**
 * Fetch team rankings (from existing rankings scraper)
 */
async function fetchTeamRankings(awayTeam: string, homeTeam: string) {
  // This would call your existing team rankings API or scraper
  // For now, return placeholder
  return {
    [awayTeam]: { rank: 0, stats: {} },
    [homeTeam]: { rank: 0, stats: {} }
  }
}

/**
 * Fetch top analyst picks for a game
 */
async function fetchTopAnalystPicks(gameId: string) {
  try {
    const { data } = await supabase
      .from('picks')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'active')
      .order('units_at_risk', { ascending: false })
      .limit(2)
    
    return data || []
  } catch (error) {
    return []
  }
}

/**
 * Generate NFL blueprint with Claude Sonnet 4.5
 */
async function generateNFLBlueprint(data: any[], periodId: string): Promise<string> {
  const prompt = `You are generating a comprehensive weekly blueprint for ${periodId} of the NFL season.

You have ${data.length} games to cover. For each game, provide:
1. **Quick narrative** (2-3 sentences max) - hit the key storylines, team form, injuries if relevant
2. **ONE top bet** (spread, total, or moneyline) with brief rationale (1-2 sentences)
3. **If analyst picks are available**, incorporate them naturally into your recommendation

Keep each game section to ~100-120 words. Total output should be 1200-1800 words depending on game count.

Format each game as:
---
### Game X: AWAY @ HOME
**Date/Time:** [formatted date and time]
[Your narrative and analysis here]
**Top Bet:** [Your pick] - [Rationale]
${data.some(g => g.analystPicks?.length > 0) ? '**Insider Pick:** [If available, mention analyst pick]' : ''}
---

Games data:
${JSON.stringify(data, null, 2)}

Write in a confident, analytical tone. Focus on actionable bets. Keep it concise but valuable.`

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.7,
      system: `You are an expert NFL analyst creating a weekly betting blueprint. Your goal is to provide clear, actionable betting recommendations for every game in the week. Focus on the most important factors: team form, key injuries, line value, and expert consensus. Be concise but insightful.`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const firstContent = completion.content[0]
    const script = firstContent && 'text' in firstContent ? firstContent.text : 'Unable to generate blueprint'
    
    return script
  } catch (error) {
    console.error('AI generation error:', error)
    throw error
  }
}

/**
 * Get end of week date (Sunday 11:59 PM EST)
 */
function getWeekEndDate(week: number): Date {
  const now = new Date()
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  
  // Find next Sunday
  const dayOfWeek = estDate.getDay()
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  
  const sunday = new Date(estDate)
  sunday.setDate(estDate.getDate() + daysUntilSunday)
  sunday.setHours(23, 59, 59, 999)
  
  return sunday
}

