'use client'

export default function PlaceholderWidget({ title }: { title: string }) {
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
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff'
  }

  return (
    <div style={widgetStyle}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem', opacity: 0.9 }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', opacity: 0.6, textAlign: 'center' }}>
        Coming Soon
      </p>
    </div>
  )
}

