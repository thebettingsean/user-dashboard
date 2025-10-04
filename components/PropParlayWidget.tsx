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
    <div style={styles.widget}>
      <div style={styles.header}>
        <div style={styles.iconBox}>
          <img 
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e144f04701a7e18985bc19_TICKET-5.svg" 
            alt="Prop" 
            style={styles.icon}
          />
        </div>
        <div>
          <h3 style={styles.title}>Prop Parlay Tool</h3>
          <p style={styles.subtitle}>100% hit rate props</p>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : (
        <>
          <div style={styles.propsList}>
            {topProps.map((prop: any, i: number) => {
              const percentAbove = ((prop.season_avg - prop.line) / prop.line * 100).toFixed(0)
              const bestOdds = Math.max(...prop.bookmakers.map((b: any) => b.odds))
              
              return (
                <div key={i} style={styles.propItem}>
                  <div style={styles.propPlayer}>{prop.player}</div>
                  <div style={styles.propDetails}>
                    <span style={styles.propLine}>{formatMarket(prop.market)} O{prop.line}</span>
                    <span style={styles.propOdds}>{formatOdds(bestOdds)}</span>
                  </div>
                  <div style={styles.propEdge}>+{percentAbove}%</div>
                </div>
              )
            })}
          </div>

          <a href="/prop-parlay-tool" style={styles.viewAll}>
            Build Parlays →
          </a>
        </>
      )}
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

const styles = {
  widget: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(94,23,235,0.3)',
    borderRadius: '12px',
    padding: '1.5rem',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconBox: {
    background: 'linear-gradient(135deg, #5E17EB, #4A12BC)',
    borderRadius: '10px',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    width: '28px',
    height: '28px',
    filter: 'brightness(1.2)'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '0.15rem',
    color: 'white'
  },
  subtitle: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  propsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    flex: 1
  },
  propItem: {
    background: 'rgba(94,23,235,0.08)',
    border: '1px solid rgba(94,23,235,0.2)',
    borderRadius: '8px',
    padding: '0.75rem',
    transition: 'all 0.2s'
  },
  propPlayer: {
    fontSize: '0.9rem',
    fontWeight: '700',
    marginBottom: '0.35rem',
    color: 'white'
  },
  propDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
    marginBottom: '0.25rem'
  },
  propLine: {
    color: '#9ca3af'
  },
  propOdds: {
    color: 'white',
    fontWeight: '600'
  },
  propEdge: {
    fontSize: '0.75rem',
    color: '#5E17EB',
    fontWeight: '700'
  },
  viewAll: {
    display: 'block',
    textAlign: 'center' as const,
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #5E17EB, #4A12BC)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  loading: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: '#9ca3af',
    fontSize: '0.9rem'
  }
}