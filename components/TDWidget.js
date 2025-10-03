'use client'
import { useEffect, useState } from 'react'

export default function TDWidget() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const currentWeek = 5

  useEffect(() => {
    fetchTDData()
  }, [])

  async function fetchTDData() {
    try {
      const res = await fetch('https://actual-anytime-touchdown-final-tool-production.up.railway.app/anytime-td-adjusted')
      const data = await res.json()
      
      const sorted = (data.players || [])
        .filter(p => p?.edge?.probability_points_pct > 0)
        .sort((a,b) => b.edge.probability_points_pct - a.edge.probability_points_pct)
        .slice(0, 5)
      
      setPlayers(sorted)
      setLoading(false)
    } catch (err) {
      console.error('Error loading TD data:', err)
      setLoading(false)
    }
  }

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5dd3c882be50e10645_4.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>
        TD Edge Leaders
        <span style={weekTag}>Week {currentWeek}</span>  
      </h2>
      <p style={taglineStyle}>Best value touchdown plays</p>
      
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading...</div>
      ) : (
        <div style={{ marginBottom: '1rem', flex: 1 }}>
          <div style={headerRow}>
            <span>Player</span>
            <span>Odds</span>
            <span>Edge</span>
          </div>
          {players.map((p, idx) => (
            <div key={idx} style={tdItemStyle}>
              <span>{p.player_name}</span>
              <span style={{ fontWeight: '600' }}>{p.book?.odds_american > 0 ? '+' : ''}{p.book?.odds_american}</span>
              <strong style={{ color: '#10b981' }}>+{p.edge?.probability_points_pct?.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      )}
      
      <a href="https://www.thebettinginsider.com/tools/nfl-anytime-td-tool" style={viewAllStyle}>
        view all →
      </a>
    </div>
  )
}

// All styles remain the same as before

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(255, 117, 31, 0.12) 0%, rgba(255, 117, 31, 0.04) 100%)',
  border: '1px solid rgba(255, 117, 31, 0.2)',
  borderRadius: '16px',
  padding: '1.5rem',
  position: 'relative',
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
}

const iconWrapper = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  width: '48px',
  height: '48px',
  border: '1px solid rgba(255, 117, 31, 0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255, 117, 31, 0.05)',
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

const headerRow = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  padding: '0.5rem 0',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  opacity: 0.5,
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  marginBottom: '0.5rem'
}

const tdItemStyle = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  padding: '0.5rem 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: '0.85rem'
}

const viewAllStyle = {
  position: 'absolute',
  bottom: '1.5rem',
  right: '1.5rem',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  textDecoration: 'none'
}

const weekTag = {
  background: 'rgba(255, 117, 31, 0.2)',
  color: '#ff751f',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700',
  marginLeft: '0.5rem'
}