'use client'

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AiFillBank } from "react-icons/ai"
import { FaShoppingCart } from "react-icons/fa"
import { PiGraphBold } from "react-icons/pi"
import { VscGraphLine, VscChecklist } from "react-icons/vsc"
import { FaMoneyBillTrendUp } from "react-icons/fa6"
import styles from './betting-guide.module.css'

gsap.registerPlugin(ScrollTrigger)

interface Chapter {
  id: string
  number: string
  title: string
  icon: React.ReactNode | null
  content: React.ReactNode
}

export default function BettingGuidePage() {
  const [activeChapter, setActiveChapter] = useState<string>('chapter1')
  const [readingProgress, setReadingProgress] = useState(0)
  const [isNavExpanded, setIsNavExpanded] = useState(false)
  const chaptersRef = useRef<{ [key: string]: HTMLElement | null }>({})
  const navRef = useRef<HTMLElement>(null)
  const navItemsRef = useRef<HTMLElement[]>([])
  const navTextsRef = useRef<HTMLElement[]>([])
  const navIconsRef = useRef<HTMLElement[]>([])
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const calculateExpandedWidth = () => {
    // Calculate optimal width based on longest text
    const navEl = navRef.current
    if (!navEl) return 280
    
    // Check all nav text elements to find the widest
    let maxWidth = 280
    const textElements = navTextsRef.current.filter(el => el !== null)
    
    if (textElements.length > 0) {
      textElements.forEach((textEl) => {
        if (textEl) {
          // Temporarily show to measure
          const originalStyles = {
            visibility: textEl.style.visibility,
            opacity: textEl.style.opacity,
            width: textEl.style.width,
            maxWidth: textEl.style.maxWidth,
            position: textEl.style.position
          }
          
          textEl.style.visibility = 'visible'
          textEl.style.opacity = '1'
          textEl.style.width = 'auto'
          textEl.style.maxWidth = 'none'
          textEl.style.position = 'absolute'
          
          const width = textEl.offsetWidth
          maxWidth = Math.max(maxWidth, width + 100) // Add padding for icon and spacing
          
          // Restore original styles
          Object.assign(textEl.style, originalStyles)
        }
      })
    }
    
    return maxWidth
  }

  const createNavTimeline = () => {
    const navEl = navRef.current
    if (!navEl || navTextsRef.current.length === 0 || navIconsRef.current.length === 0) return null

    const collapsedWidth = 56
    const expandedWidth = calculateExpandedWidth()

    const validTexts = navTextsRef.current.filter(el => el !== null && el !== undefined)
    const validIcons = navIconsRef.current.filter(el => el !== null && el !== undefined)

    // Set initial states
    gsap.set(navEl, { width: collapsedWidth, borderRadius: 60 })
    gsap.set(validTexts, { 
      opacity: 0, 
      x: -10, 
      width: 0, 
      maxWidth: 0,
      visibility: 'hidden',
      display: 'flex'
    })
    gsap.set(validIcons, { x: 11 })

    // Create timeline
    const tl = gsap.timeline({ paused: true })

    // Expand width and border radius together
    tl.to(navEl, {
      width: expandedWidth,
      borderRadius: 16,
      duration: 0.6,
      ease: 'power3.out'
    })

    // Show text with stagger
    tl.to(validTexts, {
      opacity: 0.8,
      x: 0,
      width: expandedWidth - 80,
      maxWidth: expandedWidth - 80,
      visibility: 'visible',
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.05
    }, '-=0.4')

    // Move icons back to center with stagger
    tl.to(validIcons, {
      x: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.05
    }, '-=0.5')

    return tl
  }

  useLayoutEffect(() => {
    // Wait for refs to be populated
    const timer = setTimeout(() => {
      const tl = createNavTimeline()
      tlRef.current = tl
    }, 100)

    return () => {
      clearTimeout(timer)
      tlRef.current?.kill()
      tlRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current || !navRef.current) return
      
      if (isNavExpanded) {
        const newWidth = calculateExpandedWidth()
        gsap.set(navRef.current, { width: newWidth })
        tlRef.current.kill()
        const newTl = createNavTimeline()
        if (newTl) {
          newTl.progress(1)
          tlRef.current = newTl
        }
      } else {
        tlRef.current.kill()
        const newTl = createNavTimeline()
        if (newTl) {
          tlRef.current = newTl
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isNavExpanded])

  useEffect(() => {
    // Set up scroll trigger for active chapter detection
    const chapters = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter6', 'chapter8']
    
    chapters.forEach((chapterId) => {
      const element = chaptersRef.current[chapterId]
      if (!element) return

      ScrollTrigger.create({
        trigger: element,
        start: 'top 150px',
        end: 'bottom 150px',
        onEnter: () => setActiveChapter(chapterId),
        onEnterBack: () => setActiveChapter(chapterId),
      })
    })

    // Reading progress
    const updateProgress = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100
      setReadingProgress(Math.min(100, Math.max(0, progress)))
    }

    window.addEventListener('scroll', updateProgress)
    updateProgress()

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill())
      window.removeEventListener('scroll', updateProgress)
    }
  }, [])

  const scrollToChapter = (chapterId: string) => {
    const element = chaptersRef.current[chapterId]
    if (element) {
      const offset = 120
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      })
    }
  }

  const chapters: Chapter[] = [
    {
      id: 'chapter1',
      number: 'Chapter I',
      title: 'Betting with Units',
      icon: <AiFillBank />,
      content: (
        <div className={styles.chapterContent}>
          <p>Proper unit sizing is debated across the industry, but it is generally accepted as being <span className={styles.highlightText}>1-3% of your bankroll</span>. By bankroll we mean the amount of money you have set aside for sports betting. Your bankroll should be split up between multiple betting accounts - we'll get into this later.</p>
          
          <div className={styles.highlightBox}>
            <p>If you have $1,000 set aside for gambling, your unit size would range from <span className={styles.boldText}>$10 to $30</span> depending on your risk tolerance. Choose whatever is most comfortable for you, but make sure once the percentage is set, you always stick with it!</p>
          </div>

          <div className={styles.warningBox}>
            <p><span className={styles.boldText}>You should never bet above 7% of your total bankroll in one day.</span> This number can vary, but make sure you are always under the 7% range.</p>
          </div>

          <p>In order to stay in this range, you need to get used to making quarter, half, three quarter, and full unit bets. Usually this depends on your confidence level, but it is also a great way to make sure you are not over leveraged with only full unit bets.</p>

          <p>Many different articles suggest that bettors should make full unit plays on bets that are around even odds - this is illogical, especially for high volume bettors. If your full unit size is 3%, after three even odds bets, you are risking almost 10% of your entire bankroll. Miss all three bets and you're down 10%.</p>

          <div className={styles.sectionDivider}></div>

          <h3 className={styles.sectionTitle}>ROI Tracking</h3>
          
          <p>Keeping track of your ROI (return on investment) is not only a great way to determine your success, but it allows you to see how much you bet vs how much you profit - a win percentage can only tell you so much.</p>

          <div className={styles.formulaBox}>
            <p className={styles.formulaTitle}>ROI Formula:</p>
            <p>ROI = (Profit/Amount Wagered) x 100</p>
          </div>

          <p>You can keep track of all of your bets in many different ways. Many beginners choose to keep a record of profit/loss in their notes app or even a google doc. We'd recommend opening an excel file or even using a service like the action network.</p>

          <div className={styles.highlightBox}>
            <p><span className={styles.boldText}>Basic tracking should include:</span></p>
            <ul className={styles.tipsList}>
              <li>Units at risk</li>
              <li>Dollars at risk</li>
              <li>Bet odds</li>
              <li>W/L status</li>
              <li>Payout amount</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>At the end of every day you should calculate total profit or loss, along with ROI.</p>
          </div>

          <div className={styles.warningBox}>
            <p><span className={styles.boldText}>Important:</span> We always determine our unit size according to units we are willing to risk, NOT units to win. We believe this is the best unit betting strategy.</p>
          </div>
        </div>
      )
    },
    {
      id: 'chapter2',
      number: 'Chapter II',
      title: 'Line Shopping',
      icon: <FaShoppingCart />,
      content: (
        <div className={styles.chapterContent}>
          <p>Every professional sports bettor knows how crucial it is to be signed up to many different sports books. There is no set minimum or maximum amount of books you should have, but we recommend having <span className={styles.highlightText}>at least three</span> you can play on.</p>

          <div className={styles.highlightBox}>
            <p>As mentioned in Chapter I, your bankroll will be spread out over multiple different books. Your money doesn't have to be evenly spread out, but you should have somewhat similar amounts in each of your accounts.</p>
          </div>

          <p>This ensures you are able to bet and find the best odds for each bet you are willing to take. And if you get kicked off a book, you'll always have a backup. While it may seem minimal in the short run, finding a bet with <span className={styles.boldText}>+5 to +10 or more better odds</span> will be well worth it in the long run! Every extra dollar counts!</p>

          <p>In order to line shop efficiently, you need to get familiar with odd shops. After some time, you will likely find books that consistently have the best odds - sign up for those! These are websites that allow you to see different lines across different books for the same game.</p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>3+</div>
              <div className={styles.statLabel}>Minimum Sportsbooks</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>+5-10</div>
              <div className={styles.statLabel}>Better Odds Available</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>100%</div>
              <div className={styles.statLabel}>Worth It Long Term</div>
            </div>
          </div>

          <div className={styles.highlightBox}>
            <p style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}>The more you shop... the more you win!</p>
          </div>
        </div>
      )
    },
    {
      id: 'chapter3',
      number: 'Chapter III',
      title: 'Implied Odds',
      icon: <PiGraphBold />,
      content: (
        <div className={styles.chapterContent}>
          <p>Implied probability represents the likelihood of an event occurring based on the betting odds provided by a sports book. A sports book will estimate the likelihood of an event occurring and represent that likelihood in the form of betting odds (-150, 60% chance of occurring).</p>

          <div className={styles.formulaBox}>
            <p className={styles.formulaTitle}>Formula for a Favorite:</p>
            <p>Implied Probability = Odds/(Odds+100)</p>
            <p style={{ marginTop: '0.5rem' }}><em>Ex. -150 odds, Implied prob = 150/250 = 60%</em></p>
          </div>

          <div className={styles.formulaBox}>
            <p className={styles.formulaTitle}>Formula for an Underdog:</p>
            <p>Implied Probability = 100/(Odds+100)</p>
            <p style={{ marginTop: '0.5rem' }}><em>Ex. +150 underdog, Implied prob = 100/250 = 40%</em></p>
          </div>

          <div className={styles.highlightBox}>
            <p style={{ fontWeight: 700, marginBottom: '1rem' }}>What it means to be a Profitable Bettor:</p>
            <ul className={styles.tipsList}>
              <li>+100 = 50.5% win rate for profit</li>
              <li>-110 = 53% win rate for profit</li>
              <li>-120 = 55% win rate for profit</li>
              <li>-150 = 60.5% win rate for profit</li>
            </ul>
          </div>

          <div className={styles.warningBox}>
            <p style={{ fontWeight: 700, marginBottom: '1rem' }}>A $100 bettor across 100 bets going 50-50 (50%):</p>
            <ul style={{ listStyle: 'none', marginLeft: '1rem' }}>
              <li>+100 = +$0</li>
              <li>-110 = -$454.50</li>
              <li>-120 = -$834.50</li>
              <li>-150 = -$1,666.50</li>
            </ul>
          </div>

          <div className={styles.sectionDivider}></div>

          <h3 className={styles.sectionTitle}>Hedging your Bet</h3>

          <p>Hedging your bet means locking in guaranteed profit and saving yourself from any unnecessary loss. Majority of the time bettors execute hedges by taking the exact opposite of their original bet while the game is still live.</p>

          <p>For initial wagers between <span className={styles.highlightText}>-200 and -150</span> the hedge threshold begins when you have the opportunity to 2x-2.5x the original bet's profit, while placing a wager that is 75% or less of the original profit.</p>

          <p>For initial wagers of <span className={styles.highlightText}>-150 or less</span>, the hedge threshold begins when you have the opportunity to 1.5x the original bet's profit, while placing a wager that is 75% or less of the original profit.</p>

          <div className={styles.exampleBox}>
            <p className={styles.exampleTitle}>Example hedge scenario:</p>
            <ol style={{ marginLeft: '1.5rem' }}>
              <li>Original bet: $100 at -120 to profit $83. The opponents line was set at +110</li>
              <li>Hedge bet: Opponents line moves to +200. Bet $61 to profit $122</li>
              <li>Original bet wins: $83 profit - $61(hedge) = $22 net profit</li>
              <li>Hedge bet wins: $122 profit - $100(original) = $22 net profit</li>
            </ol>
            <p style={{ marginTop: '1rem' }}><strong>Calculating hedge risk/profit:</strong> $83 x .75= $61 risk / $83 x 1.5 = $122 profit</p>
          </div>
        </div>
      )
    },
    {
      id: 'chapter4',
      number: 'Chapter IV',
      title: 'Reverse Line Movement',
      icon: <VscGraphLine />,
      content: (
        <div className={styles.chapterContent}>
          <p>Reverse line movement occurs when sports books adjust their lines to balance the action. In most cases, this tends to happen when <span className={styles.highlightText}>sharp bettors place large bets</span> on the opposite side of the public.</p>

          <p>Because the sports books' goal for creating any odds line is to have a balanced amount of money on both sides, reverse line movement is necessary to try to make the liability on each side closer to 50/50.</p>

          <div className={styles.exampleBox}>
            <p className={styles.exampleTitle}>Real Example: Chiefs vs Colts</p>
            <p>The Chiefs were home favorites against the Colts with an opening line of <strong>-7</strong>. Throughout the week, the number of bets and total dollars wagered had been consistently coming in on the chiefs - making this a majority public play.</p>
            
            <p style={{ marginTop: '1rem' }}>Instead of the Chiefs becoming more favored (which should've happened to make the line a less favorable bet to place, thus pushing for more public bets on the Colts), the line actually moved in favor of the colts.</p>
            
            <p style={{ marginTop: '1rem' }}>As the week went on, the Chiefs spread line changed to <strong>-6.5</strong>, then to <strong>-6</strong>, and eventually closed at <strong>-5.5</strong>, generating a <span className={styles.highlightText}>+1.5 point difference</span>.</p>
          </div>

          <div className={styles.highlightBox}>
            <p>This would be considered reverse line movement because the line moved in the <span className={styles.boldText}>opposite direction</span> of the public's bets and opinion of what would happen in the contest. This is a clear indication of sharp money and Vegas siding with the professional bettors for this matchup.</p>
          </div>

          <p>Nothing is ever a "lock" or a guarantee, but understanding where the professional bettors have their money can give you a huge advantage against the books.</p>
        </div>
      )
    },
    {
      id: 'chapter6',
      number: 'Chapter VI',
      title: 'Insiders Checklist',
      icon: <VscChecklist />,
      content: (
        <div className={styles.chapterContent}>
          <p>Every bettor has a different process when it comes to making specific types of bets. In this comprehensive checklist, we're going to cover the key things you should ask yourself before making any bet - whether it's a spread, moneyline, total, or player prop.</p>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>1) Previous Performances</h3>
            
            <p style={{ marginBottom: '1rem' }}><span className={styles.highlightText}>Spread:</span></p>
            <ul className={styles.tipsList}>
              <li>What is this team's record against the spread?</li>
              <li>How many times have they covered as an underdog? As a favorite?</li>
              <li>What is their record against the spread at home? On the road?</li>
            </ul>

            <p style={{ margin: '1rem 0' }}><span className={styles.highlightText}>Moneyline:</span></p>
            <ul className={styles.tipsList}>
              <li>What is this team's record at home? Away?</li>
              <li>Why would they be road favorites? Why would they be underdogs at home?</li>
              <li>Have these teams matched up before? What will the home environment look like?</li>
            </ul>

            <p style={{ margin: '1rem 0' }}><span className={styles.highlightText}>Total:</span></p>
            <ul className={styles.tipsList}>
              <li>How many times have either of these teams gone over the given total? Under?</li>
              <li>What is the pace of play? Does the pace accurately reflect the total?</li>
              <li>How has their offense been performing recently?</li>
            </ul>
          </div>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>2) Line Movement & Betting Splits</h3>
            
            <p><span className={styles.highlightText}>Reverse Line Movement:</span> Reverse line movement is the practice of sportsbooks adjusting their lines in the exact opposite direction of what logic would suggest in order to balance the action.</p>
            
            <p style={{ marginTop: '1rem' }}><span className={styles.highlightText}>Trap Games:</span> This typically happens when the public is all over one side because it seems "too easy". You can sniff these out typically through reverse line movement.</p>
          </div>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>3) Injuries & Referee Bias</h3>
            
            <p style={{ marginBottom: '1rem' }}><span className={styles.highlightText}>Injury Reports:</span></p>
            <ul className={styles.tipsList}>
              <li>Check injury reports to find if certain players are sitting out</li>
              <li>If they are, does the line reflect this?</li>
              <li>Who are the back-ups? How does this benefit the opponent?</li>
            </ul>

            <p style={{ margin: '1rem 0' }}><span className={styles.highlightText}>Referees:</span></p>
            <ul className={styles.tipsList}>
              <li>How has this team performed under this specific referee?</li>
              <li>Does it change based on home or away?</li>
              <li>Do they score more, less, or an average amount of points under this referee?</li>
            </ul>
          </div>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>4) Theories & Systems</h3>
            
            <p><span className={styles.highlightText}>Theories:</span> Come up with your own theories that you can track and test over time. Here's an example: "When the O/U total is set between 'X' & 'X', and the home team is coming off a loss, how often does the over hit?"</p>
            
            <p style={{ marginTop: '1rem' }}><span className={styles.highlightText}>Systems:</span> Create your own systems that automatically track the outcome of matchups for you. Using excel, sports insights, or even online websites that have their own system builders.</p>
          </div>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>5) Trends</h3>
            
            <p><span className={styles.highlightText}>Season long:</span> What's their recent win %? What's their opponent's recent win %? Are they making a playoff run?</p>
            
            <p style={{ marginTop: '1rem' }}><span className={styles.highlightText}>Conference:</span> What's their in conference versus out of conference record? Why does this record make sense?</p>
          </div>

          <div className={styles.sectionDivider}></div>

          <h3 className={styles.sectionTitle}>Player Props Checklist</h3>

          <p>When making player props, you need to consider additional factors beyond team performance. Here's what to check before placing a player prop bet:</p>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>6) Checking the Matchup</h3>
            
            <ul className={styles.tipsList}>
              <li><span className={styles.boldText}>Spread:</span> Is this game expected to be a blow out? Will star players play less minutes?</li>
              <li><span className={styles.boldText}>Total:</span> Is this game expected to be high scoring? What about low scoring?</li>
              <li><span className={styles.boldText}>Injuries:</span> Who is injured for today's game? Will this affect how other players perform?</li>
            </ul>
          </div>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>7) Opponent Stats</h3>
            
            <ul className={styles.tipsList}>
              <li><span className={styles.boldText}>Pace:</span> Pace is a stat that measures possessions per game. How many possessions per game does this team average?</li>
              <li><span className={styles.boldText}>Offensive rating:</span> How efficient is this team's offense? Are they above/below average?</li>
              <li><span className={styles.boldText}>Defensive rating:</span> How good is this team's defense compared to others?</li>
            </ul>
          </div>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>8) Opponent Profile</h3>
            
            <ul className={styles.tipsList}>
              <li><span className={styles.boldText}>Opponent FG%:</span> How is this team's FG% allowed compared to the league average?</li>
              <li><span className={styles.boldText}>Allowed points:</span> Where does the defense allow the most points? Are they bad at the rim? Bad against the 3?</li>
              <li><span className={styles.boldText}>Types of players:</span> Which types of players are the most efficient against this defense?</li>
            </ul>
          </div>

          <div className={styles.highlightBox}>
            <h3 className={styles.checklistTitle}>9) Player Profile</h3>
            
            <ul className={styles.tipsList}>
              <li><span className={styles.boldText}>Points:</span> Where and how does this player score their points?</li>
              <li><span className={styles.boldText}>Competition:</span> How has this player performed against similar types of teams?</li>
              <li><span className={styles.boldText}>Season averages:</span> Is this line way below/above the players season average? Why?</li>
              <li><span className={styles.boldText}>Recency bias:</span> How has this player played recently? Coming off an injury?</li>
            </ul>
          </div>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>Sharp</div>
              <div className={styles.statLabel}>Pinnacle, FanDuel</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>Retail</div>
              <div className={styles.statLabel}>DK, Bet365, ESPNbet</div>
            </div>
          </div>

          <div className={styles.highlightBox}>
            <p><span className={styles.boldText}>props.cash:</span> props.cash is an outstanding resource for player prop statistics. You can see a plethora of stats for pretty much any player in the league. Use code <span className={styles.highlightText}>INSIDER</span> for 25% off your first month.</p>
          </div>
        </div>
      )
    },
    {
      id: 'chapter8',
      number: 'Chapter VII',
      title: 'Profitable Parlays',
      icon: <FaMoneyBillTrendUp />,
      content: (
        <div className={styles.chapterContent}>
          <p>As you probably read in section 5, we are not fans of parlays. With that being said, here's a type of parlay we like to make. The <span className={styles.highlightText}>Wong Teaser</span> is the safest option when it comes to combining 2 teams on a bet slip.</p>

          <p>This strategy originates from a man named Stanford Wong, author of the book Sharp Sports Betting. In the book, he suggests that because a vast majority of games finish with a point difference of between 3 and 7, you should add a 6 point "tease" to any 2 teams that would cover their spread if they won by 3 or more or lost by 7 or less.</p>

          <div className={styles.exampleBox}>
            <p className={styles.exampleTitle}>A) Wong teaser (favorite/underdog):</p>
            <p>Team (A): -7.5 or -8.5 (add 6 pt tease) → -1.5 or -2.5</p>
            <p>Team (B): +1.5 or +2.5 (add 6pt tease) → +7.5 or +8.5</p>
          </div>

          <div className={styles.exampleBox}>
            <p className={styles.exampleTitle}>B) Wong teaser (2 underdogs):</p>
            <p>Team (A): +1.5 or +2.5 (add 6pt tease) → +7.5 or +8.5</p>
            <p>Team (B): +1.5 or +2.5 (add 6pt tease) → +7.5 or +8.5</p>
          </div>

          <div className={styles.exampleBox}>
            <p className={styles.exampleTitle}>C) Wong teaser (2 favorites):</p>
            <p>Team (A): -7.5 or -8.5 (add 6 pt tease) → -1.5 or -2.5</p>
            <p>Team (B): -7.5 or -8.5 (add 6 pt tease) → -1.5 or -2.5</p>
          </div>

          <div className={styles.warningBox}>
            <p>*Odds are between -110 to -120 after you combine 2 teams that fit any of the examples*</p>
          </div>

          <p>In the first example, you are covered if team A wins by 3 or more points. If you only bet the original line, you were not covered. For team B, you are covered if they lose by up to 8 points. If you only bet their original line, you were not covered.</p>

          <div className={styles.highlightBox}>
            <p>Taking both of the original lines means placing 2 bets at -110. Since both bets have an implied odds of 52.4%, you should theoretically only win 1 of the bets. Combining them in a 6pt teaser, not only gives you a much higher chance of each bet winning, but it gives you the same line odds for 1 bet. You should be able to get most Wong teasers for between -110 and -120.</p>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className={styles.guidePage}>
      {/* Gradient Lines Background */}
      <div 
        className={styles.heroGradientLine} 
        data-direction="left" 
        data-position="high"
        style={{ 
          animationDelay: '0s, 0s, 0s',
          animationDuration: '3s, 25s, 25s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="right" 
        data-position="high"
        style={{ 
          animationDelay: '15s, 15s, 15s',
          animationDuration: '3s, 28s, 28s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="left" 
        data-position="mid"
        style={{ 
          animationDelay: '8s, 8s, 8s',
          animationDuration: '3s, 30s, 30s'
        } as React.CSSProperties}
      ></div>
      <div 
        className={styles.heroGradientLine} 
        data-direction="right" 
        data-position="mid"
        style={{ 
          animationDelay: '22s, 22s, 22s',
          animationDuration: '3s, 27s, 27s'
        } as React.CSSProperties}
      ></div>

      {/* Reading Progress Bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroHeader}>
            <span className={styles.heroLabel}>the betting insiders</span>
            <h1 className={styles.heroTitle}>
              The Complete Betting Guide
            </h1>
            <p className={styles.heroSubtitle}>
              Master the fundamentals of profitable sports betting
            </p>
          </div>
        </div>
      </section>

      <div className={styles.guideContainer}>
        {/* Floating Sidebar Navigation */}
        <aside 
          ref={navRef}
          className={styles.floatingNav}
          onMouseEnter={() => {
            const tl = tlRef.current
            if (tl && !isNavExpanded) {
              setIsNavExpanded(true)
              tl.play()
            }
          }}
          onMouseLeave={() => {
            const tl = tlRef.current
            if (tl && isNavExpanded) {
              setIsNavExpanded(false)
              tl.reverse().then(() => {
                // Reset to initial state after reverse
                const navEl = navRef.current
                const validTexts = navTextsRef.current.filter(el => el !== null && el !== undefined)
                const validIcons = navIconsRef.current.filter(el => el !== null && el !== undefined)
                if (navEl) {
                  gsap.set(navEl, { width: 56, borderRadius: 60 })
                }
                gsap.set(validTexts, { 
                  opacity: 0, 
                  x: -10, 
                  width: 0, 
                  maxWidth: 0,
                  visibility: 'hidden'
                })
                gsap.set(validIcons, { x: 11 })
              })
            }
          }}
        >
          <nav className={styles.navList}>
            {chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className={styles.navItemWrapper}
              >
                <a
                  href={`#${chapter.id}`}
                  className={`${styles.navLink} ${activeChapter === chapter.id ? styles.navLinkActive : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToChapter(chapter.id)
                  }}
                >
                  <span 
                    ref={(el) => {
                      if (el) navIconsRef.current[index] = el
                    }}
                    className={styles.navIcon} 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {chapter.icon || <span style={{ width: '36px', height: '36px' }}></span>}
                  </span>
                  <div 
                    ref={(el) => {
                      if (el) navTextsRef.current[index] = el
                    }}
                    className={styles.navText}
                  >
                    <span className={styles.navNumber}>{chapter.number}</span>
                    <span className={styles.navTitle}>{chapter.title}</span>
                  </div>
                </a>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              id={chapter.id}
              ref={(el) => {
                chaptersRef.current[chapter.id] = el
              }}
              className={styles.chapter}
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className={styles.chapterNumber}>{chapter.number}</div>
              <h2 className={styles.chapterTitle}>
                {chapter.icon && (
                  <div className={styles.chapterIcon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{chapter.icon}</div>
                )}
                {chapter.title}
              </h2>
              {chapter.content}
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}

