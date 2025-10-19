'use client'

export default function MaximizeProfitWidget() {
  const widgetStyle = {
    background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    color: '#ffffff',
    paddingBottom: '1rem'
  }

  const iconWrapper = {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'rgba(0, 87, 45, 0.12)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 87, 45, 0.4)',
    boxShadow: '0 4px 12px rgba(0, 87, 45, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem'
  }

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img 
          src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68f51e5660d5f68b1cd1592e_10.svg" 
          style={{ width: '32px', height: '32px' }} 
          alt="Maximize Profit" 
        />
      </div>
      
      <h3 style={{ 
        fontSize: '1.2rem', 
        fontWeight: '700', 
        marginBottom: '0.5rem',
        color: '#ffffff'
      }}>
        Maximize Profit
      </h3>
      
      <p style={{ 
        fontSize: '0.85rem', 
        opacity: 0.7, 
        marginBottom: '1.5rem',
        color: '#ffffff'
      }}>
        Learn how to win with our tools
      </p>

      <div style={{ 
        marginTop: 'auto',
        padding: '1rem',
        background: 'rgba(0, 87, 45, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 87, 45, 0.2)',
        textAlign: 'center' as const
      }}>
        <p style={{ 
          fontSize: '0.85rem', 
          opacity: 0.6,
          margin: 0
        }}>
          Content coming soon
        </p>
      </div>
    </div>
  )
}

