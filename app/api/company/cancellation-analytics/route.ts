import { NextResponse } from 'next/server'
import { supabaseUsers } from '@/lib/supabase-users'

export async function GET() {
  try {
    console.log('[Cancellation Analytics] Starting data fetch...')
    
    // Fetch all cancellation tracking data
    const { data: cancellations, error } = await supabaseUsers
      .from('cancellation_tracking')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Cancellation Analytics] Supabase error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch data', 
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }
    
    console.log('[Cancellation Analytics] Fetched', cancellations?.length || 0, 'records')
    
    if (!cancellations || cancellations.length === 0) {
      console.log('[Cancellation Analytics] No data found, returning empty response')
      return NextResponse.json({
        success: true,
        kpis: {
          total: 0,
          completed: 0,
          saved: 0,
          saveRate: '0.0',
          firstOfferWinRate: '0.0',
          finalOfferWinRate: '0.0'
        },
        segmentation: {
          trial: { count: 0, saveRate: '0.0' },
          paid: { count: 0, saveRate: '0.0' }
        },
        tenureAnalysis: [],
        reasonAnalysis: [],
        offerPerformance: [],
        timeline: [],
        rawData: []
      })
    }

    // Calculate aggregated metrics
    const total = cancellations.length
    const completed = cancellations.filter(c => c.cancellation_completed).length
    const saved = total - completed
    const saveRate = total > 0 ? (saved / total * 100).toFixed(1) : '0.0'
    
    const firstOfferAccepted = cancellations.filter(c => c.first_offer_accepted).length
    const firstOfferDeclined = cancellations.filter(c => c.first_offer_declined_at !== null).length
    const firstOfferWinRate = firstOfferDeclined > 0 ? (firstOfferAccepted / firstOfferDeclined * 100).toFixed(1) : '0.0'
    
    const finalOfferShown = cancellations.filter(c => c.final_offer_shown).length
    const finalOfferAccepted = cancellations.filter(c => c.final_offer_accepted).length
    const finalOfferWinRate = finalOfferShown > 0 ? (finalOfferAccepted / finalOfferShown * 100).toFixed(1) : '0.0'

    // Segmentation: Trial vs Paid
    const trialCancellations = cancellations.filter(c => c.was_on_trial)
    const paidCancellations = cancellations.filter(c => !c.was_on_trial)
    const trialSaveRate = trialCancellations.length > 0 
      ? ((trialCancellations.filter(c => !c.cancellation_completed).length / trialCancellations.length) * 100).toFixed(1)
      : '0.0'
    const paidSaveRate = paidCancellations.length > 0
      ? ((paidCancellations.filter(c => !c.cancellation_completed).length / paidCancellations.length) * 100).toFixed(1)
      : '0.0'

    // Tenure buckets
    const tenureBuckets = {
      'Same Day (0)': cancellations.filter(c => c.subscription_tenure_days === 0),
      '1-7 Days': cancellations.filter(c => c.subscription_tenure_days >= 1 && c.subscription_tenure_days <= 7),
      '8-30 Days': cancellations.filter(c => c.subscription_tenure_days >= 8 && c.subscription_tenure_days <= 30),
      '30+ Days': cancellations.filter(c => c.subscription_tenure_days > 30)
    }

    const tenureAnalysis = Object.entries(tenureBuckets).map(([bucket, data]) => ({
      bucket,
      count: data.length,
      saveRate: data.length > 0 ? ((data.filter(c => !c.cancellation_completed).length / data.length) * 100).toFixed(1) : '0.0'
    }))

    // Reason code analysis
    const reasonCodeMap: Record<string, string> = {
      'A': 'Too Expensive',
      'B': 'Not Using Enough',
      'C': 'Missing Features',
      'D': 'Technical Issues',
      'E': 'Found Alternative',
      'F': 'Just Testing',
      'G': 'Seasonal (Off-season)',
      'H': 'Other'
    }

    const reasonAnalysis: Record<string, { count: number; saved: number; saveRate: string }> = {}
    
    cancellations.forEach(c => {
      if (c.reason_codes && Array.isArray(c.reason_codes)) {
        c.reason_codes.forEach((code: string) => {
          const reasonName = reasonCodeMap[code] || code
          if (!reasonAnalysis[reasonName]) {
            reasonAnalysis[reasonName] = { count: 0, saved: 0, saveRate: '0.0' }
          }
          reasonAnalysis[reasonName].count++
          if (!c.cancellation_completed) {
            reasonAnalysis[reasonName].saved++
          }
        })
      }
    })

    // Calculate save rates for reasons
    Object.keys(reasonAnalysis).forEach(reason => {
      const data = reasonAnalysis[reason]
      data.saveRate = data.count > 0 ? ((data.saved / data.count) * 100).toFixed(1) : '0.0'
    })

    // Sort by count
    const reasonAnalysisSorted = Object.entries(reasonAnalysis)
      .map(([reason, data]) => ({ reason, ...data }))
      .sort((a, b) => b.count - a.count)

    // Offer performance
    const offerTypes: Record<string, { count: number; accepted: number; acceptanceRate: string }> = {}
    
    cancellations.forEach(c => {
      if (c.first_offer_type) {
        if (!offerTypes[c.first_offer_type]) {
          offerTypes[c.first_offer_type] = { count: 0, accepted: 0, acceptanceRate: '0.0' }
        }
        offerTypes[c.first_offer_type].count++
        if (c.first_offer_accepted) {
          offerTypes[c.first_offer_type].accepted++
        }
      }
    })

    // Calculate acceptance rates
    Object.keys(offerTypes).forEach(offer => {
      const data = offerTypes[offer]
      data.acceptanceRate = data.count > 0 ? ((data.accepted / data.count) * 100).toFixed(1) : '0.0'
    })

    const offerPerformance = Object.entries(offerTypes)
      .map(([offer, data]) => ({ offer, ...data }))
      .sort((a, b) => b.count - a.count)

    // Timeline data (group by date)
    const timelineMap: Record<string, { date: string; attempts: number; saves: number; completed: number }> = {}
    
    cancellations.forEach(c => {
      const date = new Date(c.created_at).toISOString().split('T')[0]
      if (!timelineMap[date]) {
        timelineMap[date] = { date, attempts: 0, saves: 0, completed: 0 }
      }
      timelineMap[date].attempts++
      if (c.cancellation_completed) {
        timelineMap[date].completed++
      } else {
        timelineMap[date].saves++
      }
    })

    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      kpis: {
        total,
        completed,
        saved,
        saveRate,
        firstOfferWinRate,
        finalOfferWinRate
      },
      segmentation: {
        trial: {
          count: trialCancellations.length,
          saveRate: trialSaveRate
        },
        paid: {
          count: paidCancellations.length,
          saveRate: paidSaveRate
        }
      },
      tenureAnalysis,
      reasonAnalysis: reasonAnalysisSorted,
      offerPerformance,
      timeline,
      rawData: cancellations
    })
  } catch (error) {
    console.error('[Cancellation Analytics] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

