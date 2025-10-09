export default function NewsWidget() {
  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>Stay in the Know</h2>
      <p style={taglineStyle}>Our outlook on the week</p>
      
      <div style={{ flex: 1 }}>
        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Macro Trends</h4>
          <p style={{ fontSize: '0.75rem', lineHeight: '1.4', opacity: 0.8 }}>
            Unders hitting at 58% in primetime games. Road favorites struggling ATS, especially in divisional matchups. 
            Weather systems moving through midwest stadiums this weekend.
          </p>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitle}>Goals</h4>
          <p style={{ fontSize: '0.75rem', lineHeight: '1.4', opacity: 0.8 }}>
            Target 2-3 high confidence plays daily. Focus on player props with 60%+ historical hit rates. 
            Avoid parlays over 3 legs. Track all plays for weekly review.
          </p>
        </div>
      </div>
      
      <a href="https://www.thebettinginsider.com/blog" style={viewAllStyle}>
        read more →
      </a>
    </div>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(56, 182, 255, 0.12) 0%, rgba(56, 182, 255, 0.04) 100%)',
  border: '1px solid rgba(56, 182, 255, 0.2)',
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
  border: '1px solid rgba(56, 182, 255, 0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(56, 182, 255, 0.05)',
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
  marginTop: '1rem'
}