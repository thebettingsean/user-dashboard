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

export default function TDWidget() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(getCurrentNFLWeek())

  useEffect(() => {
    setCurrentWeek(getCurrentNFLWeek())
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
    <>
      <a href="/anytime-td" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', color: 'inherit' }}>
        <div style={widgetStyle}>
        <div style={iconWrapper}>
          <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5dd3c882be50e10645_4.svg" 
               style={{ width: '36px', height: '36px' }} alt="" />
        </div>
        
        <h2 style={titleStyle}>
          Anytime TD Leaders
          <span style={weekTag}>Week {currentWeek}</span>  
        </h2>
        <p style={taglineStyle}>Best value touchdown plays</p>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading...</div>
        ) : (
          <div style={{ marginBottom: '1rem', flex: 1, paddingBottom: '1rem' }}>
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
      </div>
    </a>
    </>
  )
}

const widgetStyle = {
  // PROPER GLASSMORPHISM:
  background: 'rgba(255, 255, 255, 0.05)', // Only 5% fill opacity
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '0.5px solid rgba(255, 255, 255, 0.08)', // Ultra-thin barely visible outline
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative',
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
}

const iconWrapper = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(255, 117, 31, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255, 117, 31, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(255, 117, 31, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
  left: '1.5rem',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  fontWeight: '600',
  textDecoration: 'none',
  marginTop: '1rem'
}

const weekTag = {
  background: 'rgba(255, 117, 31, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#ff751f',
  padding: '0.3rem 0.6rem',
  borderRadius: '6px',
  fontSize: '0.65rem',
  fontWeight: '700',
  border: '1px solid rgba(255, 117, 31, 0.3)',
  boxShadow: '0 2px 8px rgba(255, 117, 31, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
}