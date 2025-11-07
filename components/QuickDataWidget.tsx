'use client'

import { useEffect, useState } from 'react'
import { getSportWidgetLinks } from '@/lib/utils/sportSelector'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface MostPublicBet {
  label: string
  betsPct: number
  dollarsPct: number
}

interface TopTrend {
  type: 'vegas-backed' | 'sharp-money'
  label: string
  value: string
}

interface RefereeTrend {
  game: string
  referee: string
  trend: string
  percentage: number
}

interface QuickDataWidgetData {
  mostPublic: MostPublicBet[]
  topTrends: TopTrend[]
  refereeTrends: RefereeTrend[]
  league: string
}

export default function QuickDataWidget() {
  const [data, setData] = useState<QuickDataWidgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [publicExpanded, setPublicExpanded] = useState(true)
  const [refExpanded, setRefExpanded] = useState(true)
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch both stats and matchup data
        const [statsRes, matchupRes] = await Promise.all([
          fetch('/api/widget-data/stats'),
          fetch('/api/widget-data/matchup')
        ])
        
        const statsData = await statsRes.json()
        const matchupData = await matchupRes.json()
        
        // Combine the data
        setData({
          mostPublic: statsData.mostPublic || [],
          topTrends: statsData.topTrends || [],
          refereeTrends: matchupData.refereeTrends || [],
          league: statsData.league || matchupData.league
        })
      } catch (error) {
        console.error('Error fetching quick data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={widgetStyle}>
        <h2 style={titleStyle}>Quick Data</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={widgetStyle}>
        <h2 style={titleStyle}>Quick Data</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>No data available</p>
      </div>
    )
  }

  const leagueKey = data.league.toLowerCase() as 'nfl' | 'nba' | 'mlb' | 'nhl' | 'cfb'
  const widgetLinks = getSportWidgetLinks(leagueKey)

  // Combine top trends and most public for the first 5 items
  const displayItems = [
    ...data.topTrends.slice(0, 5),
    ...data.mostPublic.slice(0, Math.max(0, 5 - data.topTrends.length))
  ].slice(0, 5)

  return (
    <div style={widgetStyle}>
      <h2 style={titleStyle}>
        Quick Data
        <span style={dateTag}>{today}</span>
      </h2>

      {/* Public Betting Section */}
      <div style={{ marginBottom: '1rem' }}>
        <div
          onClick={() => setPublicExpanded(!publicExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: '0.5rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
            Public Betting | {data.league.toUpperCase()}
          </span>
          {publicExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        {publicExpanded && (
          <div style={{ marginTop: '0.75rem' }}>
            {displayItems.length > 0 ? (
              <>
                {displayItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: idx < displayItems.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    {'type' in item ? (
                      // TopTrend
                      <div>
                        <span style={{ fontWeight: '600', color: '#fff' }}>{item.label}</span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '0.5rem' }}>
                          | {item.type === 'vegas-backed' ? 'Vegas Backed' : 'Sharp Money'} ({item.value})
                        </span>
                      </div>
                    ) : (
                      // MostPublicBet
                      <div>
                        <span style={{ fontWeight: '600', color: '#fff' }}>{item.label}</span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '0.5rem' }}>
                          | {item.betsPct}% bets, {item.dollarsPct}% dollars
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <a
                  href={widgetLinks.publicBetting}
                  style={{
                    display: 'inline-block',
                    marginTop: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  View All →
                </a>
              </>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                No public betting data available
              </p>
            )}
          </div>
        )}
      </div>

      {/* Referees Section */}
      <div>
        <div
          onClick={() => setRefExpanded(!refExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: '0.5rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
            Referees | {data.league.toUpperCase()}
          </span>
          {refExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        {refExpanded && (
          <div style={{ marginTop: '0.75rem' }}>
            {data.refereeTrends.length > 0 ? (
              <>
                {data.refereeTrends.slice(0, 5).map((ref, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: idx < Math.min(data.refereeTrends.length - 1, 4) ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '600', color: '#fff' }}>{ref.referee}</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '0.5rem' }}>
                        - {ref.game}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                      {ref.trend} ({ref.percentage}%)
                    </div>
                  </div>
                ))}
                <a
                  href={widgetLinks.refereeTrends}
                  style={{
                    display: 'inline-block',
                    marginTop: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  View All →
                </a>
              </>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                No referee data available
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const widgetStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '1.25rem',
  color: '#fff'
}

const titleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
}

const dateTag: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: '600',
  color: 'rgba(255, 255, 255, 0.5)',
  background: 'rgba(255, 255, 255, 0.08)',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  marginLeft: 'auto'
}

