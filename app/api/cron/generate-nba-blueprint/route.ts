import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

// Anthropic AI
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

/**
 * NBA Blueprint Generation Cron Job
 * Runs: Daily at 2:20 PM and 6:20 PM EST
 * Generates a daily blueprint covering all NBA games (if 4+ games)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🏀 === NBA BLUEPRINT GENERATION STARTED ===')
    const startTime = Date.now()

    // 1. Get today's date in EST
    const now = new Date()
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const periodId = estDate.toISOString().split('T')[0] // YYYY-MM-DD
    const runTime = estDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })
    
    console.log(`📅 Generating blueprint for ${periodId} (Run time: ${runTime})`)

    // 2. Fetch all NBA games for today
    const games = await fetchNBAGamesForDate(periodId)
    
    if (!games || games.length === 0) {
      console.log('⚠️  No NBA games found for today')
      return NextResponse.json({ 
        success: true, 
        skipped: true,
        reason: 'No games found',
        date: periodId
      })
    }

    // 3. Check if >= 4 games (minimum threshold)
    if (games.length < 4) {
      console.log(`⏭️  Skipping blueprint generation - only ${games.length} games today (minimum: 4)`)
      
      // Delete existing blueprint if exists (so UI doesn't show it)
      await supabase
        .from('blueprints')
        .delete()
        .eq('sport', 'nba')
        .eq('period_identifier', periodId)
      
      return NextResponse.json({ 
        success: true, 
        skipped: true,
        reason: 'Less than 4 games',
        gameCount: games.length,
        date: periodId
      })
    }

    console.log(`✅ Found ${games.length} NBA games for ${periodId}`)

    // 4. Compile lightweight data for each game
    const blueprintData = await compileNBABlueprintData(games)

    // 5. Generate AI blueprint
    console.log('🤖 Generating AI blueprint with Claude Sonnet 4.5...')
    const content = await generateNBABlueprint(blueprintData, periodId)

    // 6. Calculate expiration (end of day at 11:59 PM EST)
    const expiresAt = new Date(estDate)
    expiresAt.setHours(23, 59, 59, 999)

    // 7. Upsert to database (overwrite existing)
    const { data, error } = await supabase
      .from('blueprints')
      .upsert({
        sport: 'nba',
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
    console.log(`✅ NBA Blueprint generated successfully in ${duration}s`)
    console.log(`📊 Date: ${periodId}, Games: ${games.length}, Content length: ${content.length} chars`)

    return NextResponse.json({
      success: true,
      date: periodId,
      runTime,
      gameCount: games.length,
      contentLength: content.length,
      duration: `${duration}s`,
      blueprintId: data.id
    })

  } catch (error: any) {
    console.error('❌ NBA Blueprint generation failed:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Fetch all NBA games for a specific date
 */
async function fetchNBAGamesForDate(date: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/games/today`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Will fetch today's games
    })
    
    const data = await response.json()
    
    // Filter for NBA games on the specific date
    const nbaGames = data.games?.filter((g: any) => {
      if (g.sport !== 'NBA') return false
      
      // Check if game is on the target date
      const gameDate = new Date(g.gameTime).toISOString().split('T')[0]
      return gameDate === date
    }) || []
    
    return nbaGames
  } catch (error) {
    console.error('Error fetching NBA games:', error)
    return []
  }
}

/**
 * Compile lightweight data for blueprint generation
 */
async function compileNBABlueprintData(games: any[]) {
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
 * Generate NBA blueprint with Claude Sonnet 4.5
 */
async function generateNBABlueprint(data: any[], date: string): Promise<string> {
  const formattedDate = new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })

  const prompt = `You are generating a comprehensive daily blueprint for NBA games on ${formattedDate}.

You have ${data.length} games to cover. For each game, provide:
1. **Quick narrative** (2-3 sentences max) - team form, injuries, recent matchups, key factors
2. **ONE top bet** (spread, total, moneyline, or player prop) with brief rationale (1-2 sentences)
3. **If analyst picks are available**, incorporate them naturally into your recommendation

Keep each game section to ~80-100 words. Total output should be 800-1200 words depending on slate size.

Format each game as:
---
### Game X: AWAY @ HOME
**Tip-off:** [formatted time]
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
      max_tokens: 2500,
      temperature: 0.7,
      system: `You are an expert NBA analyst creating a daily betting blueprint. Your goal is to provide clear, actionable betting recommendations for every game on the slate. Focus on recent team performance, key player availability, pace factors, and line value. Be concise but insightful.`,
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

