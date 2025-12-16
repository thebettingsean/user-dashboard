import PublicBettingNavbar from '@/components/PublicBettingNavbar'

export default function PublicBettingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PublicBettingNavbar />
      <div style={{ paddingTop: '68px' }}>
        {children}
      </div>
    </>
  )
}

