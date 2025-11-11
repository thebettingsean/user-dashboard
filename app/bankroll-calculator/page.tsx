'use client'

import React, { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitText from '@/components/SplitText'
import styles from './bankroll-calculator.module.css'

gsap.registerPlugin(ScrollTrigger)

interface FormData {
  name: string
  age: string
  experience: string
  profitLoss: string
  income: string
  bankrollAmount: string
  riskTolerance: string
  frequency: string
  goal: string
  bettingStyle: string
}

interface CalculationResults {
  bankroll: number
  unitPercent: string
  unitAmount: number
  baseBankroll: number
}

const multipliers = {
  age: {
    '18-21': { br: 0.7, unit: 0.7 },
    '22-25': { br: 0.9, unit: 0.9 },
    '26-34': { br: 1.0, unit: 1.0 },
    '35-49': { br: 1.15, unit: 1.15 },
    '50+': { br: 1.2, unit: 1.2 }
  },
  experience: {
    'Just starting': { br: 0.6, unit: 0.5 },
    '1-6m': { br: 0.9, unit: 0.9 },
    '6-1yr': { br: 1.0, unit: 1.0 },
    '1-2yr': { br: 1.15, unit: 1.1 },
    '2-5yr': { br: 1.3, unit: 1.2 },
    '5+yr': { br: 1.5, unit: 1.3 }
  },
  profitLoss: {
    Profit: { br: 1.3, unit: 1.2 },
    Breakeven: { br: 1.0, unit: 1.0 },
    Loss: { br: 0.6, unit: 0.6 }
  },
  income: {
    '<1000': { br: 0.8, unit: 0.5 },
    '1000-2000': { br: 0.9, unit: 0.7 },
    '2000-5000': { br: 1.0, unit: 1.0 },
    '5000-10000': { br: 1.1, unit: 1.1 },
    '10000+': { br: 1.25, unit: 1.2 }
  },
  riskTolerance: {
    '1': { br: 1.4, unit: 1.4 },
    '2': { br: 1.2, unit: 1.2 },
    '3': { br: 1.1, unit: 1.1 },
    '4': { br: 1.0, unit: 1.0 },
    '5': { br: 0.95, unit: 0.95 },
    '6': { br: 0.9, unit: 0.9 },
    '7': { br: 0.8, unit: 0.8 },
    '8': { br: 0.75, unit: 0.75 },
    '9': { br: 0.68, unit: 0.68 },
    '10': { br: 0.6, unit: 0.6 }
  },
  frequency: {
    '0-7-week': { br: 1.1, unit: 1.1 },
    '1-4-day': { br: 1.0, unit: 1.0 },
    '5-9-day': { br: 0.75, unit: 0.75 },
    '10+-day': { br: 0.6, unit: 0.6 }
  },
  goal: {
    Fun: { br: 0.6, unit: 0.6 },
    Profit: { br: 1.3, unit: 1.3 },
    Both: { br: 1.0, unit: 1.0 }
  },
  bettingStyle: {
    'Straight Bets': { br: 1.2, unit: 1.2 },
    Parlays: { br: 0.4, unit: 0.4 },
    'Live Bets': { br: 0.75, unit: 0.75 },
    Arbitrage: { br: 1.4, unit: 1.4 }
  }
}

const bankrollDescriptions: Record<string, string> = {
  '<500': "Your current bankroll is on the lower end, which likely means you're newer to sports betting, taking a cautious approach, or only setting aside discretionary funds. With a smaller bankroll, it's crucial to be selective with your bets and focus on high-quality wagers rather than volume. Prioritizing straight bets over parlays and sticking to a disciplined strategy will help you maximize your potential returns while minimizing variance. As you gain more experience and build confidence, you can look to gradually increase your bankroll over time.",
  '500-1000': "You have a moderate bankroll, indicating that you're committed to betting but still keeping things controlled. Whether you're still learning or have some experience, your approach should emphasize efficiency. Finding value in lines, sticking to manageable bet sizes, and keeping a consistent staking plan will help you sustain long-term success. If your goal is profit, focusing on straight bets and selective wagers rather than chasing large payouts will yield better results.",
  '1000-2000': 'Your bankroll is in a solid range, giving you the flexibility to approach betting with a strategic mindset. Your experience level and risk tolerance will play a key role in shaping your success. If you\'re profitable or break-even, this level allows you to diversify your bets while keeping your unit size manageable. Prioritizing straight bets, tracking trends, and maintaining discipline will be essential in maintaining and growing your bankroll over time.',
  '2000-5000': "With a bankroll in this range, you have a strong foundation for structured betting. Your experience, risk tolerance, and betting goals should guide your decisions at this level. If you're already profitable, this bankroll allows you to scale your bets while maintaining control over your exposure. A balanced mix of straight bets and calculated risks can help you capitalize on value while preserving long-term stability. If you're still refining your strategy, staying disciplined and avoiding unnecessary risks will be crucial.",
  '5000-10000': "Your bankroll suggests that you're either experienced in sports betting or highly committed to growing your strategy. At this level, you have the ability to take advantage of more sophisticated betting opportunities, including market inefficiencies and advanced strategies. Depending on your risk tolerance, you can consider spreading bets across different markets while ensuring you maintain a structured approach. Staying consistent with unit sizing and bet selection will be key to sustained success.",
  '10000+': "A bankroll of this size indicates a high level of confidence, experience, or financial commitment to sports betting. Whether you're an experienced bettor or a high-stakes player, managing your unit sizes and maintaining discipline will be critical. Diversifying across various markets and leveraging your knowledge to find the best opportunities will allow you to optimize long-term profitability. The ability to manage variance and avoid emotional betting will be key factors in maximizing your returns at this level."
}

const unitDescriptions: Record<string, string> = {
  '0.50': "Your current unit size is relatively conservative, which is ideal for those who are newer to betting, managing a smaller bankroll, or prefer a low-risk approach. This strategy allows you to limit exposure and gain experience while keeping losses manageable. With this unit size, your focus should be on making calculated, high-value bets rather than chasing large payouts.",
  '0.75': 'A unit size of 0.75 indicates a cautious but slightly more aggressive approach than the lowest tier. This is suitable for bettors who are still refining their strategy but have a moderate risk tolerance. At this level, consistency in bet selection is key, and avoiding unnecessary variance will help you sustain long-term growth.',
  '1.00-1.25': "You're operating within a standard unit size range, balancing risk and reward effectively. This range is well-suited for bettors with experience who understand bankroll management and betting discipline. Your focus should remain on maximizing value, finding the best odds, and maintaining a steady, consistent approach to wagering.",
  '1.50-1.75': "With a higher unit size, you're taking a more aggressive approach, which typically aligns with experienced bettors or those with higher risk tolerance. At this level, sharp decision-making and disciplined betting become even more important. If you're profitable, this unit size allows for strong growth potential, but ensuring you don't overextend yourself is crucial.",
  '2.00': "A unit size of 2.00 signals a confident and aggressive approach to betting. This strategy is typically reserved for experienced bettors with a clear edge or those who are comfortable with higher risk. At this level, it's essential to have a well-developed strategy and a deep understanding of variance to manage swings effectively. Maintaining discipline and staying selective with bets will be the key to maximizing success."
}

export default function BankrollCalculatorPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    experience: '',
    profitLoss: '',
    income: '',
    bankrollAmount: '',
    riskTolerance: '',
    frequency: '',
    goal: '',
    bettingStyle: ''
  })
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [currentUserData, setCurrentUserData] = useState<FormData | null>(null)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const roiGraphRef = useRef<SVGSVGElement>(null)

  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {}
    
    if (!formData.name.trim()) newErrors.name = true
    if (!formData.age) newErrors.age = true
    if (!formData.experience) newErrors.experience = true
    if (!formData.profitLoss) newErrors.profitLoss = true
    if (!formData.income) newErrors.income = true
    if (!formData.bankrollAmount || parseFloat(formData.bankrollAmount) < 50) {
      newErrors.bankrollAmount = true
    }
    if (!formData.riskTolerance) newErrors.riskTolerance = true
    if (!formData.frequency) newErrors.frequency = true
    if (!formData.goal) newErrors.goal = true
    if (!formData.bettingStyle) newErrors.bettingStyle = true

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculate = (data: FormData): CalculationResults => {
    let brMultiplier = 1
    let unitMultiplier = 1
    const base = Math.max(50, parseFloat(data.bankrollAmount))

    Object.keys(data).forEach(key => {
      if (key === 'name' || key === 'bankrollAmount') return
      const category = key as keyof typeof multipliers
      const value = data[key as keyof FormData]
      const multiplier = multipliers[category]
      if (multiplier && value && (multiplier as any)[value]) {
        brMultiplier *= (multiplier as any)[value].br
        unitMultiplier *= (multiplier as any)[value].unit
      }
    })

    const finalBankroll = Math.max(100, Math.round((base * brMultiplier) / 50) * 50)
    let finalUnit = 0.02 * unitMultiplier
    finalUnit = Math.max(0.005, Math.min(0.0225, finalUnit))
    finalUnit = Math.round(finalUnit * 400) / 400

    return {
      bankroll: finalBankroll,
      unitPercent: (finalUnit * 100).toFixed(2),
      unitAmount: Math.round(finalBankroll * finalUnit),
      baseBankroll: base
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      if (firstErrorField) {
        const errorElement = document.querySelector(`[name="${firstErrorField}"]`)
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
      return
    }

    setIsLoading(true)
    setCurrentUserData(formData)

    // Simulate calculation delay
    setTimeout(() => {
      const calculatedResults = calculate(formData)
      setResults(calculatedResults)
      setIsLoading(false)
      
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
        drawROIGraph(calculatedResults.bankroll, parseFloat(calculatedResults.unitPercent))
      }, 300)
    }, 2000)
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }))
    }
  }

  const getBankrollRange = (amount: number): string => {
    if (amount < 500) return '<500'
    if (amount < 1000) return '500-1000'
    if (amount < 2000) return '1000-2000'
    if (amount < 5000) return '2000-5000'
    if (amount < 10000) return '5000-10000'
    return '10000+'
  }

  const getUnitRange = (percent: string): string => {
    const num = parseFloat(percent)
    if (num <= 0.50) return '0.50'
    if (num <= 0.75) return '0.75'
    if (num <= 1.25) return '1.00-1.25'
    if (num <= 1.75) return '1.50-1.75'
    return '2.00'
  }

  const getComparison = (bankroll: number, unitPercent: string) => {
    let bankrollComp = ''
    let unitComp = ''

    if (bankroll < 1000) {
      bankrollComp = 'More conservative than 70% of bettors'
    } else if (bankroll < 3000) {
      bankrollComp = 'Similar to 60% of serious bettors'
    } else if (bankroll < 8000) {
      bankrollComp = 'More aggressive than 75% of bettors'
    } else {
      bankrollComp = 'In the top 15% of bankroll sizes'
    }

    const unitNum = parseFloat(unitPercent)
    if (unitNum < 1.0) {
      unitComp = 'Conservative approach - great for beginners'
    } else if (unitNum < 1.5) {
      unitComp = 'Balanced approach - most recommended'
    } else {
      unitComp = 'Aggressive approach - for experienced bettors'
    }

    return { bankrollComp, unitComp }
  }

  const animateValue = (element: HTMLElement, start: number, end: number, prefix: string, suffix: string) => {
    const duration = 1500
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.round(start + (end - start) * easeProgress)
      element.textContent = prefix + currentValue.toLocaleString() + suffix

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  const drawROIGraph = (bankroll: number, unitPercent: number) => {
    const svg = roiGraphRef.current
    if (!svg) return

    const width = 800
    const height = 300
    const padding = { top: 20, right: 20, bottom: 50, left: 80 }
    const graphWidth = width - padding.left - padding.right
    const graphHeight = height - padding.top - padding.bottom

    const months = 12
    const betsPerMonth = 30
    const winRate = 0.55
    const winPayout = 100 / 110
    const unitSize = unitPercent / 100

    const dataPoints: Array<{ month: number; bankroll: number }> = []
    let currentBankroll = bankroll
    const pointsPerMonth = 10

    const variance = [
      0.02, -0.018, 0.025, -0.01, 0.015, -0.022, 0.012, -0.008,
      0.028, -0.02, 0.018, -0.015, 0.022, -0.025, 0.01, -0.012,
      0.03, -0.028, 0.02, -0.018, 0.025, -0.015, 0.018, -0.02
    ]

    for (let i = 0; i <= months * pointsPerMonth; i++) {
      const monthPos = i / pointsPerMonth

      if (i > 0) {
        const ev = (winRate * winPayout * unitSize) - ((1 - winRate) * unitSize)
        const periodGrowth = currentBankroll * ev * (betsPerMonth / pointsPerMonth)
        const varianceAmount = currentBankroll * variance[i % variance.length]
        currentBankroll += periodGrowth + varianceAmount
      }

      dataPoints.push({ month: monthPos, bankroll: currentBankroll })
    }

    const minBankroll = Math.min(...dataPoints.map(d => d.bankroll))
    const maxBankroll = Math.max(...dataPoints.map(d => d.bankroll))
    const yScale = (value: number) => graphHeight - ((value - minBankroll) / (maxBankroll - minBankroll)) * graphHeight
    const xScale = (month: number) => (month / months) * graphWidth

    svg.innerHTML = `
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#60a5fa;stop-opacity:0" />
        </linearGradient>
      </defs>
    `

    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    gridGroup.setAttribute('transform', `translate(${padding.left}, ${padding.top})`)

    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * graphHeight
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', '0')
      line.setAttribute('y1', y.toString())
      line.setAttribute('x2', graphWidth.toString())
      line.setAttribute('y2', y.toString())
      line.setAttribute('stroke', '#374151')
      line.setAttribute('stroke-width', '1')
      line.setAttribute('opacity', '0.5')
      gridGroup.appendChild(line)
    }

    const lineData = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${xScale(d.month)} ${yScale(d.bankroll)}`
    ).join(' ')

    const areaData = lineData + ` L ${xScale(months)} ${graphHeight} L ${xScale(0)} ${graphHeight} Z`

    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    area.setAttribute('d', areaData)
    area.setAttribute('fill', 'url(#gradient)')
    area.setAttribute('opacity', '0.3')
    area.setAttribute('transform', `translate(${padding.left}, ${padding.top})`)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    line.setAttribute('d', lineData)
    line.setAttribute('fill', 'none')
    line.setAttribute('stroke', '#60a5fa')
    line.setAttribute('stroke-width', '3')
    line.setAttribute('filter', 'drop-shadow(0 0 10px rgba(96, 165, 250, 0.3))')
    line.setAttribute('transform', `translate(${padding.left}, ${padding.top})`)

    const xLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    xLabelsGroup.setAttribute('transform', `translate(${padding.left}, ${height - 20})`)

    ;['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].forEach((label, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', xScale(i * 2).toString())
      text.setAttribute('y', '0')
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('fill', '#9ca3af')
      text.setAttribute('font-size', '12px')
      text.textContent = label
      xLabelsGroup.appendChild(text)
    })

    const yLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    yLabelsGroup.setAttribute('transform', `translate(${padding.left - 10}, ${padding.top})`)

    for (let i = 0; i <= 5; i++) {
      const value = minBankroll + (maxBankroll - minBankroll) * (1 - i / 5)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', '0')
      text.setAttribute('y', ((i / 5) * graphHeight + 5).toString())
      text.setAttribute('text-anchor', 'end')
      text.setAttribute('fill', '#9ca3af')
      text.setAttribute('font-size', '12px')
      text.textContent = '$' + Math.round(value).toLocaleString()
      yLabelsGroup.appendChild(text)
    }

    svg.appendChild(gridGroup)
    svg.appendChild(area)
    svg.appendChild(line)
    svg.appendChild(xLabelsGroup)
    svg.appendChild(yLabelsGroup)

    const endBankroll = dataPoints[dataPoints.length - 1].bankroll
    const roi = ((endBankroll - bankroll) / bankroll) * 100

    const startBankrollEl = document.getElementById('startBankroll')
    const endBankrollEl = document.getElementById('endBankroll')
    const totalROIEl = document.getElementById('totalROI')

    if (startBankrollEl) startBankrollEl.textContent = '$' + Math.round(bankroll).toLocaleString()
    if (endBankrollEl) endBankrollEl.textContent = '$' + Math.round(endBankroll).toLocaleString()
    if (totalROIEl) totalROIEl.textContent = roi.toFixed(1) + '%'
  }

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setEmailError('Please enter a valid email address')
      return
    }

    setEmailError('')
    setIsSubmittingEmail(true)

    try {
      const response = await fetch('https://api.mailmodo.com/api/v1/addToList', {
        method: 'POST',
        headers: {
          'Accept': 'application/json, application/xml',
          'Content-Type': 'application/json',
          'mmApiKey': 'X52G8DM-H3V44NW-NYB7PZ1-XXCDNKS'
        },
        body: JSON.stringify({
          email: email,
          data: {
            first_name: currentUserData?.name || '',
            name: currentUserData?.name || '',
            age: currentUserData?.age || '',
            experience: currentUserData?.experience || '',
            profit_loss: currentUserData?.profitLoss || '',
            income: currentUserData?.income || '',
            bankroll_amount: currentUserData?.bankrollAmount || '',
            risk_tolerance: currentUserData?.riskTolerance || '',
            frequency: currentUserData?.frequency || '',
            goal: currentUserData?.goal || '',
            betting_style: currentUserData?.bettingStyle || '',
            recommended_bankroll: results?.bankroll || '',
            recommended_unit_percent: results?.unitPercent || '',
            recommended_unit_amount: results?.unitAmount || ''
          },
          listName: 'Bankroll Builder Free Members'
        })
      })

      if (response.ok) {
        setEmailSuccess(true)
        setEmail('')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send results')
      }
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        setEmailError('Network error. Please check your connection and try again.')
      } else if (error.message.includes('401')) {
        setEmailError('Service error. Please try again later.')
      } else {
        setEmailError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  useEffect(() => {
    if (results) {
      const bankrollEl = document.getElementById('bqBankroll')
      const unitEl = document.getElementById('bqUnit')

      if (bankrollEl) {
        animateValue(bankrollEl, 0, results.bankroll, '$', '')
      }
      if (unitEl) {
        animateValue(unitEl, 0, results.unitAmount, `${results.unitPercent}% ($`, ')')
      }
    }
  }, [results])

  return (
    <div className={styles.bankrollPage}>
      {/* Gradient Orbs Background */}
      <div className={styles.gradientOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
        <div className={styles.orb3}></div>
        <div className={styles.orb4}></div>
      </div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroHeader}>
            <span className={styles.heroLabel}>Free Sports Betting Builder</span>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleHighlight}>Bankroll Builder</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Get your personalized bankroll management strategy and optimal unit bet sizing for profitable sports betting!
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className={styles.formSection}>
        <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            {/* Question 1: Name */}
            <div className={`${styles.formCard} ${errors.name ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>1. What is your name?</div>
              <div className={styles.cardField}>
                <input
                  type="text"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
                {errors.name && <div className={styles.errorText}>Please enter your name</div>}
              </div>
            </div>

            {/* Question 2: Age */}
            <div className={`${styles.formCard} ${errors.age ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>2. How old are you?</div>
              <div className={styles.cardField}>
                <select
                  className={`${styles.select} ${errors.age ? styles.inputError : ''}`}
                  name="age"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  required
                >
                  <option value="">Select your age range</option>
                  <option value="18-21">18-21</option>
                  <option value="22-25">22-25</option>
                  <option value="26-34">26-34</option>
                  <option value="35-49">35-49</option>
                  <option value="50+">50+</option>
                </select>
                {errors.age && <div className={styles.errorText}>Please select your age range</div>}
              </div>
            </div>

            {/* Question 3: Experience */}
            <div className={`${styles.formCard} ${errors.experience ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>3. How much sports betting experience do you have?</div>
              <div className={styles.radioGroup}>
                {['Just starting', '1-6m', '6-1yr', '1-2yr', '2-5yr', '5+yr'].map((option) => (
                  <label key={option} className={styles.radioOption}>
                    <input
                      type="radio"
                      name="experience"
                      value={option}
                      checked={formData.experience === option}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      required
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.experience && <div className={styles.errorText}>Please select your experience level</div>}
            </div>

            {/* Question 4: Profit/Loss */}
            <div className={`${styles.formCard} ${errors.profitLoss ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>4. Are you at a profit or loss with sports betting?</div>
              <div className={styles.radioGroup}>
                {['Profit', 'Breakeven', 'Loss'].map((option) => (
                  <label key={option} className={styles.radioOption}>
                    <input
                      type="radio"
                      name="profitLoss"
                      value={option}
                      checked={formData.profitLoss === option}
                      onChange={(e) => handleInputChange('profitLoss', e.target.value)}
                      required
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.profitLoss && <div className={styles.errorText}>Please select your current status</div>}
            </div>

            {/* Question 5: Income */}
            <div className={`${styles.formCard} ${errors.income ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>5. What is your estimated monthly income?</div>
              <div className={styles.cardField}>
                <select
                  className={`${styles.select} ${errors.income ? styles.inputError : ''}`}
                  name="income"
                  value={formData.income}
                  onChange={(e) => handleInputChange('income', e.target.value)}
                  required
                >
                  <option value="">Select income range</option>
                  <option value="<1000">&lt;$1,000</option>
                  <option value="1000-2000">$1,000-$2,000</option>
                  <option value="2000-5000">$2,000-$5,000</option>
                  <option value="5000-10000">$5,000-$10,000</option>
                  <option value="10000+">$10,000+</option>
                </select>
                {errors.income && <div className={styles.errorText}>Please select your income range</div>}
              </div>
            </div>

            {/* Question 6: Bankroll Amount */}
            <div className={`${styles.formCard} ${errors.bankrollAmount ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>6. How much money would you set aside for sports betting?</div>
              <div className={styles.cardField}>
                <input
                  type="number"
                  className={`${styles.input} ${errors.bankrollAmount ? styles.inputError : ''}`}
                  name="bankrollAmount"
                  placeholder="Enter amount (e.g. 1000)"
                  min="50"
                  value={formData.bankrollAmount}
                  onChange={(e) => handleInputChange('bankrollAmount', e.target.value)}
                  required
                />
                {errors.bankrollAmount && <div className={styles.errorText}>Please enter an amount of at least $50</div>}
              </div>
            </div>

            {/* Question 7: Risk Tolerance */}
            <div className={`${styles.formCard} ${errors.riskTolerance ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>7. Rate your overall risk tolerance:</div>
              <div className={styles.cardSubtitle}>10 being very risky, 1 being not risky at all</div>
              <div className={styles.riskGroup}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <label key={num} className={styles.riskOption}>
                    <input
                      type="radio"
                      name="riskTolerance"
                      value={num.toString()}
                      checked={formData.riskTolerance === num.toString()}
                      onChange={(e) => handleInputChange('riskTolerance', e.target.value)}
                      required
                    />
                    <span>{num}</span>
                  </label>
                ))}
              </div>
              {errors.riskTolerance && <div className={styles.errorText}>Please select your risk tolerance</div>}
            </div>

            {/* Question 8: Frequency */}
            <div className={`${styles.formCard} ${errors.frequency ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>8. How often do you bet?</div>
              <div className={styles.radioGroup}>
                {['0-7-week', '1-4-day', '5-9-day', '10+-day'].map((option) => {
                  const labels: Record<string, string> = {
                    '0-7-week': '0 - 7 bets per week',
                    '1-4-day': '1 - 4 bets per day',
                    '5-9-day': '5 - 9 bets per day',
                    '10+-day': '10+ bets per day'
                  }
                  return (
                    <label key={option} className={styles.radioOption}>
                      <input
                        type="radio"
                        name="frequency"
                        value={option}
                        checked={formData.frequency === option}
                        onChange={(e) => handleInputChange('frequency', e.target.value)}
                        required
                      />
                      <span>{labels[option]}</span>
                    </label>
                  )
                })}
              </div>
              {errors.frequency && <div className={styles.errorText}>Please select your betting frequency</div>}
            </div>

            {/* Question 9: Goal */}
            <div className={`${styles.formCard} ${errors.goal ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>9. What is your primary goal with sports betting?</div>
              <div className={styles.radioGroup}>
                {['Fun', 'Profit', 'Both'].map((option) => (
                  <label key={option} className={styles.radioOption}>
                    <input
                      type="radio"
                      name="goal"
                      value={option}
                      checked={formData.goal === option}
                      onChange={(e) => handleInputChange('goal', e.target.value)}
                      required
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.goal && <div className={styles.errorText}>Please select your primary goal</div>}
            </div>

            {/* Question 10: Betting Style */}
            <div className={`${styles.formCard} ${errors.bettingStyle ? styles.cardError : ''}`}>
              <div className={styles.cardNumber}>10. What is your preferred betting style?</div>
              <div className={styles.radioGroup}>
                {['Straight Bets', 'Parlays', 'Live Bets', 'Arbitrage'].map((option) => (
                  <label key={option} className={styles.radioOption}>
                    <input
                      type="radio"
                      name="bettingStyle"
                      value={option}
                      checked={formData.bettingStyle === option}
                      onChange={(e) => handleInputChange('bettingStyle', e.target.value)}
                      required
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.bettingStyle && <div className={styles.errorText}>Please select your betting style</div>}
            </div>
          </div>

          <div className={styles.submitSection}>
            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? 'Calculating...' : 'Calculate My Bankroll Strategy'}
            </button>
            {isLoading && (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <span>Calculating your personalized bankroll management strategy...</span>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* Results Section */}
      {results && (
        <section ref={resultsRef} className={styles.resultsSection}>
          <div className={styles.resultsCard}>
            <SplitText
              text="Your Personalized Bankroll Management Strategy"
              className={styles.resultsTitle}
              tag="h2"
              delay={50}
              duration={0.8}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.2}
              rootMargin="-100px"
              textAlign="center"
            />

            <div className={styles.resultsGrid}>
              <div className={styles.resultItem}>
                <div className={styles.resultLabel}>Recommended Bankroll</div>
                <div className={styles.resultValue} id="bqBankroll">$0</div>
                <div className={styles.resultComparison}>
                  {getComparison(results.bankroll, results.unitPercent).bankrollComp}
                </div>
              </div>
              <div className={styles.resultItem}>
                <div className={styles.resultLabel}>Recommended Unit Bet Size</div>
                <div className={styles.resultValue} id="bqUnit">0% ($0)</div>
                <div className={styles.resultComparison}>
                  {getComparison(results.bankroll, results.unitPercent).unitComp}
                </div>
              </div>
            </div>

            <div className={styles.resultDescription}>
              {bankrollDescriptions[getBankrollRange(results.bankroll)]}
            </div>
            <div className={styles.resultDescription}>
              {unitDescriptions[getUnitRange(results.unitPercent)]}
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Your 1-Year ROI Projection at 55% Win Rate</div>
              <div className={styles.roiGraph}>
                <svg
                  ref={roiGraphRef}
                  className={styles.graphSvg}
                  viewBox="0 0 800 300"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Graph will be drawn here */}
                </svg>
              </div>
              <div className={styles.roiStats}>
                <div className={styles.roiStat}>
                  <div className={styles.roiStatLabel}>Starting Bankroll</div>
                  <div className={styles.roiStatValue} id="startBankroll">$0</div>
                </div>
                <div className={styles.roiStat}>
                  <div className={styles.roiStatLabel}>Projected End Balance</div>
                  <div className={styles.roiStatValue} id="endBankroll">$0</div>
                </div>
                <div className={styles.roiStat}>
                  <div className={styles.roiStatLabel}>Total ROI</div>
                  <div className={styles.roiStatValue} id="totalROI">0%</div>
                </div>
              </div>
            </div>

            <div className={styles.emailCard}>
              <div className={styles.emailTitle}>Get Your Complete Bankroll Management Guide</div>
              <div className={styles.emailSubtitle}>We'll email you a detailed bankroll strategy report with advanced tips!</div>
              <div className={styles.emailForm}>
                <input
                  type="email"
                  className={styles.emailInput}
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError('')
                    setEmailSuccess(false)
                  }}
                  required
                />
                <button
                  type="button"
                  className={styles.emailButton}
                  onClick={handleEmailSubmit}
                  disabled={isSubmittingEmail}
                >
                  {isSubmittingEmail ? 'Sending...' : 'Send Bankroll Guide'}
                </button>
              </div>
              {emailError && <div className={styles.emailError}>{emailError}</div>}
              {emailSuccess && (
                <div className={styles.emailSuccess}>
                  ✅ Bankroll management guide sent! Check your email for your complete strategy.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SEO Content Section */}
      <section className={styles.seoSection}>
        <div className={styles.seoContent}>
          <h2>Master Your Sports Betting Bankroll Management</h2>
          <p>
            Smart <strong>bankroll management</strong> is what separates successful sports bettors from those who lose money. Our <strong>bankroll builder</strong> uses proven mathematical models to help you:
          </p>

          <h3>Essential Bankroll Management Principles:</h3>
          <ul>
            <li><strong>Unit bet consistency</strong> - Never bet more than your calculated unit size</li>
            <li><strong>Bankroll preservation</strong> - Protect your capital during losing streaks</li>
            <li><strong>Growth optimization</strong> - Scale your bets as your bankroll grows</li>
            <li><strong>Risk management</strong> - Match your bet sizes to your risk tolerance</li>
            <li><strong>Long-term perspective</strong> - Focus on sustainable profits over quick wins</li>
          </ul>

          <h3>How Our Bankroll Builder Works</h3>
          <p>
            Our advanced <strong>unit bet builder</strong> analyzes multiple factors including your experience level, betting frequency, risk tolerance, and financial situation to recommend optimal bankroll and unit sizes. The builder uses Kelly Criterion principles combined with conservative adjustment factors to ensure long-term sustainability.
          </p>

          <p>
            Whether you're new to sports betting or a seasoned bettor looking to optimize your strategy, our free <strong>bankroll management sports betting</strong> builder provides the foundation for profitable betting.
          </p>
        </div>
      </section>
    </div>
  )
}

