import { NextRequest, NextResponse } from 'next/server'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const { affiliateId } = await request.json()

    if (!affiliateId) {
      return NextResponse.json(
        { error: 'Affiliate ID is required' },
        { status: 400 }
      )
    }

    // Get sales for this affiliate
    const response = await fetch(`${PUSHLAP_API_URL}/sales`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sales' },
        { status: response.status }
      )
    }

    const allSales = await response.json()
    
    // Filter sales for this affiliate
    const affiliateSales = Array.isArray(allSales) 
      ? allSales.filter((sale: any) => sale.affiliateId === affiliateId)
      : []

    // Calculate this month's earnings
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const thisMonthSales = affiliateSales.filter((sale: any) => {
      const saleDate = new Date(sale.createdAt || sale.date)
      return saleDate >= startOfMonth
    })

    const thisMonthEarnings = thisMonthSales.reduce((sum: number, sale: any) => {
      return sum + (sale.commissionAmount || 0)
    }, 0)

    return NextResponse.json({
      success: true,
      data: {
        thisMonthEarnings,
        totalSales: affiliateSales.length,
        thisMonthSales: thisMonthSales.length,
        sales: affiliateSales
      }
    })

  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

