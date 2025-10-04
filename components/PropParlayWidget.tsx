'use client'

import { useState, useEffect } from 'react'

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

  const topProps = data?.props?.slice(0, 3) || []

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e144f04701a7e18985bc19_TICKET-5.svg" 
          alt="Prop" 
          style={{ width: '36px', height: '36px' }}
        />
      </div>
      
      <h2 style={titleStyle}>Prop Parlay Tool</h2>
      <p style={taglineStyle}>100% hit rate props</p>
      
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Loading...</div>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {topProps.map((prop: any, i: number) => {
            const percentAbove = ((prop.season_avg - prop.line) / prop.line * 100).toFixed(0)
            const bestOdds = Math.max(...prop.bookmakers.map((b: any) => b.odds))
            
            return (
              <div key={i} style={sectionStyle}>
                <h4 style={sectionTitle}>{prop.player}</h4>
                <p style={{ fontSize: '0.75rem', lineHeight: '1.4', opacity: 0.8 }}>
                  {formatMarket(prop.market)} O{prop.line} • {formatOdds(bestOdds)} • +{percentAbove}% above
                </p>
              </div>
            )
          })}
        </div>
      )}
      
      <a href="/prop-parlay-tool" style={viewAllStyle}>
        build parlays →
      </a>
    </div>
  )
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

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(94, 23, 235, 0.12) 0%, rgba(94, 23, 235, 0.04) 100%)',
  border: '1px solid rgba(94, 23, 235, 0.2)',
  borderRadius: '16px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '48px',
  height: '48px',
  border: '1px solid rgba(94, 23, 235, 0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(94, 23, 235, 0.05)',
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
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  textDecoration: 'none'
}