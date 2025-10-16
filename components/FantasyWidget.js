'use client'
import { useEffect, useState } from 'react'

// NFL 2025 Season Schedule
const NFL_SCHEDULE = [
  {
    week: 5,
    start: new Date('2025-09-30'),
    end: new Date('2025-10-06T23:59:59')
  },
  {
    week: 6,
    start: new Date('2025-10-07'),
    end: new Date('2025-10-13T23:59:59')
  },
  {
    week: 7,
    start: new Date('2025-10-14'),
    end: new Date('2025-10-20T23:59:59')
  },
  {
    week: 8,
    start: new Date('2025-10-21'),
    end: new Date('2025-10-27T23:59:59')
  },
  {
    week: 9,
    start: new Date('2025-10-28'),
    end: new Date('2025-11-03T23:59:59')
  },
  {
    week: 10,
    start: new Date('2025-11-04'),
    end: new Date('2025-11-10T23:59:59')
  },
  {
    week: 11,
    start: new Date('2025-11-11'),
    end: new Date('2025-11-17T23:59:59')
  },
  {
    week: 12,
    start: new Date('2025-11-18'),
    end: new Date('2025-11-24T23:59:59')
  },
  {
    week: 13,
    start: new Date('2025-11-25'),
    end: new Date('2025-12-01T23:59:59')
  },
  {
    week: 14,
    start: new Date('2025-12-02'),
    end: new Date('2025-12-08T23:59:59')
  },
  {
    week: 15,
    start: new Date('2025-12-09'),
    end: new Date('2025-12-15T23:59:59')
  },
  {
    week: 16,
    start: new Date('2025-12-16'),
    end: new Date('2025-12-22T23:59:59')
  },
  {
    week: 17,
    start: new Date('2025-12-23'),
    end: new Date('2025-12-29T23:59:59')
  },
  {
    week: 18,
    start: new Date('2025-12-30'),
    end: new Date('2026-01-05T23:59:59')
  }
];

// Function to get current NFL week
function getCurrentNFLWeek() {
  const now = new Date();
  
  for (const weekData of NFL_SCHEDULE) {
    if (now >= weekData.start && now <= weekData.end) {
      return weekData.week;
    }
  }
  
  // Default to week 6 if outside schedule
  return 6;
}

export default function FantasyWidget() {
  const [players, setPlayers] = useState({ qb: [], rb: [], wr: [] })
  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState(getCurrentNFLWeek())

  useEffect(() => {
    fetchFantasyData()
  }, [])

  async function fetchFantasyData() {
    try {
      const currentWeek = getCurrentNFLWeek();
      setWeek(currentWeek);
      
      const res = await fetch(`https://prypgwgaeadicxlgbgjw.supabase.co/rest/v1/weekly_rankings?week=eq.${currentWeek}&select=*&limit=20`, {
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
    <a href="https://www.thebettinginsider.com/fantasy/weekly-rankings" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', color: 'inherit' }}>
      <div style={widgetStyle}>
        <div style={iconWrapper}>
          <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5da02a4861948acc74_3.svg" 
               style={{ width: '36px', height: '36px' }} />
        </div>
        
        <h2 style={titleStyle}>
          Weekly Fantasy
          <span style={weekTag}>Week {week}</span>
        </h2>
        <p style={taglineStyle}>Vegas-backed start/sit tool</p>
        
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

            <div style={{...sectionStyle, borderBottom: 'none', paddingBottom: '1rem'}}>
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
      </div>
    </a>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(50px) saturate(180%)',
  WebkitBackdropFilter: 'blur(50px) saturate(180%)',
  border: 'none',
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative',
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const iconWrapper = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(186, 19, 47, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(186, 19, 47, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(186, 19, 47, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
  background: 'rgba(186, 19, 47, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#ef4444',
  padding: '0.3rem 0.6rem',
  borderRadius: '6px',
  fontSize: '0.65rem',
  fontWeight: '700',
  border: '1px solid rgba(186, 19, 47, 0.3)',
  boxShadow: '0 2px 8px rgba(186, 19, 47, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
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
  left: '1.5rem',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  fontWeight: '600',
  textDecoration: 'none'
}