'use client'

import { useEffect, useState } from 'react'

interface RefereeTrend {
  game: string
  referee: string
  trend: string
  percentage: number
}

interface TeamTrend {
  description: string
  matchup: string
}

interface MatchupWidgetData {
  refereeTrends: RefereeTrend[]
  teamTrends: TeamTrend[]
  league: string
}

export default function MatchupWidget() {
  const [data, setData] = useState<MatchupWidgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/widget-data/matchup')
        const widgetData = await response.json()
        setData(widgetData)
      } catch (error) {
        console.error('Error fetching matchup widget data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ee51165777fa2c334aa52b_NEW%20WIDGET%20SVG%27S-4.svg" 
               style={{ width: '36px', height: '36px' }} />
        </div>
        
        <h2 style={titleStyle}>
          Matchup Data
          <span style={dateTag}>{today}</span> 
        </h2>
        <p style={taglineStyle}>Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ee51165777fa2c334aa52b_NEW%20WIDGET%20SVG%27S-4.svg" 
               style={{ width: '36px', height: '36px' }} />
        </div>
        
        <h2 style={titleStyle}>
          Matchup Data
          <span style={dateTag}>{today}</span> 
        </h2>
        <p style={taglineStyle}>No data available</p>
      </div>
    )
  }
  
  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ee51165777fa2c334aa52b_NEW%20WIDGET%20SVG%27S-4.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>
        Matchup Data
        <span style={dateTag}>{today}</span> 
      </h2>
      <p style={taglineStyle}>Referee and team statistical edges • {data.league}</p>
      
      <div style={{ flex: 1 }}>
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Top Referee Trends</h4>
          {data.refereeTrends.map((ref, index) => (
            <div key={index} style={refItemStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {ref.game} • {ref.referee}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{ref.trend}</div>
              </div>
              <div style={trendBadge}>{ref.percentage}%</div>
            </div>
          ))}
        </div>

        <div style={{...sectionStyle, borderBottom: 'none'}}>
          <h4 style={sectionTitle}>Top Team Trends</h4>
          {data.teamTrends.map((team, index) => (
            <div key={index} style={teamItemStyle}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{team.description}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{team.matchup}</div>
            </div>
          ))}
        </div>
      </div>
      
      <a href="https://app.thebettinginsider.com" style={viewAllStyle}>
        All matchup insights →
      </a>
    </div>
  )
}

const widgetStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(35px) saturate(180%)',
  WebkitBackdropFilter: 'blur(35px) saturate(180%)',
  border: '1.5px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(217, 217, 217, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(217, 217, 217, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(217, 217, 217, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  zIndex: 2
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '0.25rem',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
}

const dateTag = {
  background: 'rgba(217, 217, 217, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#f3f4f6',
  padding: '0.3rem 0.6rem',
  borderRadius: '6px',
  fontSize: '0.65rem',
  fontWeight: '700',
  border: '1px solid rgba(217, 217, 217, 0.3)',
  boxShadow: '0 2px 8px rgba(217, 217, 217, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const sectionStyle = {
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  padding: '0.75rem',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.05)'
}

const sectionTitle = {
  fontSize: '0.7rem',
  textTransform: 'uppercase' as const,
  opacity: 0.5,
  marginBottom: '0.5rem',
  letterSpacing: '0.05em'
}

const refItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
  gap: '0.5rem'
}

const trendBadge = {
  background: 'rgba(217, 217, 217, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#f3f4f6',
  padding: '0.35rem 0.65rem',
  borderRadius: '8px',
  fontSize: '0.7rem',
  fontWeight: '700',
  whiteSpace: 'nowrap' as const,
  border: '1px solid rgba(217, 217, 217, 0.3)',
  boxShadow: '0 2px 12px rgba(217, 217, 217, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
}

const teamItemStyle = {
  padding: '0.65rem 0.75rem',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '8px',
  transition: 'all 0.2s',
  cursor: 'pointer'
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