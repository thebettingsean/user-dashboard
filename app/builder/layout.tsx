'use client'

export default function BuilderLayout({
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
      {children}
    </div>
  )
}

