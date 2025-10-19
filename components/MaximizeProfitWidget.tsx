'use client'

export default function MaximizeProfitWidget() {
  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e5660d5f68b1cd1592e_10.svg" 
          style={{ width: '36px', height: '36px' }} 
          alt="Maximize Profit" 
        />
      </div>
      
      <h2 style={titleStyle}>
        Maximize Profit
      </h2>
      
      <p style={taglineStyle}>
        Learn how to win with our tools
      </p>

      <div style={{ flex: 1 }}>
        <div style={contentBoxStyle}>
          <p style={comingSoonTextStyle}>
            Content coming soon
          </p>
        </div>
      </div>
    </div>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(50px) saturate(180%)',
  WebkitBackdropFilter: 'blur(50px) saturate(180%)',
  borderRadius: '20px',
  padding: '1.5rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  minHeight: '320px',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const iconWrapper = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(0, 87, 45, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 87, 45, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(0, 87, 45, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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

const contentBoxStyle = {
  padding: '1rem',
  background: 'rgba(0, 87, 45, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '10px',
  border: '1px solid rgba(0, 87, 45, 0.3)',
  textAlign: 'center' as const,
  boxShadow: '0 2px 8px rgba(0, 87, 45, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
}

const comingSoonTextStyle = {
  fontSize: '0.8rem', 
  opacity: 0.6,
  margin: 0,
  color: '#fff'
}

