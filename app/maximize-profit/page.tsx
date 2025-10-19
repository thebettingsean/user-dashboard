'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MaximizeProfitPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['quick-start']))

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <div style={styles.heroIcon}>
            <img 
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f52280504a85f461104f88_NEW%20WIDGET%20SVG%27S-5.svg"
              alt="Maximize Profit"
              style={{ width: '48px', height: '48px' }}
            />
          </div>
          <h1 style={styles.title}>
            Insider Advantage
          </h1>
          <p style={styles.subtitle}>
            New Member Profit Guide v1.0
          </p>
          <p style={styles.heroDesc}>
            Your all‑in‑one home for analyst picks, premium sports data, and powerful betting tools. 
            This guide teaches you exactly how to use everything to maximize long‑term profit.
          </p>
        </div>

        {/* How to Use Guide Card */}
        <div style={{ ...styles.infoCard, ...styles.blueAccent }}>
          <h3 style={styles.infoCardTitle}>📖 How to Use This Guide</h3>
          <ul style={styles.infoList}>
            <li>Skim the <strong>Quick Start</strong>, then read Chapters 1–5 in order the first time</li>
            <li>Bookmark the <strong>Playbooks</strong> (Chapter 6) and <strong>Best Practices</strong> (Chapter 7) for daily use</li>
            <li>Use the <strong>Free Tools</strong> (Chapter 8) to lock in a smart bankroll plan before you fire</li>
          </ul>
        </div>

        {/* Quick Start Section */}
        <Section
          id="quick-start"
          title="⚡ Quick Start (10 Minutes)"
          color=""
          isExpanded={expandedSections.has('quick-start')}
          onToggle={() => toggleSection('quick-start')}
        >
          <ol style={styles.numberedList}>
            <li>
              <strong>Set notifications:</strong> On the <Link href="/" style={styles.link}>main dashboard</Link>, 
              open the Discord widget → follow the insiders you care about → pick alert types. 
              Prioritize your favorite insider(s) and the sport(s) you bet most.
            </li>
            <li>
              <strong>Pick lane for today:</strong> Decide one focus per day (e.g., "NFL sides" or "NBA props"). 
              Fewer markets → better decisions.
            </li>
            <li>
              <strong>Open the <a href="https://thebettinginsider.com/betting" target="_blank" rel="noopener noreferrer" style={styles.link}>Bets Dashboard</a>:</strong> Use 
              the calendar to spot early drops (often best lines). Read the analyst's notes and match the unit sizing exactly as posted.
            </li>
            <li>
              <strong>Stack signals:</strong> Check the Public Betting indicators (Big Money, Vegas‑Backed), 
              Referee/Umpire page (if applicable), and Matchup Data for alignment. Two or more signals aligned with an analyst pick = green light.
            </li>
            <li>
              <strong>Record & review:</strong> Use the dashboard tracking (already built‑in). End of week, compare your results 
              to the <Link href="/weekly-report" style={styles.link}>Weekly Report</Link> themes.
            </li>
          </ol>
        </Section>

        {/* Chapter 1 */}
        <Section
          id="chapter-1"
          title="Chapter 1 — Analyst Picks: Get In, Size Right, Stay Synced"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-1')}
          onToggle={() => toggleSection('chapter-1')}
        >
          <h3 style={styles.sectionSubtitle}>What you get</h3>
          <ul style={styles.bulletList}>
            <li>A rotation of ~3 analysts (varies by season) posting picks, often days in advance</li>
            <li>Each pick includes detailed analysis and a unit size</li>
            <li>Picks are tracked right on the dashboard for transparency</li>
            <li><strong>Line movement graphs</strong> for each bet type, in each game → perfect for spotting traps and finding accurate line movement</li>
          </ul>

          <h3 style={styles.sectionSubtitle}>Why early matters</h3>
          <p style={styles.paragraph}>
            Early releases often snag better numbers before the market moves. Use the calendar view on 
            the <a href="https://thebettinginsider.com/betting" target="_blank" rel="noopener noreferrer" style={styles.link}>Bets Dashboard</a> to 
            quickly find picks posted 1–3 days ahead.
          </p>

          <h3 style={styles.sectionSubtitle}>How to mirror like a pro</h3>
          <ul style={styles.bulletList}>
            <li>Follow the unit size posted by the insider. If an insider plays 1.5u, you play 1.5u (relative to your unit from the Bankroll Builder)</li>
            <li>Respect variation across insiders (different risk profiles). Don't normalize all picks to the same size — the analyst's size is the edge signal</li>
          </ul>

          <h3 style={styles.sectionSubtitle}>Notification setup that wins</h3>
          <ul style={styles.bulletList}>
            <li>In the Discord widget on the <Link href="/" style={styles.link}>dashboard</Link>, subscribe per‑insider and per‑sport</li>
            <li>Turn on push for the insider you ride most so you never miss late releases (rare, but high value)</li>
            <li>Consider temporary alerts for a "heater insider" in a given sport</li>
          </ul>

          <div style={styles.tipBox}>
            <strong>💡 Daily workflow (5–8 minutes)</strong>
            <ol style={{ ...styles.numberedList, marginTop: '0.75rem' }}>
              <li>Open the Bets Dashboard → sort by sport you're playing</li>
              <li>Scan for new or moved picks (calendar + timestamps)</li>
              <li>Read the write‑up → note the why</li>
              <li>Cross‑check 2+ data signals (Chapter 2)</li>
              <li>Place at posted unit size; log if you play alt lines or parlays (Chapter 6)</li>
            </ol>
          </div>
        </Section>

        {/* Chapter 2 */}
        <Section
          id="chapter-2"
          title="Chapter 2 — Premium Data Suite: What to Read & How to Stack"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-2')}
          onToggle={() => toggleSection('chapter-2')}
        >
          <h3 style={styles.sectionSubtitle}>A) Public Betting Data (Tickets %, Money %, Indicators)</h3>
          
          <div style={styles.subSection}>
            <strong>What it shows</strong>
            <ul style={styles.bulletList}>
              <li>Aggregated splits from 30+ books for all major sports (NFL, NBA, MLB, NHL, CFB, NCAAB)</li>
              <li>% of tickets vs % of dollars on ML/Spread/Total</li>
            </ul>
          </div>

          <div style={styles.subSection}>
            <strong>Two fast power indicators</strong>
            <ul style={styles.bulletList}>
              <li><span style={{ color: '#10b981', fontWeight: '700' }}>Big Money</span> — Flags when dollars ≫ tickets (plus steam activity). This can imply sharper money on a side/total</li>
              <li><span style={{ color: '#8b5cf6', fontWeight: '700' }}>Vegas‑Backed</span> — Our strength‑scored variant of RLM: line moves toward the less popular side with steam context</li>
            </ul>
          </div>

          <div style={styles.subSection}>
            <strong>How to use</strong>
            <ul style={styles.bulletList}>
              <li><strong>Confluence rule:</strong> Analyst pick + (Big Money or Vegas‑Backed) = shortlist. If both indicators align → upgrade to priority</li>
              <li>Use splits to avoid traps (e.g., 80% tickets, no dollar confirmation, line moving away)</li>
            </ul>
          </div>

          <h3 style={styles.sectionSubtitle}>B) Referee/Umpire Data (Game‑Specific, Bet‑Type Specific)</h3>
          
          <div style={styles.subSection}>
            <p style={styles.paragraph}>
              <strong>Scope:</strong> MLB (umpire), NBA (crew chief), NFL (head official); last 5 years to present
            </p>
            <p style={styles.paragraph}>
              <strong>What it tells you:</strong> Tendencies in this game context. Example: Home dog under a given ref → ATS record, ML performance, OU lean, etc.
            </p>
            <p style={styles.paragraph}>
              <strong>How to use:</strong> Treat ref data as a tiebreaker or multiplier — especially when it confirms a public‑money or analyst angle. 
              Target spot‑fit queries (e.g., "home dog", "short road favorite", "high total overs").
            </p>
          </div>

          <h3 style={styles.sectionSubtitle}>C) Matchup/Team Data (Last 3 Years)</h3>
          
          <div style={styles.subSection}>
            <p style={styles.paragraph}>
              <strong>Why 3 years:</strong> Rosters/roles change; 3Y balances sample depth with relevance
            </p>
            <p style={styles.paragraph}>
              <strong>What you see:</strong> Game‑specific, bet‑type‑specific records in this spread/total band (e.g., Home Fav −3 to −7 vs same opponent as away dog +3 to +7)
            </p>
            <p style={styles.paragraph}>
              <strong>How to use:</strong> Confirm fit within the band (don't over‑extrapolate beyond the line range). 
              Pair with public indicators and ref angle for a three‑signal stack.
            </p>
          </div>

          <h3 style={styles.sectionSubtitle}>D) Top Prop Data (This Year + Last Year)</h3>
          
          <div style={styles.subSection}>
            <p style={styles.paragraph}>
              <strong>What it is:</strong> High‑hit‑rate player props surfaced by line + context
            </p>
            <p style={styles.paragraph}>
              <strong>How to use:</strong> Use for niche value or to build alt‑prop parlays (see Chapter 6). 
              Cross‑check <Link href="/weekly-report" style={styles.link}>Weekly Report</Link> themes and opponent‑specific matchup notes.
            </p>
          </div>
        </Section>

        {/* Chapter 3 */}
        <Section
          id="chapter-3"
          title="Chapter 3 — Tools: Turn Signals into Tickets"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-3')}
          onToggle={() => toggleSection('chapter-3')}
        >
          <h3 style={styles.sectionSubtitle}>What's live now (highlights; tools evolve over time)</h3>
          <ul style={styles.bulletList}>
            <li>
              <Link href="/prop-parlay-tool" style={styles.link}>100% Prop Parlay Tool</Link> (NFL/NBA → expanding): 
              Only shows fully juiced alt lines. Add legs by book to construct custom safer‑leg parlays.
            </li>
            <li>
              <a href="https://thebettinginsider.com/tools/batter-vs-pitcher" target="_blank" rel="noopener noreferrer" style={styles.link}>Batter vs Pitcher</a> (MLB): 
              Surface platoon splits and prior outcomes quickly.
            </li>
            <li>
              <a href="https://thebettinginsider.com/tools/3pt-tool" target="_blank" rel="noopener noreferrer" style={styles.link}>3PT Tool</a> (NBA): 
              Shoot volume/role, opponent scheme, pace overlays.
            </li>
            <li>
              <Link href="/anytime-td" style={styles.link}>Anytime TD</Link> (NFL): 
              Role + red‑zone usage + coverage matchup context.
            </li>
          </ul>

          <h3 style={styles.sectionSubtitle}>How to use tools the Insider way</h3>
          <ul style={styles.bulletList}>
            <li><strong>Macro → Micro:</strong> Start with macro edges (public/market indicators) → confirm with ref/3Y matchup → then use tools to pick the cleanest player angle</li>
            <li><strong>Book‑aware building:</strong> Construct parlays inside the tool matching your book's alt menu and price steps</li>
            <li><strong>Keep notes:</strong> When a tool surfaces a pattern (e.g., a WR's usage spike vs quarters coverage), note it. Patterns re‑appear</li>
          </ul>
        </Section>

        {/* Chapter 4 */}
        <Section
          id="chapter-4"
          title="Chapter 4 — The Weekly Report: Your Map for the Week"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-4')}
          onToggle={() => toggleSection('chapter-4')}
        >
          <h3 style={styles.sectionSubtitle}>What it is</h3>
          <p style={styles.paragraph}>
            A members‑only, high‑signal digest of macro trends, teams to watch, player angles, and market read‑throughs. 
            Think of it like a stock analyst's weekly watchlist — but for sports.
          </p>

          <h3 style={styles.sectionSubtitle}>How to apply</h3>
          <ol style={styles.numberedList}>
            <li>Read the <Link href="/weekly-report" style={styles.link}>report</Link> top‑to‑bottom on release day</li>
            <li>Tag each angle as <em>Auto‑Tail</em>, <em>Track & Wait for Number</em>, or <em>Prop‑Hunt</em></li>
            <li>Throughout the week, match Daily Picks and live lines against these themes</li>
            <li>If the report theme + public indicator + ref trend all point the same way, press at posted units</li>
          </ol>

          <div style={{ ...styles.tipBox, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <strong>🎯 Example win condition</strong>
            <p style={{ ...styles.paragraph, marginTop: '0.5rem' }}>
              When a recent report pointed to a Bengals‑leaning, offense‑friendly game environment, members could attack:
            </p>
            <ul style={styles.bulletList}>
              <li>Over game total</li>
              <li>Bengals cover/ML for smaller units</li>
              <li>Over props on featured players using the 100% Prop Parlay Tool</li>
            </ul>
            <p style={styles.paragraph}>
              A multi‑path alignment that paid.
            </p>
          </div>
        </Section>

        {/* Chapter 5 */}
        <Section
          id="chapter-5"
          title="Chapter 5 — Putting It Together (Signal Ladder)"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-5')}
          onToggle={() => toggleSection('chapter-5')}
        >
          <h3 style={styles.sectionSubtitle}>Use this ladder to grade confidence:</h3>
          <ol style={styles.numberedList}>
            <li>Analyst Pick Posted Early at a Key Number</li>
            <li>Public Indicators: Big Money or Vegas‑Backed aligns</li>
            <li>Ref/Ump Trend confirms context (e.g., home dog bias)</li>
            <li>3Y Matchup Band supports side/total in this price range</li>
            <li>Tool Output refines player/alt‑line entries</li>
          </ol>

          <h3 style={styles.sectionSubtitle}>Play Tiering</h3>
          <div style={styles.tierContainer}>
            <div style={{ ...styles.tierCard, borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
              <strong style={{ color: '#10b981' }}>Tier A (Fire)</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.9 }}>
                1 + (2 and 3) + (4 or 5)
              </p>
            </div>
            <div style={{ ...styles.tierCard, borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
              <strong style={{ color: '#f59e0b' }}>Tier B (Solid)</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.9 }}>
                1 + (2 or 3) + (4 or 5)
              </p>
            </div>
            <div style={{ ...styles.tierCard, borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
              <strong style={{ color: '#3b82f6' }}>Tier C (Sprinkle/Alt/Prop)</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.9 }}>
                1 + (any one of 2–5)
              </p>
            </div>
          </div>
        </Section>

        {/* Chapter 6 - Playbooks */}
        <Section
          id="chapter-6"
          title="Chapter 6 — Profit Playbooks (Step‑by‑Step)"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-6')}
          onToggle={() => toggleSection('chapter-6')}
        >
          {/* Playbook 1 */}
          <div style={styles.playbookCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#10b981' }}>Playbook 1 — Early‑Number Capture (Sides/Totals)</h3>
            <p style={styles.paragraph}><strong>Goal:</strong> Beat the closing line using early analyst drops</p>
            <strong>Steps:</strong>
            <ol style={styles.numberedList}>
              <li>Check the calendar for picks posted 1–3 days early</li>
              <li>Read analysis; confirm at least one public indicator</li>
              <li>Place at posted unit size; consider a half‑unit add if Vegas‑Backed fires later in your favor</li>
              <li>Record your CLV (closing line value) weekly</li>
            </ol>
          </div>

          {/* Playbook 2 */}
          <div style={styles.playbookCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#3b82f6' }}>Playbook 2 — Two‑Signal Parlay (Market + Micro)</h3>
            <p style={styles.paragraph}><strong>Goal:</strong> Create small parlays when two signals align strongly</p>
            <p style={styles.paragraph}><strong>Signals:</strong> (Big Money or Vegas‑Backed) + Ref/Ump trend in band</p>
            <strong>Steps:</strong>
            <ol style={styles.numberedList}>
              <li>Identify side/total passing both signals</li>
              <li>Add a correlated alt line (e.g., team total over with game over) at modest alt juice</li>
              <li>Keep it 2–3 legs max; size smaller than singles</li>
            </ol>
          </div>

          {/* Playbook 3 */}
          <div style={styles.playbookCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#8b5cf6' }}>Playbook 3 — Alt‑Prop Builder (Tool‑Led)</h3>
            <p style={styles.paragraph}><strong>Goal:</strong> Safer alt thresholds, higher win rate</p>
            <strong>Steps:</strong>
            <ol style={styles.numberedList}>
              <li>Start in <Link href="/weekly-report" style={styles.link}>Weekly Report</Link> to pick games with pace/usage upside</li>
              <li>Open the <Link href="/prop-parlay-tool" style={styles.link}>100% Prop Parlay Tool</Link>; filter by your book</li>
              <li>Choose 2–4 alt props that logically correlate (e.g., QB over attempts + WR alt yards)</li>
              <li>Cross‑check Top Prop Data hit rates (TY + LY)</li>
              <li>Optional: include ref/crew tendencies for pass/flag rates</li>
            </ol>
          </div>

          {/* Playbook 4 */}
          <div style={styles.playbookCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#f59e0b' }}>Playbook 4 — Referee‑Weighted Side</h3>
            <p style={styles.paragraph}><strong>Goal:</strong> Use crew tendencies as a validated tiebreaker</p>
            <strong>Steps:</strong>
            <ol style={styles.numberedList}>
              <li>Start with an analyst lean or Vegas‑Backed signal</li>
              <li>Open Ref Data → filter to exact context (home dog, short fav, etc.)</li>
              <li>If 5‑year trend aligns, confirm play at posted units. If neutral, treat as a pass or reduce stakes</li>
            </ol>
          </div>

          {/* Playbook 5 */}
          <div style={styles.playbookCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#06b6d4' }}>Playbook 5 — Weekly Report Theme Stacking</h3>
            <p style={styles.paragraph}><strong>Goal:</strong> Ride a macro theme across multiple markets</p>
            <strong>Steps:</strong>
            <ol style={styles.numberedList}>
              <li>Highlight 1–2 team/game themes from the report</li>
              <li>Take the primary market (side/total) as a single</li>
              <li>Build 1 small parlay with correlated props/alt lines</li>
              <li>Track outcomes vs the theme to learn which correlations pay best</li>
            </ol>
          </div>
        </Section>

        {/* Chapter 7 */}
        <Section
          id="chapter-7"
          title="Chapter 7 — Best Practices (That Actually Move ROI)"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-7')}
          onToggle={() => toggleSection('chapter-7')}
        >
          <ul style={styles.bulletList}>
            <li>Mirror unit sizes exactly as posted by the insider. Their size = their conviction</li>
            <li>Limit sport focus per day. One sport fully read beats three sports half‑read</li>
            <li>Confluence over quantity: Two aligned signals beat five weak leans</li>
            <li>Price matters: If you missed a key number, check the dashboard comments/updates for guidance or wait for a better entry</li>
            <li>Small parlays only when logical: Correlate legs or don't parlay</li>
            <li>Log your CLV and hit rates weekly. Improving entry beats guessing "hot/cold"</li>
            <li>Use bands properly in matchup data (don't apply −3 to −7 insights at −10.5)</li>
            <li>Prop thresholds: Prefer alt lines that fit the game script you believe in (pace, matchup, usage)</li>
            <li>Tool evolution: Check back often — new tools appear. Tell us what to build next</li>
            <li>Feedback loop: Compare your week against the <Link href="/weekly-report" style={styles.link}>Weekly Report</Link>; adjust what you prioritize next week</li>
          </ul>
        </Section>

        {/* Chapter 8 */}
        <Section
          id="chapter-8"
          title="Chapter 8 — Free Tools to Lock Your Foundation"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-8')}
          onToggle={() => toggleSection('chapter-8')}
        >
          <div style={styles.toolGrid}>
            <div style={styles.toolCard}>
              <h4 style={styles.toolTitle}>
                <a href="https://thebettinginsider.com/guide/betting-guide" target="_blank" rel="noopener noreferrer" style={styles.link}>
                  Betting Guide
                </a>
              </h4>
              <p style={styles.toolDesc}>
                Learn unit sizing, line shopping, and core terms. Read once; skim before new seasons or sports.
              </p>
            </div>

            <div style={styles.toolCard}>
              <h4 style={styles.toolTitle}>
                <a href="https://thebettinginsider.com/tools/bankroll-builder" target="_blank" rel="noopener noreferrer" style={styles.link}>
                  Bankroll Builder
                </a>
              </h4>
              <p style={styles.toolDesc}>
                Answer the questionnaire → we calculate your bankroll and unit size tailored to you. 
                Use the output to mirror insider unit sizes correctly (1.0u is your number).
              </p>
            </div>

            <div style={styles.toolCard}>
              <h4 style={styles.toolTitle}>
                <a href="https://thebettinginsider.com/tools/roi-calculator" target="_blank" rel="noopener noreferrer" style={styles.link}>
                  ROI Calculator
                </a>
              </h4>
              <p style={styles.toolDesc}>
                Plug in your Bankroll Builder unit, average juice, bets per week, and expected win rate. 
                See realistic monthly/yearly profit paths and pick your stakes plan accordingly.
              </p>
            </div>

            <div style={styles.toolCard}>
              <h4 style={styles.toolTitle}>
                <a href="https://thebettinginsider.com/tools/parlay-calculator" target="_blank" rel="noopener noreferrer" style={styles.link}>
                  Parlay Calculator
                </a>
              </h4>
              <p style={styles.toolDesc}>
                Enter legs and compare the fair parlay price vs your book. 
                If the book is shaving price, consider singles or fewer legs.
              </p>
            </div>
          </div>

          <div style={{ ...styles.tipBox, background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', marginTop: '1.5rem' }}>
            <strong>💡 Pro Tip:</strong> Do Bankroll Builder → ROI Calculator before week one. 
            You'll avoid over‑staking and know exactly what each insider unit means for you.
          </div>
        </Section>

        {/* Chapter 9 */}
        <Section
          id="chapter-9"
          title="Chapter 9 — Routines by Experience Level"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-9')}
          onToggle={() => toggleSection('chapter-9')}
        >
          <div style={styles.routineCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#10b981' }}>If You're New (15–25 minutes/day)</h3>
            <ul style={styles.bulletList}>
              <li>Do the Free Tools in Chapter 8 (once)</li>
              <li>Ride one insider and one sport</li>
              <li>Play singles only for two weeks; learn the indicators</li>
              <li>Add one 2‑leg correlated parlay per slate after week two</li>
            </ul>
          </div>

          <div style={styles.routineCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#f59e0b' }}>If You're Intermediate (20–35 minutes/day)</h3>
            <ul style={styles.bulletList}>
              <li>Two insiders across 1–2 sports</li>
              <li>Use <Link href="/weekly-report" style={styles.link}>Weekly Report</Link> to pre‑tag games</li>
              <li>Mix singles + 1–2 small parlays built from the <Link href="/prop-parlay-tool" style={styles.link}>100% Prop Tool</Link></li>
              <li>Track CLV and adjust timing on early releases</li>
            </ul>
          </div>

          <div style={styles.routineCard}>
            <h3 style={{ ...styles.sectionSubtitle, color: '#ef4444' }}>If You're Advanced (30–45 minutes/day)</h3>
            <ul style={styles.bulletList}>
              <li>Multi‑sport rotation; dynamic notifications per "heater"</li>
              <li>Run macro → micro → tool pipeline each slate</li>
              <li>Build theme stacks (side/total + 1 correlated prop parlay)</li>
              <li>Maintain a personal notes doc of repeatable edges (refs, bands, coaches)</li>
            </ul>
          </div>
        </Section>

        {/* Chapter 10 - FAQ */}
        <Section
          id="chapter-10"
          title="Chapter 10 — FAQ (Fast Fixes)"
          color="#3b82f6"
          isExpanded={expandedSections.has('chapter-10')}
          onToggle={() => toggleSection('chapter-10')}
        >
          <div style={styles.faqItem}>
            <strong>"Units differ by insider — what do I do?"</strong>
            <p style={styles.paragraph}>
              Mirror each insider's posted size using your 1.0u from <a href="https://thebettinginsider.com/tools/bankroll-builder" target="_blank" rel="noopener noreferrer" style={styles.link}>Bankroll Builder</a>.
            </p>
          </div>

          <div style={styles.faqItem}>
            <strong>"Missed the number — still bet?"</strong>
            <p style={styles.paragraph}>
              Check if the analysis still holds at the new price; if the edge was the number, pass.
            </p>
          </div>

          <div style={styles.faqItem}>
            <strong>"Which insider should I follow?"</strong>
            <p style={styles.paragraph}>
              The one in your favorite sport, the one on a heater, or the one whose style fits you. 
              Use notifications to test and rotate.
            </p>
          </div>

          <div style={styles.faqItem}>
            <strong>"How many parlays?"</strong>
            <p style={styles.paragraph}>
              Fewer than you think; only when legs are logically correlated.
            </p>
          </div>
        </Section>

        {/* Appendices */}
        <div style={{ ...styles.infoCard, ...styles.purpleAccent, marginTop: '2rem' }}>
          <h3 style={styles.infoCardTitle}>📋 Appendix A: Daily Checklist (2–5 minutes)</h3>
          <ol style={styles.numberedList}>
            <li>Open <a href="https://thebettinginsider.com/betting" target="_blank" rel="noopener noreferrer" style={styles.link}>Bets Dashboard</a> + check calendar</li>
            <li>Read new analyst picks + note unit sizes</li>
            <li>Check line movement graphs for traps</li>
            <li>Cross‑reference 2+ data signals (public betting, ref data, matchup data)</li>
            <li>Place bets at posted unit sizes</li>
            <li>Log picks + monitor throughout the day</li>
          </ol>
        </div>

        <div style={{ ...styles.infoCard, ...styles.greenAccent, marginTop: '1.5rem' }}>
          <h3 style={styles.infoCardTitle}>📊 Appendix B: Signal Summary</h3>
          <ul style={styles.bulletList}>
            <li><strong>Big Money:</strong> Dollars ≫ Tickets + steam confirmation</li>
            <li><strong>Vegas‑Backed:</strong> Line moves toward unpopular side; our strength score helps filter noise</li>
            <li><strong>Ref/Ump:</strong> 5‑year, game‑context, bet‑type specific</li>
            <li><strong>3Y Matchup:</strong> Line‑band‑accurate, opponent‑specific</li>
            <li><strong>Top Props/Tools:</strong> Player‑level refinements and alt construction</li>
          </ul>
        </div>

        {/* CTA Footer */}
        <div style={styles.ctaCard}>
          <h2 style={styles.ctaTitle}>One More Thing — We Build With You</h2>
          <p style={styles.ctaText}>
            Have an idea for a tool? Missing a data view? Tell us and we'll prioritize what helps members win the most.
          </p>
          <a 
            href="https://thebettinginsider.com/contact-us" 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.ctaButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #34d399)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Submit Your Ideas
          </a>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '1rem' }}>
            This is v1.0 — we'll iterate with member feedback. Save this guide and refer back weekly.
          </p>
        </div>

        {/* Back to Dashboard */}
        <div style={{ textAlign: 'center', marginTop: '3rem', paddingBottom: '2rem' }}>
          <Link 
            href="/"
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

// Section Component
interface SectionProps {
  id: string
  title: string
  color: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Section({ id, title, color, isExpanded, onToggle, children }: SectionProps) {
  // Quick Start gets special yellow/orange gradient
  const isQuickStart = id === 'quick-start'
  const gradientBorder = isQuickStart 
    ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' 
    : 'linear-gradient(135deg, #3b82f6, #60a5fa)'
  
  const sectionStyle = {
    ...styles.section,
    backgroundImage: `linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15), ${gradientBorder}`
  }

  return (
    <div style={sectionStyle}>
      <div 
        style={styles.sectionHeader}
        onClick={onToggle}
      >
        <h2 style={styles.sectionTitle}>
          {title}
        </h2>
        <div style={{ 
          ...styles.expandIcon, 
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          color: '#ffffff'
        }}>
          ▼
        </div>
      </div>
      {isExpanded && (
        <div style={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '8rem 1rem 2rem 1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#ffffff',
    background: 'transparent',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    position: 'relative' as const,
    zIndex: 1
  },
  hero: {
    textAlign: 'center' as const,
    marginBottom: '3rem',
    padding: '2rem',
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },
  heroIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 1.5rem',
    background: 'rgba(16, 185, 129, 0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(16, 185, 129, 0.4)',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '1.5rem'
  },
  heroDesc: {
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.85)',
    maxWidth: '700px',
    margin: '0 auto'
  },
  infoCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },
  blueAccent: {
    borderLeft: '4px solid #3b82f6'
  },
  greenAccent: {
    borderLeft: '4px solid #10b981'
  },
  purpleAccent: {
    borderLeft: '4px solid #8b5cf6'
  },
  infoCardTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '1rem',
    color: '#fff'
  },
  infoList: {
    margin: '0',
    paddingLeft: '1.5rem',
    lineHeight: '1.8',
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  section: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '16px',
    marginBottom: '1.5rem',
    border: '1px solid transparent',
    backgroundImage: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15), linear-gradient(135deg, #3b82f6, #60a5fa)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, padding-box, border-box',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    overflow: 'hidden'
  },
  sectionHeader: {
    padding: '1.25rem 1.5rem',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background 0.2s ease',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff'
  },
  expandIcon: {
    fontSize: '1rem',
    transition: 'transform 0.3s ease',
    fontWeight: '700',
    color: '#ffffff'
  },
  sectionContent: {
    padding: '0 1.5rem 1.5rem 1.5rem',
    animation: 'fadeIn 0.3s ease'
  },
  sectionSubtitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    marginTop: '1.5rem',
    marginBottom: '0.75rem'
  },
  paragraph: {
    fontSize: '0.9rem',
    lineHeight: '1.7',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: '1rem'
  },
  bulletList: {
    margin: '0 0 1rem 0',
    paddingLeft: '1.5rem',
    lineHeight: '1.8',
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.85)'
  },
  numberedList: {
    margin: '0 0 1rem 0',
    paddingLeft: '1.5rem',
    lineHeight: '1.8',
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.85)'
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontWeight: '600',
    borderBottom: '1px solid rgba(96, 165, 250, 0.3)',
    transition: 'all 0.2s ease'
  },
  tipBox: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '10px',
    padding: '1rem',
    marginTop: '1rem',
    fontSize: '0.9rem'
  },
  subSection: {
    marginBottom: '1.5rem'
  },
  tierContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  tierCard: {
    padding: '1rem',
    borderRadius: '10px',
    border: '2px solid',
    textAlign: 'center' as const
  },
  playbookCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  toolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  toolCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  toolTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    color: '#fff'
  },
  toolDesc: {
    fontSize: '0.85rem',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.75)',
    margin: 0
  },
  routineCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  faqItem: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  ctaCard: {
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
    border: '2px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '20px',
    padding: '2.5rem 2rem',
    marginTop: '3rem',
    textAlign: 'center' as const,
    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)'
  },
  ctaTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#10b981',
    marginBottom: '1rem'
  },
  ctaText: {
    fontSize: '1rem',
    lineHeight: '1.7',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '1.5rem',
    maxWidth: '600px',
    margin: '0 auto 1.5rem auto'
  },
  ctaButton: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    color: '#ffffff',
    padding: '1rem 2.5rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
    border: 'none',
    cursor: 'pointer'
  },
  backButton: {
    display: 'inline-block',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#60a5fa',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  }
}

