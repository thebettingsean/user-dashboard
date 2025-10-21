import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover'
})

// Legacy price IDs that get "All Access" treatment
const LEGACY_PRICE_IDS = [
  // Old Bets
  'price_1RdJuK07WIhZOuSIn3UxIt4V', // 6-month $119.99
  'price_1R600p07WIhZOuSIrNk4pLau', // Monthly $29.99
  'price_1QuJnw07WIhZOuSIMflqulXj', // Monthly 2 $30.00
  'price_1R5zzf07WIhZOuSIy0Wn2aZF', // Weekly $14.99
  // Old Stats
  'price_1RdJoT07WIhZOuSIvK6yHiOK', // 6-month $119.99
  'price_1QuJoM07WIhZOuSIERC3Dces', // Monthly $30.00
  'price_1Qw8ha07WIhZOuSI0fVoF8Am', // Weekly $15.00
  // Old Advantage
  'price_1RdJwP07WIhZOuSIgQKcur3e', // 6-month $199.99
  'price_1QuJos07WIhZOuSIc3iG0Nsi', // Monthly $50.00
  'price_1Qw8iY07WIhZOuSIC48z9vlc', // Weekly $25.00
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10
    })

    if (!customers.data.length) {
      return NextResponse.json(
        { error: 'No customer found with this email' },
        { status: 404 }
      )
    }

    const allSubscriptions: any[] = []

    // Collect ALL subscriptions from all customers with this email
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 100 // Get all subscriptions
      })

      for (const subscription of subscriptions.data) {
        // Only include active, trialing, or recently cancelled subscriptions
        if (['active', 'trialing', 'past_due'].includes(subscription.status) || 
            (subscription.status === 'canceled' && (subscription as any).cancel_at_period_end)) {
          
          const priceItem = subscription.items.data[0]
          const price = priceItem.price
          const priceId = price.id

          // Determine if legacy
          const isLegacy = LEGACY_PRICE_IDS.includes(priceId)

          // Determine tier (weekly, monthly, 6-month)
          let tier = 'monthly'
          if (price.recurring?.interval === 'week') {
            tier = 'weekly'
          } else if (price.recurring?.interval === 'month' && price.recurring?.interval_count === 6) {
            tier = '6-month'
          }

          // Fetch product details
          const product = await stripe.products.retrieve(price.product as string)
          const productName = product.name
          
          // Determine type (bets, stats, advantage, fantasy)
          const productNameLower = productName.toLowerCase()
          let type = 'advantage'
          if (productNameLower.includes('bets') || productNameLower.includes('bet')) type = 'bets'
          else if (productNameLower.includes('stats') || productNameLower.includes('stat')) type = 'stats'
          else if (productNameLower.includes('fantasy')) type = 'fantasy'

          // Format price
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0.00'
          const currency = price.currency.toUpperCase()
          const formattedPrice = `$${amount} ${currency} / ${tier}`

          const subscriptionData = {
            id: subscription.id,
            product_name: productName,
            price: formattedPrice,
            price_amount: parseFloat(amount),
            tier: tier,
            type: type,
            status: subscription.status,
            current_period_end: (subscription as any).current_period_end,
            is_legacy: isLegacy,
            cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
            price_id: priceId
          }

          allSubscriptions.push(subscriptionData)
        }
      }
    }

    // Sort subscriptions: active first, then by price (highest to lowest)
    allSubscriptions.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      return b.price_amount - a.price_amount
    })

    if (allSubscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active subscriptions found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      subscriptions: allSubscriptions
    })

  } catch (error: any) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

