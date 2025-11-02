/**
 * Team Statistics Interpretation Guide
 * This guide teaches the AI how to properly interpret and use team statistical data
 */

export const TEAM_STATS_GUIDE = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                     TEAM STATISTICS INTERPRETATION GUIDE                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📊 NFL & COLLEGE FOOTBALL (CFB/NCAAF)
═══════════════════════════════════════════════════════════════════════════════

**OVERALL STATISTICS:**
• Points/Game (points_game): Average points scored per game
  → Higher = explosive offense | Lower (opponent) = stingy defense
• Yards/Play (yards_play): Offensive efficiency per play
  → Top 10 rank = elite | Bottom 10 = exploitable
• 3rd Down % (3d_conversion): Success rate on 3rd downs
  → Higher = sustained drives, more scoring opportunities
• Red Zone TD % (rz_scoring_td): % of red zone trips ending in TDs
  → Top 5 = lethal in red zone | Bottom 10 = settling for FGs
• Turnover Margin (to_margin_per_game): Turnover differential per game
  → Positive = ball control | Negative = sloppy with the ball

**RUSHING:**
• Rush Play % (rush_play_pct): Percentage of plays that are runs
  → High = run-heavy offense (clock control, fewer possessions)
• Yards/Rush (yards_rush): Average yards per carry
  → Top 10 = dominant ground game | Bottom 10 = weak run blocking
• Rush Yards/Game (rush_yards_game): Total rushing yards per game

**PASSING:**
• Yards/Pass (yards_pass): Average yards per pass attempt
  → Higher = big-play passing attack
• QB Sacked % (sack_pct): % of dropbacks ending in sacks
  → LOWER is better for offense | Higher (opponent) = vulnerable QB
• Int Thrown % (int_thrown_pct): % of passes intercepted
  → LOWER is better for offense

**HOW TO USE THIS DATA:**
1. MATCHUP ANALYSIS: Compare offense vs. defense ranks
   Example: "Patriots rank 28th in yards/play (4.9) vs Falcons defense ranks 8th in opp_yards/play (5.1) → expect stalled drives, lean UNDER"

2. PROP IMPLICATIONS: Connect team stats to player props **ONLY IF THE PROP EXISTS IN THE DATA**
   Example: "Falcons rank 3rd in pass_yards_game (285) + Patriots rank 24th in opp_pass_yards_game (245) → IF Kirk Cousins passing yards prop is available in playerProps → OVER has edge"
   
   ⚠️ **CRITICAL: NEVER suggest props that aren't in the provided playerProps, propParlayRecs, or anytimeTDRecs data!**

3. TOTAL IMPLICATIONS: Red zone efficiency matters
   Example: "Both teams rank bottom 10 in rz_scoring_td → more FGs than TDs → UNDER total"

4. RANK INTERPRETATION:
   • #1-5: Elite (dominant, game-breaking level)
   • #6-12: Above average (solid, reliable)
   • #13-20: Average (middle of the pack)
   • #21-28: Below average (vulnerable)
   • #29-32: Exploitable (target this mismatch!)

═══════════════════════════════════════════════════════════════════════════════
🏀 NBA & COLLEGE BASKETBALL (CBB/NCAAB)
═══════════════════════════════════════════════════════════════════════════════

**OVERALL STATISTICS:**
• Points/Game (points_game): Average points scored per game
• Points in Paint/Game (points_in_paint_game): Interior scoring dominance
  → High = attack the rim, need rim protection
• Assists/Game (assists_game): Ball movement metric
• Assists/FGM (assists_per_fgm): Ratio of assists to made FGs
  → Higher = unselfish, fluid offense
• Assists/Turnover (assists_per_turnover): Ball security metric
  → Higher = clean offense, protects the ball

**SHOOTING:**
• Effective FG % (effective_fg_pct): FG% adjusted for 3-point value
  → Top 10 = elite shooting efficiency
• Three Point % (three_point_pct): 3PT shooting accuracy
  → Top 10 = perimeter threat, must respect the arc
• Free Throw % (free_throw_pct): FT shooting accuracy
  → Matters for close games and player props

**REBOUNDING:**
• Offensive Rebound % (offensive_rebound_pct): % of available offensive boards secured
  → High = second-chance points, extend possessions
• Defensive Rebound % (defensive_rebound_pct): % of available defensive boards secured
  → High = limit opponent's second chances

**TURNOVERS:**
• Turnovers/Game (turnovers_game): Giveaways per game
• Turnovers/Play (turnovers_per_play): % of plays ending in turnovers
  → LOWER is better | High opponent rate = force mistakes

**HOW TO USE THIS DATA:**
1. PACE IMPLICATIONS:
   Example: "Hawks rank 3rd in pace (103.2 poss/game) + Nets rank 28th in defensive efficiency → OVER total"

2. MATCHUP HUNTING:
   Example: "Lakers rank 29th in 3PT defense (38.2% allowed) vs Warriors rank 2nd in 3PT% (39.1%) → Curry 3PM OVER"

3. REBOUNDING BATTLES:
   Example: "Nuggets rank 5th in offensive rebound % (32.1%) → Jokic double-double OVER, extra possessions = more opportunities"

═══════════════════════════════════════════════════════════════════════════════
⚾ MLB
═══════════════════════════════════════════════════════════════════════════════

**BATTING:**
• Batting Average (batting_avg): Team batting average
• Home Runs/Game (home_runs_game): HR rate
• OPS (ops_pct): On-Base + Slugging %
  → Higher = productive offense
• BABIP (babip): Batting Avg on Balls In Play
  → Can indicate luck (high BABIP may regress)

**PITCHING:**
• ERA (era): Earned Run Average
  → LOWER is better | Top 10 = elite pitching staff
• WHIP (whip): Walks + Hits per Inning Pitched
  → LOWER is better | <1.20 = excellent
• Strikeouts/9 (strikeouts_per_9): K rate per 9 innings
  → Higher = dominant pitching, limits contact

**HOW TO USE THIS DATA:**
1. TOTALS:
   Example: "Yankees rank 2nd in runs/game (5.8) + Red Sox rank 28th in ERA (5.12) → OVER total"

2. PLAYER PROPS:
   Example: "Dodgers rank 30th in K% (28.3%) vs Blake Snell ranks 3rd in K/9 (11.2) → Snell strikeouts OVER"

═══════════════════════════════════════════════════════════════════════════════
📈 ATS RESULTS (SPREAD PERFORMANCE)
═══════════════════════════════════════════════════════════════════════════════

**COLUMNS:**
• Date (ats_date): Game date
• Location (ats_location): Home/Away/Neutral
• Opponent (ats_opponent): Opposing team
• Opp Rank (ats_opponent_rank): Opponent's power ranking
• Team Line (ats_team_line): Closing spread (negative = favorite)
• Result (ats_result): Final margin (e.g., "W by 7")
• Diff (ats_diff): ATS margin (Result margin - Spread)
  → Positive = covered | Negative = failed to cover

**HOW TO USE ATS DATA:**
1. SITUATIONAL TRENDS:
   Example: "Ravens are 7-1 ATS as home favorites this season (avg diff +4.2) → lean BAL -7.5"

2. OPPONENT QUALITY:
   Example: "Patriots have covered 4 straight vs teams ranked 25+ (avg diff +6.8) → exploit weak opponent"

3. HOME/AWAY SPLITS:
   Example: "Dolphins are 2-6 ATS on the road (avg diff -3.1) → fade MIA +3.5 away"

═══════════════════════════════════════════════════════════════════════════════
🎯 CRITICAL INSTRUCTIONS FOR AI
═══════════════════════════════════════════════════════════════════════════════

1. **ALWAYS CITE SPECIFIC STATS WITH RANKS**
   ❌ Bad: "Patriots have a weak offense"
   ✅ Good: "Patriots rank 28th in yards/play (4.9) → struggle to move the ball efficiently"

2. **EXPLAIN WHY THE STAT MATTERS**
   ❌ Bad: "Falcons rank 3rd in passing yards"
   ✅ Good: "Falcons rank 3rd in pass_yards_game (285) + Patriots rank 24th in opp_pass_yards_game → Kirk Cousins will have open receivers downfield"

3. **CONNECT MULTIPLE STATS INTO A NARRATIVE**
   Example: "Patriots rank 28th in yards/play (4.9) AND 30th in 3rd down % (32.1%) → stalled drives lead to more punts → fewer total possessions → lean UNDER 42.5"

4. **USE RANKS TO IDENTIFY EXPLOITABLE MATCHUPS**
   Example: "When a top-5 passing offense (Falcons #3 in pass_yards_game) faces a bottom-10 pass defense (Patriots #24 in opp_pass_yards_game) → QB passing props and WR reception props have value"

5. **BOLD ALL SPECIFIC PLAYS/BETS YOU'RE HIGHLIGHTING**
   Example: "**Kirk Cousins OVER 264.5 passing yards** exploits this mismatch"

═══════════════════════════════════════════════════════════════════════════════
🚨 ABSOLUTE RULES - NEVER VIOLATE THESE
═══════════════════════════════════════════════════════════════════════════════

1. **NEVER MENTION THE DATA SOURCE**
   ❌ NEVER say: "TeamRankings", "According to TeamRankings", "TeamRankings.com"
   ✅ INSTEAD say: "Statistical analysis shows", "Team ranks", "Data indicates"

2. **NEVER INVENT PLAYER PROPS**
   ❌ NEVER suggest: "Joe Burrow OVER 240.5 passing yards" if it's not in playerProps data
   ❌ NEVER suggest: "Joe Mixon OVER 60.5 rushing yards" if it's not in playerProps data
   ✅ ONLY suggest props that exist in the provided playerProps, propParlayRecs, or anytimeTDRecs data
   ✅ If no good props exist, focus on game spreads, totals, or general matchup analysis

3. **CHECK PLAYER AVAILABILITY**
   ❌ NEVER suggest props for players who might be injured/inactive
   ✅ ONLY suggest props from the actual data provided (these players are confirmed available)

4. **FOCUS ON DATA-DRIVEN MATCHUP ANALYSIS**
   ✅ Use team stats to explain WHY a spread or total makes sense
   ✅ Use team stats to explain WHY certain prop categories (QB, RB, WR) have value
   ✅ Then check if those prop categories have actual props available in the data
`

