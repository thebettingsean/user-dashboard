'use client'

export default function StatsWidget() {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  
  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de02c7e090d456d83b06c6_2.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>
        Public Betting
        <span style={dateTag}>{today}</span> 
      </h2>
      <p style={taglineStyle}>See where the money is going</p>
      
      <div style={{ flex: 1 }}>
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Most Public</h4>
          <div style={publicItemStyle}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Cowboys ML</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>75% of bets, 80% of dollars</div>
            </div>
          </div>
          <div style={publicItemStyle}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Bills -7.5</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>80% of bets, 90% of dollars</div>
            </div>
          </div>
        </div>

        <div style={{...sectionStyle, borderBottom: 'none'}}>
          <h4 style={sectionTitle}>Top Trends</h4>
          <div style={trendItemStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem' }}>Vegas backed:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Jets +3.5</div>
            </div>
            <div style={valueTag}>80% value</div>
          </div>
          <div style={trendItemStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem' }}>Big money:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Giants ML</div>
            </div>
            <div style={sharpTag}>+65% difference</div>
          </div>
        </div>
      </div>
      
      <a href="https://app.thebettinginsider.com" style={viewAllStyle}>
        All public betting insights →
      </a>
    </div>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(24, 118, 53, 0.12) 0%, rgba(24, 118, 53, 0.04) 100%)',
  border: '1px solid rgba(24, 118, 53, 0.2)',
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
  border: '1px solid rgba(24, 118, 53, 0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(24, 118, 53, 0.05)',
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
  background: 'rgba(24, 118, 53, 0.2)',
  color: '#187635',
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

const publicItemStyle = {
  padding: '0.5rem 0',
  borderBottom: '1px solid rgba(255,255,255,0.03)'
}

const trendItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
  gap: '0.5rem'
}

const valueTag = {
  background: 'rgba(59, 130, 246, 0.2)',
  color: '#60a5fa',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700',
  whiteSpace: 'nowrap' as const
}

const sharpTag = {
  background: 'rgba(16, 185, 129, 0.2)',
  color: '#10b981',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700',
  whiteSpace: 'nowrap' as const
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