'use client'

import { useState, useEffect } from 'react'

interface TopProp {
  player_name: string
  team: string | null
  prop_description: string
  hit_rate: number
  record: string
  prop_type: string
  line: number
  odds: number
}

interface PropsData {
  props: Array<{ league: string; props: TopProp[] }>
}

export default function TopPropsWidget() {
  const [data, setData] = useState<PropsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/widget-data/props')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching props data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h2 style={titleStyle}>Top Props</h2>
        <p style={taglineStyle}>Loading top player props...</p>
        
        <div style={{ flex: 1 }} />
      </div>
    )
  }

  if (!data || data.props.length === 0) {
    return (
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h2 style={titleStyle}>Top Props</h2>
        <p style={taglineStyle}>No high-value props available today</p>
        
        <div style={{ flex: 1 }} />
      </div>
    )
  }

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      <h2 style={titleStyle}>Top Props</h2>
      <p style={taglineStyle}>Best prop bets for today • 65%+ hit rate</p>

      <div style={{ marginTop: '1rem', flex: 1, overflowY: 'auto' }}>
        {data.props.map((leagueData, idx) => (
          <div key={idx} style={{ marginBottom: idx < data.props.length - 1 ? '1rem' : '0' }}>
            <h3 style={leagueHeaderStyle}>{leagueData.league}</h3>
            
            {leagueData.props.map((prop, propIdx) => (
              <div key={propIdx} style={propItemStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={playerNameStyle}>{prop.player_name}</span>
                      <span style={teamTagStyle}>{prop.team || 'N/A'}</span>
                    </div>
                    <div style={hitRateStyle}>{prop.hit_rate}%</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <div style={propDescStyle}>{prop.prop_description}</div>
                    <div style={recordStyle}>{prop.record}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// STYLES
const widgetStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '0.5px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(139, 92, 246, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(139, 92, 246, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  zIndex: 2,
  color: '#a78bfa'
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '0.25rem',
  color: '#fff',
  paddingRight: '60px'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const leagueHeaderStyle = {
  fontSize: '0.7rem',
  fontWeight: '700',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: '#a78bfa',
  marginBottom: '0.5rem',
  margin: '0 0 0.5rem 0'
}

const propItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
  padding: '0.5rem 0.65rem',
  background: 'rgba(139, 92, 246, 0.08)',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  borderRadius: '8px',
  marginBottom: '0.4rem'
}

const playerNameStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: 'rgba(255, 255, 255, 0.95)'
}

const teamTagStyle = {
  fontSize: '0.65rem',
  fontWeight: '600',
  padding: '2px 6px',
  background: 'rgba(139, 92, 246, 0.2)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  borderRadius: '4px',
  color: '#a78bfa',
  textTransform: 'uppercase' as const
}

const propDescStyle = {
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.7)'
}

const hitRateStyle = {
  fontSize: '0.9rem',
  fontWeight: '700',
  color: '#a78bfa',
  marginBottom: '0.15rem'
}

const recordStyle = {
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.6)'
}

