'use client'

import { useState, useEffect, useMemo } from 'react'

export default function PropParlayWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('https://nfl-alt-prop-tool-database-production.up.railway.app')
      const json = await res.json()
      setData(json)
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const topSGP = useMemo(() => {
    if (!data?.props) return null

    // Deduplicate props (one line per player per market type)
    const deduplicatedProps = deduplicatePlayerProps(data.props)

    // Group props by game
    const byGame: Record<string, any[]> = {}
    deduplicatedProps.forEach((prop: any) => {
      const game = formatTeamNames(prop.game)
      if (!byGame[game]) byGame[game] = []
      byGame[game].push({...prop, game})
    })

    // Generate all 3-leg SGP combinations
    const allSGPs: any[] = []
    Object.entries(byGame).forEach(([game, props]) => {
      if (props.length >= 3) {
        const combos = generateCombos(props, 3)
        combos.forEach(legs => {
          const totalOdds = calculateParlayOdds(legs)
          allSGPs.push({ game, legs, totalOdds })
        })
      }
    })

    // Return the highest odds SGP
    if (allSGPs.length === 0) return null
    return allSGPs.sort((a, b) => b.totalOdds - a.totalOdds)[0]
  }, [data])

  function deduplicatePlayerProps(props: any[]) {
    const playerMarketMap: Record<string, any> = {}
    
    props.forEach(prop => {
      const marketType = prop.market.toLowerCase()
      const key = `${prop.player}-${marketType}`
      
      if (!playerMarketMap[key]) {
        playerMarketMap[key] = prop
      } else {
        const existingBestOdds = Math.max(...playerMarketMap[key].bookmakers.map((b: any) => b.odds))
        const newBestOdds = Math.max(...prop.bookmakers.map((b: any) => b.odds))
        
        if (newBestOdds > existingBestOdds) {
          playerMarketMap[key] = prop
        }
      }
    })
    
    return Object.values(playerMarketMap)
  }

  function generateCombos(arr: any[], size: number) {
    const result: any[] = []
    const f = (prefix: any[], arr: any[]) => {
      for (let i = 0; i < arr.length; i++) {
        const newPrefix = [...prefix, arr[i]]
        if (newPrefix.length === size) {
          result.push(newPrefix)
        } else {
          f(newPrefix, arr.slice(i + 1))
        }
      }
    }
    f([], arr)
    return result.slice(0, 100) // Limit to avoid performance issues
  }

  function calculateParlayOdds(legs: any[]) {
    const decimalOdds = legs.map(leg => {
      const bestOdds = Math.max(...leg.bookmakers.map((b: any) => b.odds))
      return bestOdds < 0 ? (100 / Math.abs(bestOdds)) + 1 : (bestOdds / 100) + 1
    })
    const combined = decimalOdds.reduce((acc, odd) => acc * odd, 1)
    const american = combined >= 2 ? Math.round((combined - 1) * 100) : Math.round(-100 / (combined - 1))
    return american
  }

  function formatTeamNames(matchup: string) {
    return matchup.replace(/Minnesota |Cleveland |Houston |Baltimore |Miami |Carolina |Dallas |New York |Denver |Philadelphia |Las Vegas |Indianapolis |Tennessee |Arizona |Tampa Bay |Seattle |Detroit |Cincinnati |Washington |Los Angeles |New England |Buffalo |Kansas City |Jacksonville |San Francisco |Green Bay |Chicago |Pittsburgh |Atlanta |New Orleans /g, '')
  }

  function formatOdds(odds: number) {
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  function formatMarket(market: string) {
    return market
      .replace('Player ', '')
      .replace(' Alternate', '')
      .replace('Reception Yds', 'Rec Yds')
      .replace('Receptions', 'Rec')
      .replace('Rush Yds', 'Rush')
      .replace('Pass Tds', 'Pass TD')
  }

  return (
    <a href="/prop-parlay-tool" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', color: 'inherit' }}>
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <img 
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e144f04701a7e18985bc19_TICKET-5.svg" 
            alt="Prop" 
            style={{ width: '36px', height: '36px' }}
          />
        </div>
        
        <h2 style={titleStyle}>Perfect Prop Parlays</h2>
        <p style={taglineStyle}>100% hit rate props</p>
        
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Loading...</div>
          </div>
        ) : !topSGP ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>No parlays available</div>
          </div>
        ) : (
          <div style={{ flex: 1, paddingBottom: '1rem' }}>
            <div style={sgpHeaderStyle}>
              <div style={sgpBadge}>TOP SGP</div>
              <div style={sgpGame}>{topSGP.game}</div>
              <div style={sgpOdds}>{formatOdds(topSGP.totalOdds)}</div>
            </div>

            {topSGP.legs.map((leg: any, i: number) => {
              const bestOdds = Math.max(...leg.bookmakers.map((b: any) => b.odds))
              const isLast = i === topSGP.legs.length - 1
              
              return (
                <div key={i} style={{...sectionStyle, ...(isLast ? {borderBottom: 'none', paddingBottom: '0'} : {})}}>
                  <h4 style={sectionTitle}>LEG {i + 1}: {leg.player}</h4>
                  <p style={{ fontSize: '0.75rem', lineHeight: '1.4', opacity: 0.8 }}>
                    {formatMarket(leg.market)} O{leg.line} • {formatOdds(bestOdds)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </a>
  )
}

const widgetStyle = {
  // PROPER GLASSMORPHISM:
  background: 'rgba(255, 255, 255, 0.05)', // Only 5% fill opacity
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.18)', // Thin bright border
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: `
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
  `,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(94, 23, 235, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(94, 23, 235, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(94, 23, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  zIndex: 2
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '0.25rem',
  color: '#fff'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const sgpHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(255,255,255,0.1)'
}

const sgpBadge = {
  background: 'rgba(94, 23, 235, 0.3)',
  color: '#fff',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700',
  letterSpacing: '0.05em'
}

const sgpGame = {
  flex: 1,
  fontSize: '0.75rem',
  color: '#9ca3af'
}

const sgpOdds = {
  fontSize: '1.1rem',
  fontWeight: '800',
  color: '#fff'
}

const sectionStyle = {
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(255,255,255,0.05)'
}

const sectionTitle = {
  fontSize: '0.7rem',
  textTransform: 'uppercase' as const,
  opacity: 0.5,
  marginBottom: '0.5rem',
  letterSpacing: '0.05em'
}

const viewAllStyle = {
  position: 'absolute' as const,
  bottom: '1.5rem',
  right: '1.5rem',
  left: '1.5rem',
  textAlign: 'center' as const,
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  fontWeight: '600',
  textDecoration: 'none'
}