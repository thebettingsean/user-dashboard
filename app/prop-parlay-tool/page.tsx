'use client'

import React, { useState, useEffect, useMemo } from 'react'

export default function PropParlayTool() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'props' | 'parlays'>('props')
  const [filters, setFilters] = useState({
    legs: 2,
    minOdds: -600,
    book: 'all',
    parlayType: 'all',
    search: '',
    game: 'all'
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
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

  const games = useMemo(() => {
    if (!data?.games) return []
    return data.games
  }, [data])

  const bookmakers = useMemo(() => {
    if (!data?.props) return []
    const books = new Set<string>()
    data.props.forEach((prop: any) => {
      prop.bookmakers.forEach((b: any) => books.add(b.name))
    })
    return Array.from(books).sort()
  }, [data])

  const filteredProps = useMemo(() => {
    if (!data?.props) return []
    
    let props = data.props

    if (filters.search) {
      const query = filters.search.toLowerCase()
      props = props.filter((p: any) => 
        p.player.toLowerCase().includes(query) ||
        p.game.toLowerCase().includes(query)
      )
    }

    if (filters.game !== 'all') {
      props = props.filter((p: any) => p.game === filters.game)
    }

    if (filters.book !== 'all') {
      props = props.filter((p: any) => 
        p.bookmakers.some((b: any) => b.name === filters.book)
      )
    }

    const threshold = parseInt(filters.minOdds as any)
    props = props.filter((p: any) => {
      const bestOdds = Math.max(...p.bookmakers.map((b: any) => b.odds))
      return bestOdds >= threshold
    })

    return props
  }, [data, filters])

  const parlayCombo = useMemo(() => {
    if (!filteredProps.length) return []
    
    const numLegs = filters.legs
    const isSGP = filters.parlayType === 'sgp'
    const isStandard = filters.parlayType === 'standard'

    const byGame: Record<string, any[]> = {}
    filteredProps.forEach((prop: any) => {
      if (!byGame[prop.game]) byGame[prop.game] = []
      byGame[prop.game].push(prop)
    })

    const combos: any[] = []

    if (!isStandard) {
      Object.entries(byGame).forEach(([game, props]) => {
        if (props.length >= numLegs) {
          generateCombos(props, numLegs).forEach(combo => {
            combos.push({ game, legs: combo, type: 'SGP' })
          })
        }
      })
    }

    if (!isSGP && filteredProps.length >= numLegs) {
      generateCombos(filteredProps, numLegs).forEach(combo => {
        const uniqueGames = new Set(combo.map((l: any) => l.game))
        if (uniqueGames.size > 1) {
          combos.push({ 
            game: Array.from(uniqueGames).slice(0, 2).join(' + '), 
            legs: combo, 
            type: 'Standard' 
          })
        }
      })
    }

    return combos.map(combo => {
      const totalOdds = calculateParlayOdds(combo.legs)
      const avgPercentAbove = combo.legs.reduce((sum: number, leg: any) => 
        sum + ((leg.season_avg - leg.line) / leg.line * 100), 0
      ) / combo.legs.length
      return { ...combo, totalOdds, avgPercentAbove }
    }).sort((a, b) => b.totalOdds - a.totalOdds).slice(0, 50)
  }, [filteredProps, filters.legs, filters.parlayType])

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
    return result.slice(0, 200)
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

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p style={{ marginTop: '1rem', fontSize: '1rem', opacity: 0.8 }}>Loading alt props...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Prop Parlay Tool</h1>
            <p style={styles.subtitle}>100% Hit Rate Props • 20%+ Above Line This Season</p>
          </div>
          <div style={styles.headerStats}>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Total Props</div>
              <div style={styles.statValue}>{data?.props?.length || 0}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Games</div>
              <div style={styles.statValue}>{games.length}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Last Updated</div>
              <div style={styles.statValue}>{data?.last_updated_formatted || '-'}</div>
            </div>
          </div>
        </div>

        <div style={styles.viewToggle}>
          <button 
            style={{...styles.toggleBtn, ...(view === 'props' ? styles.toggleBtnActive : {})}}
            onClick={() => setView('props')}
          >
            Individual Props
          </button>
          <button 
            style={{...styles.toggleBtn, ...(view === 'parlays' ? styles.toggleBtnActive : {})}}
            onClick={() => setView('parlays')}
          >
            Parlay Builder
          </button>
        </div>

        <div style={styles.filters}>
          <input 
            type="search"
            placeholder="Search player or game..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            style={styles.searchLarge}
          />

          {view === 'parlays' && (
            <>
              <select 
                value={filters.legs} 
                onChange={(e) => setFilters({...filters, legs: parseInt(e.target.value)})}
                style={styles.filterSelect}
              >
                <option value="2">2-Leg Parlay</option>
                <option value="3">3-Leg Parlay</option>
                <option value="4">4-Leg Parlay</option>
                <option value="5">5-Leg Parlay</option>
                <option value="6">6-Leg Parlay</option>
              </select>

              <select 
                value={filters.parlayType} 
                onChange={(e) => setFilters({...filters, parlayType: e.target.value})}
                style={styles.filterSelect}
              >
                <option value="all">All Parlay Types</option>
                <option value="sgp">Same Game Only</option>
                <option value="standard">Multi-Game Only</option>
              </select>
            </>
          )}

          <select 
            value={filters.game} 
            onChange={(e) => setFilters({...filters, game: e.target.value})}
            style={styles.filterSelect}
          >
            <option value="all">All Games</option>
            {games.map((g: any, i: number) => (
              <option key={i} value={g.matchup}>{g.matchup}</option>
            ))}
          </select>

          <select 
            value={filters.minOdds} 
            onChange={(e) => setFilters({...filters, minOdds: parseInt(e.target.value)})}
            style={styles.filterSelect}
          >
            <option value="-600">All Odds (-600 to -150)</option>
            <option value="-150">-150 or better</option>
            <option value="-200">-200 or better</option>
            <option value="-300">-300 or better</option>
            <option value="-400">-400 or better</option>
          </select>

          <select 
            value={filters.book} 
            onChange={(e) => setFilters({...filters, book: e.target.value})}
            style={styles.filterSelect}
          >
            <option value="all">All Sportsbooks</option>
            {bookmakers.map(book => (
              <option key={book} value={book}>{formatBookName(book)}</option>
            ))}
          </select>
        </div>

        {view === 'props' ? (
          <PropsGrid props={filteredProps} filters={filters} />
        ) : (
          <ParlaysGrid combos={parlayCombo} filters={filters} />
        )}
      </div>
    </div>
  )
}

function PropsGrid({ props, filters }: { props: any[], filters: any }) {
  if (!props.length) {
    return <div style={styles.empty}>No props match your filters</div>
  }

  return (
    <div style={styles.grid}>
      {props.map((prop, idx) => (
        <PropCard key={idx} prop={prop} filters={filters} />
      ))}
    </div>
  )
}

function PropCard({ prop, filters }: { prop: any, filters: any }) {
  const bookFilter = filters.book !== 'all' ? filters.book : null
  const bookmakers = bookFilter 
    ? prop.bookmakers.filter((b: any) => b.name === bookFilter)
    : prop.bookmakers
  
  const bestOdds = Math.max(...bookmakers.map((b: any) => b.odds))
  const percentAbove = ((prop.season_avg - prop.line) / prop.line * 100).toFixed(0)

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.playerInfo}>
          <div style={styles.playerName}>{prop.player}</div>
          <div style={styles.gameInfoText}>{prop.game}</div>
          <div style={styles.timeText}>{prop.game_time}</div>
        </div>
        <div style={styles.edgeBadge}>
          <div style={styles.edgeValue}>+{percentAbove}%</div>
          <div style={styles.edgeText}>above line</div>
        </div>
      </div>

      <div style={styles.propLine}>
        <div>
          <div style={styles.marketLabel}>{formatMarket(prop.market)}</div>
          <div style={styles.lineValue}>Over {prop.line}</div>
        </div>
        <div style={styles.bestOdds}>{formatOdds(bestOdds)}</div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={styles.statBoxLabel}>Season Avg</div>
          <div style={styles.statBoxValue}>{prop.season_avg}</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statBoxLabel}>Hit Rate</div>
          <div style={styles.statBoxValue}>100%</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statBoxLabel}>Books</div>
          <div style={styles.statBoxValue}>{bookmakers.length}</div>
        </div>
      </div>

      <div style={styles.weeklyValues}>
        <div style={styles.weeklyLabel}>Weekly: </div>
        {prop.weekly_values.map((val: number, i: number) => (
          <div key={i} style={styles.weeklyValue}>{val}</div>
        ))}
      </div>

      <details style={styles.booksDetails}>
        <summary style={styles.booksSummary}>
          View all {bookmakers.length} book{bookmakers.length > 1 ? 's' : ''}
        </summary>
        <div style={styles.booksList}>
          {bookmakers.map((book: any, i: number) => (
            <div key={i} style={styles.bookItem}>
              <span style={styles.bookNameText}>{formatBookName(book.name)}</span>
              <span style={styles.bookOddsText}>{formatOdds(book.odds)}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

function ParlaysGrid({ combos, filters }: { combos: any[], filters: any }) {
  if (!combos.length) {
    return (
      <div style={styles.empty}>
        No {filters.parlayType === 'sgp' ? 'same game' : filters.parlayType === 'standard' ? 'multi-game' : ''} 
        {' '}parlays available with current filters. Try adjusting your filters.
      </div>
    )
  }

  return (
    <div>
      <div style={styles.parlayHeader}>
        <h2 style={styles.parlayTitle}>Top {filters.legs}-Leg Parlay Combinations</h2>
        <div style={styles.parlayCount}>{combos.length} combinations found</div>
      </div>
      <div style={styles.parlayGrid}>
        {combos.map((combo, idx) => (
          <ParlayCard key={idx} combo={combo} rank={idx + 1} />
        ))}
      </div>
    </div>
  )
}

function ParlayCard({ combo, rank }: { combo: any, rank: number }) {
  return (
    <div style={styles.parlayCard}>
      <div style={styles.parlayCardHeader}>
        <div style={styles.rankCircle}>#{rank}</div>
        <div style={styles.parlayMeta}>
          <div style={styles.parlayTypeLabel}>
            {combo.type} • {combo.legs.length}-Leg Parlay
          </div>
          <div style={styles.parlayGameText}>{combo.game}</div>
        </div>
        <div style={styles.parlayOddsDisplay}>
          <div style={styles.parlayOddsLabel}>Total Odds</div>
          <div style={styles.parlayOddsValue}>{formatOdds(combo.totalOdds)}</div>
        </div>
      </div>

      <div style={styles.parlayStats}>
        <div style={styles.parlayStat}>
          <span style={styles.parlayStatLabel}>Avg % Above Line:</span>
          <span style={styles.parlayStatValue}>+{combo.avgPercentAbove.toFixed(1)}%</span>
        </div>
        <div style={styles.parlayStat}>
          <span style={styles.parlayStatLabel}>All Hit Rate:</span>
          <span style={styles.parlayStatValue}>100%</span>
        </div>
      </div>

      <div style={styles.legsContainer}>
        {combo.legs.map((leg: any, i: number) => (
          <div key={i} style={styles.legRow}>
            <div style={styles.legNumber}>{i + 1}</div>
            <div style={styles.legInfo}>
              <div style={styles.legPlayerName}>{leg.player}</div>
              <div style={styles.legPropInfo}>
                {formatMarket(leg.market)} Over {leg.line} • Avg: {leg.season_avg}
              </div>
            </div>
            <div style={styles.legOddsValue}>
              {formatOdds(Math.max(...leg.bookmakers.map((b: any) => b.odds)))}
            </div>
          </div>
        ))}
      </div>
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
    .replace('Rush Yds', 'Rush Yds')
    .replace('Pass Tds', 'Pass TD')
}

function formatBookName(name: string) {
  const names: Record<string, string> = {
    'draftkings': 'DraftKings',
    'fanduel': 'FanDuel',
    'betmgm': 'BetMGM',
    'williamhill_us': 'Caesars',
    'betrivers': 'BetRivers',
    'bovada': 'Bovada',
    'fanatics': 'Fanatics',
    'betonlineag': 'BetOnline'
  }
  return names[name] || name
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #334155 0%, #1f2937 15%, #1f2937 100%)',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    color: 'white'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '2rem',
    flexWrap: 'wrap' as const
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #e5e7eb, #ffffff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#60a5fa',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const
  },
  headerStats: {
    display: 'flex',
    gap: '2rem'
  },
  stat: {
    textAlign: 'center' as const
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.25rem'
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: '700'
  },
  viewToggle: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    background: 'rgba(255,255,255,0.05)',
    padding: '0.35rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  toggleBtn: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleBtnActive: {
    background: 'rgba(96,165,250,0.15)',
    color: '#60a5fa'
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    marginBottom: '2rem'
  },
  searchLarge: {
    flex: '1 1 300px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e5e7eb',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    outline: 'none'
  },
  filterSelect: {
    flex: '1 1 180px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e5e7eb',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem'
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(59,130,246,0.35)',
    borderRadius: '14px',
    padding: '1.25rem',
    transition: 'all 0.25s'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    gap: '1rem'
  },
  playerInfo: {
    flex: 1,
    minWidth: 0
  },
  playerName: {
    fontSize: '1.1rem',
    fontWeight: '800',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  gameInfoText: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    marginBottom: '0.15rem'
  },
  timeText: {
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  edgeBadge: {
    background: 'rgba(22,163,74,0.12)',
    border: '1px solid rgba(22,163,74,0.4)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    textAlign: 'center' as const
  },
  edgeValue: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#16a34a',
    marginBottom: '0.15rem'
  },
  edgeText: {
    fontSize: '0.65rem',
    color: '#9ca3af',
    textTransform: 'uppercase' as const
  },
  propLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.85rem 1rem',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  marketLabel: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    marginBottom: '0.25rem'
  },
  lineValue: {
    fontSize: '1rem',
    fontWeight: '700'
  },
  bestOdds: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#60a5fa'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  statBox: {
    background: 'rgba(0,0,0,0.2)',
    padding: '0.65rem',
    borderRadius: '8px',
    textAlign: 'center' as const
  },
  statBoxLabel: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    marginBottom: '0.25rem',
    textTransform: 'uppercase' as const
  },
  statBoxValue: {
    fontSize: '0.95rem',
    fontWeight: '700'
  },
  weeklyValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: '8px',
    marginBottom: '0.75rem',
    fontSize: '0.85rem'
  },
  weeklyLabel: {
    color: '#9ca3af',
    fontWeight: '600'
  },
  weeklyValue: {
    background: 'rgba(96,165,250,0.15)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontWeight: '700'
  },
  booksDetails: {
    marginTop: '0.75rem'
  },
  booksSummary: {
    color: '#60a5fa',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    listStyle: 'none'
  },
  booksList: {
    marginTop: '0.75rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem'
  },
  bookItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0.65rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    fontSize: '0.85rem'
  },
  bookNameText: {
    color: '#9ca3af'
  },
  bookOddsText: {
    fontWeight: '700'
  },
  parlayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  parlayTitle: {
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  parlayCount: {
    fontSize: '0.85rem',
    color: '#9ca3af'
  },
  parlayGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  parlayCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(59,130,246,0.35)',
    borderRadius: '14px',
    padding: '1.25rem',
    transition: 'all 0.25s'
  },
  parlayCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  rankCircle: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontWeight: '800',
    flexShrink: 0
  },
  parlayMeta: {
    flex: 1
  },
  parlayTypeLabel: {
    fontSize: '0.8rem',
    color: '#60a5fa',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.25rem'
  },
  parlayGameText: {
    fontSize: '0.85rem',
    color: '#9ca3af'
  },
  parlayOddsDisplay: {
    textAlign: 'right' as const
  },
  parlayOddsLabel: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    marginBottom: '0.25rem'
  },
  parlayOddsValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#16a34a'
  },
  parlayStats: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px'
  },
  parlayStat: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  parlayStatLabel: {
    fontSize: '0.85rem',
    color: '#9ca3af'
  },
  parlayStatValue: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#16a34a'
  },
  legsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.65rem'
  },
  legRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 0.85rem',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: '8px'
  },
  legNumber: {
    background: 'rgba(96,165,250,0.2)',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#60a5fa',
    flexShrink: 0
  },
  legInfo: {
    flex: 1,
    minWidth: 0
  },
  legPlayerName: {
    fontSize: '0.95rem',
    fontWeight: '700',
    marginBottom: '0.2rem',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  legPropInfo: {
    fontSize: '0.8rem',
    color: '#9ca3af'
  },
  legOddsValue: {
    fontSize: '0.95rem',
    fontWeight: '700',
    flexShrink: 0
  },
  loading: {
    textAlign: 'center' as const,
    padding: '5rem 2rem',
    color: '#9ca3af'
  },
  spinner: {
    display: 'inline-block',
    width: '40px',
    height: '40px',
    border: '4px solid rgba(96,165,250,0.2)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  empty: {
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    color: '#9ca3af',
    fontSize: '1rem'
  }
}
