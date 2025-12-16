import PublicBettingNavbar from '@/components/PublicBettingNavbar'

export default function PublicBettingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#0a0a0a',
      margin: 0,
      padding: 0
    }}>
      <PublicBettingNavbar />
      <div style={{ paddingTop: '68px' }}>
        {children}
      </div>
    </div>
  )
}

