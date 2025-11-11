'use client'

import React, { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitText from '@/components/SplitText'
import styles from './parlay-calculator.module.css'

gsap.registerPlugin(ScrollTrigger)

interface ParlayLeg {
  id: number
  odds: string
}

export default function ParlayCalculatorPage() {
  const [legs, setLegs] = useState<ParlayLeg[]>([{ id: 1, odds: '' }])
  const [bookOdds, setBookOdds] = useState<string>('')
  const [calculatedOdds, setCalculatedOdds] = useState<number>(0)
  const [difference, setDifference] = useState<number | null>(null)
  const [valueText, setValueText] = useState<string>('Great Value')
  const [valueColor, setValueColor] = useState<string>('#60a5fa')
  const resultsRef = useRef<HTMLDivElement>(null)

  const americanToDecimal = (odds: number): number => {
    if (isNaN(odds) || odds === 0) return 1
    return odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1
  }

  const calculateParlayOdds = (): number => {
    let totalDecimalOdds = 1
    let hasValidOdds = false

    legs.forEach(leg => {
      const oddsValue = parseFloat(leg.odds)
      if (!isNaN(oddsValue) && oddsValue !== 0) {
        totalDecimalOdds *= americanToDecimal(oddsValue)
        hasValidOdds = true
      }
    })

    if (!hasValidOdds) return 0

    const totalAmericanOdds = totalDecimalOdds >= 2
      ? (totalDecimalOdds - 1) * 100
      : -100 / (totalDecimalOdds - 1)

    return Math.round(totalAmericanOdds)
  }

  const updateResults = () => {
    const calcOdds = calculateParlayOdds()
    setCalculatedOdds(calcOdds)

    const bookOddsValue = parseFloat(bookOdds)
    if (bookOddsValue !== 0 && !isNaN(bookOddsValue) && calcOdds !== 0) {
      const diff = Math.round(calcOdds - bookOddsValue)
      setDifference(diff)
      updateSlider(diff)
    } else {
      setDifference(null)
      updateSlider(0)
    }
  }

  const updateSlider = (value: number) => {
    const sliderValue = Math.min(Math.max(value, 0), 200)
    const percentage = (sliderValue / 200) * 100
    const sliderCircle = document.getElementById('sliderCircle')
    
    if (sliderCircle) {
      sliderCircle.style.left = percentage + '%'
    }

    if (sliderValue <= 66) {
      setValueText('Great Value')
      setValueColor('#60a5fa')
    } else if (sliderValue <= 133) {
      setValueText('Okay Value')
      setValueColor('#9ca3af')
    } else {
      setValueText('Poor Value')
      setValueColor('#e5e7eb')
    }
  }

  const addLeg = () => {
    const newId = legs.length > 0 ? Math.max(...legs.map(l => l.id)) + 1 : 1
    setLegs([...legs, { id: newId, odds: '' }])
  }

  const removeLeg = (id: number) => {
    if (legs.length > 1) {
      setLegs(legs.filter(leg => leg.id !== id))
    }
  }

  const updateLegOdds = (id: number, odds: string) => {
    setLegs(legs.map(leg => 
      leg.id === id ? { ...leg, odds } : leg
    ))
  }

  useEffect(() => {
    updateResults()
  }, [legs, bookOdds])

  useEffect(() => {
    // Initialize slider position
    const sliderCircle = document.getElementById('sliderCircle')
    if (sliderCircle) {
      sliderCircle.style.left = '0%'
    }
  }, [])

  return (
    <div className={styles.parlayPage}>
      {/* Gradient Lines Background */}
      <section className={styles.heroSection}>
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
        <div 
          className={styles.heroGradientLine} 
          data-direction="left" 
          data-position="low"
          style={{ 
            animationDelay: '12s, 12s, 12s',
            animationDuration: '3s, 26s, 26s'
          } as React.CSSProperties}
        ></div>
        <div 
          className={styles.heroGradientLine} 
          data-direction="right" 
          data-position="low"
          style={{ 
            animationDelay: '18s, 18s, 18s',
            animationDuration: '3s, 29s, 29s'
          } as React.CSSProperties}
        ></div>
        <div className={styles.heroContainer}>
          <div className={styles.heroHeader}>
            <span className={styles.heroLabel}>Is Your Parlay really worth taking?</span>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleHighlight}>Parlay Calculator</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Figure out the odds you should be getting on the parlay you are looking to place! 
              Sportsbooks tend to lessen the odds of parlays the more legs you add.
            </p>
            
            {/* Features */}
            <div className={styles.heroFeatures}>
              <div className={styles.heroFeature}>
                <div className={styles.heroFeatureIcon}>✓</div>
                <span>Accurate Results</span>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.heroFeatureIcon}>✓</div>
                <span>Totally Free</span>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.heroFeatureIcon}>✓</div>
                <span>User-Friendly Interface</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className={styles.calculatorSection}>
        <div className={styles.calculatorContainer}>
          <div className={styles.calculatorGrid}>
            {/* Calculator Card */}
            <div className={styles.calculatorCard}>
              <h2 className={styles.cardTitle}>Parlay Builder</h2>
              
              <div className={styles.legsContainer}>
                {legs.map((leg, index) => (
                  <div key={leg.id} className={styles.leg}>
                    <div className={styles.legHeader}>
                      <div className={styles.legNumber}>LEG {index + 1}</div>
                      {legs.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeLeg(leg.id)}
                          aria-label="Remove leg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Odds (American)</label>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="e.g., -250, +150"
                        value={leg.odds}
                        onChange={(e) => updateLegOdds(leg.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className={styles.addButton}
                onClick={addLeg}
              >
                + Add Leg
              </button>

              <div className={styles.formGroup}>
                <label className={styles.label}>Book's Total Odds (American)</label>
                <input
                  type="number"
                  className={styles.input}
                  id="bookOdds"
                  placeholder="Enter book's odds"
                  value={bookOdds}
                  onChange={(e) => setBookOdds(e.target.value)}
                />
                <p className={styles.subtext}>Odds your sportsbook is giving you for this parlay</p>
              </div>
            </div>

            {/* Results Card */}
            <div className={styles.resultsCard} ref={resultsRef}>
              <h2 className={styles.resultsTitle}>Parlay Analysis</h2>
              
              <div className={styles.resultItem}>
                <div className={styles.resultLabel}>Total Calculated Odds</div>
                <div className={styles.resultValue}>
                  {calculatedOdds === 0 ? '0' : (calculatedOdds > 0 ? '+' : '') + calculatedOdds}
                </div>
              </div>
              
              <div className={styles.resultItem}>
                <div className={styles.resultLabel}>Difference</div>
                <div className={styles.resultValue}>
                  {difference !== null ? difference : 'N/A'}
                </div>
                <p className={styles.subtext}>A bigger difference means worse value</p>
              </div>
              
              <div className={styles.valueAssessment}>
                <div className={styles.resultLabel}>Value Assessment</div>
                <div className={styles.valueCard}>
                  <div className={styles.sliderContainer}>
                    <div className={styles.sliderCircle} id="sliderCircle"></div>
                  </div>
                  <div 
                    className={styles.valueText}
                    style={{ color: valueColor }}
                  >
                    {valueText}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SEO Content Section */}
      <section className={styles.seoSection}>
        <div className={styles.seoContent}>
          <h2>Master Parlay Value Calculation</h2>
          <p>
            Smart <strong>parlay betting</strong> requires understanding the true odds versus what sportsbooks offer. Our <strong>parlay calculator</strong> helps you determine if your parlay bet is worth placing by calculating the fair odds you should be getting.
          </p>

          <h3>Why Parlay Value Matters:</h3>
          <ul>
            <li><strong>True odds calculation</strong> - Know the actual combined odds of your parlay legs</li>
            <li><strong>Sportsbook margin</strong> - Identify when books are taking too much juice</li>
            <li><strong>Value assessment</strong> - Make informed decisions before placing multi-leg bets</li>
            <li><strong>Long-term profitability</strong> - Avoid parlays with poor value to improve your ROI</li>
            <li><strong>American odds support</strong> - Works with standard American odds format (-110, +150, etc.)</li>
          </ul>

          <h3>How Our Parlay Calculator Works</h3>
          <p>
            Our free <strong>parlay value calculator</strong> multiplies the decimal odds of each leg to find the true combined odds. It then compares this to your sportsbook's offered odds, showing you the difference. A larger difference means the book is taking more margin, giving you worse value.
          </p>

          <p>
            Whether you're building a 2-leg parlay or a complex 10-leg bet, our calculator helps you identify value before you place your wager. Understanding parlay value is essential for long-term sports betting success.
          </p>
        </div>
      </section>
    </div>
  )
}

