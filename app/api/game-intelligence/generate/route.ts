import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { createClient } from '@supabase/supabase-js'
import type { GameIntelligenceData } from '../data/route'
import { currentUser, auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Supabase client for game scripts cache (using main Supabase project)
const supabaseMain = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

// Cache TTL: 2 hours - Scripts regenerate every cron run (every 2 hours)
const CACHE_TTL = 2 * 60 * 60 // 2 hours in seconds

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
    // Check if this is a cron job request (bypass auth)
    const isCronJob = request.headers.get('x-cron-secret') === process.env.CRON_SECRET
    
    let userId: string | null = null
    let user: any = null
    let isPremium = false
    let purchasedCreditsRemaining = 0

    if (!isCronJob) {
      // ✅ STEP 1: AUTHENTICATION CHECK (only for non-cron requests)
      const authResult = await auth()
      userId = authResult.userId
      user = await currentUser()

      if (!userId || !user) {
        console.log('❌ Unauthorized: No user authenticated')
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to generate AI scripts.' },
          { status: 401 }
        )
      }

      console.log(`👤 User authenticated: ${userId}`)

      // ✅ STEP 2: CHECK CREDITS IN SUPABASE USERS TABLE
      const { data: dbUser, error: fetchError } = await supabaseUsers
        .from('users')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

      if (fetchError || !dbUser) {
        console.error('❌ User not found in database:', fetchError)
        return NextResponse.json(
          { error: 'User not found. Please try signing in again.' },
          { status: 404 }
        )
      }

      console.log(`📊 User credits: Premium=${dbUser.is_premium}, Purchased=${dbUser.purchased_credits}, Used=${dbUser.ai_scripts_used}`)

      // ✅ STEP 3: CHECK IF USER HAS ACCESS (Premium OR has purchased credits remaining)
      isPremium = dbUser.is_premium || dbUser.access_level === 'full'
      purchasedCreditsRemaining = (dbUser.purchased_credits || 0) - (dbUser.ai_scripts_used || 0)
      const hasAccess = isPremium || purchasedCreditsRemaining > 0

      if (!hasAccess) {
        console.log('❌ No credits: User has no subscription and no purchased credits')
        return NextResponse.json(
          { error: 'No credits remaining. Please purchase credits or subscribe to continue.' },
          { status: 403 }
        )
      }

      console.log(`✅ User has access. Premium: ${isPremium}, Remaining credits: ${isPremium ? '∞' : purchasedCreditsRemaining}`)
    } else {
      console.log('🤖 Cron job request - bypassing auth')
    }

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

    // Get game time from data (use game's actual timestamp)
    const gameTime = data.game?.game_date || new Date().toISOString()
    
    // Determine current time window (EST) for cache refresh
    const now = new Date()
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const hour = estDate.getHours()
    
    // Time windows: Morning (10am-3pm), Afternoon (3pm-7pm), Evening (7pm-10am next day)
    let timeWindow: string
    if (hour >= 10 && hour < 15) {
      timeWindow = 'morning' // 10 AM - 2:59 PM EST
    } else if (hour >= 15 && hour < 19) {
      timeWindow = 'afternoon' // 3 PM - 6:59 PM EST
    } else {
      timeWindow = 'evening' // 7 PM - 9:59 AM EST
    }
    
    console.log(`🕐 Current time window: ${timeWindow} (${hour}:00 EST)`)
    console.log(`📅 Game time: ${gameTime}`)
    
    // User already authenticated at the top, use existing userId
    const clerkUserId = userId // Already set from auth check at line 38
    
    // ✅ CHECK SUPABASE FOR EXISTING SCRIPT FIRST
    // Check if a script for this game was generated within the last 2 hours (cache expiry)
    const twoHoursAgo = new Date()
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
    
    try {
      const { data: existingScripts, error: fetchError } = await supabaseMain
        .from('game_scripts')
        .select('*')
        .eq('game_id', gameId)
        .eq('sport', league.toUpperCase())
        .gte('generated_at', twoHoursAgo.toISOString()) // Only fetch scripts generated in last 2 hours
        .order('generated_at', { ascending: false })
        .limit(1)
      
      const existingScript = existingScripts && existingScripts.length > 0 ? existingScripts[0] : null

      if (!fetchError && existingScript && existingScript.script_content) {
        console.log(`✅ Script found in Supabase! Reusing cached version.`)
        console.log(`📊 Script ID: ${existingScript.id}`)
        console.log(`📅 Generated: ${existingScript.generated_at}`)
        console.log(`⏰ Cache expires: ${existingScript.expires_at}`)
        
        // Update updated_at timestamp to track views
        await supabaseMain
          .from('game_scripts')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', existingScript.id)
        
        // ✅ DEDUCT CREDITS based on data strength (only for non-premium users)
        if (!isCronJob && !isPremium && userId) {
          const creditsToDeduct = existingScript.data_strength // Use stored data strength from cached script
          console.log(`💳 Deducting ${creditsToDeduct} credit(s) from user ${userId} (Cached - Data Strength: ${creditsToDeduct})`)
          
          // Re-fetch dbUser since it's in the if block scope
          const { data: dbUser } = await supabaseUsers
            .from('users')
            .select('ai_scripts_used')
            .eq('clerk_user_id', userId)
            .single()
          
          const { error: deductError } = await supabaseUsers
            .from('users')
            .update({ 
              ai_scripts_used: (dbUser?.ai_scripts_used || 0) + creditsToDeduct,
              last_active_at: new Date().toISOString()
            })
            .eq('clerk_user_id', userId)
          
          if (deductError) {
            console.error('❌ Failed to deduct credits:', deductError)
          } else {
            console.log(`✅ ${creditsToDeduct} credit(s) deducted. New total: ${(dbUser?.ai_scripts_used || 0) + creditsToDeduct}`)
          }
        }
        
        // Artificial 5-second delay so user feels like script is being generated
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        return NextResponse.json({
          gameId,
          script: existingScript.script_content,
          dataStrength: existingScript.data_strength,
          generatedAt: existingScript.generated_at,
          cached: true
        } as GeneratedScript)
      }
      
      console.log(`📝 No cached script found - generating new one...`)
    } catch (supabaseError) {
      console.error('⚠️ Supabase check failed:', supabaseError)
      // Continue to generate new script
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

    console.log('Sending request to Claude Sonnet 4.5...')
    console.log('Prompt length:', prompt.length, 'characters (~', Math.round(prompt.length / 4), 'tokens)')
    
    let completion
    try {
      completion = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        temperature: 0.7,
        system: `You're a sharp sports bettor who's been grinding for years. You text like you talk - confident, direct, and you get excited when you spot real value. You've seen enough games to know when something smells off.

## YOUR PERSONALITY:

You're not writing a report - you're texting a buddy about plays you actually like. You have money on these games. You get annoyed when lines don't make sense. You get fired up when you find an edge everyone's missing.

## YOUR JOB:

Write a 450-500 word breakdown that builds to 2-3 plays you'd actually bet. React to the data like it matters. Make every sentence count.

## HOW TO ANALYZE - HUNT FOR MISMATCHES:

This is where value lives. You're looking for rank gaps that scream "bet this":

**ELITE VS WEAK = MONEY:**
- Top 10 offense vs Bottom 10 defense = immediate red flag
- Rank gap of 15+ = exploitable edge
- Example: "#5 pass offense (267 YPG) going against #28 pass defense (251 YPG allowed)" = 23-rank spread = that's not a game, that's a mismatch

**YOU'LL GET DATA WITH RANK + VALUE:**
- Format: rank=5, value=267.4 means #5 ranked, averaging 267.4 YPG
- ALWAYS cite both: "Bears #5 in pass offense (267.4 YPG) vs Bengals #28 defense allowing 251.2 YPG"
- That's not just ranks - that's a 16 yard per game edge backed by a 23-rank gap. Double confirmation.

**WHAT TO LOOK FOR (IN THIS ORDER):**
1. **H2H history (CRITICAL)** - If provided, use it! "Last 3 meetings: Home team 3-0 ATS, avg total 58.7" validates or contradicts current lines
2. **Matchup exploits** - Where's the biggest rank differential? Lead with that
3. **Efficiency gaps** - Yards/play, 3rd down %, red zone % (these predict scoring)
4. **Sharp money** - When money % significantly exceeds bet % (e.g., 40% of bets but 60% of money), pros are loading up on one side
5. **RLM (Reverse Line Movement)** - When the line moves AGAINST the public betting direction. Example: 80% on Team A but the line moves toward Team B = RLM
6. **ATS trends** - "2-8 ATS as road favorites" isn't random
7. **Sport-specific factors** (see below)
8. **Player props (MANDATORY IF PROVIDED)** - Weave into game script, don't list at end

## SPORT-SPECIFIC ANALYSIS:

**FOR CFB (COLLEGE FOOTBALL):**
- **Coaching matchups** - "First-year coach vs 20-year veteran with 8-2 ATS in conference" matters MORE than NFL coaching
- **Conference dynamics** - SEC teams vs Pac-12, home field advantage is MASSIVE in CFB
- **Rivalry games** - "This is Alabama-Auburn. Stats go out the window. Last 5 meetings: Dog is 4-1 ATS"
- **Talent gaps** - Top 25 teams vs unranked can be 20+ point spreads. Look for value in mid-tier matchups
- **Travel** - Cross-country games (Pac-12 to East Coast) create letdown spots

**FOR NHL:**
- **Goalie matchups** - "Elite goalie (#3 save %) vs backup (#28 save %) = massive edge"
- **Back-to-backs** - Teams on 2nd night of back-to-back are 45% ATS historically
- **Special teams** - Power play % vs Penalty kill % creates scoring/total edges
- **Pace** - High-tempo teams vs defensive traps = total implications
- **Home ice** - Bigger factor than NBA (last change, matchups)

**FOR NFL/NBA:**
- Referee/pace as normal (already covered)

## HOW TO USE ANALYST PICKS:

You'll see write-ups from other sharp bettors. DON'T just list their picks. Instead:
- ✅ Steal their thesis if data backs it ("volume spot for this RB")
- ✅ Layer in your own supporting stats
- ✅ Present the PLAY as your conclusion, not theirs
- ✅ If you agree with 3+ data points supporting it? Feature it prominently
- ✅ If data conflicts? Acknowledge but don't lead with it
- ❌ Never say "Analyst X likes this" - if you like it, make it YOUR play

## WRITING STYLE:

### Sound Natural:
- "Cowboys laying 3.5 on the road? Against a defense they can't run on? Books are begging for Dallas money."
- "Everyone's on the over. You know what? They're right. #3 offense vs #29 defense. Sometimes it's that simple."
- "This line stinks of trap"
- "Found it. The angle everyone's missing..."

### React to Data - Don't List It:
- ❌ "Sharp money shows 45% of bets but 61% of money"
- ✅ "Sharps are all over Raiders - only 45% of bets but 61% of the actual money. That 16-point gap? That's professionals betting their mortgage, not Joe Public throwing $20 on his favorite team."

### Tell Stories with Stats:
- ❌ "Cowboys are 2-8 ATS as road favorites"
- ✅ "Cowboys laying road points? Two and eight ATS. But sure, let's give them 3.5 in Vegas..."

### Get Excited About Edges:
- "Wait. Bowers over 71.5 at -112? Against THIS Cowboys defense that's #32 against TEs? After back-to-back 127 and 103-yard games? Hammer it."
- "This is the spot. Bears #3 rush offense (157 YPG) vs Bengals #28 rush defense (148 YPG allowed). That's not close - that's demolition."

## 🚨 H2H DATA IS MANDATORY (IF PROVIDED):

You'll get 3-year head-to-head history. USE IT to validate or contradict your thesis:

**EXAMPLES:**
- "Last 3 meetings: Home team 3-0 ATS, avg total 58.7. History says this goes over."
- "Eagles average 31.2 PPG vs GB's secondary in their last 5 matchups. This isn't new - Philly owns this matchup."
- "Road team is 4-0 ATS in last 4 meetings with avg margin of +8.2 points. Market hasn't adjusted."

If h2h data contradicts current lines → that's your angle. If it confirms → stack it with other evidence.

## 🚨 PROPS ARE MANDATORY (IF PROVIDED):

Props aren't optional - they're extensions of your game script. Weave them into your narrative:

**CONNECT PROPS TO GAME SCRIPT:**
- "Bears are gonna pound the rock all game. Montgomery over 78.5 rush yards (-110)? He's hitting 110+. Bengals rank #28 stopping the run - they can't get off the field."
- "49ers go up early (and they will - #7 offense vs #25 defense), then Purdy coasts. UNDER 248.5 pass yards (-115) is the move."

**CITE HIT RATES WHEN PROVIDED:**
- "Collins over 24.5 longest reception (-110) hits 71.4% of the time (15-6 record). Against Buffalo's #22 pass defense? Easy money."
- "Fairbairn over 1.5 FGs (-140) hits 83.3% (20-4). Houston's offense stalls in red zone = multiple field goals."

**PROPS VALIDATE YOUR THESIS:**
- Don't say: "I like the over. Also Mahomes props look good."
- Say: "Over 52 hits because Mahomes goes nuclear. Over 2.5 passing TDs (+115)? That's HOW you get there."

**ONLY USE PROPS EXPLICITLY PROVIDED** - Never invent lines!

📝 STRUCTURE (450-500 WORDS, NO SECTION HEADERS):

**🚨 CRITICAL: Your output MUST be 4-5 FLOWING PARAGRAPHS with NO headers/sections. Just natural text like you're texting.**

**⚠️ AVOID SHORT, CHOPPY PARAGRAPHS! Each paragraph should be SUBSTANTIAL (75-150+ words). Let your thoughts flow naturally from one point to the next within the same paragraph. DON'T break into a new paragraph every 2-3 sentences.**

**Paragraph 1 (75-100 words)** - Open with immediate reaction to the line/matchup:
"Dallas laying road points against anyone right now is comedy, but 3.5 against Vegas? Books are begging for Cowboys money here. Line opened Dallas -4.5 and sharp money immediately hit Vegas +4.5, driving it down to 3.5. When's the last time you saw a line move TOWARD the public side? That's pros betting Vegas, and they're not done. Cowboys are 2-8 ATS laying points on the road. Two and eight!"

**Paragraphs 2-3 (300-350 words total)** - Build your case with LONG, FLOWING analysis. Don't break paragraphs unless you're shifting to a completely different angle:
"Here's the thing - Cowboys put up 29 PPG, looks great on ESPN. But that's against bad teams giving them short fields. Against teams over .500? Eighteen points per game. And now they're getting Vegas fresh off nearly beating Kansas City? Last three meetings between these teams? Road team is 3-0 ATS with an average margin of 9.2 points. Market still hasn't caught up. The Pickens over 63.5 receiving yards is sitting there and honestly, it's too obvious. Vegas knows he's torched them for 78+ four straight weeks. They know he destroys Cover 3. They STILL hung this number. Why? Because Russell Wilson in primetime unders hits 67% over the last three years. They're banking on ugly football. I'll bite on Pickens because the matchup is too good, but I'm not loading up.

What I'm loading up on is **Bowers over 71.5 receiving yards (-112)**. When an OC goes on radio and says 'we need to force-feed our best player' and that player's line is still in the 70s? Against Dallas? Cowboys give up 8.2 yards per target to TEs - dead last. Not one of the worst - THE worst. Bowers just went for 127 and 103 in his last two healthy games. This prop hits 71.4% of the time (15-6). Math doesn't lie. And here's the kicker - when Vegas is getting points at home and losing the TO battle, Bowers averages 9.2 targets per game. Volume plus matchup equals money."

**Paragraph 4 (75 words)** - Close with conviction and your final plays:
"So here's what we're doing: **Raiders +3.5 (-110)** is the side - sharps don't lie and this line movement is screaming value. **Bowers over 71.5 receiving yards (-112)** is my favorite play on the board. **Under 50.5 (-110)** if you trust the sharp steam. Final score comes in around Cowboys 24, Raiders 23. Dallas probably wins but doesn't cover. Bowers goes for 85+. Book it."

**REMEMBER:** These structure notes are for YOUR understanding. Your ACTUAL OUTPUT should have ZERO headers - just 4-5 SUBSTANTIAL, FLOWING paragraphs. Think of it like texting a buddy - you don't start a new paragraph every other sentence. Let your analysis flow naturally within each paragraph before moving to the next major point.

## PHRASES TO USE (Sound like a sharp):

- "This line stinks" / "Line's off"
- "Books are begging you to take..."
- "Sharps hammered this"
- "Square money all over [team]"
- "Can't believe they hung this number"
- "This is the spot"
- "Trap line if I've ever seen one"
- "Fading the public here"
- "Everyone and their mother is on..."
- "Market hasn't caught up"
- "Dead last" / "Bottom of the league"
- "Books know something we don't... or do they?"

## BANNED PHRASES (Don't sound like a robot):

- ❌ "Upon analyzing the data..."
- ❌ "The statistics indicate..."
- ❌ "Furthermore..." / "Moreover..."
- ❌ "Let's examine..."
- ❌ "In conclusion..."
- ❌ "This is an interesting matchup..."
- ❌ "When you look at the data..."
- ❌ Any formal academic language

## FORMATTING RULES:

**Bold ONLY actual plays you're recommending:**
- ✅ **Eagles -3.5 (-110)**
- ✅ **Bowers over 71.5 receiving yards (-112)**
- ✅ **UNDER 46.5 (-110)**
- ❌ Don't bold team names for emphasis
- ❌ Don't bold stats

**Always cite rank + value together:**
- ✅ "Bears #3 in rush offense (157.2 YPG)"
- ❌ "Bears rank #3 in rushing"
- ❌ "Bears average 157.2 rushing yards"

**Natural voice examples:**

BAD: "George Pickens has accumulated 78+ receiving yards in four consecutive games and faces a Raiders defense ranked 29th in YPRR allowed to outside receivers."

GOOD: "Pickens has torched everyone for 78+ yards four straight games, and now he gets Vegas? The same Vegas defense that just let DJ Moore go for 96? This number should be in the 70s, not 63."

BAD: "The sharp vs public betting split shows a 16% divergence favoring Vegas."

GOOD: "Sharps are all over Vegas +3.5. Getting 45% of bets but 61% of the money? That 16% gap? That's pros betting their mortgage against public Cowboys money."

## CRITICAL RULES:

1. **450-500 words total** - Be ruthlessly concise
2. **4-5 paragraphs ONLY** - No section headers, no breaks, just flowing text
3. **H2H data is MANDATORY if provided** - Use 3-year history to validate thesis
4. **Props are MANDATORY if provided** - Weave into game script, cite hit rates
5. **Cite rank + value for every stat** - "Bears #5 (157.2 YPG)" not just "#5"
6. **React to data, don't list it** - You're excited/annoyed/confident
7. **Connect game script → matchups → props → h2h** - Everything validates everything
8. **2-3 plays maximum** - Bold them clearly in your closing paragraph
9. **ONLY use props/players explicitly provided** - Never invent lines

Educational purposes only. Not financial advice.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    } catch (anthropicError: any) {
      console.error('❌ Anthropic API error:', anthropicError)
      console.error('Error status:', anthropicError?.status)
      console.error('Error message:', anthropicError?.message)
      throw new Error(`Claude generation failed: ${anthropicError?.message || 'Unknown error'}`)
    }

    // Extract text from Claude's response structure
    const firstContent = completion.content[0]
    const script = firstContent && 'text' in firstContent ? firstContent.text : 'Unable to generate script'
    console.log('✅ Script generated successfully')
    console.log('Script length:', script.length, 'characters')

    // ✅ SAVE TO SUPABASE FOR PERSISTENT CACHING
    try {
      console.log('💾 Attempting to save script to Supabase...')
      console.log('Script length:', script.length, 'characters')
      console.log('Game ID:', gameId)
      console.log('Sport:', league.toUpperCase())
      console.log('Supabase URL:', process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co')
      console.log('Supabase Key exists:', !!process.env.SUPABASE_KEY)
      
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 2) // Expires in 2 hours
      
      const now = new Date().toISOString()
      
      // Check if a script already exists for this game
      const { data: existingCheck } = await supabaseMain
        .from('game_scripts')
        .select('id')
        .eq('game_id', gameId)
        .eq('sport', league.toUpperCase())
        .limit(1)
      
      let saveResult
      
      if (existingCheck && existingCheck.length > 0) {
        // Update existing script
        console.log('📝 Updating existing script in database...')
        saveResult = await supabaseMain
          .from('game_scripts')
          .update({
            script_content: script,
            data_strength: data.dataStrength,
            generated_at: now,
            expires_at: expiresAt.toISOString(),
            updated_at: now
          })
          .eq('game_id', gameId)
          .eq('sport', league.toUpperCase())
          .select()
      } else {
        // Insert new script
        console.log('📝 Inserting new script into database...')
        saveResult = await supabaseMain
          .from('game_scripts')
          .insert({
            game_id: gameId,
            sport: league.toUpperCase(),
            game_time: gameTime,
            away_team: data.game?.away_team || 'Unknown',
            home_team: data.game?.home_team || 'Unknown',
            script_content: script,
            data_strength: data.dataStrength,
            generated_at: now,
            expires_at: expiresAt.toISOString(),
            created_at: now,
            updated_at: now
          })
          .select()
      }

      if (saveResult.error) {
        console.error('⚠️ Failed to save script to Supabase!')
        console.error('Error code:', saveResult.error.code)
        console.error('Error message:', saveResult.error.message)
        console.error('Error details:', saveResult.error.details)
        console.error('Error hint:', saveResult.error.hint)
        // Continue anyway - script still generated
      } else {
        console.log(`✅ Script saved to Supabase successfully!`)
        console.log('Row ID:', saveResult.data?.[0]?.id)
      }
    } catch (supabaseError: any) {
      console.error('⚠️ Supabase save failed with exception:')
      console.error('Exception message:', supabaseError?.message)
      console.error('Exception stack:', supabaseError?.stack)
      // Continue anyway
    }

    // ✅ DEDUCT CREDITS based on data strength (only for non-premium users and non-cron)
    if (!isCronJob && !isPremium && userId) {
      const creditsToDeduct = data.dataStrength // 1, 2, or 3 credits based on data quality
      console.log(`💳 Deducting ${creditsToDeduct} credit(s) from user ${userId} (Data Strength: ${data.dataStrength})`)
      
      // Re-fetch dbUser since it's in the if block scope
      const { data: dbUser } = await supabaseUsers
        .from('users')
        .select('ai_scripts_used')
        .eq('clerk_user_id', userId)
        .single()
      
      const { error: deductError } = await supabaseUsers
        .from('users')
        .update({ 
          ai_scripts_used: (dbUser?.ai_scripts_used || 0) + creditsToDeduct,
          last_active_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId)
      
      if (deductError) {
        console.error('❌ Failed to deduct credits:', deductError)
      } else {
        console.log(`✅ ${creditsToDeduct} credit(s) deducted. New total: ${(dbUser?.ai_scripts_used || 0) + creditsToDeduct}`)
      }
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
    
    prompt += `🚨 **CRITICAL INSTRUCTIONS - CREATE A NARRATIVE, DON'T REGURGITATE:**\n\n`
    prompt += `**YOUR JOB:** Write an intelligent betting story that reveals hidden edges in this game.\n\n`
    prompt += `**THE APPROACH:**\n`
    prompt += `1. **START WITH A THESIS** - What's the REAL story this game? (e.g., "This line is a trap", "The total is begging to be attacked", "The market is overlooking a key injury")\n`
    prompt += `2. **BUILD YOUR CASE** - Use team stats, public betting, injuries, trends, game script to explain WHY\n`
    prompt += `3. **WEAVE IN ANALYST PICKS AS PROOF** - When you identify an edge, say "That's exactly why [Analyst Name] is backing [specific pick]..."\n`
    prompt += `4. **CONNECT THE DOTS** - Show how everything ties together into a cohesive betting strategy\n\n`
    prompt += `**HOW TO USE ANALYST PICKS:**\n`
    prompt += `- DON'T start with "Our analysts like..." - That's boring\n`
    prompt += `- DO build context first, THEN introduce their pick as validation\n`
    prompt += `- Example: "The 49ers' defense ranks 4th-worst against WRs (165.2 YPG) and plays Cover 3 at the 6th-highest rate—exactly the coverage elite receivers exploit. **That's why our top analysts are hammering McMillan O65.5 receiving yards (-111)** after his 8/130/2 explosion last week. He averages 2.13 yards per route vs Cover 3 with a .25 target rate across 111 routes..."\n\n`
    prompt += `**NARRATIVE STRUCTURE (600-700 words):**\n`
    prompt += `• **Opening Hook** (2-3 sentences): Set the stage. What's interesting about this matchup?\n`
    prompt += `• **Build the Case** (3-4 paragraphs): Use stats/public betting/trends to reveal the edge\n`
    prompt += `• **Introduce Analyst Picks** (woven throughout): "This is why [Name] is backing [pick]..."\n`
    prompt += `• **Connect to Game Script**: Show how the flow of the game supports your thesis\n`
    prompt += `• **Strong Close**: Summarize the edge and rank the plays by confidence\n\n`
    prompt += `Write one cohesive story where EVERY paragraph has 5-10 specific stats integrated naturally.\n\n`
    
    prompt += `❌ **BAD (FLUFFY) PARAGRAPH:**\n`
    prompt += `"The Bears have a slight edge in this matchup. Their offense has shown the ability to move the ball, while the Bengals' defense has struggled throughout the season. This creates an interesting dynamic that could favor Chicago."\n`
    prompt += `→ NO SPECIFIC DATA. WORTHLESS.\n\n`
    
    prompt += `✅ **GOOD (DATA-DENSE) PARAGRAPH:**\n`
    prompt += `"The **Bears -2.5 (-112)** capitalizes on a massive defensive mismatch. Cincinnati allows 31.6 PPG (#32), 143.3 rush yards/game (#27), and ranks 29th in 3rd down defense (44.2%). The Bears score 24 PPG (#15), but their 5.8 yards/play (#7) suggests efficiency that exceeds their scoring rank. Ben Johnson is 7-0 ATS as an OC after a loss. Road teams off a loss hit 57% ATS with 11% ROI over the last three seasons. Public is on Cincinnati (58% of bets, 57% of money) despite the statistical mismatch."\n`
    prompt += `→ 10+ SPECIFIC STATS IN ONE PARAGRAPH. THIS IS WHAT WE NEED.\n\n`
    prompt += `⚠️ NOTE: If this was an analyst pick from our data, it would be formatted as **Bears -2.5 (AnalystName, -112)** using their actual name. Otherwise just use odds.\n\n`
    
    prompt += `**EVERY PARAGRAPH SHOULD LOOK LIKE THE GOOD EXAMPLE.**\n\n`
    prompt += `- Extract EVERY stat from analyst analysis (exact ATS records, ROI, weather, trends)\n`
    prompt += `- Use EVERY Team Rankings stat provided (PPG, yards/play, 3rd down %, red zone %, passing/rushing ranks)\n`
    prompt += `- Include referee O/U record, spread tendencies if available\n`
    prompt += `- Cite public betting %s, RLM, sharp action\n`
    prompt += `- Support every prop with 3-4 stats minimum\n\n`
    prompt += `**NO SECTION HEADERS. NO FLUFF. JUST DATA-PACKED NARRATIVE.**\n\n`
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  }
  
  // Documentation removed - AI already knows these metrics, saves ~4,500 tokens per generation
  
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
        prompt += `**NARRATIVE FIRST, DATA SECOND:**\n`
        prompt += `1. **OPEN WITH YOUR ANGLE**: What's the hidden edge? What is the market missing? Start with a thesis, not a data dump.\n`
        prompt += `2. **BUILD THE STORY**: Use stats to SUPPORT your narrative, not BE your narrative\n`
        prompt += `3. **WRITE LIKE A SHARP BETTOR**: Confident, direct, conversational. "This line is a trap" not "We believe there may be value"\n\n`
        
        prompt += `**ANALYST PICKS AS EVIDENCE:**\n`
        prompt += `4. **NEVER LEAD WITH "OUR ANALYSTS LIKE..."**: That's boring. Build context FIRST, then introduce picks as proof\n`
        prompt += `5. **USE THIS FORMAT**: "[Build context with stats] → That's exactly why [Analyst Name] is backing [specific pick]..."\n`
        prompt += `6. **ONLY USE PROVIDED PICKS**: Never invent props. If analyst said "McMillan O65.5", use that exact pick\n\n`
        
        prompt += `**DATA INTEGRATION:**\n`
        prompt += `7. **CONNECT THE DOTS**: Spread → Game script → Matchups → Specific picks. Show the causal chain.\n`
        prompt += `8. **EXPLOIT MISMATCHES**: Top 10 offense vs Bottom 10 defense? THIS is where value lives. Highlight it.\n`
        prompt += `9. **PUBLIC BETTING CONTEXT**: Use bet % vs $ % splits to show where sharps are leaning\n`
        prompt += `10. **BOLD KEY PICKS**: Format as **[Player] OVER/UNDER [number] ([odds])**\n\n`
        
        prompt += `**WRITING STYLE:**\n`
        prompt += `11. **NO FLUFF INTROS**: Skip "In this matchup" or "A deep dive". Start with impact.\n`
        prompt += `12. **SPECIFIC NUMBERS ONLY**: Never "strong offense" - say "28.4 PPG (#3)"\n`
        prompt += `13. **NEVER MENTION "TEAMRANKINGS"**: Just cite stats directly or say "team ranks"\n`
        prompt += `14. **MINIMUM 500 WORDS**: This is an intelligent breakdown, not a tweet\n\n`
        
        prompt += `**STRUCTURE:**\n`
        prompt += `• Hook (1-2 sentences): The angle\n`
        prompt += `• Build the case (60% of script): Stats, trends, matchups\n`
        prompt += `• Introduce picks naturally (30%): Woven into the narrative\n`
        prompt += `• Close strong (10%): Rank plays by confidence\n\n`
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
  
  // NARRATIVE FLOW - STORY FIRST
  prompt += `**🎯 YOUR NARRATIVE APPROACH:**\n`
  prompt += `Think like an investigative reporter uncovering a betting edge, not a robot reciting stats.\n\n`
  prompt += `**BAD OPENING (boring data dump):**\n`
  prompt += `"The 49ers are 7-point favorites at home against Carolina. San Francisco's offense ranks 2nd in passing (254.5 YPG) while Carolina allows 212.8 passing yards (#16). George Kittle over 56.5 receiving yards is a strong play..."\n\n`
  prompt += `**GOOD OPENING (narrative with angle):**\n`
  prompt += `"This game is setting up as a pass-funnel nightmare for Carolina disguised as a routine blowout. The public sees 49ers -7 at home and assumes a run-heavy beatdown, but the underlying matchup data tells a completely different story. The 49ers' 254.5 passing yards per game (#2) meets a Panthers defense that ranks 4th-worst against WRs (165.2 YPG) while deploying Cover 3 at the 6th-highest rate—exactly the coverage elite pass-catchers destroy..."\n\n`
  prompt += `See the difference? The second version creates intrigue, sets up WHY the edge exists, then flows into specific plays naturally.\n\n`

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
    console.log(`🎯 [PROPS] Adding ${playerProps.length} prop categories to prompt`)
    console.log(`🎯 [PROPS] Total players: ${playerProps.reduce((sum, cat) => sum + cat.players.length, 0)}`)
    
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
      prompt += `⚠️ CRITICAL: Use the EXACT prop type shown below (e.g., "Longest Rush" NOT "rushing yards", "Reception Yards" NOT "receiving yards").\n\n`
      skillPositionProps.slice(0, 8).forEach(category => { // Show more categories
        const topPlayers = category.players.slice(0, 4) // Show more players per category
        if (topPlayers.length > 0) {
          prompt += `\n**${category.title}:**\n`
          topPlayers.forEach(player => {
            const hitRate = ((player.record.hit / player.record.total) * 100).toFixed(1)
            const odds = player.best_line?.opening_odds || 'N/A'
            const formattedOdds = odds !== 'N/A' ? (odds > 0 ? `+${odds}` : `${odds}`) : 'N/A'
            // Include the FULL prop type in the line for clarity
            const propDescription = category.title.replace(' (Over/Under)', '').replace(' (Over only)', '')
            prompt += `- ${player.player_name} ${propDescription}: ${player.prop_type} ${player.opening_line} (${formattedOdds}) | Hit Rate: ${hitRate}% (${player.record.hit}-${player.record.miss})\n`
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

  prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  prompt += `🎯 YOUR TASK: CONNECT ALL THE DOTS\n`
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  prompt += `Write a 600-700 word narrative that:\n\n`
  
  prompt += `1. **Explains the matchup story**: How do these teams' strengths/weaknesses create opportunities?\n`
  prompt += `2. **Connects offense vs defense**: Don't just say "Team A scores 28 PPG, Team B allows 24" - explain WHY the matchup matters\n`
  prompt += `3. **Uses public/sharp splits intelligently**:\n`
  prompt += `   - High public % + weak data = fade opportunity\n`
  prompt += `   - Sharp money = money% significantly exceeds bet% (e.g., 40% bets but 65% money = sharps loading up)\n`
  prompt += `   - RLM = line moves AGAINST public direction (e.g., 80% on Team A but line moves toward Team B)\n`
  prompt += `4. **Weaves in plays naturally**: As you explain game script, introduce bets that capitalize on the edges you're describing\n`
  prompt += `5. **Only suggests plays from the data**: If a prop isn't listed above with hit rate/odds, DON'T mention it\n\n`
  
  prompt += `**FLOW EXAMPLE:**\n`
  prompt += `"The 76ers open as 2.5-point favorites against Cleveland, and the public is all over Philly (65% bets, 70% money). But here's the thing - Philadelphia's league-leading 125.7 PPG (#1) isn't just empty scoring. They rank 2nd in FG% (48.2%) and 5th in 3PT% (37.5%), creating a legitimate 10+ point offensive advantage over Cleveland's 114.1 PPG (#23). The Cavaliers' defense allows 25.5 assists per game (#11), suggesting defensive breakdowns that favor Philly's ball movement (27.3 APG, #3). This efficiency gap supports the **76ers -2.5 (-110)** even with heavy public backing.\n\nThe game script gets more interesting when you look at pace. Cleveland's 23rd-ranked offense typically plays slower (22.1 seconds per possession), but facing Philadelphia's elite transition defense forces them further into their half-court weaknesses..."\n\n`
  
  prompt += `**KEY REMINDERS:**\n\n`
  prompt += `✅ DO:\n`
  prompt += `- Connect stats: "Team X's #1 rush offense vs Team Y's #27 rush defense → RB props OVER"\n`
  prompt += `- Explain sharp money: "40% of bets but 65% of money on Raiders = sharps loading up"\n`
  prompt += `- Explain RLM: "78% public on Cowboys but line moved from -4.5 to -3.5 toward Raiders = RLM = sharp fade"\n`
  prompt += `- Use analyst write-ups: If an analyst provided detailed analysis, USE IT and credit them\n`
  prompt += `- Focus on spreads/totals if props are weak: Not every game needs 5 player props\n`
  prompt += `- Include hit rates: **Player OVER X.X (odds)**: 68% hit rate (15-7)\n\n`
  
  prompt += `❌ DON'T:\n`
  prompt += `- List disconnected stats: "Team A: 28 PPG. Team B: 24 PPG."\n`
  prompt += `- Invent props that aren't in the data\n`
  prompt += `- Make up player names (if you don't know the QB, say "the quarterback")\n`
  prompt += `- Use section headers like "Matchup Analysis" or "Top Plays"\n`
  prompt += `- Write generic fluff: "This should be a competitive game" or "Both teams are playing well"\n`
  prompt += `- Rename prop types: If it says "Longest Rush", DO NOT call it "rushing yards" - use the exact prop name!\n\n`
  
  prompt += `**TARGET: 600-700 words. Every paragraph should connect 3+ specific stats with context and causality.**\n\n`
  
  prompt += `🚨🚨🚨 CRITICAL - ANALYST PICKS 🚨🚨🚨\n`
  prompt += `If analyst picks exist above, YOU MUST:\n`
  prompt += `1. START your script by discussing their picks in the opening paragraph\n`
  prompt += `2. Use their EXACT player names, props, and analysis\n`
  prompt += `3. NEVER suggest different props - their picks are the PRIMARY plays\n`
  prompt += `4. Support their analysis with team rankings, public money, and other data\n`
  prompt += `5. DO NOT invent other props if analyst picks exist - focus on supporting their plays\n\n`

  return prompt
}

export const dynamic = 'force-dynamic'

