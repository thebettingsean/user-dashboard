'use client'

export default function SportsEngineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      minHeight: '100vh'
    }}>
      {/* No navbar or footer for this page - using custom top bar instead */}
      {children}
    </div>
  )
}

