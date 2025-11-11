'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import styles from './roi-calculator.module.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface WeeklyData {
  week: number
  startBankroll: number
  betSize: number
  profit: number
  endBankroll: number
  totalROI: number
}

export default function ROICalculator() {
  const [bankroll, setBankroll] = useState(500)
  const [unitSize, setUnitSize] = useState(1.5)
  const [unitsPerDay, setUnitsPerDay] = useState(4.28)
  const [avgOdds, setAvgOdds] = useState(-115)
  const [winRate, setWinRate] = useState(55)
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [chartData, setChartData] = useState<any>(null)
  const [riskMetrics, setRiskMetrics] = useState({
    breakEvenRate: 0,
    edge: 0,
    kellySuggestion: 0,
    currentUnit: 0
  })
  const [summaryData, setSummaryData] = useState({
    weekly: { profit: 0, roi: 0 },
    fourWeek: { profit: 0, roi: 0 },
    twelveWeek: { profit: 0, roi: 0 },
    year: { profit: 0, roi: 0 }
  })

  const cardsRef = useRef<HTMLDivElement>(null)
  const inputSectionRef = useRef<HTMLElement>(null)
  const progressSectionRef = useRef<HTMLElement>(null)
  const chartSectionRef = useRef<HTMLElement>(null)

  const americanToDecimal = (odds: number): number => {
    if (odds < 0) {
      return 100 / Math.abs(odds)
    } else {
      return odds / 100
    }
  }

  useEffect(() => {
    calculate()
  }, [bankroll, unitSize, unitsPerDay, avgOdds, winRate])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add(styles.animate)
              observer.unobserve(entry.target)
            }, index * 100)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const cards = cardsRef.current?.querySelectorAll(`.${styles.metricCard}`)
    cards?.forEach((card, index) => {
      observer.observe(card)
    })

    // Don't observe inputSection - it should always be visible
    if (progressSectionRef.current) observer.observe(progressSectionRef.current)
    if (chartSectionRef.current) observer.observe(chartSectionRef.current)

    return () => {
      cards?.forEach(card => observer.unobserve(card))
      if (progressSectionRef.current) observer.unobserve(progressSectionRef.current)
      if (chartSectionRef.current) observer.unobserve(chartSectionRef.current)
    }
  }, [])

  const calculate = () => {
    const startingBankroll = bankroll
    const unitSizePercent = unitSize / 100
    const winRatePercent = winRate / 100
    const betsPerWeek = unitsPerDay * 7
    const winsPerWeek = betsPerWeek * winRatePercent
    const lossesPerWeek = betsPerWeek * (1 - winRatePercent)
    const decimalPayout = americanToDecimal(avgOdds)

    // Calculate break-even and edge
    const breakEvenRate = 1 / (1 + decimalPayout)
    const edge = winRatePercent - breakEvenRate

    // Calculate Kelly Criterion
    const p = winRatePercent
    const q = 1 - winRatePercent
    const b = decimalPayout
    const kellyPercentage = ((p * (b + 1) - 1) / b) * 100

    setRiskMetrics({
      breakEvenRate: breakEvenRate * 100,
      edge: edge * 100,
      kellySuggestion: Math.max(0, kellyPercentage),
      currentUnit: unitSize
    })

    // Calculate progression
    let currentBankroll = startingBankroll
    const weeklyResults: WeeklyData[] = []
    const chartLabels: string[] = []
    const chartValues: number[] = []

    for (let week = 1; week <= 52; week++) {
      const betSize = currentBankroll * unitSizePercent
      const weekProfit = (winsPerWeek * betSize * decimalPayout) - (lossesPerWeek * betSize)
      const startBankroll = currentBankroll
      currentBankroll += weekProfit

      weeklyResults.push({
        week,
        startBankroll,
        betSize,
        profit: weekProfit,
        endBankroll: currentBankroll,
        totalROI: ((currentBankroll - startingBankroll) / startingBankroll) * 100
      })

      chartLabels.push(`Week ${week}`)
      chartValues.push(currentBankroll)
    }

    setWeeklyData(weeklyResults)

    // Update summary data
    setSummaryData({
      weekly: {
        profit: weeklyResults[0].profit,
        roi: (weeklyResults[0].profit / startingBankroll) * 100
      },
      fourWeek: {
        profit: weeklyResults[3].endBankroll - startingBankroll,
        roi: weeklyResults[3].totalROI
      },
      twelveWeek: {
        profit: weeklyResults[11].endBankroll - startingBankroll,
        roi: weeklyResults[11].totalROI
      },
      year: {
        profit: weeklyResults[51].endBankroll - startingBankroll,
        roi: weeklyResults[51].totalROI
      }
    })

    // Update chart data
    setChartData({
      labels: chartLabels,
      datasets: [{
        label: 'Bankroll Growth',
        data: chartValues,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#60a5fa',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }]
    })
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#60a5fa',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(96, 165, 250, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return 'Bankroll: $' + context.parsed.y.toFixed(2)
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45,
          callback: function(value: any, index: number) {
            // Show every 4th week label
            return index % 4 === 0 ? `Week ${index + 1}` : ''
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return '$' + value.toFixed(0)
          }
        }
      }
    }
  }

  return (
    <div className={styles.calculatorGrid}>
      {/* Input Section */}
      <section ref={inputSectionRef} className={styles.inputSection}>
        <h2 className={styles.sectionTitle}>Investment Parameters</h2>
        <div className={styles.inputGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="bankroll">Starting Bankroll</label>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                id="bankroll"
                className={styles.inputField}
                value={bankroll}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setBankroll(0);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setBankroll(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || parseFloat(e.target.value) < 100) {
                    setBankroll(500);
                  }
                }}
                min="100"
                step="100"
              />
              <span className={styles.inputSuffix}>$</span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="unitSize">Unit Size</label>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                id="unitSize"
                className={styles.inputField}
                value={unitSize}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setUnitSize(0);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setUnitSize(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || parseFloat(e.target.value) < 0.5) {
                    setUnitSize(1.5);
                  }
                }}
                min="0.5"
                max="5"
                step="0.1"
              />
              <span className={styles.inputSuffix}>%</span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="unitsPerDay">Units at Risk Per Day</label>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                id="unitsPerDay"
                className={styles.inputField}
                value={unitsPerDay}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setUnitsPerDay(0);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setUnitsPerDay(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || parseFloat(e.target.value) < 1) {
                    setUnitsPerDay(4.28);
                  }
                }}
                min="1"
                max="20"
                step="0.1"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="avgOdds">Average Odds</label>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                id="avgOdds"
                className={styles.inputField}
                value={avgOdds}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setAvgOdds(0);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setAvgOdds(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setAvgOdds(-115);
                  }
                }}
                step="5"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="winRate">Win Rate</label>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                id="winRate"
                className={styles.inputField}
                value={winRate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setWinRate(0);
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setWinRate(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || parseFloat(e.target.value) < 40) {
                    setWinRate(55);
                  }
                }}
                min="40"
                max="70"
                step="0.5"
              />
              <span className={styles.inputSuffix}>%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Results and Chart Grid */}
      <div className={styles.resultsChartGrid}>
        <div ref={cardsRef} className={styles.resultsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Weekly Profit</div>
            <div className={styles.metricValue}>${summaryData.weekly.profit.toFixed(2)}</div>
            <div className={styles.metricChange}>
              <span>+</span><span>{summaryData.weekly.roi.toFixed(2)}%</span> ROI
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>4-Week Profit</div>
            <div className={styles.metricValue}>${summaryData.fourWeek.profit.toFixed(2)}</div>
            <div className={styles.metricChange}>
              <span>+</span><span>{summaryData.fourWeek.roi.toFixed(2)}%</span> ROI
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>12-Week Profit</div>
            <div className={styles.metricValue}>${summaryData.twelveWeek.profit.toFixed(2)}</div>
            <div className={styles.metricChange}>
              <span>+</span><span>{summaryData.twelveWeek.roi.toFixed(2)}%</span> ROI
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>1-Year Profit</div>
            <div className={styles.metricValue}>${summaryData.year.profit.toFixed(2)}</div>
            <div className={styles.metricChange}>
              <span>+</span><span>{summaryData.year.roi.toFixed(2)}%</span> ROI
            </div>
          </div>
        </div>

        <section ref={chartSectionRef} className={styles.chartSection}>
          <h2 className={styles.sectionTitle}>Bankroll Growth Over Time</h2>
          <div className={styles.chartContainer}>
            {chartData && <Line data={chartData} options={chartOptions} />}
          </div>
        </section>
      </div>

      {/* Progress Section */}
      <section ref={progressSectionRef} className={styles.progressSection}>
        <h2 className={styles.sectionTitle}>Weekly Progression</h2>
        <div className={styles.progressTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Week</th>
                <th>Starting Bankroll</th>
                <th>Bet Size</th>
                <th>Weekly Profit</th>
                <th>Ending Bankroll</th>
                <th>Total ROI</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData.slice(0, 8).map((week) => (
                <tr key={week.week}>
                  <td>Week {week.week}</td>
                  <td>${week.startBankroll.toFixed(2)}</td>
                  <td>${week.betSize.toFixed(2)}</td>
                  <td className={styles.positive}>+${week.profit.toFixed(2)}</td>
                  <td>${week.endBankroll.toFixed(2)}</td>
                  <td className={styles.positive}>+{week.totalROI.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.riskMetrics}>
          <h3 className={styles.riskTitle}>Risk Analysis</h3>
          <div className={styles.riskItem}>
            <span className={styles.riskLabel}>Break-even Win Rate</span>
            <span className={styles.riskValue}>{riskMetrics.breakEvenRate.toFixed(2)}%</span>
          </div>
          <div className={styles.riskItem}>
            <span className={styles.riskLabel}>Edge Over Break-even</span>
            <span className={styles.riskValue}>{riskMetrics.edge.toFixed(2)}%</span>
          </div>
          <div className={styles.riskItem}>
            <span className={styles.riskLabel}>Kelly Criterion Suggestion</span>
            <span className={styles.riskValue}>{riskMetrics.kellySuggestion.toFixed(2)}%</span>
          </div>
          <div className={styles.riskItem}>
            <span className={styles.riskLabel}>Your Unit Size</span>
            <span className={styles.riskValue}>{riskMetrics.currentUnit}%</span>
          </div>
        </div>
      </section>
    </div>
  )
}

