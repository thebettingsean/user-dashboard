'use client'

import { useState, useEffect } from 'react'
import { client } from '../sanity/lib/client'
import { latestReportQuery } from '../sanity/lib/queries'

interface Report {
  _id: string
  title: string
  slug: { current: string }
  author: string
  publishDate: string
  summary: string
}

export default function NewsWidget() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      try {
        const data = await client.fetch(latestReportQuery)
        setReport(data)
      } catch (error) {
        console.error('Error fetching report:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  const reportUrl = report ? `/weekly-report/${report.slug.current}` : 'https://www.thebettinginsider.com/blog'

  // Calculate week range
  let weekRange = ''
  if (report) {
    const publishDate = new Date(report.publishDate)
    const endDate = new Date(publishDate)
    endDate.setDate(publishDate.getDate() + 6)
    weekRange = `${publishDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${endDate.getDate()}`
  }

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>
        {loading ? 'Loading...' : report ? report.title : 'Stay in the Know'}
        {report && <span style={dateTag}>{weekRange}</span>}
      </h2>
      <p style={taglineStyle}>
        {report ? `By ${report.author}` : 'Our outlook on the week'}
      </p>
      
      <div style={{ flex: 1 }}>
        <div style={sectionStyle}>
          <p style={{ fontSize: '0.85rem', lineHeight: '1.5', opacity: 0.85 }}>
            {loading ? 'Loading report...' : report ? report.summary : 'No report available this week.'}
          </p>
        </div>
      </div>
      
      <a href={reportUrl} style={viewAllStyle}>
        {report ? 'read full report →' : 'read more →'}
      </a>
    </div>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(100, 100, 100, 0.15) 50%, rgba(0, 0, 0, 0.3) 100%)',
  backgroundSize: '200% 200%',
  animation: 'gradientShift 8s ease infinite',
  backdropFilter: 'blur(35px) saturate(180%)',
  WebkitBackdropFilter: 'blur(35px) saturate(180%)',
  border: 'none',
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative' as const,
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const iconWrapper = {
  position: 'absolute' as const,
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
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
}

const dateTag = {
  background: 'rgba(56, 182, 255, 0.2)',
  color: '#38b6ff',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700'
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

const viewAllStyle = {
  position: 'absolute' as const,
  bottom: '1.5rem',
  right: '1.5rem',
  left: '1.5rem',
  textAlign: 'center' as const,
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  fontWeight: '600',
  textDecoration: 'none',
  marginTop: '1rem'
}