'use client'

import React, { useState, useEffect } from 'react'
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
  historicalData: Array<{
    week: number
    projected: number
    actual: number
  }>
  avgAboveProjected?: number
  trendingScore?: number
  accuracyScore?: number
}

export default function FantasyPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState('points')
  const [positionFilter, setPositionFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showPosDropdown, setShowPosDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const { isLoading: subLoading, isSubscribed } = useSubscription()
  const userHasAccess = isSubscribed

  // NFL Week Schedule
  const NFL_SCHEDULE = [
    { week: 1, start: new Date('2025-09-02'), end: new Date('2025-09-08T23:59:59') },
    { week: 2, start: new Date('2025-09-09'), end: new Date('2025-09-15T23:59:59') },
    { week: 3, start: new Date('2025-09-16'), end: new Date('2025-09-22T23:59:59') },
    { week: 4, start: new Date('2025-09-23'), end: new Date('2025-09-29T23:59:59') },
    { week: 5, start: new Date('2025-09-30'), end: new Date('2025-10-06T23:59:59') },
    { week: 6, start: new Date('2025-10-07'), end: new Date('2025-10-13T23:59:59') },
    { week: 7, start: new Date('2025-10-14'), end: new Date('2025-10-20T23:59:59') },
    { week: 8, start: new Date('2025-10-21'), end: new Date('2025-10-27T23:59:59') },
    { week: 9, start: new Date('2025-10-28'), end: new Date('2025-11-03T23:59:59') },
    { week: 10, start: new Date('2025-11-04'), end: new Date('2025-11-10T23:59:59') },
    { week: 11, start: new Date('2025-11-11'), end: new Date('2025-11-17T23:59:59') },
    { week: 12, start: new Date('2025-11-18'), end: new Date('2025-11-24T23:59:59') },
    { week: 13, start: new Date('2025-11-25'), end: new Date('2025-12-01T23:59:59') },
    { week: 14, start: new Date('2025-12-02'), end: new Date('2025-12-08T23:59:59') },
    { week: 15, start: new Date('2025-12-09'), end: new Date('2025-12-15T23:59:59') },
    { week: 16, start: new Date('2025-12-16'), end: new Date('2025-12-22T23:59:59') },
    { week: 17, start: new Date('2025-12-23'), end: new Date('2025-12-29T23:59:59') },
    { week: 18, start: new Date('2025-12-30'), end: new Date('2026-01-05T23:59:59') }
  ]

  // Get current week based on schedule
  const getCurrentWeek = () => {
    const now = new Date()
    const currentWeek = NFL_SCHEDULE.find(w => now >= w.start && now <= w.end)
    return currentWeek ? currentWeek.week : 7 // Default to week 7 if not found
  }

  const CURRENT_WEEK = getCurrentWeek()

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

  // Calculate historical metrics
  const calculateHistoricalMetrics = (historicalData: any[]) => {
    if (!historicalData || historicalData.length === 0) {
      return { avgAboveProjected: 0, trendingScore: 0, accuracyScore: 0 }
    }

    const gamesWithActuals = historicalData.filter((w: any) => w.actual > 0)
    
    if (gamesWithActuals.length === 0) {
      return { avgAboveProjected: 0, trendingScore: 0, accuracyScore: 0 }
    }

    const avgAboveProjected = gamesWithActuals.reduce((sum: number, w: any) => 
      sum + (w.actual - w.projected), 0) / gamesWithActuals.length

    let trendingScore = 0
    if (historicalData.length >= 2) {
      const firstWeek = historicalData[0].projected
      const lastWeek = historicalData[historicalData.length - 1].projected
      trendingScore = lastWeek - firstWeek
    }

    const variance = gamesWithActuals.reduce((sum: number, w: any) => 
      sum + Math.abs(w.actual - w.projected), 0) / gamesWithActuals.length
    const accuracyScore = -variance

    return { avgAboveProjected, trendingScore, accuracyScore }
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

      const mappedPlayers = players.map((player: any) => {
        const ranking = rankings.find((r: any) => r.id === player.id)
        const projection = projections.get(player.id)
        const injury = injuries.get(player.id)
        const historical = playerHistoricalMap.get(player.id) || []

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

        const metrics = calculateHistoricalMetrics(historical)

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
          historicalData: historical,
          ...metrics
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
        true

      return matchesSearch && matchesPosition
    })

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.points - a.points
        case 'above_avg':
        case 'accurate':
          // For these filters, prioritize players with 10+ pts projected, then sort by metric
          const aHigh = a.points >= 10
          const bHigh = b.points >= 10
          
          if (aHigh && !bHigh) return -1
          if (!aHigh && bHigh) return 1
          
          // Both in same tier, sort by actual metric
          if (sortBy === 'above_avg') {
            return (b.avgAboveProjected || 0) - (a.avgAboveProjected || 0)
          } else {
            return (b.accuracyScore || 0) - (a.accuracyScore || 0)
          }
        case 'trending':
          return (b.trendingScore || 0) - (a.trendingScore || 0)
        default:
          return b.points - a.points
      }
    })

    setFilteredPlayers(filtered)
  }, [allPlayers, searchQuery, positionFilter, sortBy])

  const handlePlayerSelection = (playerId: number, e: React.MouseEvent) => {
    e.stopPropagation()
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

  const getPositionRank = (player: Player) => {
    const posPlayers = allPlayers
      .filter(p => p.position === player.position && p.hasProjections)
      .sort((a, b) => b.points - a.points)

    const rank = posPlayers.findIndex(p => p.id === player.id) + 1
    return rank > 0 ? rank : null
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

        {/* Unlock CTA */}
        {!userHasAccess && (
          <div style={styles.unlockCta}>
            <button
              style={styles.unlockButton}
              onClick={() => window.location.href = 'https://stripe.thebettinginsider.com/checkout/price_1RyElj07WIhZOuSI4lM0RnqM'}
            >
              Unlock All Rankings
            </button>
          </div>
        )}

        {/* Filters Container */}
        <div style={styles.filtersContainer}>
          <div style={styles.filtersRow}>
            {/* Search - Left Side */}
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

            {/* Filter Buttons - Right Side */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Position Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  style={styles.filterButton}
                  onClick={() => {
                    setShowPosDropdown(!showPosDropdown)
                    setShowSortDropdown(false)
                  }}
                >
                  POS
                  <svg style={styles.filterIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                {showPosDropdown && (
                  <div style={styles.dropdown}>
                    {['', 'QB', 'RB', 'WR', 'TE'].map(pos => (
                      <div
                        key={pos}
                        style={{
                          ...styles.dropdownItem,
                          background: positionFilter === pos ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                        }}
                        onClick={() => {
                          setPositionFilter(pos)
                          setShowPosDropdown(false)
                        }}
                      >
                        {pos || 'All'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  style={styles.filterButton}
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown)
                    setShowPosDropdown(false)
                  }}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
                  </svg>
                </button>
                {showSortDropdown && (
                  <div style={styles.dropdown}>
                    <div
                      style={{
                        ...styles.dropdownItem,
                        background: sortBy === 'points' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                      }}
                      onClick={() => {
                        setSortBy('points')
                        setShowSortDropdown(false)
                      }}
                    >
                      Highest Pts
                    </div>
                    <div
                      style={{
                        ...styles.dropdownItem,
                        background: sortBy === 'above_avg' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                      }}
                      onClick={() => {
                        setSortBy('above_avg')
                        setShowSortDropdown(false)
                      }}
                    >
                      Highest Above Avg
                    </div>
                    <div
                      style={{
                        ...styles.dropdownItem,
                        background: sortBy === 'trending' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                      }}
                      onClick={() => {
                        setSortBy('trending')
                        setShowSortDropdown(false)
                      }}
                    >
                      Trending
                    </div>
                    <div
                      style={{
                        ...styles.dropdownItem,
                        background: sortBy === 'accurate' ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                      }}
                      onClick={() => {
                        setSortBy('accurate')
                        setShowSortDropdown(false)
                      }}
                    >
                      Most Accurate
                    </div>
                  </div>
                )}
              </div>

              {/* Info Button */}
              <button
                style={styles.infoButton}
                onClick={() => setShowInfoModal(true)}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Selection Controls */}
          {selectedPlayers.size > 0 && (
            <div style={styles.selectionControls}>
              <span style={styles.badge}>{selectedPlayers.size} selected</span>
              {selectedPlayers.size >= 2 && (
                <span
                  style={{ ...styles.badge, ...styles.badgeGreen }}
                  onClick={() => setShowComparison(true)}
                >
                  Compare Players
                </span>
              )}
              <span style={styles.badge} onClick={clearSelection}>Clear</span>
            </div>
          )}
        </div>

        {/* Player List */}
        <div style={styles.playerList}>
          {filteredPlayers.map((player, index) => {
            const isLocked = !userHasAccess && index >= 2
            const isSelected = selectedPlayers.has(player.id)
            const posRank = getPositionRank(player)

            if (isLocked) {
              return (
                <div
                  key={player.id}
                  style={styles.playerRowLocked}
                  onClick={() => window.location.href = 'https://stripe.thebettinginsider.com/checkout/price_1RyElj07WIhZOuSI4lM0RnqM'}
                >
                  <div style={{ filter: 'blur(4px)', flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type="checkbox" style={styles.checkbox} disabled />
                    <div style={{ flex: 1 }}>
                      <div style={styles.playerName}>Player Locked</div>
                      <div style={styles.teamName}>• • •</div>
                    </div>
                    <div style={{ ...styles.posBadge, ...getPosBadgeStyle(player.position) }}>
                      {player.position}
                    </div>
                  </div>
                  <div style={{ filter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <div style={styles.points}>{player.points.toFixed(1)}</div>
                    <div style={styles.boost}>--</div>
                  </div>
                  <div style={styles.lockOverlay}>
                    <img 
                      src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e6b622181cbd67efdee7b9_LOCK%20SVG.svg" 
                      alt="Locked" 
                      style={styles.lockIcon}
                    />
                    <div style={styles.lockText}>Package Required</div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={player.id}
                style={{
                  ...styles.playerRow,
                  background: isSelected ? 'rgba(59, 130, 246, 0.08)' : styles.playerRow.background
                }}
                onClick={() => setSelectedPlayer(player)}
              >
                {/* Left Side: Checkbox, Name, Position */}
                <div style={styles.playerLeft}>
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={(e) => handlePlayerSelection(player.id, e)}
                  />
                  <div style={styles.playerInfo}>
                    <div style={styles.playerName}>{player.name}</div>
                    <div style={styles.teamName}>{player.team || 'FA'}</div>
                  </div>
                  <div style={{ ...styles.posBadge, ...getPosBadgeStyle(player.position) }}>
                    {player.position}{posRank}
                  </div>
                  {player.injury_status && (
                    <div style={styles.injuryBadge}>
                      {player.injury_status.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Right Side: Points, Boost */}
                <div style={styles.playerRight}>
                  <div style={styles.points}>{player.points.toFixed(1)}</div>
                  <div style={{ 
                    ...styles.boost, 
                    color: player.boost > 0 ? '#10b981' : player.boost < 0 ? '#ef4444' : 'rgba(255,255,255,0.5)' 
                  }}>
                    {player.boost > 0 ? '+' : ''}{player.boost.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredPlayers.length === 0 && (
          <div style={styles.emptyState}>
            <p>No players found matching your filters</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {showComparison && (
        <ComparisonModal
          players={Array.from(selectedPlayers).map(id => allPlayers.find(p => p.id === id)!).filter(Boolean)}
          onClose={() => setShowComparison(false)}
        />
      )}

      {showInfoModal && (
        <InfoModal onClose={() => setShowInfoModal(false)} />
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Modals remain the same
function PlayerModal({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <button style={modalStyles.close} onClick={onClose}>×</button>
        
        <div style={modalStyles.header}>
          <h2 style={modalStyles.playerName}>{player.name}</h2>
          <p style={modalStyles.playerInfo}>
            {player.position} • {player.team || 'Free Agent'}
            {player.injury_status ? ` • ${player.injury_status}` : ''}
          </p>
        </div>

        <div style={modalStyles.statsGrid}>
          <div style={modalStyles.statBox}>
            <div style={modalStyles.statLabel}>Projected Points</div>
            <div style={modalStyles.statValue}>{player.points.toFixed(1)}</div>
          </div>
          <div style={modalStyles.statBox}>
            <div style={modalStyles.statLabel}>Odds Boost</div>
            <div style={{ ...modalStyles.statValue, color: player.boost >= 0 ? '#10b981' : '#ef4444' }}>
              {player.boost >= 0 ? '+' : ''}{player.boost.toFixed(1)}%
            </div>
          </div>
        </div>

        {player.historicalData && player.historicalData.length > 0 && (
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Historical Performance</div>
            
            {player.avgAboveProjected !== undefined && (
              <div style={modalStyles.historicalSummary}>
                <div style={modalStyles.historicalStat}>
                  <span style={modalStyles.historicalLabel}>Avg vs Projected</span>
                  <span style={{ 
                    ...modalStyles.historicalValue, 
                    color: player.avgAboveProjected > 0 ? '#10b981' : '#ef4444' 
                  }}>
                    {player.avgAboveProjected > 0 ? '+' : ''}{player.avgAboveProjected.toFixed(1)} pts
                  </span>
                </div>
              </div>
            )}

            <div style={modalStyles.weeklyList}>
              {player.historicalData.slice().reverse().map(week => (
                <div key={week.week} style={modalStyles.weekRow}>
                  <div style={modalStyles.weekLabel}>Week {week.week}</div>
                  <div style={modalStyles.weekStats}>
                    <span style={modalStyles.weekStat}>Proj: {week.projected.toFixed(1)}</span>
                    <span style={modalStyles.weekStat}>Actual: {week.actual > 0 ? week.actual.toFixed(1) : 'TBD'}</span>
                    {week.actual > 0 && (
                      <span style={{ 
                        ...modalStyles.weekDiff, 
                        color: week.actual >= week.projected ? '#10b981' : '#ef4444' 
                      }}>
                        {week.actual >= week.projected ? '+' : ''}{(week.actual - week.projected).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {player.projectionData && (
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Full Projections Available in Premium</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
              Upgrade to see detailed prop breakdowns, odds analysis, and more
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ComparisonModal({ players, onClose }: { players: Player[]; onClose: () => void }) {
  const topPlayer = players.reduce((prev, current) => 
    (current.points > prev.points) ? current : prev
  )

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.content, maxWidth: '1200px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
        <button style={modalStyles.close} onClick={onClose}>×</button>
        
        <div style={modalStyles.header}>
          <h2 style={modalStyles.playerName}>Start: {topPlayer.name} ({topPlayer.points.toFixed(1)} pts)</h2>
          <p style={modalStyles.playerInfo}>Comparing {players.length} players</p>
        </div>

        <div style={modalStyles.comparisonGrid}>
          {players.map(player => {
            const isTop = player.id === topPlayer.id

            return (
              <div key={player.id} style={modalStyles.comparisonCard}>
                <div style={modalStyles.comparisonHeader}>
                  <div style={modalStyles.comparisonName}>
                    {player.name} {isTop ? '👑' : ''}
                  </div>
                  <div style={modalStyles.comparisonInfo}>{player.position} • {player.team}</div>
                </div>
                <div style={modalStyles.comparisonStats}>
                  <div style={modalStyles.comparisonStatRow}>
                    <span>Projected Points</span>
                    <span style={{ fontWeight: '700', color: isTop ? '#10b981' : '#fff' }}>
                      {player.points.toFixed(1)}
                    </span>
                  </div>
                  <div style={modalStyles.comparisonStatRow}>
                    <span>Odds Boost</span>
                    <span style={{ color: player.boost >= 0 ? '#10b981' : '#ef4444' }}>
                      {player.boost >= 0 ? '+' : ''}{player.boost.toFixed(1)}%
                    </span>
                  </div>
                  {player.avgAboveProjected !== undefined && player.avgAboveProjected !== 0 && (
                    <div style={modalStyles.comparisonStatRow}>
                      <span>Avg vs Projected</span>
                      <span style={{ color: player.avgAboveProjected > 0 ? '#10b981' : '#ef4444' }}>
                        {player.avgAboveProjected > 0 ? '+' : ''}{player.avgAboveProjected.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <button style={modalStyles.close} onClick={onClose}>×</button>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>About Fantasy Rankings</h3>
        <div style={{ color: '#e5e7eb', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Points:</strong> Final projection incorporating Vegas betting lines<br />
            <strong>Boost:</strong> Percentage increase/decrease from base projection due to odds<br />
            <strong>vs Proj:</strong> Player's average performance above/below projections
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Filters:</strong><br />
            • <strong>Highest Above Avg:</strong> Players consistently outperforming projections<br />
            • <strong>Trending:</strong> Players with increasing projections week-over-week<br />
            • <strong>Most Accurate:</strong> Players with smallest variance between projected and actual
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            Data updates every 30 minutes from live betting markets
          </p>
        </div>
      </div>
    </div>
  )
}

function getPosBadgeStyle(position: string) {
  const base = {
    padding: '0.375rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textAlign: 'center' as const
  }

  switch (position) {
    case 'QB':
      return { ...base, background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }
    case 'RB':
      return { ...base, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
    case 'WR':
      return { ...base, background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }
    case 'TE':
      return { ...base, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }
    default:
      return base
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
    maxWidth: '1200px',
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
    marginBottom: '2rem',
    textAlign: 'center' as const
  },
  unlockButton: {
    padding: '0.75rem 2rem',
    background: 'linear-gradient(135deg, #047857, #10b981, #34d399)',
    color: '#ffffff',
    fontSize: '0.9375rem',
    fontWeight: '600',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.3s ease'
  },
  filtersContainer: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '20px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    position: 'relative' as const,
    zIndex: 100
  },
  filtersRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  searchContainer: {
    flex: '0 1 400px',
    minWidth: '200px',
    maxWidth: '400px'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '0.875rem'
  },
  filterButton: {
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s'
  },
  filterIcon: {
    width: '16px',
    height: '16px'
  },
  infoButton: {
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.7)',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: '0.5rem',
    background: 'rgba(10, 15, 25, 0.95)',
    backdropFilter: 'blur(60px) saturate(180%)',
    WebkitBackdropFilter: 'blur(60px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '0.5rem',
    minWidth: '180px',
    zIndex: 1000,
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.8)'
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    color: '#ffffff',
    fontSize: '0.875rem'
  },
  selectionControls: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
    flexWrap: 'wrap' as const
  },
  badge: {
    padding: '0.5rem 1rem',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    color: '#3b82f6',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  badgeGreen: {
    background: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    color: '#10b981'
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    position: 'relative' as const,
    zIndex: 1
  },
  playerRow: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '16px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },
  playerRowLocked: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '16px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    position: 'relative' as const,
    opacity: 0.7
  },
  lockOverlay: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    zIndex: 2
  },
  lockIcon: {
    width: '40px',
    height: '40px',
    marginBottom: '0.5rem'
  },
  lockText: {
    color: '#f59e0b',
    fontSize: '0.8125rem',
    fontWeight: '600'
  },
  playerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    accentColor: '#3b82f6'
  },
  playerInfo: {
    minWidth: 0
  },
  playerName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '0.125rem',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  teamName: {
    fontSize: '0.8125rem',
    color: 'rgba(255, 255, 255, 0.6)'
  },
  posBadge: {
    padding: '0.375rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  injuryBadge: {
    padding: '0.25rem 0.5rem',
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    borderRadius: '6px',
    fontSize: '0.6875rem',
    fontWeight: '700'
  },
  playerRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  points: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  boost: {
    fontSize: '0.8125rem',
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    color: 'rgba(255, 255, 255, 0.5)'
  }
}

const modalStyles = {
  overlay: {
    display: 'flex',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  },
  content: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '24px',
    padding: '2rem',
    maxWidth: '90%',
    width: '700px',
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    position: 'relative' as const,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  },
  close: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.7)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.25rem',
    transition: 'all 0.2s'
  },
  header: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
  },
  playerName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '0.5rem'
  },
  playerInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.875rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  statBox: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '1rem'
  },
  statLabel: {
    fontSize: '0.6875rem',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.5rem'
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  section: {
    marginBottom: '1.5rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '1rem'
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#60a5fa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '1rem'
  },
  historicalSummary: {
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  historicalStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  historicalLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.875rem'
  },
  historicalValue: {
    fontWeight: '700',
    fontSize: '1rem'
  },
  weeklyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem'
  },
  weekRow: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '0.75rem'
  },
  weekLabel: {
    color: '#60a5fa',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },
  weekStats: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.8125rem'
  },
  weekStat: {
    color: 'rgba(255, 255, 255, 0.7)'
  },
  weekDiff: {
    fontWeight: '700'
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
    paddingBottom: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
  },
  comparisonName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '0.25rem'
  },
  comparisonInfo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem'
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
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '0.8125rem',
    color: 'rgba(255, 255, 255, 0.8)'
  }
}
