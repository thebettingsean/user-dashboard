'use client'

export default function MatchupWidget() {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  
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
      <p style={taglineStyle}>Referee and team statistical edges</p>
      
      <div style={{ flex: 1 }}>
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Top Referee Trends</h4>
          <div style={refItemStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>LAR/SEA • Johnson</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Under 8-2 L10</div>
            </div>
            <div style={trendBadge}>80%</div>
          </div>
          <div style={refItemStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>KC/BUF • Smith</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Over 7-3 L10</div>
            </div>
            <div style={trendBadge}>70%</div>
          </div>
        </div>

        <div style={{...sectionStyle, borderBottom: 'none'}}>
          <h4 style={sectionTitle}>Top Team Trends</h4>
          <div style={teamItemStyle}>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Eagles rush offense</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>#1 vs #28 defense</div>
          </div>
          <div style={teamItemStyle}>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ravens home favorite</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>9-1 ATS L10</div>
          </div>
        </div>
      </div>
      
      <a href="https://app.thebettinginsider.com" style={viewAllStyle}>
        All matchup insights →
      </a>
    </div>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(217, 217, 217, 0.12) 0%, rgba(217, 217, 217, 0.04) 100%)',
  border: '1px solid rgba(217, 217, 217, 0.2)',
  borderRadius: '16px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '48px',
  height: '48px',
  border: '1px solid rgba(217, 217, 217, 0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(217, 217, 217, 0.05)',
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
  background: 'rgba(217, 217, 217, 0.2)',
  color: '#D9D9D9',
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
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(255,255,255,0.05)'
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
  background: 'rgba(217, 217, 217, 0.2)',
  color: '#D9D9D9',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.7rem',
  fontWeight: '700',
  whiteSpace: 'nowrap' as const
}

const teamItemStyle = {
  padding: '0.5rem 0',
  borderBottom: '1px solid rgba(255,255,255,0.03)'
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