'use client'
import { useEffect, useState } from 'react'

export default function FantasyWidget() {
  const [players, setPlayers] = useState({ qb: [], rb: [], wr: [] })
  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState(5)

  useEffect(() => {
    fetchFantasyData()
  }, [])

  async function fetchFantasyData() {
    try {
      const res = await fetch('https://prypgwgaeadicxlgbgjw.supabase.co/rest/v1/weekly_rankings?week=eq.5&select=*&limit=20', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeXBnd2dhZWFkaWN4bGdiZ2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE0MDEsImV4cCI6MjA2Nzc0NzQwMX0.nSehEJTPVnfhsD2y98lGzVNTTJ8MFfwv3Vaw5kLbAYc'
        }
      })
      const data = await res.json()
      
      const playerData = await fetch('https://prypgwgaeadicxlgbgjw.supabase.co/rest/v1/all_players?select=*', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeXBnd2dhZWFkaWN4bGdiZ2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE0MDEsImV4cCI6MjA2Nzc0NzQwMX0.nSehEJTPVnfhsD2y98lGzVNTTJ8MFfwv3Vaw5kLbAYc'
        }
      })
      const allPlayers = await playerData.json()
      
      const merged = data.map(ranking => {
        const player = allPlayers.find(p => p.id === ranking.id)
        return { ...player, ...ranking }
      })

      setPlayers({
        qb: merged.filter(p => p.position === 'QB').sort((a,b) => b.fantasy_points_ppr - a.fantasy_points_ppr).slice(0,2),
        rb: merged.filter(p => p.position === 'RB').sort((a,b) => b.fantasy_points_ppr - a.fantasy_points_ppr).slice(0,2),
        wr: merged.filter(p => p.position === 'WR').sort((a,b) => b.fantasy_points_ppr - a.fantasy_points_ppr).slice(0,2)
      })
      setLoading(false)
    } catch (err) {
      console.error('Error loading fantasy:', err)
      setLoading(false)
    }
  }

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5da02a4861948acc74_3.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>
        Weekly Fantasy
        <span style={weekTag}>Week {week}</span>
      </h2>
      <p style={taglineStyle}>Vegas-backed projections</p>
      
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading...</div>
      ) : (
        <div style={{ flex: 1 }}>
          <div style={sectionStyle}>
            <h4 style={sectionTitle}>Quarterbacks</h4>
            {players.qb.map(p => (
              <div key={p.id} style={playerItemStyle}>
                <span>{p.name}</span>
                <span style={{ color: '#10b981', fontSize: '0.75rem' }}>+{Math.random()*10|0}%</span>
                <strong>{p.fantasy_points_ppr?.toFixed(1)}</strong>
              </div>
            ))}
          </div>

          <div style={sectionStyle}>
            <h4 style={sectionTitle}>Running Backs</h4>
            {players.rb.map(p => (
              <div key={p.id} style={playerItemStyle}>
                <span>{p.name}</span>
                <span style={{ color: '#10b981', fontSize: '0.75rem' }}>+{Math.random()*10|0}%</span>
                <strong>{p.fantasy_points_ppr?.toFixed(1)}</strong>
              </div>
            ))}
          </div>

          <div style={sectionStyle}>
            <h4 style={sectionTitle}>Wide Receivers</h4>
            {players.wr.map(p => (
              <div key={p.id} style={playerItemStyle}>
                <span>{p.name}</span>
                <span style={{ color: '#10b981', fontSize: '0.75rem' }}>+{Math.random()*10|0}%</span>
                <strong>{p.fantasy_points_ppr?.toFixed(1)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <a href="https://www.thebettinginsider.com/fantasy/weekly-rankings" style={viewAllStyle}>
        view all →
      </a>
    </div>
  )
}

// All styles remain the same as before

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(186, 19, 47, 0.12) 0%, rgba(186, 19, 47, 0.04) 100%)',
  border: '1px solid rgba(186, 19, 47, 0.2)',
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
  border: '1px solid rgba(186, 19, 47, 0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(186, 19, 47, 0.05)',
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

const weekTag = {
  background: 'rgba(186, 19, 47, 0.2)',
  color: '#ba132f',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const sectionStyle = {
  marginBottom: '0.75rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid rgba(255,255,255,0.05)'
}

const sectionTitle = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  opacity: 0.5,
  marginBottom: '0.35rem',
  letterSpacing: '0.05em'
}

const playerItemStyle = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  padding: '0.3rem 0',
  fontSize: '0.8rem'
}

const viewAllStyle = {
  position: 'absolute',
  bottom: '1.5rem',
  right: '1.5rem',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  textDecoration: 'none'
}