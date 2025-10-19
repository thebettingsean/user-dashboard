'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '@/lib/hooks/useSubscription'

const API_URL = '/api/anytime-td'

interface Player {
  player_name: string
  team: string
  game: string
  commence_time?: string
  book?: {
    odds_american: number
  }
  adjusted?: {
    fair_odds_american: number
    probability_pct: number
  }
  edge?: {
    probability_points_pct: number
  }
}

interface TeamData {
  team: string
  totalEdge: number
  players: Player[]
}

type FilterMode = 'all' | 'top-team' | 'plus-money'

export default function AnytimeTDPage() {
  const { isSignedIn } = useUser()
  const { hasAccess: userHasAccess, isLoading: subLoading } = useSubscription()

  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [currentFilter, setCurrentFilter] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')

  console.log('AnytimeTDPage component rendered')
  console.log('subLoading:', subLoading, 'loading:', loading, 'allPlayers.length:', allPlayers.length)
  console.log('userHasAccess:', typeof userHasAccess === 'function' ? userHasAccess() : userHasAccess)
  console.log('isSignedIn:', isSignedIn)
  console.log('currentFilter:', currentFilter, 'searchQuery:', searchQuery)

  // Fetch data
  useEffect(() => {
    console.log('useEffect running - fetching data')
    fetchData()
    const interval = setInterval(fetchData, 3600000) // Refresh every hour
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      console.log('Fetching TD data from:', API_URL)
      const res = await fetch(API_URL)
      
      console.log('Response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('API error:', errorText)
        throw new Error(`Failed to fetch: ${res.status}`)
      }

      const data = await res.json()
      console.log('Received data:', data)
      console.log('Players count:', data.players?.length || 0)

      if (data.error) {
        console.error('API returned error:', data.error, data.details)
        throw new Error(data.error)
      }

      const players = (data.players || [])
        .filter((p: Player) => (p?.edge?.probability_points_pct ?? 0) > 0)
        .sort((a: Player, b: Player) => 
          (b.edge?.probability_points_pct ?? 0) - (a.edge?.probability_points_pct ?? 0)
        )

      console.log('Filtered players with edge:', players.length)
      setAllPlayers(players)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching TD data:', err)
      setLoading(false)
    }
  }

  // Filter and search logic
  const filteredPlayers = useMemo(() => {
    let list = allPlayers

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      list = list.filter(p =>
        (p.player_name || '').toLowerCase().includes(query) ||
        (p.team || '').toLowerCase().includes(query)
      )
    }

    // Apply filter
    if (currentFilter === 'plus-money') {
      list = list.filter(p => Number(p?.book?.odds_american) > 0)
        .sort((a, b) => (b.edge?.probability_points_pct ?? 0) - (a.edge?.probability_points_pct ?? 0))
    }

    return list
  }, [allPlayers, searchQuery, currentFilter])

  // Top Team aggregation
  const topTeams = useMemo(() => {
    const byTeam = new Map<string, TeamData>()
    
    for (const p of filteredPlayers) {
      const team = p.team || 'Unknown'
      const edge = Number(p?.edge?.probability_points_pct) || 0
      if (edge <= 0) continue
      
      if (!byTeam.has(team)) {
        byTeam.set(team, { team, totalEdge: 0, players: [] })
      }
      const entry = byTeam.get(team)!
      entry.totalEdge += edge
      entry.players.push(p)
    }

    return Array.from(byTeam.values())
      .sort((a, b) => b.totalEdge - a.totalEdge)
  }, [filteredPlayers])

  console.log('filteredPlayers.length:', filteredPlayers.length)
  console.log('topTeams.length:', topTeams.length)
  console.log('Will render?', !(loading && allPlayers.length === 0))

  // Helper functions
  const formatAmericanOdds = (odds: number | undefined) => {
    if (!odds || !Number.isFinite(odds)) return '-'
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  const formatGameTime = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getHeatClass = (edge: number) => {
    if (edge >= 8) return 'heat-extreme'
    if (edge >= 5) return 'heat-high'
    if (edge >= 3) return 'heat-medium'
    return 'heat-low'
  }

  // Only show loading if we're actually loading AND don't have data yet
  if (loading && allPlayers.length === 0) {
    return (
      <div style={styles.page} className="td-page-mobile">
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading TD data...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page} className="td-page-mobile">
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>Anytime TD Analyzer</h1>
          <p style={styles.subtitle}>We simulate the game to bring you the real TD odds</p>
        </header>

        {/* Controls */}
        <div style={styles.controls}>
          <select
            style={styles.filterSelect}
            value={currentFilter}
            onChange={(e) => setCurrentFilter(e.target.value as FilterMode)}
            aria-label="Filter"
          >
            <option value="all">ALL</option>
            <option value="top-team">Top Team</option>
            <option value="plus-money">+Money TD</option>
          </select>

          <input
            style={styles.searchInput}
            type="search"
            placeholder="Search player (e.g., Tyreek Hill)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search player"
          />
        </div>

        {/* Main Grid */}
        {currentFilter === 'top-team' ? (
          // Top Team View (single column)
          <div style={styles.gridSingle}>
            {topTeams.length === 0 ? (
              <div style={styles.empty}>No teams with positive combined edge.</div>
            ) : (
              topTeams.map((teamData, idx) => (
                <TeamCard key={teamData.team} teamData={teamData} index={idx} formatAmericanOdds={formatAmericanOdds} />
              ))
            )}
          </div>
        ) : (
          // Players View (responsive grid)
          <div style={styles.grid}>
            {filteredPlayers.length === 0 ? (
              <div style={styles.empty}>No players match your filters.</div>
            ) : (
              filteredPlayers.map((player, idx) => (
                <PlayerCard
                  key={`${player.player_name}-${idx}`}
                  player={player}
                  index={idx}
                  formatAmericanOdds={formatAmericanOdds}
                  formatGameTime={formatGameTime}
                  getHeatClass={getHeatClass}
                />
              ))
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .player-card,
        .team-card {
          animation: cardFadeIn 0.5s ease-out forwards;
        }

        /* Mobile responsive adjustments */
        @media (max-width: 767px) {
          * {
            box-sizing: border-box !important;
          }

          body, html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .td-page-mobile {
            padding-top: 7rem !important;
          }
        }
      `}</style>
    </div>
  )
}

function PlayerCard({
  player,
  index,
  formatAmericanOdds,
  formatGameTime,
  getHeatClass
}: {
  player: Player
  index: number
  formatAmericanOdds: (odds: number | undefined) => string
  formatGameTime: (dateString: string) => string
  getHeatClass: (edge: number) => string
}) {
  const edge = Number(player?.edge?.probability_points_pct) || 0
  const heatClass = getHeatClass(edge)
  const isTopFive = index <= 4

  const americanOdds = formatAmericanOdds(player?.book?.odds_american)
  const fairOdds = formatAmericanOdds(player?.adjusted?.fair_odds_american)
  const trueProb = player?.adjusted?.probability_pct ?? null

  return (
    <div
      className={`player-card ${heatClass}`}
      style={{
        ...styles.card,
        ...(isTopFive ? styles.cardTopFive : {}),
        animationDelay: `${index * 0.08}s`
      }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.playerInfo}>
          <div style={styles.playerName} title={player.player_name || ''}>
            {player.player_name || '-'}
          </div>
          <div style={styles.teamGame}>
            {player.team || '-'} • {player.game || '-'}
          </div>
        </div>
        <div style={styles.edgeBadge}>
          <span style={styles.edgeLabel}>Edge</span>
          <span style={styles.edgeValue}>+{edge.toFixed(2)}%</span>
        </div>
      </div>

      <div style={styles.oddsGrid}>
        <div style={styles.oddsItem}>
          <div style={styles.oddsLabel}>Book Odds</div>
          <div style={styles.oddsValue}>{americanOdds}</div>
        </div>
        <div style={styles.oddsItem}>
          <div style={styles.oddsLabel}>True TD Odds</div>
          <div style={styles.oddsValue}>{fairOdds}</div>
        </div>
        <div style={styles.oddsItem}>
          <div style={styles.oddsLabel}>True Prob</div>
          <div style={styles.oddsValue}>
            {trueProb !== null ? `${trueProb.toFixed(1)}%` : '-'}
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamCard({
  teamData,
  index,
  formatAmericanOdds
}: {
  teamData: TeamData
  index: number
  formatAmericanOdds: (odds: number | undefined) => string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isTopThree = index <= 2

  return (
    <div
      className="team-card"
      style={{
        ...styles.teamCard,
        ...(isTopThree ? styles.cardTopFive : {}),
        animationDelay: `${index * 0.06}s`
      }}
    >
      <div style={styles.teamRow}>
        <div>
          <div style={styles.teamName}>{teamData.team}</div>
          <div style={styles.teamMeta}>
            {teamData.players.length} player{teamData.players.length > 1 ? 's' : ''} with edge
          </div>
        </div>
        <div style={styles.teamEdge}>Σ Edge +{teamData.totalEdge.toFixed(2)}%</div>
      </div>

      <div style={styles.teamDetails}>
        <div
          style={styles.teamSummary}
          onClick={() => setIsOpen(!isOpen)}
        >
          Show players {isOpen ? '▲' : '▼'}
        </div>
        {isOpen && (
          <div style={styles.teamPlayersList}>
            {teamData.players
              .sort((a, b) => 
                (b.edge?.probability_points_pct ?? 0) - (a.edge?.probability_points_pct ?? 0)
              )
              .map((p, idx) => {
                const fairOdds = formatAmericanOdds(p?.adjusted?.fair_odds_american)
                const edgePct = `+${Number(p?.edge?.probability_points_pct || 0).toFixed(2)}%`
                return (
                  <div key={idx} style={styles.teamPlayer}>
                    <div style={styles.teamPlayerName} title={p.player_name || ''}>
                      {p.player_name || '-'}
                    </div>
                    <div style={styles.teamPlayerOdds}>{fairOdds}</div>
                    <div style={styles.teamPlayerEdge}>{edgePct}</div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '10rem 0.75rem 2rem 0.75rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#ffffff',
    width: '100%',
    background: 'transparent',
    overflowX: 'hidden' as const,
    margin: 0
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    position: 'relative' as const,
    zIndex: 1,
    overflowX: 'hidden' as const
  },
  loading: {
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  spinner: {
    display: 'inline-block',
    width: '36px',
    height: '36px',
    border: '3px solid rgba(96, 165, 250, 0.2)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem',
    width: '100%',
    margin: '0 auto 3rem auto',
    animation: 'fadeInUp 0.8s ease-out'
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #e5e7eb, #ffffff)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.9rem',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    margin: '0 auto 0.9rem auto',
    width: '100%'
  },
  subtitle: {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#60a5fa',
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.5rem'
  },
  controls: {
    display: 'flex',
    gap: '0.75rem',
    margin: '1.25rem 0 0',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    animation: 'fadeInUp 0.9s ease-out'
  },
  filterSelect: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    color: '#e5e7eb',
    borderRadius: '12px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.85rem',
    outline: 'none',
    minHeight: '40px',
    cursor: 'pointer',
    boxSizing: 'border-box' as const
  },
  searchInput: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    color: '#e5e7eb',
    borderRadius: '12px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.85rem',
    outline: 'none',
    minHeight: '40px',
    width: 'min(520px, 92vw)',
    boxSizing: 'border-box' as const
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
    marginTop: '1.25rem'
  },
  gridSingle: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    marginTop: '1.25rem'
  },
  card: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    borderRadius: '18px',
    padding: '1rem',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    opacity: 0,
    transform: 'translateY(24px)'
  },
  cardTopFive: {
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(34, 197, 94, 0.22) 45%, rgba(22, 163, 74, 0.28) 100%)',
    borderColor: '#16a34a'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.6rem',
    gap: '0.75rem'
  },
  playerInfo: {
    flex: 1,
    minWidth: 0
  },
  playerName: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '0.15rem',
    lineHeight: 1.15,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  teamGame: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    lineHeight: 1.2
  },
  edgeBadge: {
    background: 'rgba(22, 163, 74, 0.12)',
    border: '1px solid rgba(22, 163, 74, 0.4)',
    borderRadius: '16px',
    padding: '0.25rem 0.5rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    whiteSpace: 'nowrap' as const
  },
  edgeLabel: {
    fontSize: '0.65rem',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  edgeValue: {
    fontSize: '0.95rem',
    fontWeight: '800',
    color: '#16a34a'
  },
  oddsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginTop: '0.5rem'
  },
  oddsItem: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    padding: '0.5rem 0.55rem'
  },
  oddsLabel: {
    color: '#9ca3af',
    fontSize: '0.6rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: '0.15rem'
  },
  oddsValue: {
    color: '#e5e7eb',
    fontSize: '0.9rem',
    fontWeight: '700',
    lineHeight: 1
  },
  teamCard: {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    borderRadius: '18px',
    padding: '0.95rem 1rem',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    opacity: 0,
    transform: 'translateY(24px)'
  },
  teamRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem'
  },
  teamName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: '1rem'
  },
  teamMeta: {
    color: '#9ca3af',
    fontSize: '0.8rem'
  },
  teamEdge: {
    color: '#16a34a',
    fontWeight: '800',
    fontSize: '1rem'
  },
  teamDetails: {
    marginTop: '0.6rem',
    paddingTop: '0.6rem',
    borderTop: '1px dashed rgba(255, 255, 255, 0.12)'
  },
  teamSummary: {
    cursor: 'pointer',
    color: '#60a5fa',
    fontWeight: '700',
    fontSize: '0.85rem',
    userSelect: 'none' as const
  },
  teamPlayersList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.45rem',
    marginTop: '0.6rem'
  },
  teamPlayer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.55rem 0.6rem',
    borderRadius: '10px',
    background: 'rgba(0, 0, 0, 0.18)',
    border: '1px solid rgba(59, 130, 246, 0.25)'
  },
  teamPlayerName: {
    color: '#e5e7eb',
    fontWeight: '700',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1
  },
  teamPlayerOdds: {
    color: '#e5e7eb',
    fontSize: '0.9rem',
    fontWeight: '700'
  },
  teamPlayerEdge: {
    color: '#16a34a',
    fontWeight: '800',
    fontSize: '0.9rem'
  },
  empty: {
    textAlign: 'center' as const,
    padding: '3rem',
    color: '#9ca3af'
  }
}

