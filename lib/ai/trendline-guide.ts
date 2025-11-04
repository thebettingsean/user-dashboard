/**
 * Comprehensive guide for interpreting Trendline Labs API data
 * This teaches the AI what every data point means and how to use it
 */

export const TRENDLINE_API_GUIDE = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TRENDLINE API DATA INTERPRETATION GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This guide explains EXACTLY what each data point means and how to use it in your analysis.

═══════════════════════════════════════════════════════════════════════
1️⃣ PUBLIC MONEY DATA - Understanding Sharp vs Public Action
═══════════════════════════════════════════════════════════════════════

**What You'll See:**
- Moneyline: Away/Home bets % and stake %
- Spread: Away/Home bets % and stake %
- Over/Under: Over/Under bets % and stake %

**How to Interpret:**

🔹 **BETS % vs STAKE %**
- BETS % = percentage of tickets (# of bets placed)
- STAKE % = percentage of money wagered ($ amount)
- Example: "Ravens 65% bets, 42% money"
  → Means: MORE people betting Ravens, but LESS money
  → Translation: PUBLIC loves Ravens, SHARPS fading them
  → Betting Angle: Fade the Ravens (sharp action on opponent)

🔹 **SHARP MONEY INDICATORS**
When stake % is MUCH HIGHER than bets %:
- Example: "Bears 35% bets, 58% money"
  → Fewer bets but MORE money = sharp bettors on Bears
  → Betting Angle: Follow the money (Bears are the sharp side)

When stake % is MUCH LOWER than bets %:
- Example: "Packers 70% bets, 45% money"
  → More bets but LESS money = public square action
  → Betting Angle: Fade the Packers (sharps on opponent)

🔹 **IDEAL THRESHOLDS FOR BETTING ANGLES:**
- Sharp Money Indicator: Stake % is 15%+ HIGHER than bets %
  → Example: 40% bets, 60% money = 20% difference = SHARP SIDE
- Public Trap Indicator: Stake % is 15%+ LOWER than bets %
  → Example: 75% bets, 50% money = 25% difference = FADE THIS SIDE

🔹 **HOW TO WRITE THIS:**
✅ GOOD: "The public is all over the Ravens (68% of bets, 72% of money), but when the majority is THIS unified, books often win. Sharp indicators missing—no money split."
✅ GOOD: "Sharp money is flooding the Bears (32% bets, 61% money). Big bettors are fading the public narrative."
❌ BAD: "The betting trends favor the home team." (Too vague, no specific numbers)

═══════════════════════════════════════════════════════════════════════
2️⃣ REVERSE LINE MOVEMENT (RLM) - The Most Powerful Indicator
═══════════════════════════════════════════════════════════════════════

**What RLM Means:**
RLM = Line moves AGAINST public betting majority
- This is the #1 sign of sharp action forcing books to adjust odds

**Example Scenarios:**

🔹 **SPREAD RLM:**
- Line opened: Bears -2.5
- Public betting: 72% on Bears -2.5
- Line moved to: Bears -3.5
- **INTERPRETATION:** Line moved MORE in favor of Bears despite majority already on them
  → Books are NOT worried about public liability
  → Sharps hammering Bears, books respect the sharp action
  → **BETTING ANGLE:** Bears -3.5 is the sharp side

🔹 **SPREAD RLM (FADE SCENARIO):**
- Line opened: Dolphins -6.5
- Public betting: 78% on Dolphins -6.5
- Line moved to: Dolphins -6.0 (moved DOWN despite public on Dolphins)
- **INTERPRETATION:** Line moved TOWARD the underdog despite public on favorite
  → This is REVERSE line movement (RLM)
  → Sharps are hammering the underdog +6
  → Books lowering the spread to make Dolphins less attractive
  → **BETTING ANGLE:** Opponent +6 is the sharp side (FADE the Dolphins)

🔹 **MONEYLINE RLM:**
- Opened: Lakers -180
- Public: 80% on Lakers
- Current: Lakers -160 (odds got WORSE despite public support)
- **INTERPRETATION:** Sharps on opponent, books made Lakers less expensive
  → **BETTING ANGLE:** Opponent ML is the sharp side

🔹 **OVER/UNDER RLM:**
- Opened: O/U 215.5
- Public: 73% on Over
- Current: O/U 213.5 (line moved DOWN)
- **INTERPRETATION:** Line moved OPPOSITE of public (RLM detected)
  → Sharps hammering the Under
  → Books lowering total to discourage Over bets
  → **BETTING ANGLE:** Under 213.5 is the sharp side

**How to Use RLM in Your Writing:**
✅ GOOD: "Classic RLM scenario: 78% of bets on the Dolphins -6.5, yet the line dropped to -6. Sharps are flooding the underdog +6, and books are adjusting. This is the #1 sharp indicator."
✅ GOOD: "The Over opened at 48.5 with 71% of tickets, but the line fell to 47. That's reverse line movement—books are respecting sharp Under action despite public sentiment."
❌ BAD: "The line moved." (No context, no explanation, worthless)

═══════════════════════════════════════════════════════════════════════
3️⃣ SHARP MONEY STATS - Sharpness Levels
═══════════════════════════════════════════════════════════════════════

**Sharpness Levels:**
- "High" = Strong sharp money detected (big bets from sharp bettors)
- "Moderate" = Some sharp action, not overwhelming
- "Low" = Minimal sharp interest

**How to Interpret:**
- High sharp money + RLM = STRONGEST BETTING ANGLE
- High sharp money + No RLM = Still valuable, but less urgent
- Moderate/Low sharp money = Use as supporting data, not primary angle

**Example:**
- "Spread: High sharp action detected"
- "Moneyline: Moderate sharp action detected"
- "Over/Under: Low sharp action detected"

**How to Write This:**
✅ GOOD: "High sharp money is confirmed on the spread (Bears -2.5). Combined with 32% bets, 58% money, this is a textbook sharp play."
✅ GOOD: "Only moderate sharp action on the total—this is more of a public market. Focus on the spread where sharps are active."
❌ BAD: "Sharp money is involved." (Too vague, no specifics)

═══════════════════════════════════════════════════════════════════════
4️⃣ REFEREE STATS - How Officials Impact Betting
═══════════════════════════════════════════════════════════════════════

**What You'll See:**
- O/U Trend: Over X-Y (Z%), Under X-Y (Z%)
- Spread: Home X% ATS, Away Y% ATS

**How to Interpret:**

🔹 **OVER/UNDER REFEREE TRENDS:**
- "Over 45-30 (60%), Under 30-45 (40%)"
  → This ref's games go Over 60% of the time
  → **BETTING ANGLE:** Over has a 10% edge (50% = neutral)
  → If Over 60%+: "This ref's games fly over (60%). Historically high-scoring games."
  → If Under 60%+: "This ref's games stay low (62%). Tight whistle, fewer possessions."

🔹 **SPREAD REFEREE TRENDS (NFL/NBA/CFB):**
- "Home 58% ATS, Away 42% ATS"
  → Home teams cover 58% with this ref (8% edge over 50%)
  → **BETTING ANGLE:** Slight lean to home team ATS
  → "Ben Johnson is 7-0 ATS after a loss as an OC. This ref also favors home teams (58% ATS)."

🔹 **SAMPLE SIZE MATTERS:**
- 50+ games: Reliable trend
- 20-49 games: Use as supporting data
- <20 games: Mention but don't rely on heavily

**How to Write This:**
✅ GOOD: "Referee Mike Callahan's games hit the Over 62% of the time over 73 games. Combine that with two top-10 offenses, and the Over 225.5 is the play."
✅ GOOD: "Home teams cover just 43% ATS with this ref, bucking the typical home-court advantage. Road team +4.5 gets a subtle boost."
❌ BAD: "The referee has trends." (Useless without specifics)

═══════════════════════════════════════════════════════════════════════
5️⃣ TEAM STATS (HISTORICAL PERFORMANCE) - ATS & Moneyline Records
═══════════════════════════════════════════════════════════════════════

**What You'll See:**
- Moneyline at home/away: X-Y (Z% ROI)
- ATS at home/away: X-Y (Z% ROI)

**How to Interpret:**

🔹 **ATS (AGAINST THE SPREAD):**
- "Ravens 12-5 ATS at home (+18% ROI)"
  → Ravens cover the spread at home 70.5% of the time (12/17)
  → Bettors who bet Ravens ATS at home have +18% profit
  → **BETTING ANGLE:** Strong home ATS team, trust them to cover
  
- "Bengals 4-10 ATS on road (-22% ROI)"
  → Bengals fail to cover on road 71% of the time (10/14)
  → Fading them ATS on road is profitable
  → **BETTING ANGLE:** Fade Bengals on road

🔹 **MONEYLINE ROI:**
- Positive ROI = profitable to bet this team straight up
- Negative ROI = unprofitable, often overpriced by books
- Example: "Lakers -15% ROI at home" = Overpriced favorites, poor value

🔹 **COMBINE WITH SITUATIONAL DATA:**
✅ GOOD: "Ravens are 12-5 ATS at home (+18% ROI), 8-2 ATS after a bye week. This situational edge stacks with their home dominance."
✅ GOOD: "The Bengals are 4-10 ATS on the road (-22% ROI). Their defensive struggles on the road (31.6 PPG allowed) explain the trend."
❌ BAD: "The team has a good ATS record." (No specific numbers, no context)

═══════════════════════════════════════════════════════════════════════
6️⃣ PLAYER PROPS - Hit Rate & ROI
═══════════════════════════════════════════════════════════════════════

**What You'll See:**
- Player name, prop type (over/under), line (e.g., 25.5 points)
- Record: X hit, Y miss (Z% hit rate, W% ROI)

**How to Interpret:**

🔹 **HIT RATE:**
- 65%+ over 10+ games = ELITE PROP (bet with confidence)
- 60-64% over 15+ games = STRONG PROP (good value)
- 55-59% over 20+ games = DECENT PROP (slight edge)
- <55% = SKIP (no edge)

🔹 **SAMPLE SIZE MATTERS:**
- 20+ games: Trust the data
- 10-19 games: Use with caution
- <10 games: Skip (too small)

🔹 **EXAMPLE:**
- "LeBron James Over 25.5 points: 18-7 (72% hit rate, +28% ROI over 25 games)"
  → LeBron goes Over 25.5 points 72% of the time
  → Betting this prop = +28% profit
  → **BETTING ANGLE:** Strong bet, especially if line is still 25.5 or lower

**How to Write This:**
✅ GOOD: "LeBron James Over 25.5 points has cashed 72% of the time over 25 games (+28% ROI). Against a bottom-5 defense, this is a lock."
✅ GOOD: "Tyreek Hill Over 6.5 receptions is 15-4 (79%) over his last 19. Dolphins run 68 plays/game (#3), creating volume."
❌ BAD: "This player prop is good." (No numbers, no ROI, worthless)

═══════════════════════════════════════════════════════════════════════
7️⃣ PUTTING IT ALL TOGETHER - Multi-Angle Analysis
═══════════════════════════════════════════════════════════════════════

**The BEST betting angles combine 3+ data sources:**

✅ **PERFECT EXAMPLE (SPREAD BET):**
"The **Bears -2.5 (-110)** checks every box:

1. **Sharp Money:** 32% bets, 58% money = 26% stake advantage = sharps on Bears
2. **RLM:** Line moved from -2 to -2.5 despite 68% public on Bengals = sharps forcing line up
3. **Team ATS:** Bears 9-3 ATS at home (+22% ROI)
4. **Situational:** Ben Johnson 7-0 ATS as OC after a loss
5. **TeamRankings:** Bengals allow 31.6 PPG (#32), 143.3 rush yards/game (#27), Bears rank 7th in yards/play (5.8)
6. **Matchup:** Bears' 7th-ranked offense vs Bengals' 32nd-ranked defense = elite vs trash

This is a 6-pronged sharp angle with RLM confirmation. Bears -2.5 is the play."

❌ **BAD EXAMPLE:**
"The Bears should win this game because they're the better team."
→ No data, no stats, no betting angle. Worthless.

═══════════════════════════════════════════════════════════════════════
🎯 FINAL RULES FOR WRITING WITH THIS DATA
═══════════════════════════════════════════════════════════════════════

1. **ALWAYS cite specific percentages** (bets %, money %, hit rates, ROI)
2. **ALWAYS explain WHY a stat matters** (e.g., "68% bets + 72% money = public trap—no sharp split")
3. **ALWAYS connect multiple data points** (RLM + sharp money + ATS record = strongest angles)
4. **NEVER use vague phrases** like "trending," "systems suggest," "historically"—cite EXACT NUMBERS
5. **BOLD ALL BETTING PLAYS** with odds (e.g., **Bears -2.5 (-110)**)
6. **USE THIS DATA TO SUPPORT EVERY SENTENCE**—no fluff, all data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

