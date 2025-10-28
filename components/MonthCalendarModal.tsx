'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DailySummary {
  [date: string]: {
    count: number
    units: number
  }
}

interface MonthCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  currentMonth: number
  currentYear: number
  onDateSelect: (date: string) => void
}

export default function MonthCalendarModal({
  isOpen,
  onClose,
  currentMonth,
  currentYear,
  onDateSelect
}: MonthCalendarModalProps) {
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [dailySummary, setDailySummary] = useState<DailySummary>({})
  const [monthTotal, setMonthTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchMonthData()
    }
  }, [isOpen, month, year])

  const fetchMonthData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/picks/month-summary?year=${year}&month=${month}`)
      const data = await response.json()
      
      setDailySummary(data.dailySummary || {})
      setMonthTotal(data.monthTotal || 0)
    } catch (error) {
      console.error('Error fetching month data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onDateSelect(dateStr)
    onClose()
  }

  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = () => {
    return new Date(year, month, 1).getDay() // 0 = Sunday
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']

  const today = new Date()
  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  if (!isOpen) return null

  const daysInMonth = getDaysInMonth()
  const firstDay = getFirstDayOfMonth()
  const days = []

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} style={emptyDayStyle} />)
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayData = dailySummary[dateStr]
    const pickCount = dayData?.count || 0
    const units = dayData?.units || 0
    const hasData = pickCount > 0

    days.push(
      <div
        key={day}
        onClick={() => hasData && handleDateClick(day)}
        style={getDayStyle(hasData, isToday(day), units)}
      >
        <div style={dayNumberStyle}>{day}</div>
        {hasData && (
          <div style={getUnitsStyle(units)}>
            {units > 0 ? '+' : ''}{units.toFixed(1)}u
          </div>
        )}
      </div>
    )
  }

  const modalContent = (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header with arrows */}
        <div style={headerStyle}>
          <button onClick={handlePrevMonth} style={navButtonStyle}>
            <ChevronLeft size={16} />
          </button>
          <h3 style={monthTitleStyle}>
            {monthNames[month]} '{String(year).slice(2)}
          </h3>
          <button onClick={handleNextMonth} style={navButtonStyle}>
            <ChevronRight size={16} />
          </button>
        </div>

        <button onClick={onClose} style={closeButtonStyle}>
          <X size={18} />
        </button>

        {/* Day labels */}
        <div style={weekdayLabelsStyle}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={weekdayLabelStyle}>{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
            Loading...
          </div>
        ) : (
          <div style={calendarGridStyle}>
            {days}
          </div>
        )}

        {/* Month total */}
        <div style={monthTotalStyle}>
          <span style={{ opacity: 0.7 }}>Month Total:</span>
          <span style={{ 
            fontWeight: '700', 
            fontSize: '1.1rem',
            color: monthTotal >= 0 ? '#10b981' : '#ef4444'
          }}>
            {monthTotal >= 0 ? '+' : ''}{monthTotal.toFixed(1)}u
          </span>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

// Styles
const modalOverlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem'
}

const modalContentStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '20px',
  padding: '1.5rem',
  maxWidth: '500px',
  width: '95%',
  maxHeight: '90vh',
  overflowY: 'auto' as const,
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
  color: '#fff',
  position: 'relative' as const
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1rem',
  paddingRight: '2.5rem' // Space for close button
}

const monthTitleStyle = {
  fontSize: '1rem',
  fontWeight: '700',
  margin: 0,
  minWidth: '100px',
  textAlign: 'center' as const
}

const navButtonStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#fff',
  transition: 'all 0.2s ease',
  flexShrink: 0
}

const closeButtonStyle = {
  position: 'absolute' as const,
  top: '1rem',
  right: '1rem',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '50%',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#fff',
  transition: 'all 0.2s ease'
}

const weekdayLabelsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '0.25rem',
  marginBottom: '0.5rem'
}

const weekdayLabelStyle = {
  textAlign: 'center' as const,
  fontSize: '0.65rem',
  fontWeight: '600',
  color: 'rgba(255, 255, 255, 0.5)',
  padding: '0.2rem'
}

const calendarGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '0.35rem',
  marginBottom: '1rem'
}

const emptyDayStyle = {
  aspectRatio: '1',
  minHeight: '50px'
}

const getDayStyle = (hasData: boolean, isToday: boolean, units: number) => ({
  aspectRatio: '1',
  minHeight: '50px',
  background: isToday
    ? 'rgba(59, 130, 246, 0.2)'
    : hasData
    ? units >= 0
      ? 'rgba(16, 185, 129, 0.1)'
      : 'rgba(239, 68, 68, 0.1)'
    : 'rgba(255, 255, 255, 0.03)',
  border: isToday
    ? '1.5px solid rgba(59, 130, 246, 0.6)'
    : hasData
    ? units >= 0
      ? '1px solid rgba(16, 185, 129, 0.3)'
      : '1px solid rgba(239, 68, 68, 0.3)'
    : '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative' as const,
  cursor: hasData ? 'pointer' : 'default',
  transition: 'all 0.2s ease',
  padding: '0.2rem'
})

const dayNumberStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  marginBottom: '0.1rem'
}

const getUnitsStyle = (units: number) => ({
  fontSize: '0.6rem',
  fontWeight: '700',
  color: units >= 0 ? '#10b981' : '#ef4444'
})

const monthTotalStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  marginTop: '1rem'
}

