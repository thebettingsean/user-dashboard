'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSubscription } from '../../lib/hooks/useSubscription'

// Supabase configuration
const SUPABASE_URL = 'https://prypgwgaeadicxlgbgjw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeXBnd2dhZWFkaWN4bGdiZ2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE0MDEsImV4cCI6MjA2Nzc0NzQwMX0.nSehEJTPVnfhsD2y98lGzVNTTJ8MFfwv3Vaw5kLbAYc'

interface Player {
  id: number
  name: string
  position: string
  team: string
  injury_status?: string
  points: number
  boost: number
  hasProjections: boolean
  projectionData?: any
  props: any[]
  historicalData: any[]
}

export default function FantasyPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set())
  const [currentSort, setCurrentSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'points',
    direction: 'desc'
  })
  const [positionFilter, setPositionFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [showPosDropdown, setShowPosDropdown] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const { isLoading: subLoading, isSubscribed } = useSubscription()
  const userHasAccess = isSubscribed

  const CURRENT_WEEK = 7

  // Fetch data from Supabase
  async function fetchData(table: string, query = '') {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      if (!response.ok) throw new Error(`Failed to fetch ${table}`)
      return await response.json()
    } catch (error) {
      console.error(`Error fetching ${table}:`, error)
      return []
    }
  }

  // Load all data
  async function loadAllData() {
    try {
      const [players, rankings, projectionsData, propsData, injuriesData, historicalData] = await Promise.all([
        fetchData('all_players', '?select=*&limit=2000'),
        fetchData('weekly_rankings', `?week=eq.${CURRENT_WEEK}&select=*&limit=500`),
        fetchData('all_player_projections', `?week=eq.${CURRENT_WEEK}&select=*&limit=500`),
        fetchData('player_props', '?select=*&limit=2000'),
        fetchData('player_injuries', '?select=*&limit=500'),
        fetchData('player_weekly_history', '?season=eq.2025&select=*&order=week.asc&limit=50000')
      ])

      // Build maps
      const projections = new Map()
      projectionsData.forEach((p: any) => projections.set(p.player_id, p))

      const playerProps = new Map()
      propsData.forEach((p: any) => {
        if (!playerProps.has(p.player_id)) {
          playerProps.set(p.player_id, [])
        }
        playerProps.get(p.player_id).push(p)
      })

      const injuries = new Map()
      injuriesData.forEach((i: any) => i.player_id && injuries.set(i.player_id, i.injury_status))

      const playerHistoricalMap = new Map()
      historicalData.forEach((record: any) => {
        if (!playerHistoricalMap.has(record.player_id)) {
          playerHistoricalMap.set(record.player_id, [])
        }
        playerHistoricalMap.get(record.player_id).push({
          week: record.week,
          projected: parseFloat(record.projected_pts_standard) || 0,
          actual: parseFloat(record.actual_pts_ppr) || 0
        })
      })

      // Map players
      const mappedPlayers = players.map((player: any) => {
        const ranking = rankings.find((r: any) => r.id === player.id)
        const projection = projections.get(player.id)
        const injury = injuries.get(player.id)

        let points = 0
        let boost = 0
        let hasProjections = false

        if (projection) {
          points = parseFloat(projection.total_boosted_pts) || parseFloat(projection.fantasy_points_ppr) || 0
          boost = parseFloat(projection.overall_odds_boost_pct) || 0
          hasProjections = true
        } else if (ranking) {
          points = parseFloat(ranking.fantasy_points_ppr) || 0
          hasProjections = true
        }

        return {
          id: player.id,
          name: player.name,
          position: player.position,
          team: player.team,
          injury_status: injury,
          points: points,
          boost: boost,
          hasProjections: hasProjections,
          projectionData: projection,
          props: playerProps.get(player.id) || [],
          historicalData: playerHistoricalMap.get(player.id) || []
        }
      })

      setAllPlayers(mappedPlayers)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Filter and sort players
  useEffect(() => {
    let filtered = allPlayers.filter(player => {
      if (!player.hasProjections) return false

      const matchesSearch = !searchQuery ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPosition = positionFilter ?
        player.position === positionFilter :
        (searchQuery ? true : player.position !== 'QB')

      return matchesSearch && matchesPosition
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (currentSort.column) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'position':
          aVal = a.position
          bVal = b.position
          break
        case 'points':
          aVal = a.points
          bVal = b.points
          break
        case 'boost':
          aVal = a.boost
          bVal = b.boost
          break
        case 'injury':
          aVal = a.injury_status || 'ZZZ'
          bVal = b.injury_status || 'ZZZ'
          break
        default:
          aVal = a.points
          bVal = b.points
      }

      if (typeof aVal === 'string') {
        return currentSort.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal
    })

    setFilteredPlayers(filtered)
  }, [allPlayers, searchQuery, positionFilter, currentSort])

  // Helper functions
  const getPositionRank = (player: Player) => {
    const posPlayers = allPlayers
      .filter(p => p.position === player.position && p.hasProjections)
      .sort((a, b) => b.points - a.points)

    const rank = posPlayers.findIndex(p => p.id === player.id) + 1
    return rank > 0 ? `${player.position}${rank}` : player.position
  }

  const getInjuryBadge = (status?: string) => {
    if (!status) return null

    const upper = status.toUpperCase()
    if (upper.includes('QUESTIONABLE')) return <span className="injury-badge q">Q</span>
    if (upper.includes('DOUBTFUL')) return <span className="injury-badge d">D</span>
    if (upper.includes('OUT')) return <span className="injury-badge o">O</span>
    if (upper.includes('INJURED')) return <span className="injury-badge ir">IR</span>
    return null
  }

  const handleSort = (column: string) => {
    if (currentSort.column === column) {
      setCurrentSort({ column, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      setCurrentSort({ column, direction: column === 'name' || column === 'position' ? 'asc' : 'desc' })
    }
  }

  const handlePlayerSelection = (playerId: number) => {
    if (!userHasAccess) return

    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      if (newSelected.size >= 4) {
        alert('You can compare up to 4 players at a time')
        return
      }
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  const clearSelection = () => {
    setSelectedPlayers(new Set())
  }

  const handleRowClick = (player: Player, index: number) => {
    if (userHasAccess || index < 2) {
      setSelectedPlayer(player)
    } else {
      window.location.href = 'https://stripe.thebettinginsider.com/checkout/price_1RyElj07WIhZOuSI4lM0RnqM'
    }
  }

  if (subLoading || loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading rankings...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>Week {CURRENT_WEEK} Vegas Backed Fantasy Rankings</h1>
          <p style={styles.subtitle}>
            We took Vegas's billion-dollar betting lines and converted them into the best weekly fantasy rankings on the internet.
          </p>
        </header>

        {/* Unlock CTA (for non-subscribed users) */}
        {!userHasAccess && (
          <div style={styles.unlockCta}>
            <button
              style={styles.unlockButton}
              onClick={() => window.location.href = 'https://stripe.thebettinginsider.com/checkout/price_1RyElj07WIhZOuSI4lM0RnqM'}
            >
              View Rankings Instantly
            </button>
          </div>
        )}

        {/* Main Table Container */}
        <div style={styles.tableContainer}>
          {/* Controls */}
          <div style={styles.controls}>
            <div style={styles.controlsHeader}>
              <button
                style={styles.infoButton}
                onClick={() => setShowInfoModal(true)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <svg style={{ width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            </div>

            <div style={styles.controlsRow}>
              <div style={styles.searchContainer}>
                <input
                  type="text"
                  style={styles.searchInput}
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={(e) => {
                    if (!userHasAccess) {
                      e.target.blur()
                      window.location.href = 'https://stripe.thebettinginsider.com/checkout/price_1RyElj07WIhZOuSI4lM0RnqM'
                    }
                  }}
                />
              </div>

              <div style={styles.controlBadges}>
                {selectedPlayers.size > 0 && (
                  <>
                    <span style={styles.badge}>{selectedPlayers.size} selected</span>
                    {selectedPlayers.size >= 2 && (
                      <span
                        style={{ ...styles.badge, ...styles.badgeGreen }}
                        onClick={() => setShowComparison(true)}
                      >
                        View Comparison
                      </span>
                    )}
                    <span style={styles.badge} onClick={clearSelection}>Clear</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thCheckbox}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      disabled={!userHasAccess}
                    />
                  </th>
                  <th style={styles.th} onClick={() => handleSort('rank')}>
                    RK<span style={styles.sortIndicator}>↕</span>
                  </th>
                  <th style={styles.th} onClick={() => handleSort('name')}>
                    PLAYER<span style={styles.sortIndicator}>↕</span>
                  </th>
                  <th style={{ ...styles.th, position: 'relative' as const }} onClick={() => handleSort('position')}>
                    POS<span style={styles.sortIndicator}>↕</span>
                    <div
                      style={{
                        ...styles.posDropdown,
                        display: showPosDropdown ? 'block' : 'none'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {['', 'QB', 'RB', 'WR', 'TE'].map(pos => (
                        <div
                          key={pos}
                          style={{
                            ...styles.posOption,
                            background: positionFilter === pos ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                          }}
                          onClick={() => {
                            setPositionFilter(pos)
                            setShowPosDropdown(false)
                          }}
                        >
                          {pos || 'ALL'}
                        </div>
                      ))}
                    </div>
                  </th>
                  <th style={styles.thHideMobile}>TEAM</th>
                  <th style={styles.thHideMobile} onClick={() => handleSort('injury')}>
                    STATUS<span style={styles.sortIndicator}>↕</span>
                  </th>
                  <th style={styles.th} onClick={() => handleSort('points')}>
                    PTS<span style={{ ...styles.sortIndicator, opacity: 1, color: '#3b82f6' }}>↓</span>
                  </th>
                  <th style={styles.thHideMobile} onClick={() => handleSort('boost')}>
                    WEIGHT<span style={styles.sortIndicator}>↕</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, index) => {
                  const isLocked = !userHasAccess && index >= 2
                  const isSelected = selectedPlayers.has(player.id)
                  const posRank = getPositionRank(player)

                  if (isLocked) {
                    return (
                      <tr
                        key={player.id}
                        style={styles.trLocked}
                        onClick={() => window.location.href = 'https://stripe.thebettinginsider.com/checkout/price_1RyElj07WIhZOuSI4lM0RnqM'}
                      >
                        <td style={styles.td}>
                          <input type="checkbox" style={{ ...styles.checkbox, opacity: 0.3 }} disabled />
                        </td>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={styles.td}>
                          <span style={styles.lockedName}>Player Locked</span>
                          <span style={styles.lockedTagline}>Fantasy package required</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.posBadge, ...getPosBadgeStyle(player.position) }}>
                            {posRank}
                          </span>
                        </td>
                        <td style={{ ...styles.td, ...styles.hideMobile }}>
                          <span style={styles.lockedData}>--</span>
                        </td>
                        <td style={{ ...styles.td, ...styles.hideMobile }}>
                          <span style={styles.lockedData}>-</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>{player.points.toFixed(1)}</td>
                        <td style={{ ...styles.td, ...styles.hideMobile }}>
                          <span style={styles.lockedData}>--%</span>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr
                      key={player.id}
                      style={{
                        ...styles.tr,
                        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent'
                      }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName !== 'INPUT') {
                          handleRowClick(player, index)
                        }
                      }}
                    >
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          style={styles.checkbox}
                          checked={isSelected}
                          onChange={() => handlePlayerSelection(player.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}>
                        <span style={styles.playerName}>{player.name}</span>
                        <span style={styles.playerTeam}>({player.team || 'FA'})</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.posBadge, ...getPosBadgeStyle(player.position) }}>
                          {posRank}
                        </span>
                      </td>
                      <td style={{ ...styles.td, ...styles.hideMobile }}>{player.team || 'FA'}</td>
                      <td style={{ ...styles.td, ...styles.hideMobile }}>{getInjuryBadge(player.injury_status) || '-'}</td>
                      <td style={{ ...styles.td, fontWeight: '700', textAlign: 'right' }}>{player.points.toFixed(1)}</td>
                      <td style={{ ...styles.td, ...styles.hideMobile, textAlign: 'right', fontWeight: '600', color: player.boost > 0 ? '#10b981' : player.boost < 0 ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>
                        {player.boost > 0 ? '+' : ''}{player.boost.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div style={modalStyles.overlay} onClick={() => setSelectedPlayer(null)}>
          <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
            <button style={modalStyles.close} onClick={() => setSelectedPlayer(null)}>×</button>
            
            <div style={modalStyles.header}>
              <h2 style={modalStyles.playerName}>{selectedPlayer.name}</h2>
              <p style={modalStyles.playerInfo}>
                {selectedPlayer.position} • {selectedPlayer.team || 'Free Agent'}
                {selectedPlayer.injury_status ? ` • ${selectedPlayer.injury_status}` : ''}
              </p>
            </div>

            <div style={modalStyles.statsGrid}>
              <div style={modalStyles.statBox}>
                <div style={modalStyles.statLabel}>Projected Points</div>
                <div style={modalStyles.statValue}>{selectedPlayer.points.toFixed(1)}</div>
              </div>
              <div style={modalStyles.statBox}>
                <div style={modalStyles.statLabel}>Odds Factor</div>
                <div style={{ ...modalStyles.statValue, color: selectedPlayer.boost >= 0 ? '#10b981' : '#ef4444' }}>
                  {selectedPlayer.boost >= 0 ? '+' : ''}{selectedPlayer.boost.toFixed(1)}%
                </div>
              </div>
            </div>

            {selectedPlayer.projectionData && (
              <div style={modalStyles.propSection}>
                <div style={modalStyles.propTitle}>Projection Details</div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Full breakdown available in premium version
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <div style={modalStyles.overlay} onClick={() => setShowComparison(false)}>
          <div style={{ ...modalStyles.content, maxWidth: '1200px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button style={modalStyles.close} onClick={() => setShowComparison(false)}>×</button>
            
            <div style={modalStyles.header}>
              <h2 style={modalStyles.playerName}>Player Comparison</h2>
              <p style={modalStyles.playerInfo}>{selectedPlayers.size} players selected</p>
            </div>

            <div style={modalStyles.comparisonGrid}>
              {Array.from(selectedPlayers).map(playerId => {
                const player = allPlayers.find(p => p.id === playerId)
                if (!player) return null

                return (
                  <div key={player.id} style={modalStyles.comparisonCard}>
                    <div style={modalStyles.comparisonHeader}>
                      <div style={modalStyles.comparisonName}>{player.name}</div>
                      <div style={modalStyles.comparisonInfo}>{player.position} • {player.team}</div>
                    </div>
                    <div style={modalStyles.comparisonStats}>
                      <div style={modalStyles.comparisonStatRow}>
                        <span style={modalStyles.comparisonStatLabel}>Projected Points</span>
                        <span style={modalStyles.comparisonStatValue}>{player.points.toFixed(1)}</span>
                      </div>
                      <div style={modalStyles.comparisonStatRow}>
                        <span style={modalStyles.comparisonStatLabel}>Odds Boost</span>
                        <span style={{ ...modalStyles.comparisonStatValue, color: player.boost >= 0 ? '#10b981' : '#ef4444' }}>
                          {player.boost >= 0 ? '+' : ''}{player.boost.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div style={modalStyles.overlay} onClick={() => setShowInfoModal(false)}>
          <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
            <button style={modalStyles.close} onClick={() => setShowInfoModal(false)}>×</button>
            <h3 style={{ color: '#fff', marginBottom: '1rem' }}>About</h3>
            <p style={{ color: '#e5e7eb', fontSize: '0.8rem', lineHeight: 1.6 }}>
              <b>PTS:</b> Final projection w/ odds<br />
              <b>Weight:</b> odds boost from base proj.<br />
              <b>Check Box:</b> Compare up to 4 players<br /><br />
              <b>Data:</b> Live from Odds API updated every 30min<br /><br />
              <b>Soon:</b> Week-to-week projection changes, Player vs average tracking, Projection vs actual results
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .injury-badge {
          display: inline-block;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          fontSize: 0.625rem;
          fontWeight: 700;
          textTransform: uppercase;
        }

        .injury-badge.q {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .injury-badge.d {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .injury-badge.o,
        .injury-badge.ir {
          background: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

const modalStyles = {
  overlay: {
    display: 'flex',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  },
  content: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    border: 'none',
    borderRadius: '24px',
    padding: '1.5rem',
    maxWidth: '90%',
    width: '650px',
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    position: 'relative' as const,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },
  close: {
    position: 'absolute' as const,
    top: '0.75rem',
    right: '0.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.7)',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s'
  },
  header: {
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
  },
  playerName: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '0.25rem'
  },
  playerInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  statBox: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.75rem'
  },
  statLabel: {
    fontSize: '0.625rem',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.125rem'
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  propSection: {
    marginBottom: '1rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.75rem'
  },
  propTitle: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#60a5fa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  comparisonCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '1rem'
  },
  comparisonHeader: {
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
  },
  comparisonName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '0.25rem'
  },
  comparisonInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.625rem'
  },
  comparisonStats: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  comparisonStatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.375rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  comparisonStatLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.6875rem'
  },
  comparisonStatValue: {
    fontWeight: '600',
    color: '#ffffff',
    fontSize: '0.75rem'
  }
}

function getPosBadgeStyle(position: string) {
  const styles: any = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textAlign: 'center' as const,
    minWidth: '48px'
  }

  switch (position) {
    case 'QB':
      return { ...styles, background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }
    case 'RB':
      return { ...styles, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
    case 'WR':
      return { ...styles, background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }
    case 'TE':
      return { ...styles, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }
    default:
      return styles
  }
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '10rem 1rem 2rem 1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#ffffff'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    position: 'relative' as const,
    zIndex: 1
  },
  loading: {
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  spinner: {
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem'
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 4rem)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #e5e7eb, #ffffff)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '2rem',
    letterSpacing: '-0.02em',
    lineHeight: 1.2
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1rem',
    maxWidth: '700px',
    margin: '0 auto'
  },
  unlockCta: {
    marginBottom: '1.5rem',
    textAlign: 'center' as const
  },
  unlockButton: {
    display: 'inline-block',
    padding: '0.625rem 1.5rem',
    background: 'linear-gradient(135deg, #047857, #10b981, #34d399)',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    boxShadow: '0 3px 10px rgba(16, 185, 129, 0.25)',
    transition: 'all 0.3s ease'
  },
  tableContainer: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    border: 'none',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },
  controls: {
    padding: '1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  controlsHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '0.75rem'
  },
  infoButton: {
    padding: '0.5rem',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap' as const
  },
  searchContainer: {
    flex: 1,
    minWidth: '250px',
    maxWidth: '500px'
  },
  searchInput: {
    width: '100%',
    padding: '0.625rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '0.875rem'
  },
  controlBadges: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center'
  },
  badge: {
    padding: '0.5rem 1rem',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    color: '#3b82f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const
  },
  badgeGreen: {
    background: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    color: '#10b981'
  },
  tableScroll: {
    overflowX: 'auto' as const,
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8125rem'
  },
  th: {
    padding: '0.875rem 0.75rem',
    textAlign: 'left' as const,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    cursor: 'pointer',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const
  },
  thCheckbox: {
    width: '40px',
    padding: '0.875rem 0.5rem'
  },
  thHideMobile: {
    padding: '0.875rem 0.75rem',
    textAlign: 'left' as const,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  sortIndicator: {
    display: 'inline-block',
    marginLeft: '0.25rem',
    fontSize: '0.625rem',
    opacity: 0.3
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'background 0.2s',
    cursor: 'pointer'
  },
  trLocked: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'background 0.2s',
    cursor: 'pointer',
    opacity: 0.7
  },
  td: {
    padding: '0.75rem',
    color: '#ffffff',
    fontSize: '0.8125rem'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#3b82f6'
  },
  playerName: {
    fontWeight: '600',
    color: '#ffffff',
    display: 'block',
    marginBottom: '0.125rem'
  },
  playerTeam: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.75rem'
  },
  posBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textAlign: 'center' as const,
    minWidth: '48px'
  },
  lockedName: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    display: 'block'
  },
  lockedTagline: {
    color: '#f59e0b',
    fontSize: '0.7rem',
    opacity: 0.8
  },
  lockedData: {
    filter: 'blur(4px)',
    userSelect: 'none' as const,
    pointerEvents: 'none' as const
  },
  hideMobile: {
    '@media (max-width: 768px)': {
      display: 'none'
    }
  },
  posDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    background: 'rgba(30, 41, 59, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '0.5rem',
    marginTop: '0.25rem',
    zIndex: 100,
    minWidth: '100px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  posOption: {
    padding: '0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    color: '#ffffff',
    fontSize: '0.875rem',
    textAlign: 'center' as const
  }
}

