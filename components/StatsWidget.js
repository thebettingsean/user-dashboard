export default function StatsWidget() {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })  // ADD THIS
  
  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de02c7e090d456d83b06c6_2.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>
        Top Trends
        <span style={dateTag}>{today}</span> 
      </h2>
      <p style={taglineStyle}>Ref, public betting, and more!</p>
      
      <div style={{ flex: 1 }}>
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Public Betting</h4>
          <div style={statItemStyle}>
            <span style={{ fontSize: '0.8rem' }}>Vegas backed:</span>
            <strong style={{ fontSize: '0.85rem' }}>Cowboys ML (Strong)</strong>
          </div>
          <div style={statItemStyle}>
            <span style={{ fontSize: '0.8rem' }}>Big Money:</span>
            <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>Lions -7.5 (+63%)</strong>
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Referees</h4>
          <div style={statItemStyle}>
            <span style={{ fontSize: '0.8rem' }}>LAR/SEA • Johnson</span>
            <strong style={{ fontSize: '0.85rem' }}>Under</strong>
          </div>
          <div style={statItemStyle}>
            <span style={{ fontSize: '0.8rem' }}>KC/BUF • Smith</span>
            <strong style={{ fontSize: '0.85rem' }}>Over</strong>
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Hit Rates</h4>
          <div style={statItemStyle}>
            <span style={{ fontSize: '0.8rem' }}>Hill • Rec Over</span>
            <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>8-2</strong>
          </div>
          <div style={statItemStyle}>
            <span style={{ fontSize: '0.8rem' }}>Allen • Pass TD</span>
            <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>7-3</strong>
          </div>
        </div>
      </div>
      
      <a href="https://app.thebettinginsider.com" style={viewAllStyle}>
        All top trends →
      </a>
    </div>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(24, 118, 53, 0.12) 0%, rgba(24, 118, 53, 0.04) 100%)',
  border: '1px solid rgba(24, 118, 53, 0.2)',
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
  color: '#fff'
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
  textTransform: 'uppercase',
  opacity: 0.5,
  marginBottom: '0.5rem',
  letterSpacing: '0.05em'
}

const statItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.35rem 0'
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

const dateTag = {
  background: 'rgba(24, 118, 53, 0.2)',
  color: '#187635',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700',
  marginLeft: '0.5rem'
}