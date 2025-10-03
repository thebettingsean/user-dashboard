'use client'

import React, { useState, useEffect, useMemo } from 'react'

export default function PropParlayTool() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'props' | 'parlays'>('props')
  const [filters, setFilters] = useState({
    legs: 2,
    minOdds: -600,
    parlayMinOdds: 'highest',
    book: 'all',
    parlayType: 'all',
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
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
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

    // Remove duplicate props from same player (keep best odds)
    const deduplicatedProps = deduplicatePlayerProps(filteredProps)

    const byGame: Record<string, any[]> = {}
    deduplicatedProps.forEach((prop: any) => {
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

    if (!isSGP && deduplicatedProps.length >= numLegs) {
      generateCombos(deduplicatedProps, numLegs).forEach(combo => {
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

    let comboResults = combos.map(combo => {
      const totalOdds = calculateParlayOdds(combo.legs)
      const avgPercentAbove = combo.legs.reduce((sum: number, leg: any) => 
        sum + ((leg.season_avg - leg.line) / leg.line * 100), 0
      ) / combo.legs.length
      return { ...combo, totalOdds, avgPercentAbove }
    })

    // Filter by parlay odds
    if (filters.parlayMinOdds !== 'highest') {
      const threshold = parseInt(filters.parlayMinOdds)
      comboResults = comboResults.filter(c => c.totalOdds >= threshold)
    }

    // Sort by odds (highest first)
    return comboResults.sort((a, b) => b.totalOdds - a.totalOdds).slice(0, 50)
  }, [filteredProps, filters.legs, filters.parlayType, filters.parlayMinOdds])

  function deduplicatePlayerProps(props: any[]) {
    const playerMarketMap: Record<string, any> = {}
    
    props.forEach(prop => {
      const marketType = prop.market.toLowerCase()
      const key = `${prop.player}-${marketType}`
      
      if (!playerMarketMap[key]) {
        playerMarketMap[key] = prop
      } else {
        // Keep the one with better odds (higher = better)
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

              <select 
                value={filters.parlayMinOdds} 
                onChange={(e) => setFilters({...filters, parlayMinOdds: e.target.value})}
                style={styles.filterSelect}
              >
                <option value="highest">Highest Odds</option>
                <option value="-150">-150 or Better</option>
                <option value="100">+100 or Better</option>
                <option value="250">+250 or Better</option>
                <option value="350">+350 or Better</option>
                <option value="500">+500 or Better</option>
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
            <option value="-600">Best Odds (All)</option>
            <option value="-250">-150 to -250</option>
            <option value="-400">-150 to -400</option>
            <option value="-600">-150 to -600</option>
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
          <PropsTable props={filteredProps} filters={filters} />
        ) : (
          <ParlaysGrid combos={parlayCombo} filters={filters} />
        )}
      </div>
    </div>
  )
}

function PropsTable({ props, filters }: { props: any[], filters: any }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  if (!props.length) {
    return <div style={styles.empty}>No props match your filters</div>
  }

  function toggleRow(index: number) {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div style={styles.table}>
      {props.map((prop, idx) => {
        const bookFilter = filters.book !== 'all' ? filters.book : null
        const bookmakers = bookFilter 
          ? prop.bookmakers.filter((b: any) => b.name === bookFilter)
          : prop.bookmakers
        
        const bestOdds = Math.max(...bookmakers.map((b: any) => b.odds))
        const percentAbove = ((prop.season_avg - prop.line) / prop.line * 100).toFixed(0)
        const isExpanded = expandedRows.has(idx)

        return (
          <div key={idx} style={styles.tableRow}>
            <div 
              style={styles.tableRowHeader}
              onClick={() => toggleRow(idx)}
            >
              <div style={styles.tableRowMain}>
                <div style={styles.tablePlayerName}>{prop.player}</div>
                <div style={styles.tableRowInfo}>
                  <span style={styles.tableLine}>
                    {formatMarket(prop.market)} O{prop.line}
                  </span>
                  <span style={styles.tableEdge}>+{percentAbove}% above</span>
                </div>
              </div>
              <div style={styles.tableRowMeta}>
                <div style={styles.tableTeam}>{prop.game}</div>
                <div style={styles.tableTime}>{prop.game_time}</div>
              </div>
              <div style={styles.tableToggle}>
                {isExpanded ? '▼' : '▶'}
              </div>
            </div>

            {isExpanded && (
              <div style={styles.tableRowExpanded}>
                <div style={styles.expandedGrid}>
                  <div style={styles.expandedStat}>
                    <div style={styles.expandedLabel}>Season Avg</div>
                    <div style={styles.expandedValue}>{prop.season_avg}</div>
                  </div>
                  <div style={styles.expandedStat}>
                    <div style={styles.expandedLabel}>Hit Rate</div>
                    <div style={styles.expandedValue}>100%</div>
                  </div>
                  <div style={styles.expandedStat}>
                    <div style={styles.expandedLabel}>Best Odds</div>
                    <div style={styles.expandedValue}>{formatOdds(bestOdds)}</div>
                  </div>
                </div>

                <div style={styles.weeklySection}>
                  <div style={styles.expandedLabel}>Weekly Performance:</div>
                  <div style={styles.weeklyGrid}>
                    {prop.weekly_values.map((val: number, i: number) => (
                      <div key={i} style={styles.weeklyBadge}>Wk{i+1}: {val}</div>
                    ))}
                  </div>
                </div>

                <div style={styles.booksSection}>
                  <div style={styles.expandedLabel}>Available Books ({bookmakers.length}):</div>
                  <div style={styles.booksGrid}>
                    {bookmakers.map((book: any, i: number) => (
                      <div key={i} style={styles.bookRow}>
                        <span style={styles.bookNameExpanded}>{formatBookName(book.name)}</span>
                        <span style={styles.bookOddsExpanded}>{formatOdds(book.odds)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
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
  table: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  tableRow: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(59,130,246,0.35)',
    borderRadius: '10px',
    overflow: 'hidden',
    transition: 'all 0.2s'
  },
  tableRowHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    gap: '1rem',
    transition: 'background 0.2s'
  },
  tableRowMain: {
    flex: '1',
    minWidth: '0'
  },
  tablePlayerName: {
    fontSize: '1.05rem',
    fontWeight: '700',
    marginBottom: '0.35rem'
  },
  tableRowInfo: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.85rem'
  },
  tableLine: {
    color: '#9ca3af'
  },
  tableEdge: {
    color: '#16a34a',
    fontWeight: '700'
  },
  tableRowMeta: {
    textAlign: 'right' as const,
    minWidth: '200px'
  },
  tableTeam: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    marginBottom: '0.25rem'
  },
  tableTime: {
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  tableToggle: {
    fontSize: '0.85rem',
    color: '#60a5fa',
    marginLeft: '1rem'
  },
  tableRowExpanded: {
    padding: '1.25rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.15)'
  },
  expandedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '1.25rem'
  },
  expandedStat: {
    background: 'rgba(255,255,255,0.05)',
    padding: '0.75rem',
    borderRadius: '8px'
  },
  expandedLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginBottom: '0.5rem',
    fontWeight: '600'
  },
  expandedValue: {
    fontSize: '1.1rem',
    fontWeight: '700'
  },
  weeklySection: {
    marginBottom: '1.25rem'
  },
  weeklyGrid: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
    marginTop: '0.5rem'
  },
  weeklyBadge: {
    background: 'rgba(96,165,250,0.15)',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  booksSection: {},
  booksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '0.5rem',
    marginTop: '0.5rem'
  },
  bookRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    fontSize: '0.85rem'
  },
  bookNameExpanded: {
    color: '#9ca3af'
  },
  bookOddsExpanded: {
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