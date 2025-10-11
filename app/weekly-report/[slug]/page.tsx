import { notFound } from 'next/navigation'
import { client } from '../../../sanity/lib/client'
import { reportBySlugQuery } from '../../../sanity/lib/queries'
import { PortableText } from '@portabletext/react'

interface Report {
  _id: string
  title: string
  slug: { current: string }
  author: string
  publishDate: string
  summary: string
  content: any[]
}

async function getReport(slug: string): Promise<Report | null> {
  return await client.fetch(reportBySlugQuery, { slug })
}

export default async function WeeklyReportPage({ params }: { params: { slug: string } }) {
  const report = await getReport(params.slug)

  if (!report) {
    notFound()
  }

  const publishDate = new Date(report.publishDate)
  const formattedDate = publishDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  // Calculate week range (publish date through 6 days later)
  const endDate = new Date(publishDate)
  endDate.setDate(publishDate.getDate() + 6)
  const weekRange = `${publishDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.weekBadge}>{weekRange}</div>
          <h1 style={styles.title}>{report.title}</h1>
          <p style={styles.meta}>{report.author}, {formattedDate}</p>
        </div>

        {/* Content */}
        <article style={styles.article}>
          <h2 style={styles.sectionTitle}>Summary</h2>
          <div style={styles.summary}>{report.summary}</div>

          <h2 style={styles.sectionTitle}>Report</h2>
          <div style={styles.content}>
            <PortableText value={report.content} />
          </div>
        </article>

        {/* Return Button */}
        <div style={styles.buttonContainer}>
          <a href="https://dashboard.thebettinginsider.com" style={styles.button}>
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #334155 0%, #1f2937 15%, #1f2937 100%)',
    padding: '3rem 1rem',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '3rem',
    textAlign: 'center' as const,
  },
  weekBadge: {
    display: 'inline-block',
    background: 'rgba(56, 182, 255, 0.2)',
    color: '#38b6ff',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: '800',
    color: 'white',
    marginBottom: '1rem',
    lineHeight: '1.2',
  },
  meta: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  article: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '2.5rem',
    color: 'white',
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '1.5rem',
    marginTop: '2.5rem',
  },
  summary: {
    fontSize: '1.05rem',
    lineHeight: '1.8',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: '1rem',
  },
  content: {
    fontSize: '1.05rem',
    lineHeight: '1.8',
    color: 'rgba(255,255,255,0.85)',
  },
  buttonContainer: {
    textAlign: 'center' as const,
    marginTop: '3rem',
  },
  button: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, rgba(56, 182, 255, 0.3) 0%, rgba(56, 182, 255, 0.2) 100%)',
    border: '2px solid rgba(56, 182, 255, 0.8)',
    color: 'white',
    padding: '1rem 2.5rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
}
